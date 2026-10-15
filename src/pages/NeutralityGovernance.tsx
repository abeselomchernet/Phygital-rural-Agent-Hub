import { useEffect, useMemo, useState } from "react";
import { Scale, ShieldCheck } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import type { HubNeutralityGovernanceReadModel, RouteEquivalenceCheck } from "../domain/hubNeutralityGovernance";
import { loadHubNeutralityGovernance } from "../lib/hub-client";
import "../components/hub-decision-dashboards.css";
import "../components/governance-operations.css";

function errorMessage(code: string) {
  if (code === "HUB_ACCESS_DENIED") return "This role/workspace is not authorized to read neutrality/governance evidence.";
  if (code === "WORKSPACE_SESSION_REQUIRED") return "The synthetic workspace session expired. Reload before reading governance evidence.";
  return "Neutrality/governance evidence is unavailable. No neutral or compliant state is inferred by the client.";
}

function comparisonRefs(check: RouteEquivalenceCheck) {
  return [...new Set([...check.evidenceRefs, ...check.left.evidenceRefs, ...check.right.evidenceRefs])];
}

export default function NeutralityGovernance() {
  const workspace = useCapabilityWorkspace();
  const [models, setModels] = useState<readonly HubNeutralityGovernanceReadModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true; setLoading(true); setError(null); setModels([]);
    void loadHubNeutralityGovernance(workspace.hubId).then((next) => { if (active) setModels(next); }).catch((cause) => { if (active) setError(errorMessage(cause instanceof Error ? cause.message : "HUB_API_UNAVAILABLE")); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const model = models[0] ?? null;
  const reviewComparisons = useMemo(() => model?.routeEquivalenceChecks.filter((check) => check.result !== "EQUIVALENT_FOR_SYNTHETIC_REVIEW") ?? [], [model]);
  const conflictReviews = useMemo(() => model?.conflictFlags.filter((flag) => flag.state === "DECLARED_SYNTHETIC_REVIEW_REQUIRED") ?? [], [model]);

  if (!workspace) return <section className="decision-page"><div className="decision-unavailable"><strong>Workspace unavailable</strong>No neutrality state is inferred.</div></section>;

  return (
    <section className="decision-page" data-testid="neutrality-governance-page">
      <header className="decision-hero">
        <span className="wl-kicker">Neutrality & Scheme Governance / E9</span>
        <h1>Partner-neutral governance evidence</h1>
        <p>Versioned synthetic scheme rules, route-equivalence review, conflict disclosures and governance decisions. This workspace compares governance eligibility; it does not authorize route substitution, fallback or commercial preference.</p>
        <div className="decision-hero-actions"><GovernedStatus label="STAGE_4" /><GovernedStatus label="SYNTHETIC_ONLY" /><GovernedStatus label="NO_ROUTE_MUTATION_AUTHORITY" tone="blocked" /></div>
      </header>

      {loading && <div className="decision-unavailable"><strong>Loading governance evidence</strong>Waiting for the authenticated Hub neutrality read model.</div>}
      {!loading && error && <div className="decision-unavailable" role="status"><strong>Governance evidence unavailable</strong>{error}</div>}
      {!loading && !error && !model && <div className="decision-unavailable"><strong>No scoped neutrality model returned</strong>No neutral, equivalent or approved state is inferred.</div>}

      {model && <>
        <div className="decision-metrics" aria-label="Neutrality governance summary">
          <article className="decision-metric"><span>Neutrality state</span><strong>{model.neutralityState.replaceAll("_", " ")}</strong></article>
          <article className="decision-metric"><span>Policy version</span><strong>{model.policy.policyVersion}</strong></article>
          <article className="decision-metric"><span>Route comparisons</span><strong>{model.routeEquivalenceChecks.length}</strong></article>
          <article className="decision-metric"><span>Reviews requiring attention</span><strong>{reviewComparisons.length + conflictReviews.length}</strong></article>
        </div>

        <section className="decision-panel" aria-labelledby="neutrality-rules-title">
          <div className="decision-panel-header"><div><span className="wl-kicker">Scheme rules</span><h2 id="neutrality-rules-title">Versioned neutrality policy</h2><p>All rules are synthetic evidence-review controls; they do not mutate production routes.</p></div><button type="button" className="evidence-action" onClick={() => setEvidence({ title: "Neutrality scheme policy", classification: "SYNTHETIC", evidenceRefs: model.policy.evidenceRefs, schemaVersion: model.schemaVersion, integrityRef: model.neutralityDigest, evaluatedAt: model.evaluatedAt, limitation: "The neutrality digest is content-integrity metadata only. No real commercial-incentive data or external audit evidence is present.", authorityImplication: "Policy visibility and synthetic review do not grant route mutation, fallback, commercial, settlement or regulated authority." })}>View policy evidence</button></div>
          <div className="governance-grid">{model.policy.rules.map((rule) => <article className="governance-card" key={rule.ruleId}><div className="governance-meta"><GovernedStatus label={rule.state} /><GovernedStatus label={rule.enforcementMode} /></div><h3>{rule.key.replaceAll("_", " ")}</h3><p>Rule version {rule.ruleVersion}. Evidence review only.</p></article>)}</div>
        </section>

        <section className="decision-panel" aria-labelledby="route-equivalence-title">
          <div className="decision-panel-header"><div><span className="wl-kicker">Route-equivalence review</span><h2 id="route-equivalence-title">Governance eligibility comparison</h2><p>Equivalent-for-review never means interchangeable provider or route.</p></div></div>
          <div className="governance-grid">{model.routeEquivalenceChecks.map((check) => <article className="governance-card" key={check.checkId} data-testid={`neutrality-check-${check.checkId}`}><div className="governance-meta"><GovernedStatus label={check.result} tone={toneForGovernedState(check.result)} />{check.differenceCodes.map((code) => <GovernedStatus key={code} label={code} tone="review" />)}</div><h3>{check.left.serviceId.replaceAll("_", " ")} ? {check.right.serviceId.replaceAll("_", " ")}</h3><div className="governance-participants"><div className="governance-participant"><span>Left partner / route</span><strong>{check.left.partnerOrgId}</strong><span>{check.left.routeId}</span></div><div className="governance-participant"><span>Right partner / route</span><strong>{check.right.partnerOrgId}</strong><span>{check.right.routeId}</span></div></div><p>Route interchangeable: no. Fallback authorized: no. Automatic route selection: no.</p><button type="button" className="evidence-action" onClick={() => setEvidence({ title: `Route-equivalence review / ${check.checkId}`, classification: "SYNTHETIC", evidenceRefs: comparisonRefs(check), schemaVersion: model.schemaVersion, integrityRef: model.neutralityDigest, evaluatedAt: model.evaluatedAt, limitation: check.equivalenceMeaning, authorityImplication: "This comparison cannot authorize route interchangeability, fallback, automatic route selection, provider substitution or live routing." })}>View evidence</button></article>)}</div>
        </section>

        <section className="decision-panel" aria-labelledby="conflict-title">
          <div className="decision-panel-header"><div><span className="wl-kicker">Conflict & change review</span><h2 id="conflict-title">Disclosures and governance history</h2><p>Synthetic flags and review records are not findings about any real institution.</p></div></div>
          <div className="governance-grid">
            {model.conflictFlags.map((flag) => <article className="governance-card" key={flag.flagId}><div className="governance-meta"><GovernedStatus label={flag.state} tone={toneForGovernedState(flag.state)} /><GovernedStatus label={flag.incentiveDisclosureState} tone={toneForGovernedState(flag.incentiveDisclosureState)} /></div><h3>{flag.partnerOrgId}</h3><p>Conflict/incentive state is a synthetic fixture. No real commercial-incentive dataset is represented.</p></article>)}
            {model.changeHistory.map((change) => <article className="governance-card" key={change.changeId}><div className="governance-meta"><GovernedStatus label={change.reviewState} tone={toneForGovernedState(change.reviewState)} /></div><h3>Policy {change.fromPolicyVersion} ? {change.toPolicyVersion}</h3><p>{change.changedRuleKeys.map((key) => key.replaceAll("_", " ")).join(", ")}. Production effect: no. Routing mutation authorized: no.</p></article>)}
          </div>
        </section>

        <div className="portal-boundary-banner"><Scale size={20} aria-hidden="true" /><div><strong>Neutrality evidence is not regulatory or commercial approval.</strong>`NO_SYNTHETIC_EXCEPTION_IDENTIFIED` means only that the bounded synthetic evidence contains no modeled exception. It is not production neutrality, independent audit assurance or provider interchangeability.</div></div>
        <div className="portal-boundary-banner"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Route mutation and fallback remain disabled.</strong>No live networking, real funds, settlement, production routing, commercial or regulated authority is granted.</div></div>
      </>}
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
