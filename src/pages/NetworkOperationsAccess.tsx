import { Link } from "react-router-dom";
import { CapabilityBadge } from "../components/ProductPresentation";
import {
  networkOperationsAccessSummary,
  type NetworkOperationsRole,
} from "../domain/networkOperationsAuthorization";

const roles: readonly NetworkOperationsRole[] = [
  "AGENT",
  "SUPERVISOR",
  "PARTNER_ADMIN",
];

const roleLabel: Record<NetworkOperationsRole, string> = {
  AGENT: "Agent",
  SUPERVISOR: "Supervisor",
  PARTNER_ADMIN: "Partner Admin",
};

export default function NetworkOperationsAccess() {
  return (
    <section className="space-y-6" data-testid="network-operations-access">
      <div className="section-heading">
        <CapabilityBadge state="IMPLEMENTED" />
        <h1>Network Operations Access</h1>
        <p>
          Stage 3 synthetic role/object authorization model for network-operations
          surfaces. Access remains local-development/synthetic and does not establish
          institutional or regulated authority.
        </p>
      </div>

      <section className="product-card" data-testid="network-ops-policy-boundary">
        <CapabilityBadge state="DISABLED PENDING PARTNER AUTHORIZATION" />
        <h2>Hard authority boundary</h2>
        <p>
          The policy supports READ access and bounded provider-reconciliation access
          only. There is no network-operations action for cash movement, fleet dispatch,
          cash handover, FMCG ordering, PartnerFI posting or settlement.
        </p>
      </section>

      <div className="product-grid">
        {roles.map((role) => {
          const summary = networkOperationsAccessSummary(role);
          const readable = summary.filter((entry) => entry.canRead);
          const reconcilable = summary.filter(
            (entry) => entry.canReconcileProvider,
          );
          return (
            <section className="product-card" key={role} data-testid={`role-${role.toLowerCase()}`}>
              <CapabilityBadge
                state={role === "AGENT" ? "DISABLED PENDING PARTNER AUTHORIZATION" : "IMPLEMENTED"}
              />
              <h2>{roleLabel[role]}</h2>
              <p>
                Readable network objects: <strong>{readable.length}</strong>. Provider
                reconciliation objects: <strong>{reconcilable.length}</strong>.
              </p>
              {readable.length === 0 ? (
                <p>No Stage 3 network-operations object access.</p>
              ) : (
                <ul className="space-y-2">
                  {readable.map((entry) => (
                    <li key={entry.objectId}>
                      <strong>{entry.label}</strong>
                      <br />
                      <span>{entry.scope}</span>
                      <br />
                      <span>{entry.authorityBoundary}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="product-card">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h2>Governed workspaces</h2>
        <p>
          These links expose read-only or already-bounded workflows. The access model
          does not promote any planning artifact into an instruction or financial event.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <Link className="text-link" to="/supervisor">
            Supervisor / Regional Operations
          </Link>
          <Link className="text-link" to="/operations">
            Operations & Reconciliation
          </Link>
          <Link className="text-link" to="/liquidity">
            Network Liquidity
          </Link>
          <Link className="text-link" to="/cash-fleet">
            Cash Fleet Planning
          </Link>
          <Link className="text-link" to="/fmcg">
            FMCG Inventory & Logistics
          </Link>
          <Link className="text-link" to="/partners">
            Partner Ecosystem
          </Link>
        </div>
      </section>
    </section>
  );
}
