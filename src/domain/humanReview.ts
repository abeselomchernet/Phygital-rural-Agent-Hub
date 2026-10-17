import { z } from "zod";

export const HumanReviewViewerRoleSchema = z.enum([
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
]);

export const HumanReviewCaseTypeSchema = z.enum([
  "IDENTITY_CONFLICT",
  "TRANSPORT_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "OUTCOME_UNCERTAINTY",
  "RECONCILIATION_DISCREPANCY",
  "EVIDENCE_CORRECTION",
  "PAYMENT_AMBIGUITY",
  "SERVICE_FULFILLMENT_DISPUTE",
  "ARDI_EVIDENCE_CONFLICT",
  "POLICY_EXCEPTION",
  "PRIVACY_EXCEPTION",
]);

export const HumanReviewCaseStatusSchema = z.enum([
  "PENDING",
  "IN_REVIEW",
  "ESCALATED",
  "EXTERNAL_AUTHORITY_REQUIRED",
  "RESOLVED",
  "CLOSED",
]);

export const HumanReviewAuthorityOwnerSchema = z.enum([
  "ENAWUGA_SUPERVISOR",
  "ENAWUGA_OPERATIONS",
  "PARTNERFI_OR_EXTERNAL_AUTHORITY",
]);

export const HumanReviewActionSchema = z.enum([
  "ACKNOWLEDGE",
  "ASSIGN",
  "ESCALATE",
  "REQUEST_MORE_EVIDENCE",
  "MARK_DUPLICATE",
  "RETRY_TRANSPORT_IF_SAFE",
  "REQUEST_RECONCILIATION",
  "ADD_REVIEW_NOTE",
  "CLOSE_OPERATIONAL_CASE",
]);

const ScopeIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,119}$/);
const HubIdSchema = z.string().regex(/^hub_[a-z0-9][a-z0-9_-]{2,119}$/);
const CaseIdSchema = z.string().regex(/^case_syn_[a-z0-9_]+$/);
const EvidenceIdSchema = z.string().regex(/^evidence_syn_[a-z0-9_]+$/);
const CorrelationIdSchema = z.string().regex(/^corr_syn_[a-z0-9_]+$/);

export const HumanReviewCaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    caseId: CaseIdSchema,
    caseType: HumanReviewCaseTypeSchema,
    status: HumanReviewCaseStatusSchema,
    tenantId: ScopeIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: ScopeIdSchema,
    correlationId: CorrelationIdSchema.optional(),
    evidenceRefs: z.array(EvidenceIdSchema).min(1).max(32),
    reviewRoles: z.array(HumanReviewViewerRoleSchema).min(1).max(3),
    authorityOwner: HumanReviewAuthorityOwnerSchema,
    externalAuthorityRequired: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    synthetic: z.literal(true),
    rawPayloadIncluded: z.literal(false),
    piiIncluded: z.literal(false),
    automaticResolutionAllowed: z.literal(false),
    financialAuthorityGranted: z.literal(false),
    creditApprovalAuthorityGranted: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
    insuranceAdjudicationAuthorityGranted: z.literal(false),
    deviceControlAuthorityGranted: z.literal(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) {
      context.addIssue({
        code: "custom",
        message: "HUMAN_REVIEW_UPDATED_BEFORE_CREATED",
        path: ["updatedAt"],
      });
    }
    if (
      value.externalAuthorityRequired &&
      value.authorityOwner !== "PARTNERFI_OR_EXTERNAL_AUTHORITY"
    ) {
      context.addIssue({
        code: "custom",
        message: "EXTERNAL_AUTHORITY_OWNER_REQUIRED",
        path: ["authorityOwner"],
      });
    }
    if (
      !value.externalAuthorityRequired &&
      value.authorityOwner === "PARTNERFI_OR_EXTERNAL_AUTHORITY"
    ) {
      context.addIssue({
        code: "custom",
        message: "EXTERNAL_AUTHORITY_FLAG_REQUIRED_FOR_EXTERNAL_OWNER",
        path: ["externalAuthorityRequired"],
      });
    }
    if (
      !value.externalAuthorityRequired &&
      value.status === "EXTERNAL_AUTHORITY_REQUIRED"
    ) {
      context.addIssue({
        code: "custom",
        message: "EXTERNAL_AUTHORITY_STATUS_REQUIRES_EXTERNAL_OWNER",
        path: ["status"],
      });
    }
    if (new Set(value.evidenceRefs).size !== value.evidenceRefs.length) {
      context.addIssue({
        code: "custom",
        message: "HUMAN_REVIEW_DUPLICATE_EVIDENCE_REF",
        path: ["evidenceRefs"],
      });
    }
    if (new Set(value.reviewRoles).size !== value.reviewRoles.length) {
      context.addIssue({
        code: "custom",
        message: "HUMAN_REVIEW_DUPLICATE_ROLE",
        path: ["reviewRoles"],
      });
    }
  });

