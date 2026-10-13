import { z } from "zod";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const OpaqueId = (prefix: string, max = 120) =>
  z
    .string()
    .min(prefix.length + 2)
    .max(max)
    .regex(new RegExp(`^${prefix}[A-Za-z0-9][A-Za-z0-9_.-]*$`));

export const PartnerContractSchemaVersion = 1 as const;

export const PartnerContractEnvironmentSchema = z.enum([
  "synthetic",
  "sandbox",
  "testbed",
  "staging",
  "production",
]);
export type PartnerContractEnvironment = z.infer<
  typeof PartnerContractEnvironmentSchema
>;

export const PartnerContractLifecycleStateSchema = z.enum([
  "ACTIVE_SYNTHETIC",
  "ACTIVE_SANDBOX",
  "ACTIVE_TESTBED",
  "ACTIVE_STAGING",
  "ACTIVE_AUTHORIZED",
  "SUSPENDED",
  "EXPIRED",
]);
export type PartnerContractLifecycleState = z.infer<
  typeof PartnerContractLifecycleStateSchema
>;

export const PartnerContractRoleSchema = z.enum([
  "AGENT",
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
  "GOVERNANCE_ADMIN",
]);
export type PartnerContractRole = z.infer<typeof PartnerContractRoleSchema>;

export const PartnerContractCapabilityIdSchema = z.enum([
  "FIN.ACCOUNT_LOOKUP",
  "FIN.CASH_IN_AUTHORIZE",
  "FIN.CASH_OUT_AUTHORIZE",
  "FIN.SAVINGS_INQUIRY",
  "FIN.SERVICE_REQUEST",
  "PAY.C2B_CREATE",
  "PAY.STATUS_QUERY",
  "PAY.REVERSAL_REQUEST",
  "IDV.ONBOARD_VERIFY",
  "COMMS.SMS_SEND",
  "FMCG.CATALOG_READ",
  "FMCG.INVENTORY_READ",
  "FMCG.RESTOCK_DRAFT",
  "FLEET.ROUTE_PLAN",
  "FLEET.DISPATCH",
  "FLEET.CASH_HANDOVER",
  "LIQ.NLC_READ",
  "LIQ.NLC_PLAN",
]);
export type PartnerContractCapabilityId = z.infer<
  typeof PartnerContractCapabilityIdSchema
>;

export const PartnerContractCapabilityStateSchema = z.enum([
  "DISABLED",
  "SIMULATION_ONLY",
  "SANDBOX_BOUNDED",
  "STAGING_BOUNDED",
  "AUTHORIZED",
  "SUSPENDED",
  "EXPIRED",
]);
export type PartnerContractCapabilityState = z.infer<
  typeof PartnerContractCapabilityStateSchema
>;

export const PartnerContractDataClassSchema = z.enum([
  "CUSTOMER_REFERENCE",
  "CUSTOMER_CONTACT_REFERENCE",
  "IDENTITY_ATTESTATION_REFERENCE",
  "TRANSACTION_INTENT",
  "TRANSACTION_STATUS",
  "PARTNER_ACCOUNT_REFERENCE",
  "PARTNER_ACCOUNT_SUMMARY",
  "LIQUIDITY_AGGREGATE",
  "INVENTORY_AGGREGATE",
  "RESTOCK_DRAFT",
  "ROUTE_PLAN",
  "AUDIT_REFERENCE",
]);
export type PartnerContractDataClass = z.infer<
  typeof PartnerContractDataClassSchema
>;

export const PartnerContractOfflinePolicySchema = z.enum([
  "DENY_OFFLINE",
  "READ_CACHED_REFERENCE_ONLY",
  "CAPTURE_INTENT_ONLY",
  "LOCAL_SIMULATION_ONLY",
]);
export type PartnerContractOfflinePolicy = z.infer<
  typeof PartnerContractOfflinePolicySchema
>;

export const PartnerContractPartnerClassSchema = z.enum([
  "FINANCIAL_INSTITUTION",
  "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
  "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
  "TELCO_COMMUNICATIONS",
  "IDENTITY_PROVIDER",
  "FMCG_DISTRIBUTOR_MERCHANT",
  "CASH_LOGISTICS_FLEET",
]);
export type PartnerContractPartnerClass = z.infer<
  typeof PartnerContractPartnerClassSchema
>;

