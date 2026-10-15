import { z } from "zod";

import {
  canonicalizeEvidenceValue,
  computeCanonicalSha256,
} from "./evidenceIntegrity";
import { HubIdSchema, syntheticHubs } from "./hub";
import {
  HubWorkflowCorrelationIdSchema,
  HubWorkflowEnvelopeSchemaVersion,
  HubWorkflowLimitationSchema,
  HubWorkflowRunIdSchema,
  verifyHubWorkflowEnvelope,
  type HubWorkflowEnvelope,
  type HubWorkflowLimitation,
} from "./hubWorkflowEnvelope";
import {
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  type PartnerCapabilityContract,
  type PartnerResolvedRoute,
} from "./partnerCapabilityContract";
import {
  SYNTHETIC_PARTNERFI_SERVICE_CATALOGS,
  SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS,
  type PartnerServiceCatalog,
} from "./partnerServiceCatalog";
import {
  SYNTHETIC_REFERENCE_ROUTES,
} from "./syntheticReferencePartners";

const unique = <T>(values: readonly T[]) => new Set(values).size === values.length;
const sorted = (values: readonly string[]) => [...values].sort();
const uniqueSorted = (values: readonly string[]) => [...new Set(values)].sort();

export const HubEvidenceManifestSchemaVersion = 1 as const;
export const Stage4HubFixtureDatasetVersion = "stage4-hub-fixtures-v1" as const;

const Sha256DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const ManifestIdSchema = z
  .string()
  .min(14)
  .max(120)
  .regex(/^manifest_syn_[a-z0-9][a-z0-9_-]*$/);
const ArtifactIdSchema = z
  .string()
  .min(14)
  .max(160)
  .regex(/^artifact_syn_[a-z0-9][a-z0-9_-]*$/);
const VersionRefSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/);

export const HubEvidenceRuntimeClassSchema = z.enum([
  "SYNTHETIC_FIXTURE",
  "STAGING_SYNTHETIC",
]);
export type HubEvidenceRuntimeClass = z.infer<typeof HubEvidenceRuntimeClassSchema>;

export const HubEvidenceArtifactKindSchema = z.enum([
  "FIXTURE_GRAPH",
  "HUB_WORKFLOW_ENVELOPE",
  "SUPPORTING_EVIDENCE",
]);
export const HubEvidenceArtifactIntegritySchema = z.enum([
  "DIGEST_RECORDED",
  "PENDING",
  "UNKNOWN",
]);
export type HubEvidenceArtifactIntegrity = z.infer<
  typeof HubEvidenceArtifactIntegritySchema
>;

export const HubEvidenceRetentionClassSchema = z.enum([
  "STAGE4_SYNTHETIC_EVIDENCE",
  "STAGE4_SYNTHETIC_TRANSIENT",
]);

export const HubEvidenceArtifactSchema = z
  .object({
    artifactId: ArtifactIdSchema,
    kind: HubEvidenceArtifactKindSchema,
    owner: z.literal("WISHLAND_NETWORKING_PLC"),
    retentionClass: HubEvidenceRetentionClassSchema,
    versionRef: VersionRefSchema,
    contentDigest: Sha256DigestSchema.nullable(),
    integrityStatus: HubEvidenceArtifactIntegritySchema,
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(128)
      .refine(unique, "artifact evidence refs must be unique"),
  })
  .strict()
  .superRefine((artifact, ctx) => {
    if (
      artifact.integrityStatus === "DIGEST_RECORDED" &&
      artifact.contentDigest === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentDigest"],
        message: "digest-recorded artifacts require a SHA-256 digest",
      });
    }
  });
export type HubEvidenceArtifact = z.infer<typeof HubEvidenceArtifactSchema>;

export const HubEvidencePackageCompletenessSchema = z.enum([
  "DIGEST_SET_COMPLETE",
  "INCOMPLETE_PENDING",
  "INCOMPLETE_UNKNOWN",
]);
export type HubEvidencePackageCompleteness = z.infer<
  typeof HubEvidencePackageCompletenessSchema
>;

