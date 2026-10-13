import { constants, createPrivateKey, sign as cryptoSign } from "node:crypto";
import { z } from "zod";

export const TELEBIRR_SANDBOX_BASE_URL =
  "https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway";
export const TELEBIRR_TOKEN_PATH = "/payment/v1/token";
export const TELEBIRR_PREORDER_PATH = "/payment/v1/merchant/preOrder";
export const TELEBIRR_QUERY_ORDER_PATH = "/payment/v1/merchant/queryOrder";
export const TELEBIRR_MAX_RESPONSE_BYTES = 64 * 1024;

const NoControlString = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value));

export const TelebirrSandboxConfigSchema = z
  .object({
    mode: z.literal("sandbox"),
    networkEnabled: z.boolean(),
    baseUrl: z.string().url(),
    fabricAppId: z.string().min(1).max(128),
    appSecret: z.string().min(1).max(512),
    merchantAppId: z.string().min(1).max(128),
    merchantCode: z.string().min(1).max(64),
    privateKey: z.string().min(64).max(16_384),
    notifyUrl: z.string().url(),
    timeoutMs: z.number().int().min(100).max(120_000).default(15_000),
  })
  .strict();
export type TelebirrSandboxConfig = z.infer<typeof TelebirrSandboxConfigSchema>;

const TelebirrProviderScalarSchema = z.union([
  NoControlString(128),
  z.number().finite(),
]);

export const TelebirrTokenResponseSchema = z
  .object({
    token: NoControlString(4096),
    effectiveDate: TelebirrProviderScalarSchema.optional(),
    expirationDate: TelebirrProviderScalarSchema.optional(),
  })
  .passthrough();
export type TelebirrTokenResponse = z.infer<typeof TelebirrTokenResponseSchema>;

export const TelebirrPreorderInputSchema = z
  .object({
    merchantOrderId: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    nonce: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    timestamp: z.string().regex(/^\d{10,13}$/),
    title: z.string().trim().min(1).max(128),
    amountMinor: z.number().int().positive().max(100_000_000),
  })
  .strict();
export type TelebirrPreorderInput = z.infer<typeof TelebirrPreorderInputSchema>;

export const TelebirrQueryOrderInputSchema = z
  .object({
    merchantOrderId: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    nonce: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    timestamp: z.string().regex(/^\d{10,13}$/),
  })
  .strict();
export type TelebirrQueryOrderInput = z.infer<
  typeof TelebirrQueryOrderInputSchema
>;

type SignablePrimitive = string | number | boolean;
type SignableValue = SignablePrimitive | Record<string, SignablePrimitive>;
export type TelebirrSignableRequest = Record<string, SignableValue | undefined>;

export interface TelebirrPreorderRequest extends TelebirrSignableRequest {
  timestamp: string;
  nonce_str: string;
  method: "payment.preorder";
  version: "1.0";
  biz_content: {
    notify_url: string;
    appid: string;
    merch_code: string;
    merch_order_id: string;
    trade_type: "Checkout";
    title: string;
    total_amount: string;
    trans_currency: "ETB";
    timeout_express: "120m";
  };
  sign: string;
  sign_type: "SHA256WithRSA";
}

export interface TelebirrQueryOrderRequest extends TelebirrSignableRequest {
  timestamp: string;
  nonce_str: string;
  method: "payment.queryorder";
  version: "1.0";
  biz_content: {
    appid: string;
    merch_code: string;
    merch_order_id: string;
  };
  sign: string;
  sign_type: "SHA256WithRSA";
}

export type TelebirrQueryOrderTransportResult = {
  httpStatus: number;
  payload: Record<string, unknown>;
  paymentConfirmed: false;
  settlementConfirmed: false;
};

export function telebirrSandboxConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): TelebirrSandboxConfig {
  const config = TelebirrSandboxConfigSchema.parse({
    mode: env.TELEBIRR_MODE,
    networkEnabled: env.TELEBIRR_SANDBOX_NETWORK_ENABLED === "true",
    baseUrl: env.TELEBIRR_SANDBOX_BASE_URL,
    fabricAppId: env.TELEBIRR_FABRIC_APP_ID,
    appSecret: env.TELEBIRR_APP_SECRET,
    merchantAppId: env.TELEBIRR_MERCHANT_APP_ID,
    merchantCode: env.TELEBIRR_MERCHANT_CODE,
    privateKey: env.TELEBIRR_PRIVATE_KEY,
    notifyUrl: env.TELEBIRR_NOTIFY_URL,
    timeoutMs: env.TELEBIRR_SANDBOX_TIMEOUT_MS
      ? Number(env.TELEBIRR_SANDBOX_TIMEOUT_MS)
      : 15_000,
  });
  return assertTelebirrSandboxConfig(config);
}

