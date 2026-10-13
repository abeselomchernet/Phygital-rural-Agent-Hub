import {
  PartnerCapabilityContractSchema,
  PartnerCapabilityGrantSchema,
  PartnerCapabilityPrincipalSchema,
  PartnerResolvedRouteSchema,
  type PartnerCapabilityContract,
  type PartnerCapabilityGrant,
  type PartnerCapabilityPrincipal,
  type PartnerContractCapabilityId,
  type PartnerContractDataClass,
  type PartnerContractOfflinePolicy,
  type PartnerContractPartnerClass,
  type PartnerContractRole,
  type PartnerResolvedRoute,
} from "./partnerCapabilityContract";

export const SYNTHETIC_REGION_IDS = {
  ADAMA: "region_syn_adama",
  ARISI: "region_syn_arisi",
} as const;

export const SYNTHETIC_PARTNER_IDS = {
  PARTNERFI_ALPHA: "org_syn_partnerfi_alpha",
  PARTNERFI_BETA: "org_syn_partnerfi_beta",
  GATEWAY_GAMMA: "org_syn_gateway_gamma",
  MOBILE_MONEY_DELTA: "org_syn_mobile_delta",
  IDENTITY_EPSILON: "org_syn_identity_epsilon",
  FMCG_ZETA: "org_syn_fmcg_zeta",
  FLEET_ETA: "org_syn_fleet_eta",
  TELCO_THETA: "org_syn_telco_theta",
} as const;

export const SYNTHETIC_AGENT_GROUP_IDS = {
  ALPHA_AGENTS: "group_syn_alpha_agents",
  BETA_AGENTS: "group_syn_beta_agents",
} as const;

export const SYNTHETIC_OBJECT_IDS = {
  ALPHA_CUSTOMER: "obj_syn_alpha_customer_001",
  BETA_CUSTOMER: "obj_syn_beta_customer_001",
  GAMMA_PAYMENT: "obj_syn_gamma_payment_001",
  DELTA_PAYMENT: "obj_syn_delta_payment_001",
  EPSILON_IDENTITY: "obj_syn_epsilon_identity_001",
  ZETA_INVENTORY: "obj_syn_zeta_inventory_001",
  ETA_ROUTE: "obj_syn_eta_route_001",
  THETA_MESSAGE: "obj_syn_theta_message_001",
} as const;

export const SYNTHETIC_SERVICE_IDS = {
  ALPHA_ACCOUNT_LOOKUP: "svc_alpha_account_lookup",
  ALPHA_CASH_IN: "svc_alpha_cash_in",
  ALPHA_CASH_OUT: "svc_alpha_cash_out",
  ALPHA_NLC_READ: "svc_alpha_nlc_read",
  BETA_ACCOUNT_LOOKUP: "svc_beta_account_lookup",
  BETA_SAVINGS_INQUIRY: "svc_beta_savings_inquiry",
  BETA_SERVICE_REQUEST: "svc_beta_service_request",
  GAMMA_C2B: "svc_gamma_c2b",
  GAMMA_STATUS: "svc_gamma_status",
  DELTA_C2B: "svc_delta_c2b",
  DELTA_STATUS: "svc_delta_status",
  EPSILON_VERIFY: "svc_epsilon_verify",
  ZETA_CATALOG: "svc_zeta_catalog",
  ZETA_INVENTORY: "svc_zeta_inventory",
  ZETA_RESTOCK_DRAFT: "svc_zeta_restock_draft",
  ETA_ROUTE_PLAN: "svc_eta_route_plan",
  ETA_DISPATCH: "svc_eta_dispatch",
  ETA_CASH_HANDOVER: "svc_eta_cash_handover",
  THETA_SMS: "svc_theta_sms",
} as const;

export const SYNTHETIC_ROUTE_IDS = {
  ALPHA_CORE: "route_syn_partnerfi_alpha_core",
  BETA_CORE: "route_syn_partnerfi_beta_core",
  GAMMA_C2B: "route_syn_gateway_gamma_c2b",
  DELTA_DIRECT: "route_syn_mobile_delta_direct",
  EPSILON_IDENTITY: "route_syn_identity_epsilon",
  ZETA_FMCG: "route_syn_fmcg_zeta",
  ETA_FLEET: "route_syn_fleet_eta",
  THETA_COMMS: "route_syn_telco_theta",
} as const;

