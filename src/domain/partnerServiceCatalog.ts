import { z } from "zod";

import {
  PartnerAgentGroupIdSchema,
  PartnerCapabilityContractSchema,
  PartnerContractCapabilityIdSchema,
  PartnerContractDataClassSchema,
  PartnerContractEnvironmentSchema,
  PartnerContractOfflinePolicySchema,
  PartnerContractRoleSchema,
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  PartnerRegionIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
  evaluatePartnerCapabilityAccess,
  type PartnerCapabilityContract,
  type PartnerCapabilityPrincipal,
  type PartnerContractCapabilityId,
  type PartnerContractDataClass,
  type PartnerContractOfflinePolicy,
  type PartnerContractRole,
  type PartnerResolvedRoute,
} from "./partnerCapabilityContract";
import {
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_PARTNERFI_ALPHA,
  SYNTHETIC_PARTNERFI_BETA,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "./syntheticReferencePartners";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const SafeTextSchema = z
  .string()
  .min(1)
  .max(180)
  .refine((value) => !/[<>]/.test(value), "HTML-like markup is not allowed");

const OptionalIconKeySchema = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .nullable();

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
const UniqueCapabilitiesSchema = z
  .array(PartnerContractCapabilityIdSchema)
  .min(1)
  .max(16)
  .refine(uniqueStrings, "required capabilities must be unique");
const UniqueRouteIdsSchema = z
  .array(PartnerRouteIdSchema)
  .min(1)
  .max(16)
  .refine(uniqueStrings, "route IDs must be unique");
const UniqueDataClassesSchema = z
  .array(PartnerContractDataClassSchema)
  .max(20)
  .refine(uniqueStrings, "data classes must be unique");
const UniqueEvidenceRefsSchema = z
  .array(PartnerEvidenceRefSchema)
  .max(32)
  .refine(uniqueStrings, "evidence refs must be unique");

export const PartnerServiceCatalogSchemaVersion = 1 as const;

export const PartnerServiceCatalogLifecycleSchema = z.enum([
  "DRAFT",
  "PUBLISHED_SYNTHETIC",
  "PUBLISHED_SANDBOX",
  "PUBLISHED_TESTBED",
  "PUBLISHED_STAGING",
  "AUTHORIZED",
  "SUSPENDED",
  "RETIRED",
]);
export type PartnerServiceCatalogLifecycle = z.infer<
  typeof PartnerServiceCatalogLifecycleSchema
>;

export const PartnerServiceTypeSchema = z.enum([
  "FINANCIAL_ACCOUNT_LOOKUP",
  "FINANCIAL_CASH_IN",
  "FINANCIAL_CASH_OUT",
  "FINANCIAL_SAVINGS_INQUIRY",
  "FINANCIAL_SERVICE_REQUEST",
  "PAYMENT_C2B",
  "PAYMENT_STATUS",
  "IDENTITY_ONBOARD_VERIFY",
  "FMCG_CATALOG_VIEW",
  "FMCG_INVENTORY_VIEW",
  "FMCG_RESTOCK_DRAFT",
  "FLEET_ROUTE_PLANNING",
  "NETWORK_LIQUIDITY_READ",
  "COMMUNICATIONS_SMS_REQUEST",
]);
export type PartnerServiceType = z.infer<typeof PartnerServiceTypeSchema>;

export const PartnerWorkflowTemplateSchema = z.enum([
  "CUSTOMER_LOOKUP_V1",
  "CASH_SERVICE_REQUEST_V1",
  "SAVINGS_INQUIRY_V1",
  "SERVICE_REQUEST_V1",
  "C2B_PAYMENT_REQUEST_V1",
  "PAYMENT_STATUS_V1",
  "IDENTITY_VERIFY_V1",
  "FMCG_CATALOG_V1",
  "FMCG_INVENTORY_V1",
  "FMCG_RESTOCK_PLAN_V1",
  "FLEET_ROUTE_PLANNING_V1",
  "NLC_READ_V1",
  "SMS_REQUEST_V1",
]);
export type PartnerWorkflowTemplate = z.infer<
  typeof PartnerWorkflowTemplateSchema
>;

export const PartnerServiceRoutePolicySchema = z
  .object({
    mode: z.enum(["EXPLICIT", "PRIORITY_ORDER"]),
    routeIds: UniqueRouteIdsSchema,
  })
  .strict();
export type PartnerServiceRoutePolicy = z.infer<
  typeof PartnerServiceRoutePolicySchema
>;

export const PartnerServiceDefinitionSchema = z
  .object({
    serviceId: PartnerServiceIdSchema,
    serviceType: PartnerServiceTypeSchema,
    display: z
      .object({
        name: SafeTextSchema.max(80),
        shortDescription: SafeTextSchema.max(180),
        category: SafeTextSchema.max(80),
        iconKey: OptionalIconKeySchema,
      })
      .strict(),
    roles: UniqueRolesSchema,
    regions: UniqueRegionsSchema,
    agentGroups: UniqueAgentGroupsSchema,
    requiredCapabilities: UniqueCapabilitiesSchema,
    routePolicy: PartnerServiceRoutePolicySchema,
    dataRequirements: z
      .object({
        inputClasses: UniqueDataClassesSchema,
        outputClasses: UniqueDataClassesSchema,
      })
      .strict(),
    offlinePolicy: PartnerContractOfflinePolicySchema,
    workflowTemplate: PartnerWorkflowTemplateSchema,
    activation: z
      .object({
        effectiveAt: z.string().datetime({ offset: true }).nullable(),
        expiresAt: z.string().datetime({ offset: true }).nullable(),
        evidenceRefs: UniqueEvidenceRefsSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((service, ctx) => {
    if (
      service.activation.effectiveAt &&
      service.activation.expiresAt &&
      Date.parse(service.activation.expiresAt) <=
        Date.parse(service.activation.effectiveAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["activation", "expiresAt"],
        message: "expiry must be after effective time",
      });
    }
  });
export type PartnerServiceDefinition = z.infer<
  typeof PartnerServiceDefinitionSchema
>;

export const PartnerServiceCatalogSchema = z
  .object({
    schemaVersion: z.literal(PartnerServiceCatalogSchemaVersion),
    catalogVersion: z.number().int().positive().max(1_000_000),
    partnerOrgId: PartnerOrgIdSchema,
    environment: PartnerContractEnvironmentSchema,
    lifecycleState: PartnerServiceCatalogLifecycleSchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
    services: z
      .array(PartnerServiceDefinitionSchema)
      .max(128)
      .refine(
        (services) => uniqueStrings(services.map((service) => service.serviceId)),
        "service IDs must be unique",
      ),
  })
  .strict();
export type PartnerServiceCatalog = z.infer<typeof PartnerServiceCatalogSchema>;

export const CURRENT_PARTNER_SERVICE_CATALOG_POLICY = {
  name: "STAGE_3_BOUNDED_SERVICE_CATALOG",
  actionableLifecycleByEnvironment: {
    synthetic: ["PUBLISHED_SYNTHETIC"],
    sandbox: ["PUBLISHED_SANDBOX"],
    testbed: ["PUBLISHED_TESTBED"],
    staging: [],
    production: [],
  },
} as const satisfies {
  name: string;
  actionableLifecycleByEnvironment: Record<
    z.infer<typeof PartnerContractEnvironmentSchema>,
    readonly PartnerServiceCatalogLifecycle[]
  >;
};

export const PartnerServiceCompatibilityCodeSchema = z.enum([
  "VALID",
  "PARTNER_MISMATCH",
  "ENVIRONMENT_MISMATCH",
  "CATALOG_STAGE_BLOCKED",
  "SERVICE_REGION_OUTSIDE_CONTRACT",
  "CAPABILITY_GRANT_MISSING",
  "ROLE_SCOPE_EXCEEDS_GRANT",
  "REGION_SCOPE_EXCEEDS_GRANT",
  "AGENT_GROUP_SCOPE_EXCEEDS_GRANT",
  "ROUTE_SCOPE_EXCEEDS_GRANT",
  "DATA_SCOPE_EXCEEDS_GRANT",
  "OFFLINE_POLICY_EXCEEDS_GRANT",
  "SERVICE_NOT_EFFECTIVE",
  "SERVICE_EXPIRED",
]);
export type PartnerServiceCompatibilityCode = z.infer<
  typeof PartnerServiceCompatibilityCodeSchema
>;

export type PartnerServiceCompatibilityResult = {
  valid: boolean;
  code: PartnerServiceCompatibilityCode;
  serviceId: string | null;
};

function result(
  code: PartnerServiceCompatibilityCode,
  serviceId: string | null = null,
): PartnerServiceCompatibilityResult {
  return { valid: code === "VALID", code, serviceId };
}

function catalogLifecycleIsActionable(catalog: PartnerServiceCatalog) {
  return CURRENT_PARTNER_SERVICE_CATALOG_POLICY.actionableLifecycleByEnvironment[
    catalog.environment
  ].includes(catalog.lifecycleState as never);
}

function offlinePolicyAllowedByGrant(
  servicePolicy: PartnerContractOfflinePolicy,
  grantPolicy: PartnerContractOfflinePolicy,
) {
  if (servicePolicy === grantPolicy) return true;
  return servicePolicy === "DENY_OFFLINE";
}

function dataClassesFor(service: PartnerServiceDefinition) {
  return [
    ...service.dataRequirements.inputClasses,
    ...service.dataRequirements.outputClasses,
  ];
}

export function validatePartnerServiceCatalogAgainstContract(input: {
  catalog: unknown;
  contract: unknown;
  evaluatedAt: string;
}): PartnerServiceCompatibilityResult {
  const catalog = PartnerServiceCatalogSchema.parse(input.catalog);
  const contract = PartnerCapabilityContractSchema.parse(input.contract);
  const now = Date.parse(input.evaluatedAt);

  if (catalog.partnerOrgId !== contract.partnerOrgId)
    return result("PARTNER_MISMATCH");
  if (catalog.environment !== contract.environment)
    return result("ENVIRONMENT_MISMATCH");
  if (!catalogLifecycleIsActionable(catalog))
    return result("CATALOG_STAGE_BLOCKED");

  for (const service of catalog.services) {
    if (service.regions.some((region) => !contract.regions.includes(region)))
      return result("SERVICE_REGION_OUTSIDE_CONTRACT", service.serviceId);

    if (
      service.activation.effectiveAt &&
      Date.parse(service.activation.effectiveAt) > now
    )
      return result("SERVICE_NOT_EFFECTIVE", service.serviceId);
    if (
      service.activation.expiresAt &&
      Date.parse(service.activation.expiresAt) <= now
    )
      return result("SERVICE_EXPIRED", service.serviceId);

    for (const capabilityId of service.requiredCapabilities) {
      const matchingGrants = contract.capabilityGrants.filter(
        (grant) =>
          grant.capabilityId === capabilityId &&
          grant.serviceIds.includes(service.serviceId),
      );
      if (matchingGrants.length === 0)
        return result("CAPABILITY_GRANT_MISSING", service.serviceId);

      const compatibleGrant = matchingGrants.find((grant) => {
        const rolesFit = service.roles.every((role) => grant.roles.includes(role));
        const regionsFit = service.regions.every((region) =>
          grant.regions.includes(region),
        );
        const groupsFit = service.agentGroups.every((group) =>
          grant.agentGroups.includes(group),
        );
        const routesFit = service.routePolicy.routeIds.every((routeId) =>
          grant.allowedRouteIds.includes(routeId),
        );
        const dataFit = dataClassesFor(service).every((dataClass) =>
          grant.dataClasses.includes(dataClass),
        );
        const offlineFits = offlinePolicyAllowedByGrant(
          service.offlinePolicy,
          grant.constraints.offlinePolicy,
        );
        return rolesFit && regionsFit && groupsFit && routesFit && dataFit && offlineFits;
      });

      if (compatibleGrant) continue;

      const grant = matchingGrants[0];
      if (service.roles.some((role) => !grant.roles.includes(role)))
        return result("ROLE_SCOPE_EXCEEDS_GRANT", service.serviceId);
      if (service.regions.some((region) => !grant.regions.includes(region)))
        return result("REGION_SCOPE_EXCEEDS_GRANT", service.serviceId);
      if (
        service.agentGroups.some((group) => !grant.agentGroups.includes(group))
      )
        return result("AGENT_GROUP_SCOPE_EXCEEDS_GRANT", service.serviceId);
      if (
        service.routePolicy.routeIds.some(
          (routeId) => !grant.allowedRouteIds.includes(routeId),
        )
      )
        return result("ROUTE_SCOPE_EXCEEDS_GRANT", service.serviceId);
      if (
        dataClassesFor(service).some(
          (dataClass) => !grant.dataClasses.includes(dataClass),
        )
      )
        return result("DATA_SCOPE_EXCEEDS_GRANT", service.serviceId);
      if (
        !offlinePolicyAllowedByGrant(
          service.offlinePolicy,
          grant.constraints.offlinePolicy,
        )
      )
        return result("OFFLINE_POLICY_EXCEEDS_GRANT", service.serviceId);
    }
  }

  return result("VALID");
}

export const PartnerServiceManifestItemSchema = z
  .object({
    serviceId: PartnerServiceIdSchema,
    serviceType: PartnerServiceTypeSchema,
    name: SafeTextSchema.max(80),
    shortDescription: SafeTextSchema.max(180),
    category: SafeTextSchema.max(80),
    iconKey: OptionalIconKeySchema,
    workflowTemplate: PartnerWorkflowTemplateSchema,
    requiredCapabilities: UniqueCapabilitiesSchema,
    routeId: PartnerRouteIdSchema,
    actionState: z.literal("AVAILABLE_SYNTHETIC"),
  })
  .strict();

export const PartnerServiceManifestSchema = z
  .object({
    partnerOrgId: PartnerOrgIdSchema,
    catalogVersion: z.number().int().positive(),
    role: PartnerContractRoleSchema,
    regionId: PartnerRegionIdSchema,
    services: z.array(PartnerServiceManifestItemSchema).max(128),
  })
  .strict();
export type PartnerServiceManifest = z.infer<typeof PartnerServiceManifestSchema>;

function availableEvidence(input: {
  catalog: PartnerServiceCatalog;
  service: PartnerServiceDefinition;
  contract: PartnerCapabilityContract;
  route: PartnerResolvedRoute;
}) {
  return [
    ...new Set([
      ...input.catalog.evidenceRefs,
      ...input.service.activation.evidenceRefs,
      ...input.contract.evidenceRefs,
      ...input.contract.capabilityGrants.flatMap(
        (grant) => grant.activation.evidenceRefs,
      ),
      ...input.route.evidenceRefs,
    ]),
  ];
}

function principalHasRole(
  principal: PartnerCapabilityPrincipal,
  partnerOrgId: string,
  role: PartnerContractRole,
) {
  return principal.roleAssignments.some(
    (assignment) =>
      assignment.partnerOrgId === partnerOrgId && assignment.role === role,
  );
}

export function generatePartnerServiceManifest(input: {
  catalog: unknown;
  contract: PartnerCapabilityContract;
  principal: PartnerCapabilityPrincipal;
  role: PartnerContractRole;
  regionId: string;
  routesById: Readonly<Record<string, PartnerResolvedRoute>>;
  evaluatedAt: string;
}): PartnerServiceManifest {
  const catalog = PartnerServiceCatalogSchema.parse(input.catalog);
  const compatibility = validatePartnerServiceCatalogAgainstContract({
    catalog,
    contract: input.contract,
    evaluatedAt: input.evaluatedAt,
  });

  const empty = () =>
    PartnerServiceManifestSchema.parse({
      partnerOrgId: catalog.partnerOrgId,
      catalogVersion: catalog.catalogVersion,
      role: input.role,
      regionId: input.regionId,
      services: [],
    });

  if (!compatibility.valid) return empty();
  if (
    !input.principal.partnerOrgMemberships.includes(catalog.partnerOrgId) ||
    !principalHasRole(input.principal, catalog.partnerOrgId, input.role) ||
    !input.principal.regionIds.includes(input.regionId)
  )
    return empty();

  const manifestItems = catalog.services.flatMap((service) => {
    if (!service.roles.includes(input.role)) return [];
    if (!service.regions.includes(input.regionId)) return [];
    if (
      service.agentGroups.length > 0 &&
      !service.agentGroups.some((group) =>
        input.principal.agentGroupIds.includes(group),
      )
    )
      return [];
    if (!input.principal.serviceScopes.includes(service.serviceId)) return [];

    const route = service.routePolicy.routeIds
      .map((routeId) => input.routesById[routeId])
      .find(Boolean);
    if (!route) return [];

    const allCapabilitiesAllowed = service.requiredCapabilities.every(
      (capabilityId) => {
        const decision = evaluatePartnerCapabilityAccess({
          contract: input.contract,
          principal: input.principal,
          request: {
            partnerOrgId: catalog.partnerOrgId,
            serviceId: service.serviceId,
            capabilityId,
            regionId: input.regionId,
            routeId: route.routeId,
            objectId: null,
          },
          context: {
            publishedServiceIds: catalog.services.map((entry) => entry.serviceId),
            availableEvidenceRefs: availableEvidence({
              catalog,
              service,
              contract: input.contract,
              route,
            }),
            route,
            evaluatedAt: input.evaluatedAt,
          },
        });
        return decision.allowed;
      },
    );
    if (!allCapabilitiesAllowed) return [];

    return [
      PartnerServiceManifestItemSchema.parse({
        serviceId: service.serviceId,
        serviceType: service.serviceType,
        name: service.display.name,
        shortDescription: service.display.shortDescription,
        category: service.display.category,
        iconKey: service.display.iconKey,
        workflowTemplate: service.workflowTemplate,
        requiredCapabilities: service.requiredCapabilities,
        routeId: route.routeId,
        actionState: "AVAILABLE_SYNTHETIC",
      }),
    ];
  });

  return PartnerServiceManifestSchema.parse({
    partnerOrgId: catalog.partnerOrgId,
    catalogVersion: catalog.catalogVersion,
    role: input.role,
    regionId: input.regionId,
    services: manifestItems,
  });
}

function service(input: {
  serviceId: string;
  serviceType: PartnerServiceType;
  name: string;
  description: string;
  category: string;
  iconKey: string;
  roles: PartnerContractRole[];
  regions: string[];
  agentGroups?: string[];
  capabilityId: PartnerContractCapabilityId;
  routeId: string;
  inputClasses: PartnerContractDataClass[];
  outputClasses?: PartnerContractDataClass[];
  offlinePolicy: PartnerContractOfflinePolicy;
  workflowTemplate: PartnerWorkflowTemplate;
  evidenceRef: string;
}): PartnerServiceDefinition {
  return PartnerServiceDefinitionSchema.parse({
    serviceId: input.serviceId,
    serviceType: input.serviceType,
    display: {
      name: input.name,
      shortDescription: input.description,
      category: input.category,
      iconKey: input.iconKey,
    },
    roles: input.roles,
    regions: input.regions,
    agentGroups: input.agentGroups ?? [],
    requiredCapabilities: [input.capabilityId],
    routePolicy: { mode: "EXPLICIT", routeIds: [input.routeId] },
    dataRequirements: {
      inputClasses: input.inputClasses,
      outputClasses: input.outputClasses ?? [],
    },
    offlinePolicy: input.offlinePolicy,
    workflowTemplate: input.workflowTemplate,
    activation: {
      effectiveAt: null,
      expiresAt: null,
      evidenceRefs: [input.evidenceRef],
    },
  });
}

const alphaEvidence = "EV-SYN-ALPHA-V1";
const betaEvidence = "EV-SYN-BETA-V1";

export const SYNTHETIC_ALPHA_SERVICE_CATALOG = PartnerServiceCatalogSchema.parse({
  schemaVersion: 1,
  catalogVersion: 1,
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
  environment: "synthetic",
  lifecycleState: "PUBLISHED_SYNTHETIC",
  evidenceRefs: [alphaEvidence],
  services: [
    service({
      serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
      serviceType: "FINANCIAL_ACCOUNT_LOOKUP",
      name: "Account Lookup",
      description: "Read a synthetic PartnerFI account reference.",
      category: "Financial services",
      iconKey: "account-lookup",
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      inputClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_REFERENCE"],
      offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      workflowTemplate: "CUSTOMER_LOOKUP_V1",
      evidenceRef: alphaEvidence,
    }),
    service({
      serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
      serviceType: "FINANCIAL_CASH_IN",
      name: "Cash In",
      description: "Prepare a synthetic PartnerFI cash-in authorization request.",
      category: "Financial services",
      iconKey: "cash-in",
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
      capabilityId: "FIN.CASH_IN_AUTHORIZE",
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      inputClasses: ["CUSTOMER_REFERENCE", "TRANSACTION_INTENT"],
      offlinePolicy: "CAPTURE_INTENT_ONLY",
      workflowTemplate: "CASH_SERVICE_REQUEST_V1",
      evidenceRef: alphaEvidence,
    }),
    service({
      serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
      serviceType: "FINANCIAL_CASH_OUT",
      name: "Cash Out",
      description: "Prepare a synthetic PartnerFI cash-out authorization request.",
      category: "Financial services",
      iconKey: "cash-out",
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
      capabilityId: "FIN.CASH_OUT_AUTHORIZE",
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      inputClasses: ["CUSTOMER_REFERENCE", "TRANSACTION_INTENT"],
      offlinePolicy: "CAPTURE_INTENT_ONLY",
      workflowTemplate: "CASH_SERVICE_REQUEST_V1",
      evidenceRef: alphaEvidence,
    }),
    service({
      serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ,
      serviceType: "NETWORK_LIQUIDITY_READ",
      name: "Network Liquidity",
      description: "Read synthetic NLC/LCI planning aggregates.",
      category: "Network operations",
      iconKey: "network-liquidity",
      roles: ["SUPERVISOR"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      capabilityId: "LIQ.NLC_READ",
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      inputClasses: ["LIQUIDITY_AGGREGATE"],
      offlinePolicy: "LOCAL_SIMULATION_ONLY",
      workflowTemplate: "NLC_READ_V1",
      evidenceRef: alphaEvidence,
    }),
  ],
});

export const SYNTHETIC_BETA_SERVICE_CATALOG = PartnerServiceCatalogSchema.parse({
  schemaVersion: 1,
  catalogVersion: 1,
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
  environment: "synthetic",
  lifecycleState: "PUBLISHED_SYNTHETIC",
  evidenceRefs: [betaEvidence],
  services: [
    service({
      serviceId: SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
      serviceType: "FINANCIAL_ACCOUNT_LOOKUP",
      name: "Account Lookup",
      description: "Read a synthetic PartnerFI account reference.",
      category: "Financial services",
      iconKey: "account-lookup",
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      inputClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_REFERENCE"],
      offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      workflowTemplate: "CUSTOMER_LOOKUP_V1",
      evidenceRef: betaEvidence,
    }),
    service({
      serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
      serviceType: "FINANCIAL_SAVINGS_INQUIRY",
      name: "Savings Inquiry",
      description: "Read a synthetic savings summary through the PartnerFI contract.",
      category: "Financial services",
      iconKey: "savings-inquiry",
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
      capabilityId: "FIN.SAVINGS_INQUIRY",
      routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      inputClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_SUMMARY"],
      offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      workflowTemplate: "SAVINGS_INQUIRY_V1",
      evidenceRef: betaEvidence,
    }),
    service({
      serviceId: SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
      serviceType: "FINANCIAL_SERVICE_REQUEST",
      name: "Savings Service Request",
      description: "Prepare a synthetic savings-service request for PartnerFI review.",
      category: "Financial services",
      iconKey: "service-request",
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
      capabilityId: "FIN.SERVICE_REQUEST",
      routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      inputClasses: ["CUSTOMER_REFERENCE", "TRANSACTION_INTENT"],
      offlinePolicy: "CAPTURE_INTENT_ONLY",
      workflowTemplate: "SERVICE_REQUEST_V1",
      evidenceRef: betaEvidence,
    }),
  ],
});

export const SYNTHETIC_PARTNERFI_SERVICE_CATALOGS = {
  [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA]: SYNTHETIC_ALPHA_SERVICE_CATALOG,
  [SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA]: SYNTHETIC_BETA_SERVICE_CATALOG,
} as const;

export const SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS = {
  [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA]: SYNTHETIC_PARTNERFI_ALPHA,
  [SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA]: SYNTHETIC_PARTNERFI_BETA,
} as const;
