import assert from "node:assert/strict";
import test from "node:test";

import {
  CURRENT_STAGE4_REFERENCE_TOPOLOGY,
  STAGE4_REQUIRED_COMPONENT_KINDS,
  Stage4StagingTopologyManifestSchema,
  evaluateStage4TopologyEvidence,
  type Stage4StagingTopologyManifest,
} from "../src/domain/stage4StagingTopology";

const deepClone = <T>(value: T): T => structuredClone(value);

test("Stage 4 reference topology is complete structurally but not residency-approved", () => {
  const parsed = Stage4StagingTopologyManifestSchema.parse(
    CURRENT_STAGE4_REFERENCE_TOPOLOGY,
  );

  assert.equal(parsed.dataMode, "synthetic");
  assert.equal(parsed.authority.realCustomerPiiAllowed, false);
  assert.equal(parsed.authority.realFundsAllowed, false);
  assert.equal(parsed.authority.productionProviderCredentialsAllowed, false);
  assert.equal(parsed.authority.livePartnerFiPostingAllowed, false);
  assert.equal(parsed.authority.liveCashMovementAllowed, false);
  assert.equal(parsed.authority.regulatedModeAllowed, false);
  assert.deepEqual(
    parsed.components.map((component) => component.kind).sort(),
    [...STAGE4_REQUIRED_COMPONENT_KINDS].sort(),
  );

  const decision = evaluateStage4TopologyEvidence(parsed);
  assert.equal(decision.eligibleForExternalGateReview, false);
  assert.equal(decision.etResidencyApproved, false);
  assert.equal(decision.regulatedModeAllowed, false);
  assert.equal(
    decision.missingEvidenceKinds.length,
    STAGE4_REQUIRED_COMPONENT_KINDS.length,
  );
});

test("self-declared ET locations do not satisfy the evidence gate", () => {
  const manifest = deepClone(CURRENT_STAGE4_REFERENCE_TOPOLOGY);
  for (const component of manifest.components) {
    component.providerName = "Synthetic Hosting Candidate";
    component.facilityOrRegion = "Declared Ethiopia location";
    component.countryCode = "ET";
  }
  manifest.topologyEvidenceRefs = ["EV-STAGE4-TOPOLOGY-DECLARATION-ONLY"];

  const decision = evaluateStage4TopologyEvidence(manifest);
  assert.equal(decision.eligibleForExternalGateReview, false);
  assert.equal(decision.etResidencyApproved, false);
  assert.equal(decision.regulatedModeAllowed, false);
  assert.equal(
    decision.missingEvidenceKinds.length,
    STAGE4_REQUIRED_COMPONENT_KINDS.length,
  );
});

test("complete accepted evidence only makes topology eligible for external gate review", () => {
  const manifest = deepClone(CURRENT_STAGE4_REFERENCE_TOPOLOGY);
  for (const component of manifest.components) {
    component.providerName = "Reviewed Hosting Candidate";
    component.facilityOrRegion = "Evidence-backed Ethiopia facility";
    component.countryCode = "ET";
    component.evidenceState = "ACCEPTED_FOR_STAGE4_REVIEW";
    component.evidenceRefs = [`EV-STAGE4-${component.kind}`];
  }
  manifest.topologyEvidenceRefs = ["EV-STAGE4-DATAFLOW-V1"];

  const decision = evaluateStage4TopologyEvidence(manifest);
  assert.equal(decision.eligibleForExternalGateReview, true);
  assert.deepEqual(decision.missingEvidenceKinds, []);
  assert.deepEqual(decision.rejectedEvidenceKinds, []);
  assert.deepEqual(decision.nonEtDeclaredKinds, []);

  // Repository evidence completeness never self-authorizes residency or regulated mode.
  assert.equal(decision.etResidencyApproved, false);
  assert.equal(decision.regulatedModeAllowed, false);
});

test("a non-ET component blocks external gate-review eligibility", () => {
  const manifest = deepClone(CURRENT_STAGE4_REFERENCE_TOPOLOGY);
  for (const component of manifest.components) {
    component.providerName = "Reviewed Hosting Candidate";
    component.facilityOrRegion = "Evidence-backed facility";
    component.countryCode = "ET";
    component.evidenceState = "ACCEPTED_FOR_STAGE4_REVIEW";
    component.evidenceRefs = [`EV-STAGE4-${component.kind}`];
  }
  manifest.components.find(
    (component) => component.kind === "BACKUP_STORE",
  )!.countryCode = "KE";
  manifest.topologyEvidenceRefs = ["EV-STAGE4-DATAFLOW-V1"];

  const decision = evaluateStage4TopologyEvidence(manifest);
  assert.equal(decision.eligibleForExternalGateReview, false);
  assert.deepEqual(decision.nonEtDeclaredKinds, ["BACKUP_STORE"]);
});

test("required component kinds cannot be omitted or duplicated", () => {
  const missing = deepClone(CURRENT_STAGE4_REFERENCE_TOPOLOGY);
  missing.components = missing.components.filter(
    (component) => component.kind !== "AUDIT_STORE",
  ) as Stage4StagingTopologyManifest["components"];
  assert.throws(
    () => Stage4StagingTopologyManifestSchema.parse(missing),
    /missing required Stage 4 component|Too small/,
  );

  const duplicated = deepClone(CURRENT_STAGE4_REFERENCE_TOPOLOGY);
  duplicated.components.push({
    ...deepClone(duplicated.components[0]),
    componentId: "stage4-ingress-duplicate",
  });
  assert.throws(
    () => Stage4StagingTopologyManifestSchema.parse(duplicated),
    /component kinds must be unique/,
  );
});

test("Stage 4 manifest schema cannot be used to enable regulated authority", () => {
  const manifest = deepClone(CURRENT_STAGE4_REFERENCE_TOPOLOGY) as unknown as {
    authority: Record<string, boolean>;
  };
  manifest.authority.regulatedModeAllowed = true;

  assert.throws(() => Stage4StagingTopologyManifestSchema.parse(manifest));
});
