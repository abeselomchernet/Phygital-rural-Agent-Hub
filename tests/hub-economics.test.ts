import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "../src/domain/hub";
import {
  HubEconomicsEvidenceClassSchema,
  SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS,
  SYNTHETIC_E5_HUB_ECONOMICS_SCENARIOS,
  createStage4HubEconomicsReadModel,
  searchHubEconomics,
  verifyStage4HubEconomicsReadModel,
} from "../src/domain/hubEconomics";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";

const alpha = SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS.find(
  (item) => item.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
);
assert.ok(alpha);

const beta = SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS.find(
  (item) => item.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
);
assert.ok(beta);

test("E5 preserves the four governed evidence labels while Stage 4 exposes model classes only", () => {
  assert.deepEqual(HubEconomicsEvidenceClassSchema.options, [
    "MODEL_ASSUMPTION",
    "MODEL_OUTPUT",
    "OBSERVED",
    "EXTERNALLY_VERIFIED",
  ]);
  for (const model of SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS) {
    assert.deepEqual(model.evidenceClassAvailability, {
      MODEL_ASSUMPTION: true,
      MODEL_OUTPUT: true,
      OBSERVED: false,
      EXTERNALLY_VERIFIED: false,
    });
    assert.equal(model.readBoundary.modelIsObservedPerformance, false);
    assert.equal(model.readBoundary.forecastAccuracyClaimed, false);
    assert.equal(model.readBoundary.accountingTruthClaimed, false);
    assert.equal(model.readBoundary.observedPilotEvidencePresent, false);
    assert.equal(model.readBoundary.externalVerificationPresent, false);
  }
});

test("Alpha revenue attribution and cost outputs are deterministic integer arithmetic", () => {
  assert.equal(alpha.revenueAttribution.length, 4);
  assert.equal(alpha.variableCostOutputs.length, 4);
  assert.equal(alpha.totals.modeledRevenueMinor, 500_000);
  assert.equal(alpha.totals.modeledVariableCostMinor, 111_000);
  assert.equal(alpha.totals.modeledFixedCostMinor, 1_400_000);
  assert.equal(alpha.totals.modeledTotalCostMinor, 1_511_000);
  assert.equal(alpha.totals.modeledMarginMinor, -1_011_000);
  assert.equal(alpha.totals.currency, "ETB");
  assert.equal(alpha.totals.evidenceClass, "MODEL_OUTPUT");
  assert.equal(alpha.totals.confidence, "SYNTHETIC_MODEL_ONLY");

  const cashIn = alpha.revenueAttribution.find(
    (item) => item.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
  );
  assert.ok(cashIn);
  assert.equal(cashIn.monthlyVolume, 400);
  assert.equal(cashIn.unitRevenueMinor, 500);
  assert.equal(cashIn.modeledRevenueMinor, 200_000);
  assert.equal(cashIn.volumeEvidenceClass, "MODEL_ASSUMPTION");
  assert.equal(cashIn.revenueEvidenceClass, "MODEL_OUTPUT");
  assert.equal(cashIn.confidence, "SYNTHETIC_MODEL_ONLY");
});

test("fixed costs keep fixed/variable and shareable/non-shareable semantics distinct", () => {
  assert.deepEqual(
    alpha.fixedCostClassification.map((item) => [
      item.behavior,
      item.sharingClass,
      item.evidenceClass,
    ]),
    [
      ["FIXED", "SHAREABLE", "MODEL_ASSUMPTION"],
      ["FIXED", "NON_SHAREABLE", "MODEL_ASSUMPTION"],
    ],
  );
  assert.equal(
    alpha.variableCostOutputs.every(
      (item) =>
        item.behavior === "VARIABLE" &&
        item.unitCostEvidenceClass === "MODEL_ASSUMPTION" &&
        item.costEvidenceClass === "MODEL_OUTPUT",
    ),
    true,
  );
});

test("model-vs-observed variance remains unavailable rather than fabricating pilot observations", () => {
  assert.deepEqual(alpha.modelVsObservedVariance, {
    status: "NOT_AVAILABLE_STAGE4",
    modeledMarginMinor: -1_011_000,
    observedMarginMinor: null,
    varianceMinor: null,
    observedEvidenceRefs: [],
    reason: "Stage-4 synthetic model outputs are not observed pilot performance.",
  });
});

test("shared-Hub economics are PartnerFI-isolated", () => {
  const alphaResults = searchHubEconomics({
    readModels: SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
  });
  const betaResults = searchHubEconomics({
    readModels: SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
  });
  assert.equal(alphaResults.length, 1);
  assert.equal(betaResults.length, 1);
  assert.equal(
    alphaResults[0].revenueAttribution.every((item) => item.serviceId.startsWith("svc_alpha_")),
    true,
  );
  assert.equal(
    betaResults[0].revenueAttribution.every((item) => item.serviceId.startsWith("svc_beta_")),
    true,
  );
});

test("E5 refuses service economics for a service not governed at that Hub/PartnerFI", () => {
  const source = SYNTHETIC_E5_HUB_ECONOMICS_SCENARIOS[0];
  assert.throws(
    () =>
      createStage4HubEconomicsReadModel({
        ...source,
        scenarioId: "hubecon_syn_invalid_service",
        serviceAssumptions: [
          {
            ...source.serviceAssumptions[0],
            serviceId: SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
          },
        ],
      }),
    /HUB_ECONOMICS_SERVICE_NOT_GOVERNED/,
  );
});

test("E5 refuses cross-tenant and nonmember PartnerFI scenario scope", () => {
  const source = SYNTHETIC_E5_HUB_ECONOMICS_SCENARIOS[0];
  assert.throws(
    () =>
      createStage4HubEconomicsReadModel({
        ...source,
        scenarioId: "hubecon_syn_wrong_tenant",
        tenantId: "tenant_syn_denial",
      }),
    /HUB_ECONOMICS_HUB_SCOPE_MISMATCH/,
  );
  assert.throws(
    () =>
      createStage4HubEconomicsReadModel({
        ...source,
        scenarioId: "hubecon_syn_wrong_partner",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.GATEWAY_GAMMA,
      }),
    /HUB_ECONOMICS_PARTNER_SCOPE_MISMATCH/,
  );
});

test("economics digest is deterministic and schema-valid tampering fails verification", () => {
  const regenerated = createStage4HubEconomicsReadModel(
    SYNTHETIC_E5_HUB_ECONOMICS_SCENARIOS[0],
  );
  assert.deepEqual(regenerated, alpha);
  assert.equal(verifyStage4HubEconomicsReadModel(alpha).economicsDigest, alpha.economicsDigest);

  assert.throws(
    () =>
      verifyStage4HubEconomicsReadModel({
        ...alpha,
        totals: {
          ...alpha.totals,
          modeledMarginMinor: alpha.totals.modeledMarginMinor + 1,
        },
      }),
    /HUB_ECONOMICS_DIGEST_MISMATCH/,
  );
});

test("E5 read boundary grants no funds, posting or settlement authority", () => {
  for (const model of SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS) {
    assert.equal(model.readBoundary.stage, "STAGE_4");
    assert.equal(model.readBoundary.syntheticOnly, true);
    assert.equal(model.readBoundary.readOnly, true);
    assert.equal(model.readBoundary.realFundsIncluded, false);
    assert.equal(model.readBoundary.partnerPostingAuthorityGranted, false);
    assert.equal(model.readBoundary.settlementAuthorityGranted, false);
  }
});