export const PartnerOrgIdSchema = OpaqueId("org_", 96);
export const PartnerServiceIdSchema = OpaqueId("svc_", 96);
export const PartnerRegionIdSchema = OpaqueId("region_", 96);
export const PartnerAgentGroupIdSchema = OpaqueId("group_", 96);
export const PartnerRouteIdSchema = OpaqueId("route_", 120);
export const PartnerAdapterIdSchema = OpaqueId("adapter_", 140);
export const PartnerGrantIdSchema = OpaqueId("grant_", 120);
export const PartnerObjectIdSchema = OpaqueId("obj_", 140);
export const PartnerEvidenceRefSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/);

const UniqueServiceIdsSchema = z
  .array(PartnerServiceIdSchema)
  .min(1)
  .max(32)
  .refine(uniqueStrings, "service IDs must be unique");
const UniqueRolesSchema = z
  .array(PartnerContractRoleSchema)
  .min(1)
  .max(8)
  .refine(uniqueStrings, "roles must be unique");
const UniqueRegionsSchema = z
  .array(PartnerRegionIdSchema)
  .min(1)
  .max(64)
  .refine(uniqueStrings, "regions must be unique");
const UniqueAgentGroupsSchema = z
  .array(PartnerAgentGroupIdSchema)
  .max(64)
  .refine(uniqueStrings, "agent groups must be unique");
const UniqueRouteIdsSchema = z
  .array(PartnerRouteIdSchema)
  .min(1)
  .max(16)
  .refine(uniqueStrings, "route IDs must be unique");
const UniqueEvidenceRefsSchema = z
  .array(PartnerEvidenceRefSchema)
  .max(32)
  .refine(uniqueStrings, "evidence refs must be unique");
const UniqueDataClassesSchema = z
  .array(PartnerContractDataClassSchema)
  .max(20)
  .refine(uniqueStrings, "data classes must be unique");

export const PartnerCapabilityGrantSchema = z
  .object({
    grantId: PartnerGrantIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    state: PartnerContractCapabilityStateSchema,
    serviceIds: UniqueServiceIdsSchema,
    roles: UniqueRolesSchema,
    regions: UniqueRegionsSchema,
    agentGroups: UniqueAgentGroupsSchema,
    dataClasses: UniqueDataClassesSchema,
    allowedRouteIds: UniqueRouteIdsSchema,
    constraints: z
      .object({
        currencies: z
          .array(z.literal("ETB"))
          .max(1)
          .refine(uniqueStrings, "currencies must be unique"),
        maxAmountMinor: z.number().int().positive().max(1_000_000_000).nullable(),
        offlinePolicy: PartnerContractOfflinePolicySchema,
      })
      .strict(),
    activation: z
      .object({
        effectiveAt: z.string().datetime({ offset: true }).nullable(),
        expiresAt: z.string().datetime({ offset: true }).nullable(),
        evidenceRefs: UniqueEvidenceRefsSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((grant, ctx) => {
    if (
      grant.activation.effectiveAt &&
      grant.activation.expiresAt &&
      Date.parse(grant.activation.expiresAt) <= Date.parse(grant.activation.effectiveAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activation", "expiresAt"],
        message: "expiry must be after effective time",
      });
    }
  });
export type PartnerCapabilityGrant = z.infer<typeof PartnerCapabilityGrantSchema>;

export const PartnerCapabilityContractSchema = z
  .object({
    schemaVersion: z.literal(PartnerContractSchemaVersion),
    partnerOrgId: PartnerOrgIdSchema,
    contractVersion: z.number().int().positive().max(1_000_000),
    partnerClass: PartnerContractPartnerClassSchema,
    legalName: z.string().min(1).max(180),
    displayName: z.string().min(1).max(120),
    environment: PartnerContractEnvironmentSchema,
    lifecycleState: PartnerContractLifecycleStateSchema,
    regions: UniqueRegionsSchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
    capabilityGrants: z
      .array(PartnerCapabilityGrantSchema)
      .max(128)
      .refine(
        (grants) => uniqueStrings(grants.map((grant) => grant.grantId)),
        "grant IDs must be unique",
      ),
  })
  .strict()
  .superRefine((contract, ctx) => {
    const expectedActiveState: Partial<
      Record<PartnerContractEnvironment, PartnerContractLifecycleState>
    > = {
      synthetic: "ACTIVE_SYNTHETIC",
      sandbox: "ACTIVE_SANDBOX",
      testbed: "ACTIVE_TESTBED",
      staging: "ACTIVE_STAGING",
      production: "ACTIVE_AUTHORIZED",
    };
    if (
      contract.lifecycleState.startsWith("ACTIVE_") &&
      expectedActiveState[contract.environment] !== contract.lifecycleState
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lifecycleState"],
        message: "active lifecycle state must match contract environment",
      });
    }
    for (const grant of contract.capabilityGrants) {
      for (const region of grant.regions) {
        if (!contract.regions.includes(region)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["capabilityGrants", grant.grantId, "regions"],
            message: `grant region ${region} is outside the partner contract`,
          });
        }
      }
    }
  });