export const SYNTHETIC_ADAPTER_IDS = {
  ALPHA: "adapter_syn_partnerfi_alpha_v1",
  BETA: "adapter_syn_partnerfi_beta_v1",
  GAMMA: "adapter_syn_gateway_gamma_v1",
  DELTA: "adapter_syn_mobile_delta_v1",
  EPSILON: "adapter_syn_identity_epsilon_v1",
  ZETA: "adapter_syn_fmcg_zeta_v1",
  ETA: "adapter_syn_fleet_eta_v1",
  THETA: "adapter_syn_telco_theta_v1",
} as const;

const evidence = (name: string) => `EV-SYN-${name}-V1`;

function grant(input: {
  grantId: string;
  capabilityId: PartnerContractCapabilityId;
  state: "DISABLED" | "SIMULATION_ONLY";
  serviceIds: string[];
  roles: PartnerContractRole[];
  regions: string[];
  agentGroups?: string[];
  dataClasses?: PartnerContractDataClass[];
  routeId: string;
  offlinePolicy?: PartnerContractOfflinePolicy;
  evidenceRef: string;
}): PartnerCapabilityGrant {
  return PartnerCapabilityGrantSchema.parse({
    grantId: input.grantId,
    capabilityId: input.capabilityId,
    state: input.state,
    serviceIds: input.serviceIds,
    roles: input.roles,
    regions: input.regions,
    agentGroups: input.agentGroups ?? [],
    dataClasses: input.dataClasses ?? [],
    allowedRouteIds: [input.routeId],
    constraints: {
      currencies: [],
      maxAmountMinor: null,
      offlinePolicy: input.offlinePolicy ?? "LOCAL_SIMULATION_ONLY",
    },
    activation: {
      effectiveAt: null,
      expiresAt: null,
      evidenceRefs: [input.evidenceRef],
    },
  });
}

function contract(input: {
  partnerOrgId: string;
  partnerClass: PartnerContractPartnerClass;
  legalName: string;
  displayName: string;
  regions: string[];
  evidenceRef: string;
  grants: PartnerCapabilityGrant[];
}): PartnerCapabilityContract {
  return PartnerCapabilityContractSchema.parse({
    schemaVersion: 1,
    partnerOrgId: input.partnerOrgId,
    contractVersion: 1,
    partnerClass: input.partnerClass,
    legalName: input.legalName,
    displayName: input.displayName,
    environment: "synthetic",
    lifecycleState: "ACTIVE_SYNTHETIC",
    regions: input.regions,
    evidenceRefs: [input.evidenceRef],
    capabilityGrants: input.grants,
  });
}

function route(input: {
  routeId: string;
  adapterId: string;
  supportedCapabilityIds: PartnerContractCapabilityId[];
  evidenceRef: string;
}): PartnerResolvedRoute {
  return PartnerResolvedRouteSchema.parse({
    routeId: input.routeId,
    adapterId: input.adapterId,
    environment: "synthetic",
    registered: true,
    supportedCapabilityIds: input.supportedCapabilityIds,
    evidenceRefs: [input.evidenceRef],
  });
}

const alphaEvidence = evidence("ALPHA");
const betaEvidence = evidence("BETA");
const gammaEvidence = evidence("GAMMA");
const deltaEvidence = evidence("DELTA");
const epsilonEvidence = evidence("EPSILON");
const zetaEvidence = evidence("ZETA");
const etaEvidence = evidence("ETA");
const thetaEvidence = evidence("THETA");

