import { z } from "zod";
import {
  assertTelebirrSandboxConfig,
  signTelebirrRequest,
  type TelebirrSandboxConfig,
} from "./telebirrSandbox";

export const TelebirrRawRequestInputSchema = z
  .object({
    prepayId: z.string().min(1).max(256).refine((value) => value === value.trim()),
    nonce: z.string().regex(/^[A-Za-z0-9]+$/).max(64),
    timestamp: z.string().regex(/^\d{10,13}$/),
  })
  .strict();
export type TelebirrRawRequestInput = z.infer<
  typeof TelebirrRawRequestInputSchema
>;

/**
 * Pure H5/SuperApp rawRequest construction based on the supplied Ethio
 * telecom H5 demo. This does not call Telebirr or start a payment. It only
 * prepares the signed string that a separately governed client handoff could
 * use after a provider preorder has returned a prepay_id.
 *
 * The client-side startPay callback remains non-authoritative. Building this
 * string is never evidence of customer payment or PartnerFI settlement.
 */
export function buildTelebirrRawRequest(
  config: TelebirrSandboxConfig,
  input: TelebirrRawRequestInput,
) {
  const safeConfig = assertTelebirrSandboxConfig(config);
  const parsed = TelebirrRawRequestInputSchema.parse(input);
  const unsigned = {
    appid: safeConfig.merchantAppId,
    merch_code: safeConfig.merchantCode,
    nonce_str: parsed.nonce,
    prepay_id: parsed.prepayId,
    timestamp: parsed.timestamp,
  };
  const sign = signTelebirrRequest(unsigned, safeConfig.privateKey);

  // Preserve the field order shown in Ethio telecom's H5 demo. The signature
  // itself is generated from the canonical sorted representation.
  return [
    `appid=${unsigned.appid}`,
    `merch_code=${unsigned.merch_code}`,
    `nonce_str=${unsigned.nonce_str}`,
    `prepay_id=${unsigned.prepay_id}`,
    `timestamp=${unsigned.timestamp}`,
    "sign_type=SHA256WithRSA",
    `sign=${sign}`,
  ].join("&");
}
