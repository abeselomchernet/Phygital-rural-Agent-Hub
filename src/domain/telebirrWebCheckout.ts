import {
  buildTelebirrRawRequestFields,
  TelebirrRawRequestInputSchema,
  type TelebirrRawRequestInput,
} from "./telebirrRawRequest";
import type { TelebirrSandboxConfig } from "./telebirrSandbox";

export const TELEBIRR_SANDBOX_WEB_CHECKOUT_BASE_URL =
  "https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?";

export const TelebirrWebCheckoutInputSchema = TelebirrRawRequestInputSchema;
export type TelebirrWebCheckoutInput = TelebirrRawRequestInput;

/**
 * Pure C2B browser Web Checkout URL construction based on the supplied
 * Ethio telecom C2B_WebCheckoutDemo. This is deliberately separate from the
 * H5/SuperApp startPay handoff and from the B2B WebCheckout contract.
 *
 * Browser query serialization percent-encodes each field independently so a
 * base64 signature containing '+', '/', or '=' round-trips byte-for-byte
 * through standards-compliant URL parsing. Provider compatibility for this
 * safer serialization remains a TestBed conformance gate before activation.
 *
 * Building this URL performs no provider call, opens no browser and is never
 * evidence that the payer completed a payment or that PartnerFI settlement
 * occurred.
 */
export function buildTelebirrC2BWebCheckoutUrl(
  config: TelebirrSandboxConfig,
  input: TelebirrWebCheckoutInput,
) {
  const parsed = TelebirrWebCheckoutInputSchema.parse(input);
  const fields = buildTelebirrRawRequestFields(config, parsed);
  const params = new URLSearchParams([
    ["appid", fields.appid],
    ["merch_code", fields.merch_code],
    ["nonce_str", fields.nonce_str],
    ["prepay_id", fields.prepay_id],
    ["timestamp", fields.timestamp],
    ["sign_type", fields.sign_type],
    ["sign", fields.sign],
    ["version", "1.0"],
    ["trade_type", "Checkout"],
  ]);
  return `${TELEBIRR_SANDBOX_WEB_CHECKOUT_BASE_URL}${params.toString()}`;
}
