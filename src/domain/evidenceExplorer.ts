import { z } from "zod";

export const EvidenceExplorerViewerRoleSchema = z.enum([
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
]);

export const EvidenceClassSchema = z.enum([
  "OBSERVED",
  "REPORTED",
  "DERIVED",
  "SYNTHETIC",
  "EXTERNALLY_AUTHORITATIVE",
]);

export const EvidenceIntegrityStateSchema = z.enum([
  "INTEGRITY_VERIFIED",
  "INTEGRITY_NOT_VERIFIED",
]);

export const EvidenceSourceAuthenticationStateSchema = z.enum([
  "SOURCE_AUTHENTICATED",
  "SOURCE_DECLARED_ONLY",
  "SOURCE_AUTHENTICATION_UNKNOWN",
]);

export const EvidenceSemanticConfirmationStateSchema = z.enum([
  "SEMANTICALLY_CONFIRMED",
  "SEMANTICALLY_UNCONFIRMED",
  "SEMANTIC_CONFIRMATION_NOT_APPLICABLE",
]);

export const EvidenceExternalAuthorityStateSchema = z.enum([
  "EXTERNALLY_AUTHORITATIVE",
  "NOT_EXTERNALLY_AUTHORITATIVE",
  "EXTERNAL_AUTHORITY_UNKNOWN",
]);

export const EvidenceReviewStateSchema = z.enum([
  "NO_REVIEW_REQUIRED",
  "REVIEW_REQUIRED",
  "RECONCILIATION_REQUIRED",
  "DISPUTED",
  "CORRECTED",
  "EXPIRED",
]);

const IdentifierSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,119}$/);
const EvidenceIdSchema = z.string().regex(/^evidence_syn_[a-z0-9_]+$/);
const CorrelationIdSchema = z.string().regex(/^corr_syn_[a-z0-9_]+$/);
const DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const EvidenceExplorerRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    evidenceId: EvidenceIdSchema,
    correlationId: CorrelationIdSchema,
    tenantId: IdentifierSchema,
    hubId: z.string().regex(/^hub_[a-z0-9][a-z0-9_-]{2,119}$/),
    partnerOrgId: IdentifierSchema,
    serviceId: IdentifierSchema,
    capabilityId: IdentifierSchema,
    sourceActorRef: IdentifierSchema,
    provenanceRef: IdentifierSchema,
    occurredAt: z.string().datetime(),
    evidenceClass: EvidenceClassSchema,
    integrityState: EvidenceIntegrityStateSchema,
    sourceAuthenticationState: EvidenceSourceAuthenticationStateSchema,
    semanticConfirmationState: EvidenceSemanticConfirmationStateSchema,
    externalAuthorityState: EvidenceExternalAuthorityStateSchema,
    reviewState: EvidenceReviewStateSchema,
    evidenceDigest: DigestSchema.optional(),
    synthetic: z.literal(true),
    rawPayloadIncluded: z.literal(false),
    piiIncluded: z.literal(false),
    mutationAuthorityGranted: z.literal(false),
    limitationCodes: z.array(IdentifierSchema).min(1).max(16),
  })
  .strict()
  .superRefine((record, context) => {
    if (
      record.integrityState === "INTEGRITY_VERIFIED" &&
      !record.evidenceDigest
    ) {
      context.addIssue({
        code: "custom",
        message: "INTEGRITY_VERIFIED_REQUIRES_DIGEST",
        path: ["evidenceDigest"],
      });
    }
    if (
      record.externalAuthorityState === "EXTERNALLY_AUTHORITATIVE" &&
      record.evidenceClass === "SYNTHETIC"
    ) {
      context.addIssue({
        code: "custom",
        message: "SYNTHETIC_EVIDENCE_CANNOT_BE_EXTERNALLY_AUTHORITATIVE",
        path: ["externalAuthorityState"],
      });
    }
  });

