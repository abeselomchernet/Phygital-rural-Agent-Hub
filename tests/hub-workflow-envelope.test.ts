import assert from "node:assert/strict";
import test from "node:test";

import {
  createHubWorkflowEnvelope,
  verifyHubWorkflowEnvelope,
  type HubWorkflowEnvelopeContent,
} from "../src/domain/hubWorkflowEnvelope";
import {
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
} from "../src/domain/hub";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";

function content(
  overrides: Partial<HubWorkflowEnvelopeContent> = {},
): HubWorkflowEnvelopeContent {
  return {
    schemaVersion: 1,
    eventId: "hubevt_syn_adama_001",
    eventType: "HUB_WORKFLOW_CAPTURED",
    occurredAt: "2026-10-15T00:00:00+03:00",
    correlationId: "corr_syn_adama_001",
    runId: "run_syn_adama_001",
    idempotencyKey: "idem_syn_adama_001",
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
    limitationCodes: [
      "SYNTHETIC_ONLY",
      "NO_REAL_PII",
      "NO_REAL_FUNDS",
      "NO_SETTLEMENT_AUTHORITY",
      "NO_PROVIDER_AUTHORITY",
      "NO_DEVICE_CONTROL",
      "NO_PRODUCTION_AUTH",
      "NO_LIVE_PROVIDER_CALL",
    ],
    evidenceRefs: ["EV-SYN-HUB-ADAMA-001-V1"],
    provenance: {
      mode: "SYNTHETIC_STAGE4",
      source: "ENAWUGA_HUB_DOMAIN",
      contractVersion: 1,
      catalogVersion: 1,
      routeVersion: 1,
      adapterVersion: 1,
    },
    detailCode: "CAPTURED_LOCAL_SYNTHETIC",
    ...overrides,
  };
}

test("Hub workflow envelope creates a deterministic canonical SHA-256 digest", () => {
  const first = createHubWorkflowEnvelope(content());
  const second = createHubWorkflowEnvelope(content());
  assert.equal(first.contentDigest, second.contentDigest);
  assert.match(first.contentDigest, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(verifyHubWorkflowEnvelope(first), first);
});

test("content digest changes when governed content changes and tampering fails verification", () => {
  const first = createHubWorkflowEnvelope(content());
  const changed = createHubWorkflowEnvelope(
    content({ transportState: "QUEUED_SYNTHETIC" }),
  );
  assert.notEqual(first.contentDigest, changed.contentDigest);

  assert.throws(
    () =>
      verifyHubWorkflowEnvelope({
        ...first,
        outcome: "COMPLETED_SYNTHETIC",
      }),
    /HUB_WORKFLOW_CONTENT_DIGEST_MISMATCH/,
  );
});

test("transport state does not imply financial authority or settlement", () => {
  const providerEvidence = createHubWorkflowEnvelope(
    content({
      eventId: "hubevt_syn_adama_002",
      eventType: "HUB_WORKFLOW_TRANSPORT_UPDATED",
      transportState: "PROVIDER_EVIDENCE_RECEIVED_SYNTHETIC",
      authorityState: "PARTNER_AUTH_PENDING_SYNTHETIC",
      outcome: "UNVERIFIED",
      detailCode: "PROVIDER_EVIDENCE_NOT_FINANCIAL_AUTHORITY",
    }),
  );

  assert.equal(
    providerEvidence.transportState,
    "PROVIDER_EVIDENCE_RECEIVED_SYNTHETIC",
  );
  assert.equal(
    providerEvidence.authorityState,
    "PARTNER_AUTH_PENDING_SYNTHETIC",
  );
  assert.equal(providerEvidence.outcome, "UNVERIFIED");
  assert.equal(
    providerEvidence.limitationCodes.includes("NO_SETTLEMENT_AUTHORITY"),
    true,
  );
});

test("synthetic partner authorization cannot erase the no-settlement-authority boundary", () => {
  assert.throws(
    () =>
      createHubWorkflowEnvelope(
        content({
          eventId: "hubevt_syn_adama_003",
          authorityState: "PARTNER_AUTHORIZED_SYNTHETIC",
          limitationCodes: ["SYNTHETIC_ONLY"],
        }),
      ),
    /no-settlement-authority limitation/,
  );
});

test("idempotency, correlation and run identifiers remain explicit evidence fields", () => {
  const envelope = createHubWorkflowEnvelope(content());
  assert.equal(envelope.idempotencyKey, "idem_syn_adama_001");
  assert.equal(envelope.correlationId, "corr_syn_adama_001");
  assert.equal(envelope.runId, "run_syn_adama_001");
});

test("workflow envelope rejects incomplete governed reference chains", () => {
  assert.throws(() =>
    createHubWorkflowEnvelope(
      content({ capabilityId: null }),
    ),
  );
  assert.throws(() =>
    createHubWorkflowEnvelope(
      content({ adapterId: null }),
    ),
  );
  assert.throws(() =>
    createHubWorkflowEnvelope(
      content({
        provenance: {
          mode: "SYNTHETIC_STAGE4",
          source: "ENAWUGA_HUB_DOMAIN",
          contractVersion: null,
          catalogVersion: 1,
          routeVersion: 1,
          adapterVersion: 1,
        },
      }),
    ),
  );
});

test("workflow envelope rejects duplicate evidence and limitation references", () => {
  assert.throws(() =>
    createHubWorkflowEnvelope(
      content({
        evidenceRefs: [
          "EV-SYN-HUB-ADAMA-001-V1",
          "EV-SYN-HUB-ADAMA-001-V1",
        ],
      }),
    ),
  );
  assert.throws(() =>
    createHubWorkflowEnvelope(
      content({
        limitationCodes: ["SYNTHETIC_ONLY", "SYNTHETIC_ONLY"],
      }),
    ),
  );
});