export const SYNTHETIC_PARTNERFI_ALPHA = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
  partnerClass: "FINANCIAL_INSTITUTION",
  legalName: "Synthetic PartnerFI Alpha",
  displayName: "PartnerFI Alpha",
  regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
  evidenceRef: alphaEvidence,
  grants: [
    grant({
      grantId: "grant_syn_alpha_account_lookup",
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP],
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
      dataClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_REFERENCE"],
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      evidenceRef: alphaEvidence,
    }),
    grant({
      grantId: "grant_syn_alpha_cash_in",
      capabilityId: "FIN.CASH_IN_AUTHORIZE",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN],
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
      dataClasses: ["CUSTOMER_REFERENCE", "TRANSACTION_INTENT"],
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      offlinePolicy: "CAPTURE_INTENT_ONLY",
      evidenceRef: alphaEvidence,
    }),
    grant({
      grantId: "grant_syn_alpha_cash_out",
      capabilityId: "FIN.CASH_OUT_AUTHORIZE",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT],
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
      dataClasses: ["CUSTOMER_REFERENCE", "TRANSACTION_INTENT"],
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      offlinePolicy: "CAPTURE_INTENT_ONLY",
      evidenceRef: alphaEvidence,
    }),
    grant({
      grantId: "grant_syn_alpha_nlc_read",
      capabilityId: "LIQ.NLC_READ",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ],
      roles: ["SUPERVISOR"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["LIQUIDITY_AGGREGATE"],
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      evidenceRef: alphaEvidence,
    }),
  ],
});

export const SYNTHETIC_PARTNERFI_BETA = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
  partnerClass: "FINANCIAL_INSTITUTION",
  legalName: "Synthetic PartnerFI Beta",
  displayName: "PartnerFI Beta",
  regions: [SYNTHETIC_REGION_IDS.ADAMA],
  evidenceRef: betaEvidence,
  grants: [
    grant({
      grantId: "grant_syn_beta_account_lookup",
      capabilityId: "FIN.ACCOUNT_LOOKUP",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP],
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
      dataClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_REFERENCE"],
      routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      evidenceRef: betaEvidence,
    }),
    grant({
      grantId: "grant_syn_beta_savings_inquiry",
      capabilityId: "FIN.SAVINGS_INQUIRY",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY],
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
      dataClasses: ["CUSTOMER_REFERENCE", "PARTNER_ACCOUNT_SUMMARY"],
      routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      offlinePolicy: "READ_CACHED_REFERENCE_ONLY",
      evidenceRef: betaEvidence,
    }),
    grant({
      grantId: "grant_syn_beta_service_request",
      capabilityId: "FIN.SERVICE_REQUEST",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST],
      roles: ["AGENT"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      agentGroups: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
      dataClasses: ["CUSTOMER_REFERENCE", "TRANSACTION_INTENT"],
      routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      offlinePolicy: "CAPTURE_INTENT_ONLY",
      evidenceRef: betaEvidence,
    }),
  ],
});

export const SYNTHETIC_GATEWAY_GAMMA = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.GATEWAY_GAMMA,
  partnerClass: "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
  legalName: "Synthetic Gateway Gamma",
  displayName: "Gateway Gamma",
  regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
  evidenceRef: gammaEvidence,
  grants: [
    grant({
      grantId: "grant_syn_gamma_c2b",
      capabilityId: "PAY.C2B_CREATE",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.GAMMA_C2B],
      roles: ["OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["TRANSACTION_INTENT", "TRANSACTION_STATUS"],
      routeId: SYNTHETIC_ROUTE_IDS.GAMMA_C2B,
      evidenceRef: gammaEvidence,
    }),
    grant({
      grantId: "grant_syn_gamma_status",
      capabilityId: "PAY.STATUS_QUERY",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.GAMMA_STATUS],
      roles: ["OPERATIONS", "PARTNER_ADMIN"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["TRANSACTION_STATUS", "AUDIT_REFERENCE"],
      routeId: SYNTHETIC_ROUTE_IDS.GAMMA_C2B,
      evidenceRef: gammaEvidence,
    }),
  ],
});

