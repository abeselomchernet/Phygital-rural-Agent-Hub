import { useEffect, useState } from "react";
import { Calculator, ShieldCheck } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import BoundedState from "../components/BoundedState";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus } from "../components/GovernedStatus";
import type { HubEconomicsReadModel } from "../domain/hubEconomics";
import { loadHubEconomics } from "../lib/hub-client";
import "../components/hub-decision-dashboards.css";

const money = (minor: number, currency = "ETB") => `${currency} ${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const serviceLabel = (id: string) => id.replace(/^svc_/, "").replaceAll("_", " ");

function apiError(code: string) {
  if (code === "HUB_ACCESS_DENIED") return "This role/workspace is not authorized to read Hub Economics.";
  if (code === "WORKSPACE_SESSION_REQUIRED") return "The synthetic workspace session expired. Reload before reading Hub Economics.";
  return "Hub Economics is unavailable. No modeled or observed values are inferred by the client.";
}

export default function HubEconomics() {
  const workspace = useCapabilityWorkspace();
  const [models, setModels] = useState<readonly HubEconomicsReadModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true; setLoading(true); setError(null); setModels([]);
    void loadHubEconomics(workspace.hubId).then((next) => { if (active) setModels(next); }).catch((cause) => { if (active) setError(apiError(cause instanceof Error ? cause.message : "HUB_API_UNAVAILABLE")); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const model = models[0] ?? null;
  if (!workspace) return <section className="decision-page"><BoundedState kind="unavailable" title="Workspace unavailable">No Hub Economics state is inferred.</BoundedState></section>;

  return (
    <section className="decision-page" data-testid="hub-economics-page">
      <header className="decision-hero">
        <span className="wl-kicker">Hub Economics / Stage 4</span>
        <h1>Modeled Hub economics</h1>
        <p>Transparent synthetic assumptions and deterministic model outputs for the active governed Hub/PartnerFI context. These values are not accounting records, observed pilot performance or forecast validation.</p>
        <div className="decision-hero-actions"><GovernedStatus label="MODEL_ASSUMPTION" /><GovernedStatus label="MODEL_OUTPUT" /><GovernedStatus label="SYNTHETIC_MODEL_ONLY" /></div>
      </header>

      {loading && <BoundedState kind="loading" title="Loading modeled economics">Waiting for the authenticated Hub Economics read model.</BoundedState>}
      {!loading && error && <BoundedState kind="error" title="Economics unavailable">{error}</BoundedState>}
      {!loading && !error && !model && <BoundedState kind="empty" title="No economics model returned">The server returned no scoped economics model. This is not converted into zero revenue, zero cost or zero margin.</BoundedState>}

      {model && (
        <>
          <div className="decision-metrics" aria-label="Modeled economics summary">
            <article className="decision-metric"><span>Modeled revenue</span><strong>{money(model.totals.modeledRevenueMinor)}</strong></article>
            <article className="decision-metric"><span>Modeled total cost</span><strong>{money(model.totals.modeledTotalCostMinor)}</strong></article>
            <article className="decision-metric"><span>Modeled margin</span><strong>{money(model.totals.modeledMarginMinor)}</strong></article>
            <article className="decision-metric"><span>Observed variance</span><strong>UNAVAILABLE</strong></article>
          </div>

          <section className="decision-panel" aria-labelledby="economics-services-title">
            <div className="decision-panel-header"><div><span className="wl-kicker">Service model</span><h2 id="economics-services-title">Revenue & variable-cost model</h2><p>Volumes and unit values are model assumptions; calculated totals are model outputs.</p></div><button type="button" className="evidence-action" onClick={() => setEvidence({ title: "Hub Economics model", classification: "SYNTHETIC", evidenceRefs: model.evidenceRefs, schemaVersion: model.schemaVersion, integrityRef: model.economicsDigest, limitation: "MODEL_ASSUMPTION and MODEL_OUTPUT classes are synthetic Stage-4 model evidence only. OBSERVED and EXTERNALLY_VERIFIED classes are unavailable.", authorityImplication: "The economics model grants no funds, posting, settlement, accounting or production authority." })}>View model evidence</button></div>
            <div className="economics-service-grid">
              {model.revenueAttribution.map((revenue) => {
                const cost = model.variableCostOutputs.find((item) => item.serviceId === revenue.serviceId);
                return <article className="economics-service-card" key={revenue.serviceId}><GovernedStatus label="MODEL_OUTPUT" /><h3>{serviceLabel(revenue.serviceId)}</h3><div className="economics-figures"><div className="economics-figure"><span>Monthly volume assumption</span><strong>{revenue.monthlyVolume.toLocaleString()}</strong></div><div className="economics-figure"><span>Modeled revenue</span><strong>{money(revenue.modeledRevenueMinor)}</strong></div><div className="economics-figure"><span>Modeled variable cost</span><strong>{cost ? money(cost.modeledVariableCostMinor) : "UNAVAILABLE"}</strong></div></div></article>;
              })}
            </div>
          </section>

          <section className="decision-panel" aria-labelledby="fixed-cost-title">
            <div className="decision-panel-header"><div><span className="wl-kicker">Model assumptions</span><h2 id="fixed-cost-title">Fixed-cost classification</h2><p>Shareable and non-shareable assumptions remain explicit.</p></div></div>
            <div className="economics-cost-list">{model.fixedCostClassification.map((cost) => <article className="economics-cost-row" key={cost.costId}><strong>{cost.label}</strong><span>{money(cost.monthlyAmountMinor)}</span><GovernedStatus label={cost.sharingClass} /><GovernedStatus label={cost.evidenceClass} /></article>)}</div>
          </section>

          <section className="decision-panel" aria-labelledby="variance-title">
            <div className="decision-panel-header"><div><span className="wl-kicker">Model vs observed</span><h2 id="variance-title">Observed performance is unavailable</h2><p>{model.modelVsObservedVariance.reason}</p></div><GovernedStatus label={model.modelVsObservedVariance.status} tone="unknown" /></div>
            <div className="decision-unavailable"><strong>No observed margin or variance</strong>Observed margin and model-vs-observed variance remain null at Stage 4 rather than being fabricated from model outputs.</div>
          </section>

          <div className="portal-boundary-banner"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Model output is not accounting truth or pilot performance.</strong>The read boundary claims no forecast accuracy, observed pilot evidence, external verification, real funds, PartnerFI posting or settlement authority.</div></div>
        </>
      )}
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
