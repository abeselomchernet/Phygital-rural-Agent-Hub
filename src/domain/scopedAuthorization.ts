import { z } from "zod";

import {
  DataAccessBasisRecordSchema,
  DataAccessClassSchema,
  SyntheticDataAccessPolicySchema,
  evaluateSyntheticDataAccessBasis,
} from "./dataAccessBasis";

export const Stage4RoleSchema = z.enum([
  "AGENT",
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
  "PARTNERFI_REVIEWER",
  "AUDITOR",
  "PILOT_REVIEWER",
]);

export type Stage4Role = z.infer<typeof Stage4RoleSchema>;

export const Stage4GovernanceClassSchema = z.enum([
  "FIELD_AND_FLEET",
  "PARTNER_BOUNDARY",
  "INDEPENDENT_TRUST",
]);

export const ScopedDataClassSchema = z.union([DataAccessClassSchema, z.literal("AGGREGATE")]);

export const ScopedAuthorizationVerbSchema = z.enum([
  "READ",
  "CAPTURE",
  "REVIEW",
  "ADMINISTER",
]);

export type ScopedAuthorizationVerb = z.infer<
  typeof ScopedAuthorizationVerbSchema
>;

const ScopeIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,119}$/);
const HubIdSchema = z.string().regex(/^hub_[a-z0-9][a-z0-9_-]{2,119}$/);

export const ScopedAuthorizationPrincipalSchema = z
  .object({
    principalId: ScopeIdSchema,
    role: Stage4RoleSchema,
    tenantId: ScopeIdSchema,
    partnerOrgMemberships: z.array(ScopeIdSchema).max(32),
    hubScopes: z.array(HubIdSchema).max(64),
    regionScopes: z.array(ScopeIdSchema).max(64),
    serviceScopes: z.array(ScopeIdSchema).max(128),
    capabilityScopes: z.array(ScopeIdSchema).max(128),
    dataClassScopes: z.array(ScopedDataClassSchema).max(16),
    purposeScopes: z.array(ScopeIdSchema).max(128),
  })
  .strict();

export const ScopedAuthorizationRequestSchema = z
  .object({
    verb: ScopedAuthorizationVerbSchema,
    tenantId: ScopeIdSchema,
    partnerOrgId: ScopeIdSchema,
    hubId: HubIdSchema,
    regionId: ScopeIdSchema,
    serviceId: ScopeIdSchema,
    capabilityId: ScopeIdSchema,
    dataClass: ScopedDataClassSchema,
    purpose: ScopeIdSchema,
    customerSpecific: z.boolean(),
    subjectRef: z.string().uuid().optional(),
    basisId: z.string().regex(/^basis_[a-z0-9][a-z0-9_-]{2,119}$/).optional(),
    requestedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.customerSpecific && value.dataClass === "AGGREGATE") {
      context.addIssue({
        code: "custom",
        message: "AGGREGATE_DATA_CANNOT_BE_CUSTOMER_SPECIFIC",
        path: ["dataClass"],
      });
    }
    if (value.customerSpecific && !value.subjectRef) {
      context.addIssue({
        code: "custom",
        message: "CUSTOMER_SPECIFIC_SUBJECT_REQUIRED",
        path: ["subjectRef"],
      });
    }
    if (value.customerSpecific && !value.basisId) {
      context.addIssue({
        code: "custom",
        message: "CUSTOMER_SPECIFIC_BASIS_REQUIRED",
        path: ["basisId"],
      });
    }
    if (!value.customerSpecific && (value.subjectRef || value.basisId)) {
      context.addIssue({
        code: "custom",
        message: "AGGREGATE_REQUEST_MUST_NOT_CARRY_CUSTOMER_BASIS",
        path: ["customerSpecific"],
      });
    }
  });

