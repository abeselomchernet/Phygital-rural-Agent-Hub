import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";

import {
  computePhoneBlindIndex,
  decryptCustomerPhone,
  derivePairwisePseudonymousId,
  normalizeEthiopianMsisdn,
  protectCustomerPhone,
  validatePrivacyKeySet,
} from "../src/domain/privacyIdentity";

const CUSTOMER_ID = "2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b";
const TENANT_ID = "tenant_stage4_synthetic";

function fixedKey(byte: number) {
  return Buffer.alloc(32, byte);
}

test("D2 PPID derivation is deterministic but pairwise across partner scope", () => {
  const key = fixedKey(1);
  const alpha = derivePairwisePseudonymousId(
    {
      customerId: CUSTOMER_ID,
      partnerOrgId: "partnerfi_alpha",
      scope: { type: "PARTNER" },
      keyVersion: "k1",
    },
    key,
  );
  const alphaAgain = derivePairwisePseudonymousId(
    {
      customerId: CUSTOMER_ID,
      partnerOrgId: "partnerfi_alpha",
      scope: { type: "PARTNER" },
      keyVersion: "k1",
    },
    key,
  );
  const beta = derivePairwisePseudonymousId(
    {
      customerId: CUSTOMER_ID,
      partnerOrgId: "partnerfi_beta",
      scope: { type: "PARTNER" },
      keyVersion: "k1",
    },
    key,
  );

  assert.equal(alpha, alphaAgain);
  assert.notEqual(alpha, beta);
  assert.match(alpha, /^ppid_v1_k1_[A-Za-z0-9_-]{27}$/);
  assert.equal(alpha.includes(CUSTOMER_ID), false);
  assert.equal(beta.includes("partnerfi_beta"), false);
});

test("D2 service-scoped PPIDs cannot collapse into partner-level or another service scope", () => {
  const key = fixedKey(2);
  const partner = derivePairwisePseudonymousId(
    {
      customerId: CUSTOMER_ID,
      partnerOrgId: "partnerfi_alpha",
      scope: { type: "PARTNER" },
      keyVersion: "k3",
    },
    key,
  );
  const insurance = derivePairwisePseudonymousId(
    {
      customerId: CUSTOMER_ID,
      partnerOrgId: "partnerfi_alpha",
      scope: { type: "SERVICE", serviceId: "weather-index-insurance" },
      keyVersion: "k3",
    },
    key,
  );
  const commerce = derivePairwisePseudonymousId(
    {
      customerId: CUSTOMER_ID,
      partnerOrgId: "partnerfi_alpha",
      scope: { type: "SERVICE", serviceId: "agri-input-commerce" },
      keyVersion: "k3",
    },
    key,
  );

  assert.notEqual(partner, insurance);
  assert.notEqual(insurance, commerce);
  assert.notEqual(partner, commerce);
});

test("D2 PPID output records key version and rotation changes the pseudonym", () => {
  const keyV1 = fixedKey(3);
  const keyV2 = fixedKey(4);
  const input = {
    customerId: CUSTOMER_ID,
    partnerOrgId: "partnerfi_alpha",
    scope: { type: "PARTNER" as const },
  };
  const v1 = derivePairwisePseudonymousId(
    { ...input, keyVersion: "k1" },
    keyV1,
  );
  const v2 = derivePairwisePseudonymousId(
    { ...input, keyVersion: "k2" },
    keyV2,
  );

  assert.match(v1, /^ppid_v1_k1_/);
  assert.match(v2, /^ppid_v1_k2_/);
  assert.notEqual(v1, v2);
});

test("D2 privacy keys are purpose-separated and exactly 256-bit", () => {
  assert.throws(
    () =>
      validatePrivacyKeySet({
        ppidKey: Buffer.alloc(31),
        blindIndexKey: fixedKey(5),
        fieldEncryptionKey: fixedKey(6),
      }),
    /PPID_KEY_MUST_BE_256_BIT/,
  );

  const reused = fixedKey(7);
  assert.throws(
    () =>
      validatePrivacyKeySet({
        ppidKey: reused,
        blindIndexKey: reused,
        fieldEncryptionKey: fixedKey(8),
      }),
    /PRIVACY_KEY_PURPOSE_REUSE_FORBIDDEN/,
  );

  assert.doesNotThrow(() =>
    validatePrivacyKeySet({
      ppidKey: fixedKey(9),
      blindIndexKey: fixedKey(10),
      fieldEncryptionKey: fixedKey(11),
    }),
  );
});

