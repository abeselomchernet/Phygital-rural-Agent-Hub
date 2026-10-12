import assert from "node:assert/strict";
import {
  constants,
  createPublicKey,
  generateKeyPairSync,
  verify as cryptoVerify,
} from "node:crypto";
import test from "node:test";
import {
  TELEBIRR_PREORDER_PATH,
  TELEBIRR_SANDBOX_BASE_URL,
  TELEBIRR_TOKEN_PATH,
  TelebirrSandboxTokenClient,
  assertTelebirrSandboxConfig,
  buildTelebirrPreorderRequest,
  canonicalizeTelebirrRequest,
  normalizeTelebirrPrivateKey,
  signTelebirrRequest,
  telebirrSandboxConfigFromEnv,
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

test("Telebirr sandbox config pins the account test gateway and HTTPS", () => {
  assert.doesNotThrow(() => assertTelebirrSandboxConfig(config()));
  assert.throws(
    () =>
      assertTelebirrSandboxConfig(
        config({
          baseUrl:
            "https://superapp.ethiomobilemoney.et:38443/apiaccess/payment/gateway",
        }),
      ),
    /TELEBIRR_SANDBOX_GATEWAY_REQUIRED/,
  );
  assert.throws(
    () =>
      assertTelebirrSandboxConfig(
        config({
          baseUrl:
            "http://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway",
        }),
      ),
    /TELEBIRR_HTTPS_REQUIRED/,
  );
  assert.throws(
    () =>
      assertTelebirrSandboxConfig(
        config({
          baseUrl:
            "https://user:password@developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway",
        }),
      ),
    /TELEBIRR_GATEWAY_URL_CREDENTIALS_FORBIDDEN|TELEBIRR_SANDBOX_GATEWAY_REQUIRED/,
  );
});

test("environment loader is sandbox-only and network-off by default", () => {
  const pair = keyPair();
  const loaded = telebirrSandboxConfigFromEnv({
    TELEBIRR_MODE: "sandbox",
    TELEBIRR_SANDBOX_BASE_URL,
    TELEBIRR_FABRIC_APP_ID: "fabric-test",
    TELEBIRR_APP_SECRET: "secret-test",
    TELEBIRR_MERCHANT_APP_ID: "merchant-test",
    TELEBIRR_MERCHANT_CODE: "100001",
    TELEBIRR_PRIVATE_KEY: pair.privateKey,
    TELEBIRR_NOTIFY_URL: "https://example.invalid/notify",
  });
  assert.equal(loaded.mode, "sandbox");
  assert.equal(loaded.networkEnabled, false);
  assert.throws(
    () =>
      telebirrSandboxConfigFromEnv({
        TELEBIRR_MODE: "production",
        TELEBIRR_SANDBOX_BASE_URL,
        TELEBIRR_FABRIC_APP_ID: "fabric-test",
        TELEBIRR_APP_SECRET: "secret-test",
        TELEBIRR_MERCHANT_APP_ID: "merchant-test",
        TELEBIRR_MERCHANT_CODE: "100001",
        TELEBIRR_PRIVATE_KEY: pair.privateKey,
        TELEBIRR_NOTIFY_URL: "https://example.invalid/notify",
      }),
  );
});

test("canonical signing string matches current Ethio telecom documented field ordering", () => {
  const canonical = canonicalizeTelebirrRequest({
    timestamp: "1755866911",
    nonce_str: "H5QN4M6EAB2TXXVFK8SVV0RW6UFASICS",
    method: "payment.preorder",
    version: "1.0",
    biz_content: {
      notify_url: "https://www.google.com",
      appid: "1227484825753601",
      merch_code: "101011",
      merch_order_id: "1755866910890",
      trade_type: "Checkout",
      title: "diamond_1.5",
      total_amount: "1.5",
      trans_currency: "ETB",
      timeout_express: "120m",
    },
    sign: "ignored",
    sign_type: "SHA256WithRSA",
  });

  assert.equal(
    canonical,
    "appid=1227484825753601&merch_code=101011&merch_order_id=1755866910890&method=payment.preorder&nonce_str=H5QN4M6EAB2TXXVFK8SVV0RW6UFASICS&notify_url=https://www.google.com&timeout_express=120m&timestamp=1755866911&title=diamond_1.5&total_amount=1.5&trade_type=Checkout&trans_currency=ETB&version=1.0",
  );
});

test("request signing uses RSA-PSS SHA-256 and accepts PEM or bare PKCS8 base64", () => {
  const pair = keyPair();
  const payload = {
    timestamp: "1755866911",
    nonce_str: "SYNTHETICNONCE123",
    method: "payment.preorder",
    version: "1.0",
    biz_content: {
      notify_url: "https://example.invalid/notify",
      appid: "synthetic-merchant",
      merch_code: "100001",
      merch_order_id: "syntheticorder1",
      trade_type: "Checkout",
      title: "Synthetic item",
      total_amount: "1.5",
      trans_currency: "ETB",
      timeout_express: "120m",
    },
  };
  const signature = signTelebirrRequest(payload, pair.privateKey);
  assert.equal(
    cryptoVerify(
      "sha256",
      Buffer.from(canonicalizeTelebirrRequest(payload)),
      {
        key: createPublicKey(pair.publicKey),
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      Buffer.from(signature, "base64"),
    ),
    true,
  );

  const privateKeyObject = generateKeyPairSync("rsa", { modulusLength: 2048 })
    .privateKey;
  const bare = privateKeyObject
    .export({ type: "pkcs8", format: "der" })
    .toString("base64");
  assert.match(normalizeTelebirrPrivateKey(bare), /BEGIN PRIVATE KEY/);
  assert.doesNotThrow(() => signTelebirrRequest(payload, bare));
});

test("pure preorder builder emits only pinned C2B fields and a verifiable signature", () => {
  const pair = keyPair();
  const request = buildTelebirrPreorderRequest(
    config({
      privateKey: pair.privateKey,
      merchantAppId: "merchantapp123",
      merchantCode: "101011",
      notifyUrl: "https://example.invalid/notify",
    }),
    {
      merchantOrderId: "ORDER123456",
      nonce: "NONCE123456789",
      timestamp: "1755866911",
      title: "Synthetic item",
      amountMinor: 150,
    },
  );

  assert.equal(TELEBIRR_PREORDER_PATH, "/payment/v1/merchant/preOrder");
  assert.deepEqual(request.biz_content, {
    notify_url: "https://example.invalid/notify",
    appid: "merchantapp123",
    merch_code: "101011",
    merch_order_id: "ORDER123456",
    trade_type: "Checkout",
    title: "Synthetic item",
    total_amount: "1.5",
    trans_currency: "ETB",
    timeout_express: "120m",
  });
  assert.equal(request.method, "payment.preorder");
  assert.equal(request.version, "1.0");
  assert.equal(request.sign_type, "SHA256WithRSA");
  assert.equal("business_type" in request.biz_content, false);
  assert.equal("redirect_url" in request.biz_content, false);
  assert.equal("payee_identifier" in request.biz_content, false);
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

test("preorder builder preserves ETB minor units without floating-point arithmetic and rejects unsafe identifiers", () => {
  const safeConfig = config();
  const base = {
    merchantOrderId: "ORDER001",
    nonce: "NONCE001",
    timestamp: "1755866911",
    title: "Synthetic item",
  };
  assert.equal(
    buildTelebirrPreorderRequest(safeConfig, { ...base, amountMinor: 105 })
      .biz_content.total_amount,
    "1.05",
  );
  assert.equal(
    buildTelebirrPreorderRequest(safeConfig, { ...base, amountMinor: 100 })
      .biz_content.total_amount,
    "1",
  );
  assert.throws(() =>
    buildTelebirrPreorderRequest(safeConfig, {
      ...base,
      merchantOrderId: "ORDER-UNSAFE",
      amountMinor: 100,
    }),
  );
  assert.throws(() =>
    buildTelebirrPreorderRequest(safeConfig, {
      ...base,
      nonce: "nonce with spaces",
      amountMinor: 100,
    }),
  );
});

test("token client is fail-closed until networking is explicitly enabled", async () => {
  const client = new TelebirrSandboxTokenClient(
    config(),
    (async () => {
      throw new Error("SHOULD_NOT_CALL");
    }) as typeof fetch,
  );
  await assert.rejects(client.fetchToken(), /TELEBIRR_SANDBOX_NETWORK_DISABLED/);
});

test("token client sends only documented token headers/body and parses token response", async () => {
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const client = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true }),
    (async (input, init) => {
      calledUrl = String(input);
      calledInit = init;
      return response({
        token: "Bearer synthetic-token",
        effectiveDate: "1791817546217",
        expirationDate: "1791817546517",
      });
    }) as typeof fetch,
  );

  const token = await client.fetchToken();
  assert.equal(
    calledUrl,
    `${TELEBIRR_SANDBOX_BASE_URL}${TELEBIRR_TOKEN_PATH}`,
  );
  assert.equal(calledInit?.method, "POST");
  const headers = calledInit?.headers as Record<string, string>;
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["X-APP-Key"], "synthetic-fabric-app-id");
  assert.equal(
    calledInit?.body,
    JSON.stringify({ appSecret: "synthetic-app-secret" }),
  );
  assert.equal(token.token, "Bearer synthetic-token");
});

test("token client maps auth, malformed and network failures to controlled errors", async () => {
  const auth = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true }),
    (async () => response({ message: "denied" }, 401)) as typeof fetch,
  );
  await assert.rejects(auth.fetchToken(), /TELEBIRR_TOKEN_AUTH_REJECTED/);

  const malformed = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true }),
    (async () => response({ notAToken: true })) as typeof fetch,
  );
  await assert.rejects(
    malformed.fetchToken(),
    /TELEBIRR_TOKEN_RESPONSE_INVALID/,
  );

  const network = new TelebirrSandboxTokenClient(
    config({ networkEnabled: true }),
    (async () => {
      throw new Error("synthetic network failure");
    }) as typeof fetch,
  );
  await assert.rejects(network.fetchToken(), /TELEBIRR_TOKEN_NETWORK_ERROR/);
});
