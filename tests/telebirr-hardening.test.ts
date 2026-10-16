import assert from "node:assert/strict";
import {
  constants,
  createPublicKey,
  generateKeyPairSync,
  randomUUID,
  verify as cryptoVerify,
} from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  TELEBIRR_MAX_RESPONSE_BYTES,
  TELEBIRR_SANDBOX_BASE_URL,
  TelebirrSandboxQueryOrderClient,
  TelebirrSandboxTokenClient,
  assertTelebirrSandboxConfig,
  canonicalizeTelebirrRequest,
  signTelebirrRequest,
  type TelebirrSandboxConfig,
} from "../src/domain/telebirrSandbox";
import { classifyTelebirrPreorderResponse } from "../src/domain/telebirrPreorderResponse";
import {
  DurableTelebirrPreorderIntentStore,
  type TelebirrPreorderIntentRequest,
} from "../src/domain/telebirrPreorderIntent";
import { buildTelebirrC2BWebCheckoutUrl } from "../src/domain/telebirrWebCheckout";
import { AtomicJsonTelebirrPreorderIntentPersistence } from "../src/server/telebirr-preorder-intent-persistence";

function rsaPair(modulusLength = 2048) {
  return generateKeyPairSync("rsa", {
    modulusLength,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

function config(
  overrides: Partial<TelebirrSandboxConfig> = {},
): TelebirrSandboxConfig {
  return {
    mode: "sandbox",
    networkEnabled: false,
    baseUrl: TELEBIRR_SANDBOX_BASE_URL,
    fabricAppId: "synthetic-fabric-app-id",
    appSecret: "synthetic-app-secret",
    merchantAppId: "merchantapp123",
    merchantCode: "101011",
    privateKey: rsaPair().privateKey,
    notifyUrl: "https://example.invalid/telebirr/notify",
    timeoutMs: 1_000,
    ...overrides,
  };
}

function orderInput() {
  return {
    merchantOrderId: "ORDER123456",
    nonce: "QUERYNONCE123456",
    timestamp: "1755866911",
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function delayedJsonResponse(body: unknown, delayMs: number) {
  const encoded = new TextEncoder().encode(JSON.stringify(body));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      timer = setTimeout(() => {
        try {
          controller.enqueue(encoded);
          controller.close();
        } catch {
          // The request may have timed out and canceled the stream.
        }
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function intentRequest(
  overrides: Partial<TelebirrPreorderIntentRequest> = {},
): TelebirrPreorderIntentRequest {
  const unique = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return {
    transactionId: randomUUID(),
    customerId: randomUUID(),
    idempotencyKey: randomUUID(),
    merchantOrderId: `ORDER${unique}`,
    nonce: `NONCE${unique}`,
    timestamp: "1791819000",
    title: "Synthetic item",
    amountMinor: 150,
    currency: "ETB",
    ...overrides,
  };
}

test("sandbox gateway rejects query, fragment and trailing-slash variants", () => {
  assert.throws(
    () =>
      assertTelebirrSandboxConfig(
        config({ baseUrl: `${TELEBIRR_SANDBOX_BASE_URL}/` }),
      ),
    /TELEBIRR_SANDBOX_GATEWAY_REQUIRED/,
  );
  assert.throws(
    () =>
      assertTelebirrSandboxConfig(
        config({ baseUrl: `${TELEBIRR_SANDBOX_BASE_URL}?x=1` }),
      ),
    /TELEBIRR_GATEWAY_URL_SUFFIX_FORBIDDEN/,
  );
  assert.throws(
    () =>
      assertTelebirrSandboxConfig(
        config({ baseUrl: `${TELEBIRR_SANDBOX_BASE_URL}#fragment` }),
      ),
    /TELEBIRR_GATEWAY_URL_SUFFIX_FORBIDDEN/,
  );
});

test("canonicalization rejects collisions, delimiters and unsupported nested values", () => {
  assert.throws(
    () =>
      canonicalizeTelebirrRequest({
        appid: "top",
        biz_content: { appid: "nested" },
      }),
    /TELEBIRR_SIGNING_DUPLICATE_FIELD/,
  );
  assert.throws(
    () =>
      canonicalizeTelebirrRequest({
        biz_content: { title: "a&b" },
      }),
    /TELEBIRR_SIGNING_VALUE_AMBIGUOUS/,
  );
  assert.throws(
    () =>
      canonicalizeTelebirrRequest({
        biz_content: {
          title: { nested: true } as unknown as string,
        },
      }),
    /TELEBIRR_SIGNING_VALUE_INVALID/,
  );
});

test("signer rejects EC keys and RSA keys below 2048 bits", () => {
  const ec = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  assert.throws(
    () => signTelebirrRequest({ method: "payment.queryorder" }, ec.privateKey),
    /TELEBIRR_PRIVATE_KEY_RSA_REQUIRED/,
  );

  const weak = rsaPair(1024);
  assert.throws(
    () => signTelebirrRequest({ method: "payment.queryorder" }, weak.privateKey),
    /TELEBIRR_PRIVATE_KEY_RSA_TOO_WEAK/,
  );
});

test("token client rejects redirects and requests no automatic redirect following", async () => {
  let init: RequestInit | undefined;
  const client = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true }),
    (async (_input, requestInit) => {
      init = requestInit;
      return new Response(null, {
        status: 307,
        headers: { location: "https://example.invalid/redirect" },
      });
    }) as typeof fetch,
  );

  await assert.rejects(
    client.fetchToken(),
    /TELEBIRR_TOKEN_REDIRECT_REJECTED/,
  );
  assert.equal(init?.redirect, "error");
});

test("queryOrder rejects redirects and requests no automatic redirect following", async () => {
  let init: RequestInit | undefined;
  const client = new TelebirrSandboxQueryOrderClient(
    config({ networkEnabled: true }),
    (async (_input, requestInit) => {
      init = requestInit;
      return new Response(null, {
        status: 308,
        headers: { location: "https://example.invalid/redirect" },
      });
    }) as typeof fetch,
  );

  await assert.rejects(
    client.queryOrder(orderInput(), "Bearer synthetic-token"),
    /TELEBIRR_QUERY_ORDER_REDIRECT_REJECTED/,
  );
  assert.equal(init?.redirect, "error");
});

test("token response body remains bounded by timeout and size", async () => {
  const timed = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true, timeoutMs: 100 }),
    (async () =>
      delayedJsonResponse(
        { token: "Bearer synthetic-token" },
        250,
      )) as typeof fetch,
  );
  await assert.rejects(timed.fetchToken(), /TELEBIRR_TOKEN_NETWORK_ERROR/);

  const oversized = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true }),
    (async () =>
      response({
        token: "x".repeat(TELEBIRR_MAX_RESPONSE_BYTES + 100),
      })) as typeof fetch,
  );
  await assert.rejects(
    oversized.fetchToken(),
    /TELEBIRR_TOKEN_RESPONSE_TOO_LARGE/,
  );
});

