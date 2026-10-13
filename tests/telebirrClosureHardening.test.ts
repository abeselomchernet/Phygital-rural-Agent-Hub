import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  TELEBIRR_MAX_RESPONSE_BYTES,
  TELEBIRR_SANDBOX_BASE_URL,
  TelebirrSandboxQueryOrderClient,
  TelebirrSandboxTokenClient,
  signTelebirrRequest,
  type TelebirrSandboxConfig,
} from "../src/domain/telebirrSandbox";

function rsaPrivateKey() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  }).privateKey;
}

function config(
  overrides: Partial<TelebirrSandboxConfig> = {},
): TelebirrSandboxConfig {
  return {
    mode: "sandbox",
    networkEnabled: true,
    baseUrl: TELEBIRR_SANDBOX_BASE_URL,
    fabricAppId: "synthetic-fabric-app-id",
    appSecret: "synthetic-app-secret",
    merchantAppId: "merchantapp123",
    merchantCode: "101011",
    privateKey: rsaPrivateKey(),
    notifyUrl: "https://example.invalid/telebirr/notify",
    timeoutMs: 100,
    ...overrides,
  };
}

function queryInput() {
  return {
    merchantOrderId: "ORDER123456",
    nonce: "QUERYNONCE123456",
    timestamp: "1755866911",
  };
}

function responseWithNeverResolvingCancel(
  status: number,
  headers: Record<string, string> = {},
) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"still":"streaming"}'));
    },
    cancel() {
      return new Promise<void>(() => undefined);
    },
  });
  return new Response(stream, { status, headers });
}

async function rejectsWithin(
  operation: Promise<unknown>,
  pattern: RegExp,
  maxMs = 250,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("TEST_DEADLINE_EXCEEDED")), maxMs);
  });
  try {
    await assert.rejects(Promise.race([operation, timeout]), pattern);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

test("token HTTP rejection aborts transport without waiting for stalled body cancellation", async () => {
  let requestSignal: AbortSignal | null | undefined;
  const client = new TelebirrSandboxTokenClient(
    config(),
    (async (_input, init) => {
      requestSignal = init?.signal;
      return responseWithNeverResolvingCancel(401);
    }) as typeof fetch,
  );

  await rejectsWithin(client.fetchToken(), /TELEBIRR_TOKEN_AUTH_REJECTED/);
  assert.equal(requestSignal?.aborted, true);
});

test("queryOrder HTTP rejection aborts transport without waiting for stalled body cancellation", async () => {
  let requestSignal: AbortSignal | null | undefined;
  const client = new TelebirrSandboxQueryOrderClient(
    config(),
    (async (_input, init) => {
      requestSignal = init?.signal;
      return responseWithNeverResolvingCancel(500);
    }) as typeof fetch,
  );

  await rejectsWithin(
    client.queryOrder(queryInput(), "Bearer synthetic-token"),
    /TELEBIRR_QUERY_ORDER_REQUEST_REJECTED/,
  );
  assert.equal(requestSignal?.aborted, true);
});

test("declared oversized response aborts immediately even when cancellation stalls", async () => {
  let requestSignal: AbortSignal | null | undefined;
  const client = new TelebirrSandboxTokenClient(
    config(),
    (async (_input, init) => {
      requestSignal = init?.signal;
      return responseWithNeverResolvingCancel(200, {
        "content-length": String(TELEBIRR_MAX_RESPONSE_BYTES + 1),
        "content-type": "application/json",
      });
    }) as typeof fetch,
  );

  await rejectsWithin(
    client.fetchToken(),
    /TELEBIRR_TOKEN_RESPONSE_TOO_LARGE/,
  );
  assert.equal(requestSignal?.aborted, true);
});

test("restricted rsa-pss private keys remain unsupported until provider parameters are pinned", () => {
  // The runtime supports rsa-pss generation, while this repository's current
  // Node type definitions do not expose that overload. Keep the type escape
  // test-local so production signing remains fully typed.
  const generateRuntimeKeyPair = generateKeyPairSync as unknown as (
    type: string,
    options: Record<string, unknown>,
  ) => { publicKey: string; privateKey: string };
  const restricted = generateRuntimeKeyPair("rsa-pss", {
    modulusLength: 2048,
    hashAlgorithm: "sha256",
    mgf1HashAlgorithm: "sha512",
    saltLength: 32,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  assert.throws(
    () =>
      signTelebirrRequest(
        { method: "payment.queryorder", version: "1.0" },
        restricted.privateKey,
      ),
    /TELEBIRR_PRIVATE_KEY_RSA_PSS_RESTRICTED_UNSUPPORTED/,
  );
});
