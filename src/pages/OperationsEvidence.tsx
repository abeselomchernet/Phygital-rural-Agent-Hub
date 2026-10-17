import { FormEvent, useEffect, useMemo, useState } from "react";
import { RefreshCcw, ShieldCheck } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import BoundedState from "../components/BoundedState";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import type { HubOfflineEvidenceTrace } from "../domain/hubOfflineOperationsEvidence";
import { offlineEvidenceUxStates } from "../domain/evidenceUxSemantics";
import { loadHubOfflineEvidence } from "../lib/hub-client";
import "../components/hub-decision-dashboards.css";
import "../components/governance-operations.css";

function errorMessage(code: string) {
  if (code === "HUB_ACCESS_DENIED") return "Offline/reconciliation evidence is limited to Operations and Partner Admin in an authorized Hub scope.";
  if (code === "WORKSPACE_SESSION_REQUIRED") return "The synthetic workspace session expired. Reload before reading offline evidence.";
  return "Offline/reconciliation evidence is unavailable. No transport, authorization or settlement outcome is inferred.";
}

export default function OperationsEvidence() {
  const workspace = useCapabilityWorkspace();
  const [traces, setTraces] = useState<readonly HubOfflineEvidenceTrace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | undefined>();
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true; setLoading(true); setError(null); setTraces([]);
    void loadHubOfflineEvidence(workspace.hubId, activeFilter).then((next) => { if (active) setTraces(next); }).catch((cause) => { if (active) setError(errorMessage(cause instanceof Error ? cause.message : "HUB_API_UNAVAILABLE")); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace, activeFilter]);

  const summary = useMemo(() => ({
    reconciliation: traces.filter((trace) => trace.reconciliationRequired).length,
    conflicts: traces.filter((trace) => trace.conflictObserved).length,
    duplicates: traces.filter((trace) => trace.duplicateNoopObserved).length,
    retries: traces.reduce((sum, trace) => sum + trace.totalRetryCount, 0),
  }), [traces]);

  const submitFilter = (event: FormEvent) => { event.preventDefault(); setActiveFilter(filter.trim() || undefined); };

  if (!workspace) return <section className="decision-page"><BoundedState kind="unavailable" title="Workspace unavailable">No operations evidence is inferred.</BoundedState></section>;

  return (
    <section className="decision-page" data-testid="operations-evidence-page">
      <header className="decision-hero">
        <span className="wl-kicker">Operations Evidence / E4</span>
        <h1>Offline & reconciliation evidence</h1>
        <p>Read-only queue/replay/idempotency/reconciliation evidence for the authenticated Hub and PartnerFI scope. Local persistence and transport acceptance remain separate from financial authority and settlement.</p>
        <div className="decision-hero-actions"><GovernedStatus label="READ_ONLY" /><GovernedStatus label="SYNTHETIC_ONLY" /><GovernedStatus label="NO_SETTLEMENT_AUTHORITY" tone="blocked" /></div>
      </header>

      <form className="operations-filter" onSubmit={submitFilter}>
        <label>Correlation ID<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Optional synthetic correlation ID" /></label>
        <button type="submit">Filter evidence</button>
        {activeFilter && <button type="button" onClick={() => { setFilter(""); setActiveFilter(undefined); }}>Clear filter</button>}
      </form>

      {loading && <BoundedState kind="loading" title="Loading operations evidence">Waiting for the authenticated offline-evidence read model.</BoundedState>}
      {!loading && error && <BoundedState kind="error" title="Operations evidence unavailable">{error}</BoundedState>}
      {!loading && !error && traces.length === 0 && <BoundedState kind="empty" title="No scoped traces returned">No success, failure or settlement outcome is inferred from an empty result.</BoundedState>}

      {!loading && !error && traces.length > 0 && <>
        <div className="decision-metrics" aria-label="Offline evidence summary">
          <article className="decision-metric"><span>Evidence traces</span><strong>{traces.length}</strong></article>
          <article className="decision-metric"><span>Reconciliation required</span><strong>{summary.reconciliation}</strong></article>
          <article className="decision-metric"><span>Conflict traces</span><strong>{summary.conflicts}</strong></article>
          <article className="decision-metric"><span>Total retries</span><strong>{summary.retries}</strong></article>
        </div>

        <div className="operations-trace-list">{traces.map((trace) => <article className="operations-trace-card" key={trace.correlationId} data-testid={`operations-trace-${trace.correlationId}`}><div className="operations-trace-head"><div><span className="wl-kicker">Correlation trace</span><h3>{trace.correlationId}</h3></div><div className="governance-meta"><GovernedStatus label={trace.latestOutcome} tone={toneForGovernedState(trace.latestOutcome)} />{trace.reconciliationRequired && <GovernedStatus label="RECONCILIATION_REQUIRED" tone="review" />}</div></div><div className="operations-trace-summary"><div><span>Latest transport</span><strong>{trace.latestTransportState.replaceAll("_", " ")}</strong></div><div><span>Latest authority</span><strong>{trace.latestAuthorityState.replaceAll("_", " ")}</strong></div><div><span>Max queue age</span><strong>{trace.maxQueueAgeMinutes} min</strong></div><div><span>Retries</span><strong>{trace.totalRetryCount}</strong></div></div><ul className="operations-timeline" aria-label={`Timeline for ${trace.correlationId}`}>{trace.timeline.map((event) => <li key={`${trace.correlationId}-${event.sequence}`}><span className="seq">{event.sequence}</span><div><strong>{event.stage.replaceAll("_", " ")}</strong><br/><small>{event.detailCode.replaceAll("_", " ")} / {event.occurredAt}</small></div><GovernedStatus label={event.authorityState} tone={toneForGovernedState(event.authorityState)} /></li>)}</ul><div className="operations-record-grid">{trace.records.map((record) => <article className="operations-record" key={record.evidenceId}><h4>{record.evidenceId}</h4><div className="record-row"><span>Queue age</span><strong>{record.queueAgeMinutes} min / {record.queueAgeState}</strong></div><div className="record-row"><span>Transport</span><strong>{record.transportState}</strong></div><div className="record-row"><span>Authority</span><strong>{record.authorityState}</strong></div><div className="record-row"><span>Outcome</span><strong>{record.outcome}</strong></div><button type="button" className="evidence-action" onClick={() => { const refs = [...new Set(trace.timeline.flatMap((item) => item.evidenceRefs))]; setEvidence({ title: `Offline evidence / ${record.evidenceId}`, classification: "SYNTHETIC", evidenceRefs: refs, schemaVersion: 1, integrityRef: record.evidenceDigest, semanticStates: offlineEvidenceUxStates({ digestVerified: true, reconciliationRequired: trace.reconciliationRequired, outcomeUncertain: record.outcome === "RECONCILIATION_REQUIRED" }), evaluatedAt: record.evaluatedAt, limitation: "Client queue records are untrusted intent. Local receipt does not prove remote receipt; transport acceptance does not imply financial authority or settlement.", authorityImplication: "This trace grants no mutation, PartnerFI posting, settlement, cash movement or production authority." }); }}>View evidence</button></article>)}</div></article>)}</div>
      </>}

      <div className="portal-boundary-banner"><RefreshCcw size={20} aria-hidden="true" /><div><strong>Retry is not duplicate financial execution.</strong>Idempotency/replay evidence is shown so duplicate no-op, conflict and reconciliation states remain inspectable without assuming provider success.</div></div>
      <div className="portal-boundary-banner"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Transport is not settlement.</strong>Raw intent facts, raw idempotency keys, credentials and provider payloads are excluded from this read model; settlement authority remains false.</div></div>
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
