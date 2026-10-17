import assert from "node:assert/strict";
import test from "node:test";

import type { Customer } from "../src/domain/customer";
import {
  CustomerProjectionError,
  maskEthiopianPhone,
  projectCustomerForRole,
} from "../src/domain/customerProjection";

const customer: Customer = {
  customerId: "2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b",
  partnerCustomerId: "partner-raw-123",
  primaryPhone: "+251911234567",
  phoneVerifiedAt: "2026-10-01T00:00:00.000Z",
  phoneStatus: "VERIFIED",
  kycStatus: "VERIFIED",
  kycVerifiedAt: "2026-10-01T00:00:00.000Z",
  kycMethod: "MOCK_FAYDA",
  identityReference: "raw-identity-reference",
  riskState: "NORMAL",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const ppid = "ppid_v1_k1_abcdefghijklmnopqrstuvwxyzA";
const digest = `sha256:${"a".repeat(64)}`;

function serialized(value: unknown) {
  return JSON.stringify(value);
}

function assertNoRawIdentity(value: unknown) {
  const text = serialized(value);
  assert.equal(text.includes(customer.customerId), false);
  assert.equal(text.includes(customer.partnerCustomerId!), false);
  assert.equal(text.includes(customer.primaryPhone!), false);
  assert.equal(text.includes(customer.identityReference!), false);
  assert.equal(text.includes("MOCK_FAYDA"), false);
}

test("D4 customer projection masks Ethiopian phone without exposing raw phone", () => {
  assert.equal(maskEthiopianPhone("+251911234567"), "+251 9*** **67");
  assert.equal(maskEthiopianPhone(undefined), undefined);
});

test("D4 Agent projection exposes only assignment-scoped minimum fields", () => {
  const result = projectCustomerForRole(customer, {
    role: "AGENT",
    assignmentRef: "assignment_agent_case_01",
  });

  assert.deepEqual(result, {
    projection: "AGENT_CUSTOMER",
    assignmentRef: "assignment_agent_case_01",
    maskedPhone: "+251 9*** **67",
    phoneStatus: "VERIFIED",
    kycStatus: "VERIFIED",
    riskState: "NORMAL",
  });
  assertNoRawIdentity(result);
});

test("D4 Supervisor projection is bounded and carries no canonical/internal identifiers", () => {
  const result = projectCustomerForRole(customer, {
    role: "SUPERVISOR",
    assignmentRef: "assignment_cluster_case_01",
  });
  assert.equal(result.projection, "SUPERVISOR_CUSTOMER");
  assertNoRawIdentity(result);
});

test("D4 Operations receives an explicit PII-barred projection", () => {
  const result = projectCustomerForRole(customer, { role: "OPERATIONS" });
  assert.deepEqual(result, {
    projection: "OPERATIONS_CUSTOMER_PII_BARRED",
    customerPiiAccess: "BARRED",
  });
  assertNoRawIdentity(result);
});

test("D4 Partner Admin receives PPID and status only", () => {
  const result = projectCustomerForRole(customer, {
    role: "PARTNER_ADMIN",
    partnerPpid: ppid,
  });
  assert.deepEqual(result, {
    projection: "PARTNER_ADMIN_CUSTOMER",
    partnerPpid: ppid,
    phoneStatus: "VERIFIED",
    kycStatus: "VERIFIED",
  });
  assertNoRawIdentity(result);
});

test("D4 PartnerFI Reviewer receives PPID and non-binding decision boundary only", () => {
  const result = projectCustomerForRole(customer, {
    role: "PARTNERFI_REVIEWER",
    partnerPpid: ppid,
  });
  assert.deepEqual(result, {
    projection: "PARTNERFI_REVIEWER_CUSTOMER",
    partnerPpid: ppid,
    kycStatus: "VERIFIED",
    decisionAuthority: "PARTNERFI_DECISION_REQUIRED",
    recommendationBinding: false,
  });
  assertNoRawIdentity(result);
});

test("D4 Auditor receives only externally supplied evidence digest/reference projection", () => {
  const result = projectCustomerForRole(customer, {
    role: "AUDITOR",
    subjectEvidenceDigest: digest,
  });
  assert.deepEqual(result, {
    projection: "AUDITOR_CUSTOMER_REFERENCE",
    subjectEvidenceDigest: digest,
    piiIncluded: false,
  });
  assertNoRawIdentity(result);
});

test("D4 Pilot Reviewer cannot receive an individual customer projection", () => {
  assert.throws(
    () => projectCustomerForRole(customer, { role: "PILOT_REVIEWER" }),
    (error: unknown) =>
      error instanceof CustomerProjectionError &&
      error.code === "INDIVIDUAL_CUSTOMER_ACCESS_BARRED_FOR_ROLE",
  );
});

test("D4 role projections fail closed when required opaque reference is absent", () => {
  assert.throws(
    () => projectCustomerForRole(customer, { role: "AGENT" }),
    /ASSIGNMENT_REFERENCE_REQUIRED/,
  );
  assert.throws(
    () => projectCustomerForRole(customer, { role: "PARTNER_ADMIN" }),
    /PARTNER_PPID_REQUIRED/,
  );
  assert.throws(
    () => projectCustomerForRole(customer, { role: "PARTNERFI_REVIEWER" }),
    /PARTNER_PPID_REQUIRED/,
  );
  assert.throws(
    () => projectCustomerForRole(customer, { role: "AUDITOR" }),
    /SUBJECT_EVIDENCE_DIGEST_REQUIRED/,
  );
});

test("D4 raw customer domain shape cannot be parsed as any target role projection", async () => {
  const { CustomerProjectionSchema } = await import("../src/domain/customerProjection");
  assert.equal(CustomerProjectionSchema.safeParse(customer).success, false);
});
