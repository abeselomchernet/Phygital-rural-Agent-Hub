import assert from "node:assert/strict";
import test from "node:test";

import {
  ScopedAuthorizationPrincipalSchema,
  ScopedAuthorizationRequestSchema,
  evaluateScopedAuthorization,
  governanceClassForRole,
} from "../src/domain/scopedAuthorization";

const SUBJECT = "2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b";

function principal(overrides: Record<string, unknown> = {}) {
  return ScopedAuthorizationPrincipalSchema.parse({
    principalId: "synthetic_agent_01",
    role: "AGENT",
    tenantId: "tenant_stage4_synthetic",
    partnerOrgMemberships: ["partnerfi_alpha"],
    hubScopes: ["hub_adama_shared"],
    regionScopes: ["region_adama"],
    serviceScopes: ["farmer360_profile"],
    capabilityScopes: ["customer_profile_view"],
    dataClassScopes: ["PROFILE", "CONTACT", "SERVICE_HISTORY", "EVIDENCE"],
    purposeScopes: ["farmer360_profile_review"],
    ...overrides,
  });
}

function request(overrides: Record<string, unknown> = {}) {
  return ScopedAuthorizationRequestSchema.parse({
    verb: "READ",
    tenantId: "tenant_stage4_synthetic",
    partnerOrgId: "partnerfi_alpha",
    hubId: "hub_adama_shared",
    regionId: "region_adama",
    serviceId: "farmer360_profile",
    capabilityId: "customer_profile_view",
    dataClass: "PROFILE",
    purpose: "farmer360_profile_review",
    customerSpecific: true,
    subjectRef: SUBJECT,
    basisId: "basis_consent_01",
    requestedAt: "2026-10-17T00:00:00.000Z",
    ...overrides,
  });
}

function basis(overrides: Record<string, unknown> = {}) {
  return {
    basisId: "basis_consent_01",
    subjectRef: SUBJECT,
    requestingOrgId: "partnerfi_alpha",
    purpose: "farmer360_profile_review",
    basisType: "CONSENT",
    basisEvidenceRef: "evidence_consent_validation_01",
    policyVersion: "policy-v1",
    status: "ACTIVE",
    dataClasses: ["PROFILE", "CONTACT"],
    validFrom: "2026-10-01T00:00:00.000Z",
    validUntil: "2026-11-01T00:00:00.000Z",
    auditRef: "audit_consent_basis_01",
    consentGrantRef: "consent_profile_review_01",
    ...overrides,
  };
}

function policy(overrides: Record<string, unknown> = {}) {
  return {
    policyVersion: "policy-v1",
    policyRef: "policy_stage4_data_access_v1",
    dataMode: "SYNTHETIC_POLICY_FIXTURE",
    status: "ACTIVE",
    allowedBasisTypes: ["CONSENT"],
    allowedRequestingOrgIds: ["partnerfi_alpha"],
    allowedPurposes: ["farmer360_profile_review"],
    allowedDataClasses: ["PROFILE", "CONTACT"],
    recognizedBasisEvidenceRefs: ["evidence_consent_validation_01"],
    effectiveAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    governanceEvidenceRef: "evidence_governance_policy_review_01",
    ...overrides,
  };
}

test("D4 role registry preserves seven roles across three governance classes", () => {
  assert.equal(governanceClassForRole("AGENT"), "FIELD_AND_FLEET");
  assert.equal(governanceClassForRole("OPERATIONS"), "FIELD_AND_FLEET");
  assert.equal(governanceClassForRole("PARTNER_ADMIN"), "PARTNER_BOUNDARY");
  assert.equal(governanceClassForRole("PARTNERFI_REVIEWER"), "PARTNER_BOUNDARY");
  assert.equal(governanceClassForRole("AUDITOR"), "INDEPENDENT_TRUST");
  assert.equal(governanceClassForRole("PILOT_REVIEWER"), "INDEPENDENT_TRUST");
});

test("D4 seven-predicate S-ABAC allows a fully scoped customer request only with basis gate", () => {
  const result = evaluateScopedAuthorization({
    principal: principal(),
    request: request(),
    basis: basis(),
    basisPolicy: policy(),
  });

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "SCOPED_AUTHORIZATION_ALLOWED");
  assert.equal(result.dataAccessBasisValidated, true);
  assert.equal(result.financialAuthorityGranted, false);
  assert.equal(result.creditApprovalAuthorityGranted, false);
  assert.equal(result.settlementAuthorityGranted, false);
  assert.equal(result.insuranceAdjudicationAuthorityGranted, false);
  assert.equal(result.regulatedAuthorityGranted, false);
});

test("D4 missing customer-specific basis material fails closed", () => {
  const result = evaluateScopedAuthorization({
    principal: principal(),
    request: request(),
  });
  assert.equal(result.decision, "DENY");
  assert.equal(result.reason, "DATA_ACCESS_BASIS_REQUIRED");
});

test("D4 a valid basis can never override an earlier tenant/partner/hub/region/service/capability scope failure", () => {
  const cases = [
    [request({ tenantId: "tenant_other" }), "TENANT_SCOPE_DENIED"],
    [request({ partnerOrgId: "partnerfi_beta" }), "PARTNER_SCOPE_DENIED"],
    [request({ hubId: "hub_arisi_alpha" }), "HUB_SCOPE_DENIED"],
    [request({ regionId: "region_arisi" }), "REGION_SCOPE_DENIED"],
    [request({ serviceId: "other_service" }), "SERVICE_SCOPE_DENIED"],
    [request({ capabilityId: "other_capability" }), "CAPABILITY_SCOPE_DENIED"],
  ] as const;

  for (const [candidate, reason] of cases) {
    const result = evaluateScopedAuthorization({
      principal: principal(),
      request: candidate,
      basis: basis(),
      basisPolicy: policy(),
    });
    assert.equal(result.decision, "DENY");
    assert.equal(result.reason, reason);
    assert.equal(result.dataAccessBasisValidated, false);
  }
});

