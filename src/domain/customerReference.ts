import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { canonicalizeEvidenceValue } from "./evidenceIntegrity";

export const SyntheticCustomerReferenceSchema = z
  .string()
  .regex(/^custref_v1_[A-Za-z0-9_-]{43}$/);

export const SyntheticAssignmentReferenceSchema = z
  .string()
  .regex(/^assignment_[a-f0-9]{32}$/);

export type SyntheticCustomerReference = z.infer<
  typeof SyntheticCustomerReferenceSchema
>;

export interface SyntheticCustomerReferenceScope {
  sessionId: string;
  tenantId: string;
  partnerOrgId: string;
  allowedCustomerIds: readonly string[];
}

function validatedScope(scope: SyntheticCustomerReferenceScope) {
  return {
    sessionId: z.string().uuid().parse(scope.sessionId),
    tenantId: z.string().min(1).max(120).parse(scope.tenantId),
    partnerOrgId: z.string().min(1).max(120).parse(scope.partnerOrgId),
    allowedCustomerIds: z.array(z.string().uuid()).max(64).parse(scope.allowedCustomerIds),
  };
}

export function deriveSyntheticCustomerReference(
  scopeInput: SyntheticCustomerReferenceScope,
  customerIdInput: string,
) {
  const scope = validatedScope(scopeInput);
  const customerId = z.string().uuid().parse(customerIdInput);
  if (!scope.allowedCustomerIds.includes(customerId))
    throw new Error("CUSTOMER_REFERENCE_SCOPE_DENIED");

  const message = canonicalizeEvidenceValue({
    domain: "ENAWUGA_SYNTHETIC_CUSTOMER_REFERENCE_V1",
    tenantId: scope.tenantId,
    partnerOrgId: scope.partnerOrgId,
    customerId,
  });
  const digest = createHmac("sha256", scope.sessionId)
    .update(message, "utf8")
    .digest("base64url");
  return SyntheticCustomerReferenceSchema.parse(`custref_v1_${digest}`);
}

export function resolveSyntheticCustomerReference(
  scopeInput: SyntheticCustomerReferenceScope,
  referenceInput: string,
) {
  const scope = validatedScope(scopeInput);
  const reference = SyntheticCustomerReferenceSchema.parse(referenceInput);
  for (const customerId of scope.allowedCustomerIds) {
    const candidate = deriveSyntheticCustomerReference(scope, customerId);
    const left = Buffer.from(candidate, "utf8");
    const right = Buffer.from(reference, "utf8");
    if (left.length === right.length && timingSafeEqual(left, right)) return customerId;
  }
  throw new Error("CUSTOMER_REFERENCE_SCOPE_DENIED");
}

export function assignmentReferenceForCustomerReference(
  referenceInput: SyntheticCustomerReference,
) {
  const reference = SyntheticCustomerReferenceSchema.parse(referenceInput);
  const digest = createHash("sha256").update(reference, "utf8").digest("hex");
  return SyntheticAssignmentReferenceSchema.parse(`assignment_${digest.slice(0, 32)}`);
}
