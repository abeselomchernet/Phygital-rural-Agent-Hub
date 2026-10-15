import { z } from "zod";

import {
  PartnerAdapterIdSchema,
  PartnerContractCapabilityIdSchema,
  PartnerContractEnvironmentSchema,
  PartnerContractPartnerClassSchema,
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  PartnerResolvedRouteSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
  type PartnerCapabilityContract,
  type PartnerCapabilityPrincipal,
  type PartnerContractCapabilityId,
  type PartnerContractEnvironment,
  type PartnerContractPartnerClass,
  type PartnerContractRole,
  type PartnerResolvedRoute,
} from "./partnerCapabilityContract";
import {
  PartnerServiceCatalogSchema,
  generatePartnerServiceManifest,
  type PartnerServiceCatalog,
} from "./partnerServiceCatalog";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const InternalKeySchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[A-Z0-9][A-Z0-9_.-]*$/);

const ProviderKeySchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[A-Z0-9][A-Z0-9_.-]*$/);

const ProtocolFamilySchema = z
  .string()
  .min(2)
  .max(96)
  .regex(/^[A-Z0-9][A-Z0-9_.-]*$/);

const CredentialReferenceSchema = z
  .string()
  .min(3)
  .max(160)
  .regex(/^secretref_[A-Za-z0-9][A-Za-z0-9_.-]*$/)
  .nullable();

const UniqueCapabilitiesSchema = z
  .array(PartnerContractCapabilityIdSchema)
  .min(1)
  .max(64)
  .refine(uniqueStrings, "supported capabilities must be unique");

const UniqueServicesSchema = z
  .array(PartnerServiceIdSchema)
  .min(1)
  .max(128)
  .refine(uniqueStrings, "service IDs must be unique");

const UniqueEvidenceRefsSchema = z
  .array(PartnerEvidenceRefSchema)
  .max(32)
  .refine(uniqueStrings, "evidence refs must be unique");

export const PartnerAdapterRegistrationStatusSchema = z.enum([
  "REGISTERED_DISABLED",
  "REGISTERED_SYNTHETIC",
  "REGISTERED_SANDBOX",
  "REGISTERED_TESTBED",
  "SUSPENDED",
]);
export type PartnerAdapterRegistrationStatus = z.infer<
  typeof PartnerAdapterRegistrationStatusSchema
>;

export const PartnerAdapterRuntimeModeSchema = z.enum([
  "FOUNDATION_ONLY",
  "EXECUTABLE",
]);
export type PartnerAdapterRuntimeMode = z.infer<
  typeof PartnerAdapterRuntimeModeSchema
>;

export const PartnerRouteRegistrationStatusSchema = z.enum([
  "DISABLED",
  "SYNTHETIC_BOUNDED",
  "SANDBOX_BOUNDED",
  "TESTBED_BOUNDED",
  "SUSPENDED",
]);
export type PartnerRouteRegistrationStatus = z.infer<
  typeof PartnerRouteRegistrationStatusSchema
>;

export const PartnerAdapterRegistrationSchema = z
  .object({
    adapterId: PartnerAdapterIdSchema,
    adapterVersion: z.number().int().positive().max(1_000_000),
    partnerClass: PartnerContractPartnerClassSchema,
    providerKey: ProviderKeySchema,
    protocolFamily: ProtocolFamilySchema,
    environment: PartnerContractEnvironmentSchema,
    supportedCapabilities: UniqueCapabilitiesSchema,
    configSchemaId: InternalKeySchema,
    credentialRef: CredentialReferenceSchema,
    implementationKey: InternalKeySchema,
    status: PartnerAdapterRegistrationStatusSchema,
    runtimeMode: PartnerAdapterRuntimeModeSchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
  })
  .strict();
export type PartnerAdapterRegistration = z.infer<
  typeof PartnerAdapterRegistrationSchema
>;

export const PartnerRouteRegistrationSchema = z
  .object({
    routeId: PartnerRouteIdSchema,
    routeVersion: z.number().int().positive().max(1_000_000),
    providerOrgId: PartnerOrgIdSchema,
    partnerClass: PartnerContractPartnerClassSchema,
    environment: PartnerContractEnvironmentSchema,
    serviceIds: UniqueServicesSchema,
    adapterId: PartnerAdapterIdSchema,
    supportedCapabilities: UniqueCapabilitiesSchema,
    status: PartnerRouteRegistrationStatusSchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
  })
  .strict();
export type PartnerRouteRegistration = z.infer<
  typeof PartnerRouteRegistrationSchema
>;