test("queryOrder response body remains bounded by timeout and size", async () => {
  const timed = new TelebirrSandboxQueryOrderClient(
    config({ networkEnabled: true, timeoutMs: 100 }),
    (async () =>
      delayedJsonResponse(
        { code: "0", biz_content: {} },
        250,
      )) as typeof fetch,
  );
  await assert.rejects(
    timed.queryOrder(orderInput(), "Bearer synthetic-token"),
    /TELEBIRR_QUERY_ORDER_NETWORK_ERROR/,
  );

  const oversized = new TelebirrSandboxQueryOrderClient(
    config({ networkEnabled: true }),
    (async () =>
      response({
        padding: "x".repeat(TELEBIRR_MAX_RESPONSE_BYTES + 100),
      })) as typeof fetch,
  );
  await assert.rejects(
    oversized.queryOrder(orderInput(), "Bearer synthetic-token"),
    /TELEBIRR_QUERY_ORDER_RESPONSE_TOO_LARGE/,
  );
});

test("network failures do not trigger an alternate-host fallback", async () => {
  let calls = 0;
  const client = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true }),
    (async () => {
      calls += 1;
      throw new Error("certificate verify failed");
    }) as typeof fetch,
  );
  await assert.rejects(client.fetchToken(), /TELEBIRR_TOKEN_NETWORK_ERROR/);
  assert.equal(calls, 1);
});

