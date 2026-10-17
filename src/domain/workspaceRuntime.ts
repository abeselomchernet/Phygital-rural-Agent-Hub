import type { WorkspaceManifest } from "./workspaceManifest";

export type WorkspaceRuntimeState =
  | {
      status:
        | "LOADING"
        | "SESSION_REQUIRED"
        | "ACCESS_DENIED"
        | "BACKEND_UNAVAILABLE"
        | "STATIC_SHOWCASE";
    }
  | { status: "FUNCTIONAL_WORKSPACE"; manifest: WorkspaceManifest };

export function initialWorkspaceRuntime(mode: unknown): WorkspaceRuntimeState {
  return { status: mode === "static-showcase" ? "STATIC_SHOWCASE" : "LOADING" };
}

export function workspaceFailure(cause: unknown): WorkspaceRuntimeState {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "WORKSPACE_SESSION_REQUIRED") return { status: "SESSION_REQUIRED" };
  if (
    code === "WORKSPACE_ACCESS_DENIED" ||
    code === "PRIVILEGED_SYNTHETIC_ROLE_DISABLED"
  )
    return { status: "ACCESS_DENIED" };
  return { status: "BACKEND_UNAVAILABLE" };
}

export type ShowcaseArchitectureStatus =
  | "CURRENT_IMPLEMENTED"
  | "TARGET_STAGE4_INTERNAL"
  | "FUTURE_EXTERNAL_DEPENDENT"
  | "RESEARCH_EXTERNAL_REVIEW_REQUIRED";

// Presentation metadata only: no scopes, services, routes, counts or principals.
export const currentShowcaseRoles = [
  {
    role: "AGENT",
    status: "CURRENT_IMPLEMENTED",
    title: "Agent",
    description: "Field customer assistance and local request concepts.",
  },
  {
    role: "SUPERVISOR",
    status: "CURRENT_IMPLEMENTED",
    title: "Supervisor",
    description: "Hub oversight and non-binding decision support.",
  },
  {
    role: "OPERATIONS",
    status: "CURRENT_IMPLEMENTED",
    title: "Operations",
    description: "Exceptions, reconciliation evidence and review concepts.",
  },
  {
    role: "PARTNER_ADMIN",
    status: "CURRENT_IMPLEMENTED",
    title: "Partner Admin",
    description: "Institution-scoped catalog and governance visibility.",
  },
] as const satisfies readonly {
  role: WorkspaceManifest["role"];
  status: "CURRENT_IMPLEMENTED";
  title: string;
  description: string;
}[];

export const targetShowcaseRoles = [
  {
    role: "PARTNERFI_REVIEWER",
    status: "TARGET_STAGE4_INTERNAL",
    title: "PartnerFI Reviewer",
    description:
      "Target PPID-scoped decision-support review surface. PartnerFI remains the decision authority.",
  },
  {
    role: "AUDITOR",
    status: "TARGET_STAGE4_INTERNAL",
    title: "Auditor",
    description:
      "Target independent assurance projection with governed evidence and no default PII entitlement.",
  },
  {
    role: "PILOT_REVIEWER",
    status: "TARGET_STAGE4_INTERNAL",
    title: "Pilot Reviewer",
    description:
      "Target aggregate pilot-gate evaluation surface without individual farmer access.",
  },
] as const;

export const showcaseCapabilityGroups = [
  {
    status: "CURRENT_IMPLEMENTED",
    title: "Current bounded capability foundations",
    items: [
      "Farmer 360 bounded projection",
      "Evidence Explorer foundation",
      "Human Review read-model foundation",
      "Operations and reconciliation evidence",
      "Offline / GhostSync / Data Mule",
      "Pilot Evidence, Corridor, Readiness and Neutrality",
      "Bounded FMCG / commerce planning",
      "ARDI synthetic transparency surface",
    ],
  },
  {
    status: "TARGET_STAGE4_INTERNAL",
    title: "Accepted Stage-4 target architecture",
    items: [
      "Seven-role projections with scoped authorization",
      "Full Human Review lifecycle and append-only review evidence",
      "Farmer 360 longitudinal read model and invalidation",
      "PAYG productive-asset evidence seam",
      "Climate / insurance evidence seam",
      "eKUB evidence seam — prohibited from ARDI and credit decision-support",
      "Recipient-scoped external evidence package architecture",
    ],
  },
  {
    status: "FUTURE_EXTERNAL_DEPENDENT",
    title: "Future external activation dependencies",
    items: [
      "PartnerFI reviewer federation and bilateral partner access",
      "Live PAYG / supplier / insurer provider integrations",
      "External package recipient profiles and institutional acceptance",
      "ET-resident production infrastructure and key custody",
    ],
  },
  {
    status: "RESEARCH_EXTERNAL_REVIEW_REQUIRED",
    title: "Research / external review still required",
    items: [
      "Human/local-speaker and legally appropriate financial wording review",
      "Privacy/legal basis and external assurance review",
      "ARDI fairness methodology and independent evaluation",
      "Regulator-facing requirements not yet verified",
    ],
  },
] as const satisfies readonly {
  status: ShowcaseArchitectureStatus;
  title: string;
  items: readonly string[];
}[];