test("D4 data-class and purpose scope fail before the basis gate", () => {
  const dataDenied = evaluateScopedAuthorization({
    principal: principal({ dataClassScopes: ["EVIDENCE"] }),
    request: request(),
    basis: basis(),
    basisPolicy: policy(),
  });
  assert.equal(dataDenied.reason, "DATA_CLASS_SCOPE_DENIED");

  const purposeDenied = evaluateScopedAuthorization({
    principal: principal({ purposeScopes: ["other_purpose"] }),
    request: request(),
    basis: basis(),
    basisPolicy: policy(),
  });
  assert.equal(purposeDenied.reason, "PURPOSE_SCOPE_DENIED");
});

test("D4 role data policy bars Operations from profile/contact/decision-support customer data", () => {
  for (const dataClass of ["PROFILE", "CONTACT", "DECISION_SUPPORT"] as const) {
    const result = evaluateScopedAuthorization({
      principal: principal({
        principalId: "synthetic_operations_01",
        role: "OPERATIONS",
        dataClassScopes: [dataClass],
      }),
      request: request({ dataClass }),
      basis: basis({ dataClasses: [dataClass] }),
      basisPolicy: policy({ allowedDataClasses: [dataClass] }),
    });
    assert.equal(result.decision, "DENY");
    assert.equal(result.reason, "ROLE_DATA_CLASS_DENIED");
  }
});

test("D4 PartnerFI reviewer receives decision-support scope without credit approval authority", () => {
  const reviewer = principal({
    principalId: "synthetic_partnerfi_reviewer_01",
    role: "PARTNERFI_REVIEWER",
    dataClassScopes: ["DECISION_SUPPORT"],
    purposeScopes: ["partnerfi_decision_support"],
  });
  const reviewerRequest = request({
    dataClass: "DECISION_SUPPORT",
    purpose: "partnerfi_decision_support",
  });
  const result = evaluateScopedAuthorization({
    principal: reviewer,
    request: reviewerRequest,
    basis: basis({
      purpose: "partnerfi_decision_support",
      dataClasses: ["DECISION_SUPPORT"],
    }),
    basisPolicy: policy({
      allowedPurposes: ["partnerfi_decision_support"],
      allowedDataClasses: ["DECISION_SUPPORT"],
    }),
  });

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.creditApprovalAuthorityGranted, false);
  assert.equal(result.financialAuthorityGranted, false);
  assert.equal(result.settlementAuthorityGranted, false);
});

test("D4 independent-trust roles are read-only at this foundation boundary", () => {
  for (const role of ["AUDITOR", "PILOT_REVIEWER"] as const) {
    for (const verb of ["CAPTURE", "REVIEW", "ADMINISTER"] as const) {
      const result = evaluateScopedAuthorization({
        principal: principal({
          principalId: `synthetic_${role.toLowerCase()}_01`,
          role,
          dataClassScopes: ["AGGREGATE"],
        }),
        request: request({
          verb,
          dataClass: "AGGREGATE",
          customerSpecific: false,
          subjectRef: undefined,
          basisId: undefined,
        }),
      });
      assert.equal(result.decision, "DENY");
      assert.equal(result.reason, "ROLE_VERB_DENIED");
    }
  }
});

test("D4 Pilot Reviewer may read aggregate scope but cannot access an individual customer", () => {
  const pilot = principal({
    principalId: "synthetic_pilot_reviewer_01",
    role: "PILOT_REVIEWER",
    dataClassScopes: ["AGGREGATE"],
  });
  const aggregate = evaluateScopedAuthorization({
    principal: pilot,
    request: request({
      dataClass: "AGGREGATE",
      customerSpecific: false,
      subjectRef: undefined,
      basisId: undefined,
    }),
  });
  assert.equal(aggregate.decision, "ALLOW");
  assert.equal(aggregate.dataAccessBasisValidated, false);

  assert.throws(() =>
    ScopedAuthorizationRequestSchema.parse({
      ...request(),
      dataClass: "AGGREGATE",
      customerSpecific: true,
    }),
  );
});

test("D4 Auditor can read bounded customer evidence only with a validated basis", () => {
  const auditor = principal({
    principalId: "synthetic_auditor_01",
    role: "AUDITOR",
    dataClassScopes: ["EVIDENCE", "AGGREGATE"],
  });
  const evidenceRequest = request({ dataClass: "EVIDENCE" });
  const allowed = evaluateScopedAuthorization({
    principal: auditor,
    request: evidenceRequest,
    basis: basis({ dataClasses: ["EVIDENCE"] }),
    basisPolicy: policy({ allowedDataClasses: ["EVIDENCE"] }),
  });
  assert.equal(allowed.decision, "ALLOW");

  const withoutBasis = evaluateScopedAuthorization({
    principal: auditor,
    request: evidenceRequest,
  });
  assert.equal(withoutBasis.decision, "DENY");
  assert.equal(withoutBasis.reason, "DATA_ACCESS_BASIS_REQUIRED");
});

test("D4 aggregate requests cannot smuggle subject or basis identifiers", () => {
  assert.throws(() =>
    ScopedAuthorizationRequestSchema.parse({
      ...request(),
      dataClass: "AGGREGATE",
      customerSpecific: false,
    }),
  );
});