const RequiredE1CLimitations = [
  "SYNTHETIC_ONLY",
  "NO_REAL_PII",
  "NO_REAL_FUNDS",
  "NO_SETTLEMENT_AUTHORITY",
  "NO_PROVIDER_AUTHORITY",
  "NO_DEVICE_CONTROL",
  "NO_PRODUCTION_AUTH",
  "NO_LIVE_PROVIDER_CALL",
] as const satisfies readonly HubWorkflowLimitation[];

const ClassificationSchema = z
  .object({
    stage: z.literal("STAGE_4"),
    environment: z.enum(["synthetic", "staging"]),
    runtimeClass: HubEvidenceRuntimeClassSchema,
    dataMode: z.literal("synthetic"),
    providerExecution: z.literal("NO_LIVE_PROVIDER_CALLS"),
  })
  .strict()
  .superRefine((value, ctx) => {
    const expectedEnvironment =
      value.runtimeClass === "SYNTHETIC_FIXTURE" ? "synthetic" : "staging";
    if (value.environment !== expectedEnvironment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["environment"],
        message: "runtime class and environment classification must agree",
      });
    }
  });

const FixtureGraphSummarySchema = z
  .object({
    fixtureDatasetVersion: z.literal(Stage4HubFixtureDatasetVersion),
    graphDigest: Sha256DigestSchema,
    hubCount: z.number().int().nonnegative(),
    partnerCount: z.number().int().nonnegative(),
    operatorAssignmentCount: z.number().int().nonnegative(),
    deviceCount: z.number().int().nonnegative(),
    serviceCount: z.number().int().nonnegative(),
    capabilityCount: z.number().int().nonnegative(),
    routeCount: z.number().int().nonnegative(),
    adapterCount: z.number().int().nonnegative(),
    hubIds: z.array(HubIdSchema).max(128).refine(unique, "Hub IDs must be unique"),
    partnerOrgIds: z
      .array(PartnerOrgIdSchema)
      .max(128)
      .refine(unique, "partner IDs must be unique"),
    capabilityIds: z
      .array(z.string().min(3).max(96))
      .max(256)
      .refine(unique, "capability IDs must be unique"),
    routeIds: z
      .array(z.string().min(3).max(120))
      .max(256)
      .refine(unique, "route IDs must be unique"),
    adapterIds: z
      .array(z.string().min(3).max(140))
      .max(256)
      .refine(unique, "adapter IDs must be unique"),
  })
  .strict();

const WorkflowSummarySchema = z
  .object({
    eventCount: z.number().int().nonnegative(),
    correlationCount: z.number().int().nonnegative(),
    correlationIds: z
      .array(HubWorkflowCorrelationIdSchema)
      .max(512)
      .refine(unique, "correlation IDs must be unique"),
    eventContentDigests: z
      .array(Sha256DigestSchema)
      .max(2048),
  })
  .strict()
  .superRefine((summary, ctx) => {
    if (summary.correlationCount !== summary.correlationIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correlationCount"],
        message: "correlation count must match the correlation ID set",
      });
    }
    if (summary.eventCount !== summary.eventContentDigests.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventCount"],
        message: "event count must match the event digest inventory",
      });
    }
  });

const NonEvidenceSchema = z
  .object({
    externalProviderCallsCount: z.literal(0),
    liveLedgerReceiptCount: z.literal(0),
    partnerFiSettlementEvidenceCount: z.literal(0),
    realPiiPresent: z.literal(false),
    realFundsPresent: z.literal(false),
    regulatedProductionAuthorityGranted: z.literal(false),
    deviceControlExecuted: z.literal(false),
  })
  .strict();

function completenessForArtifacts(
  artifacts: readonly HubEvidenceArtifact[],
): HubEvidencePackageCompleteness {
  if (artifacts.some((artifact) => artifact.integrityStatus === "UNKNOWN"))
    return "INCOMPLETE_UNKNOWN";
  if (artifacts.some((artifact) => artifact.integrityStatus === "PENDING"))
    return "INCOMPLETE_PENDING";
  return "DIGEST_SET_COMPLETE";
}

