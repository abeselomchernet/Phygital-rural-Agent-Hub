import { z } from "zod";

import {
  PartnerAdapterIdSchema,
  PartnerContractCapabilityIdSchema,
  PartnerContractEnvironmentSchema,
  PartnerContractPartnerClassSchema,
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

export const PartnerOnboardingActorRoleSchema = z.enum([
  "PARTNER_ADMIN",
  "OPERATIONS",
  "TECHNICAL_REVIEWER",
  "GOVERNANCE_ADMIN",
]);
export type PartnerOnboardingActorRole = z.infer<
  typeof PartnerOnboardingActorRoleSchema
>;

export const PartnerOnboardingOrganizationStateSchema = z.enum([
  "DRAFT",
  "CONTRACT_REVIEW",
  "TECHNICAL_CONFIGURATION",
  "SANDBOX_READY",
  "CERTIFICATION_PENDING",
  "SANDBOX_CERTIFIED",
  "STAGING_PENDING",
  "STAGING_APPROVED",
  "AUTHORIZED",
  "SUSPENDED",
  "EXPIRED",
  "RETIRED",
]);
export type PartnerOnboardingOrganizationState = z.infer<
  typeof PartnerOnboardingOrganizationStateSchema
>;

export const PartnerOnboardingCapabilityStateSchema = z.enum([
  "REQUESTED",
  "CONFIGURED",
  "CERTIFICATION_PENDING",
  "SANDBOX_CERTIFIED",
  "DISABLED",
  "SUSPENDED",
  "EXPIRED",
]);
export type PartnerOnboardingCapabilityState = z.infer<
  typeof PartnerOnboardingCapabilityStateSchema
>;

export const PartnerOnboardingPathSchema = z.enum([
  "CONFIGURATION_ONLY",
  "NEW_ADAPTER_REQUIRED",
  "NEW_DOMAIN_CAPABILITY_REQUIRED",
]);
export type PartnerOnboardingPath = z.infer<typeof PartnerOnboardingPathSchema>;

export const PartnerBindingRuntimeModeSchema = z.enum([
  "FOUNDATION_ONLY",
  "EXECUTABLE",
]);
export type PartnerBindingRuntimeMode = z.infer<
  typeof PartnerBindingRuntimeModeSchema
>;

export const PartnerOnboardingBindingSchema = z
  .object({
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    routeId: PartnerRouteIdSchema,
    adapterId: PartnerAdapterIdSchema,
    adapterVersion: z.number().int().positive().max(1_000_000),
    routeVersion: z.number().int().positive().max(1_000_000),
    environment: PartnerContractEnvironmentSchema,
    runtimeMode: PartnerBindingRuntimeModeSchema,
    configSchemaId: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[A-Z0-9][A-Z0-9_.-]*$/),
    credentialRef: z
      .string()
      .min(3)
      .max(160)
      .regex(/^secretref_[A-Za-z0-9][A-Za-z0-9_.-]*$/)
      .nullable(),
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(32)
      .refine(uniqueStrings, "binding evidence refs must be unique"),
  })
  .strict();
export type PartnerOnboardingBinding = z.infer<
  typeof PartnerOnboardingBindingSchema
>;

export const PartnerOnboardingCapabilitySchema = z
  .object({
    capabilityId: PartnerContractCapabilityIdSchema,
    state: PartnerOnboardingCapabilityStateSchema,
    binding: PartnerOnboardingBindingSchema.nullable(),
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(32)
      .refine(uniqueStrings, "capability evidence refs must be unique"),
    certificationRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(32)
      .refine(uniqueStrings, "certification refs must be unique"),
    activationEligible: z.boolean(),
  })
  .strict();
export type PartnerOnboardingCapability = z.infer<
  typeof PartnerOnboardingCapabilitySchema
>;

