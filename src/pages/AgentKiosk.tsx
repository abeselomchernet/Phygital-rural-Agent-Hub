import { CustomerWorkbench } from "../components/CustomerWorkbench";
import AgentFieldStatus from "../components/AgentFieldStatus";
import { useCapabilityWorkspace } from "../components/CapabilityWorkspaceShell";
import BoundedState from "../components/BoundedState";
import {
  InventoryDemo,
  LiquidityDemo,
  HardwareDemo,
  TrainingDemo,
  usePresentationCopy,
} from "../components/ProductPresentation";
export default function AgentKiosk() {
  const t = usePresentationCopy();
  const workspace = useCapabilityWorkspace();
  if (!workspace) return <BoundedState kind="unavailable" title="Workspace unavailable">No customer workflow is mounted.</BoundedState>;
  if (workspace.role !== "AGENT") return <BoundedState kind="denied" title="Agent Terminal unavailable for this role">The current session is unchanged. Server authorization remains authoritative.</BoundedState>;
  return (
    <section className="agent-kiosk-page">
      <AgentFieldStatus compact />
      <CustomerWorkbench title={t.kiosk} />
      <div className="product-grid">
        <InventoryDemo />
        <LiquidityDemo />
        <HardwareDemo />
        <TrainingDemo />
      </div>
    </section>
  );
}