export const SYNTHETIC_MOBILE_MONEY_DELTA = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.MOBILE_MONEY_DELTA,
  partnerClass: "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
  legalName: "Synthetic Mobile Money Delta",
  displayName: "Mobile Money Delta",
  regions: [SYNTHETIC_REGION_IDS.ADAMA],
  evidenceRef: deltaEvidence,
  grants: [
    grant({
      grantId: "grant_syn_delta_c2b_disabled",
      capabilityId: "PAY.C2B_CREATE",
      state: "DISABLED",
      serviceIds: [SYNTHETIC_SERVICE_IDS.DELTA_C2B],
      roles: ["OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      dataClasses: ["TRANSACTION_INTENT"],
      routeId: SYNTHETIC_ROUTE_IDS.DELTA_DIRECT,
      evidenceRef: deltaEvidence,
    }),
    grant({
      grantId: "grant_syn_delta_status",
      capabilityId: "PAY.STATUS_QUERY",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.DELTA_STATUS],
      roles: ["OPERATIONS", "PARTNER_ADMIN"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA],
      dataClasses: ["TRANSACTION_STATUS", "AUDIT_REFERENCE"],
      routeId: SYNTHETIC_ROUTE_IDS.DELTA_DIRECT,
      evidenceRef: deltaEvidence,
    }),
  ],
});

export const SYNTHETIC_IDENTITY_EPSILON = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.IDENTITY_EPSILON,
  partnerClass: "IDENTITY_PROVIDER",
  legalName: "Synthetic Identity Epsilon",
  displayName: "Identity Epsilon",
  regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
  evidenceRef: epsilonEvidence,
  grants: [
    grant({
      grantId: "grant_syn_epsilon_verify",
      capabilityId: "IDV.ONBOARD_VERIFY",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.EPSILON_VERIFY],
      roles: ["AGENT", "OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["CUSTOMER_REFERENCE", "IDENTITY_ATTESTATION_REFERENCE"],
      routeId: SYNTHETIC_ROUTE_IDS.EPSILON_IDENTITY,
      offlinePolicy: "DENY_OFFLINE",
      evidenceRef: epsilonEvidence,
    }),
  ],
});

export const SYNTHETIC_FMCG_ZETA = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.FMCG_ZETA,
  partnerClass: "FMCG_DISTRIBUTOR_MERCHANT",
  legalName: "Synthetic FMCG Zeta",
  displayName: "FMCG Zeta",
  regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
  evidenceRef: zetaEvidence,
  grants: [
    grant({
      grantId: "grant_syn_zeta_catalog",
      capabilityId: "FMCG.CATALOG_READ",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ZETA_CATALOG],
      roles: ["AGENT", "SUPERVISOR"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["INVENTORY_AGGREGATE"],
      routeId: SYNTHETIC_ROUTE_IDS.ZETA_FMCG,
      evidenceRef: zetaEvidence,
    }),
    grant({
      grantId: "grant_syn_zeta_inventory",
      capabilityId: "FMCG.INVENTORY_READ",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ZETA_INVENTORY],
      roles: ["AGENT", "SUPERVISOR", "OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["INVENTORY_AGGREGATE"],
      routeId: SYNTHETIC_ROUTE_IDS.ZETA_FMCG,
      evidenceRef: zetaEvidence,
    }),
    grant({
      grantId: "grant_syn_zeta_restock",
      capabilityId: "FMCG.RESTOCK_DRAFT",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ZETA_RESTOCK_DRAFT],
      roles: ["SUPERVISOR", "OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["INVENTORY_AGGREGATE", "RESTOCK_DRAFT", "ROUTE_PLAN"],
      routeId: SYNTHETIC_ROUTE_IDS.ZETA_FMCG,
      evidenceRef: zetaEvidence,
    }),
  ],
});

