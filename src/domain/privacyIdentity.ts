import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

import { canonicalizeEvidenceValue } from "./evidenceIntegrity";

const HMAC_KEY_BYTES = 32;
const AES_256_KEY_BYTES = 32;
const AES_GCM_NONCE_BYTES = 12;
const PPID_TRUNCATED_BYTES = 20;

export const PrivacyKeyVersionSchema = z
  .string()
  .regex(/^k[1-9]\d*$/)
  .max(24);

export const PartnerPrivacyScopeSchema = z
  .object({
    type: z.literal("PARTNER"),
  })
  .strict();

export const ServicePrivacyScopeSchema = z
  .object({
    type: z.literal("SERVICE"),
    serviceId: z.string().min(1).max(120),
  })
  .strict();

export const PairwisePseudonymousIdRequestSchema = z
  .object({
    customerId: z.string().uuid(),
    partnerOrgId: z.string().min(1).max(120),
    scope: z.union([PartnerPrivacyScopeSchema, ServicePrivacyScopeSchema]),
    keyVersion: PrivacyKeyVersionSchema,
  })
  .strict();

export const PairwisePseudonymousIdSchema = z
  .string()
  .regex(/^ppid_v1_k[1-9]\d*_[A-Za-z0-9_-]{27}$/);

export const EthiopianMsisdnSchema = z.string().regex(/^\+251[79]\d{8}$/);

export const PhoneBlindIndexSchema = z
  .string()
  .regex(/^bidx_[0-9a-f]{64}$/);

export const EncryptedCustomerPhoneRecordSchema = z
  .object({
    customerId: z.string().uuid(),
    phoneBlindIndex: PhoneBlindIndexSchema,
    phoneCiphertext: z.string().min(1),
    phoneNonce: z.string().min(1),
    phoneAuthTag: z.string().min(1),
    indexKeyVersion: PrivacyKeyVersionSchema,
    encryptionKeyVersion: PrivacyKeyVersionSchema,
    updatedAt: z.string().datetime(),
  })
  .strict();

export type PrivacyKeyVersion = z.infer<typeof PrivacyKeyVersionSchema>;
export type PairwisePseudonymousIdRequest = z.infer<
  typeof PairwisePseudonymousIdRequestSchema
>;
export type EncryptedCustomerPhoneRecord = z.infer<
  typeof EncryptedCustomerPhoneRecordSchema
>;

export interface PrivacyKeySet {
  ppidKey: Buffer;
  blindIndexKey: Buffer;
  fieldEncryptionKey: Buffer;
}

function requireSecretKey(
  value: Buffer,
  expectedBytes: number,
  errorCode: string,
) {
  if (!Buffer.isBuffer(value) || value.length !== expectedBytes)
    throw new Error(errorCode);
  return value;
}

