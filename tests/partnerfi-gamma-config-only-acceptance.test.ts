import assert from "node:assert/strict";
import test from "node:test";

import {
  PartnerCapabilityContractSchema,
  PartnerCapabilityPrincipalSchema,
} from "../src/domain/partnerCapabilityContract";
import {
  PartnerServiceCatalogSchema,
  generatePartnerServiceManifest,
} from "../src/domain/partnerServiceCatalog";
import { routeRegistration } from "../src/domain/adapterRegistry";
import { generateWorkspaceManifest } from "../src/domain/workspaceManifest";
import {
  certificationEvidenceRef,
  runContractCertification,
} from "../src/domain/contractCertification";
import { classifyPartnerOnboardingPath } from "../src/domain/partnerOnboarding";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_REGION_IDS,
} from "../src/domain/syntheticReferencePartners";
import { createRuntimeAdapterRegistry } from "../src/server/adapter-bootstrap";

const GAMMA = {
  partnerOrgId: "org_syn_partnerfi_gamma",
  serviceId: "svc_partnerfi_gamma_account_lookup",
  routeId: "route_syn_partnerfi_gamma_core",
  agentGroupId: "group_syn_partnerfi_gamma_agents",
  evidenceRef: "EV-SYN-PARTNERFI-GAMMA-V1",
} as const;

const gammaContract = PartnerCapabilityContractSchema.parse({
  schemaVersion: 1,
  partnerOrgId: GAMMA.partnerOrgId,
  contractVersion: 1,
  partnerClass: "FINANCIAL_INSTITUTION",
  legalName: "Synthetic PartnerFI Gamma",
  displayName: "PartnerFI Gamma",
  environment: "synthetic",
  lifecycleState: "ACTIVE_SYNTHETIC",
  regions: [SYNTHETIC_REGION_IDS.ADAMA],
  evidenceRefs: [GAMMA.evidenceRef],
  capabilityGrants: [
    {
      grantId: "grant_syn_partnerfi_gamma_account_lookup",
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      state: "SIMULATION_ONLY",
      serviceIds: [GAMMA.serviceId],
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [GAMMA.agentGroupId],
      dataClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_REFERENCE"],
      allowedRouteIds: [GAMMA.routeId],
      constraints: {
        currencies: [],
        maxAmountMinor: null,
        offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      },
      activation: {
        effectiveAt: null,
        expiresAt: null,
        evidenceRefs: [GAMMA.evidenceRef],
      },
    },
  ],
});

const gammaCatalog = PartnerServiceCatalogSchema.parse({
  schemaVersion: 1,
  catalogVersion: 1,
  partnerOrgId: GAMMA.partnerOrgId,
  environment: "synthetic",
  lifecycleState: "PUBLISHED_SYNTHETIC",
  evidenceRefs: [GAMMA.evidenceRef],
  services: [
    {
      serviceId: GAMMA.serviceId,
      serviceType: "FINANCIAL_ACCOUNT_LOOKUP",
      display: {
        name: "Account Lookup",
        shortDescription: "Synthetic PartnerFI Gamma account-reference lookup.",
        category: "Customer services",
        iconKey: "account-lookup",
      },
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [GAMMA.agentGroupId],
      requiredCapabilities: ["FIN.ACCOUNT_LOOKUP"],
      routePolicy: {
        mode: "EXPLICIT",
        routeIds: [GAMMA.routeId],
      },
      dataRequirements: {
        inputClasses: ["CUSTOMER_REFERENCE"],
        outputClasses: ["PARTNER_ACCOUNT_REFERENCE"],
      },
      offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      workflowTemplate: "CUSTOMER_LOOKUP_V1",
      activation: {
        effectiveAt: null,
        expiresAt: null,
        evidenceRefs: [GAMMA.evidenceRef],
      },
    },
  ],
});

