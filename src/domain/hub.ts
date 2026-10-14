import { z } from "zod";
import {
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
} from "./syntheticReferencePartners";

export const HubTenantIdSchema = z.string().regex(/^tenant_syn_[a-z0-9_]+$/);
export type HubTenantId = z.infer<typeof HubTenantIdSchema>;

export const HubIdSchema = z.string().regex(/^hub_syn_[a-z0-9_]+$/);
export type HubId = z.infer<typeof HubIdSchema>;

export const HubLifecycleStateSchema = z.enum([
  "PLANNED_SYNTHETIC",
  "ACTIVE_SYNTHETIC",
  "SUSPENDED_SYNTHETIC",
  "RETIRED_SYNTHETIC",
]);
export type HubLifecycleState = z.infer<typeof HubLifecycleStateSchema>;

export const HubAccessPurposeSchema = z.enum([
  "HUB_VIEW",
  "HUB_OPERATE",
  "HUB_SUPERVISE",
  "HUB_PARTNER_REVIEW",
  "HUB_ADMINISTER",
]);
export type HubAccessPurpose = z.infer<typeof HubAccessPurposeSchema>;

export const HubRoleSchema = z.enum([
  "AGENT",
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
]);
export type HubRole = z.infer<typeof HubRoleSchema>;

export const HubOperatorSchema = z
  .object({
    operatorAssignmentId: z.string().regex(/^hubop_syn_[a-z0-9_]+$/),
    partnerOrgId: z.string().regex(/^org_syn_[a-z0-9_]+$/),
    role: HubRoleSchema,
    actorScopeType: z.enum(["AGENT_GROUP", "ROLE_ASSIGNMENT"]),
    actorScopeId: z.string().min(1).max(100),
    assignmentState: z.enum([
      "ACTIVE_SYNTHETIC",
      "SUSPENDED_SYNTHETIC",
    ]),
    purposeScopes: z.array(HubAccessPurposeSchema).min(1).max(8),
    evidenceRefs: z.array(z.string().min(1).max(120)).max(12),
  })
  .strict();
export type HubOperator = z.infer<typeof HubOperatorSchema>;

export const HubDeviceSchema = z
  .object({
    deviceId: z.string().regex(/^hubdev_syn_[a-z0-9_]+$/),
    deviceClass: z.enum([
      "AGENT_TERMINAL",
      "CONNECTIVITY_GATEWAY",
      "PRINTER",
      "POWER_BACKUP",
      "OTHER",
    ]),
    readinessState: z.enum([
      "READY_SYNTHETIC",
      "NEEDS_REVIEW",
      "OUT_OF_SERVICE",
    ]),
    assignedOperatorRef: z.string().min(1).max(100).nullable(),
    controlEnabled: z.literal(false),
    providerCommandEnabled: z.literal(false),
    evidenceRefs: z.array(z.string().min(1).max(120)).max(12),
  })
  .strict();
export type HubDevice = z.infer<typeof HubDeviceSchema>;

export const HubPartnerMembershipSchema = z
  .object({
    partnerOrgId: z.string().regex(/^org_syn_[a-z0-9_]+$/),
    membershipState: z.enum([
      "SYNTHETIC_MEMBER",
      "SUSPENDED_SYNTHETIC",
    ]),
    permittedPurposeScopes: z.array(HubAccessPurposeSchema).min(1).max(8),
    regulatedAuthorityGranted: z.literal(false),
    evidenceRefs: z.array(z.string().min(1).max(120)).max(12),
  })
  .strict();
export type HubPartnerMembership = z.infer<typeof HubPartnerMembershipSchema>;

export const HubSchema = z
  .object({
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    displayName: z.string().min(1).max(120),
    regionId: z.string().regex(/^region_syn_[a-z0-9_]+$/),
    lifecycleState: HubLifecycleStateSchema,
    syntheticOnly: z.literal(true),
    operators: z.array(HubOperatorSchema).max(20),
    devices: z.array(HubDeviceSchema).max(20),
    partnerMemberships: z.array(HubPartnerMembershipSchema).max(20),
    evidenceRefs: z.array(z.string().min(1).max(120)).max(20),
    authorityBoundary: z.string().min(1).max(360),
  })
  .strict();
