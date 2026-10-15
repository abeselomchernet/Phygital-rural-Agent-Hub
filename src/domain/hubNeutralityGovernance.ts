import { z } from "zod";

import { computeCanonicalSha256 } from "./evidenceIntegrity";
import {
  HubIdSchema,
  HubTenantIdSchema,
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  syntheticHubs,
} from "./hub";
import { SYNTHETIC_HUB_SERVICE_BINDINGS } from "./hubServiceComposition";
import {
  PartnerContractCapabilityIdSchema,
  PartnerContractOfflinePolicySchema,
  PartnerContractRoleSchema,
  PartnerOrgIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";
import {
  PartnerServiceTypeSchema,
  PartnerWorkflowTemplateSchema,
  SYNTHETIC_PARTNERFI_SERVICE_CATALOGS,
  SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS,
} from "./partnerServiceCatalog";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REFERENCE_ROUTES,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "./syntheticReferencePartners";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const EvidenceRefsSchema = z
  .array(z.string().min(1).max(160))
  .max(64)
  .refine(uniqueStrings, "evidence refs must be unique");
const RequiredEvidenceRefsSchema = EvidenceRefsSchema.min(1);

export const NeutralityGovernanceSchemaVersion = 1 as const;
export const SYNTHETIC_E9_EVALUATED_AT = "2026-10-15T12:30:00.000Z" as const;

export const NeutralityRuleKeySchema = z.enum([
  "NO_UNAUTHORIZED_PREFERENTIAL_ROUTING",
  "ROUTE_PROVENANCE_REQUIRED",
  "PARTNER_EQUIVALENCE_REVIEW",
  "CONTRACT_SCOPE_PRECEDENCE",
  "POLICY_CHANGE_REVIEW_REQUIRED",
  "CONFLICT_DISCLOSURE_REQUIRED",
  "CUSTOMER_DATA_ISOLATION_REQUIRED",
]);
export type NeutralityRuleKey = z.infer<typeof NeutralityRuleKeySchema>;

export const NeutralitySchemeRuleSchema = z
  .object({
    ruleId: z.string().regex(/^neutrality_rule_syn_[a-z0-9_]+$/),
    key: NeutralityRuleKeySchema,
    ruleVersion: z.number().int().positive().max(1_000_000),
    state: z.literal("ACTIVE_SYNTHETIC"),
    enforcementMode: z.literal("EVIDENCE_REVIEW_ONLY"),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict();
export type NeutralitySchemeRule = z.infer<typeof NeutralitySchemeRuleSchema>;

export const NeutralitySchemePolicySchema = z
  .object({
    policyId: z.string().regex(/^neutrality_policy_syn_[a-z0-9_]+$/),
    policyVersion: z.number().int().positive().max(1_000_000),
    hubId: HubIdSchema,
    effectiveAt: z.string().datetime(),
    lifecycleState: z.literal("PUBLISHED_SYNTHETIC"),
    rules: z.array(NeutralitySchemeRuleSchema).length(7),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys = value.rules.map((rule) => rule.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "neutrality rule keys must be unique", path: ["rules"] });
    }
    const ids = value.rules.map((rule) => rule.ruleId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "neutrality rule IDs must be unique", path: ["rules"] });
    }
    for (const required of NeutralityRuleKeySchema.options) {
      if (!keys.includes(required)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `missing neutrality rule ${required}`, path: ["rules"] });
      }
    }
  });
export type NeutralitySchemePolicy = z.infer<typeof NeutralitySchemePolicySchema>;

export const NeutralityPolicyChangeRecordSchema = z
  .object({
    changeId: z.string().regex(/^neutrality_change_syn_[a-z0-9_]+$/),
    fromPolicyVersion: z.number().int().nonnegative().max(1_000_000),
    toPolicyVersion: z.number().int().positive().max(1_000_000),
    changedRuleKeys: z.array(NeutralityRuleKeySchema).min(1).max(7).refine(uniqueStrings, "changed rules must be unique"),
    reviewState: z.enum(["ACCEPTED_SYNTHETIC", "REVIEW_REQUIRED"]),
    reviewerRole: z.literal("SYNTHETIC_GOVERNANCE_REVIEWER"),
    reviewedAt: z.string().datetime().nullable(),
    evidenceRefs: RequiredEvidenceRefsSchema,
    productionEffect: z.literal(false),
    routingMutationAuthorized: z.literal(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.toPolicyVersion !== value.fromPolicyVersion + 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "policy change versions must be contiguous", path: ["toPolicyVersion"] });
    }
    if (value.reviewState === "ACCEPTED_SYNTHETIC" && value.reviewedAt === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "accepted synthetic policy change requires reviewedAt", path: ["reviewedAt"] });
    }
  });
