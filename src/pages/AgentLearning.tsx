import {
  CapabilityBadge,
  OnboardingWalkthrough,
  ProductCard,
  TrainingDemo,
} from "../components/ProductPresentation";

export default function AgentLearning() {
  return (
    <>
      <section className="product-card space-y-4" data-testid="agent-learning-boundary">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Agent learning</h1>
        <p>
          Practice-only learning surface for service boundaries, offline handling and
          escalation concepts. Completion here is not certification, employment,
          appointment or permission to perform regulated activity.
        </p>
        <p className="boundary-note">
          Formal curriculum, assessment records and partner-recognized certification
          remain future governed capabilities.
        </p>
      </section>
      <div className="product-grid">
        <TrainingDemo />
        <OnboardingWalkthrough />
        <ProductCard title="Learning evidence" state="PROPOSED">
          <p>
            Future staging may capture governed course versions, completion evidence
            and reviewer sign-off. No such institutional learning record is created
            by this synthetic demo.
          </p>
        </ProductCard>
      </div>
    </>
  );
}
