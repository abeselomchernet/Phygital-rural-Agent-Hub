import assert from "node:assert/strict";
import test from "node:test";

import {
  HubWorkflowIntentCertificationStore,
  HubWorkflowIntentRequestSchema,
  computeHubWorkflowBusinessIntentDigest,
  type HubWorkflowIntentRequest,
} from "../src/domain/hubWorkflowIdempotencyCertification";
import {
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  type HubAccessContext,
} from "../src/domain/hub";
import {
  SYNTHETIC_E1D_EVIDENCE_MANIFEST,
  SYNTHETIC_E1D_OPERATION_EVENTS,
  SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
  createHubOperationsTraceReadModel,
} from "../src/domain/hubOperationsTrace";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_OBJECT_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";

function alphaAdamaContext(): HubAccessContext {
  return {
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: "AGENT",
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    assignedHubIds: [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  };
}

function betaAdamaContext(): HubAccessContext {
  return {
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: "AGENT",
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
    assignedHubIds: [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  };
}

function alphaArisiContext(): HubAccessContext {
  return {
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: "AGENT",
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    regionId: SYNTHETIC_REGION_IDS.ARISI,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    assignedHubIds: [SYNTHETIC_HUB_IDS.ARISI_ALPHA],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  };
}

function alphaRequest(
  overrides: Partial<HubWorkflowIntentRequest> = {},
): HubWorkflowIntentRequest {
  return HubWorkflowIntentRequestSchema.parse({
    schemaVersion: 1,
    capturedAt: "2026-10-15T09:00:00+03:00",
    expiresAt: "2026-10-15T10:00:00+03:00",
    correlationId: "corr_syn_e1e_alpha_001",
    runId: "run_syn_e1e_001",
    idempotencyKey: "idem_syn_e1e_shared_001",
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
      amountMinor: 1250,
      currency: "ETB",
      variant: "BASELINE",
    },
    ...overrides,
  });
}

function betaRequest(): HubWorkflowIntentRequest {
  return HubWorkflowIntentRequestSchema.parse({
    ...alphaRequest(),
    correlationId: "corr_syn_e1e_beta_001",
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
    capabilityId: "FIN.SAVINGS_INQUIRY",
    routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
    facts: {
      intentClass: "REFERENCE_READ",
      objectRef: SYNTHETIC_OBJECT_IDS.BETA_CUSTOMER,
      amountMinor: null,
      currency: null,
      variant: "BASELINE",
    },
  });
}

test("E1E business-intent digest is separate from correlation, run, timing and route metadata", () => {
  const first = alphaRequest();
  const metadataChanged = alphaRequest({
    capturedAt: "2026-10-15T09:05:00+03:00",
    expiresAt: "2026-10-15T10:05:00+03:00",
    correlationId: "corr_syn_e1e_alpha_retry_002",
    runId: "run_syn_e1e_002",
    routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
  });
  assert.equal(
    computeHubWorkflowBusinessIntentDigest(first),
    computeHubWorkflowBusinessIntentDigest(metadataChanged),
  );
  assert.notEqual(
    computeHubWorkflowBusinessIntentDigest(first),
    computeHubWorkflowBusinessIntentDigest(
      alphaRequest({ facts: { ...first.facts, variant: "CHANGED" } }),
    ),
  );
});

test("identical retry is one logical workflow and returns duplicate no-op", () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  const first = store.reserve(request, alphaAdamaContext());
  const retry = store.reserve(
    alphaRequest({
      correlationId: "corr_syn_e1e_alpha_retry_002",
      runId: "run_syn_e1e_retry_002",
      capturedAt: "2026-10-15T09:01:00+03:00",
      expiresAt: "2026-10-15T10:01:00+03:00",
    }),
    alphaAdamaContext(),
  );

  assert.equal(first.decision, "RESERVED_NEW");
  assert.equal(first.logicalWorkflowCreated, true);
  assert.equal(retry.decision, "DUPLICATE_NOOP");
  assert.equal(retry.logicalWorkflowCreated, false);
  assert.equal(retry.reservation?.correlationId, request.correlationId);
  assert.equal(store.snapshot().reservations.length, 1);
});

test("Promise.all same scoped intent creates exactly one logical workflow", async () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  const decisions = await Promise.all(
    Array.from({ length: 8 }, () =>
      Promise.resolve().then(() => store.reserve(request, alphaAdamaContext())),
    ),
  );

  assert.equal(decisions.filter((entry) => entry.decision === "RESERVED_NEW").length, 1);
  assert.equal(decisions.filter((entry) => entry.decision === "DUPLICATE_NOOP").length, 7);
  assert.equal(decisions.filter((entry) => entry.logicalWorkflowCreated).length, 1);
  assert.equal(store.snapshot().reservations.length, 1);
});

