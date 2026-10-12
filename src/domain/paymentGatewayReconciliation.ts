import { z } from "zod";
import {
  ARIFPAY_PORTAL_SANDBOX_KEY,
  ARIFPAY_SANDBOX_ORIGIN,
  type ArifPaySandboxConfig,
  type PaymentGatewayResult,
} from "./paymentGateway";

export const ARIFPAY_SANDBOX_SESSION_STATUS_PATH =
  "/api/sandbox/checkout/session";

export const PaymentGatewayReconciliationRequestSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
  })
  .strict();
export type PaymentGatewayReconciliationRequest = z.infer<
  typeof PaymentGatewayReconciliationRequestSchema
>;

export type PaymentGatewayReconciliationState =
  | "PAYMENT_PENDING"
  | "GATEWAY_CONFIRMED"
  | "GATEWAY_FAILED"
  | "GATEWAY_CANCELED"
  | "GATEWAY_EXPIRED"
  | "OUTCOME_UNCERTAIN";

export const PaymentGatewayStatusResultSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    state: z.enum([
      "PAYMENT_PENDING",
      "GATEWAY_CONFIRMED",
      "GATEWAY_FAILED",
      "GATEWAY_CANCELED",
      "GATEWAY_EXPIRED",
      "OUTCOME_UNCERTAIN",
    ]),
    code: z.enum([
      "GATEWAY_STATUS_PENDING",
      "GATEWAY_STATUS_SUCCESS",
      "GATEWAY_STATUS_FAILED",
      "GATEWAY_STATUS_CANCELED",
      "GATEWAY_STATUS_EXPIRED",
      "GATEWAY_STATUS_SESSION_NOT_FOUND",
      "GATEWAY_STATUS_AUTH_REJECTED",
      "GATEWAY_STATUS_RESPONSE_INVALID",
      "GATEWAY_STATUS_NETWORK_UNCERTAIN",
      "GATEWAY_STATUS_SERVER_UNCERTAIN",
    ]),
    provider: z.literal("ARIFPAY"),
    environment: z.literal("sandbox"),
    checkedAt: z.string().datetime(),
  })
  .strict();
export type PaymentGatewayStatusResult = z.infer<
  typeof PaymentGatewayStatusResultSchema
>;

export interface PaymentGatewayStatusReader {
  getC2BStatus(input: {
    transactionId: string;
    customerId: string;
    providerSessionId: string;
  }): Promise<PaymentGatewayStatusResult>;
}

export interface PaymentGatewayRecordedResultLookup {
  getRecordedResultByTransactionId(
    transactionId: string,
  ): PaymentGatewayResult | undefined;
}

export const PaymentGatewayReconciliationSnapshotSchema = z
  .object({
    version: z.literal(1),
    records: z.array(PaymentGatewayStatusResultSchema).max(10_000),
  })
  .strict();
export type PaymentGatewayReconciliationSnapshot = z.infer<
  typeof PaymentGatewayReconciliationSnapshotSchema
>;

export interface PaymentGatewayReconciliationPersistence {
  load(): PaymentGatewayReconciliationSnapshot | undefined;
  save(snapshot: PaymentGatewayReconciliationSnapshot): void;
}

const ArifPayStatusEnvelopeSchema = z
  .object({
    error: z.boolean().optional(),
    msg: z.string().optional(),
    data: z.unknown().nullable().optional(),
  })
  .passthrough();

