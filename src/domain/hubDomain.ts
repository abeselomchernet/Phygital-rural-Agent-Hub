import { z } from "zod";
import {
  PartnerContractCapabilityIdSchema,
  PartnerOrgIdSchema,
  PartnerRegionIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "./syntheticReferencePartners";

const unique = (values: readonly string[]) => new Set(values).size === values.length;

export const HubIdSchema = z.string().uuid();
export type HubId = z.infer<typeof HubIdSchema>;

export const HubLifecycleStateSchema = z.enum([
  "DRAFT",
  "SYNTHETIC_CONFIGURED",
  "TRAINING_REQUIRED",
  "SYNTHETIC_READY",
  "STAGING_PENDING_EVIDENCE",
  "STAGING_READY",
  "PILOT_PENDING_AUTHORIZATION",
  "PILOT_AUTHORIZED",
  "PILOT_ACTIVE",
  "SUSPENDED",
  "RETIRED",
]);
export type HubLifecycleState = z.infer<typeof HubLifecycleStateSchema>;

export const Stage4AllowedHubLifecycleStateSchema = z.enum([
  "DRAFT",
  "SYNTHETIC_CONFIGURED",
  "TRAINING_REQUIRED",
  "SYNTHETIC_READY",
]);

export const HubOperatingStatusSchema = z.enum([
  "CONFIGURATION_ONLY",
  "SYNTHETIC_REHEARSAL",
  "SUSPENDED",
  "RETIRED",
]);

export const HubReadinessStatusSchema = z.enum([
  "NOT_ASSESSED",
  "SYNTHETIC_INCOMPLETE",
  "SYNTHETIC_READY",
  "EXTERNAL_EVIDENCE_REQUIRED",
]);

export const HubPartnerMembershipStateSchema = z.enum([
  "DISABLED",
  "SIMULATION_ONLY",
  "STAGING_BOUNDED",
  "PILOT_AUTHORIZED",
  "SUSPENDED",
]);

export const HubOperatorRoleSchema = z.enum(["AGENT", "SUPERVISOR"]);
export const HubDeviceClassSchema = z.enum(["TABLET", "LAPTOP", "PHONE"]);
export const HubDeviceReadinessSchema = z.enum([
  "SYNTHETIC_READY",
  "ATTENTION_REQUIRED",
  "RETIRED",
]);
export const HubConnectivityProfileSchema = z.enum([
  "INTERMITTENT_MOBILE",
  "MIXED_MOBILE_WIFI",
  "OFFLINE_REHEARSAL",
]);

export const HubPartnerMembershipSchema = z
  .object({
    membershipId: z.string().regex(/^hubmem_syn_[a-z0-9_]+$/),
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    capabilityIds: z.array(PartnerContractCapabilityIdSchema).min(1).max(32).refine(unique),
    serviceIds: z.array(PartnerServiceIdSchema).min(1).max(32).refine(unique),
    routeIds: z.array(PartnerRouteIdSchema).min(1).max(16).refine(unique),
    effectiveAt: z.null(),
    expiresAt: z.null(),
    evidenceRefs: z.array(z.string().min(3).max(160)).min(1).max(16).refine(unique),
    commercialTierRef: z.null(),
    activationState: HubPartnerMembershipStateSchema,
    authorityBoundary: z.string().min(20).max(320),
  })
  .strict();
export type HubPartnerMembership = z.infer<typeof HubPartnerMembershipSchema>;

export const HubOperatorSchema = z
  .object({
    hubOperatorId: z.string().regex(/^hubop_syn_[a-z0-9_]+$/),
    hubId: HubIdSchema,
    userId: z.string().regex(/^synthetic-[a-z0-9-]+$/),
    role: HubOperatorRoleSchema,
    scopeRegionId: PartnerRegionIdSchema,
    trainingModulesCompleted: z.array(z.string().min(3).max(100)).max(32).refine(unique),
    certificationState: z.enum(["NOT_CERTIFIED", "SYNTHETIC_REHEARSAL_ONLY"]),
    certificationEffectiveAt: z.null(),
    certificationExpiresAt: z.null(),
    authorizedDeviceIds: z.array(z.string().regex(/^hubdev_syn_[a-z0-9_]+$/)).max(12).refine(unique),
    suspended: z.boolean(),
    supportEscalationRef: z.literal("SYNTHETIC_SUPPORT_ONLY"),
    authorityBoundary: z.literal(
      "Training/readiness never creates PartnerFI, payment, custody, settlement or regulated authority.",
    ),
  })
  .strict();
export type HubOperator = z.infer<typeof HubOperatorSchema>;

export const HubDeviceSchema = z
  .object({
    deviceId: z.string().regex(/^hubdev_syn_[a-z0-9_]+$/),
    hubId: HubIdSchema,
    assignedOperatorId: z.string().regex(/^hubop_syn_[a-z0-9_]+$/),
    deviceClass: HubDeviceClassSchema,
    applicationVersion: z.string().min(1).max(40),
    localStorageEncrypted: z.boolean(),
    syncHealth: z.enum(["HEALTHY_SYNTHETIC", "DEGRADED_SYNTHETIC", "OFFLINE_SYNTHETIC"]),
    lastCheckInAt: z.string().datetime({ offset: true }),
    securityPosture: z.enum(["SYNTHETIC_BASELINE", "ATTENTION_REQUIRED"]),
    readiness: HubDeviceReadinessSchema,
    containsRealCustomerData: z.literal(false),
  })
  .strict();
export type HubDevice = z.infer<typeof HubDeviceSchema>;

export const HubSchema = z
  .object({
    hubId: HubIdSchema,
    hubCode: z.string().regex(/^SYN-HUB-[A-Z0-9-]+$/),
    displayName: z.string().min(3).max(120),
    corridorId: z.string().regex(/^corridor_syn_[a-z0-9_]+$/),
    regionId: PartnerRegionIdSchema,
    locationReference: z.string().regex(/^SYNTHETIC_LOCATION_[A-Z0-9_]+$/),
    operatorOrgId: z.string().regex(/^org_syn_[a-z0-9_]+$/),
    primaryOperatorUserId: z.string().regex(/^synthetic-[a-z0-9-]+$/),
    lifecycleState: HubLifecycleStateSchema,
    operatingStatus: HubOperatingStatusSchema,
    readinessStatus: HubReadinessStatusSchema,
    approvedServiceIds: z.array(PartnerServiceIdSchema).max(64).refine(unique),
    approvedCapabilityIds: z.array(PartnerContractCapabilityIdSchema).max(64).refine(unique),
    partnerMembershipIds: z.array(z.string().regex(/^hubmem_syn_[a-z0-9_]+$/)).max(32).refine(unique),
    deviceIds: z.array(z.string().regex(/^hubdev_syn_[a-z0-9_]+$/)).max(16).refine(unique),
    connectivityProfile: HubConnectivityProfileSchema,
    trainingCertificationState: z.enum(["SYNTHETIC_ONLY", "TRAINING_REQUIRED"]),
    liquidityPlanningProfile: z.literal("SYNTHETIC_DECISION_SUPPORT_ONLY"),
    inventoryProfile: z.literal("SYNTHETIC_PLANNING_ONLY"),
    operatingHours: z.object({ timezone: z.literal("Africa/Addis_Ababa"), opens: z.string().regex(/^\d{2}:\d{2}$/), closes: z.string().regex(/^\d{2}:\d{2}$/) }).strict(),
    evidenceReferences: z.array(z.string().min(3).max(160)).min(1).max(24).refine(unique),
    dataMode: z.literal("SYNTHETIC_ONLY"),
    realFundsAllowed: z.literal(false),
    realCashCustodyAllowed: z.literal(false),
    regulatedAuthorityGranted: z.literal(false),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    version: z.number().int().positive(),
  })
  .strict();
export type Hub = z.infer<typeof HubSchema>;

export const SYNTHETIC_HUB_IDS = {
  ADAMA_A: "00000000-0000-4000-8000-000000000101",
  ARISI_A: "00000000-0000-4000-8000-000000000102",
} as const satisfies Record<string, HubId>;

export const syntheticHubPartnerMemberships: readonly HubPartnerMembership[] = [
  {
    membershipId: "hubmem_syn_adama_alpha",
    hubId: SYNTHETIC_HUB_IDS.ADAMA_A,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    capabilityIds: ["FIN.ACCOUNT_LOOKUP", "LIQ.NLC_READ"],
    serviceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP, SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ],
    routeIds: [SYNTHETIC_ROUTE_IDS.ALPHA_CORE],
    effectiveAt: null,
    expiresAt: null,
    evidenceRefs: ["EV-SYN-HUB-ADAMA-ALPHA-V1"],
    commercialTierRef: null,
    activationState: "SIMULATION_ONLY",
    authorityBoundary: "Synthetic Hub membership exposes configuration/evidence only; it grants no real account, cash, payment, posting, settlement or custody authority.",
  },
  {
    membershipId: "hubmem_syn_adama_beta",
    hubId: SYNTHETIC_HUB_IDS.ADAMA_A,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    capabilityIds: ["FIN.ACCOUNT_LOOKUP"],
    serviceIds: [SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP],
    routeIds: [SYNTHETIC_ROUTE_IDS.BETA_CORE],
    effectiveAt: null,
    expiresAt: null,
    evidenceRefs: ["EV-SYN-HUB-ADAMA-BETA-V1"],
    commercialTierRef: null,
    activationState: "SIMULATION_ONLY",
    authorityBoundary: "Synthetic Hub membership exposes configuration/evidence only; it grants no real account, cash, payment, posting, settlement or custody authority.",
  },
  {
    membershipId: "hubmem_syn_arisi_alpha",
    hubId: SYNTHETIC_HUB_IDS.ARISI_A,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    capabilityIds: ["FIN.ACCOUNT_LOOKUP", "LIQ.NLC_READ"],
    serviceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP, SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ],
    routeIds: [SYNTHETIC_ROUTE_IDS.ALPHA_CORE],
    effectiveAt: null,
    expiresAt: null,
    evidenceRefs: ["EV-SYN-HUB-ARISI-ALPHA-V1"],
    commercialTierRef: null,
    activationState: "SIMULATION_ONLY",
    authorityBoundary: "Synthetic Hub membership exposes configuration/evidence only; it grants no real account, cash, payment, posting, settlement or custody authority.",
  },
].map((value) => HubPartnerMembershipSchema.parse(value));

