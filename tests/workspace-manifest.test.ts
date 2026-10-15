import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkspaceProviderStates,
  generateWorkspaceManifest,
} from "../src/domain/workspaceManifest";
import {
  SYNTHETIC_ALPHA_SERVICE_CATALOG,
  SYNTHETIC_BETA_SERVICE_CATALOG,
  generatePartnerServiceManifest,
} from "../src/domain/partnerServiceCatalog";
import {
  SYNTHETIC_PARTNERFI_ALPHA,
  SYNTHETIC_PARTNERFI_BETA,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REFERENCE_PRINCIPALS,
  SYNTHETIC_REGION_IDS,
} from "../src/domain/syntheticReferencePartners";
import { createRuntimeAdapterRegistry } from "../src/server/adapter-bootstrap";

const evaluatedAt = "2026-10-14T00:00:00+00:00";

function agentWorkspace(kind: "alpha" | "beta") {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  const alpha = kind === "alpha";
  const contract = alpha ? SYNTHETIC_PARTNERFI_ALPHA : SYNTHETIC_PARTNERFI_BETA;
  const catalog = alpha
    ? SYNTHETIC_ALPHA_SERVICE_CATALOG
    : SYNTHETIC_BETA_SERVICE_CATALOG;
  const principal = alpha
    ? SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama
    : SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama;
  const serviceManifest = generatePartnerServiceManifest({
    catalog,
    contract,
    principal,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    routesById: registry.resolvedRoutesById(),
    evaluatedAt,
  });
  return generateWorkspaceManifest({
    partnerOrgId: contract.partnerOrgId,
    partnerDisplayName: contract.displayName,
    hubId: "hub_syn_adama_001",
    role: "AGENT",
    environment: "synthetic",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    serviceManifest,
  });
}

test("Alpha and Beta Agents receive different services through one workspace generator", () => {
  const alpha = agentWorkspace("alpha");
  const beta = agentWorkspace("beta");

  assert.equal(alpha.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA);
  assert.equal(beta.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA);
  assert.equal(alpha.hubId, "hub_syn_adama_001");
  assert.equal(beta.hubId, "hub_syn_adama_001");
  assert.deepEqual(
    alpha.services.map((service) => service.name),
    ["Account Lookup", "Cash In", "Cash Out"],
  );
  assert.deepEqual(
    beta.services.map((service) => service.name),
    ["Account Lookup", "Savings Inquiry", "Savings Service Request"],
  );
  assert.equal(beta.services.some((service) => service.name === "Cash In"), false);
});

test("role navigation is responsibility and service scoped, with Ardi absent from universal navigation", () => {
  const alpha = agentWorkspace("alpha");
  const supervisorServiceManifest = generatePartnerServiceManifest({
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaSupervisor,
    role: "SUPERVISOR",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    routesById: createRuntimeAdapterRegistry({ env: {} }).resolvedRoutesById(),
    evaluatedAt,
  });
  const supervisor = generateWorkspaceManifest({
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerDisplayName: SYNTHETIC_PARTNERFI_ALPHA.displayName,
    hubId: "hub_syn_adama_001",
    role: "SUPERVISOR",
    environment: "synthetic",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    serviceManifest: supervisorServiceManifest,
  });

  const agentPaths = alpha.navigation.flatMap((group) =>
    group.items.map((item) => item.path),
  );
  const supervisorPaths = supervisor.navigation.flatMap((group) =>
    group.items.map((item) => item.path),
  );
  assert.ok(agentPaths.includes("/kiosk"));
  assert.equal(agentPaths.includes("/hub"), false);
  assert.equal(agentPaths.includes("/operations"), false);
  assert.ok(supervisorPaths.includes("/hub"));
  assert.ok(supervisorPaths.includes("/hub/economics"));
  assert.ok(supervisorPaths.includes("/hub/pilot-evidence"));
  assert.ok(supervisorPaths.includes("/liquidity"));
  assert.equal(supervisorPaths.includes("/cash-fleet"), false);
  assert.equal(supervisorPaths.includes("/fmcg"), false);
  assert.equal(supervisorPaths.includes("/kiosk"), false);
  assert.equal([...agentPaths, ...supervisorPaths].includes("/ardi-engine"), false);
});

test("provider readiness distinguishes registered foundations from active routes", () => {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  const states = buildWorkspaceProviderStates({
    role: "OPERATIONS",
    adapters: registry.adapterMetadata(),
    routes: registry.routeMetadata(),
  });
  const byProvider = Object.fromEntries(
    states.map((state) => [state.providerKey, state]),
  );

  assert.equal(byProvider.TELEBIRR_DIRECT.environment, "testbed");
  assert.equal(byProvider.TELEBIRR_DIRECT.runtimeMode, "FOUNDATION_ONLY");
  assert.equal(byProvider.TELEBIRR_DIRECT.routeState, "NOT_MOUNTED");
  assert.equal(
    byProvider.TELEBIRR_DIRECT.displayState,
    "Foundation implemented · route activation gated",
  );

  assert.equal(byProvider.MPESA_ETHIOPIA_DIRECT.environment, "sandbox");
  assert.equal(byProvider.MPESA_ETHIOPIA_DIRECT.runtimeMode, "FOUNDATION_ONLY");
  assert.equal(byProvider.MPESA_ETHIOPIA_DIRECT.routeState, "NOT_MOUNTED");
  assert.equal(
    byProvider.MPESA_ETHIOPIA_DIRECT.displayState,
    "Foundation implemented · route activation gated",
  );
});

test("workspace generator rejects service manifests from another partner", () => {
  const alpha = agentWorkspace("alpha");
  assert.throws(
    () =>
      generateWorkspaceManifest({
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
        partnerDisplayName: "PartnerFI Beta",
        hubId: "hub_syn_adama_001",
        role: "AGENT",
        environment: "synthetic",
        regionId: SYNTHETIC_REGION_IDS.ADAMA,
        serviceManifest: {
          partnerOrgId: alpha.partnerOrgId,
          catalogVersion: 1,
          role: "AGENT",
          regionId: SYNTHETIC_REGION_IDS.ADAMA,
          services: alpha.services,
        },
      }),
    /WORKSPACE_SERVICE_PARTNER_MISMATCH/,
  );
});
