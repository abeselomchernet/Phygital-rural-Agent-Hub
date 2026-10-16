import { useEffect, useState } from "react";
import { MapPinned, ShieldCheck } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import BoundedState from "../components/BoundedState";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import type { CorridorPlanningReadModel } from "../domain/corridorPlanning";
import { loadHubCorridorPlanning } from "../lib/hub-client";
import "../components/hub-decision-dashboards.css";

const pct = (bps: number | null) => bps === null ? "UNKNOWN" : `${(bps / 100).toFixed(0)}%`;
const label = (value: string) => value.replaceAll("_", " ");

function apiError(code: string) {
  if (code === "HUB_ACCESS_DENIED") return "This role/workspace is not authorized to read Corridor Planning.";
  if (code === "WORKSPACE_SESSION_REQUIRED") return "The synthetic workspace session expired. Reload before reading Corridor Planning.";
  return "Corridor Planning is unavailable. No geographic recommendation is inferred by the client.";
}

export default function CorridorPlanning() {
  const workspace = useCapabilityWorkspace();
  const [plans, setPlans] = useState<readonly CorridorPlanningReadModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    setLoading(true); setError(null); setPlans([]);
    void loadHubCorridorPlanning(workspace.hubId)
      .then((next) => { if (active) setPlans(next); })
      .catch((cause) => { if (active) setError(apiError(cause instanceof Error ? cause.message : "HUB_API_UNAVAILABLE")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const plan = plans[0] ?? null;
  if (!workspace) return <section className="decision-page"><BoundedState kind="unavailable" title="Workspace unavailable">No corridor recommendation is inferred.</BoundedState></section>;

  return (
    <section className="decision-page" data-testid="corridor-planning-page">
      <header className="decision-hero">
        <span className="wl-kicker">Corridor Planning / Stage 4</span>
        <h1>Bounded corridor comparison</h1>
        <p>Compare synthetic location, demand, connectivity, partner-interest, logistics, liquidity and operating-cost evidence. This is planning support, not site selection or geographic authorization.</p>
        <div className="decision-hero-actions"><GovernedStatus label="SYNTHETIC_MODEL_ASSUMPTION" /><GovernedStatus label="RECOMMENDATION_ONLY" /><GovernedStatus label="GEOGRAPHIC_AUTHORIZATION_NOT_GRANTED" tone="blocked" /></div>
      </header>

      {loading && <BoundedState kind="loading" title="Loading corridor model">Waiting for the authenticated Stage-4 corridor read model.</BoundedState>}
      {!loading && error && <BoundedState kind="error" title="Corridor Planning unavailable">{error}</BoundedState>}
      {!loading && !error && !plan && <BoundedState kind="empty" title="No corridor model returned">No candidate, score or expansion recommendation is fabricated.</BoundedState>}

      {plan && (<>
        <div className="decision-metrics" aria-label="Corridor planning summary">
          <article className="decision-metric"><span>Corridor</span><strong>{plan.corridorLabel}</strong></article>
          <article className="decision-metric"><span>Candidates</span><strong>{plan.candidates.length}</strong></article>
          <article className="decision-metric"><span>Recommendation</span><strong>{label(plan.boundedExpansionRecommendation.state)}</strong></article>
          <article className="decision-metric"><span>Geographic authorization</span><strong>NOT GRANTED</strong></article>
        </div>

        <section className="decision-panel" aria-labelledby="corridor-candidates-title">
          <div className="decision-panel-header"><div><span className="wl-kicker">Candidate comparison</span><h2 id="corridor-candidates-title">Synthetic corridor candidates</h2><p>No exact coordinates or real partner commitments are present.</p></div><button type="button" className="evidence-action" onClick={() => setEvidence({ title: plan.corridorLabel, classification: "SYNTHETIC", evidenceRefs: plan.evidenceRefs, schemaVersion: plan.schemaVersion, integrityRef: plan.planningDigest, limitation: "All corridor inputs and readiness values are synthetic model assumptions/outputs. Exact coordinates, real demand, connectivity, logistics, liquidity and operating-cost data are absent.", authorityImplication: "Recommendation creates no geographic, pilot, expansion or live-site authority." })}>View plan evidence</button></div>
          <div className="corridor-candidate-grid">
            {plan.candidates.map((candidate) => <article className="corridor-candidate-card" key={candidate.candidateId}>
              <div className="corridor-candidate-heading"><MapPinned size={20} aria-hidden="true" /><div><h3>{candidate.displayLabel}</h3><small>{candidate.regionId.replace("region_syn_", "")} · {candidate.locationRef}</small></div></div>
              <div className="corridor-score-row"><span>Readiness</span><strong>{pct(candidate.readinessScoreBasisPoints)}</strong></div>
              <div className="corridor-score-row"><span>Evidence completeness</span><strong>{pct(candidate.evidenceCompletenessBasisPoints)}</strong></div>
              <div className="corridor-profile-list"><span>{label(candidate.connectivityProfile)}</span><span>{label(candidate.logisticsState)}</span><span>{label(candidate.liquidityProfile)}</span></div>
              {candidate.missingEvidenceDimensions.length > 0 && <p className="corridor-missing">Missing: {candidate.missingEvidenceDimensions.map(label).join(", ")}</p>}
              <div className="pilot-gate-actions"><GovernedStatus label={candidate.recommendationState} tone={toneForGovernedState(candidate.recommendationState)} /><button type="button" className="evidence-action" onClick={() => setEvidence({ title: candidate.displayLabel, classification: "SYNTHETIC", evidenceRefs: candidate.evidenceRefs, schemaVersion: plan.schemaVersion, integrityRef: plan.planningDigest, limitation: `Readiness and evidence completeness are transparent synthetic heuristics. Partner commitment is ${candidate.partnerCommitmentState}.`, authorityImplication: "recommendationOnly is true; geographicAuthorizationGranted, pilotAuthorized, expansionAuthorized and liveSiteActivationAuthorized are false." })}>View evidence</button></div>
            </article>)}
          </div>
        </section>

        <section className="decision-panel" aria-labelledby="corridor-recommendation-title"><div className="decision-panel-header"><div><span className="wl-kicker">Decision boundary</span><h2 id="corridor-recommendation-title">{label(plan.boundedExpansionRecommendation.state)}</h2><p>{plan.boundedExpansionRecommendation.reasonCodes.map(label).join(" · ")}</p></div><GovernedStatus label="NOT_AUTHORIZED" tone="blocked" /></div><div className="decision-unavailable"><strong>Geographic authorization: NOT GRANTED.</strong>The recommendation is review support only. It cannot authorize a pilot, expansion, live site, provider route or real-funds activity.</div></section>

        <div className="portal-boundary-banner"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Planning recommendation is not authorization.</strong>Stage 4 contains no exact coordinates, real commitments, accepted external evidence, real funds or regulated-pilot authority.</div></div>
      </>)}
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