const gammaAgent = PartnerCapabilityPrincipalSchema.parse({
  userId: "synthetic-gamma-agent-01",
  partnerOrgMemberships: [GAMMA.partnerOrgId],
  roleAssignments: [{ partnerOrgId: GAMMA.partnerOrgId, role: "AGENT" }],
  regionIds: [SYNTHETIC_REGION_IDS.ADAMA],
  agentGroupIds: [GAMMA.agentGroupId],
  serviceScopes: [GAMMA.serviceId],
  objectScopes: [],
});

test("PartnerFI Gamma uses configuration + an existing adapter + the existing workspace generator with no core/UI fork", () => {
  assert.equal(
    classifyPartnerOnboardingPath({
      serviceTypesSupported: true,
      capabilitiesSupported: true,
      adapterCompatible: true,
      domainSemanticsSupported: true,
    }),
    "CONFIGURATION_ONLY",
  );

  const registry = createRuntimeAdapterRegistry({ env: {} });
  registry.registerRoute(
    routeRegistration({
      routeId: GAMMA.routeId,
      providerOrgId: GAMMA.partnerOrgId,
      partnerClass: "FINANCIAL_INSTITUTION",
      environment: "synthetic",
      serviceIds: [GAMMA.serviceId],
      adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
      supportedCapabilities: ["FIN.ACCOUNT_LOOKUP"],
      status: "SYNTHETIC_BOUNDED",
      evidenceRefs: [GAMMA.evidenceRef],
    }),
  );

  const serviceManifest = generatePartnerServiceManifest({
    catalog: gammaCatalog,
    contract: gammaContract,
    principal: gammaAgent,
    role: "AGENT",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    routesById: registry.resolvedRoutesById(),
    evaluatedAt: "2026-10-14T13:00:00+00:00",
  });

  const workspace = generateWorkspaceManifest({
    partnerOrgId: GAMMA.partnerOrgId,
    partnerDisplayName: gammaContract.displayName,
    hubId: "hub_syn_adama_001",
    role: "AGENT",
    environment: "synthetic",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    serviceManifest,
  });

  assert.equal(workspace.partnerDisplayName, "PartnerFI Gamma");
  assert.deepEqual(
    workspace.services.map((service) => service.name),
    ["Account Lookup"],
  );
  assert.ok(
    workspace.navigation
      .flatMap((group) => group.items)
      .some((item) => item.path === "/kiosk"),
  );
  assert.equal(
    workspace.navigation
      .flatMap((group) => group.items)
      .some((item) => /gamma/i.test(item.path + item.label)),
    false,
  );
});

test("PartnerFI Gamma certifies through the same deterministic runner and reuses the existing synthetic FI adapter", () => {
  const report = runContractCertification({
    certificationId: "cert_partnerfi_gamma_config_only",
    subject: {
      partnerOrgId: GAMMA.partnerOrgId,
      contractPartnerOrgId: GAMMA.partnerOrgId,
      catalogPartnerOrgId: GAMMA.partnerOrgId,
      routeProviderOrgId: GAMMA.partnerOrgId,
      contractVersion: gammaContract.contractVersion,
      catalogVersion: gammaCatalog.catalogVersion,
      serviceId: GAMMA.serviceId,
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      routeId: GAMMA.routeId,
      routeVersion: 1,
      adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
      adapterVersion: 1,
      runtimeMode: "EXECUTABLE",
      environment: "synthetic",
      configSchemaId: "CFG_SYNTHETIC_PARTNERFI_ALPHA_V1",
      externalContractRef: GAMMA.evidenceRef,
      scope: "CAPABILITY_EXECUTION",
      evidenceRefs: [GAMMA.evidenceRef],
    },
    level: "L1_SYNTHETIC",
    startedAt: "2026-10-14T13:01:00.000Z",
    completedAt: "2026-10-14T13:02:00.000Z",
  });

  assert.equal(report.result, "PASS");
  assert.equal(report.authorityGranted, false);
  assert.match(certificationEvidenceRef(report), /^CERT:/);
  assert.equal(report.subject.adapterId, SYNTHETIC_ADAPTER_IDS.ALPHA);
});
