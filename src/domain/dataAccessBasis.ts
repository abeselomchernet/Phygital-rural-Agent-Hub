import { z } from "zod";

export const DataAccessBasisTypeSchema = z.enum([
  "CONSENT",
  "CONTRACTUAL_NECESSITY",
  "LEGAL_OBLIGATION",
  "OTHER_APPROVED_BASIS",
]);

export const DataAccessBasisStatusSchema = z.enum([
  "ACTIVE",
  "SUSPENDED",
  "REVOKED",
  "WITHDRAWN",
]);

export const DataAccessClassSchema = z.enum([
  "PROFILE",
  "CONTACT",
  "SERVICE_HISTORY",
  "EVIDENCE",
  "DECISION_SUPPORT",
]);

const ScopedIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,119}$/);
const EvidenceRefSchema = z.string().regex(/^evidence_[a-z0-9][a-z0-9_-]{2,119}$/);
const PolicyRefSchema = z.string().regex(/^policy_[a-z0-9][a-z0-9_-]{2,119}$/);
const AuditRefSchema = z.string().regex(/^audit_[a-z0-9][a-z0-9_-]{2,119}$/);
const ContractRefSchema = z.string().regex(/^contract_[a-z0-9][a-z0-9_-]{2,119}$/);
const MandateRefSchema = z.string().regex(/^mandate_[a-z0-9][a-z0-9_-]{2,119}$/);
const ConsentRefSchema = z.string().regex(/^consent_[a-z0-9][a-z0-9_-]{2,119}$/);

export const DataAccessBasisRecordSchema = z
  .object({
    basisId: z.string().regex(/^basis_[a-z0-9][a-z0-9_-]{2,119}$/),
    subjectRef: z.string().uuid(),
    requestingOrgId: ScopedIdSchema,
    purpose: ScopedIdSchema,
    basisType: DataAccessBasisTypeSchema,
    basisEvidenceRef: EvidenceRefSchema,
    policyVersion: z.string().regex(/^policy-v[1-9]\d*$/),
    status: DataAccessBasisStatusSchema,
    dataClasses: z.array(DataAccessClassSchema).min(1).max(16),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime().optional(),
    auditRef: AuditRefSchema,
    consentGrantRef: ConsentRefSchema.optional(),
    consentWithdrawnAt: z.string().datetime().optional(),
    contractRef: ContractRefSchema.optional(),
    mandateRef: MandateRefSchema.optional(),
    approvedBasisPolicyRef: PolicyRefSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.validUntil && Date.parse(value.validUntil) <= Date.parse(value.validFrom)) {
      context.addIssue({
        code: "custom",
        message: "DATA_ACCESS_BASIS_VALIDITY_WINDOW_INVALID",
        path: ["validUntil"],
      });
    }

    if (value.basisType === "CONSENT") {
      if (!value.consentGrantRef)
        context.addIssue({ code: "custom", message: "CONSENT_GRANT_REQUIRED", path: ["consentGrantRef"] });
      if (value.contractRef || value.mandateRef || value.approvedBasisPolicyRef)
        context.addIssue({ code: "custom", message: "CONSENT_BASIS_MIXED_EVIDENCE_FORBIDDEN", path: ["basisType"] });
    }

    if (value.basisType === "CONTRACTUAL_NECESSITY") {
      if (!value.contractRef)
        context.addIssue({ code: "custom", message: "CONTRACT_REFERENCE_REQUIRED", path: ["contractRef"] });
      if (value.consentGrantRef || value.mandateRef || value.approvedBasisPolicyRef)
        context.addIssue({ code: "custom", message: "CONTRACT_BASIS_MIXED_EVIDENCE_FORBIDDEN", path: ["basisType"] });
    }

    if (value.basisType === "LEGAL_OBLIGATION") {
      if (!value.mandateRef)
        context.addIssue({ code: "custom", message: "MANDATE_REFERENCE_REQUIRED", path: ["mandateRef"] });
      if (value.consentGrantRef || value.contractRef || value.approvedBasisPolicyRef)
        context.addIssue({ code: "custom", message: "LEGAL_OBLIGATION_MIXED_EVIDENCE_FORBIDDEN", path: ["basisType"] });
    }

    if (value.basisType === "OTHER_APPROVED_BASIS") {
      if (!value.approvedBasisPolicyRef)
        context.addIssue({ code: "custom", message: "APPROVED_BASIS_POLICY_REFERENCE_REQUIRED", path: ["approvedBasisPolicyRef"] });
      if (value.consentGrantRef || value.contractRef || value.mandateRef)
        context.addIssue({ code: "custom", message: "OTHER_BASIS_MIXED_EVIDENCE_FORBIDDEN", path: ["basisType"] });
    }
  });

