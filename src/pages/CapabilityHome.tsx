import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  Activity,
  BookOpenCheck,
  Boxes,
  Building2,
  ClipboardCheck,
  CloudOff,
  Gauge,
  HandCoins,
  Layers3,
  Network,
  PackageSearch,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";

import { CapabilityBadge } from "../components/ProductPresentation";
import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import "../components/portal-dashboard.css";

function displaySyntheticId(value: string | undefined, prefix: string) {
  if (!value) return "Unavailable";
  return value
    .replace(prefix, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="portal-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ActionCard({
  title,
  description,
  to,
  linkLabel,
  icon,
  state = "IMPLEMENTED",
  testId,
}: {
  title: string;
  description: string;
  to: string;
  linkLabel: string;
  icon: ReactNode;
  state?: "IMPLEMENTED" | "SYNTHETIC DEMO";
  testId?: string;
}) {
  return (
    <article className="portal-action-card" data-testid={testId}>
      <div className="card-top">
        <span className="portal-action-card-icon" aria-hidden="true">{icon}</span>
        <CapabilityBadge state={state} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link to={to} className="text-link">{linkLabel}</Link>
    </article>
  );
}

function PortalHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="portal-heading">
      <div>
        <span className="wl-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <span className="wl-status-chip">Stage 4 / Synthetic</span>
    </div>
  );
}

