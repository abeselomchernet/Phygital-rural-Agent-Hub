import assert from "node:assert/strict";
import test from "node:test";

import {
  PartnerOnboardingRecordSchema,
  bindPartnerCapability,
  classifyPartnerOnboardingPath,
  createPartnerOnboardingRecord,
  recordPartnerCapabilityCertification,
  transitionPartnerOnboarding,
} from "../src/domain/partnerOnboarding";

const at = (minute: number) => `2026-10-14T11:${String(minute).padStart(2, "0")}:00.000Z`;

function draft(capabilities = ["FIN.ACCOUNT_LOOKUP"] as const) {
  return createPartnerOnboardingRecord({
    onboardingId: "onboard_gamma_001",
    partnerOrgId: "org_syn_gamma",
    partnerClass: "FINANCIAL_INSTITUTION",
    displayName: "Synthetic PartnerFI Gamma",
    environment: "sandbox",
    path: "CONFIGURATION_ONLY",
    requestedServices: ["svc_gamma_account_lookup"],
    requestedCapabilities: [...capabilities],
    evidenceRefs: ["EV-GAMMA-CONTRACT"],
    at: at(0),
  });
}

function toTechnical() {
  let record = draft();
  record = transitionPartnerOnboarding({
    record,
    target: "CONTRACT_REVIEW",
    actorRole: "PARTNER_ADMIN",
    at: at(1),
  });
  return transitionPartnerOnboarding({
    record,
    target: "TECHNICAL_CONFIGURATION",
    actorRole: "TECHNICAL_REVIEWER",
    at: at(2),
  });
}

function executableBinding() {
  return {
    serviceId: "svc_gamma_account_lookup",
    capabilityId: "FIN.ACCOUNT_LOOKUP" as const,
    routeId: "route_gamma_sandbox_v1",
    adapterId: "adapter_gamma_sandbox_v1",
    adapterVersion: 1,
    routeVersion: 1,
    environment: "sandbox" as const,
    runtimeMode: "EXECUTABLE" as const,
    configSchemaId: "CFG_GAMMA_SANDBOX_V1",
    credentialRef: "secretref_gamma_sandbox",
    evidenceRefs: ["EV-GAMMA-ADAPTER"],
  };
}

test("configuration-only onboarding reaches sandbox certification without partner-specific code", () => {
  assert.equal(
    classifyPartnerOnboardingPath({
      serviceTypesSupported: true,
      capabilitiesSupported: true,
      adapterCompatible: true,
      domainSemanticsSupported: true,
    }),
    "CONFIGURATION_ONLY",
  );

  let record = toTechnical();
  record = bindPartnerCapability({
    record,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    binding: executableBinding(),
    actorRole: "TECHNICAL_REVIEWER",
    at: at(3),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "SANDBOX_READY",
    actorRole: "TECHNICAL_REVIEWER",
    at: at(4),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "CERTIFICATION_PENDING",
    actorRole: "TECHNICAL_REVIEWER",
    at: at(5),
  });
  record = recordPartnerCapabilityCertification({
    record,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    certificationRefs: ["EV-CERT-GAMMA-ACCOUNT"],
    actorRole: "TECHNICAL_REVIEWER",
    at: at(6),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "SANDBOX_CERTIFIED",
    actorRole: "GOVERNANCE_ADMIN",
    at: at(7),
  });

  assert.equal(record.organizationState, "SANDBOX_CERTIFIED");
  assert.equal(record.capabilities[0]?.state, "SANDBOX_CERTIFIED");
  assert.equal(record.capabilities[0]?.activationEligible, true);
  assert.ok(record.decisions.length >= 7);
});

test("Stage 3 blocks staging even after sandbox certification", () => {
  let record = toTechnical();
  record = bindPartnerCapability({
    record,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    binding: executableBinding(),
    actorRole: "TECHNICAL_REVIEWER",
    at: at(3),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "SANDBOX_READY",
    actorRole: "TECHNICAL_REVIEWER",
    at: at(4),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "CERTIFICATION_PENDING",
    actorRole: "TECHNICAL_REVIEWER",
    at: at(5),
  });
  record = recordPartnerCapabilityCertification({
    record,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    certificationRefs: ["EV-CERT-GAMMA-ACCOUNT"],
    actorRole: "TECHNICAL_REVIEWER",
    at: at(6),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "SANDBOX_CERTIFIED",
    actorRole: "GOVERNANCE_ADMIN",
    at: at(7),
  });

  assert.throws(
    () =>
      transitionPartnerOnboarding({
        record,
        target: "STAGING_PENDING",
        actorRole: "GOVERNANCE_ADMIN",
        at: at(8),
      }),
    /PROGRAM_STAGE_BLOCKS_TRANSITION/,
  );
});

test("foundation-only sandbox/TestBed registration can be certified as a foundation but never becomes activation eligible", () => {
  let record = toTechnical();
  record = bindPartnerCapability({
    record,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    binding: { ...executableBinding(), runtimeMode: "FOUNDATION_ONLY" },
    actorRole: "TECHNICAL_REVIEWER",
    at: at(3),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "SANDBOX_READY",
    actorRole: "TECHNICAL_REVIEWER",
    at: at(4),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "CERTIFICATION_PENDING",
    actorRole: "TECHNICAL_REVIEWER",
    at: at(5),
  });
  record = recordPartnerCapabilityCertification({
    record,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    certificationRefs: ["EV-CERT-GAMMA-FOUNDATION"],
    actorRole: "TECHNICAL_REVIEWER",
    at: at(6),
  });

  assert.equal(record.capabilities[0]?.state, "SANDBOX_CERTIFIED");
  assert.equal(record.capabilities[0]?.activationEligible, false);
  assert.equal(
    record.decisions.at(-1)?.code,
    "FOUNDATION_CERTIFIED_NOT_ACTIVATION_ELIGIBLE",
  );
});

test("Partner Admin cannot self-certify or bypass separate certification review", () => {
  let record = toTechnical();
  record = bindPartnerCapability({
    record,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    binding: executableBinding(),
    actorRole: "PARTNER_ADMIN",
    at: at(3),
  });
  record = transitionPartnerOnboarding({
    record,
    target: "SANDBOX_READY",
    actorRole: "PARTNER_ADMIN",
    at: at(4),
  });
  assert.throws(
    () =>
      transitionPartnerOnboarding({
        record,
        target: "CERTIFICATION_PENDING",
        actorRole: "PARTNER_ADMIN",
        at: at(5),
      }),
    /SEPARATE_CERTIFICATION_REVIEW_REQUIRED/,
  );
});

test("unsupported protocol and unsupported domain semantics take separate engineering paths", () => {
  assert.equal(
    classifyPartnerOnboardingPath({
      serviceTypesSupported: true,
      capabilitiesSupported: true,
      adapterCompatible: false,
      domainSemanticsSupported: true,
    }),
    "NEW_ADAPTER_REQUIRED",
  );
  assert.equal(
    classifyPartnerOnboardingPath({
      serviceTypesSupported: false,
      capabilitiesSupported: false,
      adapterCompatible: false,
      domainSemanticsSupported: false,
    }),
    "NEW_DOMAIN_CAPABILITY_REQUIRED",
  );
});

test("ordinary onboarding records reject secret-bearing and unknown fields", () => {
  const record = draft();
  assert.equal(
    PartnerOnboardingRecordSchema.safeParse({
      ...record,
      apiSecret: "must-not-be-stored",
    }).success,
    false,
  );
});