export function assertTelebirrSandboxConfig(config: TelebirrSandboxConfig) {
  const parsed = TelebirrSandboxConfigSchema.parse(config);
  const url = new URL(parsed.baseUrl);
  if (url.protocol !== "https:") throw new Error("TELEBIRR_HTTPS_REQUIRED");
  if (url.username || url.password)
    throw new Error("TELEBIRR_GATEWAY_URL_CREDENTIALS_FORBIDDEN");
  if (url.search || url.hash)
    throw new Error("TELEBIRR_GATEWAY_URL_SUFFIX_FORBIDDEN");
  if (parsed.baseUrl !== TELEBIRR_SANDBOX_BASE_URL)
    throw new Error("TELEBIRR_SANDBOX_GATEWAY_REQUIRED");
  return { ...parsed, baseUrl: TELEBIRR_SANDBOX_BASE_URL };
}

/**
 * The portal export may present a PKCS#8 key as bare base64 while deployment
 * secret managers commonly store PEM. Accept both forms without ever writing
 * the normalized key to logs, snapshots or browser responses.
 */
export function normalizeTelebirrPrivateKey(input: string) {
  const trimmed = input.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed;
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(trimmed))
    throw new Error("TELEBIRR_PRIVATE_KEY_FORMAT_INVALID");
  const compact = trimmed.replace(/\s+/g, "");
  const wrapped = compact.match(/.{1,64}/g)?.join("\n") ?? compact;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
}

function canonicalPrimitive(key: string, value: unknown) {
  if (!/^[A-Za-z0-9_]+$/.test(key))
    throw new Error("TELEBIRR_SIGNING_FIELD_NAME_INVALID");
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  )
    throw new Error("TELEBIRR_SIGNING_VALUE_INVALID");
  if (typeof value === "number" && !Number.isFinite(value))
    throw new Error("TELEBIRR_SIGNING_VALUE_INVALID");
  const rendered = String(value);
  if (/[&=\u0000-\u001F\u007F]/.test(rendered))
    throw new Error("TELEBIRR_SIGNING_VALUE_AMBIGUOUS");
  return rendered;
}

/**
 * Canonical string described by the current Ethio telecom request-signature
 * documentation: exclude sign/sign_type, flatten biz_content one level,
 * sort field names A-z, then join key=value pairs with '&'.
 *
 * Because that format has no escaping rule in the pinned material, this
 * implementation fails closed on delimiter-bearing values or duplicate
 * flattened names rather than inventing an encoding convention.
 */
export function canonicalizeTelebirrRequest(input: TelebirrSignableRequest) {
  const pairs: Array<[string, string]> = [];
  const names = new Set<string>();

  const addPair = (key: string, value: unknown) => {
    if (names.has(key)) throw new Error("TELEBIRR_SIGNING_DUPLICATE_FIELD");
    names.add(key);
    pairs.push([key, canonicalPrimitive(key, value)]);
  };

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || key === "sign" || key === "sign_type") continue;
    if (key === "biz_content") {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("TELEBIRR_BIZ_CONTENT_INVALID");
      for (const [bizKey, bizValue] of Object.entries(value))
        addPair(bizKey, bizValue);
      continue;
    }
    if (typeof value === "object")
      throw new Error("TELEBIRR_SIGNING_NESTED_OBJECT_UNSUPPORTED");
    addPair(key, value);
  }
  pairs.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return pairs.map(([key, value]) => `${key}=${value}`).join("&");
}

/**
 * Current portal documentation demonstrates SHA-256 with RSA MGF1 (RSA-PSS).
 * RSA-PSS signatures are intentionally randomized; only canonicalization is
 * deterministic. The private key remains server-side.
 */
