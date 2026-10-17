import assert from "node:assert/strict";
import test from "node:test";

import {
  DataAccessBasisRecordSchema,
  SyntheticDataAccessPolicySchema,
  evaluateSyntheticDataAccessBasis,
} from "../src/domain/dataAccessBasis";

const SUBJECT = "2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b";

function policy(overrides: Record<string, unknown> = {}) {
  return SyntheticDataAccessPolicySchema.parse({
    policyVersion: "policy-v1",
    policyRef: "policy_stage4_data_access_v1",
    dataMode: "SYNTHETIC_POLICY_FIXTURE",
    status: "ACTIVE",
    allowedBasisTypes: [
      "CONSENT",
      "CONTRACTUAL_NECESSITY",
      "LEGAL_OBLIGATION",
      "OTHER_APPROVED_BASIS",
    ],
    allowedRequestingOrgIds: ["partnerfi_alpha"],
    allowedPurposes: ["farmer360_profile_review", "partnerfi_decision_support"],
    allowedDataClasses: ["PROFILE", "CONTACT", "EVIDENCE", "DECISION_SUPPORT"],
    recognizedBasisEvidenceRefs: [
      "evidence_consent_validation_01",
      "evidence_contract_validation_01",
      "evidence_mandate_validation_01",
      "evidence_other_basis_validation_01",
    ],
    effectiveAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    governanceEvidenceRef: "evidence_governance_policy_review_01",
    ...overrides,
  });
}

function consentBasis(overrides: Record<string, unknown> = {}) {
  return DataAccessBasisRecordSchema.parse({
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
  });
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    subjectRef: SUBJECT,
    requestingOrgId: "partnerfi_alpha",
    purpose: "farmer360_profile_review",
    requestedDataClasses: ["PROFILE"],
    basisId: "basis_consent_01",
    requestedAt: "2026-10-17T00:00:00.000Z",
    ...overrides,
  };
}

test("D2 DATA_ACCESS_BASIS_GATE allows only a fully scoped synthetic policy fixture", () => {
  const result = evaluateSyntheticDataAccessBasis({
    request: request(),
    basis: consentBasis(),
    policy: policy(),
  });

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "BASIS_VALIDATED_UNDER_SYNTHETIC_POLICY");
  assert.equal(result.basisPolicyValidated, true);
  assert.equal(result.legalSufficiencyEstablished, false);
  assert.equal(result.externalApprovalEstablished, false);
  assert.equal(result.regulatedAuthorityEstablished, false);
});

test("D2 consent withdrawal closes forward consent-based access", () => {
  const result = evaluateSyntheticDataAccessBasis({
    request: request({ requestedAt: "2026-10-18T00:00:00.000Z" }),
    basis: consentBasis({ consentWithdrawnAt: "2026-10-17T12:00:00.000Z" }),
    policy: policy(),
  });

  assert.equal(result.decision, "DENY");
  assert.equal(result.reason, "CONSENT_WITHDRAWN");
});

test("D2 missing, expired, suspended or revoked basis state fails closed", () => {
  for (const status of ["SUSPENDED", "REVOKED", "WITHDRAWN"] as const) {
    const result = evaluateSyntheticDataAccessBasis({
      request: request(),
      basis: consentBasis({ status }),
      policy: policy(),
    });
    assert.equal(result.decision, "DENY");
    assert.equal(result.reason, "BASIS_INACTIVE");
  }

  const expired = evaluateSyntheticDataAccessBasis({
    request: request({ requestedAt: "2026-11-01T00:00:00.000Z" }),
    basis: consentBasis(),
    policy: policy(),
  });
  assert.equal(expired.reason, "BASIS_EXPIRED");
});