export type Hub = z.infer<typeof HubSchema>;

export const HubAccessContextSchema = z
  .object({
    tenantId: HubTenantIdSchema,
    role: HubRoleSchema,
    activePartnerOrgId: z.string().regex(/^org_syn_[a-z0-9_]+$/),
    partnerOrgMemberships: z.array(z.string().regex(/^org_syn_[a-z0-9_]+$/)),
    regionId: z.string().regex(/^region_syn_[a-z0-9_]+$/),
    agentGroupIds: z.array(z.string().regex(/^group_syn_[a-z0-9_]+$/)),
    assignedHubIds: z.array(HubIdSchema),
    allowedPurposes: z.array(HubAccessPurposeSchema),
  })
  .strict();
export type HubAccessContext = z.infer<typeof HubAccessContextSchema>;

export interface AuthorizedHubAccess {
  hub: Hub;
  partnerMembership: HubPartnerMembership;
  operatorAssignment: HubOperator;
  purpose: HubAccessPurpose;
}

export const SYNTHETIC_HUB_TENANT_IDS = {
  STAGE4: "tenant_syn_enawuga_stage4",
  DENIAL: "tenant_syn_denial",
} as const satisfies Record<string, HubTenantId>;

export const SYNTHETIC_HUB_IDS = {
  ADAMA_SHARED: "hub_syn_adama_001",
  ARISI_ALPHA: "hub_syn_arisi_001",
  DENIAL: "hub_syn_denial_001",
} as const satisfies Record<string, HubId>;

function operator(input: HubOperator) {
  return HubOperatorSchema.parse(input);
}

function membership(input: HubPartnerMembership) {
  return HubPartnerMembershipSchema.parse(input);
}

