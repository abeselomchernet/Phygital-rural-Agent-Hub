import {
  CapabilityBadge,
  ProductCard,
  ServicePortfolio,
} from "../components/ProductPresentation";

const syntheticProfile = {
  customerRef: "SYN-FARMER-001",
  locality: "Synthetic rural service area",
  identityState: "MOCK_REFERENCE_ONLY",
  partnerAccountState: "NOT_CONNECTED",
};

export default function Farmer360() {
  return (
    <>
      <section className="product-card space-y-4" data-testid="farmer-360-overview">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Farmer 360 — agent-assisted customer overview</h1>
        <p>
          Read-only service context for an authorized agent or supervisor. This is
          not farmer self-service and it does not expose a transaction, account
          mutation, KYC decision or PartnerFI balance.
        </p>
        <div className="queue-summary">
          <div>
            <strong>{syntheticProfile.customerRef}</strong>Synthetic customer reference
          </div>
          <div>
            <strong>{syntheticProfile.identityState}</strong>Identity evidence
          </div>
          <div>
            <strong>{syntheticProfile.partnerAccountState}</strong>Partner account
          </div>
        </div>
        <p className="boundary-note">
          No real PII, Fayda lookup, bank balance, cash-in/cash-out control, credit
          entitlement or settlement authority is available on this surface.
        </p>
      </section>

      <div className="product-grid">
        <ProductCard title="Service context" state="SYNTHETIC DEMO">
          <p>{syntheticProfile.locality}</p>
          <p>
            Illustrative service interests may be reviewed without creating an
            application, order, policy, loan or payment.
          </p>
        </ProductCard>
        <ProductCard
          title="Partner authority boundary"
          state="DISABLED PENDING PARTNER AUTHORIZATION"
        >
          <p>
            Customer accounts, regulated KYC decisions, funds, posting, limits and
            final settlement remain with an authorized PartnerFI or other licensed
            partner where applicable.
          </p>
        </ProductCard>
      </div>

      <ServicePortfolio />
    </>
  );
}
