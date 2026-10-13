import { CapabilityBadge } from "../components/ProductPresentation";
import {
  SYNTHETIC_FMCG_POLICY,
  buildSyntheticFmcgInventoryLogisticsPlan,
  syntheticFmcgInventoryFixtures,
  syntheticFmcgPartnerProfile,
  syntheticFmcgPlanningRoutes,
} from "../domain/fmcgCommerce";

export default function FmcgCommerce() {
  const plan = buildSyntheticFmcgInventoryLogisticsPlan();

  return (
    <section className="space-y-6" data-testid="fmcg-console">
      <div className="section-heading">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h2>FMCG Inventory & Logistics Console</h2>
        <p>
          Stage 3 inventory and route-planning simulation for the synthetic FMCG
          partner. Drafts are planning artifacts only; no order, dispatch, delivery
          confirmation, settlement or PartnerFI posting is created.
        </p>
      </div>

      <div className="product-grid">
        <section className="product-card">
          <h3>Governed boundary</h3>
          <dl className="space-y-2 text-sm">
            <div><dt>Mode</dt><dd><strong>{SYNTHETIC_FMCG_POLICY.mode}</strong></dd></div>
            <div><dt>Live ordering</dt><dd><strong>Disabled</strong></dd></div>
            <div><dt>Dispatch</dt><dd><strong>Disabled</strong></dd></div>
            <div><dt>Commercial settlement</dt><dd><strong>Disabled</strong></dd></div>
            <div><dt>PartnerFI posting</dt><dd><strong>Disabled</strong></dd></div>
          </dl>
        </section>

        <section className="product-card" data-testid="fmcg-data-minimization">
          <h3>Data minimization</h3>
          <p>
            {syntheticFmcgPartnerProfile.displayName} receives only synthetic inventory,
            route and restock-draft references in this demo.
          </p>
          <ul>
            {syntheticFmcgPartnerProfile.permittedDataClasses.map((dataClass) => (
              <li key={dataClass}>{dataClass}</li>
            ))}
          </ul>
          <p>
            Customer KYC access: <strong>Disabled</strong><br />
            Customer bank-balance access: <strong>Disabled</strong>
          </p>
        </section>
      </div>

      <section className="product-card">
        <h3>Inventory snapshot</h3>
        <p className="caption">Fixed synthetic fixtures only.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-left p-2">Planning area</th>
                <th className="text-right p-2">On hand</th>
                <th className="text-right p-2">Reorder point</th>
                <th className="text-right p-2">Target</th>
              </tr>
            </thead>
            <tbody>
              {syntheticFmcgInventoryFixtures.map((item) => (
                <tr key={item.skuId}>
                  <td className="p-2">{item.displayName}</td>
                  <td className="p-2">{item.planningArea}</td>
                  <td className="p-2 text-right">{item.stockOnHandUnits} {item.unitLabel}</td>
                  <td className="p-2 text-right">{item.reorderPointUnits}</td>
                  <td className="p-2 text-right">{item.targetStockUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="product-grid">
        <section className="product-card">
          <h3>Planning summary</h3>
          <div className="scenario-number">
            {plan.lowStockItems}<span>low-stock synthetic items</span>
          </div>
          <p>
            Requested planning units: <strong>{plan.requestedUnits}</strong><br />
            Route-matched planning units: <strong>{plan.plannedUnits}</strong><br />
            Unmatched planning units: <strong>{plan.unmatchedUnits}</strong>
          </p>
        </section>

        <section className="product-card">
          <h3>Planning routes</h3>
          <ul>
            {syntheticFmcgPlanningRoutes.map((route) => (
              <li key={route.routeId}>
                <strong>{route.displayName}</strong> · {route.etaMinutes} min synthetic ETA ·
                {" "}{route.planningCapacityUnits} unit planning capacity
              </li>
            ))}
          </ul>
          <p className="caption">Route presence does not authorize dispatch.</p>
        </section>
      </div>

      <section className="product-card" data-testid="fmcg-restock-drafts">
        <h3>Restock planning drafts</h3>
        <p>
          These rows are read-only planning matches. They are not purchase orders,
          dispatch instructions, delivery records or settlement events.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Item</th>
                <th className="text-right p-2">Requested</th>
                <th className="text-right p-2">Planned</th>
                <th className="text-left p-2">Route</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.drafts.map((draft) => (
                <tr key={draft.draftId}>
                  <td className="p-2">{draft.displayName}</td>
                  <td className="p-2 text-right">{draft.requestedUnits}</td>
                  <td className="p-2 text-right">{draft.plannedUnits}</td>
                  <td className="p-2">{draft.routeDisplayName ?? "No eligible planning capacity"}</td>
                  <td className="p-2">{draft.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="caption" data-testid="fmcg-no-action-boundary">
        No live order submission · No dispatch · No delivery confirmation · No commercial
        settlement · No PartnerFI account mutation
      </p>
    </section>
  );
}
