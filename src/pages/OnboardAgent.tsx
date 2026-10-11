import { CustomerWorkbench } from "../components/CustomerWorkbench";
import {
  OnboardingWalkthrough,
  TrainingDemo,
} from "../components/ProductPresentation";
export default function OnboardAgent() {
  return (
    <>
      <div className="product-grid">
        <OnboardingWalkthrough />
        <TrainingDemo />
      </div>
      <CustomerWorkbench title="Mock identity workflow" />
    </>
  );
}