test("D2 request cannot escape subject, recipient organization, purpose or data-class scope", () => {
  const cases = [
    [request({ subjectRef: "f0876671-1093-46af-8a0e-28e65f3656fd" }), "SUBJECT_MISMATCH"],
    [request({ requestingOrgId: "partnerfi_beta" }), "REQUESTING_ORG_MISMATCH"],
    [request({ purpose: "partnerfi_decision_support" }), "PURPOSE_MISMATCH"],
    [request({ requestedDataClasses: ["EVIDENCE"] }), "DATA_CLASS_NOT_ALLOWED_BY_BASIS"],
  ] as const;

  for (const [candidate, reason] of cases) {
    const result = evaluateSyntheticDataAccessBasis({
      request: candidate,
      basis: consentBasis(),
      policy: policy(),
    });
    assert.equal(result.decision, "DENY");
    assert.equal(result.reason, reason);
  }
});

test("D2 recognized evidence is required; a reference string alone is not self-authorizing", () => {
  const result = evaluateSyntheticDataAccessBasis({
    request: request(),
    basis: consentBasis({ basisEvidenceRef: "evidence_unrecognized_claim_01" }),
    policy: policy(),
  });

  assert.equal(result.decision, "DENY");
  assert.equal(result.reason, "BASIS_EVIDENCE_NOT_RECOGNIZED");
});

test("D2 basis schemas require type-specific evidence without mixing basis semantics", () => {
  assert.throws(() => consentBasis({ consentGrantRef: undefined }));
  assert.throws(() =>
    DataAccessBasisRecordSchema.parse({
      ...consentBasis(),
      basisType: "CONTRACTUAL_NECESSITY",
      consentGrantRef: undefined,
      contractRef: undefined,
    }),
  );

  const contractual = DataAccessBasisRecordSchema.parse({
    ...consentBasis(),
    basisId: "basis_contract_01",
    basisType: "CONTRACTUAL_NECESSITY",
    basisEvidenceRef: "evidence_contract_validation_01",
    consentGrantRef: undefined,
    contractRef: "contract_partner_service_01",
  });
  assert.equal(contractual.basisType, "CONTRACTUAL_NECESSITY");

  const mandate = DataAccessBasisRecordSchema.parse({
    ...consentBasis(),
    basisId: "basis_mandate_01",
    basisType: "LEGAL_OBLIGATION",
    basisEvidenceRef: "evidence_mandate_validation_01",
    consentGrantRef: undefined,
    mandateRef: "mandate_synthetic_01",
  });
  assert.equal(mandate.basisType, "LEGAL_OBLIGATION");
});

test("D2 OTHER_APPROVED_BASIS must bind to the exact configured synthetic policy", () => {
  const basis = DataAccessBasisRecordSchema.parse({
    ...consentBasis(),
    basisId: "basis_other_01",
    basisType: "OTHER_APPROVED_BASIS",
    basisEvidenceRef: "evidence_other_basis_validation_01",
    consentGrantRef: undefined,
    approvedBasisPolicyRef: "policy_wrong_other_basis",
  });
  const result = evaluateSyntheticDataAccessBasis({
    request: request({ basisId: "basis_other_01" }),
    basis,
    policy: policy(),
  });

  assert.equal(result.decision, "DENY");
  assert.equal(result.reason, "OTHER_BASIS_POLICY_MISMATCH");
});

test("D2 policy scope, version and lifecycle independently fail closed", () => {
  const cases = [
    [policy({ status: "REVOKED" }), "POLICY_INACTIVE"],
    [policy({ policyVersion: "policy-v2" }), "POLICY_VERSION_MISMATCH"],
    [policy({ allowedBasisTypes: ["LEGAL_OBLIGATION"] }), "BASIS_TYPE_NOT_ALLOWED"],
    [policy({ allowedRequestingOrgIds: ["partnerfi_beta"] }), "ORG_NOT_ALLOWED"],
    [policy({ allowedPurposes: ["partnerfi_decision_support"] }), "PURPOSE_NOT_ALLOWED"],
    [policy({ allowedDataClasses: ["EVIDENCE"] }), "DATA_CLASS_NOT_ALLOWED_BY_POLICY"],
  ] as const;

  for (const [candidatePolicy, reason] of cases) {
    const result = evaluateSyntheticDataAccessBasis({
      request: request(),
      basis: consentBasis(),
      policy: candidatePolicy,
    });
    assert.equal(result.decision, "DENY");
    assert.equal(result.reason, reason);
  }
});
