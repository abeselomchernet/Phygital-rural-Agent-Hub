import { z } from "zod";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

export const Stage4TopologySchemaVersion = 1 as const;

export const Stage4ComponentKindSchema = z.enum([
  "APPLICATION_INGRESS",
  "ORCHESTRATION_COMPUTE",
  "PRIMARY_DATABASE",
  "REPLICA_DATABASE",
  "BACKUP_STORE",
  "AUDIT_STORE",
  "LOGGING_MONITORING",
  "KEY_CUSTODY",
  "ADMIN_ACCESS_PATH",
  "SUPPORT_ACCESS_PATH",
  "CONTROLLED_EGRESS",
]);
export type Stage4ComponentKind = z.infer<typeof Stage4ComponentKindSchema>;

export const STAGE4_REQUIRED_COMPONENT_KINDS = [
  "APPLICATION_INGRESS",
  "ORCHESTRATION_COMPUTE",
  "PRIMARY_DATABASE",
  "REPLICA_DATABASE",
  "BACKUP_STORE",
  "AUDIT_STORE",
  "LOGGING_MONITORING",
  "KEY_CUSTODY",
  "ADMIN_ACCESS_PATH",
  "SUPPORT_ACCESS_PATH",
  "CONTROLLED_EGRESS",
] as const satisfies readonly Stage4ComponentKind[];

export const Stage4EvidenceStateSchema = z.enum([
  "NOT_PROVIDED",
  "COLLECTED_UNREVIEWED",
  "ACCEPTED_FOR_STAGE4_REVIEW",
  "REJECTED",
]);
export type Stage4EvidenceState = z.infer<typeof Stage4EvidenceStateSchema>;

const EvidenceRefSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/);

const ComponentIdSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

const CountryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/)
  .nullable();

export const Stage4TopologyComponentSchema = z
  .object({
    componentId: ComponentIdSchema,
    kind: Stage4ComponentKindSchema,
    providerName: z.string().min(1).max(160).nullable(),
    facilityOrRegion: z.string().min(1).max(200).nullable(),
    countryCode: CountryCodeSchema,
    dataClasses: z
      .array(z.string().min(1).max(96))
      .max(32)
      .refine(uniqueStrings, "data classes must be unique"),
    evidenceState: Stage4EvidenceStateSchema,
    evidenceRefs: z
      .array(EvidenceRefSchema)
      .max(32)
      .refine(uniqueStrings, "evidence refs must be unique"),
    notes: z.string().max(500),
  })
  .strict()
  .superRefine((component, ctx) => {
    if (
      component.evidenceState === "ACCEPTED_FOR_STAGE4_REVIEW" &&
      component.evidenceRefs.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "accepted evidence requires at least one evidence reference",
      });
    }
  });
export type Stage4TopologyComponent = z.infer<
  typeof Stage4TopologyComponentSchema
>;

export const Stage4DataFlowEdgeSchema = z
  .object({
    fromComponentId: ComponentIdSchema,
    toComponentId: ComponentIdSchema,
    purpose: z.string().min(1).max(200),
    restrictedDataPermitted: z.literal(false),
  })
  .strict();

export const Stage4StagingTopologyManifestSchema = z
  .object({
    schemaVersion: z.literal(Stage4TopologySchemaVersion),
    environmentId: z
      .string()
      .min(1)
      .max(96)
      .regex(/^[a-z0-9][a-z0-9-]*$/),
    purpose: z.literal("GOVERNED_ET_RESIDENT_NON_PRODUCTION_FOUNDATION"),
    dataMode: z.literal("synthetic"),
    authority: z
      .object({
        realCustomerPiiAllowed: z.literal(false),
        realFundsAllowed: z.literal(false),
        productionProviderCredentialsAllowed: z.literal(false),
        livePartnerFiPostingAllowed: z.literal(false),
        liveCashMovementAllowed: z.literal(false),
        regulatedModeAllowed: z.literal(false),
      })
      .strict(),
    components: z
      .array(Stage4TopologyComponentSchema)
      .min(STAGE4_REQUIRED_COMPONENT_KINDS.length)
      .max(32)
      .refine(
        (components) => uniqueStrings(components.map((item) => item.componentId)),
        "component IDs must be unique",
      )
      .refine(
        (components) => uniqueStrings(components.map((item) => item.kind)),
        "component kinds must be unique",
      ),
    dataFlows: z.array(Stage4DataFlowEdgeSchema).max(64),
    topologyEvidenceRefs: z
      .array(EvidenceRefSchema)
      .max(64)
      .refine(uniqueStrings, "topology evidence refs must be unique"),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const kinds = new Set(manifest.components.map((component) => component.kind));
    for (const requiredKind of STAGE4_REQUIRED_COMPONENT_KINDS) {
      if (!kinds.has(requiredKind)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["components"],
          message: `missing required Stage 4 component ${requiredKind}`,
        });
      }
    }

    const ids = new Set(manifest.components.map((component) => component.componentId));
    for (const [index, edge] of manifest.dataFlows.entries()) {
      if (!ids.has(edge.fromComponentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataFlows", index, "fromComponentId"],
          message: "data-flow source must reference a declared component",
        });
      }
      if (!ids.has(edge.toComponentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataFlows", index, "toComponentId"],
          message: "data-flow destination must reference a declared component",
        });
      }
    }
  });
