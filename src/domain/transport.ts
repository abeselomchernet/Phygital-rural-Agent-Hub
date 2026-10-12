import { z } from "zod";
import {
  TransactionSchema,
  TransactionService,
  type FinancialState,
} from "./financial";

export type TransportState =
  | "LOCAL_PENDING"
  | "QUEUED_FOR_SYNC"
  | "SYNCED_TO_SUPERVISOR"
  | "RECEIVED_BY_PLATFORM";

export const EnvelopeSchema = z
  .object({
    eventId: z.string().uuid(),
    schemaVersion: z.literal(1),
    createdAt: z.string().datetime(),
    sequence: z.number().int().positive(),
    payload: TransactionSchema,
  })
  .strict();
export type Envelope = z.infer<typeof EnvelopeSchema>;

export interface Receipt {
  eventId: string;
  transportState: "RECEIVED_BY_PLATFORM";
  financialState: FinancialState;
  simulated: true;
}

const ReceiptSchema = z
  .object({
    eventId: z.string().uuid(),
    transportState: z.literal("RECEIVED_BY_PLATFORM"),
    financialState: z.enum([
      "PARTNER_AUTH_PENDING",
      "PARTNER_ACCEPTED",
      "PARTNER_REJECTED",
      "RECONCILIATION_REQUIRED",
    ]),
    simulated: z.literal(true),
  })
  .strict();

export const TransportReceiverSnapshotSchema = z
  .object({
    version: z.literal(1),
    receipts: z.array(
      z
        .object({
          eventId: z.string().uuid(),
          fingerprint: z.string().min(1),
          receipt: ReceiptSchema,
          eventCreatedAt: z.string().datetime(),
          receivedAt: z.string().datetime(),
        })
        .strict(),
    ),
    sequence: z.array(
      z
        .object({
          customerId: z.string().uuid(),
          lastSequence: z.number().int().positive(),
        })
        .strict(),
    ),
    tombstones: z.array(
      z
        .object({
          eventId: z.string().uuid(),
          fingerprint: z.string().min(1),
          expiresAt: z.string().datetime(),
        })
        .strict(),
    ),
  })
  .strict();
export type TransportReceiverSnapshot = z.infer<
  typeof TransportReceiverSnapshotSchema
>;

export interface TransportReceiverPersistence {
  load(): TransportReceiverSnapshot | undefined;
  save(snapshot: TransportReceiverSnapshot): void;
}

export interface MockTransportReceiverOptions {
  now?: () => number;
  persistence?: TransportReceiverPersistence;
  receiptRetentionMs?: number;
  tombstoneRetentionMs?: number;
}

type StoredReceipt = {
  fingerprint: string;
  receipt: Receipt;
  eventCreatedAt: string;
  receivedAt: string;
};

// Test/synthetic receiver only. The HTTP GhostSync receiver remains closed.
// Persistence, when supplied, protects replay/sequence state across local
// development restarts; it does not authorize remote delivery or settlement.
export class MockTransportReceiver {
  private receipts = new Map<string, StoredReceipt>();
  private sequence = new Map<string, number>();
  private tombstones = new Map<
    string,
    { fingerprint: string; expiresAt: string }
  >();
  private now: () => number;
  private persistence?: TransportReceiverPersistence;
  private receiptRetentionMs: number;
  private tombstoneRetentionMs: number;

  constructor(
    private transactions: TransactionService,
    nowOrOptions: (() => number) | MockTransportReceiverOptions = {},
  ) {
    const options: MockTransportReceiverOptions =
      typeof nowOrOptions === "function" ? { now: nowOrOptions } : nowOrOptions;
    this.now = options.now ?? (() => Date.now());
    this.persistence = options.persistence;
    this.receiptRetentionMs = options.receiptRetentionMs ?? 30 * 86400_000;
    this.tombstoneRetentionMs = options.tombstoneRetentionMs ?? 60 * 86400_000;
    const snapshot = this.persistence?.load();
    if (snapshot) this.restore(snapshot);
    this.prune(false);
  }

