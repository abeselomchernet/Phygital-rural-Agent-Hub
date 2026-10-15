import { z } from "zod";

import {
  PartnerAdapterRegistrationSchema,
  PartnerRouteRegistrationSchema,
  type PartnerAdapterRegistration,
  type PartnerRouteRegistration,
} from "./adapterRegistry";
import {
  HubIdSchema,
  HubTenantIdSchema,
  syntheticHubs,
} from "./hub";
import {
  PartnerCapabilityContractSchema,
  PartnerCapabilityDecisionCodeSchema,
  PartnerCapabilityPrincipalSchema,
  PartnerContractCapabilityIdSchema,
  PartnerContractEnvironmentSchema,
  PartnerContractRoleSchema,
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  PartnerResolvedRouteSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
  evaluatePartnerCapabilityAccess,
  type PartnerCapabilityContract,
  type PartnerCapabilityPrincipal,
  type PartnerResolvedRoute,
} from "./partnerCapabilityContract";
import {
  PartnerServiceCatalogSchema,
  PartnerServiceTypeSchema,
  PartnerWorkflowTemplateSchema,
  validatePartnerServiceCatalogAgainstContract,
  type PartnerServiceCatalog,
  type PartnerServiceDefinition,
} from "./partnerServiceCatalog";
import {
  SYNTHETIC_HUB_IDS,
} from "./hub";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "./syntheticReferencePartners";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const SafeTextSchema = z
  .string()
  .min(1)
  .max(180)
  .refine((value) => !/[<>]/.test(value), "HTML-like markup is not allowed");

const UniqueEvidenceRefsSchema = z
  .array(PartnerEvidenceRefSchema)
  .max(64)
  .refine(uniqueStrings, "evidence refs must be unique");

export const HubServiceCompositionSchemaVersion = 1 as const;

export const HubServiceBindingStateSchema = z.enum([
  "ENABLED_SYNTHETIC",
  "DISABLED_SYNTHETIC",
]);
export type HubServiceBindingState = z.infer<typeof HubServiceBindingStateSchema>;

export const HubServiceBindingSchema = z
  .object({
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    state: HubServiceBindingStateSchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
  })
  .strict();
export type HubServiceBinding = z.infer<typeof HubServiceBindingSchema>;

export const HubServiceCompositionCodeSchema = z.enum([
  "AVAILABLE_SYNTHETIC",
  "HUB_LIFECYCLE_BLOCKED",
  "HUB_PARTNER_MEMBERSHIP_MISSING",
  "HUB_SERVICE_NOT_CONFIGURED",
  "HUB_SERVICE_DISABLED",
  "CATALOG_CONTRACT_INVALID",
  "PARTNER_SCOPE_DENIED",
  "ROLE_SCOPE_DENIED",
  "REGION_SCOPE_DENIED",
  "AGENT_GROUP_SCOPE_DENIED",
  "SERVICE_SCOPE_DENIED",
  "ROUTE_UNAVAILABLE",
  "ROUTE_PARTNER_MISMATCH",
  "ROUTE_SERVICE_NOT_ALLOWED",
  "ROUTE_CAPABILITY_NOT_SUPPORTED",
  "ADAPTER_METADATA_MISSING",
  "ADAPTER_ROUTE_MISMATCH",
  "CAPABILITY_DENIED",
]);
export type HubServiceCompositionCode = z.infer<
  typeof HubServiceCompositionCodeSchema
>;

export const HubServiceCapabilityDecisionSchema = z
  .object({
    capabilityId: PartnerContractCapabilityIdSchema,
    allowed: z.boolean(),
    decisionCode: PartnerCapabilityDecisionCodeSchema,
    routeId: PartnerRouteIdSchema.nullable(),
    adapterId: z.string().min(1).max(140).nullable(),
    grantId: z.string().min(1).max(120).nullable(),
  })
  .strict();
export type HubServiceCapabilityDecision = z.infer<
  typeof HubServiceCapabilityDecisionSchema
>;

export const HubServiceDecisionSchema = z
  .object({
    serviceId: PartnerServiceIdSchema,
    configured: z.boolean(),
    available: z.boolean(),
    code: HubServiceCompositionCodeSchema,
    routeId: PartnerRouteIdSchema.nullable(),
    adapterId: z.string().min(1).max(140).nullable(),
    capabilityDecisions: z.array(HubServiceCapabilityDecisionSchema).max(16),
  })
  .strict();
