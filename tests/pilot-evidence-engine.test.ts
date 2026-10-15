import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "../src/domain/hub";
import {
  EvidenceArtifactReferenceSchema,
  GateDecisionSchema,
  MetricObservationSchema,
  PilotGateIdSchema,
  PilotEvidenceStatusSchema,
  PilotProgramSchema,
  SYNTHETIC_E6_ALPHA_OBSERVATIONS,
  SYNTHETIC_E6_EVIDENCE_ARTIFACTS,
  SYNTHETIC_E6_GATE_DEFINITIONS,
  SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS,
  SYNTHETIC_E6_PROGRAMS,
  SYNTHETIC_E6_TARGETS,
  createStage4PilotEvidenceReadModel,
  evaluatePilotGate,
  searchStage4PilotEvidence,
  verifyStage4PilotEvidenceReadModel,
} from "../src/domain/pilotEvidenceEngine";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";

const alpha = SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS[0];
const assessment = (gateId: string) => {
  const item = alpha.gateAssessments.find((entry) => entry.gateDefinition.gateId === gateId);
  assert.ok(item);
  return item;
};

test("E6 defines configurable evidence-linked P1-P11 without threshold self-authorization", () => {
  assert.deepEqual(SYNTHETIC_E6_GATE_DEFINITIONS.map((item) => item.gateId), PilotGateIdSchema.options);
  assert.equal(SYNTHETIC_E6_GATE_DEFINITIONS.slice(0, 5).every((item) => item.gateClass === "PAPER_HYPOTHESIS"), true);
  assert.equal(SYNTHETIC_E6_GATE_DEFINITIONS.slice(5).every((item) => item.gateClass === "ENGINEERING_GATE"), true);
  assert.equal(SYNTHETIC_E6_GATE_DEFINITIONS.every((item) => item.configurable && item.evidenceLinked && !item.numericThresholdSelfAuthorizesScale), true);
  assert.deepEqual(alpha.gateStatusVocabulary, PilotEvidenceStatusSchema.options);
});

test("P1-P5 preserve the governed paper hypotheses as configurable targets", () => {
  const byGate = Object.fromEntries(SYNTHETIC_E6_TARGETS.map((item) => [item.gateId, item]));
  assert.deepEqual(byGate.P1.constraints, [{ metricKey: "monthly_hub_net_profit_usd_cents", comparator: "GT", threshold: 15_000, unit: "USD_CENTS_PER_MONTH" }]);
  assert.deepEqual(byGate.P2.constraints, [{ metricKey: "hub_churn_basis_points", comparator: "LT", threshold: 1_000, unit: "BASIS_POINTS" }]);
  assert.deepEqual(byGate.P3.constraints, [{ metricKey: "value_added_revenue_share_basis_points", comparator: "GT", threshold: 4_000, unit: "BASIS_POINTS" }]);
  assert.deepEqual(byGate.P4.constraints, [
    { metricKey: "liquidity_coverage_uptime_basis_points", comparator: "GTE", threshold: 9_990, unit: "BASIS_POINTS" },
    { metricKey: "max_sustained_shortfall_seconds", comparator: "LTE", threshold: 1_800, unit: "SECONDS" },
  ]);
  assert.deepEqual(byGate.P5.constraints, [{ metricKey: "eligible_customer_uptake_basis_points", comparator: "GT", threshold: 2_000, unit: "BASIS_POINTS" }]);
});

test("synthetic threshold exercises produce unreviewed, collecting and partial states only", () => {
  assert.equal(assessment("P1").status, "MEETS_TARGET_UNREVIEWED");
  assert.equal(assessment("P2").status, "MISSES_TARGET_UNREVIEWED");
  assert.equal(assessment("P3").status, "COLLECTING");
  assert.equal(assessment("P4").status, "MISSES_TARGET_UNREVIEWED");
  assert.equal(assessment("P5").status, "COLLECTING");
  assert.equal(assessment("P6").status, "MEETS_TARGET_UNREVIEWED");
  assert.equal(assessment("P7").status, "MEETS_TARGET_UNREVIEWED");
  assert.equal(assessment("P8").status, "PARTIAL");
  assert.equal(assessment("P9").status, "MEETS_TARGET_UNREVIEWED");
  assert.equal(assessment("P10").status, "MEETS_TARGET_UNREVIEWED");
  assert.equal(assessment("P11").status, "PARTIAL");
  assert.equal(alpha.gateAssessments.every((item) => item.selfAuthorizedScale === false), true);
});

