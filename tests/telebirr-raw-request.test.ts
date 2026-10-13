import assert from "node:assert/strict";
import {
  constants,
  createPublicKey,
  generateKeyPairSync,
  verify as cryptoVerify,
} from "node:crypto";
import test from "node:test";
import { buildTelebirrRawRequest } from "../src/domain/telebirrRawRequest";
import {
  TELEBIRR_SANDBOX_BASE_URL,
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
    merchantAppId: "merchantapp123",
    merchantCode: "101011",
    privateKey: keyPair().privateKey,
    notifyUrl: "https://example.invalid/telebirr/notify",
    timeoutMs: 1_000,
    ...overrides,
  };
}

test("rawRequest builder follows supplied H5 field order and produces a verifiable signature", () => {
  const pair = keyPair();
  const raw = buildTelebirrRawRequest(
    config({ privateKey: pair.privateKey }),
    {
      prepayId: "PREPAY123456",
      nonce: "RAWNONCE123456",
      timestamp: "1755866911",
    },
  );

  const fields = Object.fromEntries(
    raw.split("&").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index), part.slice(index + 1)];
    }),
  );

  assert.deepEqual(Object.keys(fields), [
    "appid",
    "merch_code",
    "nonce_str",
    "prepay_id",
    "timestamp",
    "sign_type",
    "sign",
  ]);
  assert.equal(fields.appid, "merchantapp123");
  assert.equal(fields.merch_code, "101011");
  assert.equal(fields.nonce_str, "RAWNONCE123456");
  assert.equal(fields.prepay_id, "PREPAY123456");
  assert.equal(fields.timestamp, "1755866911");
  assert.equal(fields.sign_type, "SHA256WithRSA");

  const signable = {
    appid: fields.appid,
    merch_code: fields.merch_code,
    nonce_str: fields.nonce_str,
    prepay_id: fields.prepay_id,
    timestamp: fields.timestamp,
  };
  assert.equal(
    cryptoVerify(
      "sha256",
      Buffer.from(canonicalizeTelebirrRequest(signable)),
      {
        key: createPublicKey(pair.publicKey),
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      Buffer.from(fields.sign, "base64"),
    ),
    true,
  );
});

test("rawRequest builder remains pure and rejects unsafe provider correlation values", () => {
  const safeConfig = config();
  assert.throws(() =>
    buildTelebirrRawRequest(safeConfig, {
      prepayId: " PREPAY123 ",
      nonce: "RAWNONCE123456",
      timestamp: "1755866911",
    }),
  );
  assert.throws(() =>
    buildTelebirrRawRequest(safeConfig, {
      prepayId: "PREPAY123&sign=attacker",
      nonce: "RAWNONCE123456",
      timestamp: "1755866911",
    }),
  );
  assert.throws(() =>
    buildTelebirrRawRequest(safeConfig, {
      prepayId: "PREPAY123",
      nonce: "nonce with spaces",
      timestamp: "1755866911",
    }),
  );
});

test("rawRequest builder rejects delimiter-capable merchant configuration identifiers", () => {
  const input = {
    prepayId: "PREPAY123",
    nonce: "RAWNONCE123456",
    timestamp: "1755866911",
  };
  assert.throws(() =>
    buildTelebirrRawRequest(
      config({ merchantAppId: "merchant&appid=evil" }),
      input,
    ),
  );
  assert.throws(() =>
    buildTelebirrRawRequest(
      config({ merchantCode: "101011=evil" }),
      input,
    ),
  );
});