export const PartnerAdapterResolutionProvenanceSchema = z
  .object({
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    environment: PartnerContractEnvironmentSchema,
    routeId: PartnerRouteIdSchema,
    routeVersion: z.number().int().positive(),
    adapterId: PartnerAdapterIdSchema,
    adapterVersion: z.number().int().positive(),
    providerKey: ProviderKeySchema,
    protocolFamily: ProtocolFamilySchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
  })
  .strict();
export type PartnerAdapterResolutionProvenance = z.infer<
  typeof PartnerAdapterResolutionProvenanceSchema
>;

export type PartnerAdapterResolution<T> = {
  adapter: T;
  provenance: PartnerAdapterResolutionProvenance;
};

export type PartnerAdapterFactory<T = unknown> = () => T;

type StoredAdapter = {
  metadata: PartnerAdapterRegistration;
  factory?: PartnerAdapterFactory;
};

export type PartnerTechnicalRouteRequest = {
  partnerOrgId: string;
  serviceId: string;
  capabilityId: PartnerContractCapabilityId;
  environment: PartnerContractEnvironment;
  routeId: string;
  expectedRouteVersion?: number | null;
  expectedAdapterVersion?: number | null;
};

export type PartnerGovernedRouteRequest = {
  catalog: PartnerServiceCatalog;
  contract: PartnerCapabilityContract;
  principal: PartnerCapabilityPrincipal;
  role: PartnerContractRole;
  regionId: string;
  serviceId: string;
  capabilityId: PartnerContractCapabilityId;
  evaluatedAt: string;
  mutationState?: "PRE_SUBMIT" | "SUBMITTED" | "AMBIGUOUS";
  pinnedRouteId?: string | null;
  pinnedRouteVersion?: number | null;
  pinnedAdapterVersion?: number | null;
};

const registeredAdapterStatusByEnvironment: Record<
  PartnerContractEnvironment,
  readonly PartnerAdapterRegistrationStatus[]
> = {
  synthetic: ["REGISTERED_SYNTHETIC"],
  sandbox: ["REGISTERED_SANDBOX"],
  testbed: ["REGISTERED_TESTBED"],
  staging: [],
  production: [],
};

const usableRouteStatusByEnvironment: Record<
  PartnerContractEnvironment,
  readonly PartnerRouteRegistrationStatus[]
> = {
  synthetic: ["SYNTHETIC_BOUNDED"],
  sandbox: ["SANDBOX_BOUNDED"],
  testbed: ["TESTBED_BOUNDED"],
  staging: [],
  production: [],
};

function asPartnerResolvedRoute(
  route: PartnerRouteRegistration,
  adapter: PartnerAdapterRegistration,
): PartnerResolvedRoute {
  return PartnerResolvedRouteSchema.parse({
    routeId: route.routeId,
    adapterId: adapter.adapterId,
    environment: route.environment,
    registered: true,
    supportedCapabilityIds: route.supportedCapabilities,
    evidenceRefs: [...new Set([...route.evidenceRefs, ...adapter.evidenceRefs])],
  });
}

export class PartnerAdapterRegistry {
  private readonly adapters = new Map<string, StoredAdapter>();
  private readonly routes = new Map<string, PartnerRouteRegistration>();

  registerAdapter(
    input: unknown,
    factory?: PartnerAdapterFactory,
  ): PartnerAdapterRegistration {
    const metadata = PartnerAdapterRegistrationSchema.parse(input);
    if (this.adapters.has(metadata.adapterId))
      throw new Error("ADAPTER_ID_ALREADY_REGISTERED");

    const registeredStatuses =
      registeredAdapterStatusByEnvironment[metadata.environment];
    const environmentRegistered = registeredStatuses.includes(metadata.status);
    if (
      metadata.status !== "REGISTERED_DISABLED" &&
      metadata.status !== "SUSPENDED" &&
      !environmentRegistered
    )
      throw new Error("ADAPTER_STATUS_ENVIRONMENT_MISMATCH");

    if (metadata.runtimeMode === "EXECUTABLE") {
      if (!environmentRegistered)
        throw new Error("EXECUTABLE_ADAPTER_REQUIRES_REGISTERED_ENVIRONMENT");
      if (!factory) throw new Error("EXECUTABLE_ADAPTER_FACTORY_REQUIRED");
    } else if (factory) {
      throw new Error("FOUNDATION_ONLY_ADAPTER_FACTORY_FORBIDDEN");
    }

    this.adapters.set(metadata.adapterId, { metadata, factory });
    return structuredClone(metadata);
  }