function equalKeyMaterial(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validatePrivacyKeySet(keys: PrivacyKeySet) {
  const ppidKey = requireSecretKey(
    keys.ppidKey,
    HMAC_KEY_BYTES,
    "PPID_KEY_MUST_BE_256_BIT",
  );
  const blindIndexKey = requireSecretKey(
    keys.blindIndexKey,
    HMAC_KEY_BYTES,
    "PHONE_BLIND_INDEX_KEY_MUST_BE_256_BIT",
  );
  const fieldEncryptionKey = requireSecretKey(
    keys.fieldEncryptionKey,
    AES_256_KEY_BYTES,
    "PHONE_ENCRYPTION_KEY_MUST_BE_256_BIT",
  );

  if (
    equalKeyMaterial(ppidKey, blindIndexKey) ||
    equalKeyMaterial(ppidKey, fieldEncryptionKey) ||
    equalKeyMaterial(blindIndexKey, fieldEncryptionKey)
  )
    throw new Error("PRIVACY_KEY_PURPOSE_REUSE_FORBIDDEN");

  return keys;
}

export function normalizeEthiopianMsisdn(phone: string) {
  const normalized = phone.replace(/[\s()-]/g, "").replace(/^0/, "+251");
  return EthiopianMsisdnSchema.parse(normalized);
}

function ppidMessage(request: PairwisePseudonymousIdRequest) {
  return canonicalizeEvidenceValue({
    domain: "ENAWUGA_PPID_V1",
    customerId: request.customerId,
    partnerOrgId: request.partnerOrgId,
    scope:
      request.scope.type === "PARTNER"
        ? { type: "PARTNER" }
        : { type: "SERVICE", serviceId: request.scope.serviceId },
  });
}

export function derivePairwisePseudonymousId(
  input: PairwisePseudonymousIdRequest,
  ppidKey: Buffer,
) {
  const request = PairwisePseudonymousIdRequestSchema.parse(input);
  const key = requireSecretKey(
    ppidKey,
    HMAC_KEY_BYTES,
    "PPID_KEY_MUST_BE_256_BIT",
  );
  const digest = createHmac("sha256", key)
    .update(ppidMessage(request), "utf8")
    .digest()
    .subarray(0, PPID_TRUNCATED_BYTES)
    .toString("base64url");
  return PairwisePseudonymousIdSchema.parse(
    `ppid_v1_${request.keyVersion}_${digest}`,
  );
}

export function computePhoneBlindIndex(input: {
  phone: string;
  tenantId: string;
  keyVersion: PrivacyKeyVersion;
}, blindIndexKey: Buffer) {
  const tenantId = z.string().min(1).max(120).parse(input.tenantId);
  const keyVersion = PrivacyKeyVersionSchema.parse(input.keyVersion);
  const phone = normalizeEthiopianMsisdn(input.phone);
  const key = requireSecretKey(
    blindIndexKey,
    HMAC_KEY_BYTES,
    "PHONE_BLIND_INDEX_KEY_MUST_BE_256_BIT",
  );
  const message = canonicalizeEvidenceValue({
    domain: "ENAWUGA_PHONE_BLIND_INDEX_V1",
    tenantId,
    phone,
    keyVersion,
  });
  return PhoneBlindIndexSchema.parse(
    `bidx_${createHmac("sha256", key).update(message, "utf8").digest("hex")}`,
  );
}

function phoneAad(customerId: string, keyVersion: PrivacyKeyVersion) {
  return Buffer.from(
    canonicalizeEvidenceValue({
      domain: "ENAWUGA_PHONE_FIELD_V1",
      customerId,
      keyVersion,
    }),
    "utf8",
  );
}

export function protectCustomerPhone(input: {
  customerId: string;
  tenantId: string;
  phone: string;
  indexKeyVersion: PrivacyKeyVersion;
  encryptionKeyVersion: PrivacyKeyVersion;
  blindIndexKey: Buffer;
  fieldEncryptionKey: Buffer;
  now?: Date;
}): EncryptedCustomerPhoneRecord {
  const customerId = z.string().uuid().parse(input.customerId);
  const indexKeyVersion = PrivacyKeyVersionSchema.parse(input.indexKeyVersion);
  const encryptionKeyVersion = PrivacyKeyVersionSchema.parse(
    input.encryptionKeyVersion,
  );
  const blindIndexKey = requireSecretKey(
    input.blindIndexKey,
    HMAC_KEY_BYTES,
    "PHONE_BLIND_INDEX_KEY_MUST_BE_256_BIT",
  );
  const fieldEncryptionKey = requireSecretKey(
    input.fieldEncryptionKey,
    AES_256_KEY_BYTES,
    "PHONE_ENCRYPTION_KEY_MUST_BE_256_BIT",
  );
  if (equalKeyMaterial(blindIndexKey, fieldEncryptionKey))
    throw new Error("PRIVACY_KEY_PURPOSE_REUSE_FORBIDDEN");

  const phone = normalizeEthiopianMsisdn(input.phone);
  const phoneBlindIndex = computePhoneBlindIndex(
    {
      phone,
      tenantId: input.tenantId,
      keyVersion: indexKeyVersion,
    },
    blindIndexKey,
  );
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", fieldEncryptionKey, nonce);
  cipher.setAAD(phoneAad(customerId, encryptionKeyVersion));
  const ciphertext = Buffer.concat([
    cipher.update(phone, "utf8"),
    cipher.final(),
  ]);

  return EncryptedCustomerPhoneRecordSchema.parse({
    customerId,
    phoneBlindIndex,
    phoneCiphertext: ciphertext.toString("base64"),
    phoneNonce: nonce.toString("base64"),
    phoneAuthTag: cipher.getAuthTag().toString("base64"),
    indexKeyVersion,
    encryptionKeyVersion,
    updatedAt: (input.now ?? new Date()).toISOString(),
  });
}

export function decryptCustomerPhone(
  recordInput: EncryptedCustomerPhoneRecord,
  fieldEncryptionKey: Buffer,
) {
  const record = EncryptedCustomerPhoneRecordSchema.parse(recordInput);
  const key = requireSecretKey(
    fieldEncryptionKey,
    AES_256_KEY_BYTES,
    "PHONE_ENCRYPTION_KEY_MUST_BE_256_BIT",
  );
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(record.phoneNonce, "base64"),
  );
  decipher.setAAD(phoneAad(record.customerId, record.encryptionKeyVersion));
  decipher.setAuthTag(Buffer.from(record.phoneAuthTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(record.phoneCiphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return normalizeEthiopianMsisdn(plaintext);
}