export type PartnerCapabilityContract = z.infer<
  typeof PartnerCapabilityContractSchema
>;

export const PartnerRoleAssignmentSchema = z
  .object({
    partnerOrgId: PartnerOrgIdSchema,
    role: PartnerContractRoleSchema,
  })
  .strict();

export const PartnerCapabilityPrincipalSchema = z
  .object({
    userId: z.string().min(1).max(120),
    partnerOrgMemberships: z
      .array(PartnerOrgIdSchema)
      .max(32)
      .refine(uniqueStrings, "partner memberships must be unique"),
    roleAssignments: z.array(PartnerRoleAssignmentSchema).max(64),
    regionIds: z
      .array(PartnerRegionIdSchema)
      .max(64)
      .refine(uniqueStrings, "region IDs must be unique"),
    agentGroupIds: z
      .array(PartnerAgentGroupIdSchema)
      .max(64)
      .refine(uniqueStrings, "agent group IDs must be unique"),
    serviceScopes: z
      .array(PartnerServiceIdSchema)
      .max(128)
      .refine(uniqueStrings, "service scopes must be unique"),
    objectScopes: z
      .array(PartnerObjectIdSchema)
      .max(256)
      .refine(uniqueStrings, "object scopes must be unique"),
  })
  .strict();
export type PartnerCapabilityPrincipal = z.infer<
  typeof PartnerCapabilityPrincipalSchema
>;

export const PartnerCapabilityAccessRequestSchema = z
  .object({
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    regionId: PartnerRegionIdSchema,
    routeId: PartnerRouteIdSchema,
    objectId: PartnerObjectIdSchema.nullable(),
  })
  .strict();
export type PartnerCapabilityAccessRequest = z.infer<
  typeof PartnerCapabilityAccessRequestSchema
>;

export const PartnerResolvedRouteSchema = z
  .object({
    routeId: PartnerRouteIdSchema,
    adapterId: PartnerAdapterIdSchema,
    environment: PartnerContractEnvironmentSchema,
    registered: z.literal(true),
    supportedCapabilityIds: z
      .array(PartnerContractCapabilityIdSchema)
      .min(1)
      .max(64)
      .refine(uniqueStrings, "supported capability IDs must be unique"),
    evidenceRefs: UniqueEvidenceRefsSchema,
  })
  .strict();
export type PartnerResolvedRoute = z.infer<typeof PartnerResolvedRouteSchema>;