export function signTelebirrRequest(
  input: TelebirrSignableRequest,
  privateKey: string,
) {
  const key = createPrivateKey(normalizeTelebirrPrivateKey(privateKey));
  if (key.asymmetricKeyType !== "rsa" && key.asymmetricKeyType !== "rsa-pss")
    throw new Error("TELEBIRR_PRIVATE_KEY_RSA_REQUIRED");
  const modulusLength = key.asymmetricKeyDetails?.modulusLength;
  if (!modulusLength)
    throw new Error("TELEBIRR_PRIVATE_KEY_RSA_STRENGTH_UNKNOWN");
  if (modulusLength < 2048)
    throw new Error("TELEBIRR_PRIVATE_KEY_RSA_TOO_WEAK");

  return cryptoSign("sha256", Buffer.from(canonicalizeTelebirrRequest(input)), {
    key,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  }).toString("base64");
}

function etbMinorToProviderAmount(amountMinor: number) {
  const amount = z.number().int().positive().max(100_000_000).parse(amountMinor);
  const birr = Math.floor(amount / 100);
  const cents = amount % 100;
  return cents === 0
    ? String(birr)
    : `${birr}.${String(cents).padStart(2, "0").replace(/0$/, "")}`;
}

function raceAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted)
    return Promise.reject(new Error("TELEBIRR_RESPONSE_TIMEOUT"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("TELEBIRR_RESPONSE_TIMEOUT"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function readBoundedJson(
  response: Response,
  signal: AbortSignal,
  invalidCode: string,
  tooLargeCode: string,
): Promise<unknown> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const bytes = Number(declared);
    if (Number.isFinite(bytes) && bytes > TELEBIRR_MAX_RESPONSE_BYTES)
      throw new Error(tooLargeCode);
  }
  if (!response.body) throw new Error(invalidCode);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await raceAbort(reader.read(), signal);
      if (done) break;
      total += value.byteLength;
      if (total > TELEBIRR_MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error(tooLargeCode);
      }
      chunks.push(value);
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // Best effort only. The caller still fails closed.
    }
    throw error;
  }

  const text = Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    total,
  ).toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(invalidCode);
  }
}

function isControlledTelebirrError(error: unknown, prefix: string) {
  return (
    error instanceof Error &&
    error.message.startsWith(`${prefix}_`) &&
    error.message !== `${prefix}_NETWORK_ERROR`
  );
}

/**
 * Pure request construction only. This does not call Telebirr. Fields are
 * restricted to the current public payment.preorder signing example rather
 * than importing historical demo-only payee/business/callback fields.
 */
export function buildTelebirrPreorderRequest(
  config: TelebirrSandboxConfig,
  input: TelebirrPreorderInput,
): TelebirrPreorderRequest {
  const safeConfig = assertTelebirrSandboxConfig(config);
  const parsed = TelebirrPreorderInputSchema.parse(input);
  const unsigned = {
    timestamp: parsed.timestamp,
    nonce_str: parsed.nonce,
    method: "payment.preorder" as const,
    version: "1.0" as const,
    biz_content: {
      notify_url: safeConfig.notifyUrl,
      appid: safeConfig.merchantAppId,
      merch_code: safeConfig.merchantCode,
      merch_order_id: parsed.merchantOrderId,
      trade_type: "Checkout" as const,
      title: parsed.title,
      total_amount: etbMinorToProviderAmount(parsed.amountMinor),
      trans_currency: "ETB" as const,
      timeout_express: "120m" as const,
    },
  };
  return {
    ...unsigned,
    sign: signTelebirrRequest(unsigned, safeConfig.privateKey),
    sign_type: "SHA256WithRSA",
  };
}

/**
 * Pure server-side merchant status-query construction based on the supplied
 * account Postman collection. It uses only the merchant-order identifier and
 * never requires consumer MSISDN/PIN data or a client checkout callback.
 */
export function buildTelebirrQueryOrderRequest(
  config: TelebirrSandboxConfig,
  input: TelebirrQueryOrderInput,
): TelebirrQueryOrderRequest {
  const safeConfig = assertTelebirrSandboxConfig(config);
  const parsed = TelebirrQueryOrderInputSchema.parse(input);
  const unsigned = {
    timestamp: parsed.timestamp,
    nonce_str: parsed.nonce,
    method: "payment.queryorder" as const,
    version: "1.0" as const,
    biz_content: {
      appid: safeConfig.merchantAppId,
      merch_code: safeConfig.merchantCode,
      merch_order_id: parsed.merchantOrderId,
    },
  };
  return {
    ...unsigned,
    sign: signTelebirrRequest(unsigned, safeConfig.privateKey),
    sign_type: "SHA256WithRSA",
  };
}