test("E6 exposes no real pilot, external verification, funds, posting, settlement or expansion authority", () => {
  assert.equal(alpha.scaleDecision, null);
  assert.equal(alpha.scaleDecisionState, "NO_AUTHORIZED_SCALE_DECISION_STAGE4");
  assert.deepEqual(alpha.readBoundary, {
    stage: "STAGE_4",
    syntheticOnly: true,
    readOnly: true,
    actualPilotRunning: false,
    realPilotObservationsPresent: false,
    externallyVerifiedPilotEvidencePresent: false,
    numericThresholdCanAuthorizeScale: false,
    governanceActionRequiredForScale: true,
    boundedExpansionAuthorityGranted: false,
    realDataIncluded: false,
    realFundsIncluded: false,
    partnerPostingAuthorityGranted: false,
    settlementAuthorityGranted: false,
  });
});

test("Stage 4 rejects real pilot observations", () => {
  const realObservation = MetricObservationSchema.parse({
    ...SYNTHETIC_E6_ALPHA_OBSERVATIONS[0],
    observationClass: "REAL_PILOT_OBSERVATION",
    realPilotObservation: true,
  });
  assert.throws(
    () => createStage4PilotEvidenceReadModel({
      program: SYNTHETIC_E6_PROGRAMS[0], gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS,
      targets: SYNTHETIC_E6_TARGETS, observations: [realObservation], evidenceArtifacts: SYNTHETIC_E6_EVIDENCE_ARTIFACTS,
    }),
    /PILOT_EVIDENCE_REAL_OBSERVATION_FORBIDDEN_STAGE4/,
  );
});

test("Stage 4 rejects external evidence, accepted gate decisions and scale decisions", () => {
  const external = EvidenceArtifactReferenceSchema.parse({
    ...SYNTHETIC_E6_EVIDENCE_ARTIFACTS[0], artifactClass: "EXTERNAL_EVIDENCE", externallyVerified: true, realPilotEvidence: true,
  });
  assert.throws(() => createStage4PilotEvidenceReadModel({
    program: SYNTHETIC_E6_PROGRAMS[0], gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS, targets: SYNTHETIC_E6_TARGETS,
    evidenceArtifacts: [external],
  }), /PILOT_EVIDENCE_EXTERNAL_EVIDENCE_FORBIDDEN_STAGE4/);

  const accepted = GateDecisionSchema.parse({
    decisionId: "pilotdecision_syn_p1_accept", gateId: "P1", decisionKind: "ACCEPT_MEETS_TARGET",
    decidedAt: "2026-10-15T00:00:00.000Z", reasonCode: "SYNTHETIC_ONLY", evidenceRefs: ["EV-SYN-E6-P1-REFERENCE-V1"],
    governanceActionRequired: true, scaleAuthorityGranted: false,
  });
  assert.throws(() => createStage4PilotEvidenceReadModel({
    program: SYNTHETIC_E6_PROGRAMS[0], gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS, targets: SYNTHETIC_E6_TARGETS,
    decisions: [accepted],
  }), /PILOT_EVIDENCE_ACCEPTED_DECISION_FORBIDDEN_STAGE4/);

  assert.throws(() => createStage4PilotEvidenceReadModel({
    program: SYNTHETIC_E6_PROGRAMS[0], gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS, targets: SYNTHETIC_E6_TARGETS,
    scaleDecision: {
      scaleDecisionId: "pilotscale_syn_alpha_continue", decision: "CONTINUE_PILOT", decidedAt: "2026-10-15T00:00:00.000Z",
      governanceAuthorityRef: "SYNTHETIC_GOVERNANCE_EXERCISE", reasonCode: "SYNTHETIC_ONLY", evidenceRefs: ["EV-SYN-E6-ADAMA-ALPHA-PROGRAM-V1"],
      computedSideEffect: false, realExpansionAuthorityGranted: false,
    },
  }), /PILOT_EVIDENCE_SCALE_DECISION_FORBIDDEN_STAGE4/);
});

