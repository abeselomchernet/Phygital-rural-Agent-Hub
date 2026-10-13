import assert from "node:assert/strict";
import test from "node:test";

import {
  PartnerAdapterRegistry,
  adapterRegistration,
  routeRegistration,
} from "../src/domain/adapterRegistry";
import {
  SYNTHETIC_ALPHA_SERVICE_CATALOG,
  SYNTHETIC_BETA_SERVICE_CATALOG,
} from "../src/domain/partnerServiceCatalog";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_PARTNERFI_ALPHA,
  SYNTHETIC_PARTNERFI_BETA,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REFERENCE_PRINCIPALS,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";
import {
  RUNTIME_ADAPTER_IDS,
  createDefaultSyntheticFinancialInstitutionAdapter,
  createRuntimeAdapterRegistry,
} from "../src/server/adapter-bootstrap";

const evaluatedAt = "2026-10-13T23:00:00+00:00";

function minimalRegistry() {
  const registry = new PartnerAdapterRegistry();
  registry.registerAdapter(
    adapterRegistration({
      adapterId: "adapter_test_synthetic_v1",
      partnerClass: "FINANCIAL_INSTITUTION",
      providerKey: "TEST_PROVIDER",
      protocolFamily: "TEST_PROTOCOL",
      environment: "synthetic",
      supportedCapabilities: ["FIN.ACCOUNT_LOOKUP"],
      configSchemaId: "CFG_TEST_V1",
      implementationKey: "TEST_IMPLEMENTATION_V1",
      status: "REGISTERED_SYNTHETIC",
      evidenceRefs: ["EV-TEST-V1"],
    }),
    () => ({ name: "test-adapter" }),
  );
  return registry;
}

test("adapter and route identifiers fail closed on duplicates", () => {
  const registry = minimalRegistry();
  const adapter = adapterRegistration({
    adapterId: "adapter_test_synthetic_v1",
    partnerClass: "FINANCIAL_INSTITUTION",
    providerKey: "TEST_PROVIDER",
    protocolFamily: "TEST_PROTOCOL",
    environment: "synthetic",
    supportedCapabilities: ["FIN.ACCOUNT_LOOKUP"],
    configSchemaId: "CFG_TEST_V1",
    implementationKey: "TEST_IMPLEMENTATION_V1",
    status: "REGISTERED_SYNTHETIC",
  });
  assert.throws(
    () => registry.registerAdapter(adapter, () => ({})),
    /ADAPTER_ID_ALREADY_REGISTERED/,
  );

  const route = routeRegistration({
    routeId: "route_test_synthetic",
    providerOrgId: "org_test_partner",
    partnerClass: "FINANCIAL_INSTITUTION",
    environment: "synthetic",
    serviceIds: ["svc_test_lookup"],
    adapterId: "adapter_test_synthetic_v1",
    supportedCapabilities: ["FIN.ACCOUNT_LOOKUP"],
    status: "SYNTHETIC_BOUNDED",
  });
  registry.registerRoute(route);
  assert.throws(
    () => registry.registerRoute(route),
    /ROUTE_ID_ALREADY_REGISTERED/,
  );
});

test("routes reject unknown adapters and capability/environment overreach", () => {
  const registry = minimalRegistry();
  assert.throws(
    () =>
      registry.registerRoute(
        routeRegistration({
          routeId: "route_unknown_adapter",
          providerOrgId: "org_test_partner",
          partnerClass: "FINANCIAL_INSTITUTION",
          environment: "synthetic",
          serviceIds: ["svc_test_lookup"],
          adapterId: "adapter_missing_v1",
          supportedCapabilities: ["FIN.ACCOUNT_LOOKUP"],
          status: "SYNTHETIC_BOUNDED",
        }),
      ),
    /ROUTE_ADAPTER_NOT_REGISTERED/,
  );

  assert.throws(
    () =>
      registry.registerRoute(
        routeRegistration({
          routeId: "route_capability_overreach",
          providerOrgId: "org_test_partner",
          partnerClass: "FINANCIAL_INSTITUTION",
          environment: "synthetic",
          serviceIds: ["svc_test_cash"],
          adapterId: "adapter_test_synthetic_v1",
          supportedCapabilities: ["FIN.CASH_IN_AUTHORIZE"],
          status: "SYNTHETIC_BOUNDED",
        }),
      ),
    /ROUTE_CAPABILITY_NOT_SUPPORTED_BY_ADAPTER/,
  );

  assert.throws(
    () =>
      registry.registerRoute(
        routeRegistration({
          routeId: "route_environment_overreach",
          providerOrgId: "org_test_partner",
          partnerClass: "FINANCIAL_INSTITUTION",
          environment: "sandbox",
          serviceIds: ["svc_test_lookup"],
          adapterId: "adapter_test_synthetic_v1",
          supportedCapabilities: ["FIN.ACCOUNT_LOOKUP"],
          status: "SANDBOX_BOUNDED",
        }),
      ),
    /ROUTE_ADAPTER_ENVIRONMENT_MISMATCH/,
  );
});

