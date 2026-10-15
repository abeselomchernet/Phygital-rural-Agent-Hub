import { z } from "zod";

import { HubIdSchema, HubTenantIdSchema, SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "./hub";
import {
  createHubEvidenceManifest,
  verifyHubEvidenceManifest,
  type HubEvidenceManifest,
} from "./hubEvidenceManifest";
import {
  HubWorkflowAuthorityStateSchema,
  HubWorkflowCorrelationIdSchema,
  HubWorkflowEventIdSchema,
  HubWorkflowEventTypeSchema,
  HubWorkflowLimitationSchema,
  HubWorkflowOutcomeSchema,
  HubWorkflowRunIdSchema,
  HubWorkflowTransportStateSchema,
  createHubWorkflowEnvelope,
  verifyHubWorkflowEnvelope,
  type HubWorkflowEnvelope,
  type HubWorkflowEnvelopeContent,
} from "./hubWorkflowEnvelope";
import {
  PartnerAdapterIdSchema,
  PartnerContractCapabilityIdSchema,
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "./syntheticReferencePartners";

const uniqueSorted = (values: readonly string[]) => [...new Set(values)].sort();
const sameSorted = (left: readonly string[], right: readonly string[]) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

export const HubOperationsViewerRoleSchema = z.enum(["OPERATIONS", "PARTNER_ADMIN"]);
export type HubOperationsViewerRole = z.infer<typeof HubOperationsViewerRoleSchema>;

export const HubOperationsQueueStateSchema = z.enum([
  "CAPTURED",
  "QUEUED",
  "SUBMITTED",
  "PENDING_SYNTHETIC_PROVIDER_EVIDENCE",
  "EVIDENCE_RECEIVED",
  "TRANSPORT_FAILED",
]);
export const HubOperationsRetryStateSchema = z.enum([
  "NO_RETRY_EVIDENCE",
  "RETRY_OBSERVED",
]);
export const HubOperationsConflictStateSchema = z.enum([
  "NO_CONFLICT_EVIDENCE",
  "CONFLICT_REVIEW_REQUIRED",
]);
export const HubOperationsReconciliationStateSchema = z.enum([
  "NOT_REQUIRED",
  "REVIEW_REQUIRED",
]);
export const HubOperationsAttentionStateSchema = z.enum([
  "NONE",
  "DEFERRED",
  "DENIED",
  "UNVERIFIED",
  "PARTNER_REVIEW_REQUIRED",
  "CONFLICT_REVIEW_REQUIRED",
]);

export const HubOperationsActionPlaceholderSchema = z
  .object({
    action: z.enum([
      "REPROCESS_REVIEW_PLACEHOLDER",
      "RECONCILIATION_REVIEW_PLACEHOLDER",
      "CONFLICT_REVIEW_PLACEHOLDER",
      "RESOLUTION_REVIEW_PLACEHOLDER",
    ]),
    mutationEnabled: z.literal(false),
    requiresFutureAuthorization: z.literal(true),
  })
  .strict();
export type HubOperationsActionPlaceholder = z.infer<
  typeof HubOperationsActionPlaceholderSchema
>;

export const HubOperationsTimelineEventSchema = z
  .object({
    eventId: HubWorkflowEventIdSchema,
    eventType: HubWorkflowEventTypeSchema,
    occurredAt: z.string().datetime({ offset: true }),
    transportState: HubWorkflowTransportStateSchema,
    authorityState: HubWorkflowAuthorityStateSchema,
    outcome: HubWorkflowOutcomeSchema,
    detailCode: z.string().min(1).max(96).nullable(),
    serviceId: PartnerServiceIdSchema.nullable(),
    capabilityId: PartnerContractCapabilityIdSchema.nullable(),
    routeId: PartnerRouteIdSchema.nullable(),
    adapterId: PartnerAdapterIdSchema.nullable(),
    limitationCodes: z.array(HubWorkflowLimitationSchema).min(1).max(16),
    evidenceRefs: z.array(PartnerEvidenceRefSchema).max(64),
    contentDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict();
export type HubOperationsTimelineEvent = z.infer<
  typeof HubOperationsTimelineEventSchema
>;

const ManifestProjectionSchema = z
  .object({
    manifestId: z.string().regex(/^manifest_syn_[a-z0-9][a-z0-9_-]*$/),
    manifestDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    completenessStatus: z.enum([
      "DIGEST_SET_COMPLETE",
      "INCOMPLETE_PENDING",
      "INCOMPLETE_UNKNOWN",
    ]),
    runtimeClass: z.enum(["SYNTHETIC_FIXTURE", "STAGING_SYNTHETIC"]),
    fixtureDatasetVersion: z.literal("stage4-hub-fixtures-v1"),
    fixtureGraphDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    externalProviderCallsCount: z.literal(0),
    partnerFiSettlementEvidenceCount: z.literal(0),
    realPiiPresent: z.literal(false),
    realFundsPresent: z.literal(false),
  })
  .strict();

export const HubOperationsTraceProjectionSchema = z
  .object({
    correlationId: HubWorkflowCorrelationIdSchema,
    runId: HubWorkflowRunIdSchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    firstOccurredAt: z.string().datetime({ offset: true }),
    lastOccurredAt: z.string().datetime({ offset: true }),
    eventCount: z.number().int().positive(),
    queueState: HubOperationsQueueStateSchema,
    retryState: HubOperationsRetryStateSchema,
    conflictState: HubOperationsConflictStateSchema,
    reconciliationState: HubOperationsReconciliationStateSchema,
    attentionState: HubOperationsAttentionStateSchema,
    latestTransportState: HubWorkflowTransportStateSchema,
    latestAuthorityState: HubWorkflowAuthorityStateSchema,
    latestOutcome: HubWorkflowOutcomeSchema,
    latestDetailCode: z.string().min(1).max(96).nullable(),
    evidenceRefs: z.array(PartnerEvidenceRefSchema).max(256),
    timeline: z.array(HubOperationsTimelineEventSchema).min(1).max(512),
    evidenceManifest: ManifestProjectionSchema,
    actionPlaceholders: z.array(HubOperationsActionPlaceholderSchema).max(8),
    readBoundary: z
      .object({
        stage: z.literal("STAGE_4"),
        syntheticOnly: z.literal(true),
        readOnly: z.literal(true),
        rawLogsExposed: z.literal(false),
        providerPayloadsExposed: z.literal(false),
        credentialsExposed: z.literal(false),
        mutationAuthorityGranted: z.literal(false),
        settlementAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubOperationsTraceProjection = z.infer<
  typeof HubOperationsTraceProjectionSchema
>;

export const HubOperationsReadScopeSchema = z
  .object({
    role: HubOperationsViewerRoleSchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
  })
  .strict();
export type HubOperationsReadScope = z.infer<typeof HubOperationsReadScopeSchema>;

type InternalTrace = Omit<HubOperationsTraceProjection, "actionPlaceholders">;

export type HubOperationsTraceReadModel = {
  manifest: HubEvidenceManifest;
  traces: readonly InternalTrace[];
};

function queueStateFor(transportState: HubWorkflowEnvelope["transportState"]) {
  switch (transportState) {
    case "CAPTURED_SYNTHETIC":
      return "CAPTURED" as const;
    case "QUEUED_SYNTHETIC":
      return "QUEUED" as const;
    case "SUBMITTED_SYNTHETIC":
      return "SUBMITTED" as const;
    case "PROVIDER_PENDING_SYNTHETIC":
      return "PENDING_SYNTHETIC_PROVIDER_EVIDENCE" as const;
    case "PROVIDER_EVIDENCE_RECEIVED_SYNTHETIC":
      return "EVIDENCE_RECEIVED" as const;
    case "TRANSPORT_FAILED_SYNTHETIC":
      return "TRANSPORT_FAILED" as const;
  }
}

function attentionStateFor(input: {
  latest: HubWorkflowEnvelope;
  conflictState: z.infer<typeof HubOperationsConflictStateSchema>;
}) {
  if (input.conflictState === "CONFLICT_REVIEW_REQUIRED")
    return "CONFLICT_REVIEW_REQUIRED" as const;
  if (input.latest.outcome === "DENIED") return "DENIED" as const;
  if (input.latest.outcome === "DEFERRED") return "DEFERRED" as const;
  if (input.latest.outcome === "UNVERIFIED") return "UNVERIFIED" as const;
  if (input.latest.authorityState === "PARTNER_REVIEW_REQUIRED")
    return "PARTNER_REVIEW_REQUIRED" as const;
  return "NONE" as const;
}

function projectTimelineEvent(envelope: HubWorkflowEnvelope): HubOperationsTimelineEvent {
  return HubOperationsTimelineEventSchema.parse({
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    occurredAt: envelope.occurredAt,
    transportState: envelope.transportState,
    authorityState: envelope.authorityState,
    outcome: envelope.outcome,
    detailCode: envelope.detailCode,
    serviceId: envelope.serviceId,
    capabilityId: envelope.capabilityId,
    routeId: envelope.routeId,
    adapterId: envelope.adapterId,
    limitationCodes: [...envelope.limitationCodes],
    evidenceRefs: [...envelope.evidenceRefs],
    contentDigest: envelope.contentDigest,
  });
}

function manifestProjection(manifest: HubEvidenceManifest) {
  return ManifestProjectionSchema.parse({
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    completenessStatus: manifest.completenessStatus,
    runtimeClass: manifest.classification.runtimeClass,
    fixtureDatasetVersion: manifest.fixtureGraph.fixtureDatasetVersion,
    fixtureGraphDigest: manifest.fixtureGraph.graphDigest,
    externalProviderCallsCount: manifest.nonEvidence.externalProviderCallsCount,
    partnerFiSettlementEvidenceCount:
      manifest.nonEvidence.partnerFiSettlementEvidenceCount,
    realPiiPresent: manifest.nonEvidence.realPiiPresent,
    realFundsPresent: manifest.nonEvidence.realFundsPresent,
  });
}

function buildTrace(
  manifest: HubEvidenceManifest,
  envelopes: readonly HubWorkflowEnvelope[],
): InternalTrace {
  const timeline = [...envelopes].sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId),
  );
  const first = timeline[0];
  const latest = timeline[timeline.length - 1];
  if (!first || !latest) throw new Error("HUB_OPERATIONS_EMPTY_TRACE");

  for (const envelope of timeline) {
    if (
      envelope.runId !== first.runId ||
      envelope.tenantId !== first.tenantId ||
      envelope.hubId !== first.hubId ||
      envelope.partnerOrgId !== first.partnerOrgId
    )
      throw new Error("HUB_OPERATIONS_TRACE_SCOPE_MISMATCH");
  }

  const retryState = timeline.some((event) => event.detailCode === "RETRY_OBSERVED")
    ? ("RETRY_OBSERVED" as const)
    : ("NO_RETRY_EVIDENCE" as const);
  const conflictState = timeline.some(
    (event) => event.detailCode === "CONFLICT_REVIEW_REQUIRED",
  )
    ? ("CONFLICT_REVIEW_REQUIRED" as const)
    : ("NO_CONFLICT_EVIDENCE" as const);
  const reconciliationState =
    conflictState === "CONFLICT_REVIEW_REQUIRED" ||
    timeline.some((event) => event.detailCode === "RECONCILIATION_REQUIRED") ||
    latest.outcome === "UNVERIFIED"
      ? ("REVIEW_REQUIRED" as const)
      : ("NOT_REQUIRED" as const);

  return {
    correlationId: first.correlationId,
    runId: first.runId,
    tenantId: first.tenantId,
    hubId: first.hubId,
    partnerOrgId: first.partnerOrgId,
    firstOccurredAt: first.occurredAt,
    lastOccurredAt: latest.occurredAt,
    eventCount: timeline.length,
    queueState: queueStateFor(latest.transportState),
    retryState,
    conflictState,
    reconciliationState,
    attentionState: attentionStateFor({ latest, conflictState }),
    latestTransportState: latest.transportState,
    latestAuthorityState: latest.authorityState,
    latestOutcome: latest.outcome,
    latestDetailCode: latest.detailCode,
    evidenceRefs: uniqueSorted(timeline.flatMap((event) => event.evidenceRefs)),
    timeline: timeline.map(projectTimelineEvent),
    evidenceManifest: manifestProjection(manifest),
    readBoundary: {
      stage: "STAGE_4",
      syntheticOnly: true,
      readOnly: true,
      rawLogsExposed: false,
      providerPayloadsExposed: false,
      credentialsExposed: false,
      mutationAuthorityGranted: false,
      settlementAuthorityGranted: false,
    },
  };
}

export function createHubOperationsTraceReadModel(input: {
  manifest: unknown;
  workflowEnvelopes: readonly unknown[];
}): HubOperationsTraceReadModel {
  const manifest = verifyHubEvidenceManifest(input.manifest);
  const envelopes = input.workflowEnvelopes.map((entry) =>
    verifyHubWorkflowEnvelope(entry),
  );
  if (envelopes.some((event) => event.runId !== manifest.runId))
    throw new Error("HUB_OPERATIONS_RUN_MISMATCH");
  if (!sameSorted(manifest.workflowSummary.eventContentDigests, envelopes.map((e) => e.contentDigest)))
    throw new Error("HUB_OPERATIONS_MANIFEST_EVENT_DIGEST_MISMATCH");
  if (!sameSorted(manifest.workflowSummary.correlationIds, uniqueSorted(envelopes.map((e) => e.correlationId))))
    throw new Error("HUB_OPERATIONS_MANIFEST_CORRELATION_MISMATCH");

  const byCorrelation = new Map<string, HubWorkflowEnvelope[]>();
  for (const envelope of envelopes) {
    const current = byCorrelation.get(envelope.correlationId) ?? [];
    current.push(envelope);
    byCorrelation.set(envelope.correlationId, current);
  }
  const traces = [...byCorrelation.values()]
    .map((events) => buildTrace(manifest, events))
    .sort((a, b) => a.correlationId.localeCompare(b.correlationId));
  return { manifest, traces };
}

function actionPlaceholdersFor(
  trace: InternalTrace,
  role: HubOperationsViewerRole,
): HubOperationsActionPlaceholder[] {
  const actions: HubOperationsActionPlaceholder[] = [];
  if (trace.queueState === "TRANSPORT_FAILED" || trace.retryState === "RETRY_OBSERVED")
    actions.push({
      action: "REPROCESS_REVIEW_PLACEHOLDER",
      mutationEnabled: false,
      requiresFutureAuthorization: true,
    });
  if (trace.reconciliationState === "REVIEW_REQUIRED")
    actions.push({
      action: "RECONCILIATION_REVIEW_PLACEHOLDER",
      mutationEnabled: false,
      requiresFutureAuthorization: true,
    });
  if (trace.conflictState === "CONFLICT_REVIEW_REQUIRED" && role === "PARTNER_ADMIN") {
    actions.push({
      action: "CONFLICT_REVIEW_PLACEHOLDER",
      mutationEnabled: false,
      requiresFutureAuthorization: true,
    });
    actions.push({
      action: "RESOLUTION_REVIEW_PLACEHOLDER",
      mutationEnabled: false,
      requiresFutureAuthorization: true,
    });
  }
  return actions.map((action) => HubOperationsActionPlaceholderSchema.parse(action));
}

export function projectHubOperationsTrace(
  trace: InternalTrace,
  scopeInput: HubOperationsReadScope,
): HubOperationsTraceProjection | null {
  const scope = HubOperationsReadScopeSchema.parse(scopeInput);
  if (
    trace.tenantId !== scope.tenantId ||
    trace.hubId !== scope.hubId ||
    trace.partnerOrgId !== scope.partnerOrgId
  )
    return null;
  return HubOperationsTraceProjectionSchema.parse({
    ...trace,
    actionPlaceholders: actionPlaceholdersFor(trace, scope.role),
  });
}

export function searchHubOperationsTraces(input: {
  readModel: HubOperationsTraceReadModel;
  scope: HubOperationsReadScope;
  correlationId?: string;
}) {
  const correlationId =
    input.correlationId === undefined
      ? undefined
      : HubWorkflowCorrelationIdSchema.parse(input.correlationId);
  return input.readModel.traces
    .filter((trace) => !correlationId || trace.correlationId === correlationId)
    .map((trace) => projectHubOperationsTrace(trace, input.scope))
    .filter((trace): trace is HubOperationsTraceProjection => trace !== null);
}

const RequiredLimitations: HubWorkflowEnvelopeContent["limitationCodes"] = [
  "SYNTHETIC_ONLY",
  "NO_REAL_PII",
  "NO_REAL_FUNDS",
  "NO_SETTLEMENT_AUTHORITY",
  "NO_PROVIDER_AUTHORITY",
  "NO_DEVICE_CONTROL",
  "NO_PRODUCTION_AUTH",
  "NO_LIVE_PROVIDER_CALL",
];

const SYNTHETIC_E1D_RUN_ID = "run_syn_e1d_operations_001";

function syntheticEnvelope(
  overrides: Partial<HubWorkflowEnvelopeContent> &
    Pick<HubWorkflowEnvelopeContent, "eventId" | "correlationId" | "occurredAt">,
) {
  const base: HubWorkflowEnvelopeContent = {
    schemaVersion: 1,
    eventId: overrides.eventId,
    eventType: "HUB_WORKFLOW_CAPTURED",
    occurredAt: overrides.occurredAt,
    correlationId: overrides.correlationId,
    runId: SYNTHETIC_E1D_RUN_ID,
    idempotencyKey: `idem_syn_${overrides.correlationId.replace(/^corr_syn_/, "")}`,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
    transportState: "CAPTURED_SYNTHETIC",
    authorityState: "NO_AUTHORITY_ASSERTED",
    outcome: "RECORDED",
    limitationCodes: [...RequiredLimitations],
    evidenceRefs: ["EV-SYN-E1D-OPERATIONS-V1"],
    provenance: {
      mode: "SYNTHETIC_STAGE4",
      source: "ENAWUGA_HUB_DOMAIN",
      contractVersion: 1,
      catalogVersion: 1,
      routeVersion: 1,
      adapterVersion: 1,
    },
    detailCode: "CAPTURED_LOCAL_SYNTHETIC",
  };
  return createHubWorkflowEnvelope({ ...base, ...overrides });
}

export const SYNTHETIC_E1D_OPERATION_EVENTS = [
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_alpha_retry_capture",
    correlationId: "corr_syn_e1d_alpha_retry_001",
    occurredAt: "2026-10-15T08:00:00+03:00",
  }),
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_alpha_retry_queue",
    correlationId: "corr_syn_e1d_alpha_retry_001",
    occurredAt: "2026-10-15T08:01:00+03:00",
    eventType: "HUB_WORKFLOW_TRANSPORT_UPDATED",
    transportState: "QUEUED_SYNTHETIC",
    outcome: "DEFERRED",
    detailCode: "RETRY_OBSERVED",
    evidenceRefs: ["EV-SYN-E1D-ALPHA-RETRY-V1"],
  }),
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_alpha_conflict_capture",
    correlationId: "corr_syn_e1d_alpha_conflict_001",
    occurredAt: "2026-10-15T08:05:00+03:00",
  }),
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_alpha_conflict_review",
    correlationId: "corr_syn_e1d_alpha_conflict_001",
    occurredAt: "2026-10-15T08:06:00+03:00",
    eventType: "HUB_WORKFLOW_OUTCOME_RECORDED",
    transportState: "QUEUED_SYNTHETIC",
    authorityState: "PARTNER_REVIEW_REQUIRED",
    outcome: "DEFERRED",
    detailCode: "CONFLICT_REVIEW_REQUIRED",
    evidenceRefs: ["EV-SYN-E1D-ALPHA-CONFLICT-V1"],
  }),
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_alpha_ambiguous_capture",
    correlationId: "corr_syn_e1d_alpha_ambiguous_001",
    occurredAt: "2026-10-15T08:10:00+03:00",
  }),
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_alpha_ambiguous_evidence",
    correlationId: "corr_syn_e1d_alpha_ambiguous_001",
    occurredAt: "2026-10-15T08:11:00+03:00",
    eventType: "HUB_WORKFLOW_EVIDENCE_RECORDED",
    transportState: "PROVIDER_EVIDENCE_RECEIVED_SYNTHETIC",
    authorityState: "PARTNER_AUTH_PENDING_SYNTHETIC",
    outcome: "UNVERIFIED",
    detailCode: "RECONCILIATION_REQUIRED",
    evidenceRefs: ["EV-SYN-E1D-ALPHA-AMBIGUOUS-V1"],
  }),
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_alpha_denied",
    correlationId: "corr_syn_e1d_alpha_denied_001",
    occurredAt: "2026-10-15T08:13:00+03:00",
    eventType: "HUB_WORKFLOW_OUTCOME_RECORDED",
    outcome: "DENIED",
    detailCode: "POLICY_DENIED_SYNTHETIC",
    evidenceRefs: ["EV-SYN-E1D-ALPHA-DENIED-V1"],
  }),
  syntheticEnvelope({
    eventId: "hubevt_syn_e1d_beta_capture",
    correlationId: "corr_syn_e1d_beta_001",
    occurredAt: "2026-10-15T08:15:00+03:00",
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
    capabilityId: "FIN.SAVINGS_INQUIRY",
    routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
    detailCode: "CAPTURED_LOCAL_SYNTHETIC",
    evidenceRefs: ["EV-SYN-E1D-BETA-V1"],
  }),
] as const satisfies readonly HubWorkflowEnvelope[];

export const SYNTHETIC_E1D_EVIDENCE_MANIFEST = createHubEvidenceManifest({
  manifestId: "manifest_syn_e1d_operations_v1",
  generatedAt: "2026-10-15T08:20:00+03:00",
  runId: SYNTHETIC_E1D_RUN_ID,
  runtimeClass: "SYNTHETIC_FIXTURE",
  workflowEnvelopes: SYNTHETIC_E1D_OPERATION_EVENTS,
});

export const SYNTHETIC_E1D_OPERATIONS_READ_MODEL = createHubOperationsTraceReadModel({
  manifest: SYNTHETIC_E1D_EVIDENCE_MANIFEST,
  workflowEnvelopes: SYNTHETIC_E1D_OPERATION_EVENTS,
});
