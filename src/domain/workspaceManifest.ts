import { z } from "zod";

import { HubIdSchema } from "./hub";
import {
  PartnerContractEnvironmentSchema,
  PartnerContractRoleSchema,
  PartnerOrgIdSchema,
  type PartnerContractRole,
} from "./partnerCapabilityContract";
import {
  PartnerServiceManifestSchema,
  type PartnerServiceManifest,
} from "./partnerServiceCatalog";
import type {
  PartnerAdapterRegistration,
  PartnerRouteRegistration,
} from "./adapterRegistry";

const SafeTextSchema = z
  .string()
  .min(1)
  .max(180)
  .refine((value) => !/[<>]/.test(value), "HTML-like markup is not allowed");

export const WorkspaceNavigationItemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: SafeTextSchema.max(80),
    path: z.string().regex(/^\/[a-z0-9\-/:]*$/),
  })
  .strict();

export const WorkspaceNavigationGroupSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: SafeTextSchema.max(80),
    items: z.array(WorkspaceNavigationItemSchema).max(16),
  })
  .strict();

export const WorkspaceProviderStateSchema = z
  .object({
    providerKey: z.string().min(2).max(64),
    environment: PartnerContractEnvironmentSchema,
    registrationState: z.string().min(3).max(64),
    runtimeMode: z.enum(["FOUNDATION_ONLY", "EXECUTABLE"]),
    routeState: z.enum(["NOT_MOUNTED", "BOUNDED_ROUTE_AVAILABLE"]),
    displayState: z.enum([
      "Implemented · Synthetic data",
      "Sandbox integrated",
      "TestBed integrated",
      "Foundation implemented · route activation gated",
      "Partner authorization required",
      "Suspended",
    ]),
  })
  .strict();

