import assert from "node:assert/strict";
import test from "node:test";

import {
  CertificationReportSchema,
  CertificationSubjectSchema,
  certificationEvidenceRef,
  runContractCertification,
} from "../src/domain/contractCertification";
import {
  bindPartnerCapability,
  createPartnerOnboardingRecord,
  recordPartnerCapabilityCertification,
  transitionPartnerOnboarding,
} from "../src/domain/partnerOnboarding";

const startedAt = "2026-10-14T12:00:00.000Z";
const completedAt = "2026-10-14T12:01:00.000Z";

function syntheticSubject(partner: "alpha" | "beta") {
  const alpha = partner === "alpha";
  const org = alpha ? "org_syn_alpha" : "org_syn_beta";
  return CertificationSubjectSchema.parse({
    partnerOrgId: org,
    contractPartnerOrgId: org,
    catalogPartnerOrgId: org,
    routeProviderOrgId: org,
    contractVersion: 1,
    catalogVersion: 1,
    serviceId: alpha ? "svc_alpha_account_lookup" : "svc_beta_account_lookup",
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    routeId: alpha ? "route_syn_partnerfi_alpha" : "route_syn_partnerfi_beta",
    routeVersion: 1,
    adapterId: alpha ? "adapter_syn_partnerfi_alpha_v1" : "adapter_syn_partnerfi_beta_v1",
    adapterVersion: 1,
    runtimeMode: "EXECUTABLE",
    environment: "synthetic",
    configSchemaId: alpha ? "CFG_SYNTHETIC_PARTNERFI_ALPHA_V1" : "CFG_SYNTHETIC_PARTNERFI_BETA_V1",
    externalContractRef: alpha ? "EV-SYN-ALPHA-V1" : "EV-SYN-BETA-V1",
    scope: "CAPABILITY_EXECUTION",
    evidenceRefs: [alpha ? "EV-SYN-ALPHA-V1" : "EV-SYN-BETA-V1"],
  });
}

test("same certification runner passes heterogeneous synthetic PartnerFI subjects without institution branches", () => {
  for (const [partner, id] of [
    ["alpha", "cert_alpha_l1"],
    ["beta", "cert_beta_l1"],
  ] as const) {
    const report = runContractCertification({
      certificationId: id,
      subject: syntheticSubject(partner),
      level: "L1_SYNTHETIC",
      startedAt,
      completedAt,
    });
    assert.equal(report.result, "PASS");
    assert.equal(report.authorityGranted, false);
    assert.equal(report.subject.partnerOrgId, `org_syn_${partner}`);
  }
});

test("cross-partner subject fails common authorization certification", () => {
  const subject = {
    ...syntheticSubject("alpha"),
    catalogPartnerOrgId: "org_syn_beta",
  };
  const report = runContractCertification({
    certificationId: "cert_cross_partner",
    subject,
    level: "L1_SYNTHETIC",
    startedAt,
    completedAt,
  });
  assert.equal(report.result, "FAIL");
  assert.equal(
    report.checks.find((entry) => entry.definition.checkId === "CERT.AUTH.PARTNER_SCOPE")
      ?.observation.outcome,
    "FAIL",
  );
});

test("foundation-only Telebirr style subject can certify foundation scope but not executable payment scope", () => {
  const base = {
    partnerOrgId: "org_telebirr_testbed",
    contractPartnerOrgId: "org_telebirr_testbed",
    catalogPartnerOrgId: "org_telebirr_testbed",
    routeProviderOrgId: "org_telebirr_testbed",
    contractVersion: 1,
    catalogVersion: 1,
    serviceId: "svc_telebirr_token_foundation",
    capabilityId: "PAY.C2B_CREATE" as const,
    routeId: "route_telebirr_testbed_foundation",
    routeVersion: 1,
    adapterId: "adapter_telebirr_testbed_foundation_v1",
    adapterVersion: 1,
    runtimeMode: "FOUNDATION_ONLY" as const,
    environment: "testbed" as const,
    configSchemaId: "CFG_TELEBIRR_TESTBED_FOUNDATION_V1",
    externalContractRef: "EV-TELEBIRR-FOUNDATION",
    evidenceRefs: ["EV-TELEBIRR-FOUNDATION"],
  };

  const foundation = runContractCertification({
    certificationId: "cert_telebirr_foundation",
    subject: { ...base, scope: "FOUNDATION_OPERATION" },
    level: "L2_EXTERNAL_SANDBOX_TESTBED",
    controlledExternalRun: true,
    startedAt,
    completedAt,
  });
  assert.equal(foundation.result, "PASS");
  assert.equal(foundation.authorityGranted, false);

  const paymentExecution = runContractCertification({
    certificationId: "cert_telebirr_payment",
    subject: { ...base, scope: "CAPABILITY_EXECUTION" },
    level: "L2_EXTERNAL_SANDBOX_TESTBED",
    controlledExternalRun: true,
    startedAt,
    completedAt,
  });
  assert.equal(paymentExecution.result, "FAIL");
  assert.equal(
    paymentExecution.checks.find(
      (entry) => entry.definition.checkId === "CERT.STATE.RUNTIME_MODE",
    )?.observation.outcome,
    "FAIL",
  );
});

