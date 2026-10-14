import { z } from "zod";

export const PartnerClassSchema = z.enum([
  "FINANCIAL_INSTITUTION",
  "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
  "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
  "TELCO_COMMUNICATIONS",
  "IDENTITY_PROVIDER",
  "FMCG_DISTRIBUTOR_MERCHANT",
  "CASH_LOGISTICS_FLEET",
]);
export type PartnerClass = z.infer<typeof PartnerClassSchema>;

export const PartnerEnvironmentSchema = z.enum(["synthetic", "sandbox", "testbed"]);
export type PartnerEnvironment = z.infer<typeof PartnerEnvironmentSchema>;

export const PartnerCapabilitySchema = z.enum([
  "ARIFPAY_C2B",
  "ARIFPAY_B2C",
  "ARIFPAY_W2B",
  "TELEBIRR_DIRECT_C2B",
  "MPESA_ETHIOPIA_DIRECT_C2B",
  "PARTNERFI_ACCOUNT_LOOKUP",
  "PARTNERFI_CASH_IN_AUTH",
  "PARTNERFI_CASH_OUT_AUTH",
  "IDENTITY_ONBOARDING",
  "SMS_NOTIFICATION",
  "FMCG_ORDERING",
  "FLEET_ROUTE_PLANNING",
  "FLEET_DISPATCH",
  "FLEET_CASH_HANDOVER",
]);
export type PartnerCapability = z.infer<typeof PartnerCapabilitySchema>;

export const CapabilitySwitchStateSchema = z.enum([
  "DISABLED",
  "FOUNDATION_ONLY",
  "SIMULATION_ONLY",
  "SANDBOX_BOUNDED",
]);
export type CapabilitySwitchState = z.infer<typeof CapabilitySwitchStateSchema>;

export const CapabilitySwitchSchema = z
  .object({
    capability: PartnerCapabilitySchema,
    state: CapabilitySwitchStateSchema,
    reason: z.string().min(1).max(280),
  })
  .strict();
export type CapabilitySwitch = z.infer<typeof CapabilitySwitchSchema>;

export const PartnerOrganizationSchema = z
  .object({
    partnerOrgId: z.string().regex(/^synthetic-[a-z0-9-]+$/),
    partnerClass: PartnerClassSchema,
    displayName: z.string().min(1).max(120),
    environment: PartnerEnvironmentSchema,
    evidenceRefs: z.array(z.string().min(1).max(120)).max(12),
    permittedDataClasses: z.array(z.string().min(1).max(80)).max(12),
    permittedRoutes: z.array(z.string().min(1).max(120)).max(12),
    permittedRegions: z.array(z.string().min(1).max(80)).max(12),
    authorizedRoles: z
      .array(z.enum(["SUPERVISOR", "PARTNER_ADMIN", "OPERATIONS"]))
      .max(6),
    credentialOwnerRole: z.string().min(1).max(120),
    operationalContactRef: z.literal("NOT_STORED_IN_SYNTHETIC_FIXTURE"),
    incidentContactRef: z.literal("NOT_STORED_IN_SYNTHETIC_FIXTURE"),
    approvalEffectiveAt: z.null(),
    approvalExpiresAt: z.null(),
    capabilitySwitches: z.array(CapabilitySwitchSchema).max(20),
  })
  .strict();
export type PartnerOrganization = z.infer<typeof PartnerOrganizationSchema>;

export const RouteProvenanceSchema = z
  .object({
    routeId: z.string().regex(/^synthetic-route-[a-z0-9-]+$/),
    serviceProvider: z.string().min(1).max(100),
    integrationRoute: z.string().min(1).max(120),
    gatewayOperator: z.string().min(1).max(100),
    state: CapabilitySwitchStateSchema,
    authorityBoundary: z.string().min(1).max(280),
  })
  .strict();
export type RouteProvenance = z.infer<typeof RouteProvenanceSchema>;

const disabled = (
  capability: PartnerCapability,
  reason: string,
): CapabilitySwitch => ({ capability, state: "DISABLED", reason });

const foundationOnly = (
  capability: PartnerCapability,
  reason: string,
): CapabilitySwitch => ({ capability, state: "FOUNDATION_ONLY", reason });