  registerRoute(input: unknown): PartnerRouteRegistration {
    const route = PartnerRouteRegistrationSchema.parse(input);
    if (this.routes.has(route.routeId))
      throw new Error("ROUTE_ID_ALREADY_REGISTERED");

    const stored = this.adapters.get(route.adapterId);
    if (!stored) throw new Error("ROUTE_ADAPTER_NOT_REGISTERED");
    if (stored.metadata.environment !== route.environment)
      throw new Error("ROUTE_ADAPTER_ENVIRONMENT_MISMATCH");
    if (stored.metadata.partnerClass !== route.partnerClass)
      throw new Error("ROUTE_ADAPTER_PARTNER_CLASS_MISMATCH");
    if (
      route.supportedCapabilities.some(
        (capability) =>
          !stored.metadata.supportedCapabilities.includes(capability),
      )
    )
      throw new Error("ROUTE_CAPABILITY_NOT_SUPPORTED_BY_ADAPTER");

    const usableStatuses = usableRouteStatusByEnvironment[route.environment];
    const isUsable = usableStatuses.includes(route.status);
    if (
      route.status !== "DISABLED" &&
      route.status !== "SUSPENDED" &&
      !isUsable
    )
      throw new Error("ROUTE_STATUS_ENVIRONMENT_MISMATCH");
    if (isUsable && stored.metadata.runtimeMode !== "EXECUTABLE")
      throw new Error("ROUTE_REQUIRES_EXECUTABLE_ADAPTER");

    this.routes.set(route.routeId, route);
    return structuredClone(route);
  }

  adapterMetadata() {
    return [...this.adapters.values()].map(({ metadata }) =>
      structuredClone(metadata),
    );
  }

  routeMetadata() {
    return [...this.routes.values()].map((route) => structuredClone(route));
  }

  resolvedRoutesById(): Readonly<Record<string, PartnerResolvedRoute>> {
    const entries = [...this.routes.values()].flatMap((route) => {
      const stored = this.adapters.get(route.adapterId);
      if (!stored) return [];
      if (!this.routeIsUsable(route) || !this.adapterIsUsable(stored)) return [];
      return [
        [route.routeId, asPartnerResolvedRoute(route, stored.metadata)] as const,
      ];
    });
    return Object.fromEntries(entries);
  }

  resolve<T>(input: PartnerTechnicalRouteRequest): PartnerAdapterResolution<T> {
    const route = this.routes.get(input.routeId);
    if (!route) throw new Error("ROUTE_NOT_REGISTERED");
    if (input.expectedRouteVersion != null && route.routeVersion !== input.expectedRouteVersion)
      throw new Error("ROUTE_VERSION_MISMATCH");
    if (route.providerOrgId !== input.partnerOrgId)
      throw new Error("ROUTE_PARTNER_MISMATCH");
    if (route.environment !== input.environment)
      throw new Error("ROUTE_ENVIRONMENT_MISMATCH");
    if (!route.serviceIds.includes(input.serviceId))
      throw new Error("ROUTE_SERVICE_NOT_ALLOWED");
    if (!route.supportedCapabilities.includes(input.capabilityId))
      throw new Error("ROUTE_CAPABILITY_NOT_SUPPORTED");
    if (!this.routeIsUsable(route)) throw new Error("ROUTE_NOT_USABLE");

    const stored = this.adapters.get(route.adapterId);
    if (!stored) throw new Error("ROUTE_ADAPTER_NOT_REGISTERED");
    if (input.expectedAdapterVersion != null && stored.metadata.adapterVersion !== input.expectedAdapterVersion)
      throw new Error("ADAPTER_VERSION_MISMATCH");
    if (!this.adapterIsUsable(stored)) throw new Error("ADAPTER_NOT_USABLE");
    if (stored.metadata.environment !== input.environment)
      throw new Error("ADAPTER_ENVIRONMENT_MISMATCH");
    if (!stored.metadata.supportedCapabilities.includes(input.capabilityId))
      throw new Error("ADAPTER_CAPABILITY_NOT_SUPPORTED");
    if (!stored.factory) throw new Error("ADAPTER_FACTORY_UNAVAILABLE");

    const provenance = PartnerAdapterResolutionProvenanceSchema.parse({
      partnerOrgId: input.partnerOrgId,
      serviceId: input.serviceId,
      capabilityId: input.capabilityId,
      environment: input.environment,
      routeId: route.routeId,
      routeVersion: route.routeVersion,
      adapterId: stored.metadata.adapterId,
      adapterVersion: stored.metadata.adapterVersion,
      providerKey: stored.metadata.providerKey,
      protocolFamily: stored.metadata.protocolFamily,
      evidenceRefs: [
        ...new Set([...route.evidenceRefs, ...stored.metadata.evidenceRefs]),
      ],
    });

    return {
      adapter: stored.factory() as T,
      provenance,
    };
  }