test("D2 phone normalization is bounded to Ethiopian mobile MSISDN form", () => {
  assert.equal(normalizeEthiopianMsisdn("0911 234 567"), "+251911234567");
  assert.equal(normalizeEthiopianMsisdn("+251-711-234-567"), "+251711234567");
  assert.throws(() => normalizeEthiopianMsisdn("+251111234567"));
  assert.throws(() => normalizeEthiopianMsisdn("911234567"));
});

test("D2 phone blind index is keyed, deterministic and tenant scoped", () => {
  const key = fixedKey(12);
  const phone = "+251911234567";
  const first = computePhoneBlindIndex(
    { phone, tenantId: TENANT_ID, keyVersion: "k1" },
    key,
  );
  const same = computePhoneBlindIndex(
    { phone: "0911234567", tenantId: TENANT_ID, keyVersion: "k1" },
    key,
  );
  const otherTenant = computePhoneBlindIndex(
    { phone, tenantId: "tenant_other", keyVersion: "k1" },
    key,
  );
  const plainSha = createHash("sha256").update(phone).digest("hex");

  assert.equal(first, same);
  assert.notEqual(first, otherTenant);
  assert.match(first, /^bidx_[0-9a-f]{64}$/);
  assert.notEqual(first, `bidx_${plainSha}`);
  assert.equal(first.includes("911234567"), false);
});

test("D2 protected phone record separates blind lookup from randomized AES-GCM ciphertext", () => {
  const blindIndexKey = fixedKey(13);
  const fieldEncryptionKey = fixedKey(14);
  const common = {
    customerId: CUSTOMER_ID,
    tenantId: TENANT_ID,
    phone: "+251911234567",
    indexKeyVersion: "k1" as const,
    encryptionKeyVersion: "k4" as const,
    blindIndexKey,
    fieldEncryptionKey,
    now: new Date("2026-10-17T00:00:00.000Z"),
  };
  const first = protectCustomerPhone(common);
  const second = protectCustomerPhone(common);

  assert.equal(first.phoneBlindIndex, second.phoneBlindIndex);
  assert.notEqual(first.phoneNonce, second.phoneNonce);
  assert.notEqual(first.phoneCiphertext, second.phoneCiphertext);
  assert.equal(decryptCustomerPhone(first, fieldEncryptionKey), "+251911234567");
  assert.equal(JSON.stringify(first).includes("+251911234567"), false);
  assert.equal(JSON.stringify(first).includes("0911234567"), false);
});

test("D2 phone encryption fails closed on key reuse, wrong key and AAD/ciphertext tampering", () => {
  const blindIndexKey = fixedKey(15);
  const fieldEncryptionKey = fixedKey(16);
  const base = {
    customerId: CUSTOMER_ID,
    tenantId: TENANT_ID,
    phone: "+251911234567",
    indexKeyVersion: "k1" as const,
    encryptionKeyVersion: "k1" as const,
    blindIndexKey,
    fieldEncryptionKey,
  };

  assert.throws(
    () =>
      protectCustomerPhone({
        ...base,
        blindIndexKey: fieldEncryptionKey,
      }),
    /PRIVACY_KEY_PURPOSE_REUSE_FORBIDDEN/,
  );

  const record = protectCustomerPhone(base);
  assert.throws(() => decryptCustomerPhone(record, randomBytes(32)));
  assert.throws(() =>
    decryptCustomerPhone(
      {
        ...record,
        customerId: "f0876671-1093-46af-8a0e-28e65f3656fd",
      },
      fieldEncryptionKey,
    ),
  );

  const ciphertext = Buffer.from(record.phoneCiphertext, "base64");
  ciphertext[0] ^= 0x01;
  assert.throws(() =>
    decryptCustomerPhone(
      { ...record, phoneCiphertext: ciphertext.toString("base64") },
      fieldEncryptionKey,
    ),
  );
});