export const SYNTHETIC_FLEET_ETA = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.FLEET_ETA,
  partnerClass: "CASH_LOGISTICS_FLEET",
  legalName: "Synthetic Fleet Eta",
  displayName: "Fleet Eta",
  regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
  evidenceRef: etaEvidence,
  grants: [
    grant({
      grantId: "grant_syn_eta_route_plan",
      capabilityId: "FLEET.ROUTE_PLAN",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ETA_ROUTE_PLAN],
      roles: ["SUPERVISOR", "OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["LIQUIDITY_AGGREGATE", "ROUTE_PLAN"],
      routeId: SYNTHETIC_ROUTE_IDS.ETA_FLEET,
      evidenceRef: etaEvidence,
    }),
    grant({
      grantId: "grant_syn_eta_dispatch_disabled",
      capabilityId: "FLEET.DISPATCH",
      state: "DISABLED",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ETA_DISPATCH],
      roles: ["SUPERVISOR", "OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["ROUTE_PLAN"],
      routeId: SYNTHETIC_ROUTE_IDS.ETA_FLEET,
      evidenceRef: etaEvidence,
    }),
    grant({
      grantId: "grant_syn_eta_handover_disabled",
      capabilityId: "FLEET.CASH_HANDOVER",
      state: "DISABLED",
      serviceIds: [SYNTHETIC_SERVICE_IDS.ETA_CASH_HANDOVER],
      roles: ["SUPERVISOR", "OPERATIONS"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["ROUTE_PLAN", "AUDIT_REFERENCE"],
      routeId: SYNTHETIC_ROUTE_IDS.ETA_FLEET,
      evidenceRef: etaEvidence,
    }),
  ],
});

export const SYNTHETIC_TELCO_THETA = contract({
  partnerOrgId: SYNTHETIC_PARTNER_IDS.TELCO_THETA,
  partnerClass: "TELCO_COMMUNICATIONS",
  legalName: "Synthetic Telco Theta",
  displayName: "Telco Theta",
  regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
  evidenceRef: thetaEvidence,
  grants: [
    grant({
      grantId: "grant_syn_theta_sms",
      capabilityId: "COMMS.SMS_SEND",
      state: "SIMULATION_ONLY",
      serviceIds: [SYNTHETIC_SERVICE_IDS.THETA_SMS],
      roles: ["OPERATIONS", "PARTNER_ADMIN"],
      regions: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
      dataClasses: ["CUSTOMER_CONTACT_REFERENCE", "AUDIT_REFERENCE"],
      routeId: SYNTHETIC_ROUTE_IDS.THETA_COMMS,
      offlinePolicy: "DENY_OFFLINE",
      evidenceRef: thetaEvidence,
    }),
  ],
});

export const SYNTHETIC_REFERENCE_ROUTES = {
  [SYNTHETIC_ROUTE_IDS.ALPHA_CORE]: route({
    routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
    supportedCapabilityIds: [
      "FIN.ACCOUNT_LOOKUP",
      "FIN.CASH_IN_AUTHORIZE",
      "FIN.CASH_OUT_AUTHORIZE",
      "LIQ.NLC_READ",
    ],
    evidenceRef: alphaEvidence,
  }),
  [SYNTHETIC_ROUTE_IDS.BETA_CORE]: route({
    routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
    supportedCapabilityIds: [
      "FIN.ACCOUNT_LOOKUP",
      "FIN.SAVINGS_INQUIRY",
      "FIN.SERVICE_REQUEST",
    ],
    evidenceRef: betaEvidence,
  }),
  [SYNTHETIC_ROUTE_IDS.GAMMA_C2B]: route({
    routeId: SYNTHETIC_ROUTE_IDS.GAMMA_C2B,
    adapterId: SYNTHETIC_ADAPTER_IDS.GAMMA,
    supportedCapabilityIds: ["PAY.C2B_CREATE", "PAY.STATUS_QUERY"],
    evidenceRef: gammaEvidence,
  }),
  [SYNTHETIC_ROUTE_IDS.DELTA_DIRECT]: route({
    routeId: SYNTHETIC_ROUTE_IDS.DELTA_DIRECT,
    adapterId: SYNTHETIC_ADAPTER_IDS.DELTA,
    supportedCapabilityIds: ["PAY.C2B_CREATE", "PAY.STATUS_QUERY"],
    evidenceRef: deltaEvidence,
  }),
  [SYNTHETIC_ROUTE_IDS.EPSILON_IDENTITY]: route({
    routeId: SYNTHETIC_ROUTE_IDS.EPSILON_IDENTITY,
    adapterId: SYNTHETIC_ADAPTER_IDS.EPSILON,
    supportedCapabilityIds: ["IDV.ONBOARD_VERIFY"],
    evidenceRef: epsilonEvidence,
  }),
  [SYNTHETIC_ROUTE_IDS.ZETA_FMCG]: route({
    routeId: SYNTHETIC_ROUTE_IDS.ZETA_FMCG,
    adapterId: SYNTHETIC_ADAPTER_IDS.ZETA,
    supportedCapabilityIds: [
      "FMCG.CATALOG_READ",
      "FMCG.INVENTORY_READ",
      "FMCG.RESTOCK_DRAFT",
    ],
    evidenceRef: zetaEvidence,
  }),
  [SYNTHETIC_ROUTE_IDS.ETA_FLEET]: route({
    routeId: SYNTHETIC_ROUTE_IDS.ETA_FLEET,
    adapterId: SYNTHETIC_ADAPTER_IDS.ETA,
    supportedCapabilityIds: [
      "FLEET.ROUTE_PLAN",
      "FLEET.DISPATCH",
      "FLEET.CASH_HANDOVER",
    ],
    evidenceRef: etaEvidence,
  }),
  [SYNTHETIC_ROUTE_IDS.THETA_COMMS]: route({
    routeId: SYNTHETIC_ROUTE_IDS.THETA_COMMS,
    adapterId: SYNTHETIC_ADAPTER_IDS.THETA,
    supportedCapabilityIds: ["COMMS.SMS_SEND"],
    evidenceRef: thetaEvidence,
  }),
} as const satisfies Record<string, PartnerResolvedRoute>;

