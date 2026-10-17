import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import {
  signEvidencePayload,
  verifyEvidencePayloadSignature,
} from "../src/domain/evidenceSignature";

const payload = {
  evidenceId: "evidence_synthetic_01",
  evidenceClass: "SYNTHETIC",
  authority: "NONE",
  amountMinor: 1250,
};

function ed25519Pair() {
  return generateKeyPairSync("ed25519");
}

function p256Pair() {
  return generateKeyPairSync("ec", { namedCurve: "prime256v1" });
}

test("D2 Ed25519 evidence signature verifies canonical payload and never asserts semantic truth", () => {
  const pair = ed25519Pair();
  const envelope = signEvidencePayload({
    payload,
    algorithm: "ED25519",
    keyId: "key_internal_evidence",
    keyVersion: "k1",
    privateKey: pair.privateKey,
    signedAt: new Date("2026-10-17T00:00:00.000Z"),
  });
  const verification = verifyEvidencePayloadSignature({
    payload,
    envelope,
    publicKey: pair.publicKey,
  });

  assert.equal(verification.verified, true);
  assert.equal(verification.digestMatches, true);
  assert.equal(verification.keyProfileMatches, true);
  assert.equal(verification.signatureValid, true);
  assert.equal(verification.semanticTruthEstablished, false);
  assert.equal(verification.externalAuthorityEstablished, false);
  assert.equal(envelope.algorithm, "ED25519");
  assert.equal(envelope.keyVersion, "k1");
});

test("D2 ECDSA P-256 profile verifies without implying institutional acceptance", () => {
  const pair = p256Pair();
  const envelope = signEvidencePayload({
    payload,
    algorithm: "ECDSA_P256_SHA256",
    keyId: "key_institutional_profile",
    keyVersion: "k2",
    privateKey: pair.privateKey,
    signedAt: new Date("2026-10-17T00:00:00.000Z"),
  });
  const verification = verifyEvidencePayloadSignature({
    payload,
    envelope,
    publicKey: pair.publicKey,
  });

  assert.equal(verification.verified, true);
  assert.equal(verification.semanticTruthEstablished, false);
  assert.equal(verification.externalAuthorityEstablished, false);
  assert.equal(envelope.algorithm, "ECDSA_P256_SHA256");
});

test("D2 signature verification fails when payload content is changed", () => {
  const pair = ed25519Pair();
  const envelope = signEvidencePayload({
    payload,
    algorithm: "ED25519",
    keyId: "key_internal_evidence",
    keyVersion: "k1",
    privateKey: pair.privateKey,
  });
  const verification = verifyEvidencePayloadSignature({
    payload: { ...payload, amountMinor: 1251 },
    envelope,
    publicKey: pair.publicKey,
  });

  assert.equal(verification.digestMatches, false);
  assert.equal(verification.signatureValid, false);
  assert.equal(verification.verified, false);
});

test("D2 key identity, version and algorithm metadata are covered by the signature", () => {
  const pair = ed25519Pair();
  const envelope = signEvidencePayload({
    payload,
    algorithm: "ED25519",
    keyId: "key_internal_evidence",
    keyVersion: "k1",
    privateKey: pair.privateKey,
    signedAt: new Date("2026-10-17T00:00:00.000Z"),
  });

  for (const changed of [
    { ...envelope, keyId: "key_internal_other" },
    { ...envelope, keyVersion: "k2" },
    { ...envelope, signedAt: "2026-10-17T00:00:01.000Z" },
  ]) {
    const verification = verifyEvidencePayloadSignature({
      payload,
      envelope: changed,
      publicKey: pair.publicKey,
    });
    assert.equal(verification.verified, false);
    assert.equal(verification.signatureValid, false);
  }
});

test("D2 wrong public key cannot verify an otherwise intact envelope", () => {
  const signer = ed25519Pair();
  const attacker = ed25519Pair();
  const envelope = signEvidencePayload({
    payload,
    algorithm: "ED25519",
    keyId: "key_internal_evidence",
    keyVersion: "k1",
    privateKey: signer.privateKey,
  });
  const verification = verifyEvidencePayloadSignature({
    payload,
    envelope,
    publicKey: attacker.publicKey,
  });

  assert.equal(verification.digestMatches, true);
  assert.equal(verification.keyProfileMatches, true);
  assert.equal(verification.signatureValid, false);
  assert.equal(verification.verified, false);
});

test("D2 algorithm/key-profile mismatch fails closed for signing and verification", () => {
  const ed = ed25519Pair();
  const ec = p256Pair();

  assert.throws(
    () =>
      signEvidencePayload({
        payload,
        algorithm: "ECDSA_P256_SHA256",
        keyId: "key_wrong_profile",
        keyVersion: "k1",
        privateKey: ed.privateKey,
      }),
    /EVIDENCE_SIGNATURE_KEY_PROFILE_MISMATCH/,
  );

  const envelope = signEvidencePayload({
    payload,
    algorithm: "ED25519",
    keyId: "key_internal_evidence",
    keyVersion: "k1",
    privateKey: ed.privateKey,
  });
  const verification = verifyEvidencePayloadSignature({
    payload,
    envelope,
    publicKey: ec.publicKey,
  });

  assert.equal(verification.keyProfileMatches, false);
  assert.equal(verification.signatureValid, false);
  assert.equal(verification.verified, false);
});

test("D2 ECDSA profile rejects non-P-256 EC keys", () => {
  const p384 = generateKeyPairSync("ec", { namedCurve: "secp384r1" });
  assert.throws(
    () =>
      signEvidencePayload({
        payload,
        algorithm: "ECDSA_P256_SHA256",
        keyId: "key_wrong_curve",
        keyVersion: "k1",
        privateKey: p384.privateKey,
      }),
    /EVIDENCE_SIGNATURE_KEY_PROFILE_MISMATCH/,
  );
});