export type NeutralityPolicyChangeRecord = z.infer<typeof NeutralityPolicyChangeRecordSchema>;

export const NeutralityConflictFlagSchema = z
  .object({
    flagId: z.string().regex(/^neutrality_coi_syn_[a-z0-9_]+$/),
    partnerOrgId: PartnerOrgIdSchema,
    state: z.enum(["NONE_IDENTIFIED_SYNTHETIC", "DECLARED_SYNTHETIC_REVIEW_REQUIRED"]),
    incentiveDisclosureState: z.enum(["NONE_DECLARED_SYNTHETIC", "DISCLOSED_SYNTHETIC", "UNKNOWN"]),
    relatedRuleKey: z.literal("CONFLICT_DISCLOSURE_REQUIRED"),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict();
export type NeutralityConflictFlag = z.infer<typeof NeutralityConflictFlagSchema>;

export const RouteEquivalenceComparisonInputSchema = z
  .object({
    checkId: z.string().regex(/^route_equivalence_syn_[a-z0-9_]+$/),
    targetRegionId: z.string().regex(/^region_syn_[a-z0-9_]+$/),
    left: z.object({ partnerOrgId: PartnerOrgIdSchema, serviceId: PartnerServiceIdSchema }).strict(),
    right: z.object({ partnerOrgId: PartnerOrgIdSchema, serviceId: PartnerServiceIdSchema }).strict(),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.left.partnerOrgId === value.right.partnerOrgId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "route-equivalence comparison requires distinct partners", path: ["right", "partnerOrgId"] });
    }
  });
export type RouteEquivalenceComparisonInput = z.infer<typeof RouteEquivalenceComparisonInputSchema>;