  receive(input: unknown): Receipt {
    this.prune();
    const event = EnvelopeSchema.parse(input),
      fingerprint = JSON.stringify(event),
      previous = this.receipts.get(event.eventId);
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        throw new Error("EVENT_REPLAY_CONFLICT");
      return { ...previous.receipt };
    }
    const tombstone = this.tombstones.get(event.eventId);
    if (tombstone) {
      if (tombstone.fingerprint !== fingerprint)
        throw new Error("EVENT_REPLAY_CONFLICT");
      throw new Error("EVENT_REPLAY_TOMBSTONED");
    }

    const age = this.now() - Date.parse(event.createdAt);
    if (age > 7 * 86400_000 || age < -60_000)
      throw new Error("EVENT_EXPIRED_OR_FUTURE");
    const expected = (this.sequence.get(event.payload.customerId) ?? 0) + 1;
    if (event.sequence !== expected)
      throw new Error("OUT_OF_ORDER_RETRY_REQUIRED");

    const result = this.transactions.submit(event.payload),
      receivedAt = new Date(this.now()).toISOString(),
      receipt: Receipt = {
        eventId: event.eventId,
        transportState: "RECEIVED_BY_PLATFORM",
        financialState: result.state,
        simulated: true,
      };
    this.receipts.set(event.eventId, {
      fingerprint,
      receipt,
      eventCreatedAt: event.createdAt,
      receivedAt,
    });
    this.sequence.set(event.payload.customerId, event.sequence);
    this.persist();
    return { ...receipt }; // delivery acknowledgment never says "settled"
  }

  snapshot(): TransportReceiverSnapshot {
    return TransportReceiverSnapshotSchema.parse({
      version: 1,
      receipts: [...this.receipts.entries()].map(
        ([eventId, { fingerprint, receipt, eventCreatedAt, receivedAt }]) => ({
          eventId,
          fingerprint,
          receipt,
          eventCreatedAt,
          receivedAt,
        }),
      ),
      sequence: [...this.sequence.entries()].map(
        ([customerId, lastSequence]) => ({ customerId, lastSequence }),
      ),
      tombstones: [...this.tombstones.entries()].map(
        ([eventId, { fingerprint, expiresAt }]) => ({
          eventId,
          fingerprint,
          expiresAt,
        }),
      ),
    });
  }

  private restore(input: TransportReceiverSnapshot) {
    const snapshot = TransportReceiverSnapshotSchema.parse(input),
      receipts = new Map<string, StoredReceipt>(),
      sequence = new Map<string, number>(),
      tombstones = new Map<string, { fingerprint: string; expiresAt: string }>();
    for (const item of snapshot.receipts) {
      if (receipts.has(item.eventId) || tombstones.has(item.eventId))
        throw new Error("DUPLICATE_TRANSPORT_EVENT_STATE");
      receipts.set(item.eventId, {
        fingerprint: item.fingerprint,
        receipt: item.receipt,
        eventCreatedAt: item.eventCreatedAt,
        receivedAt: item.receivedAt,
      });
    }
    for (const item of snapshot.tombstones) {
      if (receipts.has(item.eventId) || tombstones.has(item.eventId))
        throw new Error("DUPLICATE_TRANSPORT_EVENT_STATE");
      tombstones.set(item.eventId, {
        fingerprint: item.fingerprint,
        expiresAt: item.expiresAt,
      });
    }
    for (const item of snapshot.sequence) {
      if (sequence.has(item.customerId))
        throw new Error("DUPLICATE_TRANSPORT_SEQUENCE_STATE");
      sequence.set(item.customerId, item.lastSequence);
    }
    this.receipts = receipts;
    this.sequence = sequence;
    this.tombstones = tombstones;
  }

  private prune(save = true) {
    const now = this.now();
    let changed = false;
    for (const [eventId, item] of this.receipts) {
      if (now - Date.parse(item.receivedAt) <= this.receiptRetentionMs) continue;
      this.receipts.delete(eventId);
      this.tombstones.set(eventId, {
        fingerprint: item.fingerprint,
        expiresAt: new Date(now + this.tombstoneRetentionMs).toISOString(),
      });
      changed = true;
    }
    for (const [eventId, tombstone] of this.tombstones) {
      if (Date.parse(tombstone.expiresAt) > now) continue;
      this.tombstones.delete(eventId);
      changed = true;
    }
    if (changed && save) this.persist();
  }

  private persist() {
    this.persistence?.save(this.snapshot());
  }
}
