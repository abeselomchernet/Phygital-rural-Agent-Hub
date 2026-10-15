import assert from "node:assert/strict";
import test from "node:test";

import {
  HubOfflineQueueRecordSchema,
  SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
  SYNTHETIC_E4_OFFLINE_PROCESSING_EVIDENCE,
  createHubOfflineEvidenceReadModel,
  searchHubOfflineEvidence,
} from "../src/domain/hubOfflineOperationsEvidence";
import { SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "../src/domain/hub";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";

const alphaScope = {
  role: "OPERATIONS" as const,
  tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
  hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
};

const betaScope = {
  role: "OPERATIONS" as const,
  tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
  hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
};

function trace(correlationId: string) {
  const result = searchHubOfflineEvidence({
    readModel: SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
    scope: alphaScope,
    correlationId,
  });
  assert.equal(result.length, 1);
  return result[0];
}

test("offline queue evidence keeps client capture untrusted and surfaces queue age without authority", () => {
  const queued = trace("corr_syn_e4_queue_001");
  assert.equal(queued.queueRecordCount, 1);
  assert.equal(queued.latestTransportState, "QUEUED");
  assert.equal(queued.latestAuthorityState, "UNTRUSTED_INTENT");
  assert.equal(queued.latestOutcome, "QUEUED_UNTRUSTED");
  assert.equal(queued.maxQueueAgeMinutes, 19);
  assert.equal(queued.records[0].queueAgeState, "AGING");
  assert.equal(queued.records[0].remoteReceipt, null);
  assert.equal(queued.records[0].localReceipt.trustedForAuthority, false);
  assert.equal(queued.records[0].localReceipt.provesRemoteReceipt, false);
  assert.equal(queued.records[0].localReceipt.provesPartnerPosting, false);
});

test("synthetic server receipt proves transport only while replay-time authorization is separate", () => {
  const authorized = trace("corr_syn_e4_authorized_001");
  const record = authorized.records[0];
  assert.equal(record.transportState, "RECEIVED");
  assert.equal(record.authorityState, "SYNTHETIC_AUTHORIZED");
  assert.equal(record.outcome, "AUTHORIZED_SYNTHETIC");
  assert.equal(record.remoteReceipt?.transportAccepted, true);
  assert.equal(record.remoteReceipt?.financialAuthorityGranted, false);
  assert.equal(record.remoteReceipt?.settlementAuthorityGranted, false);
  assert.equal(record.remoteReceipt?.liveProviderReceipt, false);
  assert.equal(record.idempotencyEvidence.certificationDecision, "SYNTHETIC_DISPATCH_ELIGIBLE");
  assert.equal(record.idempotencyEvidence.rawIdempotencyKeyExposed, false);
  assert.equal(record.idempotencyEvidence.eventContentDigestUsedAsBusinessIntent, false);
  assert.deepEqual(
    authorized.timeline.map((entry) => entry.stage),
    [
      "CAPTURED_OFFLINE",
      "QUEUED",
      "TRANSPORT_ATTEMPTED",
      "RECEIVED",
      "AUTHORIZATION_PENDING",
      "AUTHORIZED",
    ],
  );
});

test("identical retry is visible as duplicate no-op without creating a second logical workflow", () => {
  const duplicate = trace("corr_syn_e4_duplicate_001");
  assert.equal(duplicate.queueRecordCount, 2);
  assert.equal(duplicate.totalRetryCount, 1);
  assert.equal(duplicate.duplicateNoopObserved, true);
  assert.equal(duplicate.conflictObserved, false);
  assert.equal(duplicate.latestOutcome, "DUPLICATE_NOOP");
  assert.equal(duplicate.latestAuthorityState, "DUPLICATE_NOOP");
  assert.equal(
    duplicate.records[1].idempotencyEvidence.certificationDecision,
    "DUPLICATE_NOOP",
  );
  assert.equal(duplicate.records[1].idempotencyEvidence.duplicateNoop, true);
  assert.equal(
    duplicate.records[0].idempotencyEvidence.serverBusinessIntentDigest,
    duplicate.records[1].idempotencyEvidence.serverBusinessIntentDigest,
  );
});

test("changed reuse of the same scoped idempotency key is conflict evidence, never silent overwrite", () => {
  const conflict = trace("corr_syn_e4_conflict_001");
  assert.equal(conflict.queueRecordCount, 2);
  assert.equal(conflict.conflictObserved, true);
  assert.equal(conflict.latestOutcome, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(conflict.latestAuthorityState, "REJECTED");
  assert.equal(
    conflict.records[1].idempotencyEvidence.conflictReviewRequired,
    true,
  );
  assert.equal(
    conflict.records[1].idempotencyEvidence.certificationDecision,
    "CONFLICT_REVIEW_REQUIRED",
  );
});

test("stale and replay-scope-revoked intents fail closed after transport receipt", () => {
  const stale = trace("corr_syn_e4_stale_001");
  assert.equal(stale.latestTransportState, "RECEIVED");
  assert.equal(stale.latestAuthorityState, "REJECTED");
  assert.equal(stale.latestOutcome, "STALE_INTENT_REJECTED");
  assert.equal(stale.records[0].queueAgeState, "STALE");
  assert.equal(stale.records[0].retryCount, 2);

  const revoked = trace("corr_syn_e4_revoked_001");
  assert.equal(revoked.latestTransportState, "RECEIVED");
  assert.equal(revoked.latestAuthorityState, "REJECTED");
  assert.equal(revoked.latestOutcome, "REPLAY_AUTHORIZATION_DENIED");
  assert.equal(
    revoked.records[0].idempotencyEvidence.certificationDecision,
    "REPLAY_AUTHORIZATION_DENIED",
  );
});

test("ambiguous synthetic post-gate outcome becomes reconciliation-required and never assumed success", () => {
  const ambiguous = trace("corr_syn_e4_ambiguous_001");
  assert.equal(ambiguous.latestTransportState, "RECEIVED");
  assert.equal(ambiguous.latestAuthorityState, "RECONCILIATION_REQUIRED");
  assert.equal(ambiguous.latestOutcome, "RECONCILIATION_REQUIRED");
  assert.equal(ambiguous.reconciliationRequired, true);
  const source = SYNTHETIC_E4_OFFLINE_PROCESSING_EVIDENCE.find(
    (entry) => entry.correlationId === "corr_syn_e4_ambiguous_001",
  );
  assert.ok(source);
  assert.equal(source.boundaries.assumedSuccess, false);
  assert.equal(source.boundaries.liveNetworkAllowed, false);
  assert.equal(source.boundaries.externalProviderCalls, 0);
  assert.equal(source.boundaries.settlementAuthorityGranted, false);
});

test("Operations projection is role-safe and omits raw intent facts and idempotency keys", () => {
  const serialized = JSON.stringify(SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL);
  assert.equal(serialized.includes("idempotencyKey"), false);
  assert.equal(serialized.includes('"facts"'), false);
  assert.equal(serialized.includes("rawProviderPayload"), false);
  for (const item of SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL) {
    assert.equal(item.readBoundary.rawIntentFactsExposed, false);
    assert.equal(item.readBoundary.rawIdempotencyKeyExposed, false);
    assert.equal(item.readBoundary.providerPayloadsExposed, false);
    assert.equal(item.readBoundary.credentialsExposed, false);
    assert.equal(item.readBoundary.mutationAuthorityGranted, false);
    assert.equal(item.readBoundary.settlementAuthorityGranted, false);
  }
});

test("shared Hub evidence remains PartnerFI-isolated and exact correlation search cannot leak Beta into Alpha scope", () => {
  const alpha = searchHubOfflineEvidence({
    readModel: SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
    scope: alphaScope,
  });
  const beta = searchHubOfflineEvidence({
    readModel: SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
    scope: betaScope,
  });
  assert.ok(alpha.length > 0);
  assert.equal(alpha.every((entry) => entry.partnerOrgId === alphaScope.partnerOrgId), true);
  assert.equal(beta.length, 1);
  assert.equal(beta[0].correlationId, "corr_syn_e4_beta_001");
  assert.deepEqual(
    searchHubOfflineEvidence({
      readModel: SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
      scope: alphaScope,
      correlationId: "corr_syn_e4_beta_001",
    }),
    [],
  );
});

test("offline evidence reconstruction is deterministic under reversed evidence delivery", () => {
  const reversed = createHubOfflineEvidenceReadModel([
    ...SYNTHETIC_E4_OFFLINE_PROCESSING_EVIDENCE,
  ].reverse());
  assert.deepEqual(reversed, SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL);
});

test("offline evidence digest fails closed on schema-valid tampering", () => {
  const tampered = SYNTHETIC_E4_OFFLINE_PROCESSING_EVIDENCE.map((entry, index) =>
    index === 0 ? { ...entry, retryCount: entry.retryCount + 1 } : entry,
  );
  assert.throws(
    () => createHubOfflineEvidenceReadModel(tampered),
    /HUB_OFFLINE_EVIDENCE_DIGEST_MISMATCH/,
  );
});

test("offline evidence schemas fail closed on malformed queue timing and fuzzy correlation search", () => {
  const source = SYNTHETIC_E4_OFFLINE_PROCESSING_EVIDENCE[0];
  assert.throws(() =>
    HubOfflineQueueRecordSchema.parse({
      schemaVersion: 1,
      queueRecordId: "offlineq_syn_invalid_001",
      request: {
        schemaVersion: 1,
        capturedAt: source.capturedAt,
        expiresAt: "2026-10-15T10:00:00.000Z",
        correlationId: source.correlationId,
        runId: source.runId,
        idempotencyKey: "idem_syn_e4_invalid_001",
        tenantId: source.tenantId,
        hubId: source.hubId,
        partnerOrgId: source.partnerOrgId,
        serviceId: source.serviceId,
        capabilityId: source.capabilityId,
        routeId: "route_syn_partnerfi_alpha_core",
        adapterId: "adapter_syn_partnerfi_alpha",
        purpose: "HUB_OPERATE",
        facts: {
          intentClass: "SYNTHETIC_FINANCIAL_INTENT",
          objectRef: "obj_syn_alpha_customer_001",
          amountMinor: 1250,
          currency: "ETB",
          variant: "BASELINE",
        },
      },
      queuedAt: "2026-10-15T08:59:00.000Z",
      lastTransportAttemptAt: null,
      retryCount: 0,
      localReceipt: {
        receiptId: "offline_local_receipt_syn_invalid_001",
        recordedAt: "2026-10-15T08:59:00.000Z",
        clientRecordedDigest: source.localReceipt.clientRecordedDigest,
        trustedForAuthority: false,
        provesRemoteReceipt: false,
        provesPartnerPosting: false,
      },
      untrustedIntent: true,
      clientAuthorityGranted: false,
      remoteSyncEnabled: false,
    }),
  );
  assert.throws(() =>
    searchHubOfflineEvidence({
      readModel: SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
      scope: alphaScope,
      correlationId: "e4",
    }),
  );
});
