import { z } from "zod";

export const MPESA_ETHIOPIA_SANDBOX_BASE_URL =
  "https://apisandbox.safaricom.et";
export const MPESA_ETHIOPIA_TOKEN_PATH = "/v1/token/generate";
export const MPESA_ETHIOPIA_MAX_RESPONSE_BYTES = 64 * 1024;

const CredentialPart = z
  .string()
  .min(1)
  .max(512)
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value));

export const MpesaEthiopiaSandboxTokenConfigSchema = z
  .object({
    mode: z.literal("sandbox"),
    networkEnabled: z.boolean(),
    baseUrl: z.literal(MPESA_ETHIOPIA_SANDBOX_BASE_URL),
    consumerKey: CredentialPart,
    consumerSecret: CredentialPart,
    timeoutMs: z.number().int().min(100).max(120_000).default(15_000),
  })
  .strict();
export type MpesaEthiopiaSandboxTokenConfig = z.infer<
  typeof MpesaEthiopiaSandboxTokenConfigSchema
>;

export const MpesaEthiopiaTokenResponseSchema = z
  .object({
    access_token: z.string().min(1).max(4096),
    token_type: z.literal("Bearer"),
    expires_in: z.string().regex(/^\d+$/),
  })
  .strict();
export type MpesaEthiopiaTokenResponse = z.infer<
  typeof MpesaEthiopiaTokenResponseSchema
>;

function assertPinnedSandboxConfig(config: MpesaEthiopiaSandboxTokenConfig) {
  const parsed = MpesaEthiopiaSandboxTokenConfigSchema.parse(config);
  const url = new URL(parsed.baseUrl);
  if (url.protocol !== "https:")
    throw new Error("MPESA_ETHIOPIA_HTTPS_REQUIRED");
  if (url.username || url.password || url.search || url.hash)
    throw new Error("MPESA_ETHIOPIA_SANDBOX_URL_INVALID");
  return parsed;
}

function raceAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted)
    return Promise.reject(new Error("MPESA_ETHIOPIA_RESPONSE_TIMEOUT"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("MPESA_ETHIOPIA_RESPONSE_TIMEOUT"));
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

function cancelReaderWithoutWaiting(
  reader: ReadableStreamDefaultReader<Uint8Array>,
) {
  try {
    void reader.cancel().catch(() => undefined);
  } catch {
    // Best-effort cleanup only; never delay the controlled error path.
  }
}

async function readBoundedJson(
  response: Response,
  controller: AbortController,
): Promise<unknown> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const bytes = Number(declared);
    if (Number.isFinite(bytes) && bytes > MPESA_ETHIOPIA_MAX_RESPONSE_BYTES) {
      if (!controller.signal.aborted) controller.abort();
      throw new Error("MPESA_ETHIOPIA_TOKEN_RESPONSE_TOO_LARGE");
    }
  }
  if (!response.body) {
    if (!controller.signal.aborted) controller.abort();
    throw new Error("MPESA_ETHIOPIA_TOKEN_RESPONSE_INVALID");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await raceAbort(reader.read(), controller.signal);
      if (done) break;
      total += value.byteLength;
      if (total > MPESA_ETHIOPIA_MAX_RESPONSE_BYTES) {
        if (!controller.signal.aborted) controller.abort();
        cancelReaderWithoutWaiting(reader);
        throw new Error("MPESA_ETHIOPIA_TOKEN_RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (!controller.signal.aborted) controller.abort();
    cancelReaderWithoutWaiting(reader);
    throw error;
  }

  const text = Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    total,
  ).toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("MPESA_ETHIOPIA_TOKEN_RESPONSE_INVALID");
  }
}

/**
 * Server-side sandbox token transport only. It is intentionally not wired into
 * app routes or payment initiation. Credentials are caller-supplied runtime
 * secrets and are never returned, logged or persisted by this module.
 */
export async function generateMpesaEthiopiaSandboxToken(
  config: MpesaEthiopiaSandboxTokenConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<MpesaEthiopiaTokenResponse> {
  const safe = assertPinnedSandboxConfig(config);
  if (!safe.networkEnabled)
    throw new Error("MPESA_ETHIOPIA_SANDBOX_NETWORK_DISABLED");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), safe.timeoutMs);
  const authorization = Buffer.from(
    `${safe.consumerKey}:${safe.consumerSecret}`,
    "utf8",
  ).toString("base64");
  const url = new URL(MPESA_ETHIOPIA_TOKEN_PATH, safe.baseUrl);
  url.searchParams.set("grant_type", "client_credentials");

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Basic ${authorization}` },
      redirect: "manual",
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      if (!controller.signal.aborted) controller.abort();
      throw new Error("MPESA_ETHIOPIA_TOKEN_REDIRECT_REJECTED");
    }
    if (!response.ok) {
      if (!controller.signal.aborted) controller.abort();
      throw new Error(`MPESA_ETHIOPIA_TOKEN_HTTP_${response.status}`);
    }

    const payload = await readBoundedJson(response, controller);
    return MpesaEthiopiaTokenResponseSchema.parse(payload);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MPESA_ETHIOPIA_"))
      throw error;
    if (controller.signal.aborted)
      throw new Error("MPESA_ETHIOPIA_RESPONSE_TIMEOUT");
    throw new Error("MPESA_ETHIOPIA_TOKEN_NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
}