export const HubEvidenceManifestContentSchema = z
  .object({
    schemaVersion: z.literal(HubEvidenceManifestSchemaVersion),
    manifestVersion: z.number().int().positive().max(1_000_000),
    manifestId: ManifestIdSchema,
    generatedAt: z.string().datetime({ offset: true }),
    runId: HubWorkflowRunIdSchema,
    classification: ClassificationSchema,
    fixtureGraph: FixtureGraphSummarySchema,
    workflowSummary: WorkflowSummarySchema,
    nonEvidence: NonEvidenceSchema,
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(1024)
      .refine(unique, "manifest evidence refs must be unique"),
    limitations: z
      .array(HubWorkflowLimitationSchema)
      .min(1)
      .max(32)
      .refine(unique, "manifest limitations must be unique"),
    artifactInventory: z.array(HubEvidenceArtifactSchema).min(1).max(2048),
    completenessStatus: HubEvidencePackageCompletenessSchema,
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const artifactIds = manifest.artifactInventory.map((artifact) => artifact.artifactId);
    if (!unique(artifactIds)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["artifactInventory"],
        message: "artifact IDs must be unique",
      });
    }
    if (
      manifest.artifactInventory.filter((artifact) => artifact.kind === "FIXTURE_GRAPH")
        .length !== 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["artifactInventory"],
        message: "exactly one fixture-graph artifact is required",
      });
    }
    const expectedCompleteness = completenessForArtifacts(manifest.artifactInventory);
    if (manifest.completenessStatus !== expectedCompleteness) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completenessStatus"],
        message: "package completeness must reflect artifact integrity status",
      });
    }
    for (const limitation of RequiredE1CLimitations) {
      if (!manifest.limitations.includes(limitation)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["limitations"],
          message: `required E1C limitation missing: ${limitation}`,
        });
      }
    }
  });
export type HubEvidenceManifestContent = z.infer<
  typeof HubEvidenceManifestContentSchema
>;

export const HubEvidenceManifestSchema = HubEvidenceManifestContentSchema.extend({
  manifestDigest: Sha256DigestSchema,
}).strict();
export type HubEvidenceManifest = z.infer<typeof HubEvidenceManifestSchema>;

type PartnerMaps = {
  contracts: Record<string, PartnerCapabilityContract>;
  catalogs: Record<string, PartnerServiceCatalog>;
};

function partnerMaps(): PartnerMaps {
  return {
    contracts: SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS as unknown as Record<
      string,
      PartnerCapabilityContract
    >,
    catalogs: SYNTHETIC_PARTNERFI_SERVICE_CATALOGS as unknown as Record<
      string,
      PartnerServiceCatalog
    >,
  };
}

