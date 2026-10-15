import { Link } from "react-router-dom";
import {
  Activity,
  Building2,
  Layers3,
  MapPinned,
  ShieldCheck,
  Waypoints,
} from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import "../components/portal-dashboard.css";

function displaySyntheticId(value: string, prefix: string) {
  return value
    .replace(prefix, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function HubOverview() {
  const workspace = useCapabilityWorkspace();

  if (!workspace) {
    return (
      <section className="portal-page" aria-live="polite">
        <div className="portal-boundary-banner">
          Workspace context is unavailable. No Hub state is inferred from client-side defaults.
        </div>
      </section>
    );
  }

  const hubLabel = displaySyntheticId(workspace.hubId, "hub_syn_");
  const regionLabel = displaySyntheticId(workspace.regionId, "region_syn_");
  const isManagementRole = workspace.role !== "AGENT";

  return (
    <section className="portal-page" data-testid="hub-overview-page">
      <div className="hub-overview-hero">
        <span className="wl-kicker">Governed Hub context</span>
        <h1>{hubLabel} Hub</h1>
        <p>
          Shared operational context for {workspace.partnerDisplayName}. This view reflects the authenticated synthetic workspace and does not create provider, settlement, geographic or production authority.
        </p>
        <div className="hub-overview-chips" aria-label="Hub environment and authority state">
          <span className="wl-status-chip">Stage 4</span>
          <span className="wl-status-chip">Synthetic</span>
          <span className="wl-status-chip">{workspace.role.replaceAll("_", " ")}</span>
          <span className="wl-status-chip">No production authority</span>
        </div>
      </div>

      <div className="portal-summary-grid" aria-label="Hub summary">
        <article className="portal-summary-card">
          <span>Partner context</span>
          <strong>{workspace.partnerDisplayName}</strong>
        </article>
        <article className="portal-summary-card">
          <span>Region</span>
          <strong>{regionLabel}</strong>
        </article>
        <article className="portal-summary-card">
          <span>Published services</span>
          <strong>{workspace.services.length}</strong>
        </article>
        <article className="portal-summary-card">
          <span>Environment</span>
          <strong>{workspace.environment.toUpperCase()}</strong>
        </article>
      </div>

      <div className="hub-boundary-grid" aria-label="Authority boundaries">
        <article className="hub-boundary-card">
          <ShieldCheck size={20} aria-hidden="true" />
          <strong>UI is not authorization</strong>
          <span>Navigation and visible modules cannot grant server-side capability.</span>
        </article>
        <article className="hub-boundary-card">
          <Waypoints size={20} aria-hidden="true" />
          <strong>Provider success is not settlement</strong>
          <span>Transport/provider evidence remains separate from financial finality.</span>
        </article>
        <article className="hub-boundary-card">
          <Building2 size={20} aria-hidden="true" />
          <strong>Production authority not granted</strong>
          <span>Wishland remains the technology/software/orchestration provider.</span>
        </article>
      </div>

      {isManagementRole && (
        <div className="portal-action-grid" aria-label="Role-relevant Hub workspaces">
          <article className="portal-action-card">
            <span className="portal-action-card-icon"><Layers3 size={20} aria-hidden="true" /></span>
            <h2>Service composition</h2>
            <p>Review services published to this governed partner/role context. Capability visibility remains policy-derived.</p>
            <Link to="/partners" className="text-link">Review partner/service context</Link>
          </article>
          <article className="portal-action-card">
            <span className="portal-action-card-icon"><Activity size={20} aria-hidden="true" /></span>
            <h2>{workspace.role === "SUPERVISOR" ? "Regional operations" : "Operations evidence"}</h2>
            <p>{workspace.role === "SUPERVISOR" ? "Open the bounded regional operations view for planning and exception visibility." : "Open provider, reconciliation and operational evidence without settlement authority."}</p>
            <Link to={workspace.role === "SUPERVISOR" ? "/supervisor" : "/operations"} className="text-link">Open workspace</Link>
          </article>
          <article className="portal-action-card">
            <span className="portal-action-card-icon"><MapPinned size={20} aria-hidden="true" /></span>
            <h2>Hub evidence roadmap</h2>
            <p>Economics, pilot evidence, corridor planning, readiness and neutrality will be surfaced here from the existing governed read APIs.</p>
            <span className="wl-status-chip" data-tone="review">Frontend integration staged</span>
          </article>
        </div>
      )}

      <div className="portal-boundary-banner">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>Synthetic decision-support environment</strong>
          No live funds, settlement, geographic authorization, provider activation, regulated pilot approval or production execution is granted by this screen.
        </div>
      </div>
    </section>
  );
}
