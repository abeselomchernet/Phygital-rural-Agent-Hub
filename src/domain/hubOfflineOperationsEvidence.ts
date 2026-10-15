import { z } from "zod";

import { computeCanonicalSha256 } from "./evidenceIntegrity";
import {
  HubAccessContextSchema,
  HubIdSchema,
  HubTenantIdSchema,
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  type HubAccessContext,
} from "./hub";
import {
  HubWorkflowIntentCertificationStore,
  HubWorkflowIntentDecisionCodeSchema,
  HubWorkflowIntentRequestSchema,
  computeHubWorkflowBusinessIntentDigest,
  type HubWorkflowIntentDecisionCode,
  type HubWorkflowIntentRequest,
} from "./hubWorkflowIdempotencyCertification";
import {
  HubWorkflowCorrelationIdSchema,
  HubWorkflowRunIdSchema,
} from "./hubWorkflowEnvelope";
import {
  PartnerContractCapabilityIdSchema,
  PartnerOrgIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_OBJECT_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "./syntheticReferencePartners";

const IsoTimestampSchema = z.string().datetime({ offset: true });
const DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const HubOfflineQueueAgeStateSchema = z.enum([
  "FRESH",
  "AGING",
  "STALE",
]);
export type HubOfflineQueueAgeState = z.infer<typeof HubOfflineQueueAgeStateSchema>;

export const HubOfflineTransportStateSchema = z.enum([
  "CAPTURED_OFFLINE",
  "QUEUED",
  "TRANSPORT_ATTEMPTED",
  "RECEIVED",
]);
export type HubOfflineTransportState = z.infer<
  typeof HubOfflineTransportStateSchema
>;

export const HubOfflineAuthorityStateSchema = z.enum([
  "UNTRUSTED_INTENT",
  "AUTHORIZATION_PENDING",
  "SYNTHETIC_AUTHORIZED",
  "DUPLICATE_NOOP",
  "REJECTED",
  "RECONCILIATION_REQUIRED",
]);
export type HubOfflineAuthorityState = z.infer<
  typeof HubOfflineAuthorityStateSchema
>;

export const HubOfflineOutcomeCodeSchema = z.enum([
  "QUEUED_UNTRUSTED",
  "AUTHORIZED_SYNTHETIC",
  "DUPLICATE_NOOP",
  "CONFLICT_REVIEW_REQUIRED",
  "STALE_INTENT_REJECTED",
  "REPLAY_AUTHORIZATION_DENIED",
  "ASSIGNMENT_CHANGED_REVIEW_REQUIRED",
  "ROUTE_CHANGE_REVIEW_REQUIRED",
  "ROUTE_FALLBACK_REJECTED",
  "RECONCILIATION_REQUIRED",
  "CAPTURE_AUTHORIZATION_DENIED",
  "NO_RESERVATION",
]);
export type HubOfflineOutcomeCode = z.infer<typeof HubOfflineOutcomeCodeSchema>;

export const HubOfflineTimelineStageSchema = z.enum([
  "CAPTURED_OFFLINE",
  "QUEUED",
  "TRANSPORT_ATTEMPTED",
  "RECEIVED",
  "AUTHORIZATION_PENDING",
  "AUTHORIZED",
  "DUPLICATE_NOOP",
  "REJECTED",
  "RECONCILIATION_REQUIRED",
]);
export type HubOfflineTimelineStage = z.infer<
  typeof HubOfflineTimelineStageSchema
>;

export const HubOfflineLocalReceiptSchema = z
  .object({
    receiptId: z.string().regex(/^offline_local_receipt_syn_[a-z0-9_]+$/),
    recordedAt: IsoTimestampSchema,
    clientRecordedDigest: DigestSchema,
    trustedForAuthority: z.literal(false),
    provesRemoteReceipt: z.literal(false),
    provesPartnerPosting: z.literal(false),
  })
  .strict();

export const HubOfflineRemoteReceiptSchema = z
  .object({
    receiptId: z.string().regex(/^offline_remote_receipt_syn_[a-z0-9_]+$/),
    receivedAt: IsoTimestampSchema,
    receiptDigest: DigestSchema,
    transportAccepted: z.literal(true),
    financialAuthorityGranted: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
    liveProviderReceipt: z.literal(false),
  })
  .strict();

export const HubOfflineQueueRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    queueRecordId: z.string().regex(/^offlineq_syn_[a-z0-9_]+$/),
    request: HubWorkflowIntentRequestSchema,
    queuedAt: IsoTimestampSchema,
    lastTransportAttemptAt: IsoTimestampSchema.nullable(),
    retryCount: z.number().int().nonnegative().max(100),
    localReceipt: HubOfflineLocalReceiptSchema,
    untrustedIntent: z.literal(true),
    clientAuthorityGranted: z.literal(false),
    remoteSyncEnabled: z.literal(false),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (Date.parse(record.queuedAt) < Date.parse(record.request.capturedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["queuedAt"],
        message: "queue time must not precede capture time",
      });
    }
    if (
      record.lastTransportAttemptAt &&
      Date.parse(record.lastTransportAttemptAt) < Date.parse(record.queuedAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastTransportAttemptAt"],
        message: "transport attempt must not precede queue time",
      });
    }
  });
export type HubOfflineQueueRecord = z.infer<typeof HubOfflineQueueRecordSchema>;