export const SYNTHETIC_REFERENCE_PARTNERS = [
  SYNTHETIC_PARTNERFI_ALPHA,
  SYNTHETIC_PARTNERFI_BETA,
  SYNTHETIC_GATEWAY_GAMMA,
  SYNTHETIC_MOBILE_MONEY_DELTA,
  SYNTHETIC_IDENTITY_EPSILON,
  SYNTHETIC_FMCG_ZETA,
  SYNTHETIC_FLEET_ETA,
  SYNTHETIC_TELCO_THETA,
] as const;

function principal(input: PartnerCapabilityPrincipal): PartnerCapabilityPrincipal {
  return PartnerCapabilityPrincipalSchema.parse(input);
}

export const SYNTHETIC_REFERENCE_PRINCIPALS = {
  alphaAgentAdama: principal({
    userId: "agent_syn_alpha_01",
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    roleAssignments: [
      { partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA, role: "AGENT" },
    ],
    regionIds: [SYNTHETIC_REGION_IDS.ADAMA],
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    serviceScopes: [
      SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    ],
    objectScopes: [SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER],
  }),
  alphaAgentArisi: principal({
    userId: "agent_syn_alpha_02",
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    roleAssignments: [
      { partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA, role: "AGENT" },
    ],
    regionIds: [SYNTHETIC_REGION_IDS.ARISI],
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    serviceScopes: [
      SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
      SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
    ],
    objectScopes: [SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER],
  }),
  betaAgentAdama: principal({
    userId: "agent_syn_beta_01",
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA],
    roleAssignments: [
      { partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA, role: "AGENT" },
    ],
    regionIds: [SYNTHETIC_REGION_IDS.ADAMA],
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.BETA_AGENTS],
    serviceScopes: [
      SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
      SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
      SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
    ],
    objectScopes: [SYNTHETIC_OBJECT_IDS.BETA_CUSTOMER],
  }),
  alphaSupervisor: principal({
    userId: "supervisor_syn_alpha_01",
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    roleAssignments: [
      {
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        role: "SUPERVISOR",
      },
    ],
    regionIds: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
    agentGroupIds: [],
    serviceScopes: [SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ],
    objectScopes: [],
  }),
} as const satisfies Record<string, PartnerCapabilityPrincipal>;

export function getSyntheticReferencePartner(partnerOrgId: string) {
  return SYNTHETIC_REFERENCE_PARTNERS.find(
    (partner) => partner.partnerOrgId === partnerOrgId,
  );
}

export function getSyntheticReferenceRoute(routeId: string) {
  return SYNTHETIC_REFERENCE_ROUTES[routeId as keyof typeof SYNTHETIC_REFERENCE_ROUTES];
}
