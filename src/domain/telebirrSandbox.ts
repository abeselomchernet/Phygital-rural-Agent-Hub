import { constants, createPrivateKey, sign as cryptoSign } from "node:crypto";
import { z } from "zod";

export const TELEBIRR_SANDBOX_BASE_URL =
  "https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway";
export const TELEBIRR_TOKEN_PATH = "/payment/v1/token";

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
    redirectUrl: z.string().url(),
    timeoutMs: z.number().int().min(100).max(120_000).default(15_000),
  })
  .strict();
export type TelebirrSandboxConfig = z.infer<typeof TelebirrSandboxConfigSchema>;

export const TelebirrTokenResponseSchema = z
  .object({
    token: z.string().min(1),
    effectiveDate: z.union([z.string(), z.number()]).optional(),
    expirationDate: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();
export type TelebirrTokenResponse = z.infer<typeof TelebirrTokenResponseSchema>;

type SignablePrimitive = string | number | boolean;
type SignableValue = SignablePrimitive | Record<string, SignablePrimitive>;
export type TelebirrSignableRequest = Record<string, SignableValue | undefined>;

function normalizedGatewayBase(input: string) {
  const parsed = new URL(input);
  return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
}

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
    redirectUrl: env.TELEBIRR_REDIRECT_URL,
    timeoutMs: env.TELEBIRR_SANDBOX_TIMEOUT_MS
      ? Number(env.TELEBIRR_SANDBOX_TIMEOUT_MS)
      : 15_000,
  });
  assertTelebirrSandboxConfig(config);
  return config;
}

export function assertTelebirrSandboxConfig(config: TelebirrSandboxConfig) {
  const parsed = TelebirrSandboxConfigSchema.parse(config),
    url = new URL(parsed.baseUrl);
  if (url.protocol !== "https:") throw new Error("TELEBIRR_HTTPS_REQUIRED");
  if (normalizedGatewayBase(parsed.baseUrl) !== TELEBIRR_SANDBOX_BASE_URL)
    throw new Error("TELEBIRR_SANDBOX_GATEWAY_REQUIRED");
  if (url.username || url.password)
    throw new Error("TELEBIRR_GATEWAY_URL_CREDENTIALS_FORBIDDEN");
  return parsed;
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
  const compact = trimmed.replace(/\s+/g, ""),
    wrapped = compact.match(/.{1,64}/g)?.join("\n") ?? compact;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
}

/**
 * Canonical string described by the current Ethio telecom request-signature
 * documentation: exclude sign/sign_type, flatten biz_content one level,
 * sort field names A-z, then join key=value pairs with '&'.
 */
export function canonicalizeTelebirrRequest(input: TelebirrSignableRequest) {
  const pairs: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || key === "sign" || key === "sign_type") continue;
    if (key === "biz_content") {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("TELEBIRR_BIZ_CONTENT_INVALID");
      for (const [bizKey, bizValue] of Object.entries(value))
        pairs.push([bizKey, String(bizValue)]);
      continue;
    }
    if (typeof value === "object")
      throw new Error("TELEBIRR_SIGNING_NESTED_OBJECT_UNSUPPORTED");
    pairs.push([key, String(value)]);
  }
  pairs.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return pairs.map(([key, value]) => `${key}=${value}`).join("&");
}

/**
 * Current portal documentation demonstrates SHA-256 with RSA MGF1 (RSA-PSS).
 * The private key remains server-side; only the base64 signature is returned.
 */
export function signTelebirrRequest(
  input: TelebirrSignableRequest,
  privateKey: string,
) {
  const key = createPrivateKey(normalizeTelebirrPrivateKey(privateKey));
  return cryptoSign("sha256", Buffer.from(canonicalizeTelebirrRequest(input)), {
    key,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  }).toString("base64");
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
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.config.baseUrl}${TELEBIRR_TOKEN_PATH}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-APP-Key": this.config.fabricAppId,
          },
          body: JSON.stringify({ appSecret: this.config.appSecret }),
          signal: controller.signal,
        },
      );
    } catch {
      clearTimeout(timeout);
      throw new Error("TELEBIRR_TOKEN_NETWORK_ERROR");
    }
    clearTimeout(timeout);

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new Error("TELEBIRR_TOKEN_RESPONSE_INVALID");
    }
    if (!response.ok)
      throw new Error(
        response.status === 401 || response.status === 403
          ? "TELEBIRR_TOKEN_AUTH_REJECTED"
          : "TELEBIRR_TOKEN_REQUEST_REJECTED",
      );
    const parsed = TelebirrTokenResponseSchema.safeParse(raw);
    if (!parsed.success) throw new Error("TELEBIRR_TOKEN_RESPONSE_INVALID");
    return parsed.data;
  }
}