export const RouteNeutralityParticipantSchema = z
  .object({
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    serviceType: PartnerServiceTypeSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    routeId: PartnerRouteIdSchema,
    adapterId: z.string().min(1).max(140),
    workflowTemplate: PartnerWorkflowTemplateSchema,
    offlinePolicy: PartnerContractOfflinePolicySchema,
    roleClasses: z.array(PartnerContractRoleSchema).min(1).max(16).refine(uniqueStrings, "route participant roles must be unique"),
    inputDataClasses: z.array(z.string().min(1).max(96)).max(32).refine(uniqueStrings, "route participant input classes must be unique"),
    targetRegionId: z.string().regex(/^region_syn_[a-z0-9_]+$/),
    regionEligible: z.boolean(),
    routeRegistered: z.boolean(),
    routeSupportsCapability: z.boolean(),
    contractRouteAuthorized: z.boolean(),
    hubServiceBindingEnabled: z.boolean(),
    contractVersion: z.number().int().positive(),
    catalogVersion: z.number().int().positive(),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict();
export type RouteNeutralityParticipant = z.infer<typeof RouteNeutralityParticipantSchema>;

export const RouteEquivalenceDifferenceCodeSchema = z.enum([
  "CAPABILITY_MISMATCH",
  "SERVICE_TYPE_MISMATCH",
  "WORKFLOW_TEMPLATE_MISMATCH",
  "OFFLINE_POLICY_MISMATCH",
  "INPUT_DATA_CLASS_MISMATCH",
  "ROLE_CLASS_MISMATCH",
  "HUB_REGION_ELIGIBILITY_MISMATCH",
  "ROUTE_PROVENANCE_INCOMPLETE",
  "CONTRACT_ROUTE_SCOPE_MISMATCH",
  "HUB_SERVICE_BINDING_MISSING",
]);
export type RouteEquivalenceDifferenceCode = z.infer<typeof RouteEquivalenceDifferenceCodeSchema>;

export const RouteEquivalenceCheckSchema = z
  .object({
    checkId: z.string().regex(/^route_equivalence_syn_[a-z0-9_]+$/),
    targetRegionId: z.string().regex(/^region_syn_[a-z0-9_]+$/),
    left: RouteNeutralityParticipantSchema,
    right: RouteNeutralityParticipantSchema,
    result: z.enum([
      "EQUIVALENT_FOR_SYNTHETIC_REVIEW",
      "DIFFERENCE_REQUIRES_REVIEW",
      "NOT_COMPARABLE",
    ]),
    differenceCodes: z.array(RouteEquivalenceDifferenceCodeSchema).max(10).refine(uniqueStrings, "difference codes must be unique"),
    routeInterchangeable: z.literal(false),
    fallbackAuthorized: z.literal(false),
    automaticRouteSelectionAuthorized: z.literal(false),
    equivalenceMeaning: z.literal(
      "GOVERNANCE_ELIGIBILITY_COMPARISON_ONLY_NOT_PROVIDER_OR_ROUTE_INTERCHANGEABILITY",
    ),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict();
export type RouteEquivalenceCheck = z.infer<typeof RouteEquivalenceCheckSchema>;

export const NeutralityGovernanceDecisionSchema = z
  .object({
    decisionId: z.string().regex(/^neutrality_decision_syn_[a-z0-9_]+$/),
    decisionType: z.enum([
      "POLICY_CHANGE_REVIEW",
      "ROUTE_EQUIVALENCE_REVIEW",
      "CONFLICT_OF_INTEREST_REVIEW",
    ]),
    outcome: z.enum(["RECORDED_SYNTHETIC", "REVIEW_REQUIRED"]),
    relatedRef: z.string().min(1).max(160),
    reviewerRole: z.literal("SYNTHETIC_GOVERNANCE_REVIEWER"),
    recordedAt: z.string().datetime(),
    evidenceRefs: RequiredEvidenceRefsSchema,
    authority: z
      .object({
        routeMutationAuthorized: z.literal(false),
        commercialAuthorityGranted: z.literal(false),
        regulatedAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type NeutralityGovernanceDecision = z.infer<typeof NeutralityGovernanceDecisionSchema>;

export const HubNeutralityGovernancePlanSchema = z
  .object({
    schemaVersion: z.literal(NeutralityGovernanceSchemaVersion),
    schemeId: z.string().regex(/^neutrality_scheme_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    evaluatedAt: z.string().datetime(),
    policy: NeutralitySchemePolicySchema,
    comparisons: z.array(RouteEquivalenceComparisonInputSchema).min(1).max(32),
    changeHistory: z.array(NeutralityPolicyChangeRecordSchema).min(1).max(64),
    conflictFlags: z.array(NeutralityConflictFlagSchema).min(1).max(32),
    governanceDecisions: z.array(NeutralityGovernanceDecisionSchema).min(1).max(64),
    externalAuditEvidenceRefs: z.array(z.never()).length(0),
    evidenceRefs: RequiredEvidenceRefsSchema,
    stage: z.literal("STAGE_4"),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.policy.hubId !== value.hubId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "neutrality policy Hub must match plan Hub", path: ["policy", "hubId"] });
    }
    const comparisonIds = value.comparisons.map((item) => item.checkId);
    if (new Set(comparisonIds).size !== comparisonIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "route-equivalence check IDs must be unique", path: ["comparisons"] });
    }
    const changeIds = value.changeHistory.map((item) => item.changeId);
    if (new Set(changeIds).size !== changeIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "policy change IDs must be unique", path: ["changeHistory"] });
    }
    const flagIds = value.conflictFlags.map((item) => item.flagId);
    if (new Set(flagIds).size !== flagIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "conflict flag IDs must be unique", path: ["conflictFlags"] });
    }
    const decisionIds = value.governanceDecisions.map((item) => item.decisionId);
    if (new Set(decisionIds).size !== decisionIds.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "governance decision IDs must be unique", path: ["governanceDecisions"] });
    }
  });
export type HubNeutralityGovernancePlan = z.infer<typeof HubNeutralityGovernancePlanSchema>;