export const SyntheticDataAccessPolicySchema = z
  .object({
    policyVersion: z.string().regex(/^policy-v[1-9]\d*$/),
    policyRef: PolicyRefSchema,
    dataMode: z.literal("SYNTHETIC_POLICY_FIXTURE"),
    status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]),
    allowedBasisTypes: z.array(DataAccessBasisTypeSchema).min(1).max(4),
    allowedRequestingOrgIds: z.array(ScopedIdSchema).min(1).max(64),
    allowedPurposes: z.array(ScopedIdSchema).min(1).max(64),
    allowedDataClasses: z.array(DataAccessClassSchema).min(1).max(16),
    recognizedBasisEvidenceRefs: z.array(EvidenceRefSchema).min(1).max(128),
    effectiveAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
    governanceEvidenceRef: EvidenceRefSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.expiresAt && Date.parse(value.expiresAt) <= Date.parse(value.effectiveAt)) {
      context.addIssue({
        code: "custom",
        message: "DATA_ACCESS_POLICY_VALIDITY_WINDOW_INVALID",
        path: ["expiresAt"],
      });
    }
  });

export const DataAccessBasisRequestSchema = z
  .object({
    subjectRef: z.string().uuid(),
    requestingOrgId: ScopedIdSchema,
    purpose: ScopedIdSchema,
    requestedDataClasses: z.array(DataAccessClassSchema).min(1).max(16),
    basisId: z.string().regex(/^basis_[a-z0-9][a-z0-9_-]{2,119}$/),
    requestedAt: z.string().datetime(),
  })
  .strict();

export const DataAccessBasisDecisionSchema = z
  .object({
    decision: z.enum(["ALLOW", "DENY"]),
    reason: z.enum([
      "BASIS_VALIDATED_UNDER_SYNTHETIC_POLICY",
      "POLICY_INACTIVE",
      "POLICY_NOT_YET_EFFECTIVE",
      "POLICY_EXPIRED",
      "POLICY_VERSION_MISMATCH",
      "BASIS_ID_MISMATCH",
      "BASIS_INACTIVE",
      "BASIS_NOT_YET_VALID",
      "BASIS_EXPIRED",
      "CONSENT_WITHDRAWN",
      "SUBJECT_MISMATCH",
      "REQUESTING_ORG_MISMATCH",
      "PURPOSE_MISMATCH",
      "BASIS_TYPE_NOT_ALLOWED",
      "ORG_NOT_ALLOWED",
      "PURPOSE_NOT_ALLOWED",
      "DATA_CLASS_NOT_ALLOWED_BY_BASIS",
      "DATA_CLASS_NOT_ALLOWED_BY_POLICY",
      "BASIS_EVIDENCE_NOT_RECOGNIZED",
      "OTHER_BASIS_POLICY_MISMATCH",
    ]),
    basisType: DataAccessBasisTypeSchema,
    basisPolicyValidated: z.boolean(),
    legalSufficiencyEstablished: z.literal(false),
    externalApprovalEstablished: z.literal(false),
    regulatedAuthorityEstablished: z.literal(false),
  })
  .strict();

export type DataAccessBasisRecord = z.infer<typeof DataAccessBasisRecordSchema>;
export type SyntheticDataAccessPolicy = z.infer<typeof SyntheticDataAccessPolicySchema>;
export type DataAccessBasisRequest = z.infer<typeof DataAccessBasisRequestSchema>;

function subset<T extends string>(requested: readonly T[], allowed: readonly T[]) {
  const set = new Set(allowed);
  return requested.every((value) => set.has(value));
}