export type Stage4StagingTopologyManifest = z.infer<
  typeof Stage4StagingTopologyManifestSchema
>;

export const Stage4TopologyEvidenceDecisionSchema = z
  .object({
    environmentId: z.string(),
    missingEvidenceKinds: z.array(Stage4ComponentKindSchema),
    rejectedEvidenceKinds: z.array(Stage4ComponentKindSchema),
    nonEtDeclaredKinds: z.array(Stage4ComponentKindSchema),
    eligibleForExternalGateReview: z.boolean(),
    etResidencyApproved: z.literal(false),
    regulatedModeAllowed: z.literal(false),
    explanation: z.string(),
  })
  .strict();
export type Stage4TopologyEvidenceDecision = z.infer<
  typeof Stage4TopologyEvidenceDecisionSchema
>;

export function evaluateStage4TopologyEvidence(
  input: unknown,
): Stage4TopologyEvidenceDecision {
  const manifest = Stage4StagingTopologyManifestSchema.parse(input);

  const missingEvidenceKinds = manifest.components
    .filter(
      (component) =>
        component.evidenceState === "NOT_PROVIDED" ||
        component.evidenceState === "COLLECTED_UNREVIEWED",
    )
    .map((component) => component.kind);

  const rejectedEvidenceKinds = manifest.components
    .filter((component) => component.evidenceState === "REJECTED")
    .map((component) => component.kind);

  const nonEtDeclaredKinds = manifest.components
    .filter(
      (component) =>
        component.countryCode !== null && component.countryCode !== "ET",
    )
    .map((component) => component.kind);

  const allAccepted = manifest.components.every(
    (component) => component.evidenceState === "ACCEPTED_FOR_STAGE4_REVIEW",
  );
  const allEtDeclared = manifest.components.every(
    (component) => component.countryCode === "ET",
  );

  const eligibleForExternalGateReview =
    allAccepted &&
    allEtDeclared &&
    rejectedEvidenceKinds.length === 0 &&
    manifest.topologyEvidenceRefs.length > 0;

  return Stage4TopologyEvidenceDecisionSchema.parse({
    environmentId: manifest.environmentId,
    missingEvidenceKinds,
    rejectedEvidenceKinds,
    nonEtDeclaredKinds,
    eligibleForExternalGateReview,
    // A repository manifest can make evidence complete enough for external review,
    // but it cannot itself approve residency or unlock regulated execution.
    etResidencyApproved: false,
    regulatedModeAllowed: false,
    explanation: eligibleForExternalGateReview
      ? "Topology evidence is complete enough for external gate review; repository state alone does not approve Ethiopian residency or regulated mode."
      : "Stage 4 topology evidence is incomplete or unresolved; synthetic-only execution remains mandatory.",
  });
}

function component(
  componentId: string,
  kind: Stage4ComponentKind,
  dataClasses: string[],
  notes: string,
): Stage4TopologyComponent {
  return Stage4TopologyComponentSchema.parse({
    componentId,
    kind,
    providerName: null,
    facilityOrRegion: null,
    countryCode: null,
    dataClasses,
    evidenceState: "NOT_PROVIDED",
    evidenceRefs: [],
    notes,
  });
}

