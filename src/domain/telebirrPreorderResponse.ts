import { z } from "zod";

const MerchantOrderId = z.string().regex(/^[A-Za-z0-9]+$/).max(64);
const SafeProviderId = z
  .string()
  .regex(/^[A-Za-z0-9._~-]+$/)
  .max(256);
const SafeProviderText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !/[\u0000-\u001F\u007F]/.test(value));
const ProviderCode = z.union([SafeProviderText(128), z.number().finite()]);

/**
 * Bounded response envelope based on current Ethio telecom FAQ evidence and
 * the project portal export. Passthrough is intentional because the current
 * provider response contract is not fully published/pinned yet.
 *
 * IMPORTANT: a preorder response creates at most correlated provider-order
 * evidence. It is not evidence that the customer paid, that funds settled, or
 * that PartnerFI posting occurred.
 */
export const TelebirrPreorderResponseEnvelopeSchema = z
  .object({
    result: SafeProviderText(32).optional(),
    code: ProviderCode.optional(),
    msg: SafeProviderText(512).optional(),
    errorCode: ProviderCode.optional(),
    errorMsg: SafeProviderText(512).optional(),
    nonce_str: SafeProviderText(128).optional(),
    sign: SafeProviderText(8192).optional(),
    sign_type: SafeProviderText(64).optional(),
    biz_content: z
      .object({
        merch_order_id: z.union([MerchantOrderId, z.null()]).optional(),
        prepay_id: z.union([SafeProviderId, z.null()]).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type TelebirrPreorderResponseEnvelope = z.infer<
  typeof TelebirrPreorderResponseEnvelopeSchema
>;

export type TelebirrPreorderClassification =
  | {
      state: "ORDER_CREATED";
      merchantOrderId: string;
      prepayId: string;
      paymentConfirmed: false;
      settlementConfirmed: false;
    }
  | {
      state: "PROVIDER_REJECTED";
      providerCode?: string;
      paymentConfirmed: false;
      settlementConfirmed: false;
    }
  | {
      state: "RESPONSE_BINDING_MISMATCH";
      paymentConfirmed: false;
      settlementConfirmed: false;
    }
  | {
      state: "RESPONSE_UNVERIFIED";
      paymentConfirmed: false;
      settlementConfirmed: false;
    };

function normalizeProviderCode(value: unknown) {
  if (
    typeof value === "string" &&
    /^[A-Za-z0-9._:-]{1,128}$/.test(value)
  )
    return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * Classifies a Telebirr preorder response without elevating it to payment or
 * settlement authority. The response signature is deliberately NOT verified
 * here because the active response-signature/public-key contract has not yet
 * been pinned from authoritative current documentation.
 *
 * ORDER_CREATED is returned only for an explicit SUCCESS result with a
 * non-empty safe prepay_id and exact merchant-order binding. Unknown or absent
 * outcomes remain RESPONSE_UNVERIFIED.
 */
export function classifyTelebirrPreorderResponse(
  raw: unknown,
  expectedMerchantOrderId: string,
): TelebirrPreorderClassification {
  const expected = MerchantOrderId.parse(expectedMerchantOrderId);
  const parsed = TelebirrPreorderResponseEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      state: "RESPONSE_UNVERIFIED",
      paymentConfirmed: false,
      settlementConfirmed: false,
    };
  }

  const response = parsed.data;
  const merchantOrderId = response.biz_content?.merch_order_id ?? undefined;
  if (merchantOrderId && merchantOrderId !== expected) {
    return {
      state: "RESPONSE_BINDING_MISMATCH",
      paymentConfirmed: false,
      settlementConfirmed: false,
    };
  }

  const explicitFailure =
    response.result?.toUpperCase() === "FAIL" ||
    response.errorCode !== undefined ||
    response.errorMsg !== undefined;
  if (explicitFailure) {
    return {
      state: "PROVIDER_REJECTED",
      providerCode:
        normalizeProviderCode(response.errorCode) ??
        normalizeProviderCode(response.code),
      paymentConfirmed: false,
      settlementConfirmed: false,
    };
  }

  if (response.result?.toUpperCase() !== "SUCCESS") {
    return {
      state: "RESPONSE_UNVERIFIED",
      paymentConfirmed: false,
      settlementConfirmed: false,
    };
  }

  const prepayId = response.biz_content?.prepay_id ?? undefined;
  if (!merchantOrderId || !prepayId) {
    return {
      state: "RESPONSE_UNVERIFIED",
      paymentConfirmed: false,
      settlementConfirmed: false,
    };
  }

  return {
    state: "ORDER_CREATED",
    merchantOrderId,
    prepayId,
    paymentConfirmed: false,
    settlementConfirmed: false,
  };
}