function BoundaryBanner({ children }: { children: ReactNode }) {
  return (
    <div className="portal-boundary-banner">
      <ShieldCheck size={20} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function AgentHome() {
  const workspace = useCapabilityWorkspace();
  const services = workspace?.services ?? [];
  return (
    <section className="portal-page">
      <PortalHeader
        kicker="Agent portal"
        title="Field service workspace"
        description="Task-first customer assistance, partner-published services and field resilience for the active governed PartnerFI context."
      />
      <div className="portal-summary-grid">
        <SummaryCard label="Partner" value={workspace?.partnerDisplayName ?? "Unavailable"} />
        <SummaryCard label="Published services" value={services.length} />
        <SummaryCard label="Hub" value={displaySyntheticId(workspace?.hubId, "hub_syn_")} />
        <SummaryCard label="Environment" value={workspace?.environment.toUpperCase() ?? "UNKNOWN"} />
      </div>
      <div className="portal-action-grid">
        <ActionCard
          testId="agent-services-home-card"
          title="Serve customer"
          description="Open the Agent Terminal with the service set resolved from the active partner catalog and capability policy."
          to="/kiosk"
          linkLabel="Open Agent Terminal"
          icon={<Store size={20} />}
        />
        <ActionCard
          title="Farmer 360"
          description="Read-only agent-assisted customer/service context. It does not become farmer self-service or PartnerFI account authority."
          to="/farmer-360"
          linkLabel="Open Farmer 360"
          icon={<UsersRound size={20} />}
        />
        <ActionCard
          title="Requests & offline queue"
          description="Review locally queued requests and sync state without treating transport or queue persistence as provider acceptance."
          to="/queue"
          linkLabel="Review offline requests"
          icon={<CloudOff size={20} />}
          state="SYNTHETIC DEMO"
        />
        <ActionCard
          title="Agent readiness"
          description="Review bounded onboarding/readiness information without implying production identity or device authorization."
          to="/onboard"
          linkLabel="Review readiness"
          icon={<ClipboardCheck size={20} />}
        />
        <ActionCard
          title="Agent learning"
          description="Open the field learning workspace and support materials for the current synthetic role context."
          to="/academy"
          linkLabel="Open learning"
          icon={<BookOpenCheck size={20} />}
        />
        <ActionCard
          title="Inventory & restock"
          description="Review synthetic inventory/restock concepts separately from live procurement, payment or dispatch authority."
          to="/inventory"
          linkLabel="Open inventory"
          icon={<Boxes size={20} />}
          state="SYNTHETIC DEMO"
        />
      </div>
      {services.length > 0 && (
        <section className="wl-card" style={{ padding: "1rem" }} aria-label="Partner-published services">
          <span className="wl-kicker">Available in this governed workspace</span>
          <div className="workspace-service-list" style={{ justifyContent: "flex-start", marginTop: "0.7rem" }}>
            {services.map((service) => <span className="workspace-service" key={service.serviceId}>{service.name}</span>)}
          </div>
        </section>
      )}
      <BoundaryBanner>
        <strong>Partner authority stays separate from the UI.</strong>
        Queueing, service visibility or a client-side confirmation does not prove provider authorization, posting or settlement.
      </BoundaryBanner>
    </section>
  );
}

function SupervisorHome() {
  const workspace = useCapabilityWorkspace();
  const serviceTypes = new Set((workspace?.services ?? []).map((service) => service.serviceType));
  const hasFmcg = [...serviceTypes].some((serviceType) => serviceType.startsWith("FMCG_"));
  return (
    <section className="portal-page">
      <PortalHeader
        kicker="Supervisor portal"
        title="Hub Operations"
        description="Hub-centered planning, network visibility and exception review. Decision support remains separate from PartnerFI posting, provider activation and geographic authorization."
      />
      <div className="portal-summary-grid">
        <SummaryCard label="Hub" value={displaySyntheticId(workspace?.hubId, "hub_syn_")} />
        <SummaryCard label="Region" value={displaySyntheticId(workspace?.regionId, "region_syn_")} />
        <SummaryCard label="Published services" value={workspace?.services.length ?? 0} />
        <SummaryCard label="Authority" value="Decision support only" />
      </div>
      <div className="portal-action-grid">
        <ActionCard
          testId="supervisor-overview-home-card"
          title="Hub overview"
          description="Start from governed Hub, partner, region, environment and authority context before opening specialist dashboards."
          to="/hub"
          linkLabel="Open Hub Overview"
          icon={<Building2 size={20} />}
        />
        <ActionCard
          title="Regional operations"
          description="Review the bounded regional operations context, network visibility and exception-oriented planning."
          to="/supervisor"
          linkLabel="Open Regional Operations"
          icon={<Network size={20} />}
        />
        {serviceTypes.has("NETWORK_LIQUIDITY_READ") && (
          <ActionCard
            testId="network-liquidity-home-card"
            title="Network liquidity"
            description="Synthetic NLC / liquidity planning across time horizons. This is not regulatory LCR and does not authorize cash movement."
            to="/liquidity"
            linkLabel="Open Network Liquidity"
            icon={<Gauge size={20} />}
            state="SYNTHETIC DEMO"
          />
        )}
        {serviceTypes.has("FLEET_ROUTE_PLANNING") && (
          <ActionCard
            testId="cash-fleet-home-card"
            title="Cash fleet planning"
            description="Synthetic route/liquidity planning with no custody, dispatch, handover or cash movement authority."
            to="/cash-fleet"
            linkLabel="Open Cash Fleet Planning"
            icon={<HandCoins size={20} />}
            state="SYNTHETIC DEMO"
          />
        )}
        {hasFmcg && (
          <ActionCard
            testId="fmcg-home-card"
            title="FMCG inventory & logistics"
            description="Purpose-limited inventory and route planning with no live order, dispatch or settlement authority."
            to="/fmcg"
            linkLabel="Open FMCG Console"
            icon={<PackageSearch size={20} />}
            state="SYNTHETIC DEMO"
          />
        )}
      </div>
      <BoundaryBanner>
        <strong>The Supervisor portal recommends and surfaces evidence; it does not authorize.</strong>
        Economics, Pilot Evidence, Corridor Planning, Readiness and Neutrality will join this Hub workspace from the existing governed APIs in the next frontend increments.
      </BoundaryBanner>
    </section>
  );
}

function OperationsHome() {
  const workspace = useCapabilityWorkspace();
  return (
    <section className="portal-page">
      <PortalHeader
        kicker="Operations portal"
        title="Operations & Reconciliation"
        description="Exception and evidence-first operations for provider state, route provenance, offline recovery and reconciliation without PartnerFI settlement authority."
      />
      <div className="portal-summary-grid">
        <SummaryCard label="Hub" value={displaySyntheticId(workspace?.hubId, "hub_syn_")} />
        <SummaryCard label="Provider foundations" value={workspace?.providerStates.length ?? 0} />
        <SummaryCard label="Published services" value={workspace?.services.length ?? 0} />
        <SummaryCard label="Settlement authority" value="Not granted" />
      </div>
      <div className="portal-action-grid">
        <ActionCard
          testId="operations-home-card"
          title="Operations center"
          description="Review bounded provider status, reconciliation evidence and uncertain operational outcomes."
          to="/operations"
          linkLabel="Open Operations Center"
          icon={<Activity size={20} />}
        />
        <ActionCard
          testId="partner-ecosystem-home-card"
          title="Partner ecosystem"
          description="Review provider registration, foundation state and route provenance without implying route activation."
          to="/partners"
          linkLabel="Open Partner Ecosystem"
          icon={<Layers3 size={20} />}
        />
        <ActionCard
          testId="network-operations-home-card"
          title="Network access & scopes"
          description="Review bounded partner/provider evidence and object scope without inheriting Supervisor planning authority."
          to="/network-operations"
          linkLabel="Review Network Access"
          icon={<ShieldCheck size={20} />}
        />
        <ActionCard
          title="Offline exceptions"
          description="Review queue and recovery state while keeping local persistence separate from provider acceptance/finality."
          to="/queue"
          linkLabel="Open exception queue"
          icon={<CloudOff size={20} />}
          state="SYNTHETIC DEMO"
        />
      </div>
      <BoundaryBanner>
        <strong>Operations is evidence/reconciliation, not settlement.</strong>
        Provider success, route availability and recovery evidence cannot be promoted into PartnerFI posting or production authority by the client.
      </BoundaryBanner>
    </section>
  );
}

function PartnerAdminHome() {
  const workspace = useCapabilityWorkspace();
  return (
    <section className="portal-page">
      <PortalHeader
        kicker="Partner administration portal"
        title="Partner Administration"
        description="Institution-scoped services, provider state, access visibility and governance evidence subject to central capability, certification and environment gates."
      />
      <div className="portal-summary-grid">
        <SummaryCard label="Partner" value={workspace?.partnerDisplayName ?? "Unavailable"} />
        <SummaryCard label="Hub" value={displaySyntheticId(workspace?.hubId, "hub_syn_")} />
        <SummaryCard label="Provider foundations" value={workspace?.providerStates.length ?? 0} />
        <SummaryCard label="Production authority" value="Not granted" />
      </div>
      <div className="portal-action-grid">
        <ActionCard
          testId="partner-ecosystem-home-card"
          title="Partner ecosystem"
          description="Review partner classes, capability states, environment registration and route provenance."
          to="/partners"
          linkLabel="Open Partner Ecosystem"
          icon={<Layers3 size={20} />}
        />
        <ActionCard
          testId="network-operations-home-card"
          title="Access & scopes"
          description="Review bounded role/object authorization. Client controls cannot override server policy."
          to="/network-operations"
          linkLabel="Review Access & Scopes"
          icon={<ShieldCheck size={20} />}
        />
        <ActionCard
          title="Operations evidence"
          description="Review provider and reconciliation evidence without inheriting PartnerFI settlement authority."
          to="/operations"
          linkLabel="Open Operations Evidence"
          icon={<Activity size={20} />}
        />
        <ActionCard
          title="Governed Hub context"
          description="Review the active Hub, partner, region and Stage-4 authority boundaries before future governance dashboards are integrated."
          to="/hub"
          linkLabel="Open Hub Overview"
          icon={<Building2 size={20} />}
        />
      </div>
      <BoundaryBanner>
        <strong>Configuration visibility is not activation authority.</strong>
        Higher administrative visibility cannot activate providers, grant regulated capability, settle funds or override environment/certification gates.
      </BoundaryBanner>
    </section>
  );
}

export default function CapabilityHome() {
  const workspace = useCapabilityWorkspace();
  if (!workspace || workspace.role === "AGENT") return <AgentHome />;
  if (workspace.role === "SUPERVISOR") return <SupervisorHome />;
  if (workspace.role === "OPERATIONS") return <OperationsHome />;
  return <PartnerAdminHome />;
}
