import { z } from "zod";
import {
  TelebirrPreorderInputSchema,
  type TelebirrPreorderInput,
} from "./telebirrSandbox";
import {
  TelebirrPreorderResponseEnvelopeSchema,
  type TelebirrPreorderClassification,
} from "./telebirrPreorderResponse";

export const TelebirrPreorderIntentSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    request: TelebirrPreorderInputSchema,
  })
  .strict();
export type TelebirrPreorderIntent = z.infer<typeof TelebirrPreorderIntentSchema>;

const ClassificationSchema = z.discriminatedUnion("state", [
  z
    .object({
      state: z.literal("ORDER_CREATED"),
      merchantOrderId: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
      prepayId: z.string().min(1).max(256).refine((value) => value === value.trim()),
      paymentConfirmed: z.literal(false),
      settlementConfirmed: z.literal(false),
    })
    .strict(),
  z
    .object({
      state: z.literal("PROVIDER_REJECTED"),
      providerCode: z.string().max(128).optional(),
      paymentConfirmed: z.literal(false),
      settlementConfirmed: z.literal(false),
    })
    .strict(),
  z
    .object({
      state: z.literal("RESPONSE_BINDING_MISMATCH"),
      paymentConfirmed: z.literal(false),
      settlementConfirmed: z.literal(false),
    })
    .strict(),
  z
    .object({
      state: z.literal("RESPONSE_UNVERIFIED"),
      paymentConfirmed: z.literal(false),
      settlementConfirmed: z.literal(false),
    })
    .strict(),
]);

export const TelebirrPreorderDurableRecordSchema = z
  .object({
    intent: TelebirrPreorderIntentSchema,
    status: z.enum(["SUBMISSION_INTENT_RECORDED", "RESULT_RECORDED"]),
    classification: ClassificationSchema.nullable(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.status === "RESULT_RECORDED" && !record.classification)
      context.addIssue({ code: "custom", message: "recorded result is required" });
    if (record.status === "SUBMISSION_INTENT_RECORDED" && record.classification)
      context.addIssue({
        code: "custom",
        message: "submission intent cannot already contain a provider result",
      });
    if (
      record.classification?.state === "ORDER_CREATED" &&
      record.classification.merchantOrderId !== record.intent.request.merchantOrderId
    )
      context.addIssue({
        code: "custom",
        message: "provider order does not bind to recorded merchant order",
      });
  });

export const TelebirrPreorderSnapshotSchema = z
  .object({
    version: z.literal(1),
    records: z.array(TelebirrPreorderDurableRecordSchema).max(10_000),
  })
  .strict();
export type TelebirrPreorderSnapshot = z.infer<typeof TelebirrPreorderSnapshotSchema>;

export interface TelebirrPreorderPersistence {
  load(): TelebirrPreorderSnapshot | undefined;
  save(snapshot: TelebirrPreorderSnapshot): void;
}

function fingerprint(intent: TelebirrPreorderIntent) {
  return JSON.stringify(intent);
}

/**
 * Preparatory durability/idempotency guard for the future direct-Telebirr
 * preorder network call. This class does NOT call Telebirr.
 *
 * The future provider client must record the submission intent before its first
 * mutating request. If the process restarts with only an intent present, this
 * guard requires reconciliation rather than permitting an automatic repost.
 */
export class DurableTelebirrPreorderState {
  private readonly records = new Map<
    string,
    z.infer<typeof TelebirrPreorderDurableRecordSchema>
  >();
  private readonly transactionKeys = new Map<string, string>();
  private readonly merchantOrderKeys = new Map<string, string>();

  constructor(private readonly persistence: TelebirrPreorderPersistence) {
    const snapshot = persistence.load();
    if (!snapshot) return;
    const validated = TelebirrPreorderSnapshotSchema.parse(snapshot);
    for (const record of validated.records) {
      const key = record.intent.idempotencyKey;
      if (this.records.has(key)) throw new Error("TELEBIRR_PERSISTED_DUPLICATE_KEY");
      const oldTransactionKey = this.transactionKeys.get(record.intent.transactionId);
      if (oldTransactionKey && oldTransactionKey !== key)
        throw new Error("TELEBIRR_PERSISTED_TRANSACTION_REPLAY");
      const oldMerchantKey = this.merchantOrderKeys.get(
        record.intent.request.merchantOrderId,
      );
      if (oldMerchantKey && oldMerchantKey !== key)
        throw new Error("TELEBIRR_PERSISTED_MERCHANT_ORDER_REPLAY");
      this.records.set(key, structuredClone(record));
      this.transactionKeys.set(record.intent.transactionId, key);
      this.merchantOrderKeys.set(record.intent.request.merchantOrderId, key);
    }
  }

  recordSubmissionIntent(input: TelebirrPreorderIntent) {
    const intent = TelebirrPreorderIntentSchema.parse(input),
      existing = this.records.get(intent.idempotencyKey);
    if (existing) {
      if (fingerprint(existing.intent) !== fingerprint(intent))
        throw new Error("TELEBIRR_IDEMPOTENCY_CONFLICT");
      if (existing.status === "SUBMISSION_INTENT_RECORDED")
        throw new Error("TELEBIRR_RECOVERY_RECONCILIATION_REQUIRED");
      return structuredClone(existing);
    }

    const transactionKey = this.transactionKeys.get(intent.transactionId);
    if (transactionKey && transactionKey !== intent.idempotencyKey)
      throw new Error("TELEBIRR_TRANSACTION_REPLAY");
    const merchantOrderKey = this.merchantOrderKeys.get(intent.request.merchantOrderId);
    if (merchantOrderKey && merchantOrderKey !== intent.idempotencyKey)
      throw new Error("TELEBIRR_MERCHANT_ORDER_REPLAY");

    const record = TelebirrPreorderDurableRecordSchema.parse({
      intent,
      status: "SUBMISSION_INTENT_RECORDED",
      classification: null,
    });
    this.records.set(intent.idempotencyKey, structuredClone(record));
    this.transactionKeys.set(intent.transactionId, intent.idempotencyKey);
    this.merchantOrderKeys.set(intent.request.merchantOrderId, intent.idempotencyKey);
    this.persist();
    return structuredClone(record);
  }

  recordProviderClassification(
    idempotencyKey: string,
    classification: TelebirrPreorderClassification,
  ) {
    const key = z.string().uuid().parse(idempotencyKey),
      existing = this.records.get(key);
    if (!existing) throw new Error("TELEBIRR_SUBMISSION_INTENT_REQUIRED");
    const parsedClassification = ClassificationSchema.parse(classification);
    const record = TelebirrPreorderDurableRecordSchema.parse({
      intent: existing.intent,
      status: "RESULT_RECORDED",
      classification: parsedClassification,
    });
    this.records.set(key, structuredClone(record));
    this.persist();
    return structuredClone(record);
  }

  getByTransactionId(transactionId: string) {
    const id = z.string().uuid().parse(transactionId),
      key = this.transactionKeys.get(id);
    if (!key) return undefined;
    const record = this.records.get(key);
    if (!record) throw new Error("TELEBIRR_PERSISTED_INDEX_CONFLICT");
    return structuredClone(record);
  }

  private persist() {
    this.persistence.save({
      version: 1,
      records: [...this.records.values()].map((record) => structuredClone(record)),
    });
  }
}