function buildSyntheticHubFixtureGraph() {
  const partnerOrgIds = uniqueSorted(
    syntheticHubs.flatMap((hub) =>
      hub.partnerMemberships.map((membership) => membership.partnerOrgId),
    ),
  );
  const maps = partnerMaps();
  const partners = partnerOrgIds.map((partnerOrgId) => {
    const contract = maps.contracts[partnerOrgId];
    const catalog = maps.catalogs[partnerOrgId];
    if (!contract || !catalog)
      throw new Error("HUB_EVIDENCE_PARTNER_FIXTURE_INCOMPLETE");
    return {
      partnerOrgId,
      contractVersion: contract.contractVersion,
      contractEnvironment: contract.environment,
      contractLifecycleState: contract.lifecycleState,
      regions: sorted(contract.regions),
      evidenceRefs: sorted(contract.evidenceRefs),
      grants: [...contract.capabilityGrants]
        .sort((a, b) => a.grantId.localeCompare(b.grantId))
        .map((grant) => ({
          grantId: grant.grantId,
          capabilityId: grant.capabilityId,
          state: grant.state,
          serviceIds: sorted(grant.serviceIds),
          roles: sorted(grant.roles),
          regions: sorted(grant.regions),
          agentGroups: sorted(grant.agentGroups),
          dataClasses: sorted(grant.dataClasses),
          allowedRouteIds: sorted(grant.allowedRouteIds),
          constraints: {
            currencies: sorted(grant.constraints.currencies),
            maxAmountMinor: grant.constraints.maxAmountMinor,
            offlinePolicy: grant.constraints.offlinePolicy,
          },
          activation: {
            effectiveAt: grant.activation.effectiveAt,
            expiresAt: grant.activation.expiresAt,
            evidenceRefs: sorted(grant.activation.evidenceRefs),
          },
        })),
      catalogVersion: catalog.catalogVersion,
      catalogEnvironment: catalog.environment,
      catalogLifecycleState: catalog.lifecycleState,
      catalogEvidenceRefs: sorted(catalog.evidenceRefs),
      services: [...catalog.services]
        .sort((a, b) => a.serviceId.localeCompare(b.serviceId))
        .map((service) => ({
          serviceId: service.serviceId,
          serviceType: service.serviceType,
          roles: sorted(service.roles),
          regions: sorted(service.regions),
          agentGroups: sorted(service.agentGroups),
          requiredCapabilities: sorted(service.requiredCapabilities),
          routePolicy: {
            mode: service.routePolicy.mode,
            routeIds: sorted(service.routePolicy.routeIds),
          },
          inputClasses: sorted(service.dataRequirements.inputClasses),
          outputClasses: sorted(service.dataRequirements.outputClasses),
          offlinePolicy: service.offlinePolicy,
          workflowTemplate: service.workflowTemplate,
          activation: {
            effectiveAt: service.activation.effectiveAt,
            expiresAt: service.activation.expiresAt,
            evidenceRefs: sorted(service.activation.evidenceRefs),
          },
        })),
    };
  });

  const routeIds = uniqueSorted(
    partners.flatMap((partner) =>
      partner.services.flatMap((service) => service.routePolicy.routeIds),
    ),
  );
  const routes = routeIds.map((routeId) => {
    const route = SYNTHETIC_REFERENCE_ROUTES[
      routeId as keyof typeof SYNTHETIC_REFERENCE_ROUTES
    ] as PartnerResolvedRoute | undefined;
    if (!route) throw new Error("HUB_EVIDENCE_ROUTE_FIXTURE_INCOMPLETE");
    return {
      routeId: route.routeId,
      adapterId: route.adapterId,
      environment: route.environment,
      supportedCapabilityIds: sorted(route.supportedCapabilityIds),
      evidenceRefs: sorted(route.evidenceRefs),
    };
  });

  const hubs = [...syntheticHubs]
    .sort((a, b) => a.hubId.localeCompare(b.hubId))
    .map((hub) => ({
      tenantId: hub.tenantId,
      hubId: hub.hubId,
      displayName: hub.displayName,
      regionId: hub.regionId,
      lifecycleState: hub.lifecycleState,
      syntheticOnly: hub.syntheticOnly,
      authorityBoundary: hub.authorityBoundary,
      evidenceRefs: sorted(hub.evidenceRefs),
      operators: [...hub.operators]
        .sort((a, b) => a.operatorAssignmentId.localeCompare(b.operatorAssignmentId))
        .map((operator) => ({
          operatorAssignmentId: operator.operatorAssignmentId,
          partnerOrgId: operator.partnerOrgId,
          role: operator.role,
          actorScopeType: operator.actorScopeType,
          actorScopeId: operator.actorScopeId,
          assignmentState: operator.assignmentState,
          purposeScopes: sorted(operator.purposeScopes),
          evidenceRefs: sorted(operator.evidenceRefs),
        })),
      devices: [...hub.devices]
        .sort((a, b) => a.deviceId.localeCompare(b.deviceId))
        .map((device) => ({
          deviceId: device.deviceId,
          deviceClass: device.deviceClass,
          readinessState: device.readinessState,
          assignedOperatorRef: device.assignedOperatorRef,
          controlEnabled: device.controlEnabled,
          providerCommandEnabled: device.providerCommandEnabled,
          evidenceRefs: sorted(device.evidenceRefs),
        })),
      partnerMemberships: [...hub.partnerMemberships]
        .sort((a, b) => a.partnerOrgId.localeCompare(b.partnerOrgId))
        .map((membership) => ({
          partnerOrgId: membership.partnerOrgId,
          membershipState: membership.membershipState,
          permittedPurposeScopes: sorted(membership.permittedPurposeScopes),
          regulatedAuthorityGranted: membership.regulatedAuthorityGranted,
          evidenceRefs: sorted(membership.evidenceRefs),
        })),
    }));

  return {
    fixtureDatasetVersion: Stage4HubFixtureDatasetVersion,
    hubs,
    partners,
    routes,
  } as const;
}