export const PartnerCapabilityEvaluationContextSchema = z
  .object({
    publishedServiceIds: z
      .array(PartnerServiceIdSchema)
      .max(128)
      .refine(uniqueStrings, "published service IDs must be unique"),
    availableEvidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(256)
      .refine(uniqueStrings, "available evidence refs must be unique"),
    route: PartnerResolvedRouteSchema,
    evaluatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type PartnerCapabilityEvaluationContext = z.infer<
  typeof PartnerCapabilityEvaluationContextSchema
>;

export const PartnerCapabilityDecisionCodeSchema = z.enum([
  "ALLOW",
  "PARTNER_CONTRACT_MISMATCH",
  "CONTRACT_INACTIVE",
  "PARTNER_MEMBERSHIP_REQUIRED",
  "SERVICE_NOT_PUBLISHED",
  "SERVICE_SCOPE_DENIED",
  "REGION_SCOPE_DENIED",
  "OBJECT_SCOPE_DENIED",
  "CAPABILITY_NOT_GRANTED",
  "ROLE_SCOPE_DENIED",
  "AGENT_GROUP_SCOPE_DENIED",
  "CAPABILITY_NOT_EFFECTIVE",
  "CAPABILITY_EXPIRED",
  "RUNTIME_STAGE_BLOCKED",
  "ROUTE_NOT_ALLOWED",
  "ROUTE_UNAVAILABLE",
  "EVIDENCE_MISSING",
]);
export type PartnerCapabilityDecisionCode = z.infer<
  typeof PartnerCapabilityDecisionCodeSchema
>;

export const PartnerCapabilityDecisionSchema = z
  .object({
    allowed: z.boolean(),
    code: PartnerCapabilityDecisionCodeSchema,
    partnerOrgId: PartnerOrgIdSchema,
    contractVersion: z.number().int().positive(),
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    routeId: PartnerRouteIdSchema,
    adapterId: PartnerAdapterIdSchema.nullable(),
    grantId: PartnerGrantIdSchema.nullable(),
    grantState: PartnerContractCapabilityStateSchema.nullable(),
    evaluatedAt: z.string().datetime({ offset: true }),
    auditContext: z
      .object({
        partnerOrgId: PartnerOrgIdSchema,
        contractVersion: z.number().int().positive(),
        serviceId: PartnerServiceIdSchema,
        capabilityId: PartnerContractCapabilityIdSchema,
        routeId: PartnerRouteIdSchema,
        adapterId: PartnerAdapterIdSchema.nullable(),
        grantId: PartnerGrantIdSchema.nullable(),
      })
      .strict(),
  })
  .strict();
export type PartnerCapabilityDecision = z.infer<
  typeof PartnerCapabilityDecisionSchema
>;

export const CURRENT_PARTNER_CAPABILITY_RUNTIME_POLICY = {
  name: "STAGE_3_BOUNDED_PARTNER_PLATFORM_FOUNDATION",
  usableStatesByEnvironment: {
    synthetic: ["SIMULATION_ONLY"],
    sandbox: ["SANDBOX_BOUNDED"],
    testbed: ["SANDBOX_BOUNDED"],
    staging: [],
    production: [],
  },
} as const satisfies {
  name: string;
  usableStatesByEnvironment: Record<
    PartnerContractEnvironment,
    readonly PartnerContractCapabilityState[]
  >;
};

function isContractActive(contract: PartnerCapabilityContract) {
  return contract.lifecycleState.startsWith("ACTIVE_");
}

function isGrantUsableNow(
  environment: PartnerContractEnvironment,
  state: PartnerContractCapabilityState,
) {
  return CURRENT_PARTNER_CAPABILITY_RUNTIME_POLICY.usableStatesByEnvironment[
    environment
  ].includes(state as never);
}

function decision(
  contract: PartnerCapabilityContract,
  request: PartnerCapabilityAccessRequest,
  context: PartnerCapabilityEvaluationContext,
  code: PartnerCapabilityDecisionCode,
  grant: PartnerCapabilityGrant | undefined,
): PartnerCapabilityDecision {
  const adapterId =
    context.route.routeId === request.routeId ? context.route.adapterId : null;
  return PartnerCapabilityDecisionSchema.parse({
    allowed: code === "ALLOW",
    code,
    partnerOrgId: request.partnerOrgId,
    contractVersion: contract.contractVersion,
    serviceId: request.serviceId,
    capabilityId: request.capabilityId,
    routeId: request.routeId,
    adapterId,
    grantId: grant?.grantId ?? null,
    grantState: grant?.state ?? null,
    evaluatedAt: context.evaluatedAt,
    auditContext: {
      partnerOrgId: request.partnerOrgId,
      contractVersion: contract.contractVersion,
      serviceId: request.serviceId,
      capabilityId: request.capabilityId,
      routeId: request.routeId,
      adapterId,
      grantId: grant?.grantId ?? null,
    },
  });
}

export function evaluatePartnerCapabilityAccess(input: {
  contract: unknown;
  principal: unknown;
  request: unknown;
  context: unknown;
}): PartnerCapabilityDecision {
  const contract = PartnerCapabilityContractSchema.parse(input.contract);
  const principal = PartnerCapabilityPrincipalSchema.parse(input.principal);
  const request = PartnerCapabilityAccessRequestSchema.parse(input.request);
  const context = PartnerCapabilityEvaluationContextSchema.parse(input.context);

  if (request.partnerOrgId !== contract.partnerOrgId)
    return decision(
      contract,
      request,
      context,
      "PARTNER_CONTRACT_MISMATCH",
      undefined,
    );
  if (!isContractActive(contract))
    return decision(contract, request, context, "CONTRACT_INACTIVE", undefined);
  if (!principal.partnerOrgMemberships.includes(contract.partnerOrgId))
    return decision(
      contract,
      request,
      context,
      "PARTNER_MEMBERSHIP_REQUIRED",
      undefined,
    );
  if (!context.publishedServiceIds.includes(request.serviceId))
    return decision(
      contract,
      request,
      context,
      "SERVICE_NOT_PUBLISHED",
      undefined,
    );
  if (!principal.serviceScopes.includes(request.serviceId))
    return decision(
      contract,
      request,
      context,
      "SERVICE_SCOPE_DENIED",
      undefined,
    );
  if (
    !contract.regions.includes(request.regionId) ||
    !principal.regionIds.includes(request.regionId)
  )
    return decision(
      contract,
      request,
      context,
      "REGION_SCOPE_DENIED",
      undefined,
    );
  if (request.objectId && !principal.objectScopes.includes(request.objectId))
    return decision(
      contract,
      request,
      context,
      "OBJECT_SCOPE_DENIED",
      undefined,
    );

  const capabilityGrants = contract.capabilityGrants.filter(
    (grant) =>
      grant.capabilityId === request.capabilityId &&
      grant.serviceIds.includes(request.serviceId),
  );
  if (capabilityGrants.length === 0)
    return decision(
      contract,
      request,
      context,
      "CAPABILITY_NOT_GRANTED",
      undefined,
    );

  const regionGrants = capabilityGrants.filter((grant) =>
    grant.regions.includes(request.regionId),
  );
  if (regionGrants.length === 0)
    return decision(
      contract,
      request,
      context,
      "REGION_SCOPE_DENIED",
      capabilityGrants[0],
    );

  const principalRoles = principal.roleAssignments
    .filter((assignment) => assignment.partnerOrgId === contract.partnerOrgId)
    .map((assignment) => assignment.role);
  const roleGrants = regionGrants.filter((grant) =>
    grant.roles.some((role) => principalRoles.includes(role)),
  );
  if (roleGrants.length === 0)
    return decision(
      contract,
      request,
      context,
      "ROLE_SCOPE_DENIED",
      regionGrants[0],
    );

  const agentGroupGrants = roleGrants.filter(
    (grant) =>
      grant.agentGroups.length === 0 ||
      grant.agentGroups.some((groupId) =>
        principal.agentGroupIds.includes(groupId),
      ),
  );
  if (agentGroupGrants.length === 0)
    return decision(
      contract,
      request,
      context,
      "AGENT_GROUP_SCOPE_DENIED",
      roleGrants[0],
    );

  const grant = agentGroupGrants[0];
  const now = Date.parse(context.evaluatedAt);
  if (
    grant.activation.effectiveAt &&
    Date.parse(grant.activation.effectiveAt) > now
  )
    return decision(
      contract,
      request,
      context,
      "CAPABILITY_NOT_EFFECTIVE",
      grant,
    );
  if (
    grant.activation.expiresAt &&
    Date.parse(grant.activation.expiresAt) <= now
  )
    return decision(
      contract,
      request,
      context,
      "CAPABILITY_EXPIRED",
      grant,
    );
  if (!isGrantUsableNow(contract.environment, grant.state))
    return decision(
      contract,
      request,
      context,
      "RUNTIME_STAGE_BLOCKED",
      grant,
    );
  if (!grant.allowedRouteIds.includes(request.routeId))
    return decision(contract, request, context, "ROUTE_NOT_ALLOWED", grant);
  if (
    context.route.routeId !== request.routeId ||
    context.route.environment !== contract.environment ||
    !context.route.supportedCapabilityIds.includes(request.capabilityId)
  )
    return decision(contract, request, context, "ROUTE_UNAVAILABLE", grant);

  const requiredEvidence = [
    ...contract.evidenceRefs,
    ...grant.activation.evidenceRefs,
    ...context.route.evidenceRefs,
  ];
  if (
    requiredEvidence.some(
      (evidenceRef) => !context.availableEvidenceRefs.includes(evidenceRef),
    )
  )
    return decision(contract, request, context, "EVIDENCE_MISSING", grant);

  return decision(contract, request, context, "ALLOW", grant);
}
