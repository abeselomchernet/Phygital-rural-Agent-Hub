import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import type { PilotEvidenceReadModel, PilotGateAssessment } from "../domain/pilotEvidenceEngine";
import { loadHubPilotEvidence } from "../lib/hub-client";
import "../components/hub-decision-dashboards.css";

function apiError(code: string) {
  if (code === "HUB_ACCESS_DENIED") return "This role/workspace is not authorized to read Pilot Evidence.";
  if (code === "WORKSPACE_SESSION_REQUIRED") return "The synthetic workspace session expired. Reload before reading Pilot Evidence.";
  return "Pilot Evidence is unavailable. Missing evidence remains unknown rather than PASS.";
}

function constraintText(item: PilotGateAssessment["constraintResults"][number]) {
  const comparator = { GT: ">", GTE: ">=", LT: "<", LTE: "<=", EQ: "=" }[item.comparator];
  const target = item.unit === "BASIS_POINTS" ? `${(item.threshold / 100).toFixed(2)}%` : item.unit === "USD_CENTS_PER_MONTH" ? `$${(item.threshold / 100).toFixed(2)}/month` : item.unit === "SECONDS" ? `${item.threshold}s` : item.threshold === 1 ? "required" : String(item.threshold);
  const observed = item.observedValue === null ? "UNKNOWN" : item.unit === "BASIS_POINTS" ? `${(item.observedValue / 100).toFixed(2)}%` : item.unit === "USD_CENTS_PER_MONTH" ? `$${(item.observedValue / 100).toFixed(2)}/month` : item.unit === "SECONDS" ? `${item.observedValue}s` : item.observedValue === 1 ? "present" : String(item.observedValue);
  return `${item.metricKey.replaceAll("_", " ")}: observed ${observed}; target ${comparator} ${target}`;
}

function gateEvidenceRefs(gate: PilotGateAssessment) {
  return [...new Set([
    ...gate.gateDefinition.evidenceRefs, ...gate.target.evidenceRefs,
    ...gate.observations.flatMap((item) => item.evidenceRefs),
    ...gate.evidenceArtifacts.map((item) => item.evidenceRef),
    ...(gate.review?.evidenceRefs ?? []), ...(gate.decision?.evidenceRefs ?? []),
  ])];
}