test("disabled adapter and route registrations are discoverable metadata but not executable", () => {
  const registry = new PartnerAdapterRegistry();
  registry.registerAdapter(
    adapterRegistration({
      adapterId: "adapter_disabled_sandbox_v1",
      partnerClass: "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
      providerKey: "DISABLED_GATEWAY",
      protocolFamily: "DISABLED_REST",
      environment: "sandbox",
      supportedCapabilities: ["PAY.C2B_CREATE"],
      configSchemaId: "CFG_DISABLED_V1",
      implementationKey: "DISABLED_GATEWAY_V1",
      status: "REGISTERED_DISABLED",
    }),
  );
  registry.registerRoute(
    routeRegistration({
      routeId: "route_disabled_sandbox",
      providerOrgId: "org_disabled_gateway",
      partnerClass: "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
      environment: "sandbox",
      serviceIds: ["svc_disabled_payment"],
      adapterId: "adapter_disabled_sandbox_v1",
      supportedCapabilities: ["PAY.C2B_CREATE"],
      status: "DISABLED",
    }),
  );

  assert.equal(registry.adapterMetadata().length, 1);
  assert.equal(registry.routeMetadata().length, 1);
  assert.equal(Object.keys(registry.resolvedRoutesById()).length, 0);
  assert.throws(
    () =>
      registry.resolve({
        partnerOrgId: "org_disabled_gateway",
        serviceId: "svc_disabled_payment",
        capabilityId: "PAY.C2B_CREATE",
        environment: "sandbox",
        routeId: "route_disabled_sandbox",
      }),
    /ROUTE_NOT_USABLE/,
  );
});

test("Alpha cash-in resolves through catalog + capability contract + route registry", () => {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  const resolution = registry.resolveGoverned<{ financialInstitution: unknown }>({
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    evaluatedAt,
  });

  assert.equal(resolution.provenance.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA);
  assert.equal(resolution.provenance.routeId, SYNTHETIC_ROUTE_IDS.ALPHA_CORE);
  assert.equal(resolution.provenance.adapterId, SYNTHETIC_ADAPTER_IDS.ALPHA);
  assert.ok(resolution.adapter.financialInstitution);
});

test("Beta cannot gain Alpha cash service through the same resolver", () => {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  assert.throws(
    () =>
      registry.resolveGoverned({
        catalog: SYNTHETIC_BETA_SERVICE_CATALOG,
        contract: SYNTHETIC_PARTNERFI_BETA,
        principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
        role: "AGENT",
        regionId: SYNTHETIC_REGION_IDS.ADAMA,
        serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
        capabilityId: "FIN.CASH_IN_AUTHORIZE",
        evaluatedAt,
      }),
    /SERVICE_NOT_AVAILABLE_TO_PRINCIPAL/,
  );
});

test("submitted or ambiguous mutations require the originally pinned route", () => {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  const base = {
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    role: "AGENT" as const,
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    capabilityId: "FIN.CASH_IN_AUTHORIZE" as const,
    evaluatedAt,
  };

  assert.throws(
    () => registry.resolveGoverned({ ...base, mutationState: "SUBMITTED" }),
    /PINNED_ROUTE_REQUIRED_AFTER_SUBMIT/,
  );
  assert.throws(
    () =>
      registry.resolveGoverned({
        ...base,
        mutationState: "AMBIGUOUS",
        pinnedRouteId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      }),
    /PINNED_ROUTE_MISMATCH/,
  );

  const pinned = registry.resolveGoverned({
    ...base,
    mutationState: "SUBMITTED",
    pinnedRouteId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
  });
  assert.equal(pinned.provenance.routeId, SYNTHETIC_ROUTE_IDS.ALPHA_CORE);
});

test("registry metadata exposes references, never factories or secret values", () => {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  const serialized = JSON.stringify({
    adapters: registry.adapterMetadata(),
    routes: registry.routeMetadata(),
  });
  assert.equal(serialized.includes("factory"), false);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("privateKey"), false);
  assert.equal(serialized.includes("BEGIN PRIVATE KEY"), false);
  assert.equal(serialized.includes("../"), false);
});

test("Telebirr and M-PESA foundations remain registered disabled", () => {
  const registry = createRuntimeAdapterRegistry({ env: {} });
  const byId = Object.fromEntries(
    registry.adapterMetadata().map((entry) => [entry.adapterId, entry]),
  );
  assert.equal(
    byId[RUNTIME_ADAPTER_IDS.TELEBIRR_TESTBED_FOUNDATION]?.status,
    "REGISTERED_DISABLED",
  );
  assert.equal(
    byId[RUNTIME_ADAPTER_IDS.MPESA_ETHIOPIA_SANDBOX_FOUNDATION]?.status,
    "REGISTERED_DISABLED",
  );
});

test("default demo FinancialInstitutionAdapter is obtained through registry bootstrap", () => {
  const partner = createDefaultSyntheticFinancialInstitutionAdapter();
  const customerId = "00000000-0000-4000-8000-000000000001";
  const partnerCustomerId = partner.lookupPartnerCustomer(customerId);
  assert.equal(partnerCustomerId, `mock-partner:${customerId}`);
  assert.equal(partner.getAccountSummary(customerId).accountOwner, "PartnerFI");
});

test("ArifPay registry bootstrap preserves sandbox-only and durable-state gates", () => {
  assert.throws(
    () => createRuntimeAdapterRegistry({ env: { ARIFPAY_MODE: "production" } }),
    /ARIFPAY_SANDBOX_MODE_REQUIRED/,
  );
  assert.throws(
    () => createRuntimeAdapterRegistry({ env: { ARIFPAY_MODE: "sandbox" } }),
    /ARIFPAY_SANDBOX_REQUIRES_SYNTHETIC_STATE_DIR/,
  );
});
