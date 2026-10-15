import assert from "node:assert/strict";
import test from "node:test";

import {
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
} from "../src/domain/hub";
import {
  SYNTHETIC_E1D_EVIDENCE_MANIFEST,
  SYNTHETIC_E1D_OPERATION_EVENTS,
  SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
  createHubOperationsTraceReadModel,
  searchHubOperationsTraces,
} from "../src/domain/hubOperationsTrace";
import { createHubEvidenceManifest } from "../src/domain/hubEvidenceManifest";
import { createHubWorkflowEnvelope } from "../src/domain/hubWorkflowEnvelope";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";

const alphaOperationsScope = {
  role: "OPERATIONS" as const,
  tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
  hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
};

const alphaAdminScope = {
  ...alphaOperationsScope,
  role: "PARTNER_ADMIN" as const,
};

function alphaTraces(scope = alphaOperationsScope) {
  return searchHubOperationsTraces({
    readModel: SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
    scope,
  });
}

test("E1D groups E1B envelopes into deterministic, chronologically ordered traces", () => {
  const original = alphaTraces();
  const rebuilt = createHubOperationsTraceReadModel({
    manifest: SYNTHETIC_E1D_EVIDENCE_MANIFEST,
    workflowEnvelopes: [...SYNTHETIC_E1D_OPERATION_EVENTS].reverse(),
  });
  const reversedInputProjection = searchHubOperationsTraces({
    readModel: rebuilt,
    scope: alphaOperationsScope,
  });

  assert.deepEqual(reversedInputProjection, original);
  assert.equal(original.length, 4);
  for (const trace of original) {
    assert.deepEqual(
      trace.timeline.map((event) => event.occurredAt),
      [...trace.timeline.map((event) => event.occurredAt)].sort(),
    );
  }
});