test("C2B browser URL round-trips signed fields through standard URL decoding", () => {
  const pair = rsaPair();
  const safeConfig = config({
    privateKey: pair.privateKey,
    merchantAppId: "merchantapp123",
    merchantCode: "101011",
  });
  const input = {
    prepayId: "PREPAY123456",
    nonce: "WEBNONCE123456",
    timestamp: "1755866911",
  };

  let url = "";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    url = buildTelebirrC2BWebCheckoutUrl(safeConfig, input);
    if (url.includes("%2B")) break;
  }
  const parsed = new URL(url);
  const signature = parsed.searchParams.get("sign");
  assert.ok(signature);
  assert.equal(parsed.searchParams.get("appid"), "merchantapp123");
  assert.equal(parsed.searchParams.get("prepay_id"), "PREPAY123456");
  assert.equal(parsed.searchParams.get("trade_type"), "Checkout");

  const unsigned = {
    appid: "merchantapp123",
    merch_code: "101011",
    nonce_str: "WEBNONCE123456",
    prepay_id: "PREPAY123456",
    timestamp: "1755866911",
  };
  assert.equal(
    cryptoVerify(
      "sha256",
      Buffer.from(canonicalizeTelebirrRequest(unsigned)),
      {
        key: createPublicKey(pair.publicKey),
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      Buffer.from(signature, "base64"),
    ),
    true,
  );
});

test("two preloaded local stores cannot overwrite one another", () => {
  const directory = mkdtempSync(join(tmpdir(), "telebirr-intent-race-"));
  const path = join(directory, "intents.json");
  try {
    const storeA = new DurableTelebirrPreorderIntentStore(
      new AtomicJsonTelebirrPreorderIntentPersistence(path),
    );
    const storeB = new DurableTelebirrPreorderIntentStore(
      new AtomicJsonTelebirrPreorderIntentPersistence(path),
    );
    const first = intentRequest();
    storeA.reserve(first);

    assert.throws(
      () =>
        storeB.reserve(
          intentRequest({
            merchantOrderId: first.merchantOrderId,
            nonce: first.nonce,
          }),
        ),
      /TELEBIRR_PERSISTENCE_CONFLICT/,
    );

    const snapshot = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(snapshot.revision, 1);
    assert.equal(snapshot.records.length, 1);
    assert.equal(
      snapshot.records[0].request.transactionId,
      first.transactionId,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("fresh or unproven local persistence lock fails closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "telebirr-intent-lock-"));
  const path = join(directory, "intents.json");
  try {
    const store = new DurableTelebirrPreorderIntentStore(
      new AtomicJsonTelebirrPreorderIntentPersistence(path),
    );
    writeFileSync(`${path}.lock`, "stale");
    assert.throws(
      () => store.reserve(intentRequest()),
      /TELEBIRR_PERSISTENCE_LOCKED/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("unknown preorder outcomes remain unverified and mismatched failures do not bind", () => {
  const expected = "ORDER123456";
  for (const result of [undefined, "UNKNOWN", "ERROR"]) {
    const classified = classifyTelebirrPreorderResponse(
      {
        ...(result ? { result } : {}),
        biz_content: {
          merch_order_id: expected,
          prepay_id: "PREPAY123",
        },
      },
      expected,
    );
    assert.equal(classified.state, "RESPONSE_UNVERIFIED");
    assert.equal(classified.paymentConfirmed, false);
    assert.equal(classified.settlementConfirmed, false);
  }

  assert.deepEqual(
    classifyTelebirrPreorderResponse(
      {
        result: "FAIL",
        errorCode: "60200098",
        biz_content: {
          merch_order_id: "DIFFERENTORDER",
          prepay_id: null,
        },
      },
      expected,
    ),
    {
      state: "RESPONSE_BINDING_MISMATCH",
      paymentConfirmed: false,
      settlementConfirmed: false,
    },
  );
});

test("control-character provider codes remain unverified rather than log-safe output", () => {
  const classified = classifyTelebirrPreorderResponse(
    {
      result: "FAIL",
      errorCode: "bad\ncode",
      biz_content: {
        merch_order_id: "ORDER123456",
        prepay_id: null,
      },
    },
    "ORDER123456",
  );
  assert.equal(classified.state, "RESPONSE_UNVERIFIED");
});
