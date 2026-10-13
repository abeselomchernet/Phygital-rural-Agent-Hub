import assert from "node:assert/strict";
import test from "node:test";

import {
  PartnerServiceCatalogSchema,
  SYNTHETIC_ALPHA_SERVICE_CATALOG,
  SYNTHETIC_BETA_SERVICE_CATALOG,
  generatePartnerServiceManifest,
  validatePartnerServiceCatalogAgainstContract,
} from "../src/domain/partnerServiceCatalog";
import {
  SYNTHETIC_PARTNERFI_ALPHA,
  SYNTHETIC_PARTNERFI_BETA,
  SYNTHETIC_REFERENCE_PRINCIPALS,
  SYNTHETIC_REFERENCE_ROUTES,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";

const evaluatedAt = "2026-10-13T20:30:00+00:00";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function alphaAgentManifest() {
  return generatePartnerServiceManifest({
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    routesById: SYNTHETIC_REFERENCE_ROUTES,
    evaluatedAt,
  });
}

function betaAgentManifest() {
  return generatePartnerServiceManifest({
    catalog: SYNTHETIC_BETA_SERVICE_CATALOG,
    contract: SYNTHETIC_PARTNERFI_BETA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    routesById: SYNTHETIC_REFERENCE_ROUTES,
    evaluatedAt,
  });
}

test("Alpha and Beta catalogs are strict and compatible with their capability contracts", () => {
  PartnerServiceCatalogSchema.parse(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  PartnerServiceCatalogSchema.parse(SYNTHETIC_BETA_SERVICE_CATALOG);

  assert.deepEqual(
    validatePartnerServiceCatalogAgainstContract({
      catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
      contract: SYNTHETIC_PARTNERFI_ALPHA,
      evaluatedAt,
    }),
    { valid: true, code: "VALID", serviceId: null },
  );
  assert.deepEqual(
    validatePartnerServiceCatalogAgainstContract({
      catalog: SYNTHETIC_BETA_SERVICE_CATALOG,
      contract: SYNTHETIC_PARTNERFI_BETA,
      evaluatedAt,
    }),
    { valid: true, code: "VALID", serviceId: null },
  );
});

test("same manifest generator produces materially different PartnerFI agent workspaces", () => {
  const alpha = alphaAgentManifest();
  const beta = betaAgentManifest();

  assert.deepEqual(
    alpha.services.map((service) => service.serviceId),
    [
      SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    ],
  );
  assert.deepEqual(
    beta.services.map((service) => service.serviceId),
    [
      SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
      SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
      SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
    ],
  );

  assert.equal(
    beta.services.some((service) => service.serviceType === "FINANCIAL_CASH_IN"),
    false,
  );
  assert.equal(
    beta.services.some((service) => service.serviceType === "FINANCIAL_CASH_OUT"),
    false,
  );
  assert.equal(
    alpha.services.every((service) => service.actionState === "AVAILABLE_SYNTHETIC"),
    true,
  );
});

test("shared AGENT role does not cross organization boundaries", () => {
  const manifest = generatePartnerServiceManifest({
    catalog: SYNTHETIC_ALPHA_SERVICE_CATALOG,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    routesById: SYNTHETIC_REFERENCE_ROUTES,
    evaluatedAt,
  });

  assert.deepEqual(manifest.services, []);
});

test("region scope removes Beta services outside its contract without UI branches", () => {
  const betaOutsideRegion = {
    ...SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
    regionIds: [SYNTHETIC_REGION_IDS.ARISI],
  };

  const manifest = generatePartnerServiceManifest({
    catalog: SYNTHETIC_BETA_SERVICE_CATALOG,
    contract: SYNTHETIC_PARTNERFI_BETA,
    principal: betaOutsideRegion,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ARISI,
    routesById: SYNTHETIC_REFERENCE_ROUTES,
    evaluatedAt,
  });

  assert.deepEqual(manifest.services, []);
});

test("catalog cannot invent capability authority", () => {
  const catalog = clone(SYNTHETIC_BETA_SERVICE_CATALOG);
  catalog.services[0].requiredCapabilities = ["FIN.CASH_IN_AUTHORIZE"];

  assert.deepEqual(
    validatePartnerServiceCatalogAgainstContract({
      catalog,
      contract: SYNTHETIC_PARTNERFI_BETA,
      evaluatedAt,
    }),
    {
      valid: false,
      code: "CAPABILITY_GRANT_MISSING",
      serviceId: SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
    },
  );
});

test("catalog route, data and offline scopes cannot exceed the capability grant", () => {
  const wrongRoute = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  wrongRoute.services[0].routePolicy.routeIds = [SYNTHETIC_ROUTE_IDS.BETA_CORE];
  assert.equal(
    validatePartnerServiceCatalogAgainstContract({
      catalog: wrongRoute,
      contract: SYNTHETIC_PARTNERFI_ALPHA,
      evaluatedAt,
    }).code,
    "ROUTE_SCOPE_EXCEEDS_GRANT",
  );

  const excessData = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  excessData.services[0].dataRequirements.inputClasses.push("IDENTITY_ATTESTATION_REFERENCE");
  assert.equal(
    validatePartnerServiceCatalogAgainstContract({
      catalog: excessData,
      contract: SYNTHETIC_PARTNERFI_ALPHA,
      evaluatedAt,
    }).code,
    "DATA_SCOPE_EXCEEDS_GRANT",
  );

  const excessOffline = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  excessOffline.services[0].offlinePolicy = "CAPTURE_INTENT_ONLY";
  assert.equal(
    validatePartnerServiceCatalogAgainstContract({
      catalog: excessOffline,
      contract: SYNTHETIC_PARTNERFI_ALPHA,
      evaluatedAt,
    }).code,
    "OFFLINE_POLICY_EXCEEDS_GRANT",
  );
});

test("future staging or authorized catalog states remain blocked by current runtime policy", () => {
  const stagedCatalog = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  stagedCatalog.environment = "staging";
  stagedCatalog.lifecycleState = "PUBLISHED_STAGING";

  const stagedContract = clone(SYNTHETIC_PARTNERFI_ALPHA);
  stagedContract.environment = "staging";
  stagedContract.lifecycleState = "ACTIVE_STAGING";

  assert.equal(
    validatePartnerServiceCatalogAgainstContract({
      catalog: stagedCatalog,
      contract: stagedContract,
      evaluatedAt,
    }).code,
    "CATALOG_STAGE_BLOCKED",
  );

  const authorizedCatalog = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  authorizedCatalog.environment = "production";
  authorizedCatalog.lifecycleState = "AUTHORIZED";
  const authorizedContract = clone(SYNTHETIC_PARTNERFI_ALPHA);
  authorizedContract.environment = "production";
  authorizedContract.lifecycleState = "ACTIVE_AUTHORIZED";

  assert.equal(
    validatePartnerServiceCatalogAgainstContract({
      catalog: authorizedCatalog,
      contract: authorizedContract,
      evaluatedAt,
    }).code,
    "CATALOG_STAGE_BLOCKED",
  );
});

test("strict catalog schema rejects secret-bearing fields, executable markup and duplicate service IDs", () => {
  const withSecret = {
    ...clone(SYNTHETIC_ALPHA_SERVICE_CATALOG),
    apiSecret: "must-not-be-here",
  };
  assert.throws(() => PartnerServiceCatalogSchema.parse(withSecret));

  const withMarkup = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  withMarkup.services[0].display.name = "<script>alert(1)</script>";
  assert.throws(() => PartnerServiceCatalogSchema.parse(withMarkup));

  const duplicate = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  duplicate.services.push(clone(duplicate.services[0]));
  assert.throws(() => PartnerServiceCatalogSchema.parse(duplicate));
});

test("removing a service changes the generated workspace without partner-specific page code", () => {
  const catalog = clone(SYNTHETIC_ALPHA_SERVICE_CATALOG);
  catalog.catalogVersion = 2;
  catalog.services = catalog.services.filter(
    (service) => service.serviceId !== SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
  );

  const manifest = generatePartnerServiceManifest({
    catalog,
    contract: SYNTHETIC_PARTNERFI_ALPHA,
    principal: SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    routesById: SYNTHETIC_REFERENCE_ROUTES,
    evaluatedAt,
  });

  assert.equal(manifest.catalogVersion, 2);
  assert.equal(
    manifest.services.some(
      (service) => service.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    ),
    false,
  );
  assert.equal(
    manifest.services.some(
      (service) => service.serviceId === SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    ),
    true,
  );
});