export type HubServiceDecision = z.infer<typeof HubServiceDecisionSchema>;

export const HubServiceCapabilityBindingSchema = z
  .object({
    capabilityId: PartnerContractCapabilityIdSchema,
    grantId: z.string().min(1).max(120),
    grantState: z.string().min(1).max(64),
    routeId: PartnerRouteIdSchema,
    routeVersion: z.number().int().positive(),
    adapterId: z.string().min(1).max(140),
    adapterVersion: z.number().int().positive(),
    providerKey: z.string().min(1).max(96),
    protocolFamily: z.string().min(1).max(96),
    environment: PartnerContractEnvironmentSchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
  })
  .strict();
export type HubServiceCapabilityBinding = z.infer<
  typeof HubServiceCapabilityBindingSchema
>;

export const HubServiceOfferingSchema = z
  .object({
    offeringId: z.string().regex(/^hubsvc_[a-z0-9_]+$/),
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    serviceType: PartnerServiceTypeSchema,
    name: SafeTextSchema.max(80),
    shortDescription: SafeTextSchema.max(180),
    category: SafeTextSchema.max(80),
    iconKey: z.string().min(1).max(48).nullable(),
    workflowTemplate: PartnerWorkflowTemplateSchema,
    capabilityBindings: z.array(HubServiceCapabilityBindingSchema).min(1).max(16),
    actionState: z.literal("AVAILABLE_SYNTHETIC"),
    evidenceRefs: UniqueEvidenceRefsSchema,
    authority: z
      .object({
        syntheticOnly: z.literal(true),
        liveNetworkAllowed: z.literal(false),
        settlementAuthorityGranted: z.literal(false),
        productionAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubServiceOffering = z.infer<typeof HubServiceOfferingSchema>;

export const HubServiceWorkspaceManifestSchema = z
  .object({
    schemaVersion: z.literal(HubServiceCompositionSchemaVersion),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    role: PartnerContractRoleSchema,
    regionId: z.string().min(3).max(96),
    environment: PartnerContractEnvironmentSchema,
    contractVersion: z.number().int().positive(),
    catalogVersion: z.number().int().positive(),
    offerings: z.array(HubServiceOfferingSchema).max(128),
    decisionMatrix: z.array(HubServiceDecisionSchema).max(128),
    boundaries: z
      .object({
        stage: z.literal("STAGE_4"),
        syntheticOnly: z.literal(true),
        uiPresenceIsCapabilityEvidence: z.literal(false),
        configurationGrantsAuthority: z.literal(false),
        providerSuccessIsSettlement: z.literal(false),
        liveNetworkAllowed: z.literal(false),
        productionAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubServiceWorkspaceManifest = z.infer<
  typeof HubServiceWorkspaceManifestSchema
>;

function binding(input: HubServiceBinding) {
  return HubServiceBindingSchema.parse(input);
}

export const SYNTHETIC_HUB_SERVICE_BINDINGS: readonly HubServiceBinding[] = [
  ...[
    SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
    SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ,
  ].flatMap((serviceId) => [
    binding({
      hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      serviceId,
      state: "ENABLED_SYNTHETIC",
      evidenceRefs: [`EV-SYN-HUB-SVC-ADAMA-ALPHA-${serviceId.toUpperCase()}`],
    }),
    binding({
      hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      serviceId,
      state: "ENABLED_SYNTHETIC",
      evidenceRefs: [`EV-SYN-HUB-SVC-ARISI-ALPHA-${serviceId.toUpperCase()}`],
    }),
  ]),
  ...[
    SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
    SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
    SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
  ].map((serviceId) =>
    binding({
      hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      serviceId,
      state: "ENABLED_SYNTHETIC",
      evidenceRefs: [`EV-SYN-HUB-SVC-ADAMA-BETA-${serviceId.toUpperCase()}`],
    }),
  ),
] as const;

function uniqueEvidence(...groups: readonly (readonly string[])[]) {
  return [...new Set(groups.flat())].sort();
}

function offeringId(hubId: string, serviceId: string) {
  return `hubsvc_${hubId}_${serviceId}`.replace(/[^a-z0-9_]/g, "_");
}

function selectedRouteForService(input: {
  service: PartnerServiceDefinition;
  routesById: Readonly<Record<string, PartnerResolvedRoute>>;
}) {
  return input.service.routePolicy.routeIds
    .map((routeId) => input.routesById[routeId])
    .find(Boolean);
}

function availableEvidence(input: {
  catalog: PartnerServiceCatalog;
  contract: PartnerCapabilityContract;
  service: PartnerServiceDefinition;
  route: PartnerResolvedRoute;
  binding: HubServiceBinding;
}) {
  const grants = input.contract.capabilityGrants.filter(
    (grant) =>
      input.service.requiredCapabilities.includes(grant.capabilityId) &&
      grant.serviceIds.includes(input.service.serviceId),
  );
  return uniqueEvidence(
    input.catalog.evidenceRefs,
    input.contract.evidenceRefs,
    input.service.activation.evidenceRefs,
    input.route.evidenceRefs,
    input.binding.evidenceRefs,
    grants.flatMap((grant) => grant.activation.evidenceRefs),
  );
}

function serviceDecision(input: {
  serviceId: string;
  configured: boolean;
  available: boolean;
  code: HubServiceCompositionCode;
  routeId?: string | null;
  adapterId?: string | null;
  capabilityDecisions?: HubServiceCapabilityDecision[];
}) {
  return HubServiceDecisionSchema.parse({
    serviceId: input.serviceId,
    configured: input.configured,
    available: input.available,
    code: input.code,
    routeId: input.routeId ?? null,
    adapterId: input.adapterId ?? null,
    capabilityDecisions: input.capabilityDecisions ?? [],
  });
}

function roleMatches(
  principal: PartnerCapabilityPrincipal,
  partnerOrgId: string,
  role: z.infer<typeof PartnerContractRoleSchema>,
) {
  return principal.roleAssignments.some(
    (assignment) =>
      assignment.partnerOrgId === partnerOrgId && assignment.role === role,
  );
}

function lookupRouteRegistration(
  routeId: string,
  routes: readonly PartnerRouteRegistration[],
) {
  return routes.find((route) => route.routeId === routeId);
}

function lookupAdapterRegistration(
  adapterId: string,
  adapters: readonly PartnerAdapterRegistration[],
) {
  return adapters.find((adapter) => adapter.adapterId === adapterId);
}

export function generateHubServiceWorkspaceManifest(input: {
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
  role: z.infer<typeof PartnerContractRoleSchema>;
  principal: unknown;
  contract: unknown;
  catalog: unknown;
  routesById: Readonly<Record<string, unknown>>;
  routeRegistrations: readonly unknown[];
  adapterRegistrations: readonly unknown[];
  evaluatedAt: string;
  bindings?: readonly HubServiceBinding[];
}): HubServiceWorkspaceManifest {
  const tenantId = HubTenantIdSchema.parse(input.tenantId);
  const hubId = HubIdSchema.parse(input.hubId);
  const partnerOrgId = PartnerOrgIdSchema.parse(input.partnerOrgId);
  const role = PartnerContractRoleSchema.parse(input.role);
  const principal = PartnerCapabilityPrincipalSchema.parse(input.principal);
  const contract = PartnerCapabilityContractSchema.parse(input.contract);
  const catalog = PartnerServiceCatalogSchema.parse(input.catalog);
  const routesById = Object.fromEntries(
    Object.entries(input.routesById).map(([routeId, route]) => [
      PartnerRouteIdSchema.parse(routeId),
      PartnerResolvedRouteSchema.parse(route),
    ]),
  ) as Record<string, PartnerResolvedRoute>;
  const routeRegistrations = input.routeRegistrations.map((route) =>
    PartnerRouteRegistrationSchema.parse(route),
  );
  const adapterRegistrations = input.adapterRegistrations.map((adapter) =>
    PartnerAdapterRegistrationSchema.parse(adapter),
  );
  const bindings = (input.bindings ?? SYNTHETIC_HUB_SERVICE_BINDINGS).map((entry) =>
    HubServiceBindingSchema.parse(entry),
  );

  if (contract.partnerOrgId !== partnerOrgId || catalog.partnerOrgId !== partnerOrgId)
    throw new Error("HUB_SERVICE_PARTNER_MISMATCH");
  if (contract.environment !== catalog.environment)
    throw new Error("HUB_SERVICE_ENVIRONMENT_MISMATCH");

  const hub = syntheticHubs.find((entry) => entry.hubId === hubId);
  if (!hub || hub.tenantId !== tenantId)
    throw new Error("HUB_SERVICE_HUB_SCOPE_MISMATCH");

  const membership = hub.partnerMemberships.find(
    (entry) =>
      entry.partnerOrgId === partnerOrgId &&
      entry.membershipState === "SYNTHETIC_MEMBER",
  );

  const catalogCompatibility = validatePartnerServiceCatalogAgainstContract({
    catalog,
    contract,
    evaluatedAt: input.evaluatedAt,
  });

  const offerings: HubServiceOffering[] = [];
  const decisionMatrix: HubServiceDecision[] = [];

  for (const service of catalog.services) {
    const configured = bindings.find(
      (entry) =>
        entry.hubId === hub.hubId &&
        entry.partnerOrgId === partnerOrgId &&
        entry.serviceId === service.serviceId,
    );

    if (!configured) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: false,
          available: false,
          code: "HUB_SERVICE_NOT_CONFIGURED",
        }),
      );
      continue;
    }
    if (configured.state !== "ENABLED_SYNTHETIC") {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "HUB_SERVICE_DISABLED",
        }),
      );
      continue;
    }
    if (hub.lifecycleState !== "ACTIVE_SYNTHETIC") {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "HUB_LIFECYCLE_BLOCKED",
        }),
      );
      continue;
    }
    if (!membership) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "HUB_PARTNER_MEMBERSHIP_MISSING",
        }),
      );
      continue;
    }
    if (!catalogCompatibility.valid) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "CATALOG_CONTRACT_INVALID",
        }),
      );
      continue;
    }
    if (!principal.partnerOrgMemberships.includes(partnerOrgId)) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "PARTNER_SCOPE_DENIED",
        }),
      );
      continue;
    }
    if (!roleMatches(principal, partnerOrgId, role) || !service.roles.includes(role)) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ROLE_SCOPE_DENIED",
        }),
      );
      continue;
    }
    if (!principal.regionIds.includes(hub.regionId) || !service.regions.includes(hub.regionId)) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "REGION_SCOPE_DENIED",
        }),
      );
      continue;
    }
    if (
      service.agentGroups.length > 0 &&
      !service.agentGroups.some((group) => principal.agentGroupIds.includes(group))
    ) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "AGENT_GROUP_SCOPE_DENIED",
        }),
      );
      continue;
    }
    if (!principal.serviceScopes.includes(service.serviceId)) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "SERVICE_SCOPE_DENIED",
        }),
      );
      continue;
    }

    const route = selectedRouteForService({ service, routesById });
    if (!route) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ROUTE_UNAVAILABLE",
        }),
      );
      continue;
    }

    const routeRegistration = lookupRouteRegistration(
      route.routeId,
      routeRegistrations,
    );
    if (!routeRegistration) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ROUTE_UNAVAILABLE",
          routeId: route.routeId,
          adapterId: route.adapterId,
        }),
      );
      continue;
    }
    if (routeRegistration.providerOrgId !== partnerOrgId) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ROUTE_PARTNER_MISMATCH",
          routeId: route.routeId,
          adapterId: route.adapterId,
        }),
      );
      continue;
    }
    if (!routeRegistration.serviceIds.includes(service.serviceId)) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ROUTE_SERVICE_NOT_ALLOWED",
          routeId: route.routeId,
          adapterId: route.adapterId,
        }),
      );
      continue;
    }
    if (
      service.requiredCapabilities.some(
        (capabilityId) =>
          !routeRegistration.supportedCapabilities.includes(capabilityId),
      )
    ) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ROUTE_CAPABILITY_NOT_SUPPORTED",
          routeId: route.routeId,
          adapterId: route.adapterId,
        }),
      );
      continue;
    }

    const adapter = lookupAdapterRegistration(
      routeRegistration.adapterId,
      adapterRegistrations,
    );
    if (!adapter) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ADAPTER_METADATA_MISSING",
          routeId: route.routeId,
          adapterId: route.adapterId,
        }),
      );
      continue;
    }
    if (
      adapter.adapterId !== route.adapterId ||
      adapter.environment !== route.environment ||
      adapter.environment !== contract.environment
    ) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "ADAPTER_ROUTE_MISMATCH",
          routeId: route.routeId,
          adapterId: route.adapterId,
        }),
      );
      continue;
    }

    const evidence = availableEvidence({
      catalog,
      contract,
      service,
      route,
      binding: configured,
    });
    const capabilityDecisions = service.requiredCapabilities.map((capabilityId) => {
      const decision = evaluatePartnerCapabilityAccess({
        contract,
        principal,
        request: {
          partnerOrgId,
          serviceId: service.serviceId,
          capabilityId,
          regionId: hub.regionId,
          routeId: route.routeId,
          objectId: null,
        },
        context: {
          publishedServiceIds: catalog.services.map((entry) => entry.serviceId),
          availableEvidenceRefs: evidence,
          route,
          evaluatedAt: input.evaluatedAt,
        },
      });
      return HubServiceCapabilityDecisionSchema.parse({
        capabilityId,
        allowed: decision.allowed,
        decisionCode: decision.code,
        routeId: route.routeId,
        adapterId: route.adapterId,
        grantId: decision.grantId,
      });
    });

    if (capabilityDecisions.some((decision) => !decision.allowed)) {
      decisionMatrix.push(
        serviceDecision({
          serviceId: service.serviceId,
          configured: true,
          available: false,
          code: "CAPABILITY_DENIED",
          routeId: route.routeId,
          adapterId: route.adapterId,
          capabilityDecisions,
        }),
      );
      continue;
    }

    const capabilityBindings = capabilityDecisions.map((decision) => {
      const grant = contract.capabilityGrants.find(
        (entry) => entry.grantId === decision.grantId,
      );
      if (!grant) throw new Error("HUB_SERVICE_GRANT_PROVENANCE_MISSING");
      return HubServiceCapabilityBindingSchema.parse({
        capabilityId: decision.capabilityId,
        grantId: grant.grantId,
        grantState: grant.state,
        routeId: route.routeId,
        routeVersion: routeRegistration.routeVersion,
        adapterId: adapter.adapterId,
        adapterVersion: adapter.adapterVersion,
        providerKey: adapter.providerKey,
        protocolFamily: adapter.protocolFamily,
        environment: adapter.environment,
        evidenceRefs: uniqueEvidence(
          grant.activation.evidenceRefs,
          routeRegistration.evidenceRefs,
          adapter.evidenceRefs,
          route.evidenceRefs,
        ),
      });
    });

    offerings.push(
      HubServiceOfferingSchema.parse({
        offeringId: offeringId(hub.hubId, service.serviceId),
        hubId: hub.hubId,
        partnerOrgId,
        serviceId: service.serviceId,
        serviceType: service.serviceType,
        name: service.display.name,
        shortDescription: service.display.shortDescription,
        category: service.display.category,
        iconKey: service.display.iconKey,
        workflowTemplate: service.workflowTemplate,
        capabilityBindings,
        actionState: "AVAILABLE_SYNTHETIC",
        evidenceRefs: uniqueEvidence(
          hub.evidenceRefs,
          membership.evidenceRefs,
          configured.evidenceRefs,
          catalog.evidenceRefs,
          service.activation.evidenceRefs,
          contract.evidenceRefs,
          evidence,
        ),
        authority: {
          syntheticOnly: true,
          liveNetworkAllowed: false,
          settlementAuthorityGranted: false,
          productionAuthorityGranted: false,
        },
      }),
    );
    decisionMatrix.push(
      serviceDecision({
        serviceId: service.serviceId,
        configured: true,
        available: true,
        code: "AVAILABLE_SYNTHETIC",
        routeId: route.routeId,
        adapterId: route.adapterId,
        capabilityDecisions,
      }),
    );
  }

  return HubServiceWorkspaceManifestSchema.parse({
    schemaVersion: HubServiceCompositionSchemaVersion,
    tenantId: hub.tenantId,
    hubId: hub.hubId,
    partnerOrgId,
    role,
    regionId: hub.regionId,
    environment: contract.environment,
    contractVersion: contract.contractVersion,
    catalogVersion: catalog.catalogVersion,
    offerings,
    decisionMatrix,
    boundaries: {
      stage: "STAGE_4",
      syntheticOnly: true,
      uiPresenceIsCapabilityEvidence: false,
      configurationGrantsAuthority: false,
      providerSuccessIsSettlement: false,
      liveNetworkAllowed: false,
      productionAuthorityGranted: false,
    },
  });
}
