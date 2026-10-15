import { z } from "zod";

import { computeCanonicalSha256 } from "./evidenceIntegrity";
import {
  HubIdSchema,
  HubTenantIdSchema,
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  syntheticHubs,
} from "./hub";
import { PartnerOrgIdSchema } from "./partnerCapabilityContract";
import { SYNTHETIC_PARTNER_IDS } from "./syntheticReferencePartners";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const EvidenceRefsSchema = z
  .array(z.string().min(1).max(160))
  .max(32)
  .refine(uniqueStrings, "evidence refs must be unique");
const RequiredEvidenceRefsSchema = EvidenceRefsSchema.min(1);
const OperatorAssignmentIdSchema = z.string().regex(/^hubop_syn_[a-z0-9_]+$/);
const HubDeviceIdSchema = z.string().regex(/^hubdev_syn_[a-z0-9_]+$/);

export const HubReadinessSchemaVersion = 1 as const;
export const SYNTHETIC_E8_EVALUATED_AT = "2026-10-15T12:00:00.000Z" as const;
const REFRESHER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const TrainingModuleSchema = z.enum([
  "CORE_HUB_OPERATIONS",
  "CUSTOMER_SAFEGUARDING",
  "OFFLINE_RECOVERY",
  "INCIDENT_ESCALATION",
]);
export type TrainingModule = z.infer<typeof TrainingModuleSchema>;

export const TrainingModuleCompletionSchema = z
  .object({
    module: TrainingModuleSchema,
    completedAt: z.string().datetime(),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict();

export const OperatorTrainingAssignmentSchema = z
  .object({
    trainingAssignmentId: z.string().regex(/^training_syn_[a-z0-9_]+$/),
    operatorAssignmentId: OperatorAssignmentIdSchema,
    curriculumVersion: z.string().regex(/^curriculum-syn-v[0-9]+$/),
    languagePack: z.enum([
      "ENGLISH_SYNTHETIC",
      "AMHARIC_SYNTHETIC",
      "OROMO_SYNTHETIC",
    ]),
    assignedModules: z
      .array(TrainingModuleSchema)
      .min(1)
      .max(12)
      .refine(uniqueStrings, "assigned training modules must be unique"),
    completedModules: z.array(TrainingModuleCompletionSchema).max(12),
    assignedAt: z.string().datetime(),
    dueAt: z.string().datetime(),
    certificationEffectiveAt: z.string().datetime().nullable(),
    certificationExpiresAt: z.string().datetime().nullable(),
    authorizedDeviceRefs: z
      .array(HubDeviceIdSchema)
      .max(12)
      .refine(uniqueStrings, "authorized device refs must be unique"),
    suspensionState: z.enum(["ACTIVE_SYNTHETIC", "SUSPENDED_SYNTHETIC"]),
    suspensionReason: z.enum([
      "NONE",
      "CERTIFICATION_EXPIRED",
      "TRAINING_INCOMPLETE",
      "SUPPORT_ESCALATION_REVIEW",
    ]),
    supportRefs: z
      .array(z.string().regex(/^support_syn_[a-z0-9_]+$/))
      .max(12)
      .refine(uniqueStrings, "support refs must be unique"),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const completed = value.completedModules.map((item) => item.module);
    if (new Set(completed).size !== completed.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "completed modules must be unique", path: ["completedModules"] });
    }
    for (const module of completed) {
      if (!value.assignedModules.includes(module)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "completed module must be assigned", path: ["completedModules"] });
      }
    }
    if (Date.parse(value.dueAt) < Date.parse(value.assignedAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "training dueAt must not precede assignedAt", path: ["dueAt"] });
    }
    const hasCertification = value.certificationEffectiveAt !== null || value.certificationExpiresAt !== null;
    if (hasCertification && (value.certificationEffectiveAt === null || value.certificationExpiresAt === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "certification effective and expiry dates must be paired", path: ["certificationEffectiveAt"] });
    }
    if (value.certificationEffectiveAt !== null && value.certificationExpiresAt !== null && Date.parse(value.certificationExpiresAt) <= Date.parse(value.certificationEffectiveAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "certification expiry must be after effective date", path: ["certificationExpiresAt"] });
    }
    if (value.suspensionState === "ACTIVE_SYNTHETIC" && value.suspensionReason !== "NONE") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "active synthetic training assignment cannot carry suspension reason", path: ["suspensionReason"] });
    }
    if (value.suspensionState === "SUSPENDED_SYNTHETIC" && value.suspensionReason === "NONE") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "suspended assignment requires a reason", path: ["suspensionReason"] });
    }
  });
export type OperatorTrainingAssignment = z.infer<typeof OperatorTrainingAssignmentSchema>;

