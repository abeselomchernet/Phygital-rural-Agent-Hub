import assert from "node:assert/strict";
import test from "node:test";

import {
  HubEvidenceArtifactSchema,
  createHubEvidenceManifest,
  exportHubEvidenceManifest,
  parseHubEvidenceManifestExport,
  computeSyntheticHubFixtureGraphIdentity,
  verifyHubEvidenceManifest,
} from "../src/domain/hubEvidenceManifest";
import {
  createHubWorkflowEnvelope,
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

function eventContent(
  overrides: Partial<HubWorkflowEnvelopeContent> = {},
): HubWorkflowEnvelopeContent {
  return {
    schemaVersion: 1,
    eventId: "hubevt_syn_e1c_001",
    eventType: "HUB_WORKFLOW_EVIDENCE_RECORDED",
    occurredAt: "2026-10-15T13:00:00+03:00",
    correlationId: "corr_syn_e1c_001",
    runId: "run_syn_e1c_001",
    idempotencyKey: "idem_syn_e1c_001",
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
    detailCode: "E1C_EVIDENCE_CAPTURE",
    ...overrides,
  };
}

function manifestInput(overrides: Record<string, unknown> = {}) {
  return {
    manifestId: "manifest_syn_e1c_001",
    generatedAt: "2026-10-15T13:05:00+03:00",
    runId: "run_syn_e1c_001",
    workflowEnvelopes: [createHubWorkflowEnvelope(eventContent())],
    ...overrides,
  };
}

test("E1C fixture graph identity is deterministic and versioned", () => {
  const first = computeSyntheticHubFixtureGraphIdentity();
  const second = computeSyntheticHubFixtureGraphIdentity();
  assert.deepEqual(first, second);
  assert.equal(first.fixtureDatasetVersion, "stage4-hub-fixtures-v1");
  assert.match(first.graphDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.hubCount, 3);
  assert.equal(first.partnerCount, 2);
  assert.equal(first.operatorAssignmentCount, 6);
  assert.equal(first.deviceCount, 2);
  assert.equal(first.serviceCount, 7);
  assert.equal(first.capabilityCount, 6);
  assert.equal(first.routeCount, 2);
  assert.equal(first.adapterCount, 2);
});

test("manifest exports positive fixture evidence and explicit zero/false non-evidence", () => {
  const manifest = createHubEvidenceManifest(manifestInput());
  assert.equal(manifest.classification.stage, "STAGE_4");
  assert.equal(manifest.classification.runtimeClass, "SYNTHETIC_FIXTURE");
  assert.equal(manifest.classification.environment, "synthetic");
  assert.equal(manifest.classification.providerExecution, "NO_LIVE_PROVIDER_CALLS");
  assert.deepEqual(manifest.nonEvidence, {
    externalProviderCallsCount: 0,
    liveLedgerReceiptCount: 0,
    partnerFiSettlementEvidenceCount: 0,
    realPiiPresent: false,
    realFundsPresent: false,
    regulatedProductionAuthorityGranted: false,
    deviceControlExecuted: false,
  });
  assert.equal(manifest.workflowSummary.eventCount, 1);
  assert.equal(manifest.workflowSummary.correlationCount, 1);
  assert.equal(manifest.artifactInventory.length, 2);
  assert.equal(manifest.completenessStatus, "DIGEST_SET_COMPLETE");
  assert.ok(manifest.limitations.includes("NO_SETTLEMENT_AUTHORITY"));
  assert.ok(manifest.limitations.includes("NO_LIVE_PROVIDER_CALL"));
});

test("manifest digest and canonical export are deterministic for identical inputs", () => {
  const first = createHubEvidenceManifest(manifestInput());
  const second = createHubEvidenceManifest(manifestInput());
  assert.equal(first.manifestDigest, second.manifestDigest);
  const firstExport = exportHubEvidenceManifest(first);
  const secondExport = exportHubEvidenceManifest(second);
  assert.equal(firstExport, secondExport);
  assert.deepEqual(parseHubEvidenceManifestExport(firstExport), first);
});

test("manifest tampering fails closed even when the modified field remains schema-valid", () => {
  const manifest = createHubEvidenceManifest(manifestInput());
  assert.throws(
    () =>
      verifyHubEvidenceManifest({
        ...manifest,
        generatedAt: "2026-10-15T13:06:00+03:00",
      }),
    /HUB_EVIDENCE_MANIFEST_DIGEST_MISMATCH/,
  );
});

test("runtime classification distinguishes synthetic fixture from staging-synthetic", () => {
  const synthetic = createHubEvidenceManifest(manifestInput());
  const staging = createHubEvidenceManifest(
    manifestInput({ runtimeClass: "STAGING_SYNTHETIC" }),
  );
  assert.equal(synthetic.classification.environment, "synthetic");
  assert.equal(staging.classification.environment, "staging");
  assert.equal(staging.classification.dataMode, "synthetic");
  assert.equal(staging.nonEvidence.externalProviderCallsCount, 0);
  assert.notEqual(synthetic.manifestDigest, staging.manifestDigest);
});

test("pending and unknown artifacts remain incomplete rather than becoming pass evidence", () => {
  const pending = HubEvidenceArtifactSchema.parse({
    artifactId: "artifact_syn_partner_note_pending",
    kind: "SUPPORTING_EVIDENCE",
    owner: "WISHLAND_NETWORKING_PLC",
    retentionClass: "STAGE4_SYNTHETIC_EVIDENCE",
    versionRef: "partner-note-v1",
    contentDigest: null,
    integrityStatus: "PENDING",
    evidenceRefs: [],
  });
  const pendingManifest = createHubEvidenceManifest(
    manifestInput({ declaredArtifacts: [pending] }),
  );
  assert.equal(pendingManifest.completenessStatus, "INCOMPLETE_PENDING");
  assert.equal(
    pendingManifest.artifactInventory.find(
      (artifact) => artifact.artifactId === pending.artifactId,
    )?.integrityStatus,
    "PENDING",
  );

  const unknown = HubEvidenceArtifactSchema.parse({
    ...pending,
    artifactId: "artifact_syn_partner_note_unknown",
    integrityStatus: "UNKNOWN",
  });
  const unknownManifest = createHubEvidenceManifest(
    manifestInput({ declaredArtifacts: [pending, unknown] }),
  );
  assert.equal(unknownManifest.completenessStatus, "INCOMPLETE_UNKNOWN");
});

test("digest-recorded artifacts require a checksum and raw payload fields are rejected", () => {
  assert.throws(() =>
    HubEvidenceArtifactSchema.parse({
      artifactId: "artifact_syn_missing_digest",
      kind: "SUPPORTING_EVIDENCE",
      owner: "WISHLAND_NETWORKING_PLC",
      retentionClass: "STAGE4_SYNTHETIC_EVIDENCE",
      versionRef: "support-v1",
      contentDigest: null,
      integrityStatus: "DIGEST_RECORDED",
      evidenceRefs: [],
    }),
  );
  assert.throws(() =>
    createHubEvidenceManifest(
      manifestInput({
        declaredArtifacts: [
          {
            artifactId: "artifact_syn_raw_payload",
            kind: "SUPPORTING_EVIDENCE",
            owner: "WISHLAND_NETWORKING_PLC",
            retentionClass: "STAGE4_SYNTHETIC_EVIDENCE",
            versionRef: "support-v1",
            contentDigest: null,
            integrityStatus: "PENDING",
            evidenceRefs: [],
            rawPayload: { secret: "forbidden" },
          },
        ],
      }),
    ),
  );
});

test("manifest rejects run mismatch and tampered E1B envelope evidence", () => {
  const wrongRun = createHubWorkflowEnvelope(
    eventContent({
      eventId: "hubevt_syn_e1c_002",
      runId: "run_syn_other_001",
    }),
  );
  assert.throws(
    () => createHubEvidenceManifest(manifestInput({ workflowEnvelopes: [wrongRun] })),
    /HUB_EVIDENCE_RUN_MISMATCH/,
  );

  const valid = createHubWorkflowEnvelope(eventContent());
  const tampered = { ...valid, outcome: "DEFERRED" };
  assert.throws(() =>
    createHubEvidenceManifest(manifestInput({ workflowEnvelopes: [tampered] })),
  );
});

test("duplicate artifact IDs fail closed", () => {
  const event = createHubWorkflowEnvelope(eventContent());
  const duplicate = HubEvidenceArtifactSchema.parse({
    artifactId: "artifact_syn_workflow_e1c_001",
    kind: "SUPPORTING_EVIDENCE",
    owner: "WISHLAND_NETWORKING_PLC",
    retentionClass: "STAGE4_SYNTHETIC_EVIDENCE",
    versionRef: "support-v1",
    contentDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    integrityStatus: "DIGEST_RECORDED",
    evidenceRefs: [],
  });
  assert.throws(() =>
    createHubEvidenceManifest(
      manifestInput({ workflowEnvelopes: [event], declaredArtifacts: [duplicate] }),
    ),
  );
});
