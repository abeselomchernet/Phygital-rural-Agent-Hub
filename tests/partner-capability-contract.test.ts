import assert from "node:assert/strict";
import test from "node:test";
import {
  PartnerCapabilityContractSchema,
  evaluatePartnerCapabilityAccess,
} from "../src/domain/partnerCapabilityContract";

const evaluatedAt = "2026-10-13T19:50:00Z";

function alphaContract() {
  return {
    schemaVersion: 1,
    partnerOrgId: "org_syn_alpha",
    contractVersion: 7,
    partnerClass: "FINANCIAL_INSTITUTION",
    legalName: "Synthetic PartnerFI Alpha",
    displayName: "PartnerFI Alpha",
    environment: "synthetic",
    lifecycleState: "ACTIVE_SYNTHETIC",
    regions: ["region_syn_adama"],
    evidenceRefs: ["EV-CONTRACT-ALPHA"],
    capabilityGrants: [
      {
        grantId: "grant_alpha_cash_in",
        capabilityId: "FIN.CASH_IN_AUTHORIZE",
        state: "SIMULATION_ONLY",
        serviceIds: ["svc_cash_in"],
        roles: ["AGENT"],
        regions: ["region_syn_adama"],
        agentGroups: ["group_alpha_agents"],
        dataClasses: ["CUSTOMER_REFERENCE", "TRANSACTION_INTENT"],
        allowedRouteIds: ["route_mock_partnerfi_alpha"],
        constraints: {
          currencies: ["ETB"],
          maxAmountMinor: null,
          offlinePolicy: "CAPTURE_INTENT_ONLY",
        },
        activation: {
          effectiveAt: null,
          expiresAt: null,
          evidenceRefs: ["EV-GRANT-ALPHA-CASHIN"],
        },
      },
    ],
  } as const;
}

function betaContract() {
  return {
    schemaVersion: 1,
    partnerOrgId: "org_syn_beta",
    contractVersion: 3,
    partnerClass: "FINANCIAL_INSTITUTION",
    legalName: "Synthetic PartnerFI Beta",
    displayName: "PartnerFI Beta",
    environment: "synthetic",
    lifecycleState: "ACTIVE_SYNTHETIC",
    regions: ["region_syn_adama"],
    evidenceRefs: ["EV-CONTRACT-BETA"],
    capabilityGrants: [
      {
        grantId: "grant_beta_savings",
        capabilityId: "FIN.SAVINGS_INQUIRY",
        state: "SIMULATION_ONLY",
        serviceIds: ["svc_savings_inquiry"],
        roles: ["AGENT"],
        regions: ["region_syn_adama"],
        agentGroups: ["group_beta_agents"],
        dataClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_SUMMARY"],
        allowedRouteIds: ["route_mock_partnerfi_beta"],
        constraints: {
          currencies: ["ETB"],
          maxAmountMinor: null,
          offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
        },
        activation: {
          effectiveAt: null,
          expiresAt: null,
          evidenceRefs: ["EV-GRANT-BETA-SAVINGS"],
        },
      },
    ],
  } as const;
}

function alphaPrincipal() {
  return {
    userId: "synthetic-alpha-agent-01",
    partnerOrgMemberships: ["org_syn_alpha"],
    roleAssignments: [{ partnerOrgId: "org_syn_alpha", role: "AGENT" }],
    regionIds: ["region_syn_adama"],
    agentGroupIds: ["group_alpha_agents"],
    serviceScopes: ["svc_cash_in"],
    objectScopes: ["obj_customer_001"],
  } as const;
}

function alphaRequest() {
  return {
    partnerOrgId: "org_syn_alpha",
    serviceId: "svc_cash_in",
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    regionId: "region_syn_adama",
    routeId: "route_mock_partnerfi_alpha",
    objectId: "obj_customer_001",
  } as const;
}

