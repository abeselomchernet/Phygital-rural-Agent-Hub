import { z } from "zod";

const auditCode = z.enum([
  "SESSION_CREATED",
  "SESSION_REVOKED",
  "SESSION_EXPIRED",
  "AUTHENTICATION_DENIED",
  "ROLE_DENIED",
  "OBJECT_ACCESS_DENIED",
  "CSRF_DENIED",
  "RATE_LIMITED",
  "PRIVILEGED_ROLE_DENIED",
  "CROSS_ORIGIN_DENIED",
  "PHONE_ALIAS_CHANGED",
  "KYC_REVERIFICATION_REQUESTED",
  "KYC_REVERIFICATION_CONFIRMED",
  "KYC_TRANSITION",
  "PARTNER_TRANSACTION_SUBMITTED",
  "PARTNER_TRANSACTION_RESULT",
  "PARTNER_TRANSACTION_REJECTED",
  "PARTNER_OPERATION_REGISTERED",
  "PARTNER_CALLBACK_APPLIED",
  "PARTNER_CALLBACK_DUPLICATE",
  "PARTNER_CALLBACK_REJECTED",
  "PARTNER_STATUS_QUERIED",
  "ADMIN_RECOVERY_COMPLETED",
  "ADMIN_RECOVERY_DENIED",
  "PAYMENT_GATEWAY_SUBMITTED",
  "PAYMENT_GATEWAY_RESULT",
  "PAYMENT_GATEWAY_REJECTED",
  "PAYMENT_GATEWAY_RECONCILIATION_QUERIED",
  "PAYMENT_GATEWAY_RECONCILIATION_RESULT",
  "PAYMENT_GATEWAY_RECONCILIATION_REJECTED",
  "HUMAN_REVIEW_CLAIMED",
  "HUMAN_REVIEW_UNCLAIMED",
  "HUMAN_REVIEW_ESCALATED",
  "HUMAN_REVIEW_RETURNED_TO_REVIEW",
  "HUMAN_REVIEW_EXTERNAL_AUTHORITY_REQUIRED",
  "HUMAN_REVIEW_EXTERNAL_RESPONSE_RECORDED",
  "HUMAN_REVIEW_RESOLVED",
  "HUMAN_REVIEW_CLOSED",
  "HUMAN_REVIEW_MUTATION_REJECTED",
  "UNVERIFIED",
  "PENDING",
  "IN_REVIEW",
  "ESCALATED",
  "EXTERNAL_AUTHORITY_REQUIRED",
  "RESOLVED",
  "CLOSED",
  "VERIFIED",
  "REVERIFICATION_REQUIRED",
  "SUSPENDED",
  "BLOCKED",
  "PHONE_CHANGE",
  "SIM_CHANGE",
  "ACCOUNT_RECOVERY",
  "KYC_REFRESH_DUE",
  "PARTNER_POLICY",
  "HIGH_RISK_TRANSACTION",
  "SUSPICIOUS_ACTIVITY",
  "IDENTITY_MISMATCH",
  "MANUAL_REVIEW",
  "PARTNER_AUTH_PENDING",
  "PARTNER_ACCEPTED",
  "PARTNER_REJECTED",
  "RECONCILIATION_REQUIRED",
  "PENDING_PARTNER_RESULT",
  "AUTHORIZED_NOT_SETTLED",
  "REJECTED",
  "OUTCOME_UNCERTAIN",
  "SETTLED_BY_PARTNER",
  "CHECKOUT_CREATED",
  "GATEWAY_REJECTED",
  "GATEWAY_ACCEPTED_CHECKOUT",
  "GATEWAY_VALIDATION_REJECTED",
  "GATEWAY_AUTH_REJECTED",
  "GATEWAY_SESSION_ALREADY_EXISTS",
  "GATEWAY_RESPONSE_INVALID",
  "GATEWAY_NETWORK_UNCERTAIN",
  "GATEWAY_SERVER_UNCERTAIN",
  "GATEWAY_AMOUNT_MISMATCH",
  "GATEWAY_UNAVAILABLE",
  "GATEWAY_RECOVERY_RECONCILIATION_REQUIRED",
  "PAYMENT_PENDING",
  "GATEWAY_CONFIRMED",
  "GATEWAY_FAILED",
  "GATEWAY_CANCELED",
  "GATEWAY_EXPIRED",
  "GATEWAY_STATUS_PENDING",
  "GATEWAY_STATUS_SUCCESS",
  "GATEWAY_STATUS_FAILED",
  "GATEWAY_STATUS_CANCELED",
  "GATEWAY_STATUS_EXPIRED",
  "GATEWAY_STATUS_SESSION_NOT_FOUND",
  "GATEWAY_STATUS_AUTH_REJECTED",
  "GATEWAY_STATUS_RESPONSE_INVALID",
  "GATEWAY_STATUS_NETWORK_UNCERTAIN",
  "GATEWAY_STATUS_SERVER_UNCERTAIN",
  "PARTNER_ADMIN_REQUIRED",
  "CALLBACK_REJECTED",
  "REQUEST_REJECTED",
]);

export const SyntheticAuditEventSchema = z
  .object({
    eventId: z.string().uuid(),
    at: z.string().datetime(),
    category: z.enum([
      "AUTH",
      "CUSTOMER",
      "KYC",
      "FINANCIAL",
      "RECONCILIATION",
      "RECOVERY",
      "HUMAN_REVIEW",
    ]),
    action: auditCode,
    outcome: z.enum(["ALLOW", "DENY", "SUCCESS", "FAIL", "PENDING"]),
    actor: z
      .object({
        userId: z.enum([
          "synthetic-agent-01",
          "synthetic-supervisor-01",
          "synthetic-operations-01",
          "synthetic-partner-admin-01",
          "mock-partner-provider",
          "system",
          "anonymous",
        ]),
        role: z.enum([
          "AGENT",
          "SUPERVISOR",
          "OPERATIONS",
          "PARTNER_ADMIN",
          "SYSTEM",
          "NONE",
        ]),
      })
      .strict(),
    customerId: z.string().uuid().optional(),
    transactionId: z.string().uuid().optional(),
    callbackId: z.string().uuid().optional(),
    caseId: z.string().regex(/^case_syn_[a-z0-9_]+$/).optional(),
    stateFrom: auditCode.optional(),
    stateTo: auditCode.optional(),
    code: auditCode.optional(),
    simulated: z.literal(true),
  })
  .strict();
export type SyntheticAuditEvent = z.infer<typeof SyntheticAuditEventSchema>;

export const SyntheticAuditEventInputSchema = SyntheticAuditEventSchema.omit({
  eventId: true,
  at: true,
  simulated: true,
});
export type SyntheticAuditEventInput = z.infer<
  typeof SyntheticAuditEventInputSchema
>;

export const SyntheticAuditSnapshotSchema = z
  .object({
    version: z.literal(1),
    events: z.array(SyntheticAuditEventSchema),
  })
  .strict();
export type SyntheticAuditSnapshot = z.infer<
  typeof SyntheticAuditSnapshotSchema
>;

export interface SyntheticAuditPersistence {
  load(): SyntheticAuditSnapshot | undefined;
  save(snapshot: SyntheticAuditSnapshot): void;
}

export interface SyntheticAuditSink {
  record(input: SyntheticAuditEventInput): unknown;
}