export const PartnerOnboardingDecisionSchema = z
  .object({
    decisionId: z.string().regex(/^onboard-decision-[a-z0-9-]+$/),
    at: z.string().datetime(),
    actorRole: PartnerOnboardingActorRoleSchema,
    action: z.enum([
      "CREATE",
      "TRANSITION",
      "BIND_CAPABILITY",
      "SUBMIT_CERTIFICATION",
      "SUSPEND_CAPABILITY",
    ]),
    outcome: z.enum(["ALLOW", "DENY"]),
    fromState: PartnerOnboardingOrganizationStateSchema.nullable(),
    toState: PartnerOnboardingOrganizationStateSchema.nullable(),
    capabilityId: PartnerContractCapabilityIdSchema.nullable(),
    code: z.string().min(3).max(120),
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(32)
      .refine(uniqueStrings, "decision evidence refs must be unique"),
  })
  .strict();
export type PartnerOnboardingDecision = z.infer<
  typeof PartnerOnboardingDecisionSchema
>;

export const PartnerOnboardingRecordSchema = z
  .object({
    onboardingId: z.string().regex(/^onboard_[A-Za-z0-9_-]+$/),
    workflowVersion: z.literal(1),
    partnerOrgId: PartnerOrgIdSchema,
    partnerClass: PartnerContractPartnerClassSchema,
    displayName: z.string().min(1).max(120),
    environment: PartnerContractEnvironmentSchema,
    organizationState: PartnerOnboardingOrganizationStateSchema,
    path: PartnerOnboardingPathSchema,
    requestedServices: z
      .array(PartnerServiceIdSchema)
      .min(1)
      .max(128)
      .refine(uniqueStrings, "requested services must be unique"),
    capabilities: z
      .array(PartnerOnboardingCapabilitySchema)
      .min(1)
      .max(64)
      .refine(
        (values) =>
          uniqueStrings(values.map((entry) => entry.capabilityId)),
        "capabilities must be unique",
      ),
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(64)
      .refine(uniqueStrings, "record evidence refs must be unique"),
    openFindings: z.array(z.string().min(3).max(160)).max(64),
    decisions: z.array(PartnerOnboardingDecisionSchema).max(512),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export type PartnerOnboardingRecord = z.infer<
  typeof PartnerOnboardingRecordSchema
>;

export type PartnerOnboardingProgramStage = "STAGE_3_SYNTHETIC";

export function classifyPartnerOnboardingPath(input: {
  serviceTypesSupported: boolean;
  capabilitiesSupported: boolean;
  adapterCompatible: boolean;
  domainSemanticsSupported: boolean;
}): PartnerOnboardingPath {
  if (!input.domainSemanticsSupported || !input.serviceTypesSupported || !input.capabilitiesSupported)
    return "NEW_DOMAIN_CAPABILITY_REQUIRED";
  if (!input.adapterCompatible) return "NEW_ADAPTER_REQUIRED";
  return "CONFIGURATION_ONLY";
}

function nextDecisionId(record: Pick<PartnerOnboardingRecord, "decisions">) {
  return `onboard-decision-${String(record.decisions.length + 1).padStart(4, "0")}`;
}

function decision(input: {
  record: PartnerOnboardingRecord;
  at: string;
  actorRole: PartnerOnboardingActorRole;
  action: PartnerOnboardingDecision["action"];
  outcome: PartnerOnboardingDecision["outcome"];
  fromState?: PartnerOnboardingOrganizationState | null;
  toState?: PartnerOnboardingOrganizationState | null;
  capabilityId?: PartnerOnboardingCapability["capabilityId"] | null;
  code: string;
  evidenceRefs?: string[];
}) {
  return PartnerOnboardingDecisionSchema.parse({
    decisionId: nextDecisionId(input.record),
    at: input.at,
    actorRole: input.actorRole,
    action: input.action,
    outcome: input.outcome,
    fromState: input.fromState ?? null,
    toState: input.toState ?? null,
    capabilityId: input.capabilityId ?? null,
    code: input.code,
    evidenceRefs: input.evidenceRefs ?? [],
  });
}

export function createPartnerOnboardingRecord(input: {
  onboardingId: string;
  partnerOrgId: string;
  partnerClass: z.infer<typeof PartnerContractPartnerClassSchema>;
  displayName: string;
  environment: "synthetic" | "sandbox" | "testbed";
  path: PartnerOnboardingPath;
  requestedServices: string[];
  requestedCapabilities: z.infer<typeof PartnerContractCapabilityIdSchema>[];
  evidenceRefs: string[];
  at: string;
  actorRole?: PartnerOnboardingActorRole;
}) {
  const base = PartnerOnboardingRecordSchema.parse({
    onboardingId: input.onboardingId,
    workflowVersion: 1,
    partnerOrgId: input.partnerOrgId,
    partnerClass: input.partnerClass,
    displayName: input.displayName,
    environment: input.environment,
    organizationState: "DRAFT",
    path: input.path,
    requestedServices: input.requestedServices,
    capabilities: input.requestedCapabilities.map((capabilityId) => ({
      capabilityId,
      state: "REQUESTED",
      binding: null,
      evidenceRefs: [],
      certificationRefs: [],
      activationEligible: false,
    })),
    evidenceRefs: input.evidenceRefs,
    openFindings: [],
    decisions: [],
    createdAt: input.at,
    updatedAt: input.at,
  });
  const created = decision({
    record: base,
    at: input.at,
    actorRole: input.actorRole ?? "PARTNER_ADMIN",
    action: "CREATE",
    outcome: "ALLOW",
    code: "ONBOARDING_CREATED",
    evidenceRefs: input.evidenceRefs,
  });
  return PartnerOnboardingRecordSchema.parse({
    ...base,
    decisions: [created],
  });
}

const transitions: Partial<
  Record<PartnerOnboardingOrganizationState, PartnerOnboardingOrganizationState[]>
> = {
  DRAFT: ["CONTRACT_REVIEW"],
  CONTRACT_REVIEW: ["TECHNICAL_CONFIGURATION"],
  TECHNICAL_CONFIGURATION: ["SANDBOX_READY"],
  SANDBOX_READY: ["CERTIFICATION_PENDING"],
  CERTIFICATION_PENDING: ["SANDBOX_CERTIFIED"],
  SANDBOX_CERTIFIED: ["STAGING_PENDING"],
  STAGING_PENDING: ["STAGING_APPROVED"],
  STAGING_APPROVED: ["AUTHORIZED"],
};

function assertTransitionRole(
  target: PartnerOnboardingOrganizationState,
  role: PartnerOnboardingActorRole,
) {
  if (["SANDBOX_CERTIFIED", "STAGING_PENDING", "STAGING_APPROVED", "AUTHORIZED"].includes(target)) {
    if (role !== "GOVERNANCE_ADMIN") throw new Error("GOVERNANCE_APPROVAL_REQUIRED");
    return;
  }
  if (target === "CERTIFICATION_PENDING" && role === "PARTNER_ADMIN")
    throw new Error("SEPARATE_CERTIFICATION_REVIEW_REQUIRED");
  if (![
    "PARTNER_ADMIN",
    "OPERATIONS",
    "TECHNICAL_REVIEWER",
    "GOVERNANCE_ADMIN",
  ].includes(role))
    throw new Error("ONBOARDING_ROLE_DENIED");
}

function assertTransitionEvidence(
  record: PartnerOnboardingRecord,
  target: PartnerOnboardingOrganizationState,
) {
  if (target === "CONTRACT_REVIEW" && record.evidenceRefs.length === 0)
    throw new Error("ORGANIZATION_EVIDENCE_REQUIRED");
  if (target === "TECHNICAL_CONFIGURATION" && record.openFindings.length > 0)
    throw new Error("OPEN_FINDINGS_BLOCK_TRANSITION");
  if (target === "SANDBOX_READY") {
    if (record.path !== "CONFIGURATION_ONLY")
      throw new Error("ENGINEERING_PATH_MUST_COMPLETE_FIRST");
    if (record.capabilities.some((entry) => !entry.binding))
      throw new Error("CAPABILITY_BINDING_REQUIRED");
  }
  if (target === "CERTIFICATION_PENDING") {
    if (record.capabilities.some((entry) => entry.state !== "CONFIGURED"))
      throw new Error("CAPABILITIES_MUST_BE_CONFIGURED");
  }
  if (target === "SANDBOX_CERTIFIED") {
    if (
      record.capabilities.some(
        (entry) =>
          entry.state !== "SANDBOX_CERTIFIED" || entry.certificationRefs.length === 0,
      )
    )
      throw new Error("CAPABILITY_CERTIFICATION_REQUIRED");
  }
}

export function transitionPartnerOnboarding(input: {
  record: PartnerOnboardingRecord;
  target: PartnerOnboardingOrganizationState;
  actorRole: PartnerOnboardingActorRole;
  at: string;
  programStage?: PartnerOnboardingProgramStage;
  evidenceRefs?: string[];
}) {
  const record = PartnerOnboardingRecordSchema.parse(input.record);
  const target = PartnerOnboardingOrganizationStateSchema.parse(input.target);
  const allowed = transitions[record.organizationState] ?? [];
  if (!allowed.includes(target)) throw new Error("ONBOARDING_TRANSITION_NOT_ALLOWED");
  assertTransitionRole(target, input.actorRole);
  assertTransitionEvidence(record, target);
  if (
    (input.programStage ?? "STAGE_3_SYNTHETIC") === "STAGE_3_SYNTHETIC" &&
    ["STAGING_PENDING", "STAGING_APPROVED", "AUTHORIZED"].includes(target)
  )
    throw new Error("PROGRAM_STAGE_BLOCKS_TRANSITION");

  const event = decision({
    record,
    at: input.at,
    actorRole: input.actorRole,
    action: "TRANSITION",
    outcome: "ALLOW",
    fromState: record.organizationState,
    toState: target,
    code: `TRANSITION_${record.organizationState}_TO_${target}`,
    evidenceRefs: input.evidenceRefs,
  });
  return PartnerOnboardingRecordSchema.parse({
    ...record,
    organizationState: target,
    decisions: [...record.decisions, event],
    updatedAt: input.at,
  });
}

export function bindPartnerCapability(input: {
  record: PartnerOnboardingRecord;
  capabilityId: z.infer<typeof PartnerContractCapabilityIdSchema>;
  binding: PartnerOnboardingBinding;
  actorRole: PartnerOnboardingActorRole;
  at: string;
}) {
  const record = PartnerOnboardingRecordSchema.parse(input.record);
  if (record.organizationState !== "TECHNICAL_CONFIGURATION")
    throw new Error("TECHNICAL_CONFIGURATION_STATE_REQUIRED");
  if (![
    "PARTNER_ADMIN",
    "OPERATIONS",
    "TECHNICAL_REVIEWER",
  ].includes(input.actorRole))
    throw new Error("CAPABILITY_BINDING_ROLE_DENIED");
  const binding = PartnerOnboardingBindingSchema.parse(input.binding);
  if (binding.capabilityId !== input.capabilityId)
    throw new Error("CAPABILITY_BINDING_MISMATCH");
  if (binding.environment !== record.environment)
    throw new Error("CAPABILITY_ENVIRONMENT_MISMATCH");
  if (!record.requestedServices.includes(binding.serviceId))
    throw new Error("SERVICE_NOT_REQUESTED");
  const index = record.capabilities.findIndex(
    (entry) => entry.capabilityId === input.capabilityId,
  );
  if (index < 0) throw new Error("CAPABILITY_NOT_REQUESTED");

  const capabilities = record.capabilities.map((entry, entryIndex) =>
    entryIndex === index
      ? {
          ...entry,
          state: "CONFIGURED" as const,
          binding,
          evidenceRefs: [...new Set([...entry.evidenceRefs, ...binding.evidenceRefs])],
          certificationRefs: [],
          activationEligible: false,
        }
      : entry,
  );
  const event = decision({
    record,
    at: input.at,
    actorRole: input.actorRole,
    action: "BIND_CAPABILITY",
    outcome: "ALLOW",
    capabilityId: input.capabilityId,
    code:
      binding.runtimeMode === "FOUNDATION_ONLY"
        ? "FOUNDATION_BINDING_RECORDED"
        : "EXECUTABLE_BINDING_RECORDED",
    evidenceRefs: binding.evidenceRefs,
  });
  return PartnerOnboardingRecordSchema.parse({
    ...record,
    capabilities,
    decisions: [...record.decisions, event],
    updatedAt: input.at,
  });
}

export function recordPartnerCapabilityCertification(input: {
  record: PartnerOnboardingRecord;
  capabilityId: z.infer<typeof PartnerContractCapabilityIdSchema>;
  certificationRefs: string[];
  actorRole: "TECHNICAL_REVIEWER" | "GOVERNANCE_ADMIN";
  at: string;
}) {
  const record = PartnerOnboardingRecordSchema.parse(input.record);
  if (record.organizationState !== "CERTIFICATION_PENDING")
    throw new Error("CERTIFICATION_PENDING_STATE_REQUIRED");
  if (input.certificationRefs.length === 0)
    throw new Error("CERTIFICATION_EVIDENCE_REQUIRED");
  const index = record.capabilities.findIndex(
    (entry) => entry.capabilityId === input.capabilityId,
  );
  if (index < 0) throw new Error("CAPABILITY_NOT_REQUESTED");
  const existing = record.capabilities[index];
  if (!existing?.binding) throw new Error("CAPABILITY_BINDING_REQUIRED");

  const certificationRefs = input.certificationRefs.map((entry) =>
    PartnerEvidenceRefSchema.parse(entry),
  );
  const capabilities = record.capabilities.map((entry, entryIndex) => {
    if (entryIndex !== index) return entry;
    return {
      ...entry,
      state: "SANDBOX_CERTIFIED" as const,
      certificationRefs,
      activationEligible:
        entry.binding?.runtimeMode === "EXECUTABLE" &&
        entry.binding.environment !== "synthetic",
    };
  });
  const event = decision({
    record,
    at: input.at,
    actorRole: input.actorRole,
    action: "SUBMIT_CERTIFICATION",
    outcome: "ALLOW",
    capabilityId: input.capabilityId,
    code:
      existing.binding.runtimeMode === "FOUNDATION_ONLY"
        ? "FOUNDATION_CERTIFIED_NOT_ACTIVATION_ELIGIBLE"
        : "SANDBOX_CAPABILITY_CERTIFIED",
    evidenceRefs: certificationRefs,
  });
  return PartnerOnboardingRecordSchema.parse({
    ...record,
    capabilities,
    decisions: [...record.decisions, event],
    updatedAt: input.at,
  });
}

export function suspendPartnerCapability(input: {
  record: PartnerOnboardingRecord;
  capabilityId: z.infer<typeof PartnerContractCapabilityIdSchema>;
  actorRole: "GOVERNANCE_ADMIN" | "OPERATIONS";
  at: string;
  evidenceRefs: string[];
}) {
  const record = PartnerOnboardingRecordSchema.parse(input.record);
  const index = record.capabilities.findIndex(
    (entry) => entry.capabilityId === input.capabilityId,
  );
  if (index < 0) throw new Error("CAPABILITY_NOT_REQUESTED");
  const refs = input.evidenceRefs.map((entry) => PartnerEvidenceRefSchema.parse(entry));
  if (refs.length === 0) throw new Error("SUSPENSION_EVIDENCE_REQUIRED");
  const capabilities = record.capabilities.map((entry, entryIndex) =>
    entryIndex === index
      ? { ...entry, state: "SUSPENDED" as const, activationEligible: false }
      : entry,
  );
  const event = decision({
    record,
    at: input.at,
    actorRole: input.actorRole,
    action: "SUSPEND_CAPABILITY",
    outcome: "ALLOW",
    capabilityId: input.capabilityId,
    code: "CAPABILITY_SUSPENDED",
    evidenceRefs: refs,
  });
  return PartnerOnboardingRecordSchema.parse({
    ...record,
    capabilities,
    decisions: [...record.decisions, event],
    updatedAt: input.at,
  });
}
