import { z } from "zod";
import {
  buildTelebirrRawRequest,
  TelebirrRawRequestInputSchema,
  type TelebirrRawRequestInput,
} from "./telebirrRawRequest";
import {
  assertTelebirrSandboxConfig,
  type TelebirrSandboxConfig,
} from "./telebirrSandbox";

export const TELEBIRR_SANDBOX_WEB_CHECKOUT_BASE_URL =
  "https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?";

export const TelebirrWebCheckoutInputSchema = TelebirrRawRequestInputSchema;
export type TelebirrWebCheckoutInput = TelebirrRawRequestInput;

const SafeProviderConfigIdentifier = z
  .string()
  .regex(/^[A-Za-z0-9._~-]+$/)
  .max(128);

/**
 * Pure C2B browser Web Checkout URL construction based on the supplied
 * Ethio telecom C2B_WebCheckoutDemo. This is deliberately separate from the
 * H5/SuperApp startPay handoff and from the B2B WebCheckout contract.
 *
 * Building this URL performs no provider call, opens no browser and is never
 * evidence that the payer completed a payment or that PartnerFI settlement
 * occurred.
 */
export function buildTelebirrC2BWebCheckoutUrl(
  config: TelebirrSandboxConfig,
  input: TelebirrWebCheckoutInput,
) {
  const safeConfig = assertTelebirrSandboxConfig(config);
  SafeProviderConfigIdentifier.parse(safeConfig.merchantAppId);
  SafeProviderConfigIdentifier.parse(safeConfig.merchantCode);
  const parsed = TelebirrWebCheckoutInputSchema.parse(input);
  const rawRequest = buildTelebirrRawRequest(safeConfig, parsed);

  // Preserve the provider sample's legacy query-string form. The signed raw
  // request is not re-parsed or re-encoded here because that could change the
  // provider-visible signature bytes. All unsigned identifier fields that can
  // affect delimiter structure are constrained before assembly.
  return `${TELEBIRR_SANDBOX_WEB_CHECKOUT_BASE_URL}${rawRequest}&version=1.0&trade_type=Checkout`;
}
