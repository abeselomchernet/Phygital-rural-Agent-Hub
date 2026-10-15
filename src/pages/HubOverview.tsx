import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, Layers3, ShieldCheck, Waypoints } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import type { HubServiceWorkspaceManifest } from "../domain/hubServiceComposition";
import { loadHubServices } from "../lib/hub-client";
import "../components/portal-dashboard.css";
import "../components/governed-evidence.css";

function displaySyntheticId(value: string, prefix: string) {
  return value.replace(prefix, "").split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function errorMessage(code: string) {
  if (code === "HUB_ACCESS_DENIED") return "This role/workspace is not authorized to read the requested Hub service composition.";
  if (code === "WORKSPACE_SESSION_REQUIRED") return "The synthetic workspace session expired. Reload the workspace before reading Hub state.";
  return "Hub service evidence is unavailable. No service state is inferred from client-side defaults.";
}

export default function HubOverview() {
  const workspace = useCapabilityWorkspace();
  const [services, setServices] = useState<HubServiceWorkspaceManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    setLoading(true);
    setError(null);
    setServices(null);
    void loadHubServices(workspace.hubId)
      .then((next) => { if (active) setServices(next); })
      .catch((cause) => { if (active) setError(errorMessage(cause instanceof Error ? cause.message : "HUB_API_UNAVAILABLE")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const unavailableDecisions = useMemo(() => services?.decisionMatrix.filter((entry) => !entry.available) ?? [], [services]);

  if (!workspace) {
    return <section className="portal-page" aria-live="polite"><div className="portal-boundary-banner">Workspace context is unavailable. No Hub state is inferred from client-side defaults.</div></section>;
  }

  const hubLabel = displaySyntheticId(workspace.hubId, "hub_syn_");
  const regionLabel = displaySyntheticId(workspace.regionId, "region_syn_");

  return (
    <section className="portal-page" data-testid="hub-overview-page">
      <div className="hub-overview-hero">
        <span className="wl-kicker">Governed Hub context</span>
        <h1>{hubLabel} Hub</h1>
        <p>Shared operational context for {workspace.partnerDisplayName}. The service composition below is loaded from the authenticated Hub API; missing data remains unavailable rather than being fabricated.</p>
        <div className="hub-overview-chips" aria-label="Hub environment and authority state">
          <span className="wl-status-chip">Stage 4</span><span className="wl-status-chip">Synthetic</span><span className="wl-status-chip">{workspace.role.replaceAll("_", " ")}</span><span className="wl-status-chip">No production authority</span>
        </div>
      </div>

      <div className="portal-summary-grid" aria-label="Hub summary">
        <article className="portal-summary-card"><span>Partner context</span><strong>{workspace.partnerDisplayName}</strong></article>
        <article className="portal-summary-card"><span>Region</span><strong>{regionLabel}</strong></article>
        <article className="portal-summary-card"><span>Available services</span><strong>{loading ? "Loading" : services ? services.offerings.length : "UNAVAILABLE"}</strong></article>
        <article className="portal-summary-card"><span>Unavailable decisions</span><strong>{loading ? "Loading" : services ? unavailableDecisions.length : "UNAVAILABLE"}</strong></article>
      </div>

      <div className="hub-boundary-grid" aria-label="Authority boundaries">
        <article className="hub-boundary-card"><ShieldCheck size={20} aria-hidden="true" /><strong>UI is not authorization</strong><span>Navigation and visible modules cannot grant server-side capability.</span></article>
        <article className="hub-boundary-card"><Waypoints size={20} aria-hidden="true" /><strong>Provider success is not settlement</strong><span>Transport/provider evidence remains separate from financial finality.</span></article>
        <article className="hub-boundary-card"><Building2 size={20} aria-hidden="true" /><strong>Production authority not granted</strong><span>Wishland remains the technology/software/orchestration provider.</span></article>
      </div>

      <section className="hub-state-panel" aria-labelledby="service-composition-title">
        <span className="wl-kicker">Hub service composition</span>
        <h2 id="service-composition-title">Services & capabilities</h2>
        <p>Availability is derived from the current PartnerFI catalog, Hub binding, capability grant, route and adapter state.</p>
        {loading && <div className="hub-loading-grid" aria-label="Loading Hub service composition"><div className="hub-loading-block" /><div className="hub-loading-block" /></div>}
        {!loading && error && <div className="portal-boundary-banner" role="status"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Service evidence unavailable</strong>{error}</div></div>}
        {!loading && !error && services && services.offerings.length === 0 && <div className="portal-boundary-banner"><Layers3 size={20} aria-hidden="true" /><div><strong>No available services</strong>The authenticated Hub response contains no currently available offerings. This is not treated as an error or a successful capability grant.</div></div>}
        {!loading && !error && services && services.offerings.length > 0 && (
          <div className="service-composition-grid">
            {services.offerings.map((offering) => {
              const refs = [...new Set([offering.evidenceRefs, ...offering.capabilityBindings.map((binding) => binding.evidenceRefs)].flat())];
              return (
                <article className="service-composition-card" key={offering.offeringId} data-testid={`hub-service-${offering.serviceId}`}>
                  <div className="service-composition-meta"><GovernedStatus label={offering.actionState} /><GovernedStatus label={services.environment} /></div>
                  <h3>{offering.name}</h3>
                  <p>{offering.shortDescription}</p>
                  <div className="service-composition-meta">
                    {offering.capabilityBindings.map((binding) => <GovernedStatus key={binding.capabilityId} label={binding.capabilityId} />)}
                  </div>
                  <div className="service-composition-actions">
                    <span>{offering.capabilityBindings.length} capability binding{offering.capabilityBindings.length === 1 ? "" : "s"}</span>
                    <button type="button" onClick={() => setEvidence({ title: offering.name, classification: "SYNTHETIC", evidenceRefs: refs, schemaVersion: services.schemaVersion, limitation: "This evidence describes synthetic service composition and route/capability references only.", authorityImplication: "Availability in this manifest does not grant live provider, posting, settlement or production authority." })}>View evidence</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {!loading && services && unavailableDecisions.length > 0 && (
        <section className="hub-state-panel" aria-labelledby="unavailable-title">
          <span className="wl-kicker">Explicit non-availability</span><h2 id="unavailable-title">Unavailable configured services</h2>
          <p>These decisions stay explicit; absence is not converted into a zero, PASS or capability grant.</p>
          <div className="service-composition-grid">
            {unavailableDecisions.map((decision) => <article className="service-composition-card" key={decision.serviceId}><GovernedStatus label={decision.code} tone={toneForGovernedState(decision.code)} /><h3>{decision.serviceId}</h3><p>Configured: {decision.configured ? "yes" : "no"}. Available: no.</p></article>)}
          </div>
        </section>
      )}

      <div className="portal-action-grid" aria-label="Role-relevant Hub workspaces">
        <article className="portal-action-card"><span className="portal-action-card-icon"><Activity size={20} aria-hidden="true" /></span><h2>Next governed dashboards</h2><p>Economics and Pilot Evidence are the next frontend increment after this shared Hub/service/evidence foundation.</p><GovernedStatus label="FRONTEND_INTEGRATION_STAGED" tone="review" /></article>
        <article className="portal-action-card"><span className="portal-action-card-icon"><Layers3 size={20} aria-hidden="true" /></span><h2>Evidence pattern</h2><p>Service evidence now opens in a reusable drawer showing classification, references, limitations and authority implications.</p><GovernedStatus label="SYNTHETIC_EVIDENCE" /></article>
      </div>

      <div className="portal-boundary-banner"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Synthetic decision-support environment</strong>No live funds, settlement, geographic authorization, provider activation, regulated pilot approval or production execution is granted by this screen.</div></div>
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