const ArifPayStatusDataSchema = z
  .object({
    transactionStatus: z.string().optional(),
    status: z.string().optional(),
    transaction: z
      .object({ transactionStatus: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

function sandboxOrigin(input: string) {
  return new URL(input).origin;
}

function statusResult(
  input: { transactionId: string; customerId: string },
  state: PaymentGatewayReconciliationState,
  code: PaymentGatewayStatusResult["code"],
): PaymentGatewayStatusResult {
  return PaymentGatewayStatusResultSchema.parse({
    transactionId: input.transactionId,
    customerId: input.customerId,
    state,
    code,
    provider: "ARIFPAY",
    environment: "sandbox",
    checkedAt: new Date().toISOString(),
  });
}

/**
 * Read-only ArifPay sandbox session-status client.
 *
 * The session endpoint was verified against the official sandbox on 2026-10-12:
 * GET /api/sandbox/checkout/session/{sessionId}. The production-only nonce and
 * transaction verification paths were explicitly tested and are not reused for
 * sandbox reconciliation.
 */
export class ArifPaySandboxStatusReader implements PaymentGatewayStatusReader {
  constructor(
    private readonly config: ArifPaySandboxConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (sandboxOrigin(config.baseUrl) !== ARIFPAY_SANDBOX_ORIGIN)
      throw new Error("ARIFPAY_SANDBOX_HOST_REQUIRED");
    if (config.apiKey !== ARIFPAY_PORTAL_SANDBOX_KEY)
      throw new Error("ARIFPAY_SANDBOX_KEY_REQUIRED");
  }

  async getC2BStatus(input: {
    transactionId: string;
    customerId: string;
    providerSessionId: string;
  }): Promise<PaymentGatewayStatusResult> {
    const parsed = z
      .object({
        transactionId: z.string().uuid(),
        customerId: z.string().uuid(),
        providerSessionId: z.string().min(1).max(512),
      })
      .strict()
      .parse(input);

    if (!this.config.networkEnabled)
      throw new Error("ARIFPAY_SANDBOX_NETWORK_DISABLED");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.config.baseUrl.replace(/\/$/, "")}${ARIFPAY_SANDBOX_SESSION_STATUS_PATH}/${encodeURIComponent(parsed.providerSessionId)}`,
        {
          method: "GET",
          headers: { "x-arifpay-key": this.config.apiKey },
          signal: controller.signal,
        },
      );
    } catch {
      clearTimeout(timeout);
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_NETWORK_UNCERTAIN",
      );
    }
    clearTimeout(timeout);

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_RESPONSE_INVALID",
      );
    }

    if (response.status === 404)
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_SESSION_NOT_FOUND",
      );
    if (response.status === 401 || response.status === 403)
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_AUTH_REJECTED",
      );
    if (response.status >= 500)
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_SERVER_UNCERTAIN",
      );
    if (!response.ok)
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_RESPONSE_INVALID",
      );

    const envelope = ArifPayStatusEnvelopeSchema.safeParse(raw);
    if (!envelope.success || envelope.data.error === true)
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_RESPONSE_INVALID",
      );

    const data = ArifPayStatusDataSchema.safeParse(envelope.data.data);
    if (!data.success)
      return statusResult(
        parsed,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_STATUS_RESPONSE_INVALID",
      );

    const providerStatus = (
      data.data.transactionStatus ??
      data.data.status ??
      data.data.transaction?.transactionStatus ??
      ""
    )
      .trim()
      .toUpperCase();

    switch (providerStatus) {
      case "PENDING":
        return statusResult(parsed, "PAYMENT_PENDING", "GATEWAY_STATUS_PENDING");
      case "SUCCESS":
        return statusResult(parsed, "GATEWAY_CONFIRMED", "GATEWAY_STATUS_SUCCESS");
      case "FAILED":
        return statusResult(parsed, "GATEWAY_FAILED", "GATEWAY_STATUS_FAILED");
      case "CANCELED":
      case "CANCELLED":
        return statusResult(parsed, "GATEWAY_CANCELED", "GATEWAY_STATUS_CANCELED");
      case "EXPIRED":
        return statusResult(parsed, "GATEWAY_EXPIRED", "GATEWAY_STATUS_EXPIRED");
      default:
        return statusResult(
          parsed,
          "OUTCOME_UNCERTAIN",
          "GATEWAY_STATUS_RESPONSE_INVALID",
        );
    }
  }
}

const terminalStates = new Set<PaymentGatewayReconciliationState>([
  "GATEWAY_CONFIRMED",
  "GATEWAY_FAILED",
  "GATEWAY_CANCELED",
  "GATEWAY_EXPIRED",
]);

/**
 * Durable synthetic reconciliation state. A terminal gateway state is sticky
 * and is never allowed to regress to pending/uncertain or another terminal
 * state. Gateway confirmation remains distinct from PartnerFI settlement.
 */
export class PaymentGatewayReconciliationService {
  private readonly records = new Map<string, PaymentGatewayStatusResult>();

  constructor(
    private readonly lookup: PaymentGatewayRecordedResultLookup,
    private readonly reader: PaymentGatewayStatusReader,
    private readonly persistence?: PaymentGatewayReconciliationPersistence,
  ) {
    const snapshot = persistence?.load();
    if (!snapshot) return;
    const validated = PaymentGatewayReconciliationSnapshotSchema.parse(snapshot);
    for (const record of validated.records) {
      if (this.records.has(record.transactionId))
        throw new Error("GATEWAY_RECONCILIATION_DUPLICATE_TRANSACTION");
      this.records.set(record.transactionId, structuredClone(record));
    }
  }

  getRecordedStatus(transactionId: string) {
    const id = z.string().uuid().parse(transactionId);
    const record = this.records.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async reconcile(
    input: PaymentGatewayReconciliationRequest,
  ): Promise<PaymentGatewayStatusResult> {
    const request = PaymentGatewayReconciliationRequestSchema.parse(input);
    const previous = this.records.get(request.transactionId);
    if (previous && terminalStates.has(previous.state))
      return structuredClone(previous);

    const checkout = this.lookup.getRecordedResultByTransactionId(
      request.transactionId,
    );
    if (!checkout) throw new Error("GATEWAY_CHECKOUT_NOT_FOUND");
    if (checkout.customerId !== request.customerId)
      throw new Error("GATEWAY_CHECKOUT_CUSTOMER_MISMATCH");
    if (!checkout.providerSessionId)
      throw new Error("GATEWAY_SESSION_REFERENCE_REQUIRED");

    const current = await this.reader.getC2BStatus({
      transactionId: request.transactionId,
      customerId: request.customerId,
      providerSessionId: checkout.providerSessionId,
    });

    if (
      current.transactionId !== request.transactionId ||
      current.customerId !== request.customerId
    )
      throw new Error("GATEWAY_STATUS_IDENTITY_MISMATCH");

    this.records.set(request.transactionId, structuredClone(current));
    this.persist();
    return structuredClone(current);
  }

  private persist() {
    this.persistence?.save({
      version: 1,
      records: [...this.records.values()].map((record) => structuredClone(record)),
    });
  }
}
