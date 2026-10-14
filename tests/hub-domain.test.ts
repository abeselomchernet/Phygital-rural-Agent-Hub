import assert from "node:assert/strict";
import test from "node:test";
import {
  HubDeviceSchema,
  HubOperatorSchema,
  HubPartnerMembershipSchema,
  HubSchema,
  SYNTHETIC_HUB_IDS,
  hubIdsForAccessContext,
  isHubReadAuthorized,
  isStage4HubLifecycleStateAllowed,
  syntheticHubDevices,
  syntheticHubOperators,
  syntheticHubPartnerMemberships,
  syntheticHubs,
  validateSyntheticHubGraph,
} from "../src/domain/hubDomain";
import { SYNTHETIC_PARTNER_IDS, SYNTHETIC_REGION_IDS } from "../src/domain/syntheticReferencePartners";
import { SyntheticAuthError, SyntheticAuthService } from "../src/server/auth";

function expectAuthError(fn: () => unknown, code: string) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof SyntheticAuthError);
    assert.equal(error.code, code);
    assert.equal(error.status, 403);
    return true;
  });
}

test("E1 synthetic Hub graph is strict, internally linked and authority-locked", () => {
  assert.equal(validateSyntheticHubGraph(), true);
  assert.equal(syntheticHubs.length, 2);
  assert.equal(syntheticHubOperators.length, 2);
  assert.equal(syntheticHubDevices.length, 2);
  assert.equal(syntheticHubPartnerMemberships.length, 3);

  for (const hub of syntheticHubs) {
    assert.equal(HubSchema.safeParse(hub).success, true);
    assert.equal(isStage4HubLifecycleStateAllowed(hub.lifecycleState), true);
    assert.equal(hub.dataMode, "SYNTHETIC_ONLY");
    assert.equal(hub.realFundsAllowed, false);
    assert.equal(hub.realCashCustodyAllowed, false);
    assert.equal(hub.regulatedAuthorityGranted, false);
    assert.match(hub.locationReference, /^SYNTHETIC_LOCATION_/);
  }
  for (const operator of syntheticHubOperators)
    assert.equal(HubOperatorSchema.safeParse(operator).success, true);
  for (const device of syntheticHubDevices) {
    assert.equal(HubDeviceSchema.safeParse(device).success, true);
    assert.equal(device.containsRealCustomerData, false);
  }
  for (const membership of syntheticHubPartnerMemberships) {
    assert.equal(HubPartnerMembershipSchema.safeParse(membership).success, true);
    assert.equal(membership.activationState, "SIMULATION_ONLY");
    assert.match(membership.authorityBoundary, /grants no real/i);
  }
});

test("Stage 4 policy does not treat later Hub lifecycle states as usable", () => {
  assert.equal(isStage4HubLifecycleStateAllowed("SYNTHETIC_READY"), true);
  assert.equal(isStage4HubLifecycleStateAllowed("STAGING_READY"), false);
  assert.equal(isStage4HubLifecycleStateAllowed("PILOT_AUTHORIZED"), false);
  assert.equal(isStage4HubLifecycleStateAllowed("PILOT_ACTIVE"), false);
});

test("Hub visibility is object- and region-scoped for synthetic principals", () => {
  const agentContext = {
    userId: "synthetic-agent-01",
    role: "AGENT" as const,
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
  };
  assert.deepEqual(hubIdsForAccessContext(agentContext), [SYNTHETIC_HUB_IDS.ADAMA_A]);
  assert.equal(isHubReadAuthorized(agentContext, SYNTHETIC_HUB_IDS.ADAMA_A), true);
  assert.equal(isHubReadAuthorized(agentContext, SYNTHETIC_HUB_IDS.ARISI_A), false);

  const partnerAdminContext = {
    userId: "synthetic-partner-admin-01",
    role: "PARTNER_ADMIN" as const,
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
  };
  assert.deepEqual(hubIdsForAccessContext(partnerAdminContext), [SYNTHETIC_HUB_IDS.ADAMA_A]);
  assert.equal(isHubReadAuthorized(partnerAdminContext, SYNTHETIC_HUB_IDS.ARISI_A), false);
});

test("server auth session enforces Hub allow-list in addition to domain scope", () => {
  const auth = new SyntheticAuthService();
  const session = auth.createSession("AGENT", []);
  const view = auth.view(session);
  assert.deepEqual(view.allowedHubIds, [SYNTHETIC_HUB_IDS.ADAMA_A]);
  auth.requireHub(session, SYNTHETIC_HUB_IDS.ADAMA_A);
  expectAuthError(() => auth.requireHub(session, SYNTHETIC_HUB_IDS.ARISI_A), "OBJECT_ACCESS_DENIED");

  const narrowed = auth.createSession("SUPERVISOR", [], undefined, undefined, []);
  assert.deepEqual(auth.view(narrowed).allowedHubIds, []);
  expectAuthError(() => auth.requireHub(narrowed, SYNTHETIC_HUB_IDS.ADAMA_A), "OBJECT_ACCESS_DENIED");
});

test("Hub partner membership does not collapse service, capability and route", () => {
  const membership = syntheticHubPartnerMemberships.find(
    (entry) => entry.membershipId === "hubmem_syn_adama_alpha",
  );
  assert.ok(membership);
  assert.deepEqual(membership.capabilityIds, ["FIN.ACCOUNT_LOOKUP", "LIQ.NLC_READ"]);
  assert.equal(membership.serviceIds.every((id) => id.startsWith("svc_")), true);
  assert.equal(membership.routeIds.every((id) => id.startsWith("route_")), true);
  assert.equal(new Set([...membership.serviceIds, ...membership.routeIds, ...membership.capabilityIds]).size,
    membership.serviceIds.length + membership.routeIds.length + membership.capabilityIds.length);
});