export const syntheticHubs: readonly Hub[] = [
  HubSchema.parse({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    displayName: "Synthetic Adama Shared Hub 001",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    lifecycleState: "ACTIVE_SYNTHETIC",
    syntheticOnly: true,
    operators: [
      operator({
        operatorAssignmentId: "hubop_syn_adama_alpha_agents",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        role: "AGENT",
        actorScopeType: "AGENT_GROUP",
        actorScopeId: SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS,
        assignmentState: "ACTIVE_SYNTHETIC",
        purposeScopes: ["HUB_VIEW", "HUB_OPERATE"],
        evidenceRefs: ["EV-SYN-HUB-ADAMA-ALPHA-AGENT-V1"],
      }),
      operator({
        operatorAssignmentId: "hubop_syn_adama_beta_agents",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
        role: "AGENT",
        actorScopeType: "AGENT_GROUP",
        actorScopeId: SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS,
        assignmentState: "ACTIVE_SYNTHETIC",
        purposeScopes: ["HUB_VIEW", "HUB_OPERATE"],
        evidenceRefs: ["EV-SYN-HUB-ADAMA-BETA-AGENT-V1"],
      }),
      operator({
        operatorAssignmentId: "hubop_syn_adama_alpha_supervisor",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        role: "SUPERVISOR",
        actorScopeType: "ROLE_ASSIGNMENT",
        actorScopeId: "role_syn_alpha_supervisor_adama",
        assignmentState: "ACTIVE_SYNTHETIC",
        purposeScopes: ["HUB_VIEW", "HUB_SUPERVISE"],
        evidenceRefs: ["EV-SYN-HUB-ADAMA-ALPHA-SUPERVISOR-V1"],
      }),
      operator({
        operatorAssignmentId: "hubop_syn_adama_alpha_operations",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        role: "OPERATIONS",
        actorScopeType: "ROLE_ASSIGNMENT",
        actorScopeId: "role_syn_alpha_operations_adama",
        assignmentState: "ACTIVE_SYNTHETIC",
        purposeScopes: ["HUB_VIEW", "HUB_PARTNER_REVIEW"],
        evidenceRefs: ["EV-SYN-HUB-ADAMA-ALPHA-OPERATIONS-V1"],
      }),
      operator({
        operatorAssignmentId: "hubop_syn_adama_alpha_partner_admin",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        role: "PARTNER_ADMIN",
        actorScopeType: "ROLE_ASSIGNMENT",
        actorScopeId: "role_syn_alpha_partner_admin_adama",
        assignmentState: "ACTIVE_SYNTHETIC",
        purposeScopes: [
          "HUB_VIEW",
          "HUB_PARTNER_REVIEW",
          "HUB_ADMINISTER",
        ],
        evidenceRefs: ["EV-SYN-HUB-ADAMA-ALPHA-PARTNER-ADMIN-V1"],
      }),
    ],
    devices: [
      {
        deviceId: "hubdev_syn_adama_terminal_001",
        deviceClass: "AGENT_TERMINAL",
        readinessState: "READY_SYNTHETIC",
        assignedOperatorRef: "hubop_syn_adama_alpha_agents",
        controlEnabled: false,
        providerCommandEnabled: false,
        evidenceRefs: ["EV-SYN-HUB-DEVICE-ADAMA-TERMINAL-001"],
      },
      {
        deviceId: "hubdev_syn_adama_connectivity_001",
        deviceClass: "CONNECTIVITY_GATEWAY",
        readinessState: "NEEDS_REVIEW",
        assignedOperatorRef: null,
        controlEnabled: false,
        providerCommandEnabled: false,
        evidenceRefs: ["EV-SYN-HUB-DEVICE-ADAMA-CONNECTIVITY-001"],
      },
    ],
    partnerMemberships: [
      membership({
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        membershipState: "SYNTHETIC_MEMBER",
        permittedPurposeScopes: [
          "HUB_VIEW",
          "HUB_OPERATE",
          "HUB_SUPERVISE",
          "HUB_PARTNER_REVIEW",
          "HUB_ADMINISTER",
        ],
        regulatedAuthorityGranted: false,
        evidenceRefs: ["EV-SYN-HUB-ADAMA-ALPHA-MEMBERSHIP-V1"],
      }),
      membership({
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
        membershipState: "SYNTHETIC_MEMBER",
        permittedPurposeScopes: ["HUB_VIEW", "HUB_OPERATE"],
        regulatedAuthorityGranted: false,
        evidenceRefs: ["EV-SYN-HUB-ADAMA-BETA-MEMBERSHIP-V1"],
      }),
    ],
    evidenceRefs: ["EV-SYN-HUB-ADAMA-001-V1"],
    authorityBoundary:
      "Synthetic Stage-4 Hub aggregate only. Wishland provides technology/orchestration; partner membership does not grant account, funds, KYC, payment, settlement, cash-custody or device-control authority.",
  }),
  HubSchema.parse({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
    displayName: "Synthetic Arisi Hub 001",
    regionId: SYNTHETIC_REGION_IDS.ARISI,
    lifecycleState: "PLANNED_SYNTHETIC",
    syntheticOnly: true,
    operators: [
      operator({
        operatorAssignmentId: "hubop_syn_arisi_alpha_agents",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        role: "AGENT",
        actorScopeType: "AGENT_GROUP",
        actorScopeId: SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS,
        assignmentState: "ACTIVE_SYNTHETIC",
        purposeScopes: ["HUB_VIEW", "HUB_OPERATE"],
        evidenceRefs: ["EV-SYN-HUB-ARISI-ALPHA-AGENT-V1"],
      }),
    ],
    devices: [],
    partnerMemberships: [
      membership({
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        membershipState: "SYNTHETIC_MEMBER",
        permittedPurposeScopes: ["HUB_VIEW", "HUB_OPERATE"],
        regulatedAuthorityGranted: false,
        evidenceRefs: ["EV-SYN-HUB-ARISI-ALPHA-MEMBERSHIP-V1"],
      }),
    ],
    evidenceRefs: ["EV-SYN-HUB-ARISI-001-V1"],
    authorityBoundary:
      "Planned synthetic Hub fixture only; no field site, live operator, live device or regulated partner authority is represented.",
  }),
  HubSchema.parse({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.DENIAL,
    hubId: SYNTHETIC_HUB_IDS.DENIAL,
    displayName: "Synthetic denial-tenant Hub",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    lifecycleState: "ACTIVE_SYNTHETIC",
    syntheticOnly: true,
    operators: [],
    devices: [],
    partnerMemberships: [],
    evidenceRefs: ["EV-SYN-HUB-DENIAL-001-V1"],
    authorityBoundary:
      "Negative-test fixture used to prove tenant and assignment isolation. It is not a deployable or partner-visible Hub.",
  }),
] as const;