export const syntheticPartnerOrganizations: readonly PartnerOrganization[] = [
  {
    partnerOrgId: "synthetic-partnerfi",
    partnerClass: "FINANCIAL_INSTITUTION",
    displayName: "Synthetic PartnerFI placeholder",
    environment: "synthetic",
    evidenceRefs: ["governance-partnerfi-boundary"],
    permittedDataClasses: ["SYNTHETIC_CUSTOMER_REFERENCE"],
    permittedRoutes: [],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["PARTNER_ADMIN"],
    credentialOwnerRole: "Future licensed PartnerFI",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      disabled(
        "PARTNERFI_ACCOUNT_LOOKUP",
        "No live PartnerFI connectivity is authorized.",
      ),
      disabled(
        "PARTNERFI_CASH_IN_AUTH",
        "No real cash-in authority is authorized.",
      ),
      disabled(
        "PARTNERFI_CASH_OUT_AUTH",
        "No real cash-out authority is authorized.",
      ),
    ],
  },
  {
    partnerOrgId: "synthetic-arifpay-sandbox",
    partnerClass: "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
    displayName: "ArifPay · Sandbox",
    environment: "sandbox",
    evidenceRefs: ["PR-5", "EV-2026-10-12-ARIFPAY-S2"],
    permittedDataClasses: ["SYNTHETIC_TRANSACTION_REFERENCE"],
    permittedRoutes: ["ARIFPAY_SANDBOX_C2B"],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["SUPERVISOR", "PARTNER_ADMIN", "OPERATIONS"],
    credentialOwnerRole: "Runtime sandbox secret owner",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      {
        capability: "ARIFPAY_C2B",
        state: "SANDBOX_BOUNDED",
        reason:
          "Bounded synthetic checkout and session-ID reconciliation are implemented; gateway evidence is not PartnerFI settlement.",
      },
      disabled(
        "ARIFPAY_B2C",
        "No bounded B2C implementation is authorized in the current baseline.",
      ),
      disabled(
        "ARIFPAY_W2B",
        "No bounded W2B implementation is authorized in the current baseline.",
      ),
    ],
  },
  {
    partnerOrgId: "synthetic-telebirr-direct",
    partnerClass: "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
    displayName: "Direct Telebirr · TestBed foundation",
    environment: "testbed",
    evidenceRefs: ["PR-6", "EV-2026-10-13-TELEBIRR-FOUNDATION"],
    permittedDataClasses: ["SYNTHETIC_PROVIDER_CONTRACT_REFERENCE"],
    permittedRoutes: ["TELEBIRR_DIRECT_TESTBED"],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["OPERATIONS"],
    credentialOwnerRole: "Future refreshed TestBed credential owner",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      foundationOnly(
        "TELEBIRR_DIRECT_C2B",
        "TestBed adapter foundation is registered and implemented, while direct C2B route activation remains gated by TLS trust, provider-contract and payment-evidence requirements.",
      ),
    ],
  },
  {
    partnerOrgId: "synthetic-mpesa-ethiopia",
    partnerClass: "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
    displayName: "Safaricom Ethiopia M-PESA · Sandbox foundation",
    environment: "sandbox",
    evidenceRefs: ["PR-7", "EV-2026-10-13-MPESA-TOKEN"],
    permittedDataClasses: ["SYNTHETIC_PROVIDER_CONTRACT_REFERENCE"],
    permittedRoutes: ["MPESA_ETHIOPIA_DIRECT_SANDBOX"],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["OPERATIONS"],
    credentialOwnerRole: "Runtime sandbox secret owner",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      foundationOnly(
        "MPESA_ETHIOPIA_DIRECT_C2B",
        "Ethiopia sandbox adapter/token foundation is registered and token authentication is verified; payment initiation, status and callback routes remain activation-gated.",
      ),
    ],
  },
  {
    partnerOrgId: "synthetic-telco",
    partnerClass: "TELCO_COMMUNICATIONS",
    displayName: "Synthetic communications partner",
    environment: "synthetic",
    evidenceRefs: ["stage-3-governance"],
    permittedDataClasses: ["SYNTHETIC_NOTIFICATION_REFERENCE"],
    permittedRoutes: [],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["OPERATIONS"],
    credentialOwnerRole: "Future communications credential owner",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      disabled("SMS_NOTIFICATION", "No live SMS/USSD channel is authorized."),
    ],
  },
  {
    partnerOrgId: "synthetic-identity",
    partnerClass: "IDENTITY_PROVIDER",
    displayName: "Synthetic identity-provider placeholder",
    environment: "synthetic",
    evidenceRefs: ["governance-identity-boundary"],
    permittedDataClasses: ["SYNTHETIC_IDENTITY_REFERENCE"],
    permittedRoutes: [],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["PARTNER_ADMIN"],
    credentialOwnerRole: "Future approved identity-provider credential owner",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      disabled(
        "IDENTITY_ONBOARDING",
        "No live identity-provider access is authorized.",
      ),
    ],
  },
  {
    partnerOrgId: "synthetic-fmcg",
    partnerClass: "FMCG_DISTRIBUTOR_MERCHANT",
    displayName: "Synthetic FMCG / distributor",
    environment: "synthetic",
    evidenceRefs: ["stage-3-governance"],
    permittedDataClasses: ["SYNTHETIC_INVENTORY_AGGREGATE"],
    permittedRoutes: [],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["OPERATIONS", "PARTNER_ADMIN"],
    credentialOwnerRole: "Future FMCG integration credential owner",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      disabled(
        "FMCG_ORDERING",
        "This foundation is read-only; no commercial order is sent.",
      ),
    ],
  },
  {
    partnerOrgId: "synthetic-cash-fleet",
    partnerClass: "CASH_LOGISTICS_FLEET",
    displayName: "Synthetic Cash Fleet / Mobile Liquidity Network",
    environment: "synthetic",
    evidenceRefs: ["stage-3-governance"],
    permittedDataClasses: ["SYNTHETIC_LIQUIDITY_FORECAST"],
    permittedRoutes: ["SYNTHETIC_ROUTE_PLANNING_ONLY"],
    permittedRegions: ["SYNTHETIC_ET"],
    authorizedRoles: ["SUPERVISOR", "OPERATIONS"],
    credentialOwnerRole: "Future authorized fleet operator",
    operationalContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    incidentContactRef: "NOT_STORED_IN_SYNTHETIC_FIXTURE",
    approvalEffectiveAt: null,
    approvalExpiresAt: null,
    capabilitySwitches: [
      {
        capability: "FLEET_ROUTE_PLANNING",
        state: "SIMULATION_ONLY",
        reason:
          "Stage 3 permits route planning simulation only; no custody or dispatch authority is implied.",
      },
      disabled("FLEET_DISPATCH", "Real dispatch is not authorized in Stage 3."),
      disabled(
        "FLEET_CASH_HANDOVER",
        "Real cash custody/handover is not authorized in Stage 3.",
      ),
    ],
  },
].map((organization) => PartnerOrganizationSchema.parse(organization));

