import { Building2, Network, ShieldCheck } from "lucide-react";

import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import { GovernedStatus, toneForGovernedState } from "../components/GovernedStatus";
import {
  partnerEcosystemSummary,
  routeProvenanceLabel,
  syntheticPartnerOrganizations,
  syntheticRouteProvenance,
  type CapabilitySwitchState,
  type PartnerClass,
} from "../domain/partnerEcosystem";
import "../components/partner-admin.css";

const classLabel: Record<PartnerClass, string> = {
  FINANCIAL_INSTITUTION: "Financial Institution",
  PAYMENT_GATEWAY_SYSTEM_OPERATOR: "Payment Gateway / System Operator",
  MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER: "Mobile Money / Payment Instrument Issuer",
  TELCO_COMMUNICATIONS: "Telco / Communications",
  IDENTITY_PROVIDER: "Identity Provider",
  FMCG_DISTRIBUTOR_MERCHANT: "FMCG / Distributor / Merchant",
  CASH_LOGISTICS_FLEET: "Cash Logistics / Fleet",
};

const stateLabel: Record<CapabilitySwitchState, string> = {
  DISABLED: "Disabled",
  FOUNDATION_ONLY: "Foundation only / route activation gated",
  SIMULATION_ONLY: "Simulation only",
  SANDBOX_BOUNDED: "Sandbox bounded",
};

export default function PartnerEcosystem() {
  const workspace = useCapabilityWorkspace();

  if (!workspace) {
    return <section className="portal-page"><div className="portal-boundary-banner">Workspace context unavailable. No partner visibility is inferred.</div></section>;
  }

  const ecosystemRole =
    workspace.role === "SUPERVISOR" ||
    workspace.role === "OPERATIONS" ||
    workspace.role === "PARTNER_ADMIN"
      ? workspace.role
      : null;

  if (!ecosystemRole) {
    return (
      <section className="portal-page" data-testid="partner-ecosystem-access-denied">
        <div className="portal-boundary-banner">
          <ShieldCheck size={20} aria-hidden="true" />
          <div><strong>Partner Ecosystem evidence is not available to the Agent role.</strong>Direct navigation does not expand the authenticated workspace or server-side authority.</div>
        </div>
      </section>
    );
  }

  const visibleOrganizations = syntheticPartnerOrganizations.filter((partner) =>
    partner.authorizedRoles.includes(ecosystemRole),
  );
  const permittedRoutes = new Set(visibleOrganizations.flatMap((partner) => partner.permittedRoutes));
  const visibleRoutes = syntheticRouteProvenance.filter((route) => permittedRoutes.has(route.integrationRoute));
  const summary = partnerEcosystemSummary(visibleOrganizations);

  return (
    <section className="partner-ecosystem-page" data-testid="partner-ecosystem-console">
      <header className="partner-ecosystem-hero">
        <span className="wl-kicker">Role-scoped ecosystem evidence</span>
        <h1>Partner Ecosystem</h1>
        <p>
          Synthetic partner classes, capability states and route provenance visible to the authenticated {workspace.role.replaceAll("_", " ")} workspace. Hidden objects remain hidden; absence is not interpreted as approval or denial.
        </p>
        <div className="partner-admin-card-meta">
          <GovernedStatus label="STAGE_4" />
          <GovernedStatus label="READ_ONLY" />
          <GovernedStatus label="NO_ROUTE_ACTIVATION_AUTHORITY" tone="blocked" />
        </div>
      </header>

      <div className="portal-summary-grid" data-testid="partner-ecosystem-summary">
        <article className="portal-summary-card"><span>Visible partner objects</span><strong>{summary.partnerOrganizations}</strong></article>
        <article className="portal-summary-card"><span>Sandbox bounded</span><strong>{summary.sandboxBounded}</strong></article>
        <article className="portal-summary-card"><span>Foundation only</span><strong>{summary.foundationOnly}</strong></article>
        <article className="portal-summary-card"><span>Disabled capabilities</span><strong>{summary.disabled}</strong></article>
      </div>

      <section className="partner-admin-panel" aria-labelledby="partner-objects-title">
        <div className="partner-admin-panel-heading">
          <div className="partner-admin-icon"><Building2 size={20} aria-hidden="true" /></div>
          <div><span className="wl-kicker">Partner objects</span><h2 id="partner-objects-title">Organizations & capability states</h2><p>Visibility follows each synthetic partner object's authorized role list.</p></div>
        </div>
        <div className="partner-ecosystem-grid">
          {visibleOrganizations.map((partner) => (
            <article key={partner.partnerOrgId} className="partner-ecosystem-card" data-testid={`partner-${partner.partnerOrgId}`}>
              <div className="partner-admin-card-meta"><GovernedStatus label={partner.environment} /><GovernedStatus label={classLabel[partner.partnerClass]} /></div>
              <h3>{partner.displayName}</h3>
              <div className="partner-admin-mini-list">
                <div><dt>Permitted data classes</dt><dd>{partner.permittedDataClasses.join(", ") || "None"}</dd></div>
                <div><dt>Declared routes</dt><dd>{partner.permittedRoutes.join(", ") || "None"}</dd></div>
              </div>
              <div>
                {partner.capabilitySwitches.map((entry) => (
                  <div className="partner-capability-row" key={entry.capability}>
                    <div className="partner-admin-card-meta"><GovernedStatus label={stateLabel[entry.state]} tone={toneForGovernedState(entry.state)} /></div>
                    <strong>{entry.capability}</strong>
                    <p>{entry.reason}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="partner-admin-panel" data-testid="route-provenance" aria-labelledby="route-provenance-title">
        <div className="partner-admin-panel-heading">
          <div className="partner-admin-icon"><Network size={20} aria-hidden="true" /></div>
          <div><span className="wl-kicker">Route provenance</span><h2 id="route-provenance-title">Visible route references</h2><p>A declared route reference is evidence only. It does not mean the route is mounted, executable, contractually active or authorized for settlement.</p></div>
        </div>
        {visibleRoutes.length === 0 ? (
          <div className="partner-admin-empty"><strong>No route provenance visible for this role.</strong>No route state is inferred.</div>
        ) : (
          <div className="partner-ecosystem-grid">
            {visibleRoutes.map((route) => (
              <article className="partner-route-card" key={route.routeId}>
                <div className="partner-admin-card-meta"><GovernedStatus label={stateLabel[route.state]} tone={toneForGovernedState(route.state)} /></div>
                <h3>{route.integrationRoute}</h3>
                <code>{routeProvenanceLabel(route)}</code>
                <p>{route.authorityBoundary}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="portal-boundary-banner">
        <ShieldCheck size={20} aria-hidden="true" />
        <div><strong>Provider foundation is not provider activation.</strong>No real cash custody, dispatch authority, handover authority, PartnerFI posting, settlement or production credential authority is granted here. This page exposes role-scoped synthetic governance evidence only.</div>
      </div>
    </section>
  );
}