test("E1D exposes typed queue, retry, conflict, denied and reconciliation states without inferring settlement authority", () => {
  const traces = alphaTraces();
  const retry = traces.find(
    (trace) => trace.correlationId === "corr_syn_e1d_alpha_retry_001",
  );
  const conflict = traces.find(
    (trace) => trace.correlationId === "corr_syn_e1d_alpha_conflict_001",
  );
  const ambiguous = traces.find(
    (trace) => trace.correlationId === "corr_syn_e1d_alpha_ambiguous_001",
  );
  const denied = traces.find(
    (trace) => trace.correlationId === "corr_syn_e1d_alpha_denied_001",
  );

  assert.ok(retry && conflict && ambiguous && denied);
  assert.equal(retry.queueState, "QUEUED");
  assert.equal(retry.retryState, "RETRY_OBSERVED");
  assert.equal(retry.attentionState, "DEFERRED");
  assert.equal(conflict.conflictState, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(conflict.reconciliationState, "REVIEW_REQUIRED");
  assert.equal(conflict.attentionState, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(ambiguous.queueState, "EVIDENCE_RECEIVED");
  assert.equal(ambiguous.reconciliationState, "REVIEW_REQUIRED");
  assert.equal(ambiguous.latestOutcome, "UNVERIFIED");
  assert.equal(denied.attentionState, "DENIED");
  assert.equal(denied.latestOutcome, "DENIED");
  assert.equal(
    traces.every((trace) => trace.readBoundary.settlementAuthorityGranted === false),
    true,
  );
});

test("E1D projections expose bounded evidence metadata but no idempotency key, raw logs, credentials or provider payloads", () => {
  const serialized = JSON.stringify(alphaTraces());
  assert.doesNotMatch(serialized, /idempotencyKey/i);
  assert.doesNotMatch(serialized, /\"rawLogs\"\s*:/i);
  assert.doesNotMatch(serialized, /\"credentials\"\s*:/i);
  assert.doesNotMatch(serialized, /\"providerPayload\"\s*:/i);

  for (const trace of alphaTraces()) {
    assert.equal(trace.readBoundary.readOnly, true);
    assert.equal(trace.readBoundary.rawLogsExposed, false);
    assert.equal(trace.readBoundary.providerPayloadsExposed, false);
    assert.equal(trace.readBoundary.credentialsExposed, false);
    assert.equal(trace.readBoundary.mutationAuthorityGranted, false);
    assert.equal(trace.evidenceManifest.externalProviderCallsCount, 0);
    assert.equal(trace.evidenceManifest.partnerFiSettlementEvidenceCount, 0);
    assert.equal(trace.evidenceManifest.realPiiPresent, false);
    assert.equal(trace.evidenceManifest.realFundsPresent, false);
  }
});

test("future action placeholders are role-gated and remain non-mutating", () => {
  const operationsConflict = searchHubOperationsTraces({
    readModel: SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
    scope: alphaOperationsScope,
    correlationId: "corr_syn_e1d_alpha_conflict_001",
  })[0];
  const adminConflict = searchHubOperationsTraces({
    readModel: SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
    scope: alphaAdminScope,
    correlationId: "corr_syn_e1d_alpha_conflict_001",
  })[0];

  assert.ok(operationsConflict && adminConflict);
  assert.deepEqual(
    operationsConflict.actionPlaceholders.map((entry) => entry.action),
    ["RECONCILIATION_REVIEW_PLACEHOLDER"],
  );
  assert.deepEqual(
    adminConflict.actionPlaceholders.map((entry) => entry.action),
    [
      "RECONCILIATION_REVIEW_PLACEHOLDER",
      "CONFLICT_REVIEW_PLACEHOLDER",
      "RESOLUTION_REVIEW_PLACEHOLDER",
    ],
  );
  assert.equal(
    [...operationsConflict.actionPlaceholders, ...adminConflict.actionPlaceholders].every(
      (entry) =>
        entry.mutationEnabled === false &&
        entry.requiresFutureAuthorization === true,
    ),
    true,
  );
});

test("correlation search filters only after tenant, Hub and partner scope", () => {
  const alpha = alphaTraces();
  assert.equal(
    alpha.some((trace) => trace.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA),
    false,
  );

  const crossPartnerSearch = searchHubOperationsTraces({
    readModel: SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
    scope: alphaOperationsScope,
    correlationId: "corr_syn_e1d_beta_001",
  });
  assert.deepEqual(crossPartnerSearch, []);

  const wrongHubSearch = searchHubOperationsTraces({
    readModel: SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
    scope: { ...alphaOperationsScope, hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA },
  });
  assert.deepEqual(wrongHubSearch, []);
});

test("E1D verifies the E1C event digest and correlation inventories before building read models", () => {
  const subsetManifest = createHubEvidenceManifest({
    manifestId: "manifest_syn_e1d_subset_v1",
    generatedAt: "2026-10-15T08:30:00+03:00",
    runId: SYNTHETIC_E1D_EVIDENCE_MANIFEST.runId,
    workflowEnvelopes: [SYNTHETIC_E1D_OPERATION_EVENTS[0]],
  });

  assert.throws(
    () =>
      createHubOperationsTraceReadModel({
        manifest: subsetManifest,
        workflowEnvelopes: SYNTHETIC_E1D_OPERATION_EVENTS,
      }),
    /HUB_OPERATIONS_MANIFEST_EVENT_DIGEST_MISMATCH/,
  );
});

test("E1D rejects one correlation that crosses tenant, Hub or partner scope", () => {
  const source = SYNTHETIC_E1D_OPERATION_EVENTS[0];
  const { contentDigest: _contentDigest, ...content } = source;
  const crossPartner = createHubWorkflowEnvelope({
    ...content,
    eventId: "hubevt_syn_e1d_scope_mismatch_beta",
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
    capabilityId: "FIN.SAVINGS_INQUIRY",
    routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
    evidenceRefs: ["EV-SYN-E1D-SCOPE-MISMATCH-V1"],
  });
  const manifest = createHubEvidenceManifest({
    manifestId: "manifest_syn_e1d_scope_mismatch_v1",
    generatedAt: "2026-10-15T08:31:00+03:00",
    runId: source.runId,
    workflowEnvelopes: [source, crossPartner],
  });

  assert.throws(
    () =>
      createHubOperationsTraceReadModel({
        manifest,
        workflowEnvelopes: [source, crossPartner],
      }),
    /HUB_OPERATIONS_TRACE_SCOPE_MISMATCH/,
  );
});

test("invalid correlation identifiers fail closed rather than becoming fuzzy search", () => {
  assert.throws(() =>
    searchHubOperationsTraces({
      readModel: SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
      scope: alphaOperationsScope,
      correlationId: "alpha",
    }),
  );
});