function alphaContext() {
  return {
    publishedServiceIds: ["svc_cash_in"],
    availableEvidenceRefs: [
      "EV-CONTRACT-ALPHA",
      "EV-GRANT-ALPHA-CASHIN",
      "EV-ROUTE-ALPHA",
    ],
    route: {
      routeId: "route_mock_partnerfi_alpha",
      adapterId: "adapter_mock_partnerfi_v1",
      environment: "synthetic",
      registered: true,
      supportedCapabilityIds: ["FIN.CASH_IN_AUTHORIZE"],
      evidenceRefs: ["EV-ROUTE-ALPHA"],
    },
    evaluatedAt,
  } as const;
}

function evaluateAlpha(overrides: {
  contract?: unknown;
  principal?: unknown;
  request?: unknown;
  context?: unknown;
} = {}) {
  return evaluatePartnerCapabilityAccess({
    contract: overrides.contract ?? alphaContract(),
    principal: overrides.principal ?? alphaPrincipal(),
    request: overrides.request ?? alphaRequest(),
    context: overrides.context ?? alphaContext(),
  });
}

test("strict machine-readable contract allows a bounded synthetic capability and carries versioned audit context", () => {
  const result = evaluateAlpha();
  assert.equal(result.allowed, true);
  assert.equal(result.code, "ALLOW");
  assert.equal(result.contractVersion, 7);
  assert.deepEqual(result.auditContext, {
    partnerOrgId: "org_syn_alpha",
    contractVersion: 7,
    serviceId: "svc_cash_in",
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    routeId: "route_mock_partnerfi_alpha",
    adapterId: "adapter_mock_partnerfi_v1",
    grantId: "grant_alpha_cash_in",
  });
});

test("two PartnerFIs express different grants through the same evaluator without institution branches", () => {
  const alpha = evaluateAlpha();
  assert.equal(alpha.allowed, true);

  const betaPrincipal = {
    userId: "synthetic-beta-agent-01",
    partnerOrgMemberships: ["org_syn_beta"],
    roleAssignments: [{ partnerOrgId: "org_syn_beta", role: "AGENT" }],
    regionIds: ["region_syn_adama"],
    agentGroupIds: ["group_beta_agents"],
    serviceScopes: ["svc_cash_in"],
    objectScopes: ["obj_customer_001"],
  };
  const betaAttempt = evaluatePartnerCapabilityAccess({
    contract: betaContract(),
    principal: betaPrincipal,
    request: {
      partnerOrgId: "org_syn_beta",
      serviceId: "svc_cash_in",
      capabilityId: "FIN.CASH_IN_AUTHORIZE",
      regionId: "region_syn_adama",
      routeId: "route_mock_partnerfi_beta",
      objectId: "obj_customer_001",
    },
    context: {
      publishedServiceIds: ["svc_cash_in"],
      availableEvidenceRefs: ["EV-CONTRACT-BETA", "EV-ROUTE-BETA"],
      route: {
        routeId: "route_mock_partnerfi_beta",
        adapterId: "adapter_mock_partnerfi_v1",
        environment: "synthetic",
        registered: true,
        supportedCapabilityIds: ["FIN.CASH_IN_AUTHORIZE"],
        evidenceRefs: ["EV-ROUTE-BETA"],
      },
      evaluatedAt,
    },
  });
  assert.equal(betaAttempt.allowed, false);
  assert.equal(betaAttempt.code, "CAPABILITY_NOT_GRANTED");
});

test("business capability IDs stay independent from route and adapter IDs", () => {
  const contract = PartnerCapabilityContractSchema.parse(alphaContract());
  const grant = contract.capabilityGrants[0];
  assert.equal(grant.capabilityId, "FIN.CASH_IN_AUTHORIZE");
  assert.equal(grant.allowedRouteIds[0], "route_mock_partnerfi_alpha");
  assert.notEqual(grant.capabilityId, grant.allowedRouteIds[0]);
  const result = evaluateAlpha();
  assert.equal(result.adapterId, "adapter_mock_partnerfi_v1");
  assert.notEqual(result.capabilityId, result.adapterId);
});

test("contract schema rejects unknown keys and secret-bearing fields", () => {
  assert.throws(() =>
    PartnerCapabilityContractSchema.parse({
      ...alphaContract(),
      apiKey: "must-not-be-accepted",
    }),
  );

  const nested = structuredClone(alphaContract()) as any;
  nested.capabilityGrants[0].constraints.clientSecret = "must-not-be-accepted";
  assert.throws(() => PartnerCapabilityContractSchema.parse(nested));
});