export const syntheticRouteProvenance: readonly RouteProvenance[] = [
  {
    routeId: "synthetic-route-arifpay-c2b",
    serviceProvider: "ArifPay sandbox payment rail",
    integrationRoute: "ARIFPAY_SANDBOX_C2B",
    gatewayOperator: "ArifPay",
    state: "SANDBOX_BOUNDED",
    authorityBoundary:
      "Provider session/status evidence only; PartnerFI settlement remains separate.",
  },
  {
    routeId: "synthetic-route-telebirr-direct",
    serviceProvider: "Direct Telebirr TestBed",
    integrationRoute: "TELEBIRR_DIRECT_TESTBED",
    gatewayOperator: "Ethio telecom / Telebirr",
    state: "FOUNDATION_ONLY",
    authorityBoundary:
      "TestBed integration foundation is registered; direct payment route remains unmounted until remaining TLS/provider activation gates pass.",
  },
  {
    routeId: "synthetic-route-mpesa-ethiopia-direct",
    serviceProvider: "Safaricom Ethiopia M-PESA sandbox",
    integrationRoute: "MPESA_ETHIOPIA_DIRECT_SANDBOX",
    gatewayOperator: "Safaricom Ethiopia M-PESA",
    state: "FOUNDATION_ONLY",
    authorityBoundary:
      "Sandbox/token foundation is registered and token contract verified; payment/status/callback routes remain unmounted pending separate activation gates.",
  },
].map((route) => RouteProvenanceSchema.parse(route));

export function routeProvenanceLabel(route: RouteProvenance) {
  return `${route.serviceProvider} -> ${route.integrationRoute} -> ${route.gatewayOperator} -> Enawuga transaction`;
}

export function partnerEcosystemSummary(
  organizations: readonly PartnerOrganization[] = syntheticPartnerOrganizations,
) {
  const switches = organizations.flatMap(
    (organization) => organization.capabilitySwitches,
  );
  return {
    partnerOrganizations: organizations.length,
    sandboxBounded: switches.filter(
      (entry) => entry.state === "SANDBOX_BOUNDED",
    ).length,
    foundationOnly: switches.filter((entry) => entry.state === "FOUNDATION_ONLY")
      .length,
    simulationOnly: switches.filter((entry) => entry.state === "SIMULATION_ONLY")
      .length,
    disabled: switches.filter((entry) => entry.state === "DISABLED").length,
  } as const;
}
