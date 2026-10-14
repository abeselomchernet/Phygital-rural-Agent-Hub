import { Link } from "react-router-dom";
import {
  CapabilityBadge,
  InventoryDemo,
} from "../components/ProductPresentation";
import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";

function AgentHome() {
  const workspace = useCapabilityWorkspace();
  return (
    <>
      <div className="section-heading">
        <h2>Agent workspace</h2>
        <p>
          Customer service, partner-published services and field resilience for the active governed partner context.
        </p>
      </div>
      <div className="product-grid">
        <section className="product-card" data-testid="agent-services-home-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Partner services</h2>
          <p>
            The available service set is resolved from the active partner catalog and capability policy rather than an institution-specific page.
          </p>
          <ul className="space-y-2">
            {(workspace?.services ?? []).map((service) => (
              <li key={service.serviceId}>{service.name}</li>
            ))}
          </ul>
          <Link to="/kiosk" className="text-link">
            Open Agent Terminal
          </Link>
        </section>
        <section className="product-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Farmer 360</h2>
          <p>
            Read-only agent-assisted customer/service context. It does not become farmer self-service or PartnerFI account authority.
          </p>
          <Link to="/farmer-360" className="text-link">
            Open Farmer 360
          </Link>
        </section>
        <InventoryDemo />
      </div>
    </>
  );
}

function SupervisorHome() {
  const workspace = useCapabilityWorkspace();
  const serviceTypes = new Set(
    (workspace?.services ?? []).map((service) => service.serviceType),
  );
  const hasFmcg = [...serviceTypes].some((serviceType) =>
    serviceType.startsWith("FMCG_"),
  );
  return (
    <>
      <div className="section-heading">
        <h2>Regional operations workspace</h2>
        <p>
          Scoped planning, network visibility and exception review. Modules appear only when the active partner service/capability policy supports them.
        </p>
      </div>
      <div className="product-grid">
        <section className="product-card" data-testid="supervisor-overview-home-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Regional overview</h2>
          <p>
            Review the bounded regional operations context without inheriting PartnerFI posting, provider activation or live cash authority.
          </p>
          <Link to="/supervisor" className="text-link">
            Open Regional Operations
          </Link>
        </section>
        {serviceTypes.has("NETWORK_LIQUIDITY_READ") && (
          <section className="product-card" data-testid="network-liquidity-home-card">
            <CapabilityBadge state="SYNTHETIC DEMO" />
            <h2>Network liquidity</h2>
            <p>
              NLC / Liquidity Coverage Index planning for 2H, 4H, 8H and EOD horizons. Synthetic decision support only; not regulatory LCR.
            </p>
            <Link to="/liquidity" className="text-link">
              Open Network Liquidity Console
            </Link>
          </section>
        )}
        {serviceTypes.has("FLEET_ROUTE_PLANNING") && (
          <section className="product-card" data-testid="cash-fleet-home-card">
            <CapabilityBadge state="SYNTHETIC DEMO" />
            <h2>Cash Fleet planning</h2>
            <p>
              Synthetic liquidity matching and route planning with no custody, dispatch, handover or cash movement authority.
            </p>
            <Link to="/cash-fleet" className="text-link">
              Open Cash Fleet Planning Console
            </Link>
          </section>
        )}
        {hasFmcg && (
          <section className="product-card" data-testid="fmcg-home-card">
            <CapabilityBadge state="SYNTHETIC DEMO" />
            <h2>FMCG inventory & logistics</h2>
            <p>
              Purpose-limited inventory, restock-draft and route planning. No live order, dispatch or settlement is authorized.
            </p>
            <Link to="/fmcg" className="text-link">
              Open FMCG Inventory & Logistics Console
            </Link>
          </section>
        )}
      </div>
    </>
  );
}

function OperationsHome() {
  const workspace = useCapabilityWorkspace();
  return (
    <>
      <div className="section-heading">
        <h2>Operations & reconciliation workspace</h2>
        <p>
          Provider evidence, route status and reconciliation are kept separate from PartnerFI settlement and production authorization.
        </p>
      </div>
      <div className="product-grid">
        <section className="product-card" data-testid="operations-home-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Operations & reconciliation</h2>
          <p>
            Governed ArifPay sandbox status checks and bounded provider evidence review.
          </p>
          <Link to="/operations" className="text-link">
            Open Operations & Reconciliation Center
          </Link>
        </section>
        {Boolean(workspace?.providerStates.length) && (
          <section className="product-card" data-testid="partner-ecosystem-home-card">
            <CapabilityBadge state="IMPLEMENTED" />
            <h2>Partner ecosystem</h2>
            <p>
              Provider registration, foundation state and route provenance without implying payment-route activation.
            </p>
            <Link to="/partners" className="text-link">
              Open Partner Ecosystem Console
            </Link>
          </section>
        )}
        <section className="product-card" data-testid="network-operations-home-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Network operations access</h2>
          <p>
            Operations receives bounded partner/provider evidence and reconciliation object scope, not Supervisor planning authority.
          </p>
          <Link to="/network-operations" className="text-link">
            Review Network Operations Access
          </Link>
        </section>
      </div>
    </>
  );
}

function PartnerAdminHome() {
  return (
    <>
      <div className="section-heading">
        <h2>Partner administration workspace</h2>
        <p>
          Partner configuration and evidence visibility remain subject to central capability, certification and environment gates.
        </p>
      </div>
      <div className="product-grid">
        <section className="product-card" data-testid="partner-ecosystem-home-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Partner ecosystem</h2>
          <p>
            Review partner classes, capability states, environment registration and route provenance.
          </p>
          <Link to="/partners" className="text-link">
            Open Partner Ecosystem Console
          </Link>
        </section>
        <section className="product-card" data-testid="network-operations-home-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Access & scopes</h2>
          <p>
            Review bounded role/object authorization. Client controls cannot override server policy.
          </p>
          <Link to="/network-operations" className="text-link">
            Review Network Operations Access
          </Link>
        </section>
        <section className="product-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Operations evidence</h2>
          <p>
            Review provider/reconciliation evidence without inheriting PartnerFI settlement authority.
          </p>
          <Link to="/operations" className="text-link">
            Open Operations evidence
          </Link>
        </section>
      </div>
    </>
  );
}

export default function CapabilityHome() {
  const workspace = useCapabilityWorkspace();
  if (!workspace || workspace.role === "AGENT") return <AgentHome />;
  if (workspace.role === "SUPERVISOR") return <SupervisorHome />;
  if (workspace.role === "OPERATIONS") return <OperationsHome />;
  return <PartnerAdminHome />;
}
