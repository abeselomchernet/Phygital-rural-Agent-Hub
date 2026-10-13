import { z } from "zod";
import {
  assertTelebirrSandboxConfig,
  signTelebirrRequest,
  type TelebirrSandboxConfig,
} from "./telebirrSandbox";

const SafeProviderConfigIdentifier = z
  .string()
  .regex(/^[A-Za-z0-9._~-]+$/)
  .max(128);

export const TelebirrRawRequestInputSchema = z
  .object({
    prepayId: z
      .string()
      .regex(/^[A-Za-z0-9._~-]+$/)
      .max(256),
    nonce: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    timestamp: z.string().regex(/^\d{10,13}$/),
  })
  .strict();
export type TelebirrRawRequestInput = z.infer<
  typeof TelebirrRawRequestInputSchema
>;

export type TelebirrRawRequestFields = {
  appid: string;
  merch_code: string;
  nonce_str: string;
  prepay_id: string;
  timestamp: string;
  sign_type: "SHA256WithRSA";
  sign: string;
};

export function buildTelebirrRawRequestFields(
  config: TelebirrSandboxConfig,
  input: TelebirrRawRequestInput,
): TelebirrRawRequestFields {
  const safeConfig = assertTelebirrSandboxConfig(config);
  SafeProviderConfigIdentifier.parse(safeConfig.merchantAppId);
  SafeProviderConfigIdentifier.parse(safeConfig.merchantCode);
  const parsed = TelebirrRawRequestInputSchema.parse(input);
  const unsigned = {
    appid: safeConfig.merchantAppId,
    merch_code: safeConfig.merchantCode,
    nonce_str: parsed.nonce,
    prepay_id: parsed.prepayId,
    timestamp: parsed.timestamp,
  };
  return {
    ...unsigned,
    sign_type: "SHA256WithRSA",
    sign: signTelebirrRequest(unsigned, safeConfig.privateKey),
  };
}

/**
 * Pure H5/SuperApp rawRequest construction based on the supplied Ethio
 * telecom H5 demo. This does not call Telebirr or start a payment. It only
 * prepares the legacy signed string that a separately governed client handoff
 * could use after a provider preorder has returned a prepay_id.
 *
 * The client-side startPay callback remains non-authoritative. Building this
 * string is never evidence of customer payment or PartnerFI settlement.
 */
export function buildTelebirrRawRequest(
  config: TelebirrSandboxConfig,
  input: TelebirrRawRequestInput,
) {
  const fields = buildTelebirrRawRequestFields(config, input);

  // Preserve the field order shown in Ethio telecom's H5 demo. This raw H5
  // string is intentionally distinct from browser URL serialization: browser
  // query parameters are percent-encoded separately so base64 signature bytes
  // survive normal URL parsing.
  return [
    `appid=${fields.appid}`,
    `merch_code=${fields.merch_code}`,
    `nonce_str=${fields.nonce_str}`,
    `prepay_id=${fields.prepay_id}`,
    `timestamp=${fields.timestamp}`,
    `sign_type=${fields.sign_type}`,
    `sign=${fields.sign}`,
  ].join("&");
}
