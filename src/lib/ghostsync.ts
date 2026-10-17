import { openDB } from "idb";
import { z } from "zod";
import { SyntheticCustomerReferenceSchema } from "../domain/customerReference";
import {
  EnvelopeSchema,
  type Envelope,
  type TransportState,
} from "../domain/transport";

export const remoteSyncEnabled = false;

export const OpaqueTransactionIntentSchema = z
  .object({
    transactionId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    customerRef: SyntheticCustomerReferenceSchema,
    amountMinor: z.number().int().positive().max(100_000_000),
    direction: z.enum(["CASH_IN", "CASH_OUT"]),
    currency: z.literal("ETB"),
  })
  .strict();

export const OpaqueEnvelopeSchema = z
  .object({
    eventId: z.string().uuid(),
    schemaVersion: z.literal(2),
    createdAt: z.string().datetime(),
    sequence: z.number().int().positive(),
    payload: OpaqueTransactionIntentSchema,
  })
  .strict();

export type OpaqueEnvelope = z.infer<typeof OpaqueEnvelopeSchema>;
export type LocalQueueEnvelope = Envelope | OpaqueEnvelope;

// Existing v1 rows are retained for compatibility/quarantine. New Agent flows
// write schemaVersion 2 records containing only the session-scoped customerRef.
const LocalQueueEnvelopeSchema = z.union([OpaqueEnvelopeSchema, EnvelopeSchema]);
const database = () =>
  openDB("EnawugaSyntheticOutbox", 1, {
    upgrade(db) {
      db.createObjectStore("outbox", { keyPath: "row_key" });
    },
  });

export interface QueuedEvent {
  row_key: string;
  type: "transaction";
  payload: LocalQueueEnvelope;
  created_at: string;
  status: "pending" | "failed";
  retry_count: number;
  transportState: TransportState;
  financialState: "PARTNER_AUTH_PENDING";
}

export function queueSubjectLabel(event: QueuedEvent) {
  return event.payload.schemaVersion === 2
    ? event.payload.payload.customerRef
    : "Legacy v1 reference quarantined";
}

export function initGhostSync() {
  void database();
}

export async function addEventToQueue(type: string, input: unknown) {
  if (type !== "transaction") throw new Error("LEGACY_PAYLOAD_DISABLED");
  const payload = LocalQueueEnvelopeSchema.parse(input),
    db = await database();
  const tx = db.transaction("outbox", "readwrite");
  const old = (await tx.store.get(payload.eventId)) as QueuedEvent | undefined;
  if (old && JSON.stringify(old.payload) !== JSON.stringify(payload)) {
    tx.abort();
    throw new Error("EVENT_REPLAY_CONFLICT");
  }
  if (!old)
    await tx.store.add({
      row_key: payload.eventId,
      type: "transaction",
      payload,
      created_at: payload.createdAt,
      status: "pending",
      retry_count: 0,
      transportState: "QUEUED_FOR_SYNC",
      financialState: "PARTNER_AUTH_PENDING",
    } satisfies QueuedEvent);
  await tx.done;
  return payload.eventId;
}

export async function getPendingEvents(): Promise<QueuedEvent[]> {
  const raw = (await database()).getAll("outbox") as QueuedEvent[];
  return raw.filter((item) => LocalQueueEnvelopeSchema.safeParse(item.payload).success);
}

export async function clearEvent(id: string) {
  await (await database()).delete("outbox", id);
}

export async function retryEvent(id: string) {
  const db = await database(),
    tx = db.transaction("outbox", "readwrite");
  const event = (await tx.store.get(id)) as QueuedEvent | undefined;
  if (event) {
    event.status = "pending";
    event.retry_count++;
    await tx.store.put(event);
  }
  await tx.done;
}

export async function syncEvents() {
  // Reconnect never changes balances, removes records, or pretends delivery succeeded.
  return {
    enabled: false,
    reason: "AUTHENTICATED_DURABLE_RECEIVER_REQUIRED",
  } as const;
}