test("M-PESA sandbox foundation requires controlled external L2 evidence and does not imply payment authority", () => {
  const subject = CertificationSubjectSchema.parse({
    partnerOrgId: "org_mpesa_ethiopia_sandbox",
    contractPartnerOrgId: "org_mpesa_ethiopia_sandbox",
    catalogPartnerOrgId: "org_mpesa_ethiopia_sandbox",
    routeProviderOrgId: "org_mpesa_ethiopia_sandbox",
    contractVersion: 1,
    catalogVersion: 1,
    serviceId: "svc_mpesa_token_foundation",
    capabilityId: "PAY.C2B_CREATE",
    routeId: "route_mpesa_ethiopia_sandbox_foundation",
    routeVersion: 1,
    adapterId: "adapter_mpesa_ethiopia_sandbox_foundation_v1",
    adapterVersion: 1,
    runtimeMode: "FOUNDATION_ONLY",
    environment: "sandbox",
    configSchemaId: "CFG_MPESA_ETHIOPIA_SANDBOX_FOUNDATION_V1",
    externalContractRef: "EV-MPESA-TOKEN",
    scope: "FOUNDATION_OPERATION",
    evidenceRefs: ["EV-MPESA-TOKEN"],
  });

  const uncontrolled = runContractCertification({
    certificationId: "cert_mpesa_uncontrolled",
    subject,
    level: "L2_EXTERNAL_SANDBOX_TESTBED",
    startedAt,
    completedAt,
  });
  assert.equal(uncontrolled.result, "FAIL");

  const controlled = runContractCertification({
    certificationId: "cert_mpesa_controlled",
    subject,
    level: "L2_EXTERNAL_SANDBOX_TESTBED",
    controlledExternalRun: true,
    startedAt,
    completedAt,
  });
  assert.equal(controlled.result, "PASS");
  assert.equal(controlled.authorityGranted, false);
});

test("required profile check not executed makes report INCOMPLETE", () => {
  const report = runContractCertification({
    certificationId: "cert_profile_incomplete",
    subject: syntheticSubject("alpha"),
    level: "L1_SYNTHETIC",
    profileChecks: [
      {
        checkId: "CERT.PROFILE.IDEMPOTENCY",
        required: true,
        family: "IDEMPOTENCY_REPLAY",
        description: "Adapter idempotency profile check.",
      },
    ],
    startedAt,
    completedAt,
  });
  assert.equal(report.result, "INCOMPLETE");
});

test("high finding makes an otherwise passing report FAIL", () => {
  const report = runContractCertification({
    certificationId: "cert_high_finding",
    subject: syntheticSubject("alpha"),
    level: "L1_SYNTHETIC",
    findings: [
      {
        findingId: "finding_high_01",
        severity: "HIGH",
        checkId: "CERT.ROUTE.PROVENANCE",
        summary: "Route evidence requires remediation.",
        evidenceRefs: ["EV-FINDING-01"],
      },
    ],
    startedAt,
    completedAt,
  });
  assert.equal(report.result, "FAIL");
  assert.throws(() => certificationEvidenceRef(report), /CERTIFICATION_PASS_REQUIRED/);
});

test("Stage 3 blocks L3/L4 certification levels", () => {
  for (const level of ["L3_STAGING", "L4_PRODUCTION_READINESS"] as const) {
    const report = runContractCertification({
      certificationId: `cert_${level.toLowerCase()}`,
      subject: syntheticSubject("alpha"),
      level,
      startedAt,
      completedAt,
    });
    assert.equal(report.result, "FAIL");
  }
});

