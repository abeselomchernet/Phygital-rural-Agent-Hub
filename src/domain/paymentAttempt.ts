import { z } from "zod";
import {
  PaymentAttemptRequestSchema,
  PaymentInitiationEvidenceSchema,
  paymentAttemptFingerprint,
  type PaymentAttemptRequest,
  type PaymentInitiationEvidence,
} from "./paymentOrchestration";

// Reserved fixture namespace: this store must never receive real customer IDs.
// These restrictions describe local test data, not any provider's identifiers.
const syntheticReference = z.string().regex(/^synthetic-[a-z0-9-]{1,64}$/);
export const SyntheticPaymentAttemptRequestSchema = PaymentAttemptRequestSchema.extend({
  customerId: z.string().regex(/^00000000-0000-4000-8000-\d{12}$/),
  environment: z.literal("sandbox"),
  product: syntheticReference,
  merchantConfigRef: syntheticReference,
  providerContractRef: syntheticReference,
});

export const PaymentAttemptRecordSchema = z.object({
  request: SyntheticPaymentAttemptRequestSchema,
  initiationEvidence: PaymentInitiationEvidenceSchema.nullable(),
}).strict();
export type PaymentAttemptRecord = z.infer<typeof PaymentAttemptRecordSchema>;

export const PaymentAttemptSnapshotSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  records: z.array(PaymentAttemptRecordSchema).max(10_000),
}).strict().superRefine((snapshot, context) => {
  const keys = new Set<string>(), transactions = new Set<string>();
  for (const { request } of snapshot.records) {
    if (keys.has(request.idempotencyKey) || transactions.has(request.transactionId))
      context.addIssue({ code: "custom", message: "Duplicate attempt identity" });
    keys.add(request.idempotencyKey);
    transactions.add(request.transactionId);
  }
});
export type PaymentAttemptSnapshot = z.infer<typeof PaymentAttemptSnapshotSchema>;

export interface PaymentAttemptPersistence {
  load(): PaymentAttemptSnapshot | undefined;
  save(snapshot: PaymentAttemptSnapshot, expectedRevision: number): void;
}

export interface PaymentAttemptReservation {
  reservation: PaymentAttemptRecord;
  reused: boolean;
  reconciliationRequired: boolean;
}

/**
 * Unmounted orchestration primitive for synthetic local durability only.
 * Reserve durably BEFORE a future provider mutation. A reused unresolved
 * reservation is never permission to repost, even within the same process.
 * Existing ArifPay/Telebirr APIs do not yet use this store: their records are
 * not covered by its cross-provider conflict checks. No provider is invoked.
 */
export class DurablePaymentAttemptStore {
  private readonly records = new Map<string, PaymentAttemptRecord>();
  private readonly transactionKeys = new Map<string, string>();
  private readonly recoveredUnresolved = new Set<string>();
  private revision = 0;
  private reloadRequired = false;

  constructor(private readonly persistence: PaymentAttemptPersistence) {
    let snapshot: PaymentAttemptSnapshot | undefined;
    try {
      const loaded = persistence.load();
      snapshot = loaded === undefined ? undefined : PaymentAttemptSnapshotSchema.parse(loaded);
    } catch {
      throw new Error("PAYMENT_ATTEMPT_SNAPSHOT_INVALID");
    }
    if (!snapshot) return;
    this.revision = snapshot.revision;
    for (const record of snapshot.records) {
      const { transactionId, idempotencyKey } = record.request;
      this.records.set(idempotencyKey, structuredClone(record));
      this.transactionKeys.set(transactionId, idempotencyKey);
      if (!record.initiationEvidence)
        this.recoveredUnresolved.add(idempotencyKey);
    }
  }