export const ScopedAuthorizationDecisionSchema = z
  .object({
    decision: z.enum(["ALLOW", "DENY"]),
    reason: z.enum([
      "SCOPED_AUTHORIZATION_ALLOWED",
      "ROLE_VERB_DENIED",
      "TENANT_SCOPE_DENIED",
      "PARTNER_SCOPE_DENIED",
      "HUB_SCOPE_DENIED",
      "REGION_SCOPE_DENIED",
      "SERVICE_SCOPE_DENIED",
      "CAPABILITY_SCOPE_DENIED",
      "DATA_CLASS_SCOPE_DENIED",
      "PURPOSE_SCOPE_DENIED",
      "ROLE_DATA_CLASS_DENIED",
      "CUSTOMER_SPECIFIC_ROLE_DENIED",
      "DATA_ACCESS_BASIS_REQUIRED",
      "DATA_ACCESS_BASIS_DENIED",
    ]),
    role: Stage4RoleSchema,
    governanceClass: Stage4GovernanceClassSchema,
    dataAccessBasisValidated: z.boolean(),
    financialAuthorityGranted: z.literal(false),
    creditApprovalAuthorityGranted: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
    insuranceAdjudicationAuthorityGranted: z.literal(false),
    regulatedAuthorityGranted: z.literal(false),
  })
  .strict();

export type ScopedAuthorizationPrincipal = z.infer<
  typeof ScopedAuthorizationPrincipalSchema
>;
export type ScopedAuthorizationRequest = z.infer<
  typeof ScopedAuthorizationRequestSchema
>;

const ROLE_GOVERNANCE_CLASS: Record<Stage4Role, z.infer<typeof Stage4GovernanceClassSchema>> = {
  AGENT: "FIELD_AND_FLEET",
  SUPERVISOR: "FIELD_AND_FLEET",
  OPERATIONS: "FIELD_AND_FLEET",
  PARTNER_ADMIN: "PARTNER_BOUNDARY",
  PARTNERFI_REVIEWER: "PARTNER_BOUNDARY",
  AUDITOR: "INDEPENDENT_TRUST",
  PILOT_REVIEWER: "INDEPENDENT_TRUST",
};

const ROLE_VERBS: Record<Stage4Role, readonly ScopedAuthorizationVerb[]> = {
  AGENT: ["READ", "CAPTURE"],
  SUPERVISOR: ["READ", "REVIEW"],
  OPERATIONS: ["READ", "REVIEW"],
  PARTNER_ADMIN: ["READ", "REVIEW", "ADMINISTER"],
  PARTNERFI_REVIEWER: ["READ", "REVIEW"],
  AUDITOR: ["READ"],
  PILOT_REVIEWER: ["READ"],
};

const ROLE_DATA_CLASSES: Record<Stage4Role, readonly z.infer<typeof ScopedDataClassSchema>[]> = {
  AGENT: ["PROFILE", "CONTACT", "SERVICE_HISTORY", "EVIDENCE"],
  SUPERVISOR: ["PROFILE", "CONTACT", "SERVICE_HISTORY", "EVIDENCE", "DECISION_SUPPORT", "AGGREGATE"],
  OPERATIONS: ["SERVICE_HISTORY", "EVIDENCE", "AGGREGATE"],
  PARTNER_ADMIN: ["PROFILE", "SERVICE_HISTORY", "EVIDENCE", "DECISION_SUPPORT"],
  PARTNERFI_REVIEWER: ["EVIDENCE", "DECISION_SUPPORT"],
  AUDITOR: ["EVIDENCE", "AGGREGATE"],
  PILOT_REVIEWER: ["AGGREGATE"],
};

const CUSTOMER_SPECIFIC_ROLES = new Set<Stage4Role>([
  "AGENT",
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
  "PARTNERFI_REVIEWER",
  "AUDITOR",
]);

export function governanceClassForRole(roleInput: string) {
  const role = Stage4RoleSchema.parse(roleInput);
  return ROLE_GOVERNANCE_CLASS[role];
}

