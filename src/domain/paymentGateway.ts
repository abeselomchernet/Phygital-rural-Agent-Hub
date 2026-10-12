import { z } from "zod";

export const ARIFPAY_SANDBOX_ORIGIN = "https://gateway.arifpay.org";
export const ARIFPAY_PORTAL_SANDBOX_KEY = "arif-sandbox-portal-key";
export const ARIFPAY_SANDBOX_CHECKOUT_PATH = "/api/sandbox/c2b/session";
export const ARIFPAY_SANDBOX_SIMULATOR_PHONE = "251911000000";
export const ARIFPAY_SANDBOX_SIMULATOR_EMAIL = "sandbox@example.com";

export const PaymentGatewayC2BRequestSchema = z
  .object({
    transactionId: z.string().uuid(),
    customerId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    amountMinor: z.number().int().positive().max(100_000_000),
    currency: z.literal("ETB"),
  })
  .strict();
export type PaymentGatewayC2BRequest = z.infer<
  typeof PaymentGatewayC2BRequestSchema
>;

export type PaymentGatewayState =
  | "CHECKOUT_CREATED"
  | "GATEWAY_REJECTED"
  | "OUTCOME_UNCERTAIN"
  | "RECONCILIATION_REQUIRED";

export interface PaymentGatewayResult {
  transactionId: string;
  customerId: string;
  state: PaymentGatewayState;
  code:
    | "GATEWAY_ACCEPTED_CHECKOUT"
    | "GATEWAY_VALIDATION_REJECTED"
    | "GATEWAY_AUTH_REJECTED"
    | "GATEWAY_SESSION_ALREADY_EXISTS"
    | "GATEWAY_RESPONSE_INVALID"
    | "GATEWAY_NETWORK_UNCERTAIN"
    | "GATEWAY_SERVER_UNCERTAIN"
    | "GATEWAY_AMOUNT_MISMATCH";
  provider: "ARIFPAY";
  environment: "sandbox";
  providerSessionId?: string;
  paymentUrl?: string;
}

export interface PaymentGatewayAdapter {
  createC2BCheckout(
    request: PaymentGatewayC2BRequest,
  ): Promise<PaymentGatewayResult>;
  getRecordedResult(
    request: PaymentGatewayC2BRequest,
  ): PaymentGatewayResult | undefined;
}

export const ArifPaySandboxConfigSchema = z
  .object({
    mode: z.literal("sandbox"),
    networkEnabled: z.boolean(),
    baseUrl: z.string().url(),
    apiKey: z.string().min(1),
    notifyUrl: z.string().url(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
    errorUrl: z.string().url(),
    timeoutMs: z.number().int().min(100).max(120_000).default(15_000),
  })
  .strict();
export type ArifPaySandboxConfig = z.infer<typeof ArifPaySandboxConfigSchema>;

const ArifPayEnvelopeSchema = z
  .object({
    error: z.boolean(),
    msg: z.string().optional(),
    data: z.unknown().nullable().optional(),
  })
  .passthrough();

const ArifPayCheckoutDataSchema = z
  .object({
    sessionId: z.string().min(1).optional(),
    uuid: z.string().min(1).optional(),
    paymentUrl: z.string().url().optional(),
    totalAmount: z.number().nonnegative().optional(),
    amount: z.number().nonnegative().optional(),
  })
  .passthrough()
  .refine((value) => Boolean(value.sessionId || value.uuid), {
    message: "sandbox checkout response must include a session reference",
  });

function fingerprint(request: PaymentGatewayC2BRequest) {
  return JSON.stringify(request);
}

function sandboxOrigin(input: string) {
  return new URL(input).origin;
}

function controlledProviderError(message?: string) {
  const normalized = (message ?? "").trim().toLowerCase();
  if (
    normalized.includes("session already exist") ||
    normalized.includes("already successful") ||
    normalized.includes("already failed")
  )
    return "GATEWAY_SESSION_ALREADY_EXISTS" as const;
  return undefined;
}

export function arifPaySandboxConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): ArifPaySandboxConfig {
  return ArifPaySandboxConfigSchema.parse({
    mode: env.ARIFPAY_MODE,
    networkEnabled: env.ARIFPAY_SANDBOX_NETWORK_ENABLED === "true",
    baseUrl: env.ARIFPAY_SANDBOX_BASE_URL,
    apiKey: env.ARIFPAY_SANDBOX_API_KEY,
    notifyUrl: env.ARIFPAY_SANDBOX_NOTIFY_URL,
    successUrl: env.ARIFPAY_SANDBOX_SUCCESS_URL,
    cancelUrl: env.ARIFPAY_SANDBOX_CANCEL_URL,
    errorUrl: env.ARIFPAY_SANDBOX_ERROR_URL,
    timeoutMs: env.ARIFPAY_SANDBOX_TIMEOUT_MS
      ? Number(env.ARIFPAY_SANDBOX_TIMEOUT_MS)
      : 15_000,
  });
}

/**
 * ArifPay sandbox-only C2B checkout adapter.
 *
 * Current contract source: ArifPay developer-portal Sandbox Postman collection
 * checked 2026-10-12. It documents POST /api/sandbox/c2b/session on
 * https://gateway.arifpay.org with the public portal sandbox key.
 *
 * Safety properties:
 * - only the current documented sandbox origin is allowed;
 * - only the public portal sandbox key is accepted in this stage;
 * - only fixed ArifPay simulator phone/email values are sent, never customer PII;
 * - provider session creation is never PartnerFI authorization or settlement;
 * - timeout/network/5xx/malformed outcomes are recorded as uncertain and are
 *   not automatically retried.
 */
