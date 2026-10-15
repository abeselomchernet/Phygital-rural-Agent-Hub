import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "../src/domain/hub";
import {
  CorridorCandidateSchema,
  SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS,
  SYNTHETIC_E7_CORRIDOR_PLANS,
  createStage4CorridorPlanningReadModel,
  searchStage4CorridorPlanning,
  verifyStage4CorridorPlanningReadModel,
} from "../src/domain/corridorPlanning";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
} from "../src/domain/syntheticReferencePartners";

const alpha = SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS.find(
  (item) => item.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
);
assert.ok(alpha);

const beta = SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS.find(
  (item) => item.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
);
assert.ok(beta);

test("E7 produces bounded synthetic corridor comparison without geographic authority", () => {
  assert.equal(alpha.reviewPolicy.readinessThresholdBasisPoints, 6_000);
  assert.equal(alpha.reviewPolicy.evidenceClass, "SYNTHETIC_MODEL_ASSUMPTION");
  assert.equal(
    alpha.reviewPolicy.meaning,
    "SYNTHETIC_REVIEW_HEURISTIC_NOT_AUTHORIZATION",
  );
  assert.deepEqual(alpha.boundedExpansionRecommendation, {
    state: "RECOMMEND_BOUNDED_REVIEW",
    candidateId: "corridor_candidate_syn_alpha_arisi_existing",
    reasonCodes: [
      "COMPLETE_SYNTHETIC_EVIDENCE",
      "HIGHEST_SYNTHETIC_READINESS",
    ],
    recommendationOnly: true,
    geographicAuthorizationGranted: false,
    pilotAuthorized: false,
    expansionAuthorized: false,
  });
  assert.equal(alpha.readBoundary.recommendationCreatesAuthority, false);
  assert.equal(alpha.readBoundary.geographicAuthorizationGranted, false);
  assert.equal(alpha.readBoundary.regulatedPilotAuthorityGranted, false);
});

test("E7 computes readiness only from complete synthetic evidence", () => {
  const arisi = alpha.candidates.find(
    (item) => item.candidateId === "corridor_candidate_syn_alpha_arisi_existing",
  );
  assert.ok(arisi);
  assert.equal(arisi.evidenceCompletenessBasisPoints, 10_000);
  assert.equal(arisi.readinessScoreBasisPoints, 6_814);
  assert.equal(arisi.readinessEvidenceClass, "SYNTHETIC_MODEL_OUTPUT");
  assert.equal(arisi.recommendationState, "CANDIDATE_FOR_BOUNDED_REVIEW");

  const betaCandidate = beta.candidates[0];
  assert.deepEqual(betaCandidate.missingEvidenceDimensions, ["PARTNER_INTEREST"]);
  assert.equal(betaCandidate.evidenceCompletenessBasisPoints, 8_571);
  assert.equal(betaCandidate.readinessScoreBasisPoints, null);
  assert.equal(betaCandidate.recommendationState, "RESEARCH_MORE");
  assert.equal(beta.boundedExpansionRecommendation.state, "RESEARCH_MORE");
  assert.equal(beta.boundedExpansionRecommendation.candidateId, null);
});

test("missing evidence cannot retain a fabricated numeric input", () => {
  const candidate: any = structuredClone(SYNTHETIC_E7_CORRIDOR_PLANS[0].candidates[0]);
  candidate.evidence = candidate.evidence.map((entry: any) =>
    entry.dimension === "DEMAND"
      ? { dimension: "DEMAND", state: "MISSING", evidenceRefs: [] }
      : entry,
  );
  assert.throws(() => CorridorCandidateSchema.parse(candidate));

  candidate.demandIndex = null;
  assert.doesNotThrow(() => CorridorCandidateSchema.parse(candidate));
});

test("missing connectivity/logistics/liquidity evidence requires UNKNOWN profile state", () => {
  for (const [dimension, indexField, profileField] of [
    ["CONNECTIVITY", "connectivityIndex", "connectivityProfile"],
    ["LOGISTICS", "logisticsFeasibilityIndex", "logisticsState"],
    ["LIQUIDITY", "liquidityFeasibilityIndex", "liquidityProfile"],
  ] as const) {
    const candidate: any = structuredClone(SYNTHETIC_E7_CORRIDOR_PLANS[0].candidates[0]);
    candidate.evidence = candidate.evidence.map((entry: any) =>
      entry.dimension === dimension
        ? { dimension, state: "MISSING", evidenceRefs: [] }
        : entry,
    );
    candidate[indexField] = null;
    assert.throws(() => CorridorCandidateSchema.parse(candidate));
    candidate[profileField] = "UNKNOWN";
    assert.doesNotThrow(() => CorridorCandidateSchema.parse(candidate));
  }
});

test("incomplete comparison blocks corridor-level review recommendation", () => {
  const plan: any = structuredClone(SYNTHETIC_E7_CORRIDOR_PLANS[0]);
  const candidate = plan.candidates[1];
  candidate.evidence = candidate.evidence.map((entry: any) =>
    entry.dimension === "OPERATING_COST"
      ? { dimension: "OPERATING_COST", state: "MISSING", evidenceRefs: [] }
      : entry,
  );
  candidate.operatingCostFeasibilityIndex = null;
  const model = createStage4CorridorPlanningReadModel(plan);
  assert.equal(model.boundedExpansionRecommendation.state, "RESEARCH_MORE");
  assert.equal(model.boundedExpansionRecommendation.candidateId, null);
  assert.equal(
    model.candidates.find((item) => item.candidateId === candidate.candidateId)
      ?.readinessScoreBasisPoints,
    null,
  );
});

