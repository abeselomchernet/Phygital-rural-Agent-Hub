import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  TELEBIRR_SANDBOX_BASE_URL,
  type TelebirrSandboxConfig,
} from "../src/domain/telebirrSandbox";
import {
  TELEBIRR_SANDBOX_WEB_CHECKOUT_BASE_URL,
  buildTelebirrC2BWebCheckoutUrl,
} from "../src/domain/telebirrWebCheckout";

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
    merchantAppId: "merchantapp123",
    merchantCode: "101011",
    privateKey: keyPair().privateKey,
    notifyUrl: "https://example.invalid/telebirr/notify",
    timeoutMs: 1_000,
    ...overrides,
  };
}

test("C2B Web Checkout URL follows supplied provider demo without importing B2B semantics", () => {
  const url = buildTelebirrC2BWebCheckoutUrl(config(), {
    prepayId: "PREPAY123456",
    nonce: "WEBNONCE123456",
    timestamp: "1755866911",
  });

  assert.ok(url.startsWith(TELEBIRR_SANDBOX_WEB_CHECKOUT_BASE_URL));
  assert.match(url, /appid=merchantapp123/);
  assert.match(url, /merch_code=101011/);
  assert.match(url, /prepay_id=PREPAY123456/);
  assert.match(url, /sign_type=SHA256WithRSA/);
  assert.match(url, /&version=1\.0&trade_type=Checkout$/);
  assert.equal(url.includes("trade_type=WebCheckout"), false);
  assert.equal(url.includes("TransferToOtherOrg"), false);
  assert.equal(url.includes("use_notice_key"), false);
});

test("C2B Web Checkout URL rejects delimiter-capable provider configuration identifiers", () => {
  const input = {
    prepayId: "PREPAY123456",
    nonce: "WEBNONCE123456",
    timestamp: "1755866911",
  };

  assert.throws(() =>
    buildTelebirrC2BWebCheckoutUrl(
      config({ merchantAppId: "merchant&appid=evil" }),
      input,
    ),
  );
  assert.throws(() =>
    buildTelebirrC2BWebCheckoutUrl(
      config({ merchantCode: "101011=evil" }),
      input,
    ),
  );
});
