import { z } from "zod";

// Internal orchestration vocabulary, not a provider request/response schema.
export const PaymentProviderSchema = z.enum([
  "ARIFPAY",
  "TELEBIRR_DIRECT",
  "MPESA_ETHIOPIA_DIRECT",
]);
const reference = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/);

export const PaymentAttemptRequestSchema = z.object({
  transactionId: z.string().uuid(),
  customerId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().regex(/^[A-Z]{3}$/),
  provider: PaymentProviderSchema,
  jurisdiction: z.string().regex(/^[A-Z]{2}$/),
  environment: z.enum(["sandbox", "production"]),
  product: reference,
  merchantConfigRef: reference,
  providerContractRef: reference,
}).strict();
export type PaymentAttemptRequest = z.infer<typeof PaymentAttemptRequestSchema>;

/** Acceptance describes initiation only. Settlement belongs to a separate authority. */
export const PaymentInitiationEvidenceSchema = z.object({
  kind: z.literal("INITIATION"),
  outcome: z.enum(["ACCEPTED", "REJECTED", "UNCERTAIN"]),
  paymentCompletion: z.literal("NOT_ESTABLISHED"),
}).strict();
export type PaymentInitiationEvidence = z.infer<typeof PaymentInitiationEvidenceSchema>;

/** Stable across input property order; includes every validated request field. */
export function paymentAttemptFingerprint(input: PaymentAttemptRequest): string {
  return JSON.stringify(PaymentAttemptRequestSchema.parse(input));
}
