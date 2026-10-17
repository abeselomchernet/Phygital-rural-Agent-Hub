import {
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
  KeyObject,
} from "node:crypto";
import { z } from "zod";

import {
  canonicalizeEvidenceValue,
  computeCanonicalSha256,
} from "./evidenceIntegrity";
import { PrivacyKeyVersionSchema } from "./privacyIdentity";

export const EvidenceSignatureAlgorithmSchema = z.enum([
  "ED25519",
  "ECDSA_P256_SHA256",
]);

export const EvidenceSigningKeyIdSchema = z
  .string()
  .regex(/^key_[a-z0-9][a-z0-9_-]{2,63}$/);

export const EvidenceSignatureEnvelopeSchema = z
  .object({
    format: z.literal("ENAWUGA_EVIDENCE_SIGNATURE_V1"),
    algorithm: EvidenceSignatureAlgorithmSchema,
    keyId: EvidenceSigningKeyIdSchema,
    keyVersion: PrivacyKeyVersionSchema,
    payloadDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    signedAt: z.string().datetime(),
    signature: z.string().regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();

export type EvidenceSignatureAlgorithm = z.infer<
  typeof EvidenceSignatureAlgorithmSchema
>;
export type EvidenceSignatureEnvelope = z.infer<
  typeof EvidenceSignatureEnvelopeSchema
>;

export const EvidenceSignatureVerificationSchema = z
  .object({
    digestMatches: z.boolean(),
    keyProfileMatches: z.boolean(),
    signatureValid: z.boolean(),
    verified: z.boolean(),
    semanticTruthEstablished: z.literal(false),
    externalAuthorityEstablished: z.literal(false),
  })
  .strict();

export type EvidenceSignatureVerification = z.infer<
  typeof EvidenceSignatureVerificationSchema
>;

type SigningKeyInput = KeyObject | string | Buffer;

function asPrivateKey(input: SigningKeyInput) {
  if (input instanceof KeyObject) {
    if (input.type === "private") return input;
    throw new Error("EVIDENCE_SIGNATURE_KEY_TYPE_INVALID");
  }
  return createPrivateKey(input);
}

function asPublicKey(input: SigningKeyInput) {
  if (input instanceof KeyObject) {
    if (input.type === "public") return input;
    if (input.type === "private") return createPublicKey(input);
    throw new Error("EVIDENCE_SIGNATURE_KEY_TYPE_INVALID");
  }
  return createPublicKey(input);
}

function assertKeyProfile(
  algorithm: EvidenceSignatureAlgorithm,
  key: KeyObject,
  expectedType: "private" | "public",
) {
  if (key.type !== expectedType)
    throw new Error("EVIDENCE_SIGNATURE_KEY_TYPE_INVALID");

  if (algorithm === "ED25519") {
    if (key.asymmetricKeyType !== "ed25519")
      throw new Error("EVIDENCE_SIGNATURE_KEY_PROFILE_MISMATCH");
    return;
  }

  if (key.asymmetricKeyType !== "ec")
    throw new Error("EVIDENCE_SIGNATURE_KEY_PROFILE_MISMATCH");
  const curve = key.asymmetricKeyDetails?.namedCurve;
  if (curve !== "prime256v1" && curve !== "P-256")
    throw new Error("EVIDENCE_SIGNATURE_KEY_PROFILE_MISMATCH");
}

function signatureMessage(input: {
  algorithm: EvidenceSignatureAlgorithm;
  keyId: string;
  keyVersion: string;
  payloadDigest: string;
  signedAt: string;
}) {
  return Buffer.from(
    canonicalizeEvidenceValue({
      domain: "ENAWUGA_EVIDENCE_SIGNATURE_V1",
      algorithm: input.algorithm,
      keyId: input.keyId,
      keyVersion: input.keyVersion,
      payloadDigest: input.payloadDigest,
      signedAt: input.signedAt,
    }),
    "utf8",
  );
}

function signMessage(
  algorithm: EvidenceSignatureAlgorithm,
  message: Buffer,
  privateKey: KeyObject,
) {
  if (algorithm === "ED25519") return cryptoSign(null, message, privateKey);
  return cryptoSign("sha256", message, {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
}

function verifyMessage(
  algorithm: EvidenceSignatureAlgorithm,
  message: Buffer,
  signature: Buffer,
  publicKey: KeyObject,
) {
  if (algorithm === "ED25519")
    return cryptoVerify(null, message, publicKey, signature);
  return cryptoVerify(
    "sha256",
    message,
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    signature,
  );
}

export function signEvidencePayload(input: {
  payload: unknown;
  algorithm: EvidenceSignatureAlgorithm;
  keyId: string;
  keyVersion: string;
  privateKey: SigningKeyInput;
  signedAt?: Date;
}): EvidenceSignatureEnvelope {
  const algorithm = EvidenceSignatureAlgorithmSchema.parse(input.algorithm);
  const keyId = EvidenceSigningKeyIdSchema.parse(input.keyId);
  const keyVersion = PrivacyKeyVersionSchema.parse(input.keyVersion);
  const privateKey = asPrivateKey(input.privateKey);
  assertKeyProfile(algorithm, privateKey, "private");
  const payloadDigest = computeCanonicalSha256(input.payload);
  const signedAt = (input.signedAt ?? new Date()).toISOString();
  const message = signatureMessage({
    algorithm,
    keyId,
    keyVersion,
    payloadDigest,
    signedAt,
  });
  const signature = signMessage(algorithm, message, privateKey).toString("base64url");

  return EvidenceSignatureEnvelopeSchema.parse({
    format: "ENAWUGA_EVIDENCE_SIGNATURE_V1",
    algorithm,
    keyId,
    keyVersion,
    payloadDigest,
    signedAt,
    signature,
  });
}

export function verifyEvidencePayloadSignature(input: {
  payload: unknown;
  envelope: unknown;
  publicKey: SigningKeyInput;
}): EvidenceSignatureVerification {
  const envelope = EvidenceSignatureEnvelopeSchema.parse(input.envelope);
  const digestMatches = computeCanonicalSha256(input.payload) === envelope.payloadDigest;

  let publicKey: KeyObject;
  let keyProfileMatches = false;
  try {
    publicKey = asPublicKey(input.publicKey);
    assertKeyProfile(envelope.algorithm, publicKey, "public");
    keyProfileMatches = true;
  } catch {
    return EvidenceSignatureVerificationSchema.parse({
      digestMatches,
      keyProfileMatches: false,
      signatureValid: false,
      verified: false,
      semanticTruthEstablished: false,
      externalAuthorityEstablished: false,
    });
  }

  let signatureValid = false;
  if (digestMatches) {
    try {
      signatureValid = verifyMessage(
        envelope.algorithm,
        signatureMessage(envelope),
        Buffer.from(envelope.signature, "base64url"),
        publicKey,
      );
    } catch {
      signatureValid = false;
    }
  }

  return EvidenceSignatureVerificationSchema.parse({
    digestMatches,
    keyProfileMatches,
    signatureValid,
    verified: digestMatches && keyProfileMatches && signatureValid,
    semanticTruthEstablished: false,
    externalAuthorityEstablished: false,
  });
}
