import { useEffect, useState } from "react";
import { Laptop, ShieldCheck, UserRoundCheck } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import type { HubOperatorDeviceReadinessReadModel } from "../domain/hubOperatorDeviceReadiness";
import { loadHubOperatorDeviceReadiness } from "../lib/hub-client";
import "../components/hub-decision-dashboards.css";

const label = (value: string) => value.replaceAll("_", " ");
function apiError(code: string) {
  if (code === "HUB_ACCESS_DENIED") return "This role/workspace is not authorized to read Operator & Device Readiness.";
  if (code === "WORKSPACE_SESSION_REQUIRED") return "The synthetic workspace session expired. Reload before reading readiness evidence.";
  return "Operator & Device Readiness is unavailable. No operator certification or device readiness is inferred by the client.";
}

export default function OperatorDeviceReadiness() {
  const workspace = useCapabilityWorkspace();
  const [models, setModels] = useState<readonly HubOperatorDeviceReadinessReadModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    setLoading(true); setError(null); setModels([]);
    void loadHubOperatorDeviceReadiness(workspace.hubId)
      .then((next) => { if (active) setModels(next); })
      .catch((cause) => { if (active) setError(apiError(cause instanceof Error ? cause.message : "HUB_API_UNAVAILABLE")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const model = models[0] ?? null;
  if (!workspace) return <section className="decision-page"><div className="decision-unavailable"><strong>Workspace unavailable</strong>No readiness state is inferred.</div></section>;

  return (
    <section className="decision-page" data-testid="operator-device-readiness-page">
      <header className="decision-hero">
        <span className="wl-kicker">Operator & Device Readiness / Stage 4</span>
        <h1>Readiness evidence</h1>
        <p>Review synthetic training, certification, device posture and support evidence for the active Hub/PartnerFI. Readiness does not activate devices, operators, providers or financial authority.</p>
        <div className="decision-hero-actions"><GovernedStatus label="SYNTHETIC_ONLY" /><GovernedStatus label="READ_ONLY" /><GovernedStatus label="NO_DEVICE_CONTROL_AUTHORITY" tone="blocked" /></div>
      </header>

      {loading && <div className="decision-unavailable"><strong>Loading readiness evidence</strong>Waiting for the authenticated readiness read model.</div>}
      {!loading && error && <div className="decision-unavailable" role="status"><strong>Readiness unavailable</strong>{error}</div>}
      {!loading && !error && !model && <div className="decision-unavailable"><strong>No readiness model returned</strong>No operator/device state is fabricated.</div>}

      {model && (<>
        <div className="decision-metrics" aria-label="Readiness summary">
          <article className="decision-metric"><span>Overall state</span><strong>{label(model.overallState)}</strong></article>
          <article className="decision-metric"><span>Operators</span><strong>{model.operatorReadiness.length}</strong></article>
          <article className="decision-metric"><span>Devices</span><strong>{model.deviceReadiness.length}</strong></article>
          <article className="decision-metric"><span>Open support</span><strong>{model.supportEvidence.filter((item) => item.state === "OPEN_SYNTHETIC").length}</strong></article>
        </div>

        <section className="decision-panel" aria-labelledby="operator-readiness-title">
          <div className="decision-panel-header"><div><span className="wl-kicker">Operator readiness</span><h2 id="operator-readiness-title">Training & certification evidence</h2><p>Opaque synthetic assignment references are shown; no real operator identity is present.</p></div><button type="button" className="evidence-action" onClick={() => setEvidence({ title: "Hub readiness plan", classification: "SYNTHETIC", evidenceRefs: model.evidenceRefs, schemaVersion: model.schemaVersion, integrityRef: model.readinessDigest, limitation: "No real operator identity, device telemetry or live support-ticketing integration is present.", authorityImplication: "Training/certification creates no financial, provider, regulated or device-control authority." })}>View plan evidence</button></div>
          <div className="readiness-list">{model.operatorReadiness.map((operator) => <article className="readiness-card" key={operator.operatorAssignmentId}><div className="readiness-card-heading"><UserRoundCheck size={20} aria-hidden="true" /><div><h3>{operator.operatorAssignmentId}</h3><small>{operator.role}</small></div></div><div className="readiness-state-grid"><span>Training <strong>{label(operator.trainingCompletionState)}</strong></span><span>Certification <strong>{label(operator.certificationState)}</strong></span><span>Refresher <strong>{label(operator.refresherState)}</strong></span></div><div className="pilot-gate-actions"><GovernedStatus label={operator.operationalReadinessState} tone={toneForGovernedState(operator.operationalReadinessState)} /><button type="button" className="evidence-action" onClick={() => setEvidence({ title: operator.operatorAssignmentId, classification: "SYNTHETIC", evidenceRefs: operator.evidenceRefs, schemaVersion: model.schemaVersion, integrityRef: model.readinessDigest, limitation: `Training/certification are synthetic. Authorized device references: ${operator.authorizedDeviceRefs.length}.`, authorityImplication: "readinessCreatesFinancialAuthority, trainingCreatesProviderAuthority and regulatedAuthorityGranted are false." })}>View evidence</button></div></article>)}</div>
        </section>

        <section className="decision-panel" aria-labelledby="device-readiness-title"><div className="decision-panel-header"><div><span className="wl-kicker">Device readiness</span><h2 id="device-readiness-title">Device posture evidence</h2><p>Evidence only. There are no remote-control, provider-command or firmware-mutation controls.</p></div></div><div className="readiness-list">{model.deviceReadiness.map((device) => <article className="readiness-card" key={device.deviceId}><div className="readiness-card-heading"><Laptop size={20} aria-hidden="true" /><div><h3>{device.deviceId}</h3><small>{label(device.deviceClass)} · {label(device.visibility)}</small></div></div><div className="readiness-state-grid"><span>Sync <strong>{label(device.syncHealth)}</strong></span><span>Security <strong>{label(device.securityPosture)}</strong></span><span>Lifecycle <strong>{label(device.lifecycleState)}</strong></span></div><div className="pilot-gate-actions"><GovernedStatus label={device.readinessState} tone={toneForGovernedState(device.readinessState)} /><button type="button" className="evidence-action" onClick={() => setEvidence({ title: device.deviceId, classification: "SYNTHETIC", evidenceRefs: device.evidenceRefs, schemaVersion: model.schemaVersion, integrityRef: model.readinessDigest, limitation: "Device status is synthetic readiness evidence, not real telemetry.", authorityImplication: "remoteControlEnabled, providerCommandEnabled and firmwareMutationEnabled are false." })}>View evidence</button></div></article>)}</div></section>

        <section className="decision-panel" aria-labelledby="return-service-title"><div className="decision-panel-header"><div><span className="wl-kicker">Return-to-service</span><h2 id="return-service-title">Human review boundary</h2><p>Return to service is never automatic in Stage 4.</p></div><GovernedStatus label={model.overallState} tone={toneForGovernedState(model.overallState)} /></div><div className="readiness-review-grid">{model.returnToServiceReviews.map((review) => <article key={review.operatorAssignmentId}><strong>{review.operatorAssignmentId}</strong><span>{label(review.state)}</span><small>{review.missingPrerequisites.length ? `Missing: ${review.missingPrerequisites.map(label).join(", ")}` : "No missing prerequisites in synthetic model"}</small></article>)}</div></section>

        <div className="portal-boundary-banner"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Readiness evidence is not operational authority.</strong>No real identity/telemetry, provider posting, settlement, remote commands, automatic return-to-service or regulated authority is enabled.</div></div>
      </>)}
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
