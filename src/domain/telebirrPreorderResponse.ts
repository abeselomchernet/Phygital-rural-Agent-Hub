import { z } from "zod";

const NonEmptyProviderId = z.string().trim().min(1).max(256);

/**
 * Bounded response envelope based on current Ethio telecom FAQ evidence and
 * the project portal export. Passthrough is intentional because the current
 * provider response contract is not fully published/pinned yet.
 *
 * IMPORTANT: a preorder response creates at most a provider order. It is not
 * evidence that the customer paid, that funds settled, or that PartnerFI
 * posting occurred.
 */
export const TelebirrPreorderResponseEnvelopeSchema = z
  .object({
    result: z.string().optional(),
    code: z.union([z.string(), z.number()]).optional(),
    msg: z.string().optional(),
    errorCode: z.union([z.string(), z.number()]).optional(),
    errorMsg: z.string().optional(),
    nonce_str: z.string().optional(),
    sign: z.string().optional(),
    sign_type: z.string().optional(),
    biz_content: z
      .object({
        merch_order_id: z.union([NonEmptyProviderId, z.null()]).optional(),
        prepay_id: z.union([NonEmptyProviderId, z.null()]).optional(),
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
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 128);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * Classifies a Telebirr preorder response without elevating it to payment or
 * settlement authority. The response signature is deliberately NOT verified
 * here because the active response-signature/public-key contract has not yet
 * been pinned from authoritative current documentation.
 *
 * ORDER_CREATED is returned only when a non-empty prepay_id is present and
 * the response also binds to the exact merchant order ID we submitted.
 */
export function classifyTelebirrPreorderResponse(
  raw: unknown,
  expectedMerchantOrderId: string,
): TelebirrPreorderClassification {
  const expected = z
    .string()
    .regex(/^[A-Za-z0-9]+$/)
    .max(64)
    .parse(expectedMerchantOrderId);
  const parsed = TelebirrPreorderResponseEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      state: "RESPONSE_UNVERIFIED",
      paymentConfirmed: false,
      settlementConfirmed: false,
    };
  }

  const response = parsed.data;
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

  const merchantOrderId = response.biz_content?.merch_order_id ?? undefined;
  const prepayId = response.biz_content?.prepay_id ?? undefined;
  if (!merchantOrderId || !prepayId) {
    return {
      state: "RESPONSE_UNVERIFIED",
      paymentConfirmed: false,
      settlementConfirmed: false,
    };
  }
  if (merchantOrderId !== expected) {
    return {
      state: "RESPONSE_BINDING_MISMATCH",
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