export const syntheticHubOperators: readonly HubOperator[] = [
  {
    hubOperatorId: "hubop_syn_adama_agent_01",
    hubId: SYNTHETIC_HUB_IDS.ADAMA_A,
    userId: "synthetic-agent-01",
    role: "AGENT",
    scopeRegionId: SYNTHETIC_REGION_IDS.ADAMA,
    trainingModulesCompleted: ["synthetic-platform-basics", "synthetic-offline-rehearsal"],
    certificationState: "SYNTHETIC_REHEARSAL_ONLY",
    certificationEffectiveAt: null,
    certificationExpiresAt: null,
    authorizedDeviceIds: ["hubdev_syn_adama_tablet_01"],
    suspended: false,
    supportEscalationRef: "SYNTHETIC_SUPPORT_ONLY",
    authorityBoundary: "Training/readiness never creates PartnerFI, payment, custody, settlement or regulated authority.",
  },
  {
    hubOperatorId: "hubop_syn_arisi_agent_01",
    hubId: SYNTHETIC_HUB_IDS.ARISI_A,
    userId: "synthetic-agent-02",
    role: "AGENT",
    scopeRegionId: SYNTHETIC_REGION_IDS.ARISI,
    trainingModulesCompleted: ["synthetic-platform-basics"],
    certificationState: "SYNTHETIC_REHEARSAL_ONLY",
    certificationEffectiveAt: null,
    certificationExpiresAt: null,
    authorizedDeviceIds: ["hubdev_syn_arisi_tablet_01"],
    suspended: false,
    supportEscalationRef: "SYNTHETIC_SUPPORT_ONLY",
    authorityBoundary: "Training/readiness never creates PartnerFI, payment, custody, settlement or regulated authority.",
  },
].map((value) => HubOperatorSchema.parse(value));

