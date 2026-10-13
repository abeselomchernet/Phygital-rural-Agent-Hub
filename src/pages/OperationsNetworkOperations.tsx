import { Link } from "react-router-dom";
import { CapabilityBadge } from "../components/ProductPresentation";
import OperationsReconciliation from "./OperationsReconciliation";

export default function OperationsNetworkOperations() {
  return (
    <div className="space-y-6" data-testid="operations-network-operations">
      <section className="product-card">
        <CapabilityBadge state="IMPLEMENTED" />
        <h2>Network-operations access boundary</h2>
        <p>
          Supervisor and Partner Admin sessions may read bounded synthetic network
          objects. Provider reconciliation remains a separate bounded action on the
          provider-reconciliation object; it does not authorize PartnerFI posting or
          settlement.
        </p>
        <Link className="text-link" to="/network-operations">
          Review role & object access
        </Link>
      </section>

      <OperationsReconciliation />
    </div>
  );
}
