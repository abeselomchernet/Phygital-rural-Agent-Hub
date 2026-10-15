import { CustomerWorkbench } from "../components/CustomerWorkbench";
import AgentFieldStatus from "../components/AgentFieldStatus";
import {
  InventoryDemo,
  LiquidityDemo,
  HardwareDemo,
  TrainingDemo,
  usePresentationCopy,
} from "../components/ProductPresentation";
export default function AgentKiosk() {
  const t = usePresentationCopy();
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