test("Promise.all changed reuse fails closed without creating a second logical workflow", async () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  const changed = alphaRequest({ facts: { ...request.facts, amountMinor: 1251 } });
  const decisions = await Promise.all([
    Promise.resolve().then(() => store.reserve(request, alphaAdamaContext())),
    Promise.resolve().then(() => store.reserve(changed, alphaAdamaContext())),
  ]);

  assert.equal(decisions.filter((entry) => entry.decision === "RESERVED_NEW").length, 1);
  assert.equal(
    decisions.filter((entry) => entry.decision === "CONFLICT_REVIEW_REQUIRED").length,
    1,
  );
  assert.equal(store.snapshot().reservations.length, 1);
  assert.equal(decisions.every((entry) => entry.assumedSuccess === false), true);
});

test("changed reuse of a scoped idempotency key fails closed as conflict/review", () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  store.reserve(request, alphaAdamaContext());
  const conflict = store.reserve(
    alphaRequest({ facts: { ...request.facts, amountMinor: 1251 } }),
    alphaAdamaContext(),
  );
  assert.equal(conflict.decision, "CONFLICT_REVIEW_REQUIRED");
  assert.equal(conflict.syntheticDispatchEligible, false);
  assert.equal(conflict.assumedSuccess, false);
  assert.equal(store.snapshot().reservations.length, 1);
});



test("initial reservation rejects service/capability/route references outside the governed PartnerFI fixture", () => {
  const store = new HubWorkflowIntentCertificationStore();
  assert.throws(
    () =>
      store.reserve(
        alphaRequest({
          routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
          adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
        }),
        alphaAdamaContext(),
      ),
    /HUB_WORKFLOW_INTENT_AUTHORIZATION_DENIED/,
  );
  assert.equal(store.snapshot().reservations.length, 0);
});

test("snapshot restore preserves idempotency identity across a synthetic restart boundary", () => {
  const request = alphaRequest();
  const first = new HubWorkflowIntentCertificationStore();
  const reserved = first.reserve(request, alphaAdamaContext());
  const restarted = new HubWorkflowIntentCertificationStore(first.snapshot());
  const duplicate = restarted.reserve(request, alphaAdamaContext());

  assert.equal(duplicate.decision, "DUPLICATE_NOOP");
  assert.equal(duplicate.reservation?.reservationId, reserved.reservation?.reservationId);
  assert.equal(restarted.snapshot().reservations.length, 1);
});

test("same idempotency key is isolated across PartnerFI and Hub scopes", () => {
  const store = new HubWorkflowIntentCertificationStore();
  const adamaAlpha = store.reserve(alphaRequest(), alphaAdamaContext());
  const adamaBeta = store.reserve(betaRequest(), betaAdamaContext());
  const arisiAlpha = store.reserve(
    alphaRequest({
      correlationId: "corr_syn_e1e_alpha_arisi_001",
      hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
    }),
    alphaArisiContext(),
  );

  assert.equal(adamaAlpha.decision, "RESERVED_NEW");
  assert.equal(adamaBeta.decision, "RESERVED_NEW");
  assert.equal(arisiAlpha.decision, "RESERVED_NEW");
  assert.equal(store.snapshot().reservations.length, 3);
  assert.equal(
    new Set(store.snapshot().reservations.map((entry) => entry.reservationId)).size,
    3,
  );
});

test("stale queued intent and revoked replay scope are rejected before synthetic dispatch eligibility", () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  store.reserve(request, alphaAdamaContext());

  const stale = store.certifyReplay({
    request,
    context: alphaAdamaContext(),
    evaluatedAt: "2026-10-15T10:00:01+03:00",
  });
  assert.equal(stale.decision, "STALE_INTENT_REJECTED");
  assert.equal(stale.syntheticDispatchEligible, false);
  assert.equal(stale.liveNetworkAllowed, false);

  const revokedContext: HubAccessContext = {
    ...alphaAdamaContext(),
    assignedHubIds: [],
  };
  const denied = store.certifyReplay({
    request,
    context: revokedContext,
    evaluatedAt: "2026-10-15T09:30:00+03:00",
  });
  assert.equal(denied.decision, "REPLAY_AUTHORIZATION_DENIED");
  assert.equal(denied.syntheticDispatchEligible, false);
});

