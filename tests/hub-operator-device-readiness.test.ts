import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "../src/domain/hub";
import {
  SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS,
  SYNTHETIC_E8_READINESS_PLANS,
  createStage4HubOperatorDeviceReadinessReadModel,
  searchStage4HubOperatorDeviceReadiness,
  verifyStage4HubOperatorDeviceReadinessReadModel,
} from "../src/domain/hubOperatorDeviceReadiness";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";

const alpha = SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS.find(
  (item) =>
    item.hubId === SYNTHETIC_HUB_IDS.ADAMA_SHARED &&
    item.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
);
assert.ok(alpha);

const beta = SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS.find(
  (item) =>
    item.hubId === SYNTHETIC_HUB_IDS.ADAMA_SHARED &&
    item.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
);
assert.ok(beta);

const arisi = SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS.find(
  (item) => item.hubId === SYNTHETIC_HUB_IDS.ARISI_ALPHA,
);
assert.ok(arisi);

test("E8 derives governed training, certification and refresher states", () => {
  const agent = alpha.operatorReadiness.find(
    (item) => item.operatorAssignmentId === "hubop_syn_adama_alpha_agents",
  );
  const supervisor = alpha.operatorReadiness.find(
    (item) => item.operatorAssignmentId === "hubop_syn_adama_alpha_supervisor",
  );
  const operations = alpha.operatorReadiness.find(
    (item) => item.operatorAssignmentId === "hubop_syn_adama_alpha_operations",
  );
  assert.ok(agent && supervisor && operations);
  assert.equal(agent.trainingCompletionState, "COMPLETE");
  assert.equal(agent.certificationState, "CURRENT");
  assert.equal(agent.refresherState, "NOT_REQUIRED");
  assert.equal(agent.operationalReadinessState, "READY_SYNTHETIC");
  assert.equal(supervisor.certificationState, "EXPIRING_SOON");
  assert.equal(supervisor.refresherState, "DUE_SOON");
  assert.equal(supervisor.operationalReadinessState, "REFRESHER_REQUIRED");
  assert.equal(operations.trainingCompletionState, "PARTIAL");
  assert.equal(operations.certificationState, "NOT_CERTIFIED");
  assert.equal(operations.operationalReadinessState, "TRAINING_REQUIRED");
});

test("training readiness never creates financial, provider or regulated authority", () => {
  for (const model of SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS) {
    for (const operator of model.operatorReadiness) {
      assert.deepEqual(operator.authority, {
        readinessCreatesFinancialAuthority: false,
        trainingCreatesProviderAuthority: false,
        regulatedAuthorityGranted: false,
      });
    }
    assert.equal(model.readBoundary.trainingCreatesFinancialAuthority, false);
    assert.equal(model.readBoundary.certificationCreatesFinancialAuthority, false);
    assert.equal(model.readBoundary.regulatedAuthorityGranted, false);
  }
});

test("device readiness remains evidence-only with no remote control surface", () => {
  const terminal = alpha.deviceReadiness.find(
    (item) => item.deviceId === "hubdev_syn_adama_terminal_001",
  );
  const gateway = alpha.deviceReadiness.find(
    (item) => item.deviceId === "hubdev_syn_adama_connectivity_001",
  );
  assert.ok(terminal && gateway);
  assert.equal(terminal.readinessState, "READY_SYNTHETIC");
  assert.equal(gateway.readinessState, "NEEDS_REVIEW");
  for (const device of alpha.deviceReadiness) {
    assert.deepEqual(device.authority, {
      remoteControlEnabled: false,
      providerCommandEnabled: false,
      firmwareMutationEnabled: false,
    });
  }
  assert.equal(alpha.readBoundary.productionDeviceControlEnabled, false);
  assert.equal(alpha.readBoundary.remoteCommandsEnabled, false);
  assert.equal(alpha.readBoundary.realDeviceTelemetryPresent, false);
});

test("shared-Hub readiness stays PartnerFI-isolated while shared infrastructure is explicit", () => {
  const alphaResults = searchStage4HubOperatorDeviceReadiness({
    readModels: SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
  });
  const betaResults = searchStage4HubOperatorDeviceReadiness({
    readModels: SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS,
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
  });
  assert.equal(alphaResults.length, 1);
  assert.equal(betaResults.length, 1);
  assert.equal(
    betaResults[0].operatorReadiness.every((item) =>
      item.operatorAssignmentId.includes("_beta_"),
    ),
    true,
  );
  assert.equal(
    betaResults[0].deviceReadiness.some(
      (item) => item.deviceId === "hubdev_syn_adama_terminal_001",
    ),
    false,
  );
  assert.equal(
    betaResults[0].deviceReadiness.every(
      (item) => item.visibility === "SHARED_HUB_INFRASTRUCTURE",
    ),
    true,
  );
});

test("expired certification and open escalation block return-to-service", () => {
  const operator = arisi.operatorReadiness[0];
  const review = arisi.returnToServiceReviews[0];
  assert.equal(operator.certificationState, "EXPIRED");
  assert.equal(operator.operationalReadinessState, "SUSPENDED_REVIEW_REQUIRED");
  assert.equal(arisi.overallState, "BLOCKED");
  assert.equal(review.state, "BLOCKED");
  assert.deepEqual(review.missingPrerequisites, [
    "CERTIFICATION_CURRENT",
    "SUPPORT_ESCALATION_CLOSED",
  ]);
  assert.equal(review.reviewRequired, true);
  assert.equal(review.mutationEnabled, false);
  assert.equal(review.automaticReturnToService, false);
  assert.equal(review.requiresFutureAuthorization, true);
});