function staticFixtureEvidenceRefs() {
  const maps = partnerMaps();
  const partnerOrgIds = uniqueSorted(
    syntheticHubs.flatMap((hub) =>
      hub.partnerMemberships.map((membership) => membership.partnerOrgId),
    ),
  );
  const refs = syntheticHubs.flatMap((hub) => [
    ...hub.evidenceRefs,
    ...hub.operators.flatMap((operator) => operator.evidenceRefs),
    ...hub.devices.flatMap((device) => device.evidenceRefs),
    ...hub.partnerMemberships.flatMap((membership) => membership.evidenceRefs),
  ]);
  for (const partnerOrgId of partnerOrgIds) {
    const contract = maps.contracts[partnerOrgId];
    const catalog = maps.catalogs[partnerOrgId];
    if (!contract || !catalog) continue;
    refs.push(...contract.evidenceRefs, ...catalog.evidenceRefs);
    refs.push(
      ...contract.capabilityGrants.flatMap((grant) => grant.activation.evidenceRefs),
      ...catalog.services.flatMap((service) => service.activation.evidenceRefs),
    );
    for (const routeId of uniqueSorted(catalog.services.flatMap((service) => service.routePolicy.routeIds))) {
      const route = SYNTHETIC_REFERENCE_ROUTES[
        routeId as keyof typeof SYNTHETIC_REFERENCE_ROUTES
      ] as PartnerResolvedRoute | undefined;
      if (route) refs.push(...route.evidenceRefs);
    }
  }
  return uniqueSorted(refs);
}

export function computeSyntheticHubFixtureGraphIdentity() {
  const graph = buildSyntheticHubFixtureGraph();
  const partnerOrgIds = graph.partners.map((partner) => partner.partnerOrgId);
  const capabilityIds = uniqueSorted(
    graph.partners.flatMap((partner) =>
      partner.grants.map((grant) => grant.capabilityId),
    ),
  );
  const routeIds = graph.routes.map((route) => route.routeId);
  const adapterIds = uniqueSorted(graph.routes.map((route) => route.adapterId));
  return FixtureGraphSummarySchema.parse({
    fixtureDatasetVersion: Stage4HubFixtureDatasetVersion,
    graphDigest: computeCanonicalSha256(graph),
    hubCount: graph.hubs.length,
    partnerCount: partnerOrgIds.length,
    operatorAssignmentCount: graph.hubs.reduce(
      (count, hub) => count + hub.operators.length,
      0,
    ),
    deviceCount: graph.hubs.reduce((count, hub) => count + hub.devices.length, 0),
    serviceCount: graph.partners.reduce(
      (count, partner) => count + partner.services.length,
      0,
    ),
    capabilityCount: capabilityIds.length,
    routeCount: routeIds.length,
    adapterCount: adapterIds.length,
    hubIds: graph.hubs.map((hub) => hub.hubId),
    partnerOrgIds,
    capabilityIds,
    routeIds,
    adapterIds,
  });
}

export type CreateHubEvidenceManifestInput = {
  manifestId: string;
  manifestVersion?: number;
  generatedAt: string;
  runId: string;
  runtimeClass?: HubEvidenceRuntimeClass;
  workflowEnvelopes?: readonly unknown[];
  declaredArtifacts?: readonly unknown[];
};

function eventArtifact(envelope: HubWorkflowEnvelope): HubEvidenceArtifact {
  const suffix = envelope.eventId.replace(/^hubevt_syn_/, "");
  return HubEvidenceArtifactSchema.parse({
    artifactId: `artifact_syn_workflow_${suffix}`,
    kind: "HUB_WORKFLOW_ENVELOPE",
    owner: "WISHLAND_NETWORKING_PLC",
    retentionClass: "STAGE4_SYNTHETIC_EVIDENCE",
    versionRef: `hub-workflow-envelope-v${HubWorkflowEnvelopeSchemaVersion}`,
    contentDigest: computeCanonicalSha256(envelope),
    integrityStatus: "DIGEST_RECORDED",
    evidenceRefs: uniqueSorted(envelope.evidenceRefs),
  });
}

export function computeHubEvidenceManifestDigest(
  content: HubEvidenceManifestContent,
) {
  return computeCanonicalSha256(HubEvidenceManifestContentSchema.parse(content));
}