test("strict report schema rejects secret-bearing unknown fields", () => {
  const report = runContractCertification({
    certificationId: "cert_strict_report",
    subject: syntheticSubject("alpha"),
    level: "L1_SYNTHETIC",
    startedAt,
    completedAt,
  });
  assert.equal(
    CertificationReportSchema.safeParse({ ...report, apiSecret: "do-not-store" }).success,
    false,
  );
});

test("PASS evidence can be consumed by onboarding but does not self-advance organization authority", () => {
  const report = runContractCertification({
    certificationId: "cert_gamma_account",
    subject: {
      ...syntheticSubject("alpha"),
      partnerOrgId: "org_syn_gamma",
      contractPartnerOrgId: "org_syn_gamma",
      catalogPartnerOrgId: "org_syn_gamma",
      routeProviderOrgId: "org_syn_gamma",
      serviceId: "svc_gamma_account_lookup",
      routeId: "route_gamma_sandbox_v1",
      adapterId: "adapter_gamma_sandbox_v1",
      environment: "sandbox",
      configSchemaId: "CFG_GAMMA_SANDBOX_V1",
      externalContractRef: "EV-GAMMA-ADAPTER",
      evidenceRefs: ["EV-GAMMA-ADAPTER"],
    },
    level: "L2_EXTERNAL_SANDBOX_TESTBED",
    controlledExternalRun: true,
    startedAt,
    completedAt,
  });
  assert.equal(report.result, "PASS");
  const ref = certificationEvidenceRef(report);

  let onboarding = createPartnerOnboardingRecord({
    onboardingId: "onboard_gamma_cert",
    partnerOrgId: "org_syn_gamma",
    partnerClass: "FINANCIAL_INSTITUTION",
    displayName: "Synthetic PartnerFI Gamma",
    environment: "sandbox",
    path: "CONFIGURATION_ONLY",
    requestedServices: ["svc_gamma_account_lookup"],
    requestedCapabilities: ["FIN.ACCOUNT_LOOKUP"],
    evidenceRefs: ["EV-GAMMA-CONTRACT"],
    at: startedAt,
  });
  onboarding = transitionPartnerOnboarding({
    record: onboarding,
    target: "CONTRACT_REVIEW",
    actorRole: "PARTNER_ADMIN",
    at: "2026-10-14T12:02:00.000Z",
  });
  onboarding = transitionPartnerOnboarding({
    record: onboarding,
    target: "TECHNICAL_CONFIGURATION",
    actorRole: "TECHNICAL_REVIEWER",
    at: "2026-10-14T12:03:00.000Z",
  });
  onboarding = bindPartnerCapability({
    record: onboarding,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    binding: {
      serviceId: "svc_gamma_account_lookup",
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      routeId: "route_gamma_sandbox_v1",
      adapterId: "adapter_gamma_sandbox_v1",
      adapterVersion: 1,
      routeVersion: 1,
      environment: "sandbox",
      runtimeMode: "EXECUTABLE",
      configSchemaId: "CFG_GAMMA_SANDBOX_V1",
      credentialRef: "secretref_gamma_sandbox",
      evidenceRefs: ["EV-GAMMA-ADAPTER"],
    },
    actorRole: "TECHNICAL_REVIEWER",
    at: "2026-10-14T12:04:00.000Z",
  });
  onboarding = transitionPartnerOnboarding({
    record: onboarding,
    target: "SANDBOX_READY",
    actorRole: "TECHNICAL_REVIEWER",
    at: "2026-10-14T12:05:00.000Z",
  });
  onboarding = transitionPartnerOnboarding({
    record: onboarding,
    target: "CERTIFICATION_PENDING",
    actorRole: "TECHNICAL_REVIEWER",
    at: "2026-10-14T12:06:00.000Z",
  });
  onboarding = recordPartnerCapabilityCertification({
    record: onboarding,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    certificationRefs: [ref],
    actorRole: "TECHNICAL_REVIEWER",
    at: "2026-10-14T12:07:00.000Z",
  });

  assert.equal(onboarding.organizationState, "CERTIFICATION_PENDING");
  assert.equal(onboarding.capabilities[0]?.state, "SANDBOX_CERTIFIED");
  assert.equal(report.authorityGranted, false);
});