export const HumanReviewQuerySchema = z
  .object({
    caseId: CaseIdSchema.optional(),
    caseType: HumanReviewCaseTypeSchema.optional(),
    status: HumanReviewCaseStatusSchema.optional(),
    correlationId: CorrelationIdSchema.optional(),
    authorityOwner: HumanReviewAuthorityOwnerSchema.optional(),
  })
  .strict();

const CommonCaseProjectionSchema = z
  .object({
    caseId: CaseIdSchema,
    caseType: HumanReviewCaseTypeSchema,
    status: HumanReviewCaseStatusSchema,
    correlationId: CorrelationIdSchema.optional(),
    evidenceRefs: z.array(EvidenceIdSchema),
    authorityOwner: HumanReviewAuthorityOwnerSchema,
    externalAuthorityRequired: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    synthetic: z.literal(true),
    piiIncluded: z.literal(false),
    mutationMounted: z.boolean(),
    automaticResolutionAllowed: z.literal(false),
    financialAuthorityGranted: z.literal(false),
    creditApprovalAuthorityGranted: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
    insuranceAdjudicationAuthorityGranted: z.literal(false),
    deviceControlAuthorityGranted: z.literal(false),
  })
  .strict();

export const SupervisorHumanReviewProjectionSchema =
  CommonCaseProjectionSchema.extend({
    projection: z.literal("SUPERVISOR_REVIEW_CASE"),
  }).strict();

export const OperationsHumanReviewProjectionSchema =
  CommonCaseProjectionSchema.extend({
    projection: z.literal("OPERATIONS_REVIEW_CASE"),
  }).strict();

export const PartnerAdminHumanReviewProjectionSchema =
  CommonCaseProjectionSchema.extend({
    projection: z.literal("PARTNER_ADMIN_REVIEW_CASE"),
  }).strict();

export type HumanReviewCase = z.infer<typeof HumanReviewCaseSchema>;
export type HumanReviewViewerRole = z.infer<typeof HumanReviewViewerRoleSchema>;
export type HumanReviewAction = z.infer<typeof HumanReviewActionSchema>;

const ROLE_ACTIONS: Record<HumanReviewViewerRole, readonly HumanReviewAction[]> = {
  SUPERVISOR: [
    "ACKNOWLEDGE",
    "ASSIGN",
    "ESCALATE",
    "REQUEST_MORE_EVIDENCE",
    "ADD_REVIEW_NOTE",
    "CLOSE_OPERATIONAL_CASE",
  ],
  OPERATIONS: [
    "ACKNOWLEDGE",
    "ASSIGN",
    "ESCALATE",
    "REQUEST_MORE_EVIDENCE",
    "MARK_DUPLICATE",
    "RETRY_TRANSPORT_IF_SAFE",
    "REQUEST_RECONCILIATION",
    "ADD_REVIEW_NOTE",
    "CLOSE_OPERATIONAL_CASE",
  ],
  PARTNER_ADMIN: [],
};

const LIFECYCLE_TRANSITIONS: Record<
  z.infer<typeof HumanReviewCaseStatusSchema>,
  readonly z.infer<typeof HumanReviewCaseStatusSchema>[]
