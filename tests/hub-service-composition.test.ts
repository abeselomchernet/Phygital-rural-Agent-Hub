import assert from "node:assert/strict";
import test from "node:test";

import {
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
} from "../src/domain/hub";
import {
  SYNTHETIC_HUB_SERVICE_BINDINGS,
  generateHubServiceWorkspaceManifest,
} from "../src/domain/hubServiceComposition";
import {
  SYNTHETIC_ALPHA_SERVICE_CATALOG,
  SYNTHETIC_BETA_SERVICE_CATALOG,
} from "../src/domain/partnerServiceCatalog";
import {
  SYNTHETIC_PARTNERFI_ALPHA,
  SYNTHETIC_PARTNERFI_BETA,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REFERENCE_PRINCIPALS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";
import { createRuntimeAdapterRegistry } from "../src/server/adapter-bootstrap";

const evaluatedAt = "2026-10-15T12:30:00+00:00";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function registryInputs() {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  return {
    routesById: registry.resolvedRoutesById(),
    routeRegistrations: registry.routeMetadata(),
    adapterRegistrations: registry.adapterMetadata(),
  };
}

function alphaAgentManifest(overrides: Record<string, unknown> = {}) {
  return generateHubServiceWorkspaceManifest({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    role: "AGENT",
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    evaluatedAt,
    ...registryInputs(),
    ...overrides,
  });
}

function betaAgentManifest(overrides: Record<string, unknown> = {}) {
  return generateHubServiceWorkspaceManifest({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    role: "AGENT",
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    contract: SYNTHETIC_PARTNERFI_BETA,
    catalog: SYNTHETIC_BETA_SERVICE_CATALOG,
    evaluatedAt,
    ...registryInputs(),
    ...overrides,
  });
}

test("Hub service composition emits only fully governed Alpha offerings with route and adapter provenance", () => {
  const manifest = alphaAgentManifest();

  assert.deepEqual(
    manifest.offerings.map((offering) => offering.serviceId),
    [
      SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    ],
  );
  assert.equal(manifest.contractVersion, 1);
  assert.equal(manifest.catalogVersion, 1);
  assert.equal(manifest.boundaries.uiPresenceIsCapabilityEvidence, false);
  assert.equal(manifest.boundaries.configurationGrantsAuthority, false);
  assert.equal(manifest.boundaries.liveNetworkAllowed, false);
  assert.equal(manifest.boundaries.productionAuthorityGranted, false);

  for (const offering of manifest.offerings) {
    assert.equal(offering.actionState, "AVAILABLE_SYNTHETIC");
    assert.equal(offering.authority.syntheticOnly, true);
    assert.equal(offering.authority.liveNetworkAllowed, false);
    assert.equal(offering.authority.settlementAuthorityGranted, false);
    assert.equal(offering.authority.productionAuthorityGranted, false);
    assert.ok(offering.capabilityBindings.length > 0);
    for (const capability of offering.capabilityBindings) {
      assert.ok(capability.routeVersion > 0);
      assert.ok(capability.adapterVersion > 0);
      assert.ok(capability.grantId.startsWith("grant_"));
      assert.ok(capability.providerKey.length > 0);
      assert.ok(capability.protocolFamily.length > 0);
    }
  }

  const nlc = manifest.decisionMatrix.find(
    (decision) => decision.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ,
  );
  assert.equal(nlc?.available, false);
  assert.equal(nlc?.code, "ROLE_SCOPE_DENIED");
});

test("shared Adama Hub composes materially different Alpha and Beta offerings without cross-partner leakage", () => {
  const alpha = alphaAgentManifest();
  const beta = betaAgentManifest();

  assert.equal(alpha.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA);
  assert.equal(beta.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA);
  assert.deepEqual(
    beta.offerings.map((offering) => offering.serviceId),
    [
      SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
      SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
      SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
    ],
  );
  assert.equal(
    JSON.stringify(beta).includes(SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN),
    false,
  );
  assert.equal(
    JSON.stringify(alpha).includes(SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY),
    false,
  );
});

test("per-capability enablement gate removes a service when its contract grant is disabled", () => {
  const contract = clone(SYNTHETIC_PARTNERFI_ALPHA);
  const grant = contract.capabilityGrants.find(
    (entry) => entry.capabilityId === "FIN.CASH_IN_AUTHORIZE",
  );
  assert.ok(grant);
  grant.state = "DISABLED";

  const manifest = alphaAgentManifest({ contract });
  assert.equal(
    manifest.offerings.some(
      (offering) => offering.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    ),
    false,
  );
  const decision = manifest.decisionMatrix.find(
    (entry) => entry.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
  );
  assert.equal(decision?.code, "CAPABILITY_DENIED");
  assert.deepEqual(
    decision?.capabilityDecisions.map((entry) => [
      entry.capabilityId,
      entry.allowed,
      entry.decisionCode,
    ]),
    [["FIN.CASH_IN_AUTHORIZE", false, "RUNTIME_STAGE_BLOCKED"]],
  );
});

test("missing route or adapter provenance fails closed and removes the service offering", () => {
  const current = registryInputs();
  const routesById = { ...current.routesById } as Record<string, unknown>;
  const alphaRouteId = SYNTHETIC_PARTNERFI_ALPHA.capabilityGrants[0].allowedRouteIds[0];
  delete routesById[alphaRouteId];
  const noRoute = alphaAgentManifest({ routesById });
  assert.equal(noRoute.offerings.length, 0);
  assert.equal(
    noRoute.decisionMatrix
      .filter((entry) => entry.code !== "ROLE_SCOPE_DENIED")
      .every((entry) => entry.code === "ROUTE_UNAVAILABLE"),
    true,
  );

  const noAdapter = alphaAgentManifest({
    adapterRegistrations: current.adapterRegistrations.filter(
      (adapter) => adapter.adapterId !== current.routeRegistrations[0].adapterId,
    ),
  });
  assert.equal(noAdapter.offerings.length, 0);
  assert.equal(
    noAdapter.decisionMatrix
      .filter((entry) => entry.code !== "ROLE_SCOPE_DENIED")
      .every((entry) => entry.code === "ADAPTER_METADATA_MISSING"),
    true,
  );
});

test("Hub configuration can remove an existing service but cannot manufacture capability authority", () => {
  const bindings = SYNTHETIC_HUB_SERVICE_BINDINGS.filter(
    (entry) => entry.serviceId !== SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
  );
  const manifest = alphaAgentManifest({ bindings });

  assert.equal(
    manifest.offerings.some(
      (offering) => offering.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    ),
    false,
  );
  assert.equal(
    manifest.decisionMatrix.find(
      (entry) => entry.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    )?.code,
    "HUB_SERVICE_NOT_CONFIGURED",
  );
});

test("planned Arisi Hub remains configuration-visible but has no available service offerings", () => {
  const manifest = generateHubServiceWorkspaceManifest({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    role: "AGENT",
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentArisi,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    evaluatedAt,
    ...registryInputs(),
  });

  assert.deepEqual(manifest.offerings, []);
  assert.equal(manifest.decisionMatrix.length, 4);
  assert.equal(
    manifest.decisionMatrix.every(
      (decision) => decision.code === "HUB_LIFECYCLE_BLOCKED",
    ),
    true,
  );
});

test("Supervisor composition exposes only the governed NLC service for Alpha", () => {
  const manifest = generateHubServiceWorkspaceManifest({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    role: "SUPERVISOR",
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaSupervisor,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    evaluatedAt,
    ...registryInputs(),
  });

  assert.deepEqual(
    manifest.offerings.map((offering) => offering.serviceId),
    [SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ],
  );
});

test("composition output is role-safe evidence and never exposes credentials or configuration secrets", () => {
  const manifest = alphaAgentManifest();
  const serialized = JSON.stringify(manifest);

  assert.doesNotMatch(serialized, /credentialRef/i);
  assert.doesNotMatch(serialized, /configSchemaId/i);
  assert.doesNotMatch(serialized, /implementationKey/i);
  assert.doesNotMatch(serialized, /apiSecret/i);
  assert.doesNotMatch(serialized, /privateKey/i);
  assert.equal(manifest.boundaries.providerSuccessIsSettlement, false);
  assert.equal(
    manifest.offerings.every(
      (offering) => offering.authority.settlementAuthorityGranted === false,
    ),
    true,
  );
});