export default function PilotEvidence() {
  const workspace = useCapabilityWorkspace();
  const [programs, setPrograms] = useState<readonly PilotEvidenceReadModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true; setLoading(true); setError(null); setPrograms([]);
    void loadHubPilotEvidence(workspace.hubId).then((next) => { if (active) setPrograms(next); }).catch((cause) => { if (active) setError(apiError(cause instanceof Error ? cause.message : "HUB_API_UNAVAILABLE")); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const program = programs[0] ?? null;
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const gate of program?.gateAssessments ?? []) counts.set(gate.status, (counts.get(gate.status) ?? 0) + 1);
    return counts;
  }, [program]);

  if (!workspace) return <section className="decision-page"><div className="decision-unavailable"><strong>Workspace unavailable</strong>No pilot gate state is inferred.</div></section>;

  return (
    <section className="decision-page" data-testid="pilot-evidence-page">
      <header className="decision-hero">
        <span className="wl-kicker">Pilot Evidence / P1-P11</span>
        <h1>Pilot readiness evidence</h1>
        <p>Evidence-linked Stage-4 gate assessments for the active Hub and PartnerFI. Synthetic threshold exercises remain unreviewed; numeric results cannot self-authorize pilot scale or expansion.</p>
        <div className="decision-hero-actions"><GovernedStatus label="STAGE_4" /><GovernedStatus label="SYNTHETIC_ONLY" /><GovernedStatus label="NO_AUTHORIZED_SCALE_DECISION_STAGE4" tone="blocked" /></div>
      </header>

      {loading && <div className="decision-unavailable"><strong>Loading P1-P11 evidence</strong>Waiting for the authenticated Pilot Evidence read model.</div>}
      {!loading && error && <div className="decision-unavailable" role="status"><strong>Pilot Evidence unavailable</strong>{error}</div>}
      {!loading && !error && !program && <div className="decision-unavailable"><strong>No scoped pilot evidence returned</strong>Missing evidence remains UNKNOWN. No pilot decision is inferred.</div>}

      {program && (
        <>
          <div className="decision-metrics" aria-label="Pilot evidence summary">
            <article className="decision-metric"><span>Governed gates</span><strong>{program.gateAssessments.length}</strong></article>
            <article className="decision-metric"><span>Meets target, unreviewed</span><strong>{statusCounts.get("MEETS_TARGET_UNREVIEWED") ?? 0}</strong></article>
            <article className="decision-metric"><span>Partial / collecting / unknown</span><strong>{(statusCounts.get("PARTIAL") ?? 0) + (statusCounts.get("COLLECTING") ?? 0) + (statusCounts.get("UNKNOWN") ?? 0)}</strong></article>
            <article className="decision-metric"><span>Pilot decision</span><strong>No authorization issued</strong></article>
          </div>

          <section className="decision-panel" aria-labelledby="pilot-gates-title">
            <div className="decision-panel-header"><div><span className="wl-kicker">Gate assessments</span><h2 id="pilot-gates-title">P1-P11 evidence state</h2><p>Exact domain statuses are retained. Positive synthetic threshold results are not rendered as approval.</p></div><button type="button" className="evidence-action" onClick={() => setEvidence({ title: "Pilot program evidence", classification: "SYNTHETIC", evidenceRefs: program.program.evidenceRefs, schemaVersion: program.schemaVersion, integrityRef: program.pilotEvidenceDigest, limitation: "Stage-4 read model contains no real pilot observations or externally verified pilot evidence.", authorityImplication: "No numeric threshold, evidence status or UI indicator grants scale, bounded expansion, posting, settlement or regulated pilot authority." })}>View program evidence</button></div>
            <div className="pilot-gate-list">
              {program.gateAssessments.map((gate) => <article className="pilot-gate-card" key={gate.gateDefinition.gateId} data-testid={`pilot-gate-${gate.gateDefinition.gateId}`}><div className="pilot-gate-id">{gate.gateDefinition.gateId}</div><div className="pilot-gate-copy"><h3>{gate.gateDefinition.title}</h3><p>{gate.gateDefinition.description}</p></div><div className="pilot-constraint-list">{gate.constraintResults.map((item) => <span key={item.metricKey}><strong>{constraintText(item)}</strong></span>)}</div><div className="pilot-gate-actions"><GovernedStatus label={gate.status} tone={toneForGovernedState(gate.status)} /><span className="wl-status-chip">{gate.statusBasis.replaceAll("_", " ")}</span><button type="button" className="evidence-action" onClick={() => setEvidence({ title: `${gate.gateDefinition.gateId} / ${gate.gateDefinition.title}`, classification: "SYNTHETIC", evidenceRefs: gateEvidenceRefs(gate), schemaVersion: program.schemaVersion, integrityRef: program.pilotEvidenceDigest, limitation: `${gate.status} is based on ${gate.statusBasis}. Stage-4 rejects real-pilot observations, external verification and accepted scale decisions.`, authorityImplication: "selfAuthorizedScale is false. Governance action is required; this gate cannot authorize expansion." })}>View evidence</button></div></article>)}
            </div>
          </section>

          <section className="decision-panel" aria-labelledby="pilot-boundary-title">
            <div className="decision-panel-header"><div><span className="wl-kicker">Decision boundary</span><h2 id="pilot-boundary-title">Pilot decision: No authorization issued</h2><p>Current state: {program.scaleDecisionState.replaceAll("_", " ")}.</p></div><GovernedStatus label="NOT_AUTHORIZED" tone="blocked" /></div>
            <div className="decision-unavailable"><strong>Governance remains required.</strong>No actual pilot is represented as running; no real pilot observations or externally verified evidence are present; bounded expansion authority remains false.</div>
          </section>

          <div className="portal-boundary-banner"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Evidence is not approval.</strong>Stage 4 contains no real data, real funds, PartnerFI posting, settlement or bounded-expansion authority. Missing evidence remains UNKNOWN rather than PASS.</div></div>
        </>
      )}
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