export const EvidenceExplorerQuerySchema = z
  .object({
    evidenceId: EvidenceIdSchema.optional(),
    correlationId: CorrelationIdSchema.optional(),
    serviceId: IdentifierSchema.optional(),
    capabilityId: IdentifierSchema.optional(),
    evidenceClass: EvidenceClassSchema.optional(),
    reviewState: EvidenceReviewStateSchema.optional(),
    occurredFrom: z.string().datetime().optional(),
    occurredTo: z.string().datetime().optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (
      query.occurredFrom &&
      query.occurredTo &&
      Date.parse(query.occurredFrom) > Date.parse(query.occurredTo)
    ) {
      context.addIssue({
        code: "custom",
        message: "EVIDENCE_EXPLORER_DATE_RANGE_INVALID",
        path: ["occurredFrom"],
      });
    }
  });

const CommonProjectionSchema = z
  .object({
    evidenceId: EvidenceIdSchema,
    correlationId: CorrelationIdSchema,
    occurredAt: z.string().datetime(),
    evidenceClass: EvidenceClassSchema,
    integrityState: EvidenceIntegrityStateSchema,
    sourceAuthenticationState: EvidenceSourceAuthenticationStateSchema,
    semanticConfirmationState: EvidenceSemanticConfirmationStateSchema,
    externalAuthorityState: EvidenceExternalAuthorityStateSchema,
    reviewState: EvidenceReviewStateSchema,
    evidenceDigest: DigestSchema.optional(),
    synthetic: z.literal(true),
    piiIncluded: z.literal(false),
    mutationAuthorityGranted: z.literal(false),
    limitationCodes: z.array(IdentifierSchema),
  })
  .strict();

export const SupervisorEvidenceProjectionSchema = CommonProjectionSchema.extend({
  projection: z.literal("SUPERVISOR_EVIDENCE_SUMMARY"),
  serviceId: IdentifierSchema,
  capabilityId: IdentifierSchema,
}).strict();

export const OperationsEvidenceProjectionSchema = CommonProjectionSchema.extend({
  projection: z.literal("OPERATIONS_EVIDENCE_DETAIL"),
  serviceId: IdentifierSchema,
  capabilityId: IdentifierSchema,
  provenanceRef: IdentifierSchema,
}).strict();

export const PartnerAdminEvidenceProjectionSchema = CommonProjectionSchema.extend({
  projection: z.literal("PARTNER_ADMIN_EVIDENCE_DETAIL"),
  serviceId: IdentifierSchema,
  capabilityId: IdentifierSchema,
  sourceActorRef: IdentifierSchema,
  provenanceRef: IdentifierSchema,
}).strict();

export type EvidenceExplorerRecord = z.infer<typeof EvidenceExplorerRecordSchema>;
export type EvidenceExplorerQuery = z.infer<typeof EvidenceExplorerQuerySchema>;
export type EvidenceExplorerViewerRole = z.infer<typeof EvidenceExplorerViewerRoleSchema>;

export function projectEvidenceExplorerRecord(
  recordInput: unknown,
  roleInput: unknown,
) {
  const record = EvidenceExplorerRecordSchema.parse(recordInput);
  const role = EvidenceExplorerViewerRoleSchema.parse(roleInput);
  const common = {
    evidenceId: record.evidenceId,
    correlationId: record.correlationId,
    occurredAt: record.occurredAt,
    evidenceClass: record.evidenceClass,
    integrityState: record.integrityState,
    sourceAuthenticationState: record.sourceAuthenticationState,
    semanticConfirmationState: record.semanticConfirmationState,
    externalAuthorityState: record.externalAuthorityState,
    reviewState: record.reviewState,
    ...(record.evidenceDigest ? { evidenceDigest: record.evidenceDigest } : {}),
    synthetic: true as const,
    piiIncluded: false as const,
    mutationAuthorityGranted: false as const,
    limitationCodes: [...record.limitationCodes],
    serviceId: record.serviceId,
    capabilityId: record.capabilityId,
  };

  if (role === "SUPERVISOR")
    return SupervisorEvidenceProjectionSchema.parse({
      ...common,
      projection: "SUPERVISOR_EVIDENCE_SUMMARY",
    });
  if (role === "OPERATIONS")
    return OperationsEvidenceProjectionSchema.parse({
      ...common,
      projection: "OPERATIONS_EVIDENCE_DETAIL",
      provenanceRef: record.provenanceRef,
    });
  return PartnerAdminEvidenceProjectionSchema.parse({
    ...common,
    projection: "PARTNER_ADMIN_EVIDENCE_DETAIL",
    sourceActorRef: record.sourceActorRef,
    provenanceRef: record.provenanceRef,
  });
}