export class ArifPaySandboxAdapter implements PaymentGatewayAdapter {
  private readonly config: ArifPaySandboxConfig;
  private readonly results = new Map<
    string,
    { fingerprint: string; result: PaymentGatewayResult }
  >();
  private readonly transactionKeys = new Map<string, string>();

  constructor(
    input: ArifPaySandboxConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.config = ArifPaySandboxConfigSchema.parse(input);
    if (sandboxOrigin(this.config.baseUrl) !== ARIFPAY_SANDBOX_ORIGIN)
      throw new Error("ARIFPAY_SANDBOX_HOST_REQUIRED");
    if (this.config.apiKey !== ARIFPAY_PORTAL_SANDBOX_KEY)
      throw new Error("ARIFPAY_SANDBOX_KEY_REQUIRED");
  }

  getRecordedResult(input: PaymentGatewayC2BRequest) {
    const request = PaymentGatewayC2BRequestSchema.parse(input),
      old = this.results.get(request.idempotencyKey);
    if (!old) return undefined;
    if (old.fingerprint !== fingerprint(request))
      throw new Error("IDEMPOTENCY_CONFLICT");
    return structuredClone(old.result);
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
    if (!this.config.networkEnabled)
      throw new Error("ARIFPAY_SANDBOX_NETWORK_DISABLED");

    const result = await this.submit(request);
    this.transactionKeys.set(request.transactionId, request.idempotencyKey);
    this.results.set(request.idempotencyKey, {
      fingerprint: fingerprint(request),
      result,
    });
    return structuredClone(result);
  }

  private async submit(
    request: PaymentGatewayC2BRequest,
  ): Promise<PaymentGatewayResult> {
    const amount = request.amountMinor / 100;
    const payload = {
      cancelUrl: this.config.cancelUrl,
      phone: ARIFPAY_SANDBOX_SIMULATOR_PHONE,
      email: ARIFPAY_SANDBOX_SIMULATOR_EMAIL,
      nonce: request.transactionId,
      errorUrl: this.config.errorUrl,
      notifyUrl: this.config.notifyUrl,
      successUrl: this.config.successUrl,
      expireDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      amount,
      items: [
        {
          name: "Enawuga sandbox item",
          price: amount,
          quantity: 1,
          description: "Synthetic sandbox payment orchestration test",
        },
      ],
      lang: "EN",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.config.baseUrl.replace(/\/$/, "")}${ARIFPAY_SANDBOX_CHECKOUT_PATH}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-arifpay-key": this.config.apiKey,
            "x-arifpay-sim-mode": "SUCCESS",
            "x-arifpay-fee-source": "MERCHANT",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    } catch {
      clearTimeout(timeout);
      return this.result(
        request,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_NETWORK_UNCERTAIN",
      );
    }
    clearTimeout(timeout);

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return this.result(
        request,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_RESPONSE_INVALID",
      );
    }

    const envelope = ArifPayEnvelopeSchema.safeParse(raw);
    if (!envelope.success)
      return this.result(
        request,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_RESPONSE_INVALID",
      );

    const lifecycleCode = controlledProviderError(envelope.data.msg);
    if (lifecycleCode)
      return this.result(request, "RECONCILIATION_REQUIRED", lifecycleCode);

    if (!response.ok) {
      if (response.status >= 500)
        return this.result(
          request,
          "OUTCOME_UNCERTAIN",
          "GATEWAY_SERVER_UNCERTAIN",
        );
      return this.result(
        request,
        "GATEWAY_REJECTED",
        response.status === 401 || response.status === 403
          ? "GATEWAY_AUTH_REJECTED"
          : "GATEWAY_VALIDATION_REJECTED",
      );
    }

    if (envelope.data.error)
      return this.result(
        request,
        "GATEWAY_REJECTED",
        "GATEWAY_VALIDATION_REJECTED",
      );

    const checkout = ArifPayCheckoutDataSchema.safeParse(envelope.data.data);
    if (!checkout.success)
      return this.result(
        request,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_RESPONSE_INVALID",
      );

    const returnedAmount = checkout.data.totalAmount ?? checkout.data.amount;
    if (
      returnedAmount !== undefined &&
      Math.round(returnedAmount * 100) !== request.amountMinor
    )
      return this.result(
        request,
        "OUTCOME_UNCERTAIN",
        "GATEWAY_AMOUNT_MISMATCH",
      );

    return this.result(
      request,
      "CHECKOUT_CREATED",
      "GATEWAY_ACCEPTED_CHECKOUT",
      checkout.data.sessionId ?? checkout.data.uuid,
      checkout.data.paymentUrl,
    );
  }

  private result(
    request: PaymentGatewayC2BRequest,
    state: PaymentGatewayState,
    code: PaymentGatewayResult["code"],
    providerSessionId?: string,
    paymentUrl?: string,
  ): PaymentGatewayResult {
    return {
      transactionId: request.transactionId,
      customerId: request.customerId,
      state,
      code,
      provider: "ARIFPAY",
      environment: "sandbox",
      ...(providerSessionId ? { providerSessionId } : {}),
      ...(paymentUrl ? { paymentUrl } : {}),
    };
  }
}
