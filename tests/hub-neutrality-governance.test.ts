import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "../src/domain/hub";
import {
  SYNTHETIC_E9_NEUTRALITY_PLAN,
  SYNTHETIC_E9_NEUTRALITY_READ_MODEL,
  SYNTHETIC_E9_NEUTRALITY_READ_MODELS,
  compareRouteNeutralityParticipants,
  createStage4HubNeutralityGovernanceReadModel,
  searchStage4HubNeutralityGovernance,
  verifyStage4HubNeutralityGovernanceReadModel,
} from "../src/domain/hubNeutralityGovernance";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";

test("E9 publishes all required versioned neutrality rules with contiguous synthetic change history", () => {
  const model = SYNTHETIC_E9_NEUTRALITY_READ_MODEL;
  assert.equal(model.policy.policyVersion, 2);
  assert.equal(model.policy.rules.length, 7);
  assert.deepEqual(
    new Set(model.policy.rules.map((rule) => rule.key)),
    new Set([
      "NO_UNAUTHORIZED_PREFERENTIAL_ROUTING",
      "ROUTE_PROVENANCE_REQUIRED",
      "PARTNER_EQUIVALENCE_REVIEW",
      "CONTRACT_SCOPE_PRECEDENCE",
      "POLICY_CHANGE_REVIEW_REQUIRED",
      "CONFLICT_DISCLOSURE_REQUIRED",
      "CUSTOMER_DATA_ISOLATION_REQUIRED",
    ]),
  );
  assert.equal(model.changeHistory.length, 1);
  assert.equal(model.changeHistory[0].fromPolicyVersion, 1);
  assert.equal(model.changeHistory[0].toPolicyVersion, 2);
  assert.equal(model.changeHistory[0].reviewState, "ACCEPTED_SYNTHETIC");
  assert.equal(model.changeHistory[0].productionEffect, false);
  assert.equal(model.changeHistory[0].routingMutationAuthorized, false);
});

test("shared Account Lookup routes are equivalent for synthetic governance review but never interchangeable", () => {
  const check = SYNTHETIC_E9_NEUTRALITY_READ_MODEL.routeEquivalenceChecks.find(
    (item) => item.checkId === "route_equivalence_syn_adama_account_lookup",
  );
  assert.ok(check);
  assert.equal(check.left.capabilityId, "FIN.ACCOUNT_LOOKUP");
  assert.equal(check.right.capabilityId, "FIN.ACCOUNT_LOOKUP");
  assert.equal(check.left.routeId, SYNTHETIC_ROUTE_IDS.ALPHA_CORE);
  assert.equal(check.right.routeId, SYNTHETIC_ROUTE_IDS.BETA_CORE);
  assert.equal(check.result, "EQUIVALENT_FOR_SYNTHETIC_REVIEW");
  assert.deepEqual(check.differenceCodes, []);
  assert.equal(check.routeInterchangeable, false);
  assert.equal(check.fallbackAuthorized, false);
  assert.equal(check.automaticRouteSelectionAuthorized, false);
  assert.equal(
    check.equivalenceMeaning,
    "GOVERNANCE_ELIGIBILITY_COMPARISON_ONLY_NOT_PROVIDER_OR_ROUTE_INTERCHANGEABILITY",
  );
});

test("different capabilities are NOT_COMPARABLE rather than forced into false route equivalence", () => {
  const check = SYNTHETIC_E9_NEUTRALITY_READ_MODEL.routeEquivalenceChecks.find(
    (item) =>
      item.checkId ===
      "route_equivalence_syn_adama_noncomparable_financial_services",
  );
  assert.ok(check);
  assert.equal(check.left.serviceId, SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN);
  assert.equal(check.right.serviceId, SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST);
  assert.equal(check.result, "NOT_COMPARABLE");
  assert.deepEqual(check.differenceCodes, ["CAPABILITY_MISMATCH"]);
  assert.equal(check.fallbackAuthorized, false);
});

test("same-capability policy differences require review without authorizing fallback", () => {
  const base = SYNTHETIC_E9_NEUTRALITY_READ_MODEL.routeEquivalenceChecks.find(
    (item) => item.checkId === "route_equivalence_syn_adama_account_lookup",
  );
  assert.ok(base);
  const right = structuredClone(base.right);
  right.offlinePolicy = "DENY_OFFLINE";
  const comparison = compareRouteNeutralityParticipants({
    checkId: "route_equivalence_syn_test_offline_difference",
    targetRegionId: base.targetRegionId,
    left: base.left,
    right,
    evidenceRefs: ["EV-SYN-E9-TEST-OFFLINE-DIFFERENCE"],
  });
  assert.equal(comparison.result, "DIFFERENCE_REQUIRES_REVIEW");
  assert.deepEqual(comparison.differenceCodes, ["OFFLINE_POLICY_MISMATCH"]);
  assert.equal(comparison.routeInterchangeable, false);
  assert.equal(comparison.fallbackAuthorized, false);
  assert.equal(comparison.automaticRouteSelectionAuthorized, false);
});

test("unresolved synthetic conflict-of-interest disclosure moves scheme to REVIEW_REQUIRED", () => {
  const plan: any = structuredClone(SYNTHETIC_E9_NEUTRALITY_PLAN);
  plan.conflictFlags[0].state = "DECLARED_SYNTHETIC_REVIEW_REQUIRED";
  plan.conflictFlags[0].incentiveDisclosureState = "DISCLOSED_SYNTHETIC";
  const model = createStage4HubNeutralityGovernanceReadModel(plan);
  assert.equal(model.neutralityState, "REVIEW_REQUIRED");
  assert.equal(model.readBoundary.realCommercialIncentiveDataPresent, false);
  assert.equal(model.readBoundary.commercialAuthorityGranted, false);
});