export const syntheticHubDevices: readonly HubDevice[] = [
  {
    deviceId: "hubdev_syn_adama_tablet_01",
    hubId: SYNTHETIC_HUB_IDS.ADAMA_A,
    assignedOperatorId: "hubop_syn_adama_agent_01",
    deviceClass: "TABLET",
    applicationVersion: "synthetic-e1",
    localStorageEncrypted: true,
    syncHealth: "HEALTHY_SYNTHETIC",
    lastCheckInAt: "2026-10-15T08:00:00+03:00",
    securityPosture: "SYNTHETIC_BASELINE",
    readiness: "SYNTHETIC_READY",
    containsRealCustomerData: false,
  },
  {
    deviceId: "hubdev_syn_arisi_tablet_01",
    hubId: SYNTHETIC_HUB_IDS.ARISI_A,
    assignedOperatorId: "hubop_syn_arisi_agent_01",
    deviceClass: "TABLET",
    applicationVersion: "synthetic-e1",
    localStorageEncrypted: true,
    syncHealth: "OFFLINE_SYNTHETIC",
    lastCheckInAt: "2026-10-15T07:30:00+03:00",
    securityPosture: "SYNTHETIC_BASELINE",
    readiness: "SYNTHETIC_READY",
    containsRealCustomerData: false,
  },
].map((value) => HubDeviceSchema.parse(value));

