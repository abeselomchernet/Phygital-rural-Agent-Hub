import { CustomerWorkbench } from "../components/CustomerWorkbench";
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
    <>
      <CustomerWorkbench title={t.kiosk} />
      <div className="product-grid">
        <InventoryDemo />
        <LiquidityDemo />
        <HardwareDemo />
        <TrainingDemo />
      </div>
    </>
  );
}