export const DeviceReadinessEvidenceSchema = z
  .object({
    deviceId: HubDeviceIdSchema,
    visibility: z.enum(["ASSIGNED_PARTNER", "SHARED_HUB_INFRASTRUCTURE"]),
    partnerOrgId: PartnerOrgIdSchema.nullable(),
    applicationVersion: z.string().min(1).max(64),
    localStorageProtection: z.enum(["SYNTHETIC_ENCRYPTION_CAPABLE", "NOT_APPLICABLE", "UNKNOWN"]),
    syncHealth: z.enum(["HEALTHY_SYNTHETIC", "DEGRADED_SYNTHETIC", "OFFLINE_SYNTHETIC", "UNKNOWN"]),
    lastCheckIn: z.string().datetime().nullable(),
    securityPosture: z.enum(["READY_SYNTHETIC", "NEEDS_REVIEW", "OUT_OF_SERVICE"]),
    lifecycleState: z.enum(["ACTIVE_SYNTHETIC", "REPLACEMENT_REVIEW", "RETIRED_SYNTHETIC"]),
    supportRefs: z.array(z.string().regex(/^support_syn_[a-z0-9_]+$/)).max(12).refine(uniqueStrings, "support refs must be unique"),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.visibility === "ASSIGNED_PARTNER" && value.partnerOrgId === null)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "assigned-partner device requires partnerOrgId", path: ["partnerOrgId"] });
    if (value.visibility === "SHARED_HUB_INFRASTRUCTURE" && value.partnerOrgId !== null)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "shared Hub infrastructure must not claim a partner owner", path: ["partnerOrgId"] });
  });
export type DeviceReadinessEvidence = z.infer<typeof DeviceReadinessEvidenceSchema>;

export const SupportEscalationEvidenceSchema = z
  .object({
    supportRef: z.string().regex(/^support_syn_[a-z0-9_]+$/),
    operatorAssignmentId: OperatorAssignmentIdSchema.nullable(),
    deviceId: HubDeviceIdSchema.nullable(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    state: z.enum(["OPEN_SYNTHETIC", "CLOSED_SYNTHETIC"]),
    escalationState: z.enum(["NOT_ESCALATED", "ESCALATED_SYNTHETIC", "REVIEW_COMPLETE_SYNTHETIC"]),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.operatorAssignmentId === null && value.deviceId === null)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "support evidence must reference an operator or device", path: ["supportRef"] });
  });
export type SupportEscalationEvidence = z.infer<typeof SupportEscalationEvidenceSchema>;

export const HubOperatorDeviceReadinessPlanSchema = z
  .object({
    schemaVersion: z.literal(HubReadinessSchemaVersion),
    planId: z.string().regex(/^readiness_plan_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    evaluatedAt: z.string().datetime(),
    trainingAssignments: z.array(OperatorTrainingAssignmentSchema).min(1).max(32),
    deviceEvidence: z.array(DeviceReadinessEvidenceSchema).max(32),
    supportEvidence: z.array(SupportEscalationEvidenceSchema).max(64),
    evidenceRefs: RequiredEvidenceRefsSchema,
    stage: z.literal("STAGE_4"),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    const trainingIds = value.trainingAssignments.map((item) => item.trainingAssignmentId);
    if (new Set(trainingIds).size !== trainingIds.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "training assignment IDs must be unique", path: ["trainingAssignments"] });
    const operatorIds = value.trainingAssignments.map((item) => item.operatorAssignmentId);
    if (new Set(operatorIds).size !== operatorIds.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "operator readiness assignment must be unique per plan", path: ["trainingAssignments"] });
    const deviceIds = value.deviceEvidence.map((item) => item.deviceId);
    if (new Set(deviceIds).size !== deviceIds.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "device evidence IDs must be unique", path: ["deviceEvidence"] });
    const supportIds = value.supportEvidence.map((item) => item.supportRef);
    if (new Set(supportIds).size !== supportIds.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "support evidence refs must be unique", path: ["supportEvidence"] });
  });
export type HubOperatorDeviceReadinessPlan = z.infer<typeof HubOperatorDeviceReadinessPlanSchema>;