export const syntheticHubs: readonly Hub[] = [
  {
    hubId: SYNTHETIC_HUB_IDS.ADAMA_A,
    hubCode: "SYN-HUB-ADAMA-A",
    displayName: "Synthetic Adama Rural Hub A",
    corridorId: "corridor_syn_adama_demo",
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    locationReference: "SYNTHETIC_LOCATION_ADAMA_A",
    operatorOrgId: "org_syn_hub_operator_demo",
    primaryOperatorUserId: "synthetic-agent-01",
    lifecycleState: "SYNTHETIC_READY",
    operatingStatus: "SYNTHETIC_REHEARSAL",
    readinessStatus: "SYNTHETIC_READY",
    approvedServiceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP, SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ, SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP],
    approvedCapabilityIds: ["FIN.ACCOUNT_LOOKUP", "LIQ.NLC_READ"],
    partnerMembershipIds: ["hubmem_syn_adama_alpha", "hubmem_syn_adama_beta"],
    deviceIds: ["hubdev_syn_adama_tablet_01"],
    connectivityProfile: "INTERMITTENT_MOBILE",
    trainingCertificationState: "SYNTHETIC_ONLY",
    liquidityPlanningProfile: "SYNTHETIC_DECISION_SUPPORT_ONLY",
    inventoryProfile: "SYNTHETIC_PLANNING_ONLY",
    operatingHours: { timezone: "Africa/Addis_Ababa", opens: "08:00", closes: "17:00" },
    evidenceReferences: ["EV-SYN-HUB-ADAMA-E1-V1"],
    dataMode: "SYNTHETIC_ONLY",
    realFundsAllowed: false,
    realCashCustodyAllowed: false,
    regulatedAuthorityGranted: false,
    createdAt: "2026-10-15T00:00:00+03:00",
    updatedAt: "2026-10-15T00:00:00+03:00",
    version: 1,
  },
  {
    hubId: SYNTHETIC_HUB_IDS.ARISI_A,
    hubCode: "SYN-HUB-ARISI-A",
    displayName: "Synthetic Arisi Rural Hub A",
    corridorId: "corridor_syn_arisi_demo",
    regionId: SYNTHETIC_REGION_IDS.ARISI,
    locationReference: "SYNTHETIC_LOCATION_ARISI_A",
    operatorOrgId: "org_syn_hub_operator_demo",
    primaryOperatorUserId: "synthetic-agent-02",
    lifecycleState: "SYNTHETIC_CONFIGURED",
    operatingStatus: "CONFIGURATION_ONLY",
    readinessStatus: "SYNTHETIC_INCOMPLETE",
    approvedServiceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP, SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ],
    approvedCapabilityIds: ["FIN.ACCOUNT_LOOKUP", "LIQ.NLC_READ"],
    partnerMembershipIds: ["hubmem_syn_arisi_alpha"],
    deviceIds: ["hubdev_syn_arisi_tablet_01"],
    connectivityProfile: "OFFLINE_REHEARSAL",
    trainingCertificationState: "TRAINING_REQUIRED",
    liquidityPlanningProfile: "SYNTHETIC_DECISION_SUPPORT_ONLY",
    inventoryProfile: "SYNTHETIC_PLANNING_ONLY",
    operatingHours: { timezone: "Africa/Addis_Ababa", opens: "08:00", closes: "17:00" },
    evidenceReferences: ["EV-SYN-HUB-ARISI-E1-V1"],
    dataMode: "SYNTHETIC_ONLY",
    realFundsAllowed: false,
    realCashCustodyAllowed: false,
    regulatedAuthorityGranted: false,
    createdAt: "2026-10-15T00:00:00+03:00",
    updatedAt: "2026-10-15T00:00:00+03:00",
    version: 1,
  },
].map((value) => HubSchema.parse(value));

