import assert from "node:assert/strict";
import test from "node:test";
import {
  PartnerOrganizationSchema,
  RouteProvenanceSchema,
  partnerEcosystemSummary,
  routeProvenanceLabel,
  syntheticPartnerOrganizations,
  syntheticRouteProvenance,
} from "../src/domain/partnerEcosystem";

test("synthetic partner organizations satisfy the governed Stage 3 schema", () => {
  assert.equal(syntheticPartnerOrganizations.length, 8);
  for (const partner of syntheticPartnerOrganizations) {
    assert.equal(PartnerOrganizationSchema.safeParse(partner).success, true);
    assert.match(partner.partnerOrgId, /^synthetic-/);
    assert.equal(partner.approvalEffectiveAt, null);
    assert.equal(partner.approvalExpiresAt, null);
    assert.equal(partner.operationalContactRef, "NOT_STORED_IN_SYNTHETIC_FIXTURE");
    assert.equal(partner.incidentContactRef, "NOT_STORED_IN_SYNTHETIC_FIXTURE");
  }
});

test("capability switches remain evidence-gated rather than implied by code presence", () => {
  const summary = partnerEcosystemSummary();
  assert.equal(summary.partnerOrganizations, 8);
  assert.equal(summary.sandboxBounded, 1);
  assert.equal(summary.simulationOnly, 1);
  assert.ok(summary.disabled > 0);

  const partnerFi = syntheticPartnerOrganizations.find(
    (partner) => partner.partnerClass === "FINANCIAL_INSTITUTION",
  );
  assert.ok(partnerFi);
  assert.deepEqual(
    partnerFi.capabilitySwitches.map((entry) => entry.state),
    ["DISABLED", "DISABLED", "DISABLED"],
  );

  const arifPay = syntheticPartnerOrganizations.find(
    (partner) => partner.partnerOrgId === "synthetic-arifpay-sandbox",
  );
  assert.ok(arifPay);
  assert.equal(
    arifPay.capabilitySwitches.find((entry) => entry.capability === "ARIFPAY_C2B")?.state,
    "SANDBOX_BOUNDED",
  );
});

test("direct Telebirr and M-PESA payment initiation remain disabled", () => {
  for (const [partnerOrgId, capability] of [
    ["synthetic-telebirr-direct", "TELEBIRR_DIRECT_C2B"],
    ["synthetic-mpesa-ethiopia", "MPESA_ETHIOPIA_DIRECT_C2B"],
  ] as const) {
    const partner = syntheticPartnerOrganizations.find(
      (entry) => entry.partnerOrgId === partnerOrgId,
    );
    assert.ok(partner);
    assert.equal(
      partner.capabilitySwitches.find((entry) => entry.capability === capability)?.state,
      "DISABLED",
    );
  }
});

test("cash fleet is planning-only and cannot imply dispatch or custody authority", () => {
  const fleet = syntheticPartnerOrganizations.find(
    (partner) => partner.partnerClass === "CASH_LOGISTICS_FLEET",
  );
  assert.ok(fleet);
  assert.equal(
    fleet.capabilitySwitches.find((entry) => entry.capability === "FLEET_ROUTE_PLANNING")?.state,
    "SIMULATION_ONLY",
  );
  assert.equal(
    fleet.capabilitySwitches.find((entry) => entry.capability === "FLEET_DISPATCH")?.state,
    "DISABLED",
  );
  assert.equal(
    fleet.capabilitySwitches.find((entry) => entry.capability === "FLEET_CASH_HANDOVER")?.state,
    "DISABLED",
  );
});

test("route provenance keeps direct provider routes distinct and carries authority boundaries", () => {
  assert.equal(syntheticRouteProvenance.length, 3);
  for (const route of syntheticRouteProvenance) {
    assert.equal(RouteProvenanceSchema.safeParse(route).success, true);
    assert.match(routeProvenanceLabel(route), / -> .* -> .* -> Enawuga transaction$/);
    assert.ok(route.authorityBoundary.length > 0);
  }

  const telebirr = syntheticRouteProvenance.find(
    (route) => route.routeId === "synthetic-route-telebirr-direct",
  );
  const mpesa = syntheticRouteProvenance.find(
    (route) => route.routeId === "synthetic-route-mpesa-ethiopia-direct",
  );
  assert.ok(telebirr);
  assert.ok(mpesa);
  assert.notEqual(telebirr.integrationRoute, mpesa.integrationRoute);
  assert.equal(telebirr.state, "DISABLED");
  assert.equal(mpesa.state, "DISABLED");
});