test("policy version history must reach current version and rule versions must match policy", () => {
  const gap: any = structuredClone(SYNTHETIC_E9_NEUTRALITY_PLAN);
  gap.policy.policyVersion = 3;
  gap.policy.rules = gap.policy.rules.map((rule: any) => ({ ...rule, ruleVersion: 3 }));
  assert.throws(
    () => createStage4HubNeutralityGovernanceReadModel(gap),
    /NEUTRALITY_POLICY_CHANGE_HISTORY_INCOMPLETE/,
  );

  const mismatch: any = structuredClone(SYNTHETIC_E9_NEUTRALITY_PLAN);
  mismatch.policy.rules[0].ruleVersion = 1;
  assert.throws(
    () => createStage4HubNeutralityGovernanceReadModel(mismatch),
    /NEUTRALITY_RULE_VERSION_MISMATCH/,
  );
});

test("route-equivalence comparison fails closed for a nonmember partner or wrong Hub region", () => {
  const nonmember: any = structuredClone(SYNTHETIC_E9_NEUTRALITY_PLAN);
  nonmember.comparisons[0].right.partnerOrgId = SYNTHETIC_PARTNER_IDS.GATEWAY_GAMMA;
  nonmember.comparisons[0].right.serviceId = SYNTHETIC_SERVICE_IDS.GAMMA_C2B;
  assert.throws(
    () => createStage4HubNeutralityGovernanceReadModel(nonmember),
    /NEUTRALITY_COMPARISON_PARTNER_SCOPE_MISMATCH/,
  );

  const wrongRegion: any = structuredClone(SYNTHETIC_E9_NEUTRALITY_PLAN);
  wrongRegion.comparisons[0].targetRegionId = "region_syn_arisi";
  assert.throws(
    () => createStage4HubNeutralityGovernanceReadModel(wrongRegion),
    /NEUTRALITY_COMPARISON_REGION_MISMATCH/,
  );
});

test("governance decisions must resolve to a comparison, change or conflict record", () => {
  const plan: any = structuredClone(SYNTHETIC_E9_NEUTRALITY_PLAN);
  plan.governanceDecisions[0].relatedRef = "unknown-synthetic-governance-ref";
  assert.throws(
    () => createStage4HubNeutralityGovernanceReadModel(plan),
    /NEUTRALITY_DECISION_REFERENCE_UNKNOWN/,
  );
});

test("default synthetic neutrality model identifies no exception without claiming production neutrality", () => {
  const model = SYNTHETIC_E9_NEUTRALITY_READ_MODEL;
  assert.equal(model.neutralityState, "NO_SYNTHETIC_EXCEPTION_IDENTIFIED");
  assert.equal(model.conflictFlags.every((flag) => flag.state === "NONE_IDENTIFIED_SYNTHETIC"), true);
  assert.equal(model.readBoundary.externalAuditEvidencePresent, false);
  assert.equal(model.readBoundary.providerInterchangeabilityClaimed, false);
  assert.equal(model.readBoundary.productionRoutingAuthorityGranted, false);
  assert.equal(model.readBoundary.regulatedAuthorityGranted, false);
});

test("neutrality boundary carries no customer-level cross-partner data or live-money authority", () => {
  const boundary = SYNTHETIC_E9_NEUTRALITY_READ_MODEL.readBoundary;
  assert.equal(boundary.customerLevelRestrictedDataPresent, false);
  assert.equal(boundary.crossPartnerCustomerDataExposed, false);
  assert.equal(boundary.liveRouteMutationEnabled, false);
  assert.equal(boundary.routeFallbackAuthorized, false);
  assert.equal(boundary.liveNetworkAllowed, false);
  assert.equal(boundary.realFundsIncluded, false);
  assert.equal(boundary.settlementAuthorityGranted, false);
  assert.equal(boundary.commercialAuthorityGranted, false);
});

test("neutrality search is tenant and Hub scoped", () => {
  assert.equal(
    searchStage4HubNeutralityGovernance({
      readModels: SYNTHETIC_E9_NEUTRALITY_READ_MODELS,
      tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
      hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    }).length,
    1,
  );
  assert.equal(
    searchStage4HubNeutralityGovernance({
      readModels: SYNTHETIC_E9_NEUTRALITY_READ_MODELS,
      tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
      hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
    }).length,
    0,
  );
});

test("neutrality digest is deterministic and schema-valid tampering fails verification", () => {
  const regenerated = createStage4HubNeutralityGovernanceReadModel(
    SYNTHETIC_E9_NEUTRALITY_PLAN,
  );
  assert.deepEqual(regenerated, SYNTHETIC_E9_NEUTRALITY_READ_MODEL);
  assert.equal(
    verifyStage4HubNeutralityGovernanceReadModel(SYNTHETIC_E9_NEUTRALITY_READ_MODEL)
      .neutralityDigest,
    SYNTHETIC_E9_NEUTRALITY_READ_MODEL.neutralityDigest,
  );
  assert.throws(
    () =>
      verifyStage4HubNeutralityGovernanceReadModel({
        ...SYNTHETIC_E9_NEUTRALITY_READ_MODEL,
        neutralityState: "REVIEW_REQUIRED",
      }),
    /NEUTRALITY_GOVERNANCE_DIGEST_MISMATCH/,
  );
});
