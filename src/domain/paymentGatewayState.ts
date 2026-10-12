import { z } from "zod";
import {
  PaymentGatewayC2BRequestSchema,
  type PaymentGatewayAdapter,
  type PaymentGatewayC2BRequest,
  type PaymentGatewayResult,
} from "./paymentGateway";

const PaymentGatewayResultSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    state: z.enum([
      "CHECKOUT_CREATED",
      "GATEWAY_REJECTED",
      "OUTCOME_UNCERTAIN",
      "RECONCILIATION_REQUIRED",
    ]),
    code: z.enum([
      "GATEWAY_ACCEPTED_CHECKOUT",
      "GATEWAY_VALIDATION_REJECTED",
      "GATEWAY_AUTH_REJECTED",
      "GATEWAY_SESSION_ALREADY_EXISTS",
      "GATEWAY_RESPONSE_INVALID",
      "GATEWAY_NETWORK_UNCERTAIN",
      "GATEWAY_SERVER_UNCERTAIN",
      "GATEWAY_AMOUNT_MISMATCH",
    ]),
    provider: z.literal("ARIFPAY"),
    environment: z.literal("sandbox"),
    providerSessionId: z.string().min(1).optional(),
    paymentUrl: z.string().url().optional(),
  })
  .strict();

export const PaymentGatewayDurableRecordSchema = z
  .object({
    request: PaymentGatewayC2BRequestSchema,
    status: z.enum(["SUBMISSION_INTENT_RECORDED", "RESULT_RECORDED"]),
    result: PaymentGatewayResultSchema.nullable(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.status === "RESULT_RECORDED" && !record.result)
      context.addIssue({
        code: "custom",
        message: "recorded result is required",
      });
    if (record.status === "SUBMISSION_INTENT_RECORDED" && record.result)
      context.addIssue({
        code: "custom",
        message: "submission intent cannot contain a terminal local result",
      });
    if (
      record.result &&
      (record.result.transactionId !== record.request.transactionId ||
        record.result.customerId !== record.request.customerId)
    )
      context.addIssue({
        code: "custom",
        message: "gateway result does not match request identity",
      });
  });

export const PaymentGatewaySnapshotSchema = z
  .object({
    version: z.literal(1),
    records: z.array(PaymentGatewayDurableRecordSchema).max(10_000),
  })
  .strict();
export type PaymentGatewaySnapshot = z.infer<typeof PaymentGatewaySnapshotSchema>;

export interface PaymentGatewayPersistence {
  load(): PaymentGatewaySnapshot | undefined;
  save(snapshot: PaymentGatewaySnapshot): void;
}

function fingerprint(request: PaymentGatewayC2BRequest) {
  return JSON.stringify(request);
}

/**
 * Synthetic-development durability wrapper for payment-gateway orchestration.
 *
 * The submission intent is persisted before the provider call. If execution
 * stops after that point and before a result is durably recorded, a restart
 * fails closed with reconciliation required instead of automatically posting
 * the same transaction again.
 *
 * This remains single-process local development persistence, not a production
 * transactional outbox, approved regulated ledger, or exactly-once guarantee.
 */
export class DurablePaymentGatewayAdapter implements PaymentGatewayAdapter {
  private readonly records = new Map<
    string,
    z.infer<typeof PaymentGatewayDurableRecordSchema>
  >();
  private readonly transactionKeys = new Map<string, string>();

  constructor(
    private readonly inner: PaymentGatewayAdapter,
    private readonly persistence: PaymentGatewayPersistence,
  ) {
    const snapshot = persistence.load();
    if (!snapshot) return;
    const validated = PaymentGatewaySnapshotSchema.parse(snapshot);
    for (const record of validated.records) {
      const key = record.request.idempotencyKey;
      if (this.records.has(key)) throw new Error("GATEWAY_PERSISTED_DUPLICATE_KEY");
      const oldTransactionKey = this.transactionKeys.get(record.request.transactionId);
      if (oldTransactionKey && oldTransactionKey !== key)
        throw new Error("GATEWAY_PERSISTED_TRANSACTION_REPLAY");
      this.records.set(key, structuredClone(record));
      this.transactionKeys.set(record.request.transactionId, key);
    }
  }

  getRecordedResult(input: PaymentGatewayC2BRequest) {
    const request = PaymentGatewayC2BRequestSchema.parse(input),
      record = this.records.get(request.idempotencyKey);
    if (!record) return undefined;
    if (fingerprint(record.request) !== fingerprint(request))
      throw new Error("IDEMPOTENCY_CONFLICT");
    if (record.status === "SUBMISSION_INTENT_RECORDED")
      throw new Error("GATEWAY_RECOVERY_RECONCILIATION_REQUIRED");
    return structuredClone(record.result ?? undefined);
  }

  getRecordedResultByTransactionId(transactionId: string) {
    const id = z.string().uuid().parse(transactionId),
      key = this.transactionKeys.get(id);
    if (!key) return undefined;
    const record = this.records.get(key);
    if (!record) throw new Error("GATEWAY_PERSISTED_INDEX_CONFLICT");
    if (record.status === "SUBMISSION_INTENT_RECORDED")
      throw new Error("GATEWAY_RECOVERY_RECONCILIATION_REQUIRED");
    return structuredClone(record.result ?? undefined);
  }

  async createC2BCheckout(
    input: PaymentGatewayC2BRequest,
  ): Promise<PaymentGatewayResult> {
    const request = PaymentGatewayC2BRequestSchema.parse(input),
      recorded = this.getRecordedResult(request);
    if (recorded) return recorded;

    const priorKey = this.transactionKeys.get(request.transactionId);
    if (priorKey && priorKey !== request.idempotencyKey)
      throw new Error("TRANSACTION_REPLAY");

    this.records.set(request.idempotencyKey, {
      request: structuredClone(request),
      status: "SUBMISSION_INTENT_RECORDED",
      result: null,
    });
    this.transactionKeys.set(request.transactionId, request.idempotencyKey);
    this.persist();

    const result = await this.inner.createC2BCheckout(request);
    this.records.set(request.idempotencyKey, {
      request: structuredClone(request),
      status: "RESULT_RECORDED",
      result: structuredClone(result),
    });
    this.persist();
    return structuredClone(result);
  }

  private persist() {
    this.persistence.save({
      version: 1,
      records: [...this.records.values()].map((record) => structuredClone(record)),
    });
  }
}