export const CURRENT_STAGE4_REFERENCE_TOPOLOGY: Stage4StagingTopologyManifest =
  Stage4StagingTopologyManifestSchema.parse({
    schemaVersion: Stage4TopologySchemaVersion,
    environmentId: "enawuga-et-stage4-nonprod",
    purpose: "GOVERNED_ET_RESIDENT_NON_PRODUCTION_FOUNDATION",
    dataMode: "synthetic",
    authority: {
      realCustomerPiiAllowed: false,
      realFundsAllowed: false,
      productionProviderCredentialsAllowed: false,
      livePartnerFiPostingAllowed: false,
      liveCashMovementAllowed: false,
      regulatedModeAllowed: false,
    },
    components: [
      component(
        "stage4-ingress",
        "APPLICATION_INGRESS",
        ["SYNTHETIC_REQUEST_METADATA"],
        "Authenticated non-production ingress; physical location evidence not yet accepted.",
      ),
      component(
        "stage4-compute",
        "ORCHESTRATION_COMPUTE",
        ["SYNTHETIC_OPERATIONAL_DATA"],
        "Wishland orchestration compute; provider/facility selection remains evidence-gated.",
      ),
      component(
        "stage4-db-primary",
        "PRIMARY_DATABASE",
        ["SYNTHETIC_APPLICATION_STATE"],
        "Primary durable store target; no real customer or financial records permitted.",
      ),
      component(
        "stage4-db-replica",
        "REPLICA_DATABASE",
        ["SYNTHETIC_APPLICATION_STATE"],
        "Replica target requires separate physical-location and access evidence.",
      ),
      component(
        "stage4-backups",
        "BACKUP_STORE",
        ["SYNTHETIC_BACKUP_DATA"],
        "Backup copies require location, encryption, retention and restore evidence.",
      ),
      component(
        "stage4-audit",
        "AUDIT_STORE",
        ["REDACTED_SYNTHETIC_AUDIT_EVENTS"],
        "Append/tamper, access, time-integrity and retention evidence required.",
      ),
      component(
        "stage4-observability",
        "LOGGING_MONITORING",
        ["REDACTED_SYNTHETIC_TELEMETRY"],
        "Payload suppression and telemetry/subprocessor path evidence required.",
      ),
      component(
        "stage4-key-custody",
        "KEY_CUSTODY",
        ["KEY_METADATA_ONLY"],
        "No key technology or custody claim is accepted until separately evidenced.",
      ),
      component(
        "stage4-admin-access",
        "ADMIN_ACCESS_PATH",
        ["ADMIN_AUTH_METADATA"],
        "MFA, least privilege, break-glass and administrator jurisdiction evidence required.",
      ),
      component(
        "stage4-support-access",
        "SUPPORT_ACCESS_PATH",
        ["SUPPORT_ACCESS_METADATA"],
        "Vendor/subprocessor support access and jurisdiction must be inventoried and reviewed.",
      ),
      component(
        "stage4-egress",
        "CONTROLLED_EGRESS",
        ["SYNTHETIC_PROVIDER_REQUESTS"],
        "External destinations remain allowlisted and provider activation gates remain independent.",
      ),
    ],
    dataFlows: [
      {
        fromComponentId: "stage4-ingress",
        toComponentId: "stage4-compute",
        purpose: "Authenticated synthetic application request",
        restrictedDataPermitted: false,
      },
      {
        fromComponentId: "stage4-compute",
        toComponentId: "stage4-db-primary",
        purpose: "Synthetic application state persistence",
        restrictedDataPermitted: false,
      },
      {
        fromComponentId: "stage4-db-primary",
        toComponentId: "stage4-db-replica",
        purpose: "Synthetic replica path",
        restrictedDataPermitted: false,
      },
      {
        fromComponentId: "stage4-db-primary",
        toComponentId: "stage4-backups",
        purpose: "Synthetic backup path",
        restrictedDataPermitted: false,
      },
      {
        fromComponentId: "stage4-compute",
        toComponentId: "stage4-audit",
        purpose: "Redacted synthetic audit events",
        restrictedDataPermitted: false,
      },
      {
        fromComponentId: "stage4-compute",
        toComponentId: "stage4-observability",
        purpose: "Redacted synthetic operational telemetry",
        restrictedDataPermitted: false,
      },
      {
        fromComponentId: "stage4-compute",
        toComponentId: "stage4-egress",
        purpose: "Governed sandbox/TestBed provider egress only when separately enabled",
        restrictedDataPermitted: false,
      },
    ],
    topologyEvidenceRefs: [],
  });