export const HubNeutralityGovernanceReadModelSchema = z
  .object({
    schemaVersion: z.literal(NeutralityGovernanceSchemaVersion),
    schemeId: z.string().regex(/^neutrality_scheme_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    evaluatedAt: z.string().datetime(),
    policy: NeutralitySchemePolicySchema,
    routeEquivalenceChecks: z.array(RouteEquivalenceCheckSchema).min(1).max(32),
    changeHistory: z.array(NeutralityPolicyChangeRecordSchema).min(1).max(64),
    conflictFlags: z.array(NeutralityConflictFlagSchema).min(1).max(32),
    governanceDecisions: z.array(NeutralityGovernanceDecisionSchema).min(1).max(64),
    neutralityState: z.enum([
      "NO_SYNTHETIC_EXCEPTION_IDENTIFIED",
      "REVIEW_REQUIRED",
      "EVIDENCE_INCOMPLETE",
    ]),
    evidenceRefs: RequiredEvidenceRefsSchema,
    neutralityDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    readBoundary: z
      .object({
        stage: z.literal("STAGE_4"),
        syntheticOnly: z.literal(true),
        readOnly: z.literal(true),
        customerLevelRestrictedDataPresent: z.literal(false),
        crossPartnerCustomerDataExposed: z.literal(false),
        realCommercialIncentiveDataPresent: z.literal(false),
        externalAuditEvidencePresent: z.literal(false),
        liveRouteMutationEnabled: z.literal(false),
        routeFallbackAuthorized: z.literal(false),
        providerInterchangeabilityClaimed: z.literal(false),
        liveNetworkAllowed: z.literal(false),
        realFundsIncluded: z.literal(false),
        settlementAuthorityGranted: z.literal(false),
        productionRoutingAuthorityGranted: z.literal(false),
        commercialAuthorityGranted: z.literal(false),
        regulatedAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubNeutralityGovernanceReadModel = z.infer<typeof HubNeutralityGovernanceReadModelSchema>;

function uniqueEvidence(...groups: readonly (readonly string[])[]) {
  return [...new Set(groups.flat())].sort();
}

function sorted(values: readonly string[]) {
  return [...values].sort();
}

function partnerCatalog(partnerOrgId: string) {
  if (partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA)
    return SYNTHETIC_PARTNERFI_SERVICE_CATALOGS[SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA];
  if (partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA)
    return SYNTHETIC_PARTNERFI_SERVICE_CATALOGS[SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA];
  return undefined;
}

function partnerContract(partnerOrgId: string) {
  if (partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA)
    return SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS[SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA];
  if (partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA)
    return SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS[SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA];
  return undefined;
}

function participantFromReference(input: {
  hubId: string;
  targetRegionId: string;
  partnerOrgId: string;
  serviceId: string;
  comparisonEvidenceRefs: readonly string[];
}): RouteNeutralityParticipant {
  const catalog = partnerCatalog(input.partnerOrgId);
  const contract = partnerContract(input.partnerOrgId);
  if (!catalog || !contract) throw new Error("NEUTRALITY_PARTNER_REFERENCE_UNAVAILABLE");
  const service = catalog.services.find((item) => item.serviceId === input.serviceId);
  if (!service) throw new Error("NEUTRALITY_SERVICE_REFERENCE_UNAVAILABLE");
  if (service.requiredCapabilities.length !== 1)
    throw new Error("NEUTRALITY_SERVICE_CAPABILITY_CARDINALITY_UNSUPPORTED");
  const capabilityId = service.requiredCapabilities[0];
  const routeId = service.routePolicy.routeIds[0];
  if (!routeId) throw new Error("NEUTRALITY_ROUTE_REFERENCE_UNAVAILABLE");
  const route = SYNTHETIC_REFERENCE_ROUTES[
    routeId as keyof typeof SYNTHETIC_REFERENCE_ROUTES
  ];
  if (!route) throw new Error("NEUTRALITY_ROUTE_REFERENCE_UNAVAILABLE");
  const grant = contract.capabilityGrants.find(
    (item) =>
      item.capabilityId === capabilityId && item.serviceIds.includes(service.serviceId),
  );
  const binding = SYNTHETIC_HUB_SERVICE_BINDINGS.find(
    (item) =>
      item.hubId === input.hubId &&
      item.partnerOrgId === input.partnerOrgId &&
      item.serviceId === input.serviceId,
  );
  const regionEligible =
    service.regions.includes(input.targetRegionId) &&
    contract.regions.includes(input.targetRegionId) &&
    Boolean(grant?.regions.includes(input.targetRegionId));

  return RouteNeutralityParticipantSchema.parse({
    partnerOrgId: input.partnerOrgId,
    serviceId: service.serviceId,
    serviceType: service.serviceType,
    capabilityId,
    routeId,
    adapterId: route.adapterId,
    workflowTemplate: service.workflowTemplate,
    offlinePolicy: service.offlinePolicy,
    roleClasses: sorted(service.roles),
    inputDataClasses: sorted(service.dataRequirements.inputClasses),
    targetRegionId: input.targetRegionId,
    regionEligible,
    routeRegistered: route.registered,
    routeSupportsCapability: route.supportedCapabilityIds.includes(capabilityId),
    contractRouteAuthorized: Boolean(grant?.allowedRouteIds.includes(routeId)),
    hubServiceBindingEnabled: binding?.state === "ENABLED_SYNTHETIC",
    contractVersion: contract.contractVersion,
    catalogVersion: catalog.catalogVersion,
    evidenceRefs: uniqueEvidence(
      input.comparisonEvidenceRefs,
      catalog.evidenceRefs,
      contract.evidenceRefs,
      service.activation.evidenceRefs,
      route.evidenceRefs,
      grant?.activation.evidenceRefs ?? [],
      binding?.evidenceRefs ?? [],
    ),
  });
}

export function compareRouteNeutralityParticipants(input: {
  checkId: string;
  targetRegionId: string;
  left: unknown;
  right: unknown;
  evidenceRefs: readonly string[];
}): RouteEquivalenceCheck {
  const left = RouteNeutralityParticipantSchema.parse(input.left);
  const right = RouteNeutralityParticipantSchema.parse(input.right);
  const evidenceRefs = RequiredEvidenceRefsSchema.parse(input.evidenceRefs);
  const differenceCodes: RouteEquivalenceDifferenceCode[] = [];

  if (left.capabilityId !== right.capabilityId) {
    differenceCodes.push("CAPABILITY_MISMATCH");
  } else {
    if (left.serviceType !== right.serviceType)
      differenceCodes.push("SERVICE_TYPE_MISMATCH");
    if (left.workflowTemplate !== right.workflowTemplate)
      differenceCodes.push("WORKFLOW_TEMPLATE_MISMATCH");
    if (left.offlinePolicy !== right.offlinePolicy)
      differenceCodes.push("OFFLINE_POLICY_MISMATCH");
    if (JSON.stringify(sorted(left.inputDataClasses)) !== JSON.stringify(sorted(right.inputDataClasses)))
      differenceCodes.push("INPUT_DATA_CLASS_MISMATCH");
    if (JSON.stringify(sorted(left.roleClasses)) !== JSON.stringify(sorted(right.roleClasses)))
      differenceCodes.push("ROLE_CLASS_MISMATCH");
    if (!left.regionEligible || !right.regionEligible)
      differenceCodes.push("HUB_REGION_ELIGIBILITY_MISMATCH");
    if (
      !left.routeRegistered ||
      !right.routeRegistered ||
      !left.routeSupportsCapability ||
      !right.routeSupportsCapability
    )
      differenceCodes.push("ROUTE_PROVENANCE_INCOMPLETE");
    if (!left.contractRouteAuthorized || !right.contractRouteAuthorized)
      differenceCodes.push("CONTRACT_ROUTE_SCOPE_MISMATCH");
    if (!left.hubServiceBindingEnabled || !right.hubServiceBindingEnabled)
      differenceCodes.push("HUB_SERVICE_BINDING_MISSING");
  }

  const result = differenceCodes.includes("CAPABILITY_MISMATCH")
    ? "NOT_COMPARABLE"
    : differenceCodes.length === 0
      ? "EQUIVALENT_FOR_SYNTHETIC_REVIEW"
      : "DIFFERENCE_REQUIRES_REVIEW";

  return RouteEquivalenceCheckSchema.parse({
    checkId: input.checkId,
    targetRegionId: input.targetRegionId,
    left,
    right,
    result,
    differenceCodes,
    routeInterchangeable: false,
    fallbackAuthorized: false,
    automaticRouteSelectionAuthorized: false,
    equivalenceMeaning:
      "GOVERNANCE_ELIGIBILITY_COMPARISON_ONLY_NOT_PROVIDER_OR_ROUTE_INTERCHANGEABILITY",
    evidenceRefs: uniqueEvidence(evidenceRefs, left.evidenceRefs, right.evidenceRefs),
  });
}

function validatePlanScope(plan: HubNeutralityGovernancePlan) {
  const hub = syntheticHubs.find((item) => item.hubId === plan.hubId);
  if (!hub || hub.tenantId !== plan.tenantId)
    throw new Error("NEUTRALITY_HUB_SCOPE_MISMATCH");
  if (plan.policy.hubId !== plan.hubId)
    throw new Error("NEUTRALITY_POLICY_HUB_SCOPE_MISMATCH");
  for (const rule of plan.policy.rules) {
    if (rule.ruleVersion !== plan.policy.policyVersion)
      throw new Error("NEUTRALITY_RULE_VERSION_MISMATCH");
  }

  const changes = [...plan.changeHistory].sort(
    (left, right) => left.toPolicyVersion - right.toPolicyVersion,
  );
  for (let index = 1; index < changes.length; index += 1) {
    if (changes[index].fromPolicyVersion !== changes[index - 1].toPolicyVersion)
      throw new Error("NEUTRALITY_POLICY_CHANGE_HISTORY_GAP");
  }
  if (changes.at(-1)?.toPolicyVersion !== plan.policy.policyVersion)
    throw new Error("NEUTRALITY_POLICY_CHANGE_HISTORY_INCOMPLETE");

  const memberPartners = new Set(
    hub.partnerMemberships
      .filter((membership) => membership.membershipState === "SYNTHETIC_MEMBER")
      .map((membership) => membership.partnerOrgId),
  );
  for (const comparison of plan.comparisons) {
    if (comparison.targetRegionId !== hub.regionId)
      throw new Error("NEUTRALITY_COMPARISON_REGION_MISMATCH");
    if (
      !memberPartners.has(comparison.left.partnerOrgId) ||
      !memberPartners.has(comparison.right.partnerOrgId)
    )
      throw new Error("NEUTRALITY_COMPARISON_PARTNER_SCOPE_MISMATCH");
  }
  for (const flag of plan.conflictFlags) {
    if (!memberPartners.has(flag.partnerOrgId))
      throw new Error("NEUTRALITY_CONFLICT_PARTNER_SCOPE_MISMATCH");
  }

  const knownRefs = new Set([
    ...plan.comparisons.map((item) => item.checkId),
    ...plan.changeHistory.map((item) => item.changeId),
    ...plan.conflictFlags.map((item) => item.flagId),
  ]);
  for (const decision of plan.governanceDecisions) {
    if (!knownRefs.has(decision.relatedRef))
      throw new Error("NEUTRALITY_DECISION_REFERENCE_UNKNOWN");
  }
}

export function createStage4HubNeutralityGovernanceReadModel(
  input: unknown,
): HubNeutralityGovernanceReadModel {
  const plan = HubNeutralityGovernancePlanSchema.parse(input);
  validatePlanScope(plan);

  const routeEquivalenceChecks = plan.comparisons
    .map((comparison) => {
      const left = participantFromReference({
        hubId: plan.hubId,
        targetRegionId: comparison.targetRegionId,
        partnerOrgId: comparison.left.partnerOrgId,
        serviceId: comparison.left.serviceId,
        comparisonEvidenceRefs: comparison.evidenceRefs,
      });
      const right = participantFromReference({
        hubId: plan.hubId,
        targetRegionId: comparison.targetRegionId,
        partnerOrgId: comparison.right.partnerOrgId,
        serviceId: comparison.right.serviceId,
        comparisonEvidenceRefs: comparison.evidenceRefs,
      });
      return compareRouteNeutralityParticipants({
        checkId: comparison.checkId,
        targetRegionId: comparison.targetRegionId,
        left,
        right,
        evidenceRefs: comparison.evidenceRefs,
      });
    })
    .sort((left, right) => left.checkId.localeCompare(right.checkId));

  const changeHistory = [...plan.changeHistory].sort(
    (left, right) => left.toPolicyVersion - right.toPolicyVersion,
  );
  const conflictFlags = [...plan.conflictFlags].sort((left, right) =>
    left.flagId.localeCompare(right.flagId),
  );
  const governanceDecisions = [...plan.governanceDecisions].sort((left, right) =>
    left.decisionId.localeCompare(right.decisionId),
  );

  const evidenceIncomplete = routeEquivalenceChecks.some((check) =>
    check.differenceCodes.some((code) =>
      [
        "ROUTE_PROVENANCE_INCOMPLETE",
        "CONTRACT_ROUTE_SCOPE_MISMATCH",
        "HUB_SERVICE_BINDING_MISSING",
      ].includes(code),
    ),
  );
  const reviewRequired =
    changeHistory.some((change) => change.reviewState === "REVIEW_REQUIRED") ||
    conflictFlags.some(
      (flag) => flag.state === "DECLARED_SYNTHETIC_REVIEW_REQUIRED",
    ) ||
    governanceDecisions.some((decision) => decision.outcome === "REVIEW_REQUIRED") ||
    routeEquivalenceChecks.some(
      (check) => check.result === "DIFFERENCE_REQUIRES_REVIEW",
    );
  const neutralityState = evidenceIncomplete
    ? "EVIDENCE_INCOMPLETE"
    : reviewRequired
      ? "REVIEW_REQUIRED"
      : "NO_SYNTHETIC_EXCEPTION_IDENTIFIED";

  const core = {
    schemaVersion: NeutralityGovernanceSchemaVersion,
    schemeId: plan.schemeId,
    tenantId: plan.tenantId,
    hubId: plan.hubId,
    evaluatedAt: plan.evaluatedAt,
    policy: plan.policy,
    routeEquivalenceChecks,
    changeHistory,
    conflictFlags,
    governanceDecisions,
    neutralityState,
    evidenceRefs: uniqueEvidence(
      plan.evidenceRefs,
      plan.policy.evidenceRefs,
      plan.policy.rules.flatMap((rule) => rule.evidenceRefs),
      routeEquivalenceChecks.flatMap((check) => check.evidenceRefs),
      changeHistory.flatMap((change) => change.evidenceRefs),
      conflictFlags.flatMap((flag) => flag.evidenceRefs),
      governanceDecisions.flatMap((decision) => decision.evidenceRefs),
    ),
    readBoundary: {
      stage: "STAGE_4" as const,
      syntheticOnly: true as const,
      readOnly: true as const,
      customerLevelRestrictedDataPresent: false as const,
      crossPartnerCustomerDataExposed: false as const,
      realCommercialIncentiveDataPresent: false as const,
      externalAuditEvidencePresent: false as const,
      liveRouteMutationEnabled: false as const,
      routeFallbackAuthorized: false as const,
      providerInterchangeabilityClaimed: false as const,
      liveNetworkAllowed: false as const,
      realFundsIncluded: false as const,
      settlementAuthorityGranted: false as const,
      productionRoutingAuthorityGranted: false as const,
      commercialAuthorityGranted: false as const,
      regulatedAuthorityGranted: false as const,
    },
  };

  return HubNeutralityGovernanceReadModelSchema.parse({
    ...core,
    neutralityDigest: computeCanonicalSha256(core),
  });
}

export function verifyStage4HubNeutralityGovernanceReadModel(
  input: unknown,
): HubNeutralityGovernanceReadModel {
  const model = HubNeutralityGovernanceReadModelSchema.parse(input);
  const { neutralityDigest, ...core } = model;
  if (neutralityDigest !== computeCanonicalSha256(core))
    throw new Error("NEUTRALITY_GOVERNANCE_DIGEST_MISMATCH");
  return model;
}

export function searchStage4HubNeutralityGovernance(input: {
  readModels: readonly unknown[];
  tenantId: string;
  hubId: string;
}): readonly HubNeutralityGovernanceReadModel[] {
  const tenantId = HubTenantIdSchema.parse(input.tenantId);
  const hubId = HubIdSchema.parse(input.hubId);
  return input.readModels
    .map((model) => verifyStage4HubNeutralityGovernanceReadModel(model))
    .filter((model) => model.tenantId === tenantId && model.hubId === hubId)
    .sort((left, right) => left.schemeId.localeCompare(right.schemeId));
}

function rule(
  key: NeutralityRuleKey,
  slug: string,
): NeutralitySchemeRule {
  return NeutralitySchemeRuleSchema.parse({
    ruleId: `neutrality_rule_syn_${slug}`,
    key,
    ruleVersion: 2,
    state: "ACTIVE_SYNTHETIC",
    enforcementMode: "EVIDENCE_REVIEW_ONLY",
    evidenceRefs: [`EV-SYN-E9-RULE-${slug.toUpperCase().replaceAll("_", "-")}-V2`],
  });
}

export const SYNTHETIC_E9_NEUTRALITY_PLAN = HubNeutralityGovernancePlanSchema.parse({
  schemaVersion: 1,
  schemeId: "neutrality_scheme_syn_adama_shared",
  tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
  hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
  evaluatedAt: SYNTHETIC_E9_EVALUATED_AT,
  policy: {
    policyId: "neutrality_policy_syn_adama_shared",
    policyVersion: 2,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    effectiveAt: "2026-10-15T12:00:00.000Z",
    lifecycleState: "PUBLISHED_SYNTHETIC",
    rules: [
      rule("NO_UNAUTHORIZED_PREFERENTIAL_ROUTING", "no_preferential_routing"),
      rule("ROUTE_PROVENANCE_REQUIRED", "route_provenance"),
      rule("PARTNER_EQUIVALENCE_REVIEW", "partner_equivalence"),
      rule("CONTRACT_SCOPE_PRECEDENCE", "contract_scope_precedence"),
      rule("POLICY_CHANGE_REVIEW_REQUIRED", "policy_change_review"),
      rule("CONFLICT_DISCLOSURE_REQUIRED", "conflict_disclosure"),
      rule("CUSTOMER_DATA_ISOLATION_REQUIRED", "customer_data_isolation"),
    ],
    evidenceRefs: ["EV-SYN-E9-ADAMA-NEUTRALITY-POLICY-V2"],
  },
  comparisons: [
    {
      checkId: "route_equivalence_syn_adama_account_lookup",
      targetRegionId: SYNTHETIC_REGION_IDS.ADAMA,
      left: {
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
      },
      right: {
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
        serviceId: SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
      },
      evidenceRefs: ["EV-SYN-E9-ADAMA-ACCOUNT-LOOKUP-EQUIVALENCE-V1"],
    },
    {
      checkId: "route_equivalence_syn_adama_noncomparable_financial_services",
      targetRegionId: SYNTHETIC_REGION_IDS.ADAMA,
      left: {
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
      },
      right: {
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
        serviceId: SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
      },
      evidenceRefs: ["EV-SYN-E9-ADAMA-NONCOMPARABLE-SERVICE-V1"],
    },
  ],
  changeHistory: [
    {
      changeId: "neutrality_change_syn_adama_policy_v1_to_v2",
      fromPolicyVersion: 1,
      toPolicyVersion: 2,
      changedRuleKeys: [
        "PARTNER_EQUIVALENCE_REVIEW",
        "CONFLICT_DISCLOSURE_REQUIRED",
      ],
      reviewState: "ACCEPTED_SYNTHETIC",
      reviewerRole: "SYNTHETIC_GOVERNANCE_REVIEWER",
      reviewedAt: "2026-10-15T11:45:00.000Z",
      evidenceRefs: ["EV-SYN-E9-ADAMA-POLICY-CHANGE-V2"],
      productionEffect: false,
      routingMutationAuthorized: false,
    },
  ],
  conflictFlags: [
    {
      flagId: "neutrality_coi_syn_adama_alpha",
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      state: "NONE_IDENTIFIED_SYNTHETIC",
      incentiveDisclosureState: "NONE_DECLARED_SYNTHETIC",
      relatedRuleKey: "CONFLICT_DISCLOSURE_REQUIRED",
      evidenceRefs: ["EV-SYN-E9-ADAMA-ALPHA-COI-REVIEW-V1"],
    },
    {
      flagId: "neutrality_coi_syn_adama_beta",
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      state: "NONE_IDENTIFIED_SYNTHETIC",
      incentiveDisclosureState: "NONE_DECLARED_SYNTHETIC",
      relatedRuleKey: "CONFLICT_DISCLOSURE_REQUIRED",
      evidenceRefs: ["EV-SYN-E9-ADAMA-BETA-COI-REVIEW-V1"],
    },
  ],
  governanceDecisions: [
    {
      decisionId: "neutrality_decision_syn_adama_policy_v2",
      decisionType: "POLICY_CHANGE_REVIEW",
      outcome: "RECORDED_SYNTHETIC",
      relatedRef: "neutrality_change_syn_adama_policy_v1_to_v2",
      reviewerRole: "SYNTHETIC_GOVERNANCE_REVIEWER",
      recordedAt: "2026-10-15T11:50:00.000Z",
      evidenceRefs: ["EV-SYN-E9-ADAMA-POLICY-DECISION-V2"],
      authority: {
        routeMutationAuthorized: false,
        commercialAuthorityGranted: false,
        regulatedAuthorityGranted: false,
      },
    },
    {
      decisionId: "neutrality_decision_syn_adama_account_lookup",
      decisionType: "ROUTE_EQUIVALENCE_REVIEW",
      outcome: "RECORDED_SYNTHETIC",
      relatedRef: "route_equivalence_syn_adama_account_lookup",
      reviewerRole: "SYNTHETIC_GOVERNANCE_REVIEWER",
      recordedAt: "2026-10-15T12:10:00.000Z",
      evidenceRefs: ["EV-SYN-E9-ADAMA-ACCOUNT-LOOKUP-DECISION-V1"],
      authority: {
        routeMutationAuthorized: false,
        commercialAuthorityGranted: false,
        regulatedAuthorityGranted: false,
      },
    },
  ],
  externalAuditEvidenceRefs: [],
  evidenceRefs: ["EV-SYN-E9-ADAMA-NEUTRALITY-SCHEME-V1"],
  stage: "STAGE_4",
  syntheticOnly: true,
});

export const SYNTHETIC_E9_NEUTRALITY_READ_MODEL =
  createStage4HubNeutralityGovernanceReadModel(SYNTHETIC_E9_NEUTRALITY_PLAN);

export const SYNTHETIC_E9_NEUTRALITY_READ_MODELS = [
  SYNTHETIC_E9_NEUTRALITY_READ_MODEL,
] as const;
