import { useMemo, useState } from "react";
import { Building2, FileCheck2, Layers3, Network, ShieldCheck, Waypoints } from "lucide-react";
import { Link } from "react-router-dom";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import BoundedState from "../components/BoundedState";
import EvidenceDrawer, { type EvidenceDrawerModel } from "../components/EvidenceDrawer";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import { networkOperationsAccessSummary } from "../domain/networkOperationsAuthorization";
import { SYNTHETIC_PARTNERFI_SERVICE_CATALOGS } from "../domain/partnerServiceCatalog";
import "../components/partner-admin.css";

function displaySyntheticId(value: string | undefined, prefix: string) {
  if (!value) return "Unavailable";
  return value
    .replace(prefix, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PartnerAdministration() {
  const workspace = useCapabilityWorkspace();
  const [evidence, setEvidence] = useState<EvidenceDrawerModel | null>(null);
  const catalog = useMemo(() => {
    if (!workspace) return undefined;
    return SYNTHETIC_PARTNERFI_SERVICE_CATALOGS[
      workspace.partnerOrgId as keyof typeof SYNTHETIC_PARTNERFI_SERVICE_CATALOGS
    ];
  }, [workspace]);
  const access = useMemo(
    () => networkOperationsAccessSummary("PARTNER_ADMIN").filter((entry) => entry.canRead),
    [],
  );

  if (!workspace) {
    return (
      <section className="portal-page">
        <BoundedState kind="unavailable" title="Workspace context unavailable">No Partner Admin state is inferred from client-side defaults.</BoundedState>
      </section>
    );
  }

  if (workspace.role !== "PARTNER_ADMIN") {
    return (
      <section className="portal-page" data-testid="partner-admin-access-denied">
        <BoundedState kind="denied" title="Partner Administration is not available to this role">The client does not elevate the authenticated workspace. Server-side role, object and capability policy remain authoritative.</BoundedState>
      </section>
    );
  }

  const region = displaySyntheticId(workspace.regionId, "region_syn_");
  const hub = displaySyntheticId(workspace.hubId, "hub_syn_");

  return (
    <section className="portal-page partner-admin-page" data-testid="partner-admin-page">
      <header className="partner-admin-hero">
        <div>
          <span className="wl-kicker">Institution-scoped administration</span>
          <h1>Partner Administration</h1>
          <p>
            Inspect the active PartnerFI catalog, capability references, provider foundations, access scopes and governance evidence. This workspace is read-only at Stage 4 and cannot activate providers or grant regulated authority.
          </p>
        </div>
        <div className="partner-admin-hero-status" aria-label="Partner Administration authority state">
          <GovernedStatus label="STAGE_4" />
          <GovernedStatus label="SYNTHETIC_ONLY" />
          <GovernedStatus label="READ_ONLY" />
          <GovernedStatus label="NO_ACTIVATION_AUTHORITY" tone="blocked" />
        </div>
      </header>

      <div className="portal-summary-grid" aria-label="Partner Administration summary">
        <article className="portal-summary-card"><span>Partner</span><strong>{workspace.partnerDisplayName}</strong></article>
        <article className="portal-summary-card"><span>Hub / region</span><strong>{hub} / {region}</strong></article>
        <article className="portal-summary-card"><span>Published catalog entries</span><strong>{catalog?.services.length ?? "UNAVAILABLE"}</strong></article>
        <article className="portal-summary-card"><span>Provider foundations visible</span><strong>{workspace.providerStates.length}</strong></article>
      </div>

      <section className="partner-admin-panel" aria-labelledby="partner-profile-title">
        <div className="partner-admin-panel-heading">
          <div className="partner-admin-icon"><Building2 size={20} aria-hidden="true" /></div>
          <div><span className="wl-kicker">Partner profile</span><h2 id="partner-profile-title">Governed workspace identity</h2></div>
        </div>
        <dl className="partner-admin-profile-grid">
          <div><dt>Partner organization ID</dt><dd>{workspace.partnerOrgId}</dd></div>
          <div><dt>Role</dt><dd>{workspace.role.replaceAll("_", " ")}</dd></div>
          <div><dt>Environment</dt><dd>{workspace.environment}</dd></div>
          <div><dt>Catalog lifecycle</dt><dd>{catalog?.lifecycleState ?? "UNAVAILABLE"}</dd></div>
        </dl>
      </section>

      <section className="partner-admin-panel" aria-labelledby="partner-services-title">
        <div className="partner-admin-panel-heading">
          <div className="partner-admin-icon"><Layers3 size={20} aria-hidden="true" /></div>
          <div>
            <span className="wl-kicker">Published service catalog</span>
            <h2 id="partner-services-title">Service & capability inspection</h2>
            <p>Catalog publication is visible for governance review. It is not the same as role-specific service availability, provider activation, posting authority or settlement authority.</p>
          </div>
        </div>
        {!catalog ? (
          <div className="partner-admin-empty"><strong>Catalog unavailable</strong>No synthetic catalog is inferred for this partner.</div>
        ) : (
          <div className="partner-admin-service-grid">
            {catalog.services.map((service) => (
              <article className="partner-admin-service-card" key={service.serviceId} data-testid={`partner-admin-service-${service.serviceId}`}>
                <div className="partner-admin-card-meta">
                  <GovernedStatus label={catalog.lifecycleState} tone={toneForGovernedState(catalog.lifecycleState)} />
                  <GovernedStatus label={service.offlinePolicy} />
                </div>
                <h3>{service.display.name}</h3>
                <p>{service.display.shortDescription}</p>
                <div className="partner-admin-chip-row">
                  {service.requiredCapabilities.map((capability) => <span className="partner-admin-chip" key={capability}>{capability}</span>)}
                </div>
                <dl className="partner-admin-mini-list">
                  <div><dt>Published roles</dt><dd>{service.roles.join(", ")}</dd></div>
                  <div><dt>Route reference</dt><dd>{service.routePolicy.routeIds.join(", ")}</dd></div>
                  <div><dt>Data classes</dt><dd>{[...service.dataRequirements.inputClasses, ...service.dataRequirements.outputClasses].join(", ") || "None"}</dd></div>
                </dl>
                <button
                  type="button"
                  className="evidence-action"
                  onClick={() => setEvidence({
                    title: `${service.display.name} / catalog evidence`,
                    classification: "SYNTHETIC",
                    evidenceRefs: [...new Set([...catalog.evidenceRefs, ...service.activation.evidenceRefs])],
                    schemaVersion: catalog.schemaVersion,
                    limitation: "This is a synthetic published-catalog inspection view. It does not represent a live partner contract, live credentials or current production availability.",
                    authorityImplication: "Catalog presence cannot activate a provider, grant a capability, authorize posting/settlement, or override server-side role and environment gates.",
                  })}
                >
                  View catalog evidence
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="partner-admin-panel" aria-labelledby="provider-foundations-title">
        <div className="partner-admin-panel-heading">
          <div className="partner-admin-icon"><Network size={20} aria-hidden="true" /></div>
          <div>
            <span className="wl-kicker">Provider foundations</span>
            <h2 id="provider-foundations-title">Environment & route readiness</h2>
            <p>Registration and foundation state are evidence. They are not payment-route activation or PartnerFI settlement authority.</p>
          </div>
        </div>
        {workspace.providerStates.length === 0 ? (
          <div className="partner-admin-empty"><strong>No provider state in this workspace</strong>No provider readiness is inferred.</div>
        ) : (
          <div className="partner-admin-provider-grid">
            {workspace.providerStates.map((provider) => (
              <article className="partner-admin-provider-card" key={provider.providerKey} data-testid={`partner-admin-provider-${provider.providerKey}`}>
                <div className="partner-admin-card-meta"><GovernedStatus label={provider.displayState} tone={toneForGovernedState(provider.displayState)} /></div>
                <h3>{provider.providerKey.replaceAll("_", " ")}</h3>
                <dl className="partner-admin-mini-list">
                  <div><dt>Environment</dt><dd>{provider.environment}</dd></div>
                  <div><dt>Registration</dt><dd>{provider.registrationState}</dd></div>
                  <div><dt>Runtime</dt><dd>{provider.runtimeMode.replaceAll("_", " ")}</dd></div>
                  <div><dt>Route</dt><dd>{provider.routeState.replaceAll("_", " ")}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
        <div className="partner-admin-inline-action"><Link to="/partners">Open role-scoped Partner Ecosystem evidence</Link></div>
      </section>

      <section className="partner-admin-panel" aria-labelledby="scope-title">
        <div className="partner-admin-panel-heading">
          <div className="partner-admin-icon"><ShieldCheck size={20} aria-hidden="true" /></div>
          <div><span className="wl-kicker">Access & object scope</span><h2 id="scope-title">Readable network objects</h2><p>Visibility is derived from the current synthetic authorization model. Mutable authority remains false.</p></div>
        </div>
        <div className="partner-admin-scope-list">
          {access.map((entry) => (
            <article key={entry.objectId}>
              <div><strong>{entry.label}</strong><span>{entry.scope.replaceAll("_", " ")}</span></div>
              <div className="partner-admin-card-meta"><GovernedStatus label="READ" /><GovernedStatus label="MUTABLE_FALSE" tone="blocked" /></div>
              <p>{entry.authorityBoundary}</p>
            </article>
          ))}
        </div>
        <div className="partner-admin-inline-action"><Link to="/network-operations">Review full access & scope evidence</Link></div>
      </section>

      <section className="partner-admin-governance-grid" aria-label="Partner governance workspaces">
        <Link to="/hub/neutrality" className="partner-admin-governance-card"><Waypoints size={20} aria-hidden="true" /><div><strong>Neutrality & governance</strong><span>Review route-equivalence, conflict flags and policy evidence.</span></div></Link>
        <Link to="/operations/evidence" className="partner-admin-governance-card"><FileCheck2 size={20} aria-hidden="true" /><div><strong>Operations evidence</strong><span>Inspect bounded offline/reconciliation evidence without inheriting settlement authority.</span></div></Link>
      </section>

      <div className="portal-boundary-banner">
        <ShieldCheck size={20} aria-hidden="true" />
        <div><strong>Configuration visibility is not activation authority.</strong> No control on this screen can enable a provider, expand role scope, issue credentials, approve a regulated capability, post to PartnerFI accounts or settle funds.</div>
      </div>
      <EvidenceDrawer model={evidence} onClose={() => setEvidence(null)} />
    </section>
  );
}