export const WorkspaceManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    partnerOrgId: PartnerOrgIdSchema,
    partnerDisplayName: SafeTextSchema.max(120),
    hubId: HubIdSchema,
    role: PartnerContractRoleSchema,
    environment: PartnerContractEnvironmentSchema,
    regionId: z.string().min(3).max(96),
    navigation: z.array(WorkspaceNavigationGroupSchema).max(8),
    services: PartnerServiceManifestSchema.shape.services,
    providerStates: z.array(WorkspaceProviderStateSchema).max(32),
    boundaries: z
      .object({
        uiIsAuthorization: z.literal(false),
        providerSuccessIsSettlement: z.literal(false),
        productionAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();

export type WorkspaceManifest = z.infer<typeof WorkspaceManifestSchema>;
export type WorkspaceProviderState = z.infer<typeof WorkspaceProviderStateSchema>;

type SupportedWorkspaceRole = Extract<
  PartnerContractRole,
  "AGENT" | "SUPERVISOR" | "OPERATIONS" | "PARTNER_ADMIN"
>;

type NavigationGroup = z.infer<typeof WorkspaceNavigationGroupSchema>;

const home = { id: "home", label: "Home", path: "/" } as const;

function navigationForRole(input: {
  role: SupportedWorkspaceRole;
  serviceManifest: PartnerServiceManifest;
  providerStates: readonly WorkspaceProviderState[];
}): NavigationGroup[] {
  if (input.role === "AGENT") {
    return [
      {
        id: "field-workflows",
        label: "Field workflows",
        items: [
          home,
          { id: "agent-terminal", label: "Agent Terminal", path: "/kiosk" },
          { id: "farmer-360", label: "Farmer 360", path: "/farmer-360" },
          { id: "requests", label: "Requests & offline queue", path: "/queue" },
          { id: "readiness", label: "Agent readiness", path: "/onboard" },
          { id: "learning", label: "Agent learning", path: "/academy" },
        ],
      },
      {
        id: "field-tools",
        label: "Field tools",
        items: [
          { id: "data-mule", label: "Data Mule", path: "/data-mule" },
          { id: "conversation", label: "Conversation", path: "/transcription" },
        ],
      },
    ];
  }

  if (input.role === "SUPERVISOR") {
    const serviceTypes = new Set(
      input.serviceManifest.services.map((service) => service.serviceType),
    );
    const items: NavigationGroup["items"] = [
      home,
      { id: "hub-overview", label: "Hub Overview", path: "/hub" },
      { id: "hub-economics", label: "Hub Economics", path: "/hub/economics" },
      { id: "pilot-evidence", label: "Pilot Evidence", path: "/hub/pilot-evidence" },
      { id: "corridor-planning", label: "Corridor Planning", path: "/hub/corridor-planning" },
      { id: "operator-device-readiness", label: "Operator & Device Readiness", path: "/hub/readiness" },
      { id: "supervisor", label: "Regional overview", path: "/supervisor" },
      { id: "network-access", label: "Network access", path: "/network-operations" },
    ];
    if (serviceTypes.has("NETWORK_LIQUIDITY_READ"))
      items.push({
        id: "network-liquidity",
        label: "Network Liquidity",
        path: "/liquidity",
      });
    if (serviceTypes.has("FLEET_ROUTE_PLANNING"))
      items.push({ id: "cash-fleet", label: "Cash Fleet", path: "/cash-fleet" });
    if (
      [...serviceTypes].some((serviceType) => serviceType.startsWith("FMCG_"))
    )
      items.push({ id: "fmcg", label: "FMCG", path: "/fmcg" });

    return [
      { id: "regional-operations", label: "Regional operations", items },
      {
        id: "evidence",
        label: "Evidence",
        items: [
          { id: "partners", label: "Partner status", path: "/partners" },
          { id: "architecture", label: "Demo architecture", path: "/node-status" },
        ],
      },
    ];
  }

  if (input.role === "OPERATIONS") {
    const items: NavigationGroup["items"] = [
      home,
      { id: "hub-overview", label: "Hub Overview", path: "/hub" },
      { id: "hub-economics", label: "Hub Economics", path: "/hub/economics" },
      { id: "pilot-evidence", label: "Pilot Evidence", path: "/hub/pilot-evidence" },
      { id: "corridor-planning", label: "Corridor Planning", path: "/hub/corridor-planning" },
      { id: "operator-device-readiness", label: "Operator & Device Readiness", path: "/hub/readiness" },
      { id: "operations-center", label: "Operations Center", path: "/operations" },
      { id: "network-access", label: "Network access", path: "/network-operations" },
      { id: "queue", label: "Offline exceptions", path: "/queue" },
    ];
    if (input.providerStates.length > 0)
      items.splice(3, 0, {
        id: "partners",
        label: "Provider & partner status",
        path: "/partners",
      });
    return [
      { id: "operations", label: "Operations & reconciliation", items },
      {
        id: "evidence",
        label: "Evidence",
        items: [
          { id: "architecture", label: "Demo architecture", path: "/node-status" },
        ],
      },
    ];
  }

  return [
    {
      id: "partner-administration",
      label: "Partner administration",
      items: [
        home,
        { id: "hub-overview", label: "Hub Overview", path: "/hub" },
        { id: "hub-economics", label: "Hub Economics", path: "/hub/economics" },
        { id: "pilot-evidence", label: "Pilot Evidence", path: "/hub/pilot-evidence" },
      { id: "corridor-planning", label: "Corridor Planning", path: "/hub/corridor-planning" },
      { id: "operator-device-readiness", label: "Operator & Device Readiness", path: "/hub/readiness" },
        { id: "partners", label: "Partner Ecosystem", path: "/partners" },
        { id: "network-access", label: "Access & scopes", path: "/network-operations" },
        { id: "operations-center", label: "Operations evidence", path: "/operations" },
      ],
    },
    {
      id: "evidence",
      label: "Evidence & architecture",
      items: [
        { id: "architecture", label: "Demo architecture", path: "/node-status" },
      ],
    },
  ];
}

function isBoundedRoute(route: PartnerRouteRegistration) {
  return ["SYNTHETIC_BOUNDED", "SANDBOX_BOUNDED", "TESTBED_BOUNDED"].includes(
    route.status,
  );
}

export function buildWorkspaceProviderStates(input: {
  role: PartnerContractRole;
  adapters: readonly PartnerAdapterRegistration[];
  routes: readonly PartnerRouteRegistration[];
}): WorkspaceProviderState[] {
  if (input.role !== "OPERATIONS" && input.role !== "PARTNER_ADMIN") return [];

  return input.adapters
    .filter((adapter) =>
      ["ARIFPAY", "TELEBIRR_DIRECT", "MPESA_ETHIOPIA_DIRECT"].includes(
        adapter.providerKey,
      ),
    )
    .map((adapter) => {
      const routeAvailable = input.routes.some(
        (route) => route.adapterId === adapter.adapterId && isBoundedRoute(route),
      );
      let displayState: WorkspaceProviderState["displayState"];
      if (adapter.status === "SUSPENDED") displayState = "Suspended";
      else if (adapter.runtimeMode === "FOUNDATION_ONLY")
        displayState = "Foundation implemented · route activation gated";
      else if (adapter.environment === "sandbox" && routeAvailable)
        displayState = "Sandbox integrated";
      else if (adapter.environment === "testbed" && routeAvailable)
        displayState = "TestBed integrated";
      else if (adapter.environment === "synthetic" && routeAvailable)
        displayState = "Implemented · Synthetic data";
      else displayState = "Partner authorization required";

      return WorkspaceProviderStateSchema.parse({
        providerKey: adapter.providerKey,
        environment: adapter.environment,
        registrationState: adapter.status,
        runtimeMode: adapter.runtimeMode,
        routeState: routeAvailable ? "BOUNDED_ROUTE_AVAILABLE" : "NOT_MOUNTED",
        displayState,
      });
    });
}

export function generateWorkspaceManifest(input: {
  partnerOrgId: string;
  partnerDisplayName: string;
  hubId: string;
  role: SupportedWorkspaceRole;
  environment: "synthetic" | "sandbox" | "testbed";
  regionId: string;
  serviceManifest: PartnerServiceManifest;
  providerStates?: readonly WorkspaceProviderState[];
}): WorkspaceManifest {
  if (input.serviceManifest.partnerOrgId !== input.partnerOrgId)
    throw new Error("WORKSPACE_SERVICE_PARTNER_MISMATCH");
  if (input.serviceManifest.role !== input.role)
    throw new Error("WORKSPACE_SERVICE_ROLE_MISMATCH");
  if (input.serviceManifest.regionId !== input.regionId)
    throw new Error("WORKSPACE_SERVICE_REGION_MISMATCH");

  const providerStates = [...(input.providerStates ?? [])];
  return WorkspaceManifestSchema.parse({
    schemaVersion: 1,
    partnerOrgId: input.partnerOrgId,
    partnerDisplayName: input.partnerDisplayName,
    hubId: input.hubId,
    role: input.role,
    environment: input.environment,
    regionId: input.regionId,
    navigation: navigationForRole({
      role: input.role,
      serviceManifest: input.serviceManifest,
      providerStates,
    }),
    services: input.serviceManifest.services,
    providerStates,
    boundaries: {
      uiIsAuthorization: false,
      providerSuccessIsSettlement: false,
      productionAuthorityGranted: false,
    },
  });
}
