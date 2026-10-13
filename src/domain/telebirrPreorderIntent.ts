import { z } from "zod";

export const TelebirrPreorderIntentRequestSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    merchantOrderId: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    nonce: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    timestamp: z.string().regex(/^\d{10,13}$/),
    title: z.string().trim().min(1).max(128),
    amountMinor: z.number().int().positive().max(100_000_000),
    currency: z.literal("ETB"),
  })
  .strict();
export type TelebirrPreorderIntentRequest = z.infer<
  typeof TelebirrPreorderIntentRequestSchema
>;

export const TelebirrPreorderIntentRecordSchema = z  .object({
    status: z.literal("PREORDER_INTENT_RECORDED"),
    request: TelebirrPreorderIntentRequestSchema,
  })
  .strict();
export type TelebirrPreorderIntentRecord = z.infer<
  typeof TelebirrPreorderIntentRecordSchema
>;

export const TelebirrPreorderIntentSnapshotSchema = z  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative().default(0),
    records: z.array(TelebirrPreorderIntentRecordSchema).max(10_000),
  })
  .strict();
export type TelebirrPreorderIntentSnapshot = z.infer<
  typeof TelebirrPreorderIntentSnapshotSchema
>;

export interface TelebirrPreorderIntentPersistence {
  load(): TelebirrPreorderIntentSnapshot | undefined;
  save(
    snapshot: TelebirrPreorderIntentSnapshot,
    expectedRevision: number,
  ): void;
}

function fingerprint(request: TelebirrPreorderIntentRequest) {
  return JSON.stringify(request);
}

/**
 * Synthetic-development provider-correlation reservation for direct Telebirr.
 *
 * This records the Enawuga transaction/customer/idempotency identity together
 * with the Telebirr merchant-order ID and nonce BEFORE any future provider
 * mutation is allowed. It intentionally stores no app secret, private key,
 * access token, request signature, callback payload or provider payment state.
 *
 * The local persistence contract uses revision-based compare-and-swap. The
 * provided JSON persistence also takes an exclusive local lock during writes.
 * That closes lost-update races between cooperating local processes sharing
 * one file, but it is not a distributed database or production outbox.
 *
 * The reservation is a safety primitive, not proof that Telebirr received an
 * order and never evidence of payment, settlement or PartnerFI posting.
 */
export class DurableTelebirrPreorderIntentStore {
  private readonly records = new Map<string, TelebirrPreorderIntentRecord>();
  private readonly transactionKeys = new Map<string, string>();
  private readonly merchantOrderKeys = new Map<string, string>();
  private readonly nonceKeys = new Map<string, string>();
  private revision = 0;

  constructor(private readonly persistence: TelebirrPreorderIntentPersistence) {
    const snapshot = persistence.load();
    if (!snapshot) return;
    const validated = TelebirrPreorderIntentSnapshotSchema.parse(snapshot);
    this.revision = validated.revision;
    for (const record of validated.records) {
      const { request } = record;
      const key = request.idempotencyKey;
      if (this.records.has(key))
        throw new Error("TELEBIRR_PERSISTED_DUPLICATE_IDEMPOTENCY_KEY");
      if (this.transactionKeys.has(request.transactionId))
        throw new Error("TELEBIRR_PERSISTED_TRANSACTION_REPLAY");
      if (this.merchantOrderKeys.has(request.merchantOrderId))
        throw new Error("TELEBIRR_PERSISTED_MERCHANT_ORDER_REPLAY");
      if (this.nonceKeys.has(request.nonce))
        throw new Error("TELEBIRR_PERSISTED_NONCE_REPLAY");
      this.records.set(key, structuredClone(record));
      this.transactionKeys.set(request.transactionId, key);
      this.merchantOrderKeys.set(request.merchantOrderId, key);
      this.nonceKeys.set(request.nonce, key);
    }
  }

  reserve(input: TelebirrPreorderIntentRequest): TelebirrPreorderIntentRecord {
    const request = TelebirrPreorderIntentRequestSchema.parse(input);
    const existing = this.records.get(request.idempotencyKey);
    if (existing) {
      if (fingerprint(existing.request) !== fingerprint(request))
        throw new Error("IDEMPOTENCY_CONFLICT");
      return structuredClone(existing);
    }

    const transactionKey = this.transactionKeys.get(request.transactionId);
    if (transactionKey) throw new Error("TRANSACTION_REPLAY");
    const merchantOrderKey = this.merchantOrderKeys.get(request.merchantOrderId);
    if (merchantOrderKey) throw new Error("TELEBIRR_MERCHANT_ORDER_REPLAY");
    const nonceKey = this.nonceKeys.get(request.nonce);
    if (nonceKey) throw new Error("TELEBIRR_NONCE_REPLAY");

    const record: TelebirrPreorderIntentRecord = {
      status: "PREORDER_INTENT_RECORDED",
      request: structuredClone(request),
    };
    const nextRevision = this.revision + 1;

    // Persistence is the gate: do not make this reservation observable in
    // memory until the persistence layer has atomically accepted the expected
    // prior revision and durable candidate snapshot.
    this.persistence.save(
      {
        version: 1,
        revision: nextRevision,
        records: [
          ...this.records.values(),
          record,
        ].map((entry) => structuredClone(entry)),
      },
      this.revision,
    );

    this.revision = nextRevision;
    this.records.set(request.idempotencyKey, record);
    this.transactionKeys.set(request.transactionId, request.idempotencyKey);
    this.merchantOrderKeys.set(request.merchantOrderId, request.idempotencyKey);
    this.nonceKeys.set(request.nonce, request.idempotencyKey);
    return structuredClone(record);
  }

  getByTransactionId(transactionId: string) {
    const id = z.string().uuid().parse(transactionId);
    const key = this.transactionKeys.get(id);
    if (!key) return undefined;
    const record = this.records.get(key);
    if (!record) throw new Error("TELEBIRR_PERSISTED_INDEX_CONFLICT");
    return structuredClone(record);
  }

  getByMerchantOrderId(merchantOrderId: string) {
    const id = z.string().regex(/^[A-Za-z0-9]+$/).max(64).parse(merchantOrderId);
    const key = this.merchantOrderKeys.get(id);
    if (!key) return undefined;
    const record = this.records.get(key);
    if (!record) throw new Error("TELEBIRR_PERSISTED_INDEX_CONFLICT");
    return structuredClone(record);
  }
}