export const HubAccessRoleSchema = z.enum(["AGENT", "SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]);
export const HubAccessActionSchema = z.literal("READ");
export type HubAccessRole = z.infer<typeof HubAccessRoleSchema>;

export interface HubAccessContext {
  userId: string;
  role: HubAccessRole;
  regionId: string;
  partnerOrgMemberships: readonly string[];
}

export function isStage4HubLifecycleStateAllowed(state: HubLifecycleState) {
  return Stage4AllowedHubLifecycleStateSchema.safeParse(state).success;
}

export function isHubReadAuthorized(context: HubAccessContext, hubId: HubId) {
  const parsedHubId = HubIdSchema.parse(hubId);
  const role = HubAccessRoleSchema.parse(context.role);
  const hub = syntheticHubs.find((candidate) => candidate.hubId === parsedHubId);
  if (!hub || hub.regionId !== context.regionId) return false;
  if (role === "AGENT") return hub.primaryOperatorUserId === context.userId;
  if (role === "SUPERVISOR" || role === "OPERATIONS") return true;
  const memberships = syntheticHubPartnerMemberships.filter((membership) => membership.hubId === hub.hubId);
  return memberships.some((membership) => context.partnerOrgMemberships.includes(membership.partnerOrgId));
}

export function hubIdsForAccessContext(context: HubAccessContext): readonly HubId[] {
  return syntheticHubs.filter((hub) => isHubReadAuthorized(context, hub.hubId)).map((hub) => hub.hubId);
}

export function validateSyntheticHubGraph() {
  const hubs = new Map(syntheticHubs.map((hub) => [hub.hubId, hub]));
  const memberships = new Map(syntheticHubPartnerMemberships.map((value) => [value.membershipId, value]));
  const operators = new Map(syntheticHubOperators.map((value) => [value.hubOperatorId, value]));
  const devices = new Map(syntheticHubDevices.map((value) => [value.deviceId, value]));

  for (const hub of syntheticHubs) {
    if (!isStage4HubLifecycleStateAllowed(hub.lifecycleState)) return false;
    if (hub.regulatedAuthorityGranted || hub.realFundsAllowed || hub.realCashCustodyAllowed) return false;
    for (const membershipId of hub.partnerMembershipIds) {
      const membership = memberships.get(membershipId);
      if (!membership || membership.hubId !== hub.hubId || membership.activationState !== "SIMULATION_ONLY") return false;
    }
    for (const deviceId of hub.deviceIds) {
      const device = devices.get(deviceId);
      if (!device || device.hubId !== hub.hubId || device.containsRealCustomerData) return false;
    }
  }

  for (const operator of syntheticHubOperators) {
    if (!hubs.has(operator.hubId)) return false;
    for (const deviceId of operator.authorizedDeviceIds) {
      const device = devices.get(deviceId);
      if (!device || device.hubId !== operator.hubId || device.assignedOperatorId !== operator.hubOperatorId) return false;
    }
  }

  for (const device of syntheticHubDevices) {
    if (!hubs.has(device.hubId) || !operators.has(device.assignedOperatorId)) return false;
  }
  return true;
}