function result(
  basisType: z.infer<typeof DataAccessBasisTypeSchema>,
  decision: "ALLOW" | "DENY",
  reason: z.infer<typeof DataAccessBasisDecisionSchema>["reason"],
) {
  return DataAccessBasisDecisionSchema.parse({
    decision,
    reason,
    basisType,
    basisPolicyValidated: decision === "ALLOW",
    legalSufficiencyEstablished: false,
    externalApprovalEstablished: false,
    regulatedAuthorityEstablished: false,
  });
}

export function evaluateSyntheticDataAccessBasis(input: {
  request: unknown;
  basis: unknown;
  policy: unknown;
}) {
  const request = DataAccessBasisRequestSchema.parse(input.request);
  const basis = DataAccessBasisRecordSchema.parse(input.basis);
  const policy = SyntheticDataAccessPolicySchema.parse(input.policy);
  const at = Date.parse(request.requestedAt);

  if (policy.status !== "ACTIVE") return result(basis.basisType, "DENY", "POLICY_INACTIVE");
  if (at < Date.parse(policy.effectiveAt))
    return result(basis.basisType, "DENY", "POLICY_NOT_YET_EFFECTIVE");
  if (policy.expiresAt && at >= Date.parse(policy.expiresAt))
    return result(basis.basisType, "DENY", "POLICY_EXPIRED");
  if (basis.policyVersion !== policy.policyVersion)
    return result(basis.basisType, "DENY", "POLICY_VERSION_MISMATCH");
  if (request.basisId !== basis.basisId)
    return result(basis.basisType, "DENY", "BASIS_ID_MISMATCH");
  if (basis.status !== "ACTIVE") return result(basis.basisType, "DENY", "BASIS_INACTIVE");
  if (at < Date.parse(basis.validFrom))
    return result(basis.basisType, "DENY", "BASIS_NOT_YET_VALID");
  if (basis.validUntil && at >= Date.parse(basis.validUntil))
    return result(basis.basisType, "DENY", "BASIS_EXPIRED");
  if (basis.basisType === "CONSENT" && basis.consentWithdrawnAt && at >= Date.parse(basis.consentWithdrawnAt))
    return result(basis.basisType, "DENY", "CONSENT_WITHDRAWN");
  if (request.subjectRef !== basis.subjectRef)
    return result(basis.basisType, "DENY", "SUBJECT_MISMATCH");
  if (request.requestingOrgId !== basis.requestingOrgId)
    return result(basis.basisType, "DENY", "REQUESTING_ORG_MISMATCH");
  if (request.purpose !== basis.purpose)
    return result(basis.basisType, "DENY", "PURPOSE_MISMATCH");
  if (!policy.allowedBasisTypes.includes(basis.basisType))
    return result(basis.basisType, "DENY", "BASIS_TYPE_NOT_ALLOWED");
  if (!policy.allowedRequestingOrgIds.includes(request.requestingOrgId))
    return result(basis.basisType, "DENY", "ORG_NOT_ALLOWED");
  if (!policy.allowedPurposes.includes(request.purpose))
    return result(basis.basisType, "DENY", "PURPOSE_NOT_ALLOWED");
  if (!subset(request.requestedDataClasses, basis.dataClasses))
    return result(basis.basisType, "DENY", "DATA_CLASS_NOT_ALLOWED_BY_BASIS");
  if (!subset(request.requestedDataClasses, policy.allowedDataClasses))
    return result(basis.basisType, "DENY", "DATA_CLASS_NOT_ALLOWED_BY_POLICY");
  if (!policy.recognizedBasisEvidenceRefs.includes(basis.basisEvidenceRef))
    return result(basis.basisType, "DENY", "BASIS_EVIDENCE_NOT_RECOGNIZED");
  if (
    basis.basisType === "OTHER_APPROVED_BASIS" &&
    basis.approvedBasisPolicyRef !== policy.policyRef
  )
    return result(basis.basisType, "DENY", "OTHER_BASIS_POLICY_MISMATCH");

  return result(basis.basisType, "ALLOW", "BASIS_VALIDATED_UNDER_SYNTHETIC_POLICY");
}
