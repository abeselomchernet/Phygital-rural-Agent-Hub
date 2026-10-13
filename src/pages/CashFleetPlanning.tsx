import { useState } from "react";
import { CapabilityBadge } from "../components/ProductPresentation";
import {
  buildSyntheticLiquidityMatchPlan,
  syntheticLiquidityPlanningSources,
  SYNTHETIC_CASH_FLEET_POLICY,
} from "../domain/cashFleetPlanning";
import {
  liquidityHorizons,
  type LiquidityHorizon,
} from "../domain/networkLiquidity";

const formatEtb = (minor: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(minor / 100);

export default function CashFleetPlanning() {
  const [horizon, setHorizon] = useState<LiquidityHorizon>("EOD");
  const plan = buildSyntheticLiquidityMatchPlan(horizon);

  return (
    <section data-testid="cash-fleet-planning-console" className="space-y-6">
      <div className="section-heading">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Cash Fleet & liquidity-match planning</h1>
        <p>
          Stage 3 planning simulation that matches synthetic NLC/LCI shortfalls
          with hypothetical Cash Fleet or FMCG-route planning capacity. It does
          not establish cash on hand, custody, dispatch, handover or settlement.
        </p>
      </div>

      <section className="product-card" data-testid="cash-fleet-boundary">
        <h2>Authority boundary</h2>
        <p>
          Planning only. No real cash movement, PartnerFI posting, fleet
          dispatch, physical handover or commercial settlement is authorized.
        </p>
        <ul className="stock-list">
          <li>
            <span>Mode</span>
            <strong>{SYNTHETIC_CASH_FLEET_POLICY.mode}</strong>
          </li>
          <li>
            <span>Cash custody / movement</span>
            <strong>Disabled</strong>
          </li>
          <li>
            <span>Dispatch / handover</span>
            <strong>Disabled</strong>
          </li>
          <li>
            <span>PartnerFI posting</span>
            <strong>Disabled</strong>
          </li>
        </ul>
        <p className="caption">
          “Planning capacity” is a synthetic scenario input, not confirmed cash,
          inventory, account balance or entitlement.
        </p>
      </section>

      <section className="product-card">
        <h2>Planning horizon</h2>
        <label htmlFor="cash-fleet-horizon">NLC/LCI horizon</label>
        <select
          id="cash-fleet-horizon"
          value={horizon}
          onChange={(event) =>
            setHorizon(event.target.value as LiquidityHorizon)
          }
        >
          {liquidityHorizons.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </section>

      <div className="product-grid" data-testid="cash-fleet-plan-summary">
        <section className="product-card">
          <h2>Priority shortfall</h2>
          <div className="scenario-number">
            {formatEtb(plan.totalPriorityShortfallMinor)}
            <span>synthetic forecast gap</span>
          </div>
        </section>
        <section className="product-card">
          <h2>Planned match</h2>
          <div className="scenario-number">
            {formatEtb(plan.totalPlannedMatchMinor)}
            <span>simulation only</span>
          </div>
        </section>
        <section className="product-card">
          <h2>Unmatched shortfall</h2>
          <div className="scenario-number">
            {formatEtb(plan.unmatchedShortfallMinor)}
            <span>requires further planning</span>
          </div>
        </section>
      </div>

      <section className="product-card" data-testid="cash-fleet-sources">
        <h2>Synthetic planning sources</h2>
        <p>
          These fixtures represent hypothetical routing capacity only. They do
          not assert physical cash availability or partner authorization.
        </p>
        <div className="product-grid">
          {syntheticLiquidityPlanningSources.map((source) => (
            <article className="product-card" key={source.sourceId}>
              <CapabilityBadge state="SYNTHETIC DEMO" />
              <h3>{source.displayName}</h3>
              <p>{source.sourceType.replaceAll("_", " ")}</p>
              <ul className="stock-list">
                <li>
                  <span>Planning capacity</span>
                  <strong>{formatEtb(source.planningCapacityMinor)}</strong>
                </li>
                <li>
                  <span>Illustrative ETA</span>
                  <strong>{source.etaMinutes} min</strong>
                </li>
                <li>
                  <span>Capability</span>
                  <strong>{source.capabilityState}</strong>
                </li>
              </ul>
              <p className="caption">Route ref: {source.routeRef}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="product-card" data-testid="liquidity-match-recommendations">
        <h2>Liquidity-match recommendations</h2>
        <p>
          Deterministic planning suggestions generated from synthetic shortfalls,
          route eligibility, ETA and remaining synthetic planning capacity.
        </p>
        {plan.recommendations.length === 0 ? (
          <p>No synthetic replenishment match is required for this horizon.</p>
        ) : (
          <ol className="space-y-3">
            {plan.recommendations.map((match) => (
              <li className="sample-slip" key={match.matchId}>
                <strong>
                  {match.agentDisplayName} ← {match.sourceDisplayName}
                </strong>
                <p>
                  Plan {formatEtb(match.plannedAmountMinor)} · ETA {match.etaMinutes}
                  min · {match.status}
                </p>
                <p>
                  Remaining synthetic shortfall after this match: {" "}
                  {formatEtb(match.remainingAgentShortfallAfterMatchMinor)}
                </p>
                <p className="caption">
                  {match.routeRef} · No custody, dispatch, handover, cash movement
                  or PartnerFI posting.
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="product-card">
        <h2>What comes later</h2>
        <p>
          Live Cash Fleet operations require separately approved custody,
          authorized handlers, limits, physical security, handover evidence,
          incident procedures, accounting/reconciliation and PartnerFI or other
          contractual authority. None is inferred from this simulation.
        </p>
      </section>
    </section>
  );
}