export const HubOfflineTimelineEventSchema = z
  .object({
    sequence: z.number().int().positive(),
    occurredAt: IsoTimestampSchema,
    stage: HubOfflineTimelineStageSchema,
    detailCode: z.string().min(1).max(96),
    transportState: HubOfflineTransportStateSchema,
    authorityState: HubOfflineAuthorityStateSchema,
    evidenceRefs: z.array(z.string().min(1).max(160)).max(16),
  })
  .strict();
export type HubOfflineTimelineEvent = z.infer<
  typeof HubOfflineTimelineEventSchema
>;

export const HubOfflineIdempotencyEvidenceSchema = z
  .object({
    serverBusinessIntentDigest: DigestSchema.nullable(),
    certificationDecision: HubWorkflowIntentDecisionCodeSchema.nullable(),
    reservationId: z.string().min(1).max(120).nullable(),
    originalCorrelationId: HubWorkflowCorrelationIdSchema.nullable(),
    duplicateNoop: z.boolean(),
    conflictReviewRequired: z.boolean(),
    rawIdempotencyKeyExposed: z.literal(false),
    eventContentDigestUsedAsBusinessIntent: z.literal(false),
  })
  .strict();

export const HubOfflineProcessingEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    evidenceId: z.string().regex(/^offlineev_syn_[a-f0-9]{16}$/),
    evidenceDigest: DigestSchema,
    queueRecordId: HubOfflineQueueRecordSchema.shape.queueRecordId,
    correlationId: HubWorkflowCorrelationIdSchema,
    runId: HubWorkflowRunIdSchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    capturedAt: IsoTimestampSchema,
    queuedAt: IsoTimestampSchema,
    evaluatedAt: IsoTimestampSchema,
    queueAgeMinutes: z.number().int().nonnegative(),
    queueAgeState: HubOfflineQueueAgeStateSchema,
    retryCount: z.number().int().nonnegative(),
    transportState: HubOfflineTransportStateSchema,
    authorityState: HubOfflineAuthorityStateSchema,
    outcome: HubOfflineOutcomeCodeSchema,
    localReceipt: HubOfflineLocalReceiptSchema,
    remoteReceipt: HubOfflineRemoteReceiptSchema.nullable(),
    idempotencyEvidence: HubOfflineIdempotencyEvidenceSchema,
    timeline: z.array(HubOfflineTimelineEventSchema).min(2).max(12),
    boundaries: z
      .object({
        stage: z.literal("STAGE_4"),
        syntheticOnly: z.literal(true),
        clientQueueTrustedAsAuthority: z.literal(false),
        replayReauthorizationRequired: z.literal(true),
        remoteReceiptImpliesFinancialAuthority: z.literal(false),
        transportSuccessImpliesSettlement: z.literal(false),
        liveNetworkAllowed: z.literal(false),
        externalProviderCalls: z.literal(0),
        cashMovementAuthorized: z.literal(false),
        partnerFiPostingAuthorized: z.literal(false),
        settlementAuthorityGranted: z.literal(false),
        assumedSuccess: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubOfflineProcessingEvidence = z.infer<
  typeof HubOfflineProcessingEvidenceSchema
>;

export function verifyHubOfflineProcessingEvidence(
  input: unknown,
): HubOfflineProcessingEvidence {
  const evidence = HubOfflineProcessingEvidenceSchema.parse(input);
  const { evidenceId, evidenceDigest, ...core } = evidence;
  const expectedDigest = computeCanonicalSha256(core);
  const expectedEvidenceId = `offlineev_syn_${expectedDigest.slice(7, 23)}`;
  if (evidenceDigest !== expectedDigest || evidenceId !== expectedEvidenceId) {
    throw new Error("HUB_OFFLINE_EVIDENCE_DIGEST_MISMATCH");
  }
  return evidence;
}

export const HubOfflineEvidenceViewerRoleSchema = z.enum([
  "OPERATIONS",
  "PARTNER_ADMIN",
]);
export type HubOfflineEvidenceViewerRole = z.infer<
  typeof HubOfflineEvidenceViewerRoleSchema
>;

export const HubOfflineEvidenceScopeSchema = z
  .object({
    role: HubOfflineEvidenceViewerRoleSchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
  })
  .strict();
export type HubOfflineEvidenceScope = z.infer<typeof HubOfflineEvidenceScopeSchema>;

export const HubOfflineEvidenceRecordProjectionSchema = z
  .object({
    evidenceId: HubOfflineProcessingEvidenceSchema.shape.evidenceId,
    queueRecordId: HubOfflineQueueRecordSchema.shape.queueRecordId,
    runId: HubWorkflowRunIdSchema,
    capturedAt: IsoTimestampSchema,
    queuedAt: IsoTimestampSchema,
    evaluatedAt: IsoTimestampSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    queueAgeMinutes: z.number().int().nonnegative(),
    queueAgeState: HubOfflineQueueAgeStateSchema,
    retryCount: z.number().int().nonnegative(),
    transportState: HubOfflineTransportStateSchema,
    authorityState: HubOfflineAuthorityStateSchema,
    outcome: HubOfflineOutcomeCodeSchema,
    localReceipt: HubOfflineLocalReceiptSchema,
    remoteReceipt: HubOfflineRemoteReceiptSchema.nullable(),
    idempotencyEvidence: HubOfflineIdempotencyEvidenceSchema,
    evidenceDigest: DigestSchema,
  })
  .strict();

export const HubOfflineEvidenceTraceSchema = z
  .object({
    correlationId: HubWorkflowCorrelationIdSchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    firstCapturedAt: IsoTimestampSchema,
    lastEvaluatedAt: IsoTimestampSchema,
    queueRecordCount: z.number().int().positive(),
    totalRetryCount: z.number().int().nonnegative(),
    maxQueueAgeMinutes: z.number().int().nonnegative(),
    latestTransportState: HubOfflineTransportStateSchema,
    latestAuthorityState: HubOfflineAuthorityStateSchema,
    latestOutcome: HubOfflineOutcomeCodeSchema,
    duplicateNoopObserved: z.boolean(),
    conflictObserved: z.boolean(),
    reconciliationRequired: z.boolean(),
    records: z.array(HubOfflineEvidenceRecordProjectionSchema).min(1).max(64),
    timeline: z.array(HubOfflineTimelineEventSchema).min(2).max(256),
    readBoundary: z
      .object({
        readOnly: z.literal(true),
        syntheticOnly: z.literal(true),
        rawIntentFactsExposed: z.literal(false),
        rawIdempotencyKeyExposed: z.literal(false),
        credentialsExposed: z.literal(false),
        providerPayloadsExposed: z.literal(false),
        mutationAuthorityGranted: z.literal(false),
        settlementAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubOfflineEvidenceTrace = z.infer<typeof HubOfflineEvidenceTraceSchema>;

function ageMinutes(from: string, to: string) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    throw new Error("HUB_OFFLINE_EVIDENCE_INVALID_TIME_RANGE");
  return Math.floor((end - start) / 60_000);
}

function queueAgeState(minutes: number): HubOfflineQueueAgeState {
  if (minutes <= 15) return "FRESH";
  if (minutes <= 60) return "AGING";
  return "STALE";
}

function addTimeline(
  timeline: HubOfflineTimelineEvent[],
  input: Omit<HubOfflineTimelineEvent, "sequence">,
) {
  timeline.push(
    HubOfflineTimelineEventSchema.parse({
      ...input,
      sequence: timeline.length + 1,
    }),
  );
}

function decisionOutcome(
  decision: HubWorkflowIntentDecisionCode,
): HubOfflineOutcomeCode {
  if (decision === "DUPLICATE_NOOP") return "DUPLICATE_NOOP";
  if (decision === "CONFLICT_REVIEW_REQUIRED") return "CONFLICT_REVIEW_REQUIRED";
  if (decision === "STALE_INTENT_REJECTED") return "STALE_INTENT_REJECTED";
  if (decision === "REPLAY_AUTHORIZATION_DENIED") return "REPLAY_AUTHORIZATION_DENIED";
  if (decision === "ASSIGNMENT_CHANGED_REVIEW_REQUIRED")
    return "ASSIGNMENT_CHANGED_REVIEW_REQUIRED";
  if (decision === "ROUTE_CHANGE_REVIEW_REQUIRED")
    return "ROUTE_CHANGE_REVIEW_REQUIRED";
  if (decision === "ROUTE_FALLBACK_REJECTED") return "ROUTE_FALLBACK_REJECTED";
  if (decision === "RECONCILIATION_REQUIRED") return "RECONCILIATION_REQUIRED";
  if (decision === "NO_RESERVATION") return "NO_RESERVATION";
  return "AUTHORIZED_SYNTHETIC";
}

function authorityForOutcome(outcome: HubOfflineOutcomeCode): HubOfflineAuthorityState {
  if (outcome === "AUTHORIZED_SYNTHETIC") return "SYNTHETIC_AUTHORIZED";
  if (outcome === "DUPLICATE_NOOP") return "DUPLICATE_NOOP";
  if (outcome === "RECONCILIATION_REQUIRED") return "RECONCILIATION_REQUIRED";
  if (outcome === "QUEUED_UNTRUSTED") return "UNTRUSTED_INTENT";
  return "REJECTED";
}

function terminalStage(
  authority: HubOfflineAuthorityState,
): HubOfflineTimelineStage {
  if (authority === "SYNTHETIC_AUTHORIZED") return "AUTHORIZED";
  if (authority === "DUPLICATE_NOOP") return "DUPLICATE_NOOP";
  if (authority === "RECONCILIATION_REQUIRED") return "RECONCILIATION_REQUIRED";
  return "REJECTED";
}

function evidenceCore(input: {
  record: HubOfflineQueueRecord;
  evaluatedAt: string;
  queueAgeMinutes: number;
  transportState: HubOfflineTransportState;
  authorityState: HubOfflineAuthorityState;
  outcome: HubOfflineOutcomeCode;
  remoteReceipt: z.infer<typeof HubOfflineRemoteReceiptSchema> | null;
  certificationDecision: HubWorkflowIntentDecisionCode | null;
  reservationId: string | null;
  originalCorrelationId: string | null;
  timeline: HubOfflineTimelineEvent[];
}) {
  return {
    schemaVersion: 1 as const,
    queueRecordId: input.record.queueRecordId,
    correlationId: input.record.request.correlationId,
    runId: input.record.request.runId,
    tenantId: input.record.request.tenantId,
    hubId: input.record.request.hubId,
    partnerOrgId: input.record.request.partnerOrgId,
    serviceId: input.record.request.serviceId,
    capabilityId: input.record.request.capabilityId,
    capturedAt: input.record.request.capturedAt,
    queuedAt: input.record.queuedAt,
    evaluatedAt: input.evaluatedAt,
    queueAgeMinutes: input.queueAgeMinutes,
    queueAgeState: queueAgeState(input.queueAgeMinutes),
    retryCount: input.record.retryCount,
    transportState: input.transportState,
    authorityState: input.authorityState,
    outcome: input.outcome,
    localReceipt: input.record.localReceipt,
    remoteReceipt: input.remoteReceipt,
    idempotencyEvidence: {
      serverBusinessIntentDigest:
        input.certificationDecision === null
          ? null
          : computeHubWorkflowBusinessIntentDigest(input.record.request),
      certificationDecision: input.certificationDecision,
      reservationId: input.reservationId,
      originalCorrelationId: input.originalCorrelationId,
      duplicateNoop: input.outcome === "DUPLICATE_NOOP",
      conflictReviewRequired: input.outcome === "CONFLICT_REVIEW_REQUIRED",
      rawIdempotencyKeyExposed: false as const,
      eventContentDigestUsedAsBusinessIntent: false as const,
    },
    timeline: input.timeline,
    boundaries: {
      stage: "STAGE_4" as const,
      syntheticOnly: true as const,
      clientQueueTrustedAsAuthority: false as const,
      replayReauthorizationRequired: true as const,
      remoteReceiptImpliesFinancialAuthority: false as const,
      transportSuccessImpliesSettlement: false as const,
      liveNetworkAllowed: false as const,
      externalProviderCalls: 0 as const,
      cashMovementAuthorized: false as const,
      partnerFiPostingAuthorized: false as const,
      settlementAuthorityGranted: false as const,
      assumedSuccess: false as const,
    },
  };
}

export function createOfflineQueueRecord(input: {
  queueRecordId: string;
  request: HubWorkflowIntentRequest;
  queuedAt: string;
  lastTransportAttemptAt?: string | null;
  retryCount?: number;
}): HubOfflineQueueRecord {
  const request = HubWorkflowIntentRequestSchema.parse(input.request);
  const queuedAt = IsoTimestampSchema.parse(input.queuedAt);
  const lastTransportAttemptAt = input.lastTransportAttemptAt
    ? IsoTimestampSchema.parse(input.lastTransportAttemptAt)
    : null;
  const queueRecordId = HubOfflineQueueRecordSchema.shape.queueRecordId.parse(
    input.queueRecordId,
  );
  const localReceiptDigest = computeCanonicalSha256({
    queueRecordId,
    request,
    queuedAt,
  });
  return HubOfflineQueueRecordSchema.parse({
    schemaVersion: 1,
    queueRecordId,
    request,
    queuedAt,
    lastTransportAttemptAt,
    retryCount: input.retryCount ?? 0,
    localReceipt: {
      receiptId: `offline_local_receipt_syn_${queueRecordId.replace("offlineq_syn_", "")}`,
      recordedAt: queuedAt,
      clientRecordedDigest: localReceiptDigest,
      trustedForAuthority: false,
      provesRemoteReceipt: false,
      provesPartnerPosting: false,
    },
    untrustedIntent: true,
    clientAuthorityGranted: false,
    remoteSyncEnabled: false,
  });
}

export function evaluateOfflineQueueRecord(input: {
  record: HubOfflineQueueRecord;
  store: HubWorkflowIntentCertificationStore;
  captureContext: HubAccessContext;
  replayContext: HubAccessContext;
  evaluatedAt: string;
  receivedAt?: string | null;
  simulateAmbiguousExternalOutcome?: boolean;
}): HubOfflineProcessingEvidence {
  const record = HubOfflineQueueRecordSchema.parse(input.record);
  const captureContext = HubAccessContextSchema.parse(input.captureContext);
  const replayContext = HubAccessContextSchema.parse(input.replayContext);
  const evaluatedAt = IsoTimestampSchema.parse(input.evaluatedAt);
  const queueAgeMinutes = ageMinutes(record.queuedAt, evaluatedAt);
  const timeline: HubOfflineTimelineEvent[] = [];
  addTimeline(timeline, {
    occurredAt: record.request.capturedAt,
    stage: "CAPTURED_OFFLINE",
    detailCode: "CLIENT_CAPTURE_UNTRUSTED_INTENT",
    transportState: "CAPTURED_OFFLINE",
    authorityState: "UNTRUSTED_INTENT",
    evidenceRefs: [record.localReceipt.receiptId],
  });
  addTimeline(timeline, {
    occurredAt: record.queuedAt,
    stage: "QUEUED",
    detailCode: "LOCAL_QUEUE_RECORDED",
    transportState: "QUEUED",
    authorityState: "UNTRUSTED_INTENT",
    evidenceRefs: [record.localReceipt.receiptId],
  });

  let transportState: HubOfflineTransportState = "QUEUED";
  if (record.lastTransportAttemptAt) {
    transportState = "TRANSPORT_ATTEMPTED";
    addTimeline(timeline, {
      occurredAt: record.lastTransportAttemptAt,
      stage: "TRANSPORT_ATTEMPTED",
      detailCode: `SYNTHETIC_TRANSPORT_ATTEMPT_${record.retryCount + 1}`,
      transportState,
      authorityState: "UNTRUSTED_INTENT",
      evidenceRefs: [record.localReceipt.receiptId],
    });
  }

  if (!input.receivedAt) {
    const core = evidenceCore({
      record,
      evaluatedAt,
      queueAgeMinutes,
      transportState,
      authorityState: "UNTRUSTED_INTENT",
      outcome: "QUEUED_UNTRUSTED",
      remoteReceipt: null,
      certificationDecision: null,
      reservationId: null,
      originalCorrelationId: null,
      timeline,
    });
    const evidenceDigest = computeCanonicalSha256(core);
    return HubOfflineProcessingEvidenceSchema.parse({
      ...core,
      evidenceId: `offlineev_syn_${evidenceDigest.slice(7, 23)}`,
      evidenceDigest,
    });
  }

  const receivedAt = IsoTimestampSchema.parse(input.receivedAt);
  if (Date.parse(receivedAt) < Date.parse(record.queuedAt) || Date.parse(receivedAt) > Date.parse(evaluatedAt))
    throw new Error("HUB_OFFLINE_EVIDENCE_INVALID_RECEIPT_TIME");
  const remoteReceiptDigest = computeCanonicalSha256({
    queueRecordId: record.queueRecordId,
    correlationId: record.request.correlationId,
    receivedAt,
    receiptMeaning: "SYNTHETIC_TRANSPORT_RECEIPT_ONLY",
  });
  const remoteReceipt = HubOfflineRemoteReceiptSchema.parse({
    receiptId: `offline_remote_receipt_syn_${record.queueRecordId.replace("offlineq_syn_", "")}`,
    receivedAt,
    receiptDigest: remoteReceiptDigest,
    transportAccepted: true,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
    liveProviderReceipt: false,
  });
  transportState = "RECEIVED";
  addTimeline(timeline, {
    occurredAt: receivedAt,
    stage: "RECEIVED",
    detailCode: "SYNTHETIC_SERVER_RECEIPT_RECORDED",
    transportState,
    authorityState: "UNTRUSTED_INTENT",
    evidenceRefs: [remoteReceipt.receiptId],
  });
  addTimeline(timeline, {
    occurredAt: receivedAt,
    stage: "AUTHORIZATION_PENDING",
    detailCode: "CURRENT_SERVER_REAUTHORIZATION_REQUIRED",
    transportState,
    authorityState: "AUTHORIZATION_PENDING",
    evidenceRefs: [remoteReceipt.receiptId],
  });

  let reserveDecision;
  try {
    reserveDecision = input.store.reserve(record.request, captureContext);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "HUB_WORKFLOW_INTENT_AUTHORIZATION_DENIED"
    ) {
      addTimeline(timeline, {
        occurredAt: evaluatedAt,
        stage: "REJECTED",
        detailCode: "CAPTURE_AUTHORIZATION_DENIED",
        transportState,
        authorityState: "REJECTED",
        evidenceRefs: [remoteReceipt.receiptId],
      });
      const core = evidenceCore({
        record,
        evaluatedAt,
        queueAgeMinutes,
        transportState,
        authorityState: "REJECTED",
        outcome: "CAPTURE_AUTHORIZATION_DENIED",
        remoteReceipt,
        certificationDecision: null,
        reservationId: null,
        originalCorrelationId: null,
        timeline,
      });
      const evidenceDigest = computeCanonicalSha256(core);
      return HubOfflineProcessingEvidenceSchema.parse({
        ...core,
        evidenceId: `offlineev_syn_${evidenceDigest.slice(7, 23)}`,
        evidenceDigest,
      });
    }
    throw error;
  }

  if (reserveDecision.decision === "CONFLICT_REVIEW_REQUIRED") {
    const authorityState = "REJECTED" as const;
    const outcome = "CONFLICT_REVIEW_REQUIRED" as const;
    addTimeline(timeline, {
      occurredAt: evaluatedAt,
      stage: "REJECTED",
      detailCode: outcome,
      transportState,
      authorityState,
      evidenceRefs: [remoteReceipt.receiptId],
    });
    const core = evidenceCore({
      record,
      evaluatedAt,
      queueAgeMinutes,
      transportState,
      authorityState,
      outcome,
      remoteReceipt,
      certificationDecision: reserveDecision.decision,
      reservationId: reserveDecision.reservation?.reservationId ?? null,
      originalCorrelationId: reserveDecision.reservation?.correlationId ?? null,
      timeline,
    });
    const evidenceDigest = computeCanonicalSha256(core);
    return HubOfflineProcessingEvidenceSchema.parse({
      ...core,
      evidenceId: `offlineev_syn_${evidenceDigest.slice(7, 23)}`,
      evidenceDigest,
    });
  }

  if (reserveDecision.decision === "DUPLICATE_NOOP") {
    const authorityState = "DUPLICATE_NOOP" as const;
    const outcome = "DUPLICATE_NOOP" as const;
    addTimeline(timeline, {
      occurredAt: evaluatedAt,
      stage: "DUPLICATE_NOOP",
      detailCode: "IDENTICAL_RETRY_NO_NEW_WORKFLOW",
      transportState,
      authorityState,
      evidenceRefs: [remoteReceipt.receiptId],
    });
    const core = evidenceCore({
      record,
      evaluatedAt,
      queueAgeMinutes,
      transportState,
      authorityState,
      outcome,
      remoteReceipt,
      certificationDecision: reserveDecision.decision,
      reservationId: reserveDecision.reservation?.reservationId ?? null,
      originalCorrelationId: reserveDecision.reservation?.correlationId ?? null,
      timeline,
    });
    const evidenceDigest = computeCanonicalSha256(core);
    return HubOfflineProcessingEvidenceSchema.parse({
      ...core,
      evidenceId: `offlineev_syn_${evidenceDigest.slice(7, 23)}`,
      evidenceDigest,
    });
  }

  let replayDecision = input.store.certifyReplay({
    request: record.request,
    context: replayContext,
    evaluatedAt,
  });

  if (
    replayDecision.decision === "SYNTHETIC_DISPATCH_ELIGIBLE" &&
    input.simulateAmbiguousExternalOutcome
  ) {
    input.store.markPossibleExternalMutation({
      request: record.request,
      context: replayContext,
      markedAt: receivedAt,
    });
    input.store.recordAmbiguousExternalOutcome({
      request: record.request,
      recordedAt: evaluatedAt,
    });
    replayDecision = input.store.certifyReplay({
      request: record.request,
      context: replayContext,
      evaluatedAt,
    });
  }

  const outcome = decisionOutcome(replayDecision.decision);
  const authorityState = authorityForOutcome(outcome);
  addTimeline(timeline, {
    occurredAt: evaluatedAt,
    stage: terminalStage(authorityState),
    detailCode:
      outcome === "AUTHORIZED_SYNTHETIC"
        ? "CURRENT_SERVER_REAUTHORIZATION_PASSED_SYNTHETIC_ONLY"
        : outcome,
    transportState,
    authorityState,
    evidenceRefs: [remoteReceipt.receiptId],
  });
  const core = evidenceCore({
    record,
    evaluatedAt,
    queueAgeMinutes,
    transportState,
    authorityState,
    outcome,
    remoteReceipt,
    certificationDecision: replayDecision.decision,
    reservationId: replayDecision.reservation?.reservationId ?? null,
    originalCorrelationId: replayDecision.reservation?.correlationId ?? null,
    timeline,
  });
  const evidenceDigest = computeCanonicalSha256(core);
  return HubOfflineProcessingEvidenceSchema.parse({
    ...core,
    evidenceId: `offlineev_syn_${evidenceDigest.slice(7, 23)}`,
    evidenceDigest,
  });
}

function projectRecord(
  evidence: HubOfflineProcessingEvidence,
): z.infer<typeof HubOfflineEvidenceRecordProjectionSchema> {
  return HubOfflineEvidenceRecordProjectionSchema.parse({
    evidenceId: evidence.evidenceId,
    queueRecordId: evidence.queueRecordId,
    runId: evidence.runId,
    capturedAt: evidence.capturedAt,
    queuedAt: evidence.queuedAt,
    evaluatedAt: evidence.evaluatedAt,
    serviceId: evidence.serviceId,
    capabilityId: evidence.capabilityId,
    queueAgeMinutes: evidence.queueAgeMinutes,
    queueAgeState: evidence.queueAgeState,
    retryCount: evidence.retryCount,
    transportState: evidence.transportState,
    authorityState: evidence.authorityState,
    outcome: evidence.outcome,
    localReceipt: evidence.localReceipt,
    remoteReceipt: evidence.remoteReceipt,
    idempotencyEvidence: evidence.idempotencyEvidence,
    evidenceDigest: evidence.evidenceDigest,
  });
}

export function createHubOfflineEvidenceReadModel(
  evidenceInput: readonly unknown[],
): readonly HubOfflineEvidenceTrace[] {
  const evidence = evidenceInput.map((entry) =>
    verifyHubOfflineProcessingEvidence(entry),
  );
  const ids = evidence.map((entry) => entry.evidenceId);
  if (new Set(ids).size !== ids.length)
    throw new Error("HUB_OFFLINE_EVIDENCE_DUPLICATE_EVIDENCE_ID");

  const byCorrelation = new Map<string, HubOfflineProcessingEvidence[]>();
  for (const entry of evidence) {
    const bucket = byCorrelation.get(entry.correlationId) ?? [];
    bucket.push(entry);
    byCorrelation.set(entry.correlationId, bucket);
  }

  return [...byCorrelation.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([correlationId, entries]) => {
      const sorted = [...entries].sort(
        (left, right) =>
          Date.parse(left.evaluatedAt) - Date.parse(right.evaluatedAt) ||
          left.evidenceId.localeCompare(right.evidenceId),
      );
      const scopeKeys = new Set(
        sorted.map(
          (entry) => `${entry.tenantId}|${entry.hubId}|${entry.partnerOrgId}`,
        ),
      );
      if (scopeKeys.size !== 1)
        throw new Error("HUB_OFFLINE_EVIDENCE_SCOPE_MISMATCH");
      const latest = sorted[sorted.length - 1];
      const timeline = sorted
        .flatMap((entry) => entry.timeline)
        .sort(
          (left, right) =>
            Date.parse(left.occurredAt) - Date.parse(right.occurredAt) ||
            left.sequence - right.sequence ||
            left.detailCode.localeCompare(right.detailCode),
        )
        .map((event, index) => ({ ...event, sequence: index + 1 }));
      return HubOfflineEvidenceTraceSchema.parse({
        correlationId,
        tenantId: latest.tenantId,
        hubId: latest.hubId,
        partnerOrgId: latest.partnerOrgId,
        firstCapturedAt: [...sorted]
          .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))[0]
          .capturedAt,
        lastEvaluatedAt: latest.evaluatedAt,
        queueRecordCount: sorted.length,
        totalRetryCount: sorted.reduce((sum, entry) => sum + entry.retryCount, 0),
        maxQueueAgeMinutes: Math.max(...sorted.map((entry) => entry.queueAgeMinutes)),
        latestTransportState: latest.transportState,
        latestAuthorityState: latest.authorityState,
        latestOutcome: latest.outcome,
        duplicateNoopObserved: sorted.some(
          (entry) => entry.outcome === "DUPLICATE_NOOP",
        ),
        conflictObserved: sorted.some(
          (entry) => entry.outcome === "CONFLICT_REVIEW_REQUIRED",
        ),
        reconciliationRequired: sorted.some(
          (entry) => entry.outcome === "RECONCILIATION_REQUIRED",
        ),
        records: sorted.map(projectRecord),
        timeline,
        readBoundary: {
          readOnly: true,
          syntheticOnly: true,
          rawIntentFactsExposed: false,
          rawIdempotencyKeyExposed: false,
          credentialsExposed: false,
          providerPayloadsExposed: false,
          mutationAuthorityGranted: false,
          settlementAuthorityGranted: false,
        },
      });
    });
}

export function searchHubOfflineEvidence(input: {
  readModel: readonly HubOfflineEvidenceTrace[];
  scope: HubOfflineEvidenceScope;
  correlationId?: string;
}) {
  const scope = HubOfflineEvidenceScopeSchema.parse(input.scope);
  const correlationId = input.correlationId
    ? HubWorkflowCorrelationIdSchema.parse(input.correlationId)
    : null;
  return input.readModel.filter(
    (trace) =>
      trace.tenantId === scope.tenantId &&
      trace.hubId === scope.hubId &&
      trace.partnerOrgId === scope.partnerOrgId &&
      (!correlationId || trace.correlationId === correlationId),
  );
}

function alphaAgentContext(): HubAccessContext {
  return HubAccessContextSchema.parse({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: "AGENT",
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    assignedHubIds: [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  });
}

function betaAgentContext(): HubAccessContext {
  return HubAccessContextSchema.parse({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: "AGENT",
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
    assignedHubIds: [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  });
}

function alphaRequest(input: {
  correlationId: string;
  runId?: string;
  idempotencyKey: string;
  capturedAt: string;
  expiresAt: string;
  amountMinor?: number;
  variant?: string;
}): HubWorkflowIntentRequest {
  return HubWorkflowIntentRequestSchema.parse({
    schemaVersion: 1,
    capturedAt: input.capturedAt,
    expiresAt: input.expiresAt,
    correlationId: input.correlationId,
    runId: input.runId ?? "run_syn_e4_offline_001",
    idempotencyKey: input.idempotencyKey,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
    purpose: "HUB_OPERATE",
    facts: {
      intentClass: "SYNTHETIC_FINANCIAL_INTENT",
      objectRef: SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER,
      amountMinor: input.amountMinor ?? 1250,
      currency: "ETB",
      variant: input.variant ?? "BASELINE",
    },
  });
}

function betaRequest(): HubWorkflowIntentRequest {
  return HubWorkflowIntentRequestSchema.parse({
    schemaVersion: 1,
    capturedAt: "2026-10-15T09:00:00.000Z",
    expiresAt: "2026-10-15T10:00:00.000Z",
    correlationId: "corr_syn_e4_beta_001",
    runId: "run_syn_e4_offline_001",
    idempotencyKey: "idem_syn_e4_beta_001",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
    capabilityId: "FIN.SAVINGS_INQUIRY",
    routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
    purpose: "HUB_OPERATE",
    facts: {
      intentClass: "REFERENCE_READ",
      objectRef: SYNTHETIC_OBJECT_IDS.BETA_CUSTOMER,
      amountMinor: null,
      currency: null,
      variant: "BASELINE",
    },
  });
}

function fixtureRecord(
  queueRecordId: string,
  request: HubWorkflowIntentRequest,
  queuedAt: string,
  lastTransportAttemptAt: string | null,
  retryCount = 0,
) {
  return createOfflineQueueRecord({
    queueRecordId,
    request,
    queuedAt,
    lastTransportAttemptAt,
    retryCount,
  });
}

function buildSyntheticEvidenceFixture() {
  const alpha = alphaAgentContext();
  const beta = betaAgentContext();
  const evidence: HubOfflineProcessingEvidence[] = [];

  const queued = alphaRequest({
    correlationId: "corr_syn_e4_queue_001",
    idempotencyKey: "idem_syn_e4_queue_001",
    capturedAt: "2026-10-15T09:00:00.000Z",
    expiresAt: "2026-10-15T10:00:00.000Z",
  });
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_queue_001",
        queued,
        "2026-10-15T09:01:00.000Z",
        null,
      ),
      store: new HubWorkflowIntentCertificationStore(),
      captureContext: alpha,
      replayContext: alpha,
      evaluatedAt: "2026-10-15T09:20:00.000Z",
    }),
  );

  const authorized = alphaRequest({
    correlationId: "corr_syn_e4_authorized_001",
    idempotencyKey: "idem_syn_e4_authorized_001",
    capturedAt: "2026-10-15T09:00:00.000Z",
    expiresAt: "2026-10-15T10:00:00.000Z",
  });
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_authorized_001",
        authorized,
        "2026-10-15T09:01:00.000Z",
        "2026-10-15T09:08:00.000Z",
      ),
      store: new HubWorkflowIntentCertificationStore(),
      captureContext: alpha,
      replayContext: alpha,
      receivedAt: "2026-10-15T09:08:30.000Z",
      evaluatedAt: "2026-10-15T09:09:00.000Z",
    }),
  );

  const duplicateStore = new HubWorkflowIntentCertificationStore();
  const duplicateFirst = alphaRequest({
    correlationId: "corr_syn_e4_duplicate_001",
    idempotencyKey: "idem_syn_e4_duplicate_001",
    capturedAt: "2026-10-15T09:00:00.000Z",
    expiresAt: "2026-10-15T10:00:00.000Z",
  });
  const duplicateRetry = alphaRequest({
    correlationId: "corr_syn_e4_duplicate_001",
    idempotencyKey: "idem_syn_e4_duplicate_001",
    capturedAt: "2026-10-15T09:02:00.000Z",
    expiresAt: "2026-10-15T10:02:00.000Z",
  });
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_duplicate_001",
        duplicateFirst,
        "2026-10-15T09:01:00.000Z",
        "2026-10-15T09:05:00.000Z",
      ),
      store: duplicateStore,
      captureContext: alpha,
      replayContext: alpha,
      receivedAt: "2026-10-15T09:05:30.000Z",
      evaluatedAt: "2026-10-15T09:06:00.000Z",
    }),
  );
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_duplicate_002",
        duplicateRetry,
        "2026-10-15T09:03:00.000Z",
        "2026-10-15T09:10:00.000Z",
        1,
      ),
      store: duplicateStore,
      captureContext: alpha,
      replayContext: alpha,
      receivedAt: "2026-10-15T09:10:30.000Z",
      evaluatedAt: "2026-10-15T09:11:00.000Z",
    }),
  );

  const conflictStore = new HubWorkflowIntentCertificationStore();
  const conflictBase = alphaRequest({
    correlationId: "corr_syn_e4_conflict_001",
    idempotencyKey: "idem_syn_e4_conflict_001",
    capturedAt: "2026-10-15T09:00:00.000Z",
    expiresAt: "2026-10-15T10:00:00.000Z",
  });
  const conflictChanged = alphaRequest({
    correlationId: "corr_syn_e4_conflict_001",
    idempotencyKey: "idem_syn_e4_conflict_001",
    capturedAt: "2026-10-15T09:02:00.000Z",
    expiresAt: "2026-10-15T10:02:00.000Z",
    amountMinor: 1300,
  });
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_conflict_001",
        conflictBase,
        "2026-10-15T09:01:00.000Z",
        "2026-10-15T09:04:00.000Z",
      ),
      store: conflictStore,
      captureContext: alpha,
      replayContext: alpha,
      receivedAt: "2026-10-15T09:04:30.000Z",
      evaluatedAt: "2026-10-15T09:05:00.000Z",
    }),
  );
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_conflict_002",
        conflictChanged,
        "2026-10-15T09:03:00.000Z",
        "2026-10-15T09:12:00.000Z",
        1,
      ),
      store: conflictStore,
      captureContext: alpha,
      replayContext: alpha,
      receivedAt: "2026-10-15T09:12:30.000Z",
      evaluatedAt: "2026-10-15T09:13:00.000Z",
    }),
  );

  const stale = alphaRequest({
    correlationId: "corr_syn_e4_stale_001",
    idempotencyKey: "idem_syn_e4_stale_001",
    capturedAt: "2026-10-15T07:00:00.000Z",
    expiresAt: "2026-10-15T08:00:00.000Z",
  });
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_stale_001",
        stale,
        "2026-10-15T07:01:00.000Z",
        "2026-10-15T09:29:00.000Z",
        2,
      ),
      store: new HubWorkflowIntentCertificationStore(),
      captureContext: alpha,
      replayContext: alpha,
      receivedAt: "2026-10-15T09:29:30.000Z",
      evaluatedAt: "2026-10-15T09:30:00.000Z",
    }),
  );

  const revoked = alphaRequest({
    correlationId: "corr_syn_e4_revoked_001",
    idempotencyKey: "idem_syn_e4_revoked_001",
    capturedAt: "2026-10-15T09:00:00.000Z",
    expiresAt: "2026-10-15T10:00:00.000Z",
  });
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_revoked_001",
        revoked,
        "2026-10-15T09:01:00.000Z",
        "2026-10-15T09:15:00.000Z",
      ),
      store: new HubWorkflowIntentCertificationStore(),
      captureContext: alpha,
      replayContext: { ...alpha, assignedHubIds: [] },
      receivedAt: "2026-10-15T09:15:30.000Z",
      evaluatedAt: "2026-10-15T09:16:00.000Z",
    }),
  );

  const ambiguous = alphaRequest({
    correlationId: "corr_syn_e4_ambiguous_001",
    idempotencyKey: "idem_syn_e4_ambiguous_001",
    capturedAt: "2026-10-15T09:00:00.000Z",
    expiresAt: "2026-10-15T10:00:00.000Z",
  });
  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_ambiguous_001",
        ambiguous,
        "2026-10-15T09:01:00.000Z",
        "2026-10-15T09:20:00.000Z",
      ),
      store: new HubWorkflowIntentCertificationStore(),
      captureContext: alpha,
      replayContext: alpha,
      receivedAt: "2026-10-15T09:20:30.000Z",
      evaluatedAt: "2026-10-15T09:21:00.000Z",
      simulateAmbiguousExternalOutcome: true,
    }),
  );

  evidence.push(
    evaluateOfflineQueueRecord({
      record: fixtureRecord(
        "offlineq_syn_beta_001",
        betaRequest(),
        "2026-10-15T09:01:00.000Z",
        "2026-10-15T09:07:00.000Z",
      ),
      store: new HubWorkflowIntentCertificationStore(),
      captureContext: beta,
      replayContext: beta,
      receivedAt: "2026-10-15T09:07:30.000Z",
      evaluatedAt: "2026-10-15T09:08:00.000Z",
    }),
  );

  return evidence;
}

export const SYNTHETIC_E4_OFFLINE_PROCESSING_EVIDENCE =
  buildSyntheticEvidenceFixture();

export const SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL =
  createHubOfflineEvidenceReadModel(SYNTHETIC_E4_OFFLINE_PROCESSING_EVIDENCE);
