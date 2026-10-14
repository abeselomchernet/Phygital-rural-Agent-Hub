import assert from "node:assert/strict";
import test from "node:test";
import {
  HubSchema,
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  authorizeSyntheticHubAccess,
  projectAuthorizedHub,
  syntheticHubs,
  type HubAccessContext,
  type HubAccessPurpose,
  type HubRole,
} from "../src/domain/hub";
import {
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
} from "../src/domain/syntheticReferencePartners";

function context(input: {
  role: HubRole;
  partnerOrgId: string;
  agentGroupIds?: string[];
  regionId?: string;
  tenantId?: string;
  assignedHubIds?: string[];
  allowedPurposes?: HubAccessPurpose[];
}): HubAccessContext {
  return {
    tenantId: input.tenantId ?? SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: input.role,
    activePartnerOrgId: input.partnerOrgId,
    partnerOrgMemberships: [input.partnerOrgId],
    regionId: input.regionId ?? SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: input.agentGroupIds ?? [],
    assignedHubIds: input.assignedHubIds ?? [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    allowedPurposes: input.allowedPurposes ?? ["HUB_VIEW"],
  } as HubAccessContext;
}

test("synthetic Hub fixtures are strict, bounded aggregates with no control authority", () => {
  assert.equal(syntheticHubs.length, 3);
  for (const hub of syntheticHubs) {
    assert.equal(HubSchema.safeParse(hub).success, true);
    assert.equal(hub.syntheticOnly, true);
    assert.match(hub.hubId, /^hub_syn_/);
    assert.ok(hub.authorityBoundary.length > 0);
    for (const device of hub.devices) {
      assert.equal(device.controlEnabled, false);
      assert.equal(device.providerCommandEnabled, false);
    }
    for (const membership of hub.partnerMemberships)
      assert.equal(membership.regulatedAuthorityGranted, false);
  }
});

test("shared Adama Hub authorizes Alpha and Beta independently and projection hides the other partner", () => {
  const alpha = authorizeSyntheticHubAccess({
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    purpose: "HUB_VIEW",
    context: context({
      role: "AGENT",
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
      allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
    }),
  });
  const beta = authorizeSyntheticHubAccess({
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    purpose: "HUB_VIEW",
    context: context({
      role: "AGENT",
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
      allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
    }),
  });
  assert.ok(alpha);
  assert.ok(beta);

  const alphaProjection = projectAuthorizedHub(alpha);
  const betaProjection = projectAuthorizedHub(beta);
  assert.equal(
    alphaProjection.partnerMembership.partnerOrgId,
    SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
  );
  assert.equal(
    betaProjection.partnerMembership.partnerOrgId,
    SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
  );
  assert.equal(
    alphaProjection.operatorAssignment.actorScopeId,
    SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS,
  );
  assert.equal(
    betaProjection.operatorAssignment.actorScopeId,
    SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS,
  );
  assert.doesNotMatch(
    JSON.stringify(alphaProjection),
    new RegExp(SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA),
  );
  assert.doesNotMatch(
    JSON.stringify(betaProjection),
    new RegExp(SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA),
  );
});

test("Hub authorization fails closed across tenant, region, assignment and purpose boundaries", () => {
  const alphaAgent = context({
    role: "AGENT",
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  });

  assert.equal(
    authorizeSyntheticHubAccess({
      hubId: SYNTHETIC_HUB_IDS.DENIAL,
      purpose: "HUB_VIEW",
      context: {
        ...alphaAgent,
        assignedHubIds: [SYNTHETIC_HUB_IDS.DENIAL],
      },
    }),
    null,
  );
  assert.equal(
    authorizeSyntheticHubAccess({
      hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
      purpose: "HUB_VIEW",
      context: {
        ...alphaAgent,
        assignedHubIds: [SYNTHETIC_HUB_IDS.ARISI_ALPHA],
      },
    }),
    null,
  );
  assert.equal(
    authorizeSyntheticHubAccess({
      hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      purpose: "HUB_VIEW",
      context: { ...alphaAgent, assignedHubIds: [] },
    }),
    null,
  );
  assert.equal(
    authorizeSyntheticHubAccess({
      hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      purpose: "HUB_ADMINISTER",
      context: {
        ...alphaAgent,
        allowedPurposes: ["HUB_VIEW", "HUB_OPERATE", "HUB_ADMINISTER"],
      },
    }),
    null,
  );
});

test("role and assignment both gate privileged Hub purposes", () => {
  const operations = authorizeSyntheticHubAccess({
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    purpose: "HUB_PARTNER_REVIEW",
    context: context({
      role: "OPERATIONS",
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      allowedPurposes: ["HUB_VIEW", "HUB_PARTNER_REVIEW"],
    }),
  });
  assert.ok(operations);
  assert.equal(operations.operatorAssignment.role, "OPERATIONS");

  const betaOperationsWithoutAssignment = authorizeSyntheticHubAccess({
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    purpose: "HUB_PARTNER_REVIEW",
    context: context({
      role: "OPERATIONS",
      partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      allowedPurposes: ["HUB_VIEW", "HUB_PARTNER_REVIEW"],
    }),
  });
  assert.equal(betaOperationsWithoutAssignment, null);
});

test("unknown and malformed Hub identifiers produce the same internal no-access result", () => {
  const alphaAgent = context({
    role: "AGENT",
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    allowedPurposes: ["HUB_VIEW"],
  });
  for (const hubId of ["hub_syn_unknown_999", "not-a-hub-id"]) {
    assert.equal(
      authorizeSyntheticHubAccess({
        hubId,
        purpose: "HUB_VIEW",
        context: alphaAgent,
      }),
      null,
    );
  }
});
