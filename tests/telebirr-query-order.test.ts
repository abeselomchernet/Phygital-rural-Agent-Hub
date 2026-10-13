import assert from "node:assert/strict";
import {
  constants,
  createPublicKey,
  generateKeyPairSync,
  verify as cryptoVerify,
} from "node:crypto";
import test from "node:test";
import {
  TELEBIRR_QUERY_ORDER_PATH,
  TELEBIRR_SANDBOX_BASE_URL,
  TelebirrSandboxQueryOrderClient,
  buildTelebirrQueryOrderRequest,
  canonicalizeTelebirrRequest,
  type TelebirrSandboxConfig,
} from "../src/domain/telebirrSandbox";

function keyPair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
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
    merchantAppId: "synthetic-merchant-app-id",
    merchantCode: "100001",
    privateKey: keyPair().privateKey,
    notifyUrl: "https://example.invalid/telebirr/notify",
    timeoutMs: 1_000,
    ...overrides,
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("merchant queryOrder builder matches supplied account Postman contract and signs the request", () => {
  const pair = keyPair();
  const request = buildTelebirrQueryOrderRequest(
    config({
      privateKey: pair.privateKey,
      merchantAppId: "merchantapp123",
      merchantCode: "101011",
    }),
    {
      merchantOrderId: "ORDER123456",
      nonce: "QUERYNONCE123456",
      timestamp: "1755866911",
    },
  );

  assert.equal(TELEBIRR_QUERY_ORDER_PATH, "/payment/v1/merchant/queryOrder");
  assert.equal(request.method, "payment.queryorder");
  assert.equal(request.version, "1.0");
  assert.equal(request.sign_type, "SHA256WithRSA");
  assert.deepEqual(request.biz_content, {
    appid: "merchantapp123",
    merch_code: "101011",
    merch_order_id: "ORDER123456",
  });
  assert.equal(
    cryptoVerify(
      "sha256",
      Buffer.from(canonicalizeTelebirrRequest(request)),
      {
        key: createPublicKey(pair.publicKey),
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      Buffer.from(request.sign, "base64"),
    ),
    true,
  );
});

test("queryOrder client is fail-closed until sandbox networking is explicitly enabled", async () => {
  const client = new TelebirrSandboxQueryOrderClient(
    config(),
    (async () => {
      throw new Error("SHOULD_NOT_CALL");
    }) as typeof fetch,
  );

  await assert.rejects(
    client.queryOrder(
      {
        merchantOrderId: "ORDER123456",
        nonce: "QUERYNONCE123456",
        timestamp: "1755866911",
      },
      "Bearer synthetic-token",
    ),
    /TELEBIRR_SANDBOX_NETWORK_DISABLED/,
  );
});

test("queryOrder client sends only merchant reconciliation fields and never declares payment or settlement", async () => {
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const client = new TelebirrSandboxQueryOrderClient(
    config({ networkEnabled: true }),
    (async (input, init) => {
      calledUrl = String(input);
      calledInit = init;
      return response({
        code: "0",
        biz_content: {
          merch_order_id: "ORDER123456",
          order_status: "SYNTHETIC_PROVIDER_STATUS",
        },
      });
    }) as typeof fetch,
  );

  const result = await client.queryOrder(
    {
      merchantOrderId: "ORDER123456",
      nonce: "QUERYNONCE123456",
      timestamp: "1755866911",
    },
    "Bearer synthetic-token",
  );

  assert.equal(
    calledUrl,
    `${TELEBIRR_SANDBOX_BASE_URL}${TELEBIRR_QUERY_ORDER_PATH}`,
  );
  assert.equal(calledInit?.method, "POST");
  const headers = calledInit?.headers as Record<string, string>;
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["x-app-key"], "synthetic-fabric-app-id");
  assert.equal(headers.Authorization, "Bearer synthetic-token");

  const body = JSON.parse(String(calledInit?.body));
  assert.equal(body.method, "payment.queryorder");
  assert.deepEqual(body.biz_content, {
    appid: "synthetic-merchant-app-id",
    merch_code: "100001",
    merch_order_id: "ORDER123456",
  });
  assert.equal("payer_identifier" in body.biz_content, false);
  assert.equal("security_credential" in body.biz_content, false);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.settlementConfirmed, false);
  assert.equal(
    (result.payload.biz_content as Record<string, unknown>).order_status,
    "SYNTHETIC_PROVIDER_STATUS",
  );
});

test("queryOrder client maps auth, malformed and network failures to controlled errors", async () => {
  const input = {
    merchantOrderId: "ORDER123456",
    nonce: "QUERYNONCE123456",
    timestamp: "1755866911",
  };

  const auth = new TelebirrSandboxQueryOrderClient(
    config({ networkEnabled: true }),
    (async () => response({ error: "denied" }, 403)) as typeof fetch,
  );
  await assert.rejects(
    auth.queryOrder(input, "Bearer synthetic-token"),
    /TELEBIRR_QUERY_ORDER_AUTH_REJECTED/,
  );

  const malformed = new TelebirrSandboxQueryOrderClient(
    config({ networkEnabled: true }),
    (async () => new Response("not-json", { status: 200 })) as typeof fetch,
  );
  await assert.rejects(
    malformed.queryOrder(input, "Bearer synthetic-token"),
    /TELEBIRR_QUERY_ORDER_RESPONSE_INVALID/,
  );

  const network = new TelebirrSandboxQueryOrderClient(
    config({ networkEnabled: true }),
    (async () => {
      throw new Error("synthetic network failure");
    }) as typeof fetch,
  );
  await assert.rejects(
    network.queryOrder(input, "Bearer synthetic-token"),
    /TELEBIRR_QUERY_ORDER_NETWORK_ERROR/,
  );
});