export function searchEvidenceExplorer(input: {
  records: readonly unknown[];
  role: unknown;
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
  query?: unknown;
}) {
  const role = EvidenceExplorerViewerRoleSchema.parse(input.role);
  const query = EvidenceExplorerQuerySchema.parse(input.query ?? {});
  return input.records
    .map((record) => EvidenceExplorerRecordSchema.parse(record))
    .filter(
      (record) =>
        record.tenantId === input.tenantId &&
        record.hubId === input.hubId &&
        record.partnerOrgId === input.partnerOrgId,
    )
    .filter((record) => !query.evidenceId || record.evidenceId === query.evidenceId)
    .filter(
      (record) =>
        !query.correlationId || record.correlationId === query.correlationId,
    )
    .filter((record) => !query.serviceId || record.serviceId === query.serviceId)
    .filter(
      (record) => !query.capabilityId || record.capabilityId === query.capabilityId,
    )
    .filter(
      (record) => !query.evidenceClass || record.evidenceClass === query.evidenceClass,
    )
    .filter(
      (record) => !query.reviewState || record.reviewState === query.reviewState,
    )
    .filter(
      (record) =>
        !query.occurredFrom ||
        Date.parse(record.occurredAt) >= Date.parse(query.occurredFrom),
    )
    .filter(
      (record) =>
        !query.occurredTo ||
        Date.parse(record.occurredAt) <= Date.parse(query.occurredTo),
    )
    .sort((left, right) =>
      left.occurredAt === right.occurredAt
        ? left.evidenceId.localeCompare(right.evidenceId)
        : left.occurredAt.localeCompare(right.occurredAt),
    )
    .map((record) => projectEvidenceExplorerRecord(record, role));
}

const digest = (hex: string) => `sha256:${hex.repeat(64).slice(0, 64)}`;