export const OperatorReadinessProjectionSchema = z
  .object({
    operatorAssignmentId: OperatorAssignmentIdSchema,
    role: z.enum(["AGENT", "SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]),
    trainingCompletionState: z.enum(["NOT_STARTED", "PARTIAL", "COMPLETE"]),
    certificationState: z.enum(["NOT_CERTIFIED", "CURRENT", "EXPIRING_SOON", "EXPIRED"]),
    refresherState: z.enum(["NOT_REQUIRED", "DUE_SOON", "REQUIRED"]),
    operationalReadinessState: z.enum([
      "READY_SYNTHETIC",
      "TRAINING_REQUIRED",
      "REFRESHER_REQUIRED",
      "SUSPENDED_REVIEW_REQUIRED",
    ]),
    assignedModules: z.array(TrainingModuleSchema).min(1).max(12),
    completedModules: z.array(TrainingModuleSchema).max(12),
    authorizedDeviceRefs: z.array(HubDeviceIdSchema).max(12),
    supportRefs: z.array(z.string().regex(/^support_syn_[a-z0-9_]+$/)).max(12),
    certificationEffectiveAt: z.string().datetime().nullable(),
    certificationExpiresAt: z.string().datetime().nullable(),
    evidenceRefs: RequiredEvidenceRefsSchema,
    authority: z.object({
      readinessCreatesFinancialAuthority: z.literal(false),
      trainingCreatesProviderAuthority: z.literal(false),
      regulatedAuthorityGranted: z.literal(false),
    }).strict(),
  })
  .strict();
export type OperatorReadinessProjection = z.infer<typeof OperatorReadinessProjectionSchema>;

export const DeviceReadinessProjectionSchema = z
  .object({
    deviceId: HubDeviceIdSchema,
    deviceClass: z.enum(["AGENT_TERMINAL", "CONNECTIVITY_GATEWAY", "PRINTER", "POWER_BACKUP", "OTHER"]),
    visibility: z.enum(["ASSIGNED_PARTNER", "SHARED_HUB_INFRASTRUCTURE"]),
    partnerOrgId: PartnerOrgIdSchema.nullable(),
    assignedOperatorRef: OperatorAssignmentIdSchema.nullable(),
    applicationVersion: z.string().min(1).max(64),
    localStorageProtection: z.enum(["SYNTHETIC_ENCRYPTION_CAPABLE", "NOT_APPLICABLE", "UNKNOWN"]),
    syncHealth: z.enum(["HEALTHY_SYNTHETIC", "DEGRADED_SYNTHETIC", "OFFLINE_SYNTHETIC", "UNKNOWN"]),
    lastCheckIn: z.string().datetime().nullable(),
    securityPosture: z.enum(["READY_SYNTHETIC", "NEEDS_REVIEW", "OUT_OF_SERVICE"]),
    lifecycleState: z.enum(["ACTIVE_SYNTHETIC", "REPLACEMENT_REVIEW", "RETIRED_SYNTHETIC"]),
    readinessState: z.enum(["READY_SYNTHETIC", "NEEDS_REVIEW", "OUT_OF_SERVICE"]),
    supportRefs: z.array(z.string().regex(/^support_syn_[a-z0-9_]+$/)).max(12),
    evidenceRefs: RequiredEvidenceRefsSchema,
    authority: z.object({
      remoteControlEnabled: z.literal(false),
      providerCommandEnabled: z.literal(false),
      firmwareMutationEnabled: z.literal(false),
    }).strict(),
  })
  .strict();
export type DeviceReadinessProjection = z.infer<typeof DeviceReadinessProjectionSchema>;

export const ReturnToServiceReviewSchema = z
  .object({
    operatorAssignmentId: OperatorAssignmentIdSchema,
    state: z.enum(["NOT_REQUIRED", "REVIEW_REQUIRED", "BLOCKED"]),
    missingPrerequisites: z.array(z.enum([
      "TRAINING_COMPLETE",
      "CERTIFICATION_CURRENT",
      "SUPPORT_ESCALATION_CLOSED",
      "AUTHORIZED_DEVICE_READY",
    ])).max(4),
    reviewRequired: z.boolean(),
    mutationEnabled: z.literal(false),
    automaticReturnToService: z.literal(false),
    requiresFutureAuthorization: z.boolean(),
  })
  .strict();

export const HubOperatorDeviceReadinessReadModelSchema = z
  .object({
    schemaVersion: z.literal(HubReadinessSchemaVersion),
    planId: z.string().regex(/^readiness_plan_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    evaluatedAt: z.string().datetime(),
    operatorReadiness: z.array(OperatorReadinessProjectionSchema).min(1).max(32),
    deviceReadiness: z.array(DeviceReadinessProjectionSchema).max(32),
    supportEvidence: z.array(SupportEscalationEvidenceSchema).max(64),
    returnToServiceReviews: z.array(ReturnToServiceReviewSchema).max(32),
    overallState: z.enum(["READY_SYNTHETIC", "REVIEW_REQUIRED", "BLOCKED"]),
    evidenceRefs: RequiredEvidenceRefsSchema,
    readinessDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    readBoundary: z.object({
      stage: z.literal("STAGE_4"),
      syntheticOnly: z.literal(true),
      readOnly: z.literal(true),
      realOperatorIdentityPresent: z.literal(false),
      realDeviceTelemetryPresent: z.literal(false),
      realSupportTicketingIntegrated: z.literal(false),
      trainingCreatesFinancialAuthority: z.literal(false),
      certificationCreatesFinancialAuthority: z.literal(false),
      productionDeviceControlEnabled: z.literal(false),
      remoteCommandsEnabled: z.literal(false),
      automaticReturnToServiceEnabled: z.literal(false),
      realFundsIncluded: z.literal(false),
      partnerPostingAuthorityGranted: z.literal(false),
      settlementAuthorityGranted: z.literal(false),
      regulatedAuthorityGranted: z.literal(false),
    }).strict(),
  })
  .strict();
export type HubOperatorDeviceReadinessReadModel = z.infer<typeof HubOperatorDeviceReadinessReadModelSchema>;

function uniqueEvidence(...groups: readonly (readonly string[])[]) {
  return [...new Set(groups.flat())].sort();
}

function validatePlanScope(plan: HubOperatorDeviceReadinessPlan) {
  const hub = syntheticHubs.find((item) => item.hubId === plan.hubId);
  if (!hub || hub.tenantId !== plan.tenantId)
    throw new Error("HUB_READINESS_HUB_SCOPE_MISMATCH");
  if (!hub.partnerMemberships.some((membership) => membership.partnerOrgId === plan.partnerOrgId && membership.membershipState === "SYNTHETIC_MEMBER"))
    throw new Error("HUB_READINESS_PARTNER_SCOPE_MISMATCH");

  const partnerOperators = new Map(
    hub.operators.filter((operator) => operator.partnerOrgId === plan.partnerOrgId).map((operator) => [operator.operatorAssignmentId, operator] as const),
  );
  for (const assignment of plan.trainingAssignments) {
    if (!partnerOperators.has(assignment.operatorAssignmentId))
      throw new Error("HUB_READINESS_OPERATOR_SCOPE_MISMATCH");
    for (const deviceId of assignment.authorizedDeviceRefs) {
      const device = hub.devices.find((item) => item.deviceId === deviceId);
      if (!device) throw new Error("HUB_READINESS_AUTHORIZED_DEVICE_UNKNOWN");
      if (device.assignedOperatorRef !== null && device.assignedOperatorRef !== assignment.operatorAssignmentId)
        throw new Error("HUB_READINESS_AUTHORIZED_DEVICE_ASSIGNMENT_MISMATCH");
    }
  }

  for (const evidence of plan.deviceEvidence) {
    const device = hub.devices.find((item) => item.deviceId === evidence.deviceId);
    if (!device) throw new Error("HUB_READINESS_DEVICE_SCOPE_MISMATCH");
    if (evidence.visibility === "ASSIGNED_PARTNER") {
      if (evidence.partnerOrgId !== plan.partnerOrgId)
        throw new Error("HUB_READINESS_DEVICE_PARTNER_SCOPE_MISMATCH");
      if (device.assignedOperatorRef === null)
        throw new Error("HUB_READINESS_PARTNER_DEVICE_NOT_ASSIGNED");
      const assignedOperator = hub.operators.find((item) => item.operatorAssignmentId === device.assignedOperatorRef);
      if (assignedOperator?.partnerOrgId !== plan.partnerOrgId)
        throw new Error("HUB_READINESS_DEVICE_PARTNER_SCOPE_MISMATCH");
    }
  }

  const supportRefs = new Set(plan.supportEvidence.map((item) => item.supportRef));
  for (const assignment of plan.trainingAssignments)
    for (const supportRef of assignment.supportRefs)
      if (!supportRefs.has(supportRef)) throw new Error("HUB_READINESS_SUPPORT_REFERENCE_UNKNOWN");
  for (const device of plan.deviceEvidence)
    for (const supportRef of device.supportRefs)
      if (!supportRefs.has(supportRef)) throw new Error("HUB_READINESS_SUPPORT_REFERENCE_UNKNOWN");
  for (const support of plan.supportEvidence) {
    if (support.operatorAssignmentId !== null && !partnerOperators.has(support.operatorAssignmentId))
      throw new Error("HUB_READINESS_SUPPORT_OPERATOR_SCOPE_MISMATCH");
    if (support.deviceId !== null && !hub.devices.some((device) => device.deviceId === support.deviceId))
      throw new Error("HUB_READINESS_SUPPORT_DEVICE_SCOPE_MISMATCH");
  }
}

function projectOperator(
  plan: HubOperatorDeviceReadinessPlan,
  assignment: OperatorTrainingAssignment,
): OperatorReadinessProjection {
  const hub = syntheticHubs.find((item) => item.hubId === plan.hubId)!;
  const operator = hub.operators.find((item) => item.operatorAssignmentId === assignment.operatorAssignmentId)!;
  const completedModules = assignment.completedModules.map((item) => item.module);
  const trainingCompletionState = completedModules.length === 0
    ? "NOT_STARTED"
    : completedModules.length < assignment.assignedModules.length
      ? "PARTIAL"
      : "COMPLETE";
  const evaluatedAt = Date.parse(plan.evaluatedAt);
  const expiresAt = assignment.certificationExpiresAt === null ? null : Date.parse(assignment.certificationExpiresAt);
  const certificationState = assignment.certificationEffectiveAt === null || expiresAt === null
    ? "NOT_CERTIFIED"
    : expiresAt <= evaluatedAt
      ? "EXPIRED"
      : expiresAt - evaluatedAt <= REFRESHER_WINDOW_MS
        ? "EXPIRING_SOON"
        : "CURRENT";
  const refresherState = certificationState === "EXPIRED" || certificationState === "NOT_CERTIFIED"
    ? "REQUIRED"
    : certificationState === "EXPIRING_SOON"
      ? "DUE_SOON"
      : "NOT_REQUIRED";
  const operationalReadinessState = assignment.suspensionState === "SUSPENDED_SYNTHETIC" || certificationState === "EXPIRED"
    ? "SUSPENDED_REVIEW_REQUIRED"
    : trainingCompletionState !== "COMPLETE" || certificationState === "NOT_CERTIFIED"
      ? "TRAINING_REQUIRED"
      : certificationState === "EXPIRING_SOON"
        ? "REFRESHER_REQUIRED"
        : "READY_SYNTHETIC";

  return OperatorReadinessProjectionSchema.parse({
    operatorAssignmentId: assignment.operatorAssignmentId,
    role: operator.role,
    trainingCompletionState,
    certificationState,
    refresherState,
    operationalReadinessState,
    assignedModules: assignment.assignedModules,
    completedModules,
    authorizedDeviceRefs: assignment.authorizedDeviceRefs,
    supportRefs: assignment.supportRefs,
    certificationEffectiveAt: assignment.certificationEffectiveAt,
    certificationExpiresAt: assignment.certificationExpiresAt,
    evidenceRefs: uniqueEvidence(assignment.evidenceRefs, assignment.completedModules.flatMap((item) => item.evidenceRefs)),
    authority: {
      readinessCreatesFinancialAuthority: false,
      trainingCreatesProviderAuthority: false,
      regulatedAuthorityGranted: false,
    },
  });
}

function projectDevice(
  plan: HubOperatorDeviceReadinessPlan,
  evidence: DeviceReadinessEvidence,
): DeviceReadinessProjection {
  const hub = syntheticHubs.find((item) => item.hubId === plan.hubId)!;
  const device = hub.devices.find((item) => item.deviceId === evidence.deviceId)!;
  const hasOpenSupport = plan.supportEvidence.some((item) => item.deviceId === device.deviceId && item.state === "OPEN_SYNTHETIC");
  const readinessState = evidence.lifecycleState === "RETIRED_SYNTHETIC" || evidence.securityPosture === "OUT_OF_SERVICE" || evidence.syncHealth === "OFFLINE_SYNTHETIC"
    ? "OUT_OF_SERVICE"
    : evidence.lifecycleState === "REPLACEMENT_REVIEW" || evidence.securityPosture === "NEEDS_REVIEW" || evidence.syncHealth === "DEGRADED_SYNTHETIC" || hasOpenSupport
      ? "NEEDS_REVIEW"
      : "READY_SYNTHETIC";

  return DeviceReadinessProjectionSchema.parse({
    deviceId: evidence.deviceId,
    deviceClass: device.deviceClass,
    visibility: evidence.visibility,
    partnerOrgId: evidence.partnerOrgId,
    assignedOperatorRef: device.assignedOperatorRef,
    applicationVersion: evidence.applicationVersion,
    localStorageProtection: evidence.localStorageProtection,
    syncHealth: evidence.syncHealth,
    lastCheckIn: evidence.lastCheckIn,
    securityPosture: evidence.securityPosture,
    lifecycleState: evidence.lifecycleState,
    readinessState,
    supportRefs: evidence.supportRefs,
    evidenceRefs: uniqueEvidence(device.evidenceRefs, evidence.evidenceRefs),
    authority: {
      remoteControlEnabled: false,
      providerCommandEnabled: false,
      firmwareMutationEnabled: false,
    },
  });
}

function buildReturnToServiceReview(input: {
  operator: OperatorReadinessProjection;
  deviceReadiness: readonly DeviceReadinessProjection[];
  supportEvidence: readonly SupportEscalationEvidence[];
}): z.infer<typeof ReturnToServiceReviewSchema> {
  const { operator, deviceReadiness, supportEvidence } = input;
  if (operator.operationalReadinessState !== "SUSPENDED_REVIEW_REQUIRED") {
    return ReturnToServiceReviewSchema.parse({
      operatorAssignmentId: operator.operatorAssignmentId,
      state: "NOT_REQUIRED",
      missingPrerequisites: [],
      reviewRequired: false,
      mutationEnabled: false,
      automaticReturnToService: false,
      requiresFutureAuthorization: false,
    });
  }
  const missingPrerequisites: Array<
    "TRAINING_COMPLETE" | "CERTIFICATION_CURRENT" | "SUPPORT_ESCALATION_CLOSED" | "AUTHORIZED_DEVICE_READY"
  > = [];
  if (operator.trainingCompletionState !== "COMPLETE") missingPrerequisites.push("TRAINING_COMPLETE");
  if (operator.certificationState !== "CURRENT") missingPrerequisites.push("CERTIFICATION_CURRENT");
  if (supportEvidence.some((item) => item.operatorAssignmentId === operator.operatorAssignmentId && item.state === "OPEN_SYNTHETIC"))
    missingPrerequisites.push("SUPPORT_ESCALATION_CLOSED");
  if (operator.authorizedDeviceRefs.some((deviceId) => deviceReadiness.find((device) => device.deviceId === deviceId)?.readinessState !== "READY_SYNTHETIC"))
    missingPrerequisites.push("AUTHORIZED_DEVICE_READY");

  return ReturnToServiceReviewSchema.parse({
    operatorAssignmentId: operator.operatorAssignmentId,
    state: missingPrerequisites.length > 0 ? "BLOCKED" : "REVIEW_REQUIRED",
    missingPrerequisites,
    reviewRequired: true,
    mutationEnabled: false,
    automaticReturnToService: false,
    requiresFutureAuthorization: true,
  });
}

export function createStage4HubOperatorDeviceReadinessReadModel(input: unknown): HubOperatorDeviceReadinessReadModel {
  const plan = HubOperatorDeviceReadinessPlanSchema.parse(input);
  validatePlanScope(plan);
  const operatorReadiness = plan.trainingAssignments
    .map((assignment) => projectOperator(plan, assignment))
    .sort((left, right) => left.operatorAssignmentId.localeCompare(right.operatorAssignmentId));
  const deviceReadiness = plan.deviceEvidence
    .map((evidence) => projectDevice(plan, evidence))
    .sort((left, right) => left.deviceId.localeCompare(right.deviceId));
  const supportEvidence = [...plan.supportEvidence].sort((left, right) => left.supportRef.localeCompare(right.supportRef));
  const returnToServiceReviews = operatorReadiness.map((operator) => buildReturnToServiceReview({ operator, deviceReadiness, supportEvidence }));
  const overallState = operatorReadiness.some((item) => item.operationalReadinessState === "SUSPENDED_REVIEW_REQUIRED")
    ? "BLOCKED"
    : operatorReadiness.some((item) => item.operationalReadinessState !== "READY_SYNTHETIC") || deviceReadiness.some((item) => item.readinessState !== "READY_SYNTHETIC")
      ? "REVIEW_REQUIRED"
      : "READY_SYNTHETIC";

  const core = {
    schemaVersion: HubReadinessSchemaVersion,
    planId: plan.planId,
    tenantId: plan.tenantId,
    hubId: plan.hubId,
    partnerOrgId: plan.partnerOrgId,
    evaluatedAt: plan.evaluatedAt,
    operatorReadiness,
    deviceReadiness,
    supportEvidence,
    returnToServiceReviews,
    overallState,
    evidenceRefs: uniqueEvidence(
      plan.evidenceRefs,
      plan.trainingAssignments.flatMap((item) => item.evidenceRefs),
      plan.trainingAssignments.flatMap((item) => item.completedModules.flatMap((completion) => completion.evidenceRefs)),
      plan.deviceEvidence.flatMap((item) => item.evidenceRefs),
      plan.supportEvidence.flatMap((item) => item.evidenceRefs),
    ),
    readBoundary: {
      stage: "STAGE_4" as const,
      syntheticOnly: true as const,
      readOnly: true as const,
      realOperatorIdentityPresent: false as const,
      realDeviceTelemetryPresent: false as const,
      realSupportTicketingIntegrated: false as const,
      trainingCreatesFinancialAuthority: false as const,
      certificationCreatesFinancialAuthority: false as const,
      productionDeviceControlEnabled: false as const,
      remoteCommandsEnabled: false as const,
      automaticReturnToServiceEnabled: false as const,
      realFundsIncluded: false as const,
      partnerPostingAuthorityGranted: false as const,
      settlementAuthorityGranted: false as const,
      regulatedAuthorityGranted: false as const,
    },
  };
  return HubOperatorDeviceReadinessReadModelSchema.parse({ ...core, readinessDigest: computeCanonicalSha256(core) });
}

export function verifyStage4HubOperatorDeviceReadinessReadModel(input: unknown): HubOperatorDeviceReadinessReadModel {
  const model = HubOperatorDeviceReadinessReadModelSchema.parse(input);
  const { readinessDigest, ...core } = model;
  if (readinessDigest !== computeCanonicalSha256(core)) throw new Error("HUB_READINESS_DIGEST_MISMATCH");
  return model;
}

export function searchStage4HubOperatorDeviceReadiness(input: {
  readModels: readonly unknown[];
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
}): readonly HubOperatorDeviceReadinessReadModel[] {
  const tenantId = HubTenantIdSchema.parse(input.tenantId);
  const hubId = HubIdSchema.parse(input.hubId);
  const partnerOrgId = PartnerOrgIdSchema.parse(input.partnerOrgId);
  return input.readModels
    .map((model) => verifyStage4HubOperatorDeviceReadinessReadModel(model))
    .filter((model) => model.tenantId === tenantId && model.hubId === hubId && model.partnerOrgId === partnerOrgId)
    .sort((left, right) => left.planId.localeCompare(right.planId));
}

const coreModules = TrainingModuleSchema.options;
const completion = (module: TrainingModule, prefix: string) => ({
  module,
  completedAt: "2026-09-15T10:00:00.000Z",
  evidenceRefs: [`EV-SYN-E8-${prefix}-${module}`],
});

export const SYNTHETIC_E8_READINESS_PLANS: readonly HubOperatorDeviceReadinessPlan[] = [
  HubOperatorDeviceReadinessPlanSchema.parse({
    schemaVersion: 1,
    planId: "readiness_plan_syn_adama_alpha",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    evaluatedAt: SYNTHETIC_E8_EVALUATED_AT,
    trainingAssignments: [
      {
        trainingAssignmentId: "training_syn_adama_alpha_agent",
        operatorAssignmentId: "hubop_syn_adama_alpha_agents",
        curriculumVersion: "curriculum-syn-v1",
        languagePack: "OROMO_SYNTHETIC",
        assignedModules: coreModules,
        completedModules: coreModules.map((module) => completion(module, "ADAMA-ALPHA-AGENT")),
        assignedAt: "2026-09-01T08:00:00.000Z",
        dueAt: "2026-09-30T23:59:59.000Z",
        certificationEffectiveAt: "2026-09-16T00:00:00.000Z",
        certificationExpiresAt: "2027-03-31T23:59:59.000Z",
        authorizedDeviceRefs: ["hubdev_syn_adama_terminal_001"],
        suspensionState: "ACTIVE_SYNTHETIC",
        suspensionReason: "NONE",
        supportRefs: [],
        evidenceRefs: ["EV-SYN-E8-ADAMA-ALPHA-AGENT-V1"],
      },
      {
        trainingAssignmentId: "training_syn_adama_alpha_supervisor",
        operatorAssignmentId: "hubop_syn_adama_alpha_supervisor",
        curriculumVersion: "curriculum-syn-v1",
        languagePack: "AMHARIC_SYNTHETIC",
        assignedModules: coreModules,
        completedModules: coreModules.map((module) => completion(module, "ADAMA-ALPHA-SUPERVISOR")),
        assignedAt: "2026-09-01T08:00:00.000Z",
        dueAt: "2026-09-30T23:59:59.000Z",
        certificationEffectiveAt: "2026-09-16T00:00:00.000Z",
        certificationExpiresAt: "2026-10-25T23:59:59.000Z",
        authorizedDeviceRefs: [],
        suspensionState: "ACTIVE_SYNTHETIC",
        suspensionReason: "NONE",
        supportRefs: [],
        evidenceRefs: ["EV-SYN-E8-ADAMA-ALPHA-SUPERVISOR-V1"],
      },
      {
        trainingAssignmentId: "training_syn_adama_alpha_operations",
        operatorAssignmentId: "hubop_syn_adama_alpha_operations",
        curriculumVersion: "curriculum-syn-v1",
        languagePack: "ENGLISH_SYNTHETIC",
        assignedModules: coreModules,
        completedModules: coreModules.slice(0, 2).map((module) => completion(module, "ADAMA-ALPHA-OPERATIONS")),
        assignedAt: "2026-10-01T08:00:00.000Z",
        dueAt: "2026-10-31T23:59:59.000Z",
        certificationEffectiveAt: null,
        certificationExpiresAt: null,
        authorizedDeviceRefs: [],
        suspensionState: "ACTIVE_SYNTHETIC",
        suspensionReason: "NONE",
        supportRefs: [],
        evidenceRefs: ["EV-SYN-E8-ADAMA-ALPHA-OPERATIONS-V1"],
      },
      {
        trainingAssignmentId: "training_syn_adama_alpha_partner_admin",
        operatorAssignmentId: "hubop_syn_adama_alpha_partner_admin",
        curriculumVersion: "curriculum-syn-v1",
        languagePack: "ENGLISH_SYNTHETIC",
        assignedModules: coreModules,
        completedModules: coreModules.map((module) => completion(module, "ADAMA-ALPHA-PARTNER-ADMIN")),
        assignedAt: "2026-09-01T08:00:00.000Z",
        dueAt: "2026-09-30T23:59:59.000Z",
        certificationEffectiveAt: "2026-09-16T00:00:00.000Z",
        certificationExpiresAt: "2027-04-30T23:59:59.000Z",
        authorizedDeviceRefs: [],
        suspensionState: "ACTIVE_SYNTHETIC",
        suspensionReason: "NONE",
        supportRefs: [],
        evidenceRefs: ["EV-SYN-E8-ADAMA-ALPHA-PARTNER-ADMIN-V1"],
      },
    ],
    deviceEvidence: [
      {
        deviceId: "hubdev_syn_adama_terminal_001",
        visibility: "ASSIGNED_PARTNER",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        applicationVersion: "agent-terminal-syn-v1",
        localStorageProtection: "SYNTHETIC_ENCRYPTION_CAPABLE",
        syncHealth: "HEALTHY_SYNTHETIC",
        lastCheckIn: "2026-10-15T11:50:00.000Z",
        securityPosture: "READY_SYNTHETIC",
        lifecycleState: "ACTIVE_SYNTHETIC",
        supportRefs: [],
        evidenceRefs: ["EV-SYN-E8-ADAMA-TERMINAL-READINESS-V1"],
      },
      {
        deviceId: "hubdev_syn_adama_connectivity_001",
        visibility: "SHARED_HUB_INFRASTRUCTURE",
        partnerOrgId: null,
        applicationVersion: "gateway-syn-v1",
        localStorageProtection: "NOT_APPLICABLE",
        syncHealth: "DEGRADED_SYNTHETIC",
        lastCheckIn: "2026-10-15T11:45:00.000Z",
        securityPosture: "NEEDS_REVIEW",
        lifecycleState: "ACTIVE_SYNTHETIC",
        supportRefs: ["support_syn_adama_connectivity_review"],
        evidenceRefs: ["EV-SYN-E8-ADAMA-CONNECTIVITY-READINESS-V1"],
      },
    ],
    supportEvidence: [
      {
        supportRef: "support_syn_adama_connectivity_review",
        operatorAssignmentId: null,
        deviceId: "hubdev_syn_adama_connectivity_001",
        severity: "MEDIUM",
        state: "OPEN_SYNTHETIC",
        escalationState: "ESCALATED_SYNTHETIC",
        evidenceRefs: ["EV-SYN-E8-ADAMA-CONNECTIVITY-SUPPORT-V1"],
      },
    ],
    evidenceRefs: ["EV-SYN-E8-ADAMA-ALPHA-PLAN-V1"],
    stage: "STAGE_4",
    syntheticOnly: true,
  }),
  HubOperatorDeviceReadinessPlanSchema.parse({
    schemaVersion: 1,
    planId: "readiness_plan_syn_adama_beta",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    evaluatedAt: SYNTHETIC_E8_EVALUATED_AT,
    trainingAssignments: [
      {
        trainingAssignmentId: "training_syn_adama_beta_agent",
        operatorAssignmentId: "hubop_syn_adama_beta_agents",
        curriculumVersion: "curriculum-syn-v1",
        languagePack: "OROMO_SYNTHETIC",
        assignedModules: coreModules,
        completedModules: coreModules.map((module) => completion(module, "ADAMA-BETA-AGENT")),
        assignedAt: "2026-09-01T08:00:00.000Z",
        dueAt: "2026-09-30T23:59:59.000Z",
        certificationEffectiveAt: "2026-09-16T00:00:00.000Z",
        certificationExpiresAt: "2027-03-31T23:59:59.000Z",
        authorizedDeviceRefs: [],
        suspensionState: "ACTIVE_SYNTHETIC",
        suspensionReason: "NONE",
        supportRefs: [],
        evidenceRefs: ["EV-SYN-E8-ADAMA-BETA-AGENT-V1"],
      },
    ],
    deviceEvidence: [
      {
        deviceId: "hubdev_syn_adama_connectivity_001",
        visibility: "SHARED_HUB_INFRASTRUCTURE",
        partnerOrgId: null,
        applicationVersion: "gateway-syn-v1",
        localStorageProtection: "NOT_APPLICABLE",
        syncHealth: "DEGRADED_SYNTHETIC",
        lastCheckIn: "2026-10-15T11:45:00.000Z",
        securityPosture: "NEEDS_REVIEW",
        lifecycleState: "ACTIVE_SYNTHETIC",
        supportRefs: ["support_syn_adama_connectivity_review"],
        evidenceRefs: ["EV-SYN-E8-ADAMA-CONNECTIVITY-READINESS-V1"],
      },
    ],
    supportEvidence: [
      {
        supportRef: "support_syn_adama_connectivity_review",
        operatorAssignmentId: null,
        deviceId: "hubdev_syn_adama_connectivity_001",
        severity: "MEDIUM",
        state: "OPEN_SYNTHETIC",
        escalationState: "ESCALATED_SYNTHETIC",
        evidenceRefs: ["EV-SYN-E8-ADAMA-CONNECTIVITY-SUPPORT-V1"],
      },
    ],
    evidenceRefs: ["EV-SYN-E8-ADAMA-BETA-PLAN-V1"],
    stage: "STAGE_4",
    syntheticOnly: true,
  }),
  HubOperatorDeviceReadinessPlanSchema.parse({
    schemaVersion: 1,
    planId: "readiness_plan_syn_arisi_alpha",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    evaluatedAt: SYNTHETIC_E8_EVALUATED_AT,
    trainingAssignments: [
      {
        trainingAssignmentId: "training_syn_arisi_alpha_agent",
        operatorAssignmentId: "hubop_syn_arisi_alpha_agents",
        curriculumVersion: "curriculum-syn-v1",
        languagePack: "OROMO_SYNTHETIC",
        assignedModules: coreModules,
        completedModules: coreModules.map((module) => completion(module, "ARISI-ALPHA-AGENT")),
        assignedAt: "2026-08-01T08:00:00.000Z",
        dueAt: "2026-08-31T23:59:59.000Z",
        certificationEffectiveAt: "2026-08-16T00:00:00.000Z",
        certificationExpiresAt: "2026-09-30T23:59:59.000Z",
        authorizedDeviceRefs: [],
        suspensionState: "SUSPENDED_SYNTHETIC",
        suspensionReason: "CERTIFICATION_EXPIRED",
        supportRefs: ["support_syn_arisi_return_review"],
        evidenceRefs: ["EV-SYN-E8-ARISI-ALPHA-AGENT-V1"],
      },
    ],
    deviceEvidence: [],
    supportEvidence: [
      {
        supportRef: "support_syn_arisi_return_review",
        operatorAssignmentId: "hubop_syn_arisi_alpha_agents",
        deviceId: null,
        severity: "MEDIUM",
        state: "OPEN_SYNTHETIC",
        escalationState: "ESCALATED_SYNTHETIC",
        evidenceRefs: ["EV-SYN-E8-ARISI-RETURN-REVIEW-V1"],
      },
    ],
    evidenceRefs: ["EV-SYN-E8-ARISI-ALPHA-PLAN-V1"],
    stage: "STAGE_4",
    syntheticOnly: true,
  }),
] as const;

export const SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS =
  SYNTHETIC_E8_READINESS_PLANS.map((plan) =>
    createStage4HubOperatorDeviceReadinessReadModel(plan),
  );