test("even when suspended return-to-service prerequisites clear, E8 requires future review rather than auto-reactivation", () => {
  const plan: any = structuredClone(SYNTHETIC_E8_READINESS_PLANS[2]);
  plan.trainingAssignments[0].certificationExpiresAt = "2027-09-30T23:59:59.000Z";
  plan.supportEvidence[0].state = "CLOSED_SYNTHETIC";
  plan.supportEvidence[0].escalationState = "REVIEW_COMPLETE_SYNTHETIC";
  const model = createStage4HubOperatorDeviceReadinessReadModel(plan);
  const review = model.returnToServiceReviews[0];
  assert.equal(review.state, "REVIEW_REQUIRED");
  assert.deepEqual(review.missingPrerequisites, []);
  assert.equal(review.mutationEnabled, false);
  assert.equal(review.automaticReturnToService, false);
  assert.equal(review.requiresFutureAuthorization, true);
});

test("readiness plans fail closed across tenant, PartnerFI, operator and assigned-device scope", () => {
  const source: any = structuredClone(SYNTHETIC_E8_READINESS_PLANS[0]);
  assert.throws(
    () =>
      createStage4HubOperatorDeviceReadinessReadModel({
        ...source,
        tenantId: SYNTHETIC_HUB_TENANT_IDS.DENIAL,
      }),
    /HUB_READINESS_HUB_SCOPE_MISMATCH/,
  );
  assert.throws(
    () =>
      createStage4HubOperatorDeviceReadinessReadModel({
        ...source,
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      }),
    /HUB_READINESS_OPERATOR_SCOPE_MISMATCH/,
  );

  const badOperator: any = structuredClone(source);
  badOperator.trainingAssignments[0].operatorAssignmentId =
    "hubop_syn_adama_beta_agents";
  assert.throws(
    () => createStage4HubOperatorDeviceReadinessReadModel(badOperator),
    /HUB_READINESS_OPERATOR_SCOPE_MISMATCH/,
  );

  const badDevice: any = structuredClone(source);
  badDevice.trainingAssignments[1].authorizedDeviceRefs = [
    "hubdev_syn_adama_terminal_001",
  ];
  assert.throws(
    () => createStage4HubOperatorDeviceReadinessReadModel(badDevice),
    /HUB_READINESS_AUTHORIZED_DEVICE_ASSIGNMENT_MISMATCH/,
  );
});

test("support references must resolve and cannot cross PartnerFI operator scope", () => {
  const source: any = structuredClone(SYNTHETIC_E8_READINESS_PLANS[0]);
  source.trainingAssignments[0].supportRefs = ["support_syn_missing_case"];
  assert.throws(
    () => createStage4HubOperatorDeviceReadinessReadModel(source),
    /HUB_READINESS_SUPPORT_REFERENCE_UNKNOWN/,
  );

  const betaSource: any = structuredClone(SYNTHETIC_E8_READINESS_PLANS[1]);
  betaSource.supportEvidence[0].operatorAssignmentId =
    "hubop_syn_adama_alpha_agents";
  assert.throws(
    () => createStage4HubOperatorDeviceReadinessReadModel(betaSource),
    /HUB_READINESS_SUPPORT_OPERATOR_SCOPE_MISMATCH/,
  );
});

test("readiness digest is deterministic and schema-valid tampering fails verification", () => {
  const regenerated = createStage4HubOperatorDeviceReadinessReadModel(
    SYNTHETIC_E8_READINESS_PLANS[0],
  );
  assert.deepEqual(regenerated, alpha);
  assert.equal(
    verifyStage4HubOperatorDeviceReadinessReadModel(alpha).readinessDigest,
    alpha.readinessDigest,
  );
  assert.throws(
    () =>
      verifyStage4HubOperatorDeviceReadinessReadModel({
        ...alpha,
        overallState: "READY_SYNTHETIC",
      }),
    /HUB_READINESS_DIGEST_MISMATCH/,
  );
});

test("E8 read boundary exposes neither real operator/device evidence nor funds/posting/settlement authority", () => {
  for (const model of SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS) {
    assert.equal(model.readBoundary.stage, "STAGE_4");
    assert.equal(model.readBoundary.syntheticOnly, true);
    assert.equal(model.readBoundary.readOnly, true);
    assert.equal(model.readBoundary.realOperatorIdentityPresent, false);
    assert.equal(model.readBoundary.realDeviceTelemetryPresent, false);
    assert.equal(model.readBoundary.realSupportTicketingIntegrated, false);
    assert.equal(model.readBoundary.automaticReturnToServiceEnabled, false);
    assert.equal(model.readBoundary.realFundsIncluded, false);
    assert.equal(model.readBoundary.partnerPostingAuthorityGranted, false);
    assert.equal(model.readBoundary.settlementAuthorityGranted, false);
  }
});