> = {
  PENDING: ["IN_REVIEW"],
  IN_REVIEW: [
    "PENDING",
    "ESCALATED",
    "EXTERNAL_AUTHORITY_REQUIRED",
    "RESOLVED",
  ],
  ESCALATED: ["IN_REVIEW"],
  EXTERNAL_AUTHORITY_REQUIRED: ["IN_REVIEW"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export function isHumanReviewTransitionAllowed(fromInput: unknown, toInput: unknown) {
  const from = HumanReviewCaseStatusSchema.parse(fromInput);
  const to = HumanReviewCaseStatusSchema.parse(toInput);
  return LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function projectHumanReviewCase(
  caseInput: unknown,
  roleInput: unknown,
  mutationMounted = false,
) {
  const reviewCase = HumanReviewCaseSchema.parse(caseInput);
  const role = HumanReviewViewerRoleSchema.parse(roleInput);
  if (!reviewCase.reviewRoles.includes(role)) return null;

  const common = {
    caseId: reviewCase.caseId,
    caseType: reviewCase.caseType,
    status: reviewCase.status,
    ...(reviewCase.correlationId
      ? { correlationId: reviewCase.correlationId }
      : {}),
    evidenceRefs: [...reviewCase.evidenceRefs],
    authorityOwner: reviewCase.authorityOwner,
    externalAuthorityRequired: reviewCase.externalAuthorityRequired,
    createdAt: reviewCase.createdAt,
    updatedAt: reviewCase.updatedAt,
    synthetic: true as const,
    piiIncluded: false as const,
    mutationMounted,
    automaticResolutionAllowed: false as const,
    financialAuthorityGranted: false as const,
    creditApprovalAuthorityGranted: false as const,
    settlementAuthorityGranted: false as const,
    insuranceAdjudicationAuthorityGranted: false as const,
    deviceControlAuthorityGranted: false as const,
  };

  if (role === "SUPERVISOR")
    return SupervisorHumanReviewProjectionSchema.parse({
      ...common,
      projection: "SUPERVISOR_REVIEW_CASE",
    });
  if (role === "OPERATIONS")
    return OperationsHumanReviewProjectionSchema.parse({
      ...common,
      projection: "OPERATIONS_REVIEW_CASE",
    });
  return PartnerAdminHumanReviewProjectionSchema.parse({
    ...common,
    projection: "PARTNER_ADMIN_REVIEW_CASE",
  });
}

export function searchHumanReviewCases(input: {
  cases: readonly unknown[];
  role: unknown;
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
  query?: unknown;
  mutationMounted?: boolean;
}) {
  const role = HumanReviewViewerRoleSchema.parse(input.role);
  const query = HumanReviewQuerySchema.parse(input.query ?? {});

  return input.cases
    .map((entry) => HumanReviewCaseSchema.parse(entry))
    .filter(
      (entry) =>
        entry.tenantId === input.tenantId &&
        entry.hubId === input.hubId &&
        entry.partnerOrgId === input.partnerOrgId,
    )
    .filter((entry) => entry.reviewRoles.includes(role))
    .filter((entry) => !query.caseId || entry.caseId === query.caseId)
    .filter((entry) => !query.caseType || entry.caseType === query.caseType)
    .filter((entry) => !query.status || entry.status === query.status)
    .filter(
      (entry) =>
        !query.correlationId || entry.correlationId === query.correlationId,
    )
    .filter(
      (entry) =>
        !query.authorityOwner || entry.authorityOwner === query.authorityOwner,
    )
    .sort((left, right) =>
      left.createdAt === right.createdAt
        ? left.caseId.localeCompare(right.caseId)
        : left.createdAt.localeCompare(right.createdAt),
    )
    .map((entry) => projectHumanReviewCase(entry, role, input.mutationMounted ?? false))
    .filter((entry) => entry !== null);
}

export const HumanReviewActionPolicyDecisionSchema = z
  .object({
    decision: z.enum(["ALLOW_POLICY_ONLY", "DENY"]),
    reason: z.enum([
      "ACTION_POLICY_ELIGIBLE_NOT_MOUNTED",
      "ROLE_NOT_ASSIGNED_TO_CASE",
      "ROLE_ACTION_DENIED",
      "CASE_ALREADY_CLOSED",
      "CASE_NOT_RESOLVED",
      "EXTERNAL_AUTHORITY_REQUIRED",
    ]),
    mutationMounted: z.literal(false),
    automaticResolutionAllowed: z.literal(false),
    financialAuthorityGranted: z.literal(false),
    creditApprovalAuthorityGranted: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
    insuranceAdjudicationAuthorityGranted: z.literal(false),
    deviceControlAuthorityGranted: z.literal(false),
  })
  .strict();

function actionDecision(
  decision: "ALLOW_POLICY_ONLY" | "DENY",
  reason: z.infer<typeof HumanReviewActionPolicyDecisionSchema>["reason"],
) {
  return HumanReviewActionPolicyDecisionSchema.parse({
    decision,
    reason,
    mutationMounted: false,
    automaticResolutionAllowed: false,
    financialAuthorityGranted: false,
    creditApprovalAuthorityGranted: false,
    settlementAuthorityGranted: false,
    insuranceAdjudicationAuthorityGranted: false,
    deviceControlAuthorityGranted: false,
  });
}

export function evaluateHumanReviewActionPolicy(input: {
  reviewCase: unknown;
  role: unknown;
  action: unknown;
}) {
  const reviewCase = HumanReviewCaseSchema.parse(input.reviewCase);
  const role = HumanReviewViewerRoleSchema.parse(input.role);
  const action = HumanReviewActionSchema.parse(input.action);

  if (!reviewCase.reviewRoles.includes(role))
    return actionDecision("DENY", "ROLE_NOT_ASSIGNED_TO_CASE");
  if (!ROLE_ACTIONS[role].includes(action))
    return actionDecision("DENY", "ROLE_ACTION_DENIED");
  if (reviewCase.status === "CLOSED")
    return actionDecision("DENY", "CASE_ALREADY_CLOSED");
  if (
    reviewCase.externalAuthorityRequired &&
    action === "CLOSE_OPERATIONAL_CASE"
  )
    return actionDecision("DENY", "EXTERNAL_AUTHORITY_REQUIRED");
  if (
    action === "CLOSE_OPERATIONAL_CASE" &&
    reviewCase.status !== "RESOLVED"
  )
    return actionDecision("DENY", "CASE_NOT_RESOLVED");

  return actionDecision("ALLOW_POLICY_ONLY", "ACTION_POLICY_ELIGIBLE_NOT_MOUNTED");
}

export const SYNTHETIC_HUMAN_REVIEW_CASES = [
  {
    schemaVersion: 1,
    caseId: "case_syn_alpha_identity_conflict_001",
    caseType: "IDENTITY_CONFLICT",
    status: "PENDING",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    correlationId: "corr_syn_e1d_alpha_conflict_001",
    evidenceRefs: ["evidence_syn_alpha_conflict_001"],
    reviewRoles: ["OPERATIONS", "PARTNER_ADMIN"],
    authorityOwner: "ENAWUGA_OPERATIONS",
    externalAuthorityRequired: false,
    createdAt: "2026-10-15T06:05:30.000Z",
    updatedAt: "2026-10-15T06:05:30.000Z",
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    automaticResolutionAllowed: false,
    financialAuthorityGranted: false,
    creditApprovalAuthorityGranted: false,
    settlementAuthorityGranted: false,
    insuranceAdjudicationAuthorityGranted: false,
    deviceControlAuthorityGranted: false,
  },
  {
    schemaVersion: 1,
    caseId: "case_syn_alpha_outcome_uncertainty_001",
    caseType: "OUTCOME_UNCERTAINTY",
    status: "EXTERNAL_AUTHORITY_REQUIRED",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    correlationId: "corr_syn_e1d_alpha_reconcile_001",
    evidenceRefs: ["evidence_syn_alpha_reconcile_001"],
    reviewRoles: ["OPERATIONS", "PARTNER_ADMIN"],
    authorityOwner: "PARTNERFI_OR_EXTERNAL_AUTHORITY",
    externalAuthorityRequired: true,
    createdAt: "2026-10-15T06:09:30.000Z",
    updatedAt: "2026-10-15T06:09:30.000Z",
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    automaticResolutionAllowed: false,
    financialAuthorityGranted: false,
    creditApprovalAuthorityGranted: false,
    settlementAuthorityGranted: false,
    insuranceAdjudicationAuthorityGranted: false,
    deviceControlAuthorityGranted: false,
  },
  {
    schemaVersion: 1,
    caseId: "case_syn_alpha_evidence_correction_001",
    caseType: "EVIDENCE_CORRECTION",
    status: "PENDING",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    correlationId: "corr_syn_e1d_alpha_001",
    evidenceRefs: ["evidence_syn_alpha_capture_001"],
    reviewRoles: ["SUPERVISOR"],
    authorityOwner: "ENAWUGA_SUPERVISOR",
    externalAuthorityRequired: false,
    createdAt: "2026-10-15T06:10:00.000Z",
    updatedAt: "2026-10-15T06:10:00.000Z",
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    automaticResolutionAllowed: false,
    financialAuthorityGranted: false,
    creditApprovalAuthorityGranted: false,
    settlementAuthorityGranted: false,
    insuranceAdjudicationAuthorityGranted: false,
    deviceControlAuthorityGranted: false,
  },
  {
    schemaVersion: 1,
    caseId: "case_syn_beta_transport_conflict_001",
    caseType: "TRANSPORT_CONFLICT",
    status: "PENDING",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_beta",
    correlationId: "corr_syn_e1d_beta_001",
    evidenceRefs: ["evidence_syn_beta_capture_001"],
    reviewRoles: ["OPERATIONS", "PARTNER_ADMIN"],
    authorityOwner: "ENAWUGA_OPERATIONS",
    externalAuthorityRequired: false,
    createdAt: "2026-10-15T06:03:00.000Z",
    updatedAt: "2026-10-15T06:03:00.000Z",
    synthetic: true,
    rawPayloadIncluded: false,
    piiIncluded: false,
    automaticResolutionAllowed: false,
    financialAuthorityGranted: false,
    creditApprovalAuthorityGranted: false,
    settlementAuthorityGranted: false,
    insuranceAdjudicationAuthorityGranted: false,
    deviceControlAuthorityGranted: false,
  },
] as const;

for (const reviewCase of SYNTHETIC_HUMAN_REVIEW_CASES)
  HumanReviewCaseSchema.parse(reviewCase);