  resolveGoverned<T>(
    input: PartnerGovernedRouteRequest,
  ): PartnerAdapterResolution<T> {
    const catalog = PartnerServiceCatalogSchema.parse(input.catalog);
    if (catalog.partnerOrgId !== input.contract.partnerOrgId)
      throw new Error("GOVERNED_ROUTE_PARTNER_MISMATCH");

    const manifest = generatePartnerServiceManifest({
      catalog,
      contract: input.contract,
      principal: input.principal,
      role: input.role,
      regionId: input.regionId,
      routesById: this.resolvedRoutesById(),
      evaluatedAt: input.evaluatedAt,
    });

    const service = manifest.services.find(
      (entry) => entry.serviceId === input.serviceId,
    );
    if (!service) throw new Error("SERVICE_NOT_AVAILABLE_TO_PRINCIPAL");
    if (!service.requiredCapabilities.includes(input.capabilityId))
      throw new Error("SERVICE_CAPABILITY_NOT_AVAILABLE");

    const mutationState = input.mutationState ?? "PRE_SUBMIT";
    const selectedRouteId =
      mutationState === "PRE_SUBMIT"
        ? service.routeId
        : input.pinnedRouteId ?? undefined;

    if (!selectedRouteId) throw new Error("PINNED_ROUTE_REQUIRED_AFTER_SUBMIT");
    if (selectedRouteId !== service.routeId)
      throw new Error("PINNED_ROUTE_MISMATCH");

    const expectedRouteVersion =
      mutationState === "PRE_SUBMIT" ? undefined : input.pinnedRouteVersion ?? undefined;
    const expectedAdapterVersion =
      mutationState === "PRE_SUBMIT" ? undefined : input.pinnedAdapterVersion ?? undefined;
    if (mutationState !== "PRE_SUBMIT" && expectedRouteVersion === undefined)
      throw new Error("PINNED_ROUTE_VERSION_REQUIRED_AFTER_SUBMIT");
    if (mutationState !== "PRE_SUBMIT" && expectedAdapterVersion === undefined)
      throw new Error("PINNED_ADAPTER_VERSION_REQUIRED_AFTER_SUBMIT");

    return this.resolve<T>({
      partnerOrgId: catalog.partnerOrgId,
      serviceId: input.serviceId,
      capabilityId: input.capabilityId,
      environment: catalog.environment,
      routeId: selectedRouteId,
      expectedRouteVersion,
      expectedAdapterVersion,
    });
  }

  private adapterIsUsable(stored: StoredAdapter) {
    return (
      stored.metadata.runtimeMode === "EXECUTABLE" &&
      Boolean(stored.factory) &&
      registeredAdapterStatusByEnvironment[stored.metadata.environment].includes(
        stored.metadata.status,
      )
    );
  }

  private routeIsUsable(route: PartnerRouteRegistration) {
    return usableRouteStatusByEnvironment[route.environment].includes(
      route.status,
    );
  }
}

export function adapterRegistration(input: {
  adapterId: string;
  adapterVersion?: number;
  partnerClass: PartnerContractPartnerClass;
  providerKey: string;
  protocolFamily: string;
  environment: PartnerContractEnvironment;
  supportedCapabilities: PartnerContractCapabilityId[];
  configSchemaId: string;
  credentialRef?: string | null;
  implementationKey: string;
  status: PartnerAdapterRegistrationStatus;
  runtimeMode: PartnerAdapterRuntimeMode;
  evidenceRefs?: string[];
}) {
  return PartnerAdapterRegistrationSchema.parse({
    adapterVersion: 1,
    credentialRef: null,
    evidenceRefs: [],
    ...input,
  });
}

export function routeRegistration(input: {
  routeId: string;
  routeVersion?: number;
  providerOrgId: string;
  partnerClass: PartnerContractPartnerClass;
  environment: PartnerContractEnvironment;
  serviceIds: string[];
  adapterId: string;
  supportedCapabilities: PartnerContractCapabilityId[];
  status: PartnerRouteRegistrationStatus;
  evidenceRefs?: string[];
}) {
  return PartnerRouteRegistrationSchema.parse({
    routeVersion: 1,
    evidenceRefs: [],
    ...input,
  });
}
