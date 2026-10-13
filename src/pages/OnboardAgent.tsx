import {
  CapabilityBadge,
  OnboardingWalkthrough,
  ProductCard,
  TrainingDemo,
} from "../components/ProductPresentation";

export default function OnboardAgent() {
  return (
    <>
      <section className="product-card space-y-4" data-testid="agent-readiness-boundary">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Agent readiness</h1>
        <p>
          Agent admission and readiness concept only. This surface is separate from
          customer KYC and transaction-request workflows.
        </p>
        <div className="queue-summary">
          <div>
            <strong>Mock only</strong>Identity evidence
          </div>
          <div>
            <strong>Proposed</strong>Business / TIN review
          </div>
          <div>
            <strong>Synthetic</strong>Device readiness
          </div>
          <div>
            <strong>Not granted</strong>PartnerFI agent approval
          </div>
        </div>
        <p className="boundary-note">
          No agent application is submitted, no real identity or business data is
          verified, no device is provisioned and no authority to handle customer
          funds or cash is created here.
        </p>
      </section>

      <div className="product-grid">
        <OnboardingWalkthrough />
        <TrainingDemo />
        <ProductCard
          title="Admission authority"
          state="DISABLED PENDING PARTNER AUTHORIZATION"
        >
          <p>
            Final agent appointment, cash limits, custody, operating permissions and
            regulated-service access require the responsible licensed partner's
            approval and controls.
          </p>
        </ProductCard>
      </div>
    </>
  );
}