  reserve(input: PaymentAttemptRequest): PaymentAttemptReservation {
    this.assertUsable();
    const request = this.parseRequest(input);
    const existing = this.match(request);
    if (existing) return {
      reservation: structuredClone(existing),
      reused: true,
      reconciliationRequired: !existing.initiationEvidence ||
        existing.initiationEvidence.outcome === "UNCERTAIN",
    };

    const record: PaymentAttemptRecord = { request, initiationEvidence: null };
    this.persist([...this.records.values(), record]);
    this.records.set(request.idempotencyKey, record);
    this.transactionKeys.set(request.transactionId, request.idempotencyKey);
    return { reservation: structuredClone(record), reused: false, reconciliationRequired: false };
  }

  // Stores a bounded observation, never raw provider data or settlement state.
  // Reconciliation after restart/uncertainty requires a future reviewed workflow.
  recordInitiation(input: PaymentAttemptRequest, inputEvidence: PaymentInitiationEvidence) {
    this.assertUsable();
    const request = this.parseRequest(input);
    const existing = this.match(request);
    if (!existing) throw new Error("PAYMENT_ATTEMPT_RESERVATION_REQUIRED");
    const parsed = PaymentInitiationEvidenceSchema.safeParse(inputEvidence);
    if (!parsed.success) throw new Error("PAYMENT_ATTEMPT_EVIDENCE_INVALID");
    const evidence = parsed.data;
    if (existing.initiationEvidence) {
      if (JSON.stringify(existing.initiationEvidence) !== JSON.stringify(evidence))
        throw new Error("PAYMENT_ATTEMPT_EVIDENCE_CONFLICT");
      return structuredClone(existing);
    }
    if (this.recoveredUnresolved.has(request.idempotencyKey))
      throw new Error("PAYMENT_ATTEMPT_RECONCILIATION_REQUIRED");

    const record: PaymentAttemptRecord = { request, initiationEvidence: evidence };
    this.persist([...this.records.values()].map((entry) =>
      entry.request.idempotencyKey === request.idempotencyKey ? record : entry,
    ));
    this.records.set(request.idempotencyKey, record);
    return structuredClone(record);
  }

  getByTransactionId(transactionId: string) {
    this.assertUsable();
    const parsed = z.string().uuid().safeParse(transactionId);
    if (!parsed.success) throw new Error("PAYMENT_ATTEMPT_ID_INVALID");
    const key = this.transactionKeys.get(parsed.data);
    return key ? structuredClone(this.records.get(key)) : undefined;
  }

  private parseRequest(input: PaymentAttemptRequest) {
    const parsed = SyntheticPaymentAttemptRequestSchema.safeParse(input);
    if (!parsed.success) throw new Error("PAYMENT_ATTEMPT_SYNTHETIC_REQUEST_INVALID");
    return parsed.data;
  }

  private match(request: PaymentAttemptRequest) {
    const existing = this.records.get(request.idempotencyKey);
    if (existing && paymentAttemptFingerprint(existing.request) !== paymentAttemptFingerprint(request))
      throw new Error("PAYMENT_ATTEMPT_IDEMPOTENCY_CONFLICT");
    const priorKey = this.transactionKeys.get(request.transactionId);
    if (priorKey && priorKey !== request.idempotencyKey)
      throw new Error("PAYMENT_ATTEMPT_TRANSACTION_CONFLICT");
    return existing;
  }

  private assertUsable() {
    if (this.reloadRequired) throw new Error("PAYMENT_ATTEMPT_STORE_RELOAD_REQUIRED");
  }

  private persist(records: PaymentAttemptRecord[]) {
    const parsed = PaymentAttemptSnapshotSchema.safeParse({
      version: 1, revision: this.revision + 1, records,
    });
    if (!parsed.success) throw new Error("PAYMENT_ATTEMPT_CAPACITY_EXCEEDED");
    try {
      this.persistence.save(parsed.data, this.revision);
    } catch {
      // A write could have reached disk before an fsync/cleanup failure.
      // Never retry using stale memory or expose filesystem/provider errors.
      this.reloadRequired = true;
      throw new Error("PAYMENT_ATTEMPT_PERSISTENCE_FAILED");
    }
    this.revision = parsed.data.revision;
  }
}
