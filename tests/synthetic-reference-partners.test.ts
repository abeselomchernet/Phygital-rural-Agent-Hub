import assert from "node:assert/strict";
import test from "node:test";

import {
  PartnerCapabilityContractSchema,
  PartnerContractCapabilityIdSchema,
  PartnerContractPartnerClassSchema,
  evaluatePartnerCapabilityAccess,
  type PartnerCapabilityContract,
  type PartnerCapabilityPrincipal,
  type PartnerResolvedRoute,
} from "../src/domain/partnerCapabilityContract";
import {
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_FLEET_ETA,
  SYNTHETIC_FMCG_ZETA,
  SYNTHETIC_GATEWAY_GAMMA,
  SYNTHETIC_MOBILE_MONEY_DELTA,
  SYNTHETIC_OBJECT_IDS,
  SYNTHETIC_PARTNERFI_ALPHA,
  SYNTHETIC_PARTNERFI_BETA,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REFERENCE_PARTNERS,
  SYNTHETIC_REFERENCE_PRINCIPALS,
  SYNTHETIC_REFERENCE_ROUTES,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
  SYNTHETIC_TELCO_THETA,
} from "../src/domain/syntheticReferencePartners";

const evaluatedAt = "2026-10-13T20:00:00+00:00";

function allPublishedServices(contract: PartnerCapabilityContract) {
  return [
    ...new Set(contract.capabilityGrants.flatMap((grant) => grant.serviceIds)),
  ];
}

function evidenceFor(
  contract: PartnerCapabilityContract,
  route: PartnerResolvedRoute,
) {
  return [
    ...new Set([
      ...contract.evidenceRefs,
      ...contract.capabilityGrants.flatMap(
        (grant) => grant.activation.evidenceRefs,
      ),
      ...route.evidenceRefs,
    ]),
  ];
}

function evaluate(input: {
  contract: PartnerCapabilityContract;
  principal: PartnerCapabilityPrincipal;
  route: PartnerResolvedRoute;
  serviceId: string;
  capabilityId: Parameters<typeof evaluatePartnerCapabilityAccess>[0]["request"] extends infer _T
    ? string
    : never;
  regionId: string;
  objectId?: string | null;
}) {
  return evaluatePartnerCapabilityAccess({
    contract: input.contract,
    principal: input.principal,
    request: {
      partnerOrgId: input.contract.partnerOrgId,
      serviceId: input.serviceId,
      capabilityId: input.capabilityId,
      regionId: input.regionId,
      routeId: input.route.routeId,
      objectId: input.objectId ?? null,
    },
    context: {
      publishedServiceIds: allPublishedServices(input.contract),
      availableEvidenceRefs: evidenceFor(input.contract, input.route),
      route: input.route,
      evaluatedAt,
    },
  });
}

test("reference partners are strict synthetic contracts covering every current partner class", () => {
  const parsed = SYNTHETIC_REFERENCE_PARTNERS.map((partner) =>
    PartnerCapabilityContractSchema.parse(partner),
  );

  assert.equal(parsed.length, 8);
  assert.equal(new Set(parsed.map((partner) => partner.partnerOrgId)).size, 8);

  const coveredClasses = new Set(parsed.map((partner) => partner.partnerClass));
  for (const partnerClass of PartnerContractPartnerClassSchema.options) {
    assert.equal(
      coveredClasses.has(partnerClass),
      true,
      `missing synthetic reference for ${partnerClass}`,
    );
  }

  assert.equal(
    parsed.filter((partner) => partner.partnerClass === "FINANCIAL_INSTITUTION")
      .length,
    2,
  );
  assert.equal(SYNTHETIC_TELCO_THETA.partnerClass, "TELCO_COMMUNICATIONS");
});

test("Alpha and Beta prove material PartnerFI heterogeneity without institution branches", () => {
  const alphaCapabilities = new Set(
    SYNTHETIC_PARTNERFI_ALPHA.capabilityGrants.map((grant) => grant.capabilityId),
  );
  const betaCapabilities = new Set(
    SYNTHETIC_PARTNERFI_BETA.capabilityGrants.map((grant) => grant.capabilityId),
  );

  assert.equal(alphaCapabilities.has("FIN.CASH_IN_AUTHORIZE"), true);
  assert.equal(alphaCapabilities.has("FIN.CASH_OUT_AUTHORIZE"), true);
  assert.equal(alphaCapabilities.has("LIQ.NLC_READ"), true);
  assert.equal(alphaCapabilities.has("FIN.SAVINGS_INQUIRY"), false);

  assert.equal(betaCapabilities.has("FIN.SAVINGS_INQUIRY"), true);
  assert.equal(betaCapabilities.has("FIN.SERVICE_REQUEST"), true);
  assert.equal(betaCapabilities.has("FIN.CASH_IN_AUTHORIZE"), false);
  assert.equal(betaCapabilities.has("FIN.CASH_OUT_AUTHORIZE"), false);
  assert.deepEqual(SYNTHETIC_PARTNERFI_BETA.regions, [SYNTHETIC_REGION_IDS.ADAMA]);
  assert.equal(SYNTHETIC_PARTNERFI_ALPHA.regions.includes(SYNTHETIC_REGION_IDS.ARISI), true);
});

test("no synthetic partner exposes the entire platform capability vocabulary", () => {
  const totalCapabilities = PartnerContractCapabilityIdSchema.options.length;
  for (const partner of SYNTHETIC_REFERENCE_PARTNERS) {
    const capabilities = new Set(
      partner.capabilityGrants.map((grant) => grant.capabilityId),
    );
    assert.ok(capabilities.size < totalCapabilities, partner.displayName);
  }
});