/**
 * Read-only credential bootstrap for the Telebirr developer/test gateway.
 * This fetches a fabric token only; it does not create, authorize or settle a
 * payment. Provider networking is disabled unless explicitly opted in.
 */
export class TelebirrSandboxTokenClient {
  private readonly config: TelebirrSandboxConfig;

  constructor(
    input: TelebirrSandboxConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.config = assertTelebirrSandboxConfig(input);
  }

  async fetchToken(): Promise<TelebirrTokenResponse> {
    if (!this.config.networkEnabled)
      throw new Error("TELEBIRR_SANDBOX_NETWORK_DISABLED");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetcher(
        `${this.config.baseUrl}${TELEBIRR_TOKEN_PATH}`,
        {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            "X-APP-Key": this.config.fabricAppId,
          },
          body: JSON.stringify({ appSecret: this.config.appSecret }),
          signal: controller.signal,
        },
      );
      if (
        response.redirected ||
        (response.status >= 300 && response.status < 400)
      )
        throw new Error("TELEBIRR_TOKEN_REDIRECT_REJECTED");
      if (!response.ok)
        throw new Error(
          response.status === 401 || response.status === 403
            ? "TELEBIRR_TOKEN_AUTH_REJECTED"
            : "TELEBIRR_TOKEN_REQUEST_REJECTED",
        );

      const raw = await readBoundedJson(
        response,
        controller.signal,
        "TELEBIRR_TOKEN_RESPONSE_INVALID",
        "TELEBIRR_TOKEN_RESPONSE_TOO_LARGE",
      );
      const parsed = TelebirrTokenResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error("TELEBIRR_TOKEN_RESPONSE_INVALID");
      return parsed.data;
    } catch (error) {
      if (isControlledTelebirrError(error, "TELEBIRR_TOKEN")) throw error;
      throw new Error("TELEBIRR_TOKEN_NETWORK_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Read-only merchant-order query for the Telebirr developer/TestBed gateway.
 * The supplied account Postman collection pins the path, headers and request
 * schema. This client deliberately does NOT map provider payload fields to a
 * paid/settled state because the authoritative status-value contract is still
 * not pinned. The caller receives transport evidence only.
 */
export class TelebirrSandboxQueryOrderClient {
  private readonly config: TelebirrSandboxConfig;

  constructor(
    input: TelebirrSandboxConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.config = assertTelebirrSandboxConfig(input);
  }

  async queryOrder(
    input: TelebirrQueryOrderInput,
    authorizationToken: string,
  ): Promise<TelebirrQueryOrderTransportResult> {
    if (!this.config.networkEnabled)
      throw new Error("TELEBIRR_SANDBOX_NETWORK_DISABLED");
    const token = z
      .string()
      .regex(/^Bearer\s+\S+$/)
      .max(4096)
      .parse(authorizationToken);
    const request = buildTelebirrQueryOrderRequest(this.config, input);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetcher(
        `${this.config.baseUrl}${TELEBIRR_QUERY_ORDER_PATH}`,
        {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            "x-app-key": this.config.fabricAppId,
            Authorization: token,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        },
      );
      if (
        response.redirected ||
        (response.status >= 300 && response.status < 400)
      )
        throw new Error("TELEBIRR_QUERY_ORDER_REDIRECT_REJECTED");
      if (!response.ok)
        throw new Error(
          response.status === 401 || response.status === 403
            ? "TELEBIRR_QUERY_ORDER_AUTH_REJECTED"
            : "TELEBIRR_QUERY_ORDER_REQUEST_REJECTED",
        );

      const raw = await readBoundedJson(
        response,
        controller.signal,
        "TELEBIRR_QUERY_ORDER_RESPONSE_INVALID",
        "TELEBIRR_QUERY_ORDER_RESPONSE_TOO_LARGE",
      );
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new Error("TELEBIRR_QUERY_ORDER_RESPONSE_INVALID");

      return {
        httpStatus: response.status,
        payload: raw as Record<string, unknown>,
        paymentConfirmed: false,
        settlementConfirmed: false,
      };
    } catch (error) {
      if (isControlledTelebirrError(error, "TELEBIRR_QUERY_ORDER")) throw error;
      throw new Error("TELEBIRR_QUERY_ORDER_NETWORK_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}