export function createHubEvidenceManifest(
  input: CreateHubEvidenceManifestInput,
): HubEvidenceManifest {
  const manifestId = ManifestIdSchema.parse(input.manifestId);
  const generatedAt = z.string().datetime({ offset: true }).parse(input.generatedAt);
  const runId = HubWorkflowRunIdSchema.parse(input.runId);
  const runtimeClass = HubEvidenceRuntimeClassSchema.parse(
    input.runtimeClass ?? "SYNTHETIC_FIXTURE",
  );
  const envelopes = (input.workflowEnvelopes ?? []).map((entry) =>
    verifyHubWorkflowEnvelope(entry),
  );
  if (envelopes.some((envelope) => envelope.runId !== runId))
    throw new Error("HUB_EVIDENCE_RUN_MISMATCH");
  if (!unique(envelopes.map((envelope) => envelope.eventId)))
    throw new Error("HUB_EVIDENCE_DUPLICATE_EVENT_ID");

  const fixtureGraph = computeSyntheticHubFixtureGraphIdentity();
  const fixtureArtifact = HubEvidenceArtifactSchema.parse({
    artifactId: "artifact_syn_fixture_graph_v1",
    kind: "FIXTURE_GRAPH",
    owner: "WISHLAND_NETWORKING_PLC",
    retentionClass: "STAGE4_SYNTHETIC_EVIDENCE",
    versionRef: Stage4HubFixtureDatasetVersion,
    contentDigest: fixtureGraph.graphDigest,
    integrityStatus: "DIGEST_RECORDED",
    evidenceRefs: staticFixtureEvidenceRefs(),
  });
  const declaredArtifacts = (input.declaredArtifacts ?? []).map((artifact) =>
    HubEvidenceArtifactSchema.parse(artifact),
  );
  const artifactInventory = [
    fixtureArtifact,
    ...envelopes.map(eventArtifact),
    ...declaredArtifacts,
  ];

  const evidenceRefs = uniqueSorted([
    ...fixtureArtifact.evidenceRefs,
    ...envelopes.flatMap((envelope) => envelope.evidenceRefs),
    ...declaredArtifacts.flatMap((artifact) => artifact.evidenceRefs),
  ]);
  const correlationIds = uniqueSorted(
    envelopes.map((envelope) => envelope.correlationId),
  );
  const content = HubEvidenceManifestContentSchema.parse({
    schemaVersion: HubEvidenceManifestSchemaVersion,
    manifestVersion: input.manifestVersion ?? 1,
    manifestId,
    generatedAt,
    runId,
    classification: {
      stage: "STAGE_4",
      environment:
        runtimeClass === "SYNTHETIC_FIXTURE" ? "synthetic" : "staging",
      runtimeClass,
      dataMode: "synthetic",
      providerExecution: "NO_LIVE_PROVIDER_CALLS",
    },
    fixtureGraph,
    workflowSummary: {
      eventCount: envelopes.length,
      correlationCount: correlationIds.length,
      correlationIds,
      eventContentDigests: envelopes.map((envelope) => envelope.contentDigest),
    },
    nonEvidence: {
      externalProviderCallsCount: 0,
      liveLedgerReceiptCount: 0,
      partnerFiSettlementEvidenceCount: 0,
      realPiiPresent: false,
      realFundsPresent: false,
      regulatedProductionAuthorityGranted: false,
      deviceControlExecuted: false,
    },
    evidenceRefs,
    limitations: [...RequiredE1CLimitations],
    artifactInventory,
    completenessStatus: completenessForArtifacts(artifactInventory),
  });
  return HubEvidenceManifestSchema.parse({
    ...content,
    manifestDigest: computeHubEvidenceManifestDigest(content),
  });
}

export function verifyHubEvidenceManifest(input: unknown): HubEvidenceManifest {
  const manifest = HubEvidenceManifestSchema.parse(input);
  const { manifestDigest, ...content } = manifest;
  if (computeHubEvidenceManifestDigest(content) !== manifestDigest)
    throw new Error("HUB_EVIDENCE_MANIFEST_DIGEST_MISMATCH");
  return manifest;
}

export function exportHubEvidenceManifest(manifest: unknown) {
  return `${canonicalizeEvidenceValue(verifyHubEvidenceManifest(manifest))}\n`;
}

export function parseHubEvidenceManifestExport(serialized: string) {
  return verifyHubEvidenceManifest(JSON.parse(serialized));
}
