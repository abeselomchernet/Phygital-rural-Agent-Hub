import { z } from "zod";

import type { Customer } from "./customer";
import { Stage4RoleSchema, type Stage4Role } from "./scopedAuthorization";

const MaskedPhoneSchema = z.string().regex(/^\+251 [79]\*{3} \*{2}\d{2}$/);
const AssignmentRefSchema = z.string().regex(/^assignment_[a-z0-9][a-z0-9_-]{2,119}$/);
const PartnerPpidSchema = z.string().regex(/^ppid_v1_k[1-9]\d*_[A-Za-z0-9_-]{27}$/);
const EvidenceDigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

const PhoneStatusSchema = z.enum([
  "UNVERIFIED",
  "VERIFIED",
  "REVERIFICATION_REQUIRED",
  "BLOCKED",
]);
const KycStatusSchema = z.enum([
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REVERIFICATION_REQUIRED",
  "SUSPENDED",
]);
const RiskStateSchema = z.enum(["NORMAL", "REVIEW", "HIGH_RISK", "BLOCKED"]);

export const AgentCustomerProjectionSchema = z
  .object({
    projection: z.literal("AGENT_CUSTOMER"),
    assignmentRef: AssignmentRefSchema,
    maskedPhone: MaskedPhoneSchema.optional(),
    phoneStatus: PhoneStatusSchema,
    kycStatus: KycStatusSchema,
    riskState: RiskStateSchema,
  })
  .strict();

export const SupervisorCustomerProjectionSchema = z
  .object({
    projection: z.literal("SUPERVISOR_CUSTOMER"),
    assignmentRef: AssignmentRefSchema,
    maskedPhone: MaskedPhoneSchema.optional(),
    phoneStatus: PhoneStatusSchema,
    kycStatus: KycStatusSchema,
    riskState: RiskStateSchema,
  })
  .strict();

export const OperationsCustomerProjectionSchema = z
  .object({
    projection: z.literal("OPERATIONS_CUSTOMER_PII_BARRED"),
    customerPiiAccess: z.literal("BARRED"),
  })
  .strict();

export const PartnerAdminCustomerProjectionSchema = z
  .object({
    projection: z.literal("PARTNER_ADMIN_CUSTOMER"),
    partnerPpid: PartnerPpidSchema,
    phoneStatus: PhoneStatusSchema,
    kycStatus: KycStatusSchema,
  })
  .strict();

export const PartnerFiReviewerCustomerProjectionSchema = z
  .object({
    projection: z.literal("PARTNERFI_REVIEWER_CUSTOMER"),
    partnerPpid: PartnerPpidSchema,
    kycStatus: KycStatusSchema,
    decisionAuthority: z.literal("PARTNERFI_DECISION_REQUIRED"),
    recommendationBinding: z.literal(false),
  })
  .strict();

export const AuditorCustomerProjectionSchema = z
  .object({
    projection: z.literal("AUDITOR_CUSTOMER_REFERENCE"),
    subjectEvidenceDigest: EvidenceDigestSchema,
    piiIncluded: z.literal(false),
  })
  .strict();

export const CustomerProjectionSchema = z.union([
  AgentCustomerProjectionSchema,
  SupervisorCustomerProjectionSchema,
  OperationsCustomerProjectionSchema,
  PartnerAdminCustomerProjectionSchema,
  PartnerFiReviewerCustomerProjectionSchema,
  AuditorCustomerProjectionSchema,
]);

export const CustomerProjectionContextSchema = z
  .object({
    role: Stage4RoleSchema,
    assignmentRef: AssignmentRefSchema.optional(),
    partnerPpid: PartnerPpidSchema.optional(),
    subjectEvidenceDigest: EvidenceDigestSchema.optional(),
  })
  .strict();

export type CustomerProjectionContext = z.infer<typeof CustomerProjectionContextSchema>;

export class CustomerProjectionError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export function maskEthiopianPhone(phone?: string) {
  if (!phone) return undefined;
  const parsed = z.string().regex(/^\+251[79]\d{8}$/).parse(phone);
  return MaskedPhoneSchema.parse(
    `+251 ${parsed.slice(4, 5)}*** **${parsed.slice(-2)}`,
  );
}

function requireAssignmentRef(context: CustomerProjectionContext) {
  if (!context.assignmentRef)
    throw new CustomerProjectionError("ASSIGNMENT_REFERENCE_REQUIRED");
  return context.assignmentRef;
}

function requirePartnerPpid(context: CustomerProjectionContext) {
  if (!context.partnerPpid)
    throw new CustomerProjectionError("PARTNER_PPID_REQUIRED");
  return context.partnerPpid;
}

function requireEvidenceDigest(context: CustomerProjectionContext) {
  if (!context.subjectEvidenceDigest)
    throw new CustomerProjectionError("SUBJECT_EVIDENCE_DIGEST_REQUIRED");
  return context.subjectEvidenceDigest;
}

export function projectCustomerForRole(
  customer: Customer,
  contextInput: CustomerProjectionContext,
) {
  const context = CustomerProjectionContextSchema.parse(contextInput);
  const role: Stage4Role = context.role;

  if (role === "PILOT_REVIEWER")
    throw new CustomerProjectionError("INDIVIDUAL_CUSTOMER_ACCESS_BARRED_FOR_ROLE");

  if (role === "OPERATIONS")
    return OperationsCustomerProjectionSchema.parse({
      projection: "OPERATIONS_CUSTOMER_PII_BARRED",
      customerPiiAccess: "BARRED",
    });

  if (role === "AGENT")
    return AgentCustomerProjectionSchema.parse({
      projection: "AGENT_CUSTOMER",
      assignmentRef: requireAssignmentRef(context),
      maskedPhone: maskEthiopianPhone(customer.primaryPhone),
      phoneStatus: customer.phoneStatus,
      kycStatus: customer.kycStatus,
      riskState: customer.riskState,
    });

  if (role === "SUPERVISOR")
    return SupervisorCustomerProjectionSchema.parse({
      projection: "SUPERVISOR_CUSTOMER",
      assignmentRef: requireAssignmentRef(context),
      maskedPhone: maskEthiopianPhone(customer.primaryPhone),
      phoneStatus: customer.phoneStatus,
      kycStatus: customer.kycStatus,
      riskState: customer.riskState,
    });

  if (role === "PARTNER_ADMIN")
    return PartnerAdminCustomerProjectionSchema.parse({
      projection: "PARTNER_ADMIN_CUSTOMER",
      partnerPpid: requirePartnerPpid(context),
      phoneStatus: customer.phoneStatus,
      kycStatus: customer.kycStatus,
    });

  if (role === "PARTNERFI_REVIEWER")
    return PartnerFiReviewerCustomerProjectionSchema.parse({
      projection: "PARTNERFI_REVIEWER_CUSTOMER",
      partnerPpid: requirePartnerPpid(context),
      kycStatus: customer.kycStatus,
      decisionAuthority: "PARTNERFI_DECISION_REQUIRED",
      recommendationBinding: false,
    });

  return AuditorCustomerProjectionSchema.parse({
    projection: "AUDITOR_CUSTOMER_REFERENCE",
    subjectEvidenceDigest: requireEvidenceDigest(context),
    piiIncluded: false,
  });
}
