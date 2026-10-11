import { CustomerWorkbench } from "../components/CustomerWorkbench";
export default function OnboardAgent() {
  return (
    <>
      <p className="p-6">
        Synthetic customer verification demonstration only. Agent admission, TIN
        checks and supervisor approval remain disabled pending authenticated
        partner workflows.
      </p>
      <CustomerWorkbench title="Mock identity workflow" />
    </>
  );
}