test("metric unit mismatch fails closed", () => {
  const gate = SYNTHETIC_E6_GATE_DEFINITIONS[0];
  const target = SYNTHETIC_E6_TARGETS[0];
  const wrongUnit = { ...SYNTHETIC_E6_ALPHA_OBSERVATIONS[0], unit: "BASIS_POINTS" };
  assert.throws(() => evaluatePilotGate({ gateDefinition: gate, target, observations: [wrongUnit] }), /PILOT_EVIDENCE_METRIC_UNIT_MISMATCH/);
});

test("program scope fails closed across tenant and PartnerFI membership", () => {
  const crossTenant = PilotProgramSchema.parse({ ...SYNTHETIC_E6_PROGRAMS[0], tenantId: SYNTHETIC_HUB_TENANT_IDS.DENIAL });
  assert.throws(() => createStage4PilotEvidenceReadModel({ program: crossTenant, gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS, targets: SYNTHETIC_E6_TARGETS }), /PILOT_EVIDENCE_HUB_SCOPE_MISMATCH/);

  const nonmember = PilotProgramSchema.parse({ ...SYNTHETIC_E6_PROGRAMS[0], partnerOrgId: SYNTHETIC_PARTNER_IDS.FMCG_ZETA });
  assert.throws(() => createStage4PilotEvidenceReadModel({ program: nonmember, gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS, targets: SYNTHETIC_E6_TARGETS }), /PILOT_EVIDENCE_PARTNER_SCOPE_MISMATCH/);
});

test("shared-Hub search remains PartnerFI-isolated", () => {
  const alphaResults = searchStage4PilotEvidence({ readModels: SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS, tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4, hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED, partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA });
  const betaResults = searchStage4PilotEvidence({ readModels: SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS, tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4, hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED, partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA });
  assert.equal(alphaResults.length, 1);
  assert.equal(betaResults.length, 1);
  assert.equal(alphaResults[0].program.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA);
  assert.equal(betaResults[0].program.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA);
  assert.notEqual(alphaResults[0].pilotEvidenceDigest, betaResults[0].pilotEvidenceDigest);
});

test("pilot evidence digest is deterministic and schema-valid tampering fails verification", () => {
  const rebuilt = createStage4PilotEvidenceReadModel({ program: SYNTHETIC_E6_PROGRAMS[0], gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS, targets: SYNTHETIC_E6_TARGETS, observations: SYNTHETIC_E6_ALPHA_OBSERVATIONS, evidenceArtifacts: SYNTHETIC_E6_EVIDENCE_ARTIFACTS });
  assert.equal(rebuilt.pilotEvidenceDigest, alpha.pilotEvidenceDigest);
  const tampered = structuredClone(alpha);
  tampered.gateAssessments[0].constraintResults[0].threshold = 14_000;
  assert.throws(() => verifyStage4PilotEvidenceReadModel(tampered), /PILOT_EVIDENCE_DIGEST_MISMATCH/);
});

test("all eleven gates and one target per gate are mandatory", () => {
  assert.throws(() => createStage4PilotEvidenceReadModel({
    program: SYNTHETIC_E6_PROGRAMS[0], gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS.slice(0, 10), targets: SYNTHETIC_E6_TARGETS,
  }), /PILOT_EVIDENCE_P1_P11_REQUIRED/);
  assert.throws(() => createStage4PilotEvidenceReadModel({
    program: SYNTHETIC_E6_PROGRAMS[0], gateDefinitions: SYNTHETIC_E6_GATE_DEFINITIONS, targets: SYNTHETIC_E6_TARGETS.slice(0, 10),
  }), /PILOT_EVIDENCE_ONE_TARGET_PER_GATE_REQUIRED/);
});

test("synthetic observation records never masquerade as real pilot evidence", () => {
  assert.equal(SYNTHETIC_E6_ALPHA_OBSERVATIONS.every((item) => item.observationClass === "SYNTHETIC_TEST_FIXTURE" && item.realPilotObservation === false), true);
  assert.equal(SYNTHETIC_E6_EVIDENCE_ARTIFACTS.every((item) => item.externallyVerified === false && item.realPilotEvidence === false), true);
  assert.equal(alpha.gateAssessments.some((item) => item.status.startsWith("EVIDENCE_ACCEPTED")), false);
});