function makeDecision(
  role: Stage4Role,
  decision: "ALLOW" | "DENY",
  reason: z.infer<typeof ScopedAuthorizationDecisionSchema>["reason"],
  dataAccessBasisValidated = false,
) {
  return ScopedAuthorizationDecisionSchema.parse({
    decision,
    reason,
    role,
    governanceClass: ROLE_GOVERNANCE_CLASS[role],
    dataAccessBasisValidated,
    financialAuthorityGranted: false,
    creditApprovalAuthorityGranted: false,
    settlementAuthorityGranted: false,
    insuranceAdjudicationAuthorityGranted: false,
    regulatedAuthorityGranted: false,
  });
}

function contains<T>(values: readonly T[], requested: T) {
  return values.includes(requested);
}

export function evaluateScopedAuthorization(input: {
  principal: unknown;
  request: unknown;
  basis?: unknown;
  basisPolicy?: unknown;
}) {
  const principal = ScopedAuthorizationPrincipalSchema.parse(input.principal);
  const request = ScopedAuthorizationRequestSchema.parse(input.request);
  const role = principal.role;

  if (!contains(ROLE_VERBS[role], request.verb))
    return makeDecision(role, "DENY", "ROLE_VERB_DENIED");
  if (request.tenantId !== principal.tenantId)
    return makeDecision(role, "DENY", "TENANT_SCOPE_DENIED");
  if (!contains(principal.partnerOrgMemberships, request.partnerOrgId))
    return makeDecision(role, "DENY", "PARTNER_SCOPE_DENIED");
  if (!contains(principal.hubScopes, request.hubId))
    return makeDecision(role, "DENY", "HUB_SCOPE_DENIED");
  if (!contains(principal.regionScopes, request.regionId))
    return makeDecision(role, "DENY", "REGION_SCOPE_DENIED");
  if (!contains(principal.serviceScopes, request.serviceId))
    return makeDecision(role, "DENY", "SERVICE_SCOPE_DENIED");
  if (!contains(principal.capabilityScopes, request.capabilityId))
    return makeDecision(role, "DENY", "CAPABILITY_SCOPE_DENIED");
  if (!contains(principal.dataClassScopes, request.dataClass))
    return makeDecision(role, "DENY", "DATA_CLASS_SCOPE_DENIED");
  if (!contains(principal.purposeScopes, request.purpose))
    return makeDecision(role, "DENY", "PURPOSE_SCOPE_DENIED");
  if (!contains(ROLE_DATA_CLASSES[role], request.dataClass))
    return makeDecision(role, "DENY", "ROLE_DATA_CLASS_DENIED");

  if (!request.customerSpecific)
    return makeDecision(role, "ALLOW", "SCOPED_AUTHORIZATION_ALLOWED");

  if (!CUSTOMER_SPECIFIC_ROLES.has(role))
    return makeDecision(role, "DENY", "CUSTOMER_SPECIFIC_ROLE_DENIED");
  if (request.dataClass === "AGGREGATE")
    return makeDecision(role, "DENY", "CUSTOMER_SPECIFIC_ROLE_DENIED");
  if (!request.subjectRef || !request.basisId || !input.basis || !input.basisPolicy)
    return makeDecision(role, "DENY", "DATA_ACCESS_BASIS_REQUIRED");

  const basis = DataAccessBasisRecordSchema.parse(input.basis);
  const basisPolicy = SyntheticDataAccessPolicySchema.parse(input.basisPolicy);
  const basisDecision = evaluateSyntheticDataAccessBasis({
    request: {
      subjectRef: request.subjectRef,
      requestingOrgId: request.partnerOrgId,
      purpose: request.purpose,
      requestedDataClasses: [request.dataClass],
      basisId: request.basisId,
      requestedAt: request.requestedAt,
    },
    basis,
    policy: basisPolicy,
  });
  if (basisDecision.decision !== "ALLOW")
    return makeDecision(role, "DENY", "DATA_ACCESS_BASIS_DENIED");

  return makeDecision(role, "ALLOW", "SCOPED_AUTHORIZATION_ALLOWED", true);
}