test("possible-mutation gate stays closed when replay-time Hub authorization is no longer valid", () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  store.reserve(request, alphaAdamaContext());
  const revokedContext: HubAccessContext = {
    ...alphaAdamaContext(),
    assignedHubIds: [],
  };
  assert.throws(
    () =>
      store.markPossibleExternalMutation({
        request,
        context: revokedContext,
        markedAt: "2026-10-15T09:10:00+03:00",
      }),
    /HUB_WORKFLOW_DISPATCH_GATE_CLOSED:REPLAY_AUTHORIZATION_DENIED/,
  );
  assert.equal(store.get(request)?.state, "RESERVED_SYNTHETIC");
  assert.equal(store.get(request)?.possibleMutationMarkedAt, null);
});
test("changed operator assignment across restart requires review", () => {
  const request = alphaRequest();
  const first = new HubWorkflowIntentCertificationStore();
  first.reserve(request, alphaAdamaContext());
  const snapshot = first.snapshot();
  snapshot.reservations[0] = {
    ...snapshot.reservations[0],
    operatorAssignmentId: "hubop_syn_prior_alpha_agents",
  };
  const restarted = new HubWorkflowIntentCertificationStore(snapshot);
  const replay = restarted.certifyReplay({
    request,
    context: alphaAdamaContext(),
    evaluatedAt: "2026-10-15T09:30:00+03:00",
  });
  assert.equal(replay.decision, "ASSIGNMENT_CHANGED_REVIEW_REQUIRED");
  assert.equal(replay.syntheticDispatchEligible, false);
});

test("route and adapter remain pinned after possible external mutation evidence", () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  store.reserve(request, alphaAdamaContext());
  store.markPossibleExternalMutation({
    request,
    context: alphaAdamaContext(),
    markedAt: "2026-10-15T09:10:00+03:00",
  });

  const fallback = store.certifyReplay({
    request,
    context: alphaAdamaContext(),
    evaluatedAt: "2026-10-15T09:20:00+03:00",
    proposedRouteId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
    proposedAdapterId: SYNTHETIC_ADAPTER_IDS.BETA,
  });
  assert.equal(fallback.decision, "ROUTE_FALLBACK_REJECTED");
  assert.equal(fallback.syntheticDispatchEligible, false);
  assert.equal(fallback.reservation?.pinnedRouteId, SYNTHETIC_ROUTE_IDS.ALPHA_CORE);
});

test("ambiguous external outcome is reconciliation-required and never assumed success", () => {
  const store = new HubWorkflowIntentCertificationStore();
  const request = alphaRequest();
  store.reserve(request, alphaAdamaContext());
  store.markPossibleExternalMutation({
    request,
    context: alphaAdamaContext(),
    markedAt: "2026-10-15T09:10:00+03:00",
  });
  store.recordAmbiguousExternalOutcome({
    request,
    recordedAt: "2026-10-15T09:11:00+03:00",
  });
  const replay = store.certifyReplay({
    request,
    context: alphaAdamaContext(),
    evaluatedAt: "2026-10-15T09:20:00+03:00",
  });

  assert.equal(replay.decision, "RECONCILIATION_REQUIRED");
  assert.equal(replay.assumedSuccess, false);
  assert.equal(replay.syntheticDispatchEligible, false);
  assert.equal(replay.liveNetworkAllowed, false);
  assert.equal(replay.reservation?.settlementAuthorityGranted, false);
});

test("out-of-order E1B delivery reconstructs the same deterministic E1D read model", () => {
  const reversed = createHubOperationsTraceReadModel({
    manifest: SYNTHETIC_E1D_EVIDENCE_MANIFEST,
    workflowEnvelopes: [...SYNTHETIC_E1D_OPERATION_EVENTS].reverse(),
  });
  assert.deepEqual(reversed, SYNTHETIC_E1D_OPERATIONS_READ_MODEL);
});

test("E1E certification schemas reject raw payload expansion and never grant live authority", () => {
  const request = alphaRequest();
  assert.throws(() =>
    HubWorkflowIntentRequestSchema.parse({
      ...request,
      rawProviderPayload: { secret: "not-allowed" },
    }),
  );

  const store = new HubWorkflowIntentCertificationStore();
  const reserved = store.reserve(request, alphaAdamaContext());
  assert.equal(reserved.liveNetworkAllowed, false);
  assert.equal(reserved.reservation?.settlementAuthorityGranted, false);
});