const rolePurposes: Record<HubRole, readonly HubAccessPurpose[]> = {
  AGENT: ["HUB_VIEW", "HUB_OPERATE"],
  SUPERVISOR: ["HUB_VIEW", "HUB_SUPERVISE"],
  OPERATIONS: ["HUB_VIEW", "HUB_PARTNER_REVIEW"],
  PARTNER_ADMIN: ["HUB_VIEW", "HUB_PARTNER_REVIEW", "HUB_ADMINISTER"],
};

function matchesOperatorAssignment(
  hub: Hub,
  context: HubAccessContext,
  purpose: HubAccessPurpose,
) {
  return hub.operators.find((assignment) => {
    if (assignment.assignmentState !== "ACTIVE_SYNTHETIC") return false;
    if (assignment.partnerOrgId !== context.activePartnerOrgId) return false;
    if (assignment.role !== context.role) return false;
    if (!assignment.purposeScopes.includes(purpose)) return false;
    if (assignment.actorScopeType === "AGENT_GROUP")
      return context.agentGroupIds.includes(assignment.actorScopeId);
    return true;
  });
}

export function authorizeSyntheticHubAccess(input: {
  hubId: string;
  purpose: HubAccessPurpose;
  context: HubAccessContext;
}): AuthorizedHubAccess | null {
  const context = HubAccessContextSchema.safeParse(input.context);
  const purpose = HubAccessPurposeSchema.safeParse(input.purpose);
  const hubId = HubIdSchema.safeParse(input.hubId);
  if (!context.success || !purpose.success || !hubId.success) return null;

  const hub = syntheticHubs.find((entry) => entry.hubId === hubId.data);
  if (!hub) return null;
  if (hub.tenantId !== context.data.tenantId) return null;
  if (hub.regionId !== context.data.regionId) return null;
  if (!context.data.assignedHubIds.includes(hub.hubId)) return null;
  if (!context.data.partnerOrgMemberships.includes(context.data.activePartnerOrgId))
    return null;
  if (!context.data.allowedPurposes.includes(purpose.data)) return null;
  if (!rolePurposes[context.data.role].includes(purpose.data)) return null;

  const partnerMembership = hub.partnerMemberships.find(
    (entry) =>
      entry.partnerOrgId === context.data.activePartnerOrgId &&
      entry.membershipState === "SYNTHETIC_MEMBER" &&
      entry.permittedPurposeScopes.includes(purpose.data),
  );
  if (!partnerMembership) return null;

  const operatorAssignment = matchesOperatorAssignment(
    hub,
    context.data,
    purpose.data,
  );
  if (!operatorAssignment) return null;

  return {
    hub,
    partnerMembership,
    operatorAssignment,
    purpose: purpose.data,
  };
}

export function projectAuthorizedHub(access: AuthorizedHubAccess) {
  return {
    hubId: access.hub.hubId,
    tenantId: access.hub.tenantId,
    displayName: access.hub.displayName,
    regionId: access.hub.regionId,
    lifecycleState: access.hub.lifecycleState,
    syntheticOnly: true as const,
    purpose: access.purpose,
    partnerMembership: access.partnerMembership,
    operatorAssignment: access.operatorAssignment,
    devices: access.hub.devices.map((device) => ({
      deviceId: device.deviceId,
      deviceClass: device.deviceClass,
      readinessState: device.readinessState,
      assignedOperatorRef:
        device.assignedOperatorRef === access.operatorAssignment.operatorAssignmentId
          ? device.assignedOperatorRef
          : null,
      controlEnabled: false as const,
      providerCommandEnabled: false as const,
      evidenceRefs: [...device.evidenceRefs],
    })),
    evidenceRefs: [...access.hub.evidenceRefs],
    authorityBoundary: access.hub.authorityBoundary,
  };
}