test("configurable synthetic review threshold can hold a complete corridor without authorizing anything", () => {
  const plan: any = structuredClone(SYNTHETIC_E7_CORRIDOR_PLANS[0]);
  plan.reviewPolicy.readinessThresholdBasisPoints = 9_000;
  const model = createStage4CorridorPlanningReadModel(plan);
  assert.equal(model.boundedExpansionRecommendation.state, "HOLD");
  assert.equal(model.boundedExpansionRecommendation.candidateId, null);
  assert.equal(model.boundedExpansionRecommendation.expansionAuthorized, false);
});

test("existing Hub references are tenant, region and PartnerFI scoped", () => {
  const source: any = structuredClone(SYNTHETIC_E7_CORRIDOR_PLANS[0]);
  const wrongRegion = structuredClone(source);
  wrongRegion.candidates[0].regionId = SYNTHETIC_REGION_IDS.ADAMA;
  assert.throws(
    () => createStage4CorridorPlanningReadModel(wrongRegion),
    /CORRIDOR_PLAN_CANDIDATE_REGION_MISMATCH/,
  );

  const betaPlan: any = structuredClone(SYNTHETIC_E7_CORRIDOR_PLANS[1]);
  betaPlan.regionIds = [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI];
  betaPlan.candidates[0].regionId = SYNTHETIC_REGION_IDS.ARISI;
  betaPlan.candidates[0].existingHubRef = SYNTHETIC_HUB_IDS.ARISI_ALPHA;
  assert.throws(
    () => createStage4CorridorPlanningReadModel(betaPlan),
    /CORRIDOR_PLAN_CANDIDATE_PARTNER_SCOPE_MISMATCH/,
  );
});

test("corridor plan anchor fails closed across tenant and nonmember PartnerFI scope", () => {
  const source: any = structuredClone(SYNTHETIC_E7_CORRIDOR_PLANS[0]);
  assert.throws(
    () =>
      createStage4CorridorPlanningReadModel({
        ...source,
        tenantId: SYNTHETIC_HUB_TENANT_IDS.DENIAL,
      }),
    /CORRIDOR_PLAN_ANCHOR_SCOPE_MISMATCH/,
  );
  assert.throws(
    () =>
      createStage4CorridorPlanningReadModel({
        ...source,
        partnerOrgId: SYNTHETIC_PARTNER_IDS.GATEWAY_GAMMA,
      }),
    /CORRIDOR_PLAN_PARTNER_SCOPE_MISMATCH/,
  );
});

test("shared-Hub corridor search remains PartnerFI-isolated", () => {
  const alphaResults = searchStage4CorridorPlanning({
    readModels: SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    anchorHubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
  });
  const betaResults = searchStage4CorridorPlanning({
    readModels: SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    anchorHubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
  });
  assert.equal(alphaResults.length, 1);
  assert.equal(betaResults.length, 1);
  assert.equal(alphaResults[0].partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA);
  assert.equal(betaResults[0].partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA);
});

test("corridor planning digest is deterministic and schema-valid tampering fails verification", () => {
  const regenerated = createStage4CorridorPlanningReadModel(
    SYNTHETIC_E7_CORRIDOR_PLANS[0],
  );
  assert.deepEqual(regenerated, alpha);
  assert.equal(
    verifyStage4CorridorPlanningReadModel(alpha).planningDigest,
    alpha.planningDigest,
  );
  assert.throws(
    () =>
      verifyStage4CorridorPlanningReadModel({
        ...alpha,
        boundedExpansionRecommendation: {
          ...alpha.boundedExpansionRecommendation,
          state: "HOLD",
          candidateId: null,
          reasonCodes: ["READINESS_BELOW_REVIEW_THRESHOLD"],
        },
      }),
    /CORRIDOR_PLAN_DIGEST_MISMATCH/,
  );
});

test("E7 read boundary exposes no real corridor evidence or activation authority", () => {
  for (const model of SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS) {
    assert.equal(model.readBoundary.stage, "STAGE_4");
    assert.equal(model.readBoundary.syntheticOnly, true);
    assert.equal(model.readBoundary.readOnly, true);
    assert.equal(model.readBoundary.exactCoordinatesPresent, false);
    assert.equal(model.readBoundary.realPartnerCommitmentsPresent, false);
    assert.equal(model.readBoundary.realDemandDataPresent, false);
    assert.equal(model.readBoundary.realConnectivityDataPresent, false);
    assert.equal(model.readBoundary.realLogisticsDataPresent, false);
    assert.equal(model.readBoundary.realLiquidityDataPresent, false);
    assert.equal(model.readBoundary.realOperatingCostDataPresent, false);
    assert.equal(model.readBoundary.externalEvidenceAccepted, false);
    assert.equal(model.readBoundary.realFundsIncluded, false);
    assert.equal(model.readBoundary.recommendationCreatesAuthority, false);
    assert.equal(model.readBoundary.geographicAuthorizationGranted, false);
    assert.equal(model.readBoundary.regulatedPilotAuthorityGranted, false);
  }
});