test("Alpha agent can use synthetic cash-in while Beta cannot gain cash authority", () => {
  const alphaDecision = evaluate({
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    route: SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.ALPHA_CORE],
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    objectId: SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER,
  });
  assert.equal(alphaDecision.allowed, true);
  assert.equal(alphaDecision.code, "ALLOW");

  const betaDecision = evaluate({
    contract: SYNTHETIC_PARTNERFI_BETA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    route: SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.BETA_CORE],
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    objectId: SYNTHETIC_OBJECT_IDS.BETA_CUSTOMER,
  });
  assert.equal(betaDecision.allowed, false);
  assert.equal(betaDecision.code, "CAPABILITY_NOT_GRANTED");
});

test("PartnerFI Beta supports savings and service requests through the same evaluator", () => {
  const savingsDecision = evaluate({
    contract: SYNTHETIC_PARTNERFI_BETA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    route: SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.BETA_CORE],
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
    capabilityId: "FIN.SAVINGS_INQUIRY",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    objectId: SYNTHETIC_OBJECT_IDS.BETA_CUSTOMER,
  });
  assert.equal(savingsDecision.code, "ALLOW");

  const requestDecision = evaluate({
    contract: SYNTHETIC_PARTNERFI_BETA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    route: SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.BETA_CORE],
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
    capabilityId: "FIN.SERVICE_REQUEST",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    objectId: SYNTHETIC_OBJECT_IDS.BETA_CUSTOMER,
  });
  assert.equal(requestDecision.code, "ALLOW");
});

test("organization and region scopes fail closed across otherwise identical AGENT roles", () => {
  const crossPartner = evaluatePartnerCapabilityAccess({
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    request: {
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      regionId: SYNTHETIC_REGION_IDS.ADAMA,
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      objectId: SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER,
    },
    context: {
      publishedServiceIds: allPublishedServices(SYNTHETIC_PARTNERFI_ALPHA),
      availableEvidenceRefs: evidenceFor(
        SYNTHETIC_PARTNERFI_ALPHA,
        SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.ALPHA_CORE],
      ),
      route: SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.ALPHA_CORE],
      evaluatedAt,
    },
  });
  assert.equal(crossPartner.code, "PARTNER_MEMBERSHIP_REQUIRED");

  const betaOutsideRegion: PartnerCapabilityPrincipal = {
    ...SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    regionIds: [SYNTHETIC_REGION_IDS.ARISI],
  };
  const regionDecision = evaluate({
    contract: SYNTHETIC_PARTNERFI_BETA,
    principal: betaOutsideRegion,
    route: SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.BETA_CORE],
    serviceId: SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    regionId: SYNTHETIC_REGION_IDS.ARISI,
    objectId: SYNTHETIC_OBJECT_IDS.BETA_CUSTOMER,
  });
  assert.equal(regionDecision.allowed, false);
  assert.equal(regionDecision.code, "REGION_SCOPE_DENIED");
});

test("gateway and direct mobile-money references preserve distinct route provenance", () => {
  const gammaRoute = SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.GAMMA_C2B];
  const deltaRoute = SYNTHETIC_REFERENCE_ROUTES[SYNTHETIC_ROUTE_IDS.DELTA_DIRECT];

  assert.notEqual(gammaRoute.routeId, deltaRoute.routeId);
  assert.notEqual(gammaRoute.adapterId, deltaRoute.adapterId);
  assert.equal(SYNTHETIC_GATEWAY_GAMMA.partnerClass, "PAYMENT_GATEWAY_SYSTEM_OPERATOR");
  assert.equal(
    SYNTHETIC_MOBILE_MONEY_DELTA.partnerClass,
    "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
  );

  const disabledDelta = SYNTHETIC_MOBILE_MONEY_DELTA.capabilityGrants.find(
    (grant) => grant.capabilityId === "PAY.C2B_CREATE",
  );
  assert.equal(disabledDelta?.state, "DISABLED");
});

test("Fleet planning does not imply dispatch or cash-handover authority", () => {
  const states = Object.fromEntries(
    SYNTHETIC_FLEET_ETA.capabilityGrants.map((grant) => [
      grant.capabilityId,
      grant.state,
    ]),
  );

  assert.equal(states["FLEET.ROUTE_PLAN"], "SIMULATION_ONLY");
  assert.equal(states["FLEET.DISPATCH"], "DISABLED");
  assert.equal(states["FLEET.CASH_HANDOVER"], "DISABLED");
});

test("FMCG reference data scope cannot reach unrelated identity or financial data", () => {
  const dataClasses = new Set(
    SYNTHETIC_FMCG_ZETA.capabilityGrants.flatMap((grant) => grant.dataClasses),
  );
  assert.equal(dataClasses.has("INVENTORY_AGGREGATE"), true);
  assert.equal(dataClasses.has("RESTOCK_DRAFT"), true);
  assert.equal(dataClasses.has("IDENTITY_ATTESTATION_REFERENCE"), false);
  assert.equal(dataClasses.has("PARTNER_ACCOUNT_SUMMARY"), false);
  assert.equal(dataClasses.has("PARTNER_ACCOUNT_REFERENCE"), false);
});

test("agent-group fixtures remain partner-specific", () => {
  assert.notEqual(
    SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS,
    SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS,
  );
});