export const SYNTHETIC_EVIDENCE_EXPLORER_RECORDS = [
  {
    schemaVersion: 1,
    evidenceId: "evidence_syn_alpha_capture_001",
    correlationId: "corr_syn_e1d_alpha_001",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    serviceId: "cash_in",
    capabilityId: "cash_transaction",
    sourceActorRef: "org_syn_partnerfi_alpha",
    provenanceRef: "provenance_e1b_alpha_capture",
    occurredAt: "2026-10-15T06:01:00.000Z",
    evidenceClass: "SYNTHETIC",
    integrityState: "INTEGRITY_VERIFIED",
    sourceAuthenticationState: "SOURCE_DECLARED_ONLY",
    semanticConfirmationState: "SEMANTICALLY_UNCONFIRMED",
    externalAuthorityState: "NOT_EXTERNALLY_AUTHORITATIVE",
    reviewState: "NO_REVIEW_REQUIRED",
    evidenceDigest: digest("a"),
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    mutationAuthorityGranted: false,
    limitationCodes: ["synthetic_stage4", "transport_not_settlement"],
  },
  {
    schemaVersion: 1,
    evidenceId: "evidence_syn_alpha_conflict_001",
    correlationId: "corr_syn_e1d_alpha_conflict_001",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    serviceId: "cash_in",
    capabilityId: "cash_transaction",
    sourceActorRef: "enawuga_hub_domain",
    provenanceRef: "provenance_e1e_alpha_conflict",
    occurredAt: "2026-10-15T06:05:00.000Z",
    evidenceClass: "DERIVED",
    integrityState: "INTEGRITY_VERIFIED",
    sourceAuthenticationState: "SOURCE_AUTHENTICATED",
    semanticConfirmationState: "SEMANTIC_CONFIRMATION_NOT_APPLICABLE",
    externalAuthorityState: "NOT_EXTERNALLY_AUTHORITATIVE",
    reviewState: "REVIEW_REQUIRED",
    evidenceDigest: digest("b"),
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    mutationAuthorityGranted: false,
    limitationCodes: ["synthetic_stage4", "conflict_requires_human_review"],
  },
  {
    schemaVersion: 1,
    evidenceId: "evidence_syn_alpha_reconcile_001",
    correlationId: "corr_syn_e1d_alpha_reconcile_001",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    serviceId: "cash_in",
    capabilityId: "cash_transaction",
    sourceActorRef: "enawuga_hub_domain",
    provenanceRef: "provenance_e4_alpha_reconcile",
    occurredAt: "2026-10-15T06:09:00.000Z",
    evidenceClass: "DERIVED",
    integrityState: "INTEGRITY_VERIFIED",
    sourceAuthenticationState: "SOURCE_AUTHENTICATED",
    semanticConfirmationState: "SEMANTICALLY_UNCONFIRMED",
    externalAuthorityState: "EXTERNAL_AUTHORITY_UNKNOWN",
    reviewState: "RECONCILIATION_REQUIRED",
    evidenceDigest: digest("c"),
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    mutationAuthorityGranted: false,
    limitationCodes: ["synthetic_stage4", "outcome_not_settlement"],
  },
  {
    schemaVersion: 1,
    evidenceId: "evidence_syn_alpha_external_response_001",
    correlationId: "corr_syn_external_response_alpha_001",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    serviceId: "cash_in",
    capabilityId: "cash_transaction",
    sourceActorRef: "org_syn_partnerfi_alpha",
    provenanceRef: "provenance_partnerfi_alpha_external_response",
    occurredAt: "2026-10-15T06:12:00.000Z",
    evidenceClass: "REPORTED",
    integrityState: "INTEGRITY_VERIFIED",
    sourceAuthenticationState: "SOURCE_DECLARED_ONLY",
    semanticConfirmationState: "SEMANTICALLY_UNCONFIRMED",
    externalAuthorityState: "EXTERNAL_AUTHORITY_UNKNOWN",
    reviewState: "REVIEW_REQUIRED",
    evidenceDigest: digest("e"),
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    mutationAuthorityGranted: false,
    limitationCodes: [
      "synthetic_stage4",
      "external_response_not_external_fact",
    ],
  },
  {
    schemaVersion: 1,
    evidenceId: "evidence_syn_beta_capture_001",
    correlationId: "corr_syn_e1d_beta_001",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_beta",
    serviceId: "savings_inquiry",
    capabilityId: "account_lookup",
    sourceActorRef: "org_syn_partnerfi_beta",
    provenanceRef: "provenance_e1b_beta_capture",
    occurredAt: "2026-10-15T06:02:00.000Z",
    evidenceClass: "SYNTHETIC",
    integrityState: "INTEGRITY_VERIFIED",
    sourceAuthenticationState: "SOURCE_DECLARED_ONLY",
    semanticConfirmationState: "SEMANTICALLY_UNCONFIRMED",
    externalAuthorityState: "NOT_EXTERNALLY_AUTHORITATIVE",
    reviewState: "NO_REVIEW_REQUIRED",
    evidenceDigest: digest("d"),
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    mutationAuthorityGranted: false,
    limitationCodes: ["synthetic_stage4", "shared_hub_partner_isolation"],
  },
] as const;

for (const record of SYNTHETIC_EVIDENCE_EXPLORER_RECORDS)
  EvidenceExplorerRecordSchema.parse(record);