test("unknown capability IDs fail closed at schema validation", () => {
  const contract = structuredClone(alphaContract()) as any;
  contract.capabilityGrants[0].capabilityId = "BANK_ALPHA.CASH_IN";
  assert.throws(() => PartnerCapabilityContractSchema.parse(contract));
});

test("missing partner membership denies", () => {
  const principal = structuredClone(alphaPrincipal()) as any;
  principal.partnerOrgMemberships = [];
  const result = evaluateAlpha({ principal });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "PARTNER_MEMBERSHIP_REQUIRED");
});

test("missing authorized role denies", () => {
  const principal = structuredClone(alphaPrincipal()) as any;
  principal.roleAssignments = [
    { partnerOrgId: "org_syn_alpha", role: "SUPERVISOR" },
  ];
  const result = evaluateAlpha({ principal });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "ROLE_SCOPE_DENIED");
});

test("missing region scope denies", () => {
  const principal = structuredClone(alphaPrincipal()) as any;
  principal.regionIds = [];
  const result = evaluateAlpha({ principal });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "REGION_SCOPE_DENIED");
});

test("missing published service denies", () => {
  const context = structuredClone(alphaContext()) as any;
  context.publishedServiceIds = [];
  const result = evaluateAlpha({ context });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "SERVICE_NOT_PUBLISHED");
});

test("missing principal service scope denies", () => {
  const principal = structuredClone(alphaPrincipal()) as any;
  principal.serviceScopes = [];
  const result = evaluateAlpha({ principal });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "SERVICE_SCOPE_DENIED");
});

test("missing object scope denies", () => {
  const principal = structuredClone(alphaPrincipal()) as any;
  principal.objectScopes = [];
  const result = evaluateAlpha({ principal });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "OBJECT_SCOPE_DENIED");
});

test("missing capability grant denies", () => {
  const request = {
    ...alphaRequest(),
    capabilityId: "FIN.CASH_OUT_AUTHORIZE",
  };
  const context = structuredClone(alphaContext()) as any;
  context.route.supportedCapabilityIds = ["FIN.CASH_OUT_AUTHORIZE"];
  const result = evaluateAlpha({ request, context });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "CAPABILITY_NOT_GRANTED");
});

test("route not permitted by the grant denies before adapter routing", () => {
  const request = {
    ...alphaRequest(),
    routeId: "route_other_partnerfi",
  };
  const context = structuredClone(alphaContext()) as any;
  context.route.routeId = "route_other_partnerfi";
  const result = evaluateAlpha({ request, context });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "ROUTE_NOT_ALLOWED");
});

test("unregistered or mismatched route context denies", () => {
  const context = structuredClone(alphaContext()) as any;
  context.route.environment = "sandbox";
  const result = evaluateAlpha({ context });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "ROUTE_UNAVAILABLE");
});

test("missing evidence denies", () => {
  const context = structuredClone(alphaContext()) as any;
  context.availableEvidenceRefs = ["EV-CONTRACT-ALPHA", "EV-ROUTE-ALPHA"];
  const result = evaluateAlpha({ context });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "EVIDENCE_MISSING");
});

test("AUTHORIZED cannot be made usable in the current runtime by configuration alone", () => {
  const contract = structuredClone(alphaContract()) as any;
  contract.capabilityGrants[0].state = "AUTHORIZED";
  const result = evaluateAlpha({ contract });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "RUNTIME_STAGE_BLOCKED");
});

test("future staging state remains blocked in the current runtime", () => {
  const contract = structuredClone(alphaContract()) as any;
  contract.environment = "staging";
  contract.lifecycleState = "ACTIVE_STAGING";
  contract.capabilityGrants[0].state = "STAGING_BOUNDED";
  const context = structuredClone(alphaContext()) as any;
  context.route.environment = "staging";
  const result = evaluateAlpha({ contract, context });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "RUNTIME_STAGE_BLOCKED");
});
