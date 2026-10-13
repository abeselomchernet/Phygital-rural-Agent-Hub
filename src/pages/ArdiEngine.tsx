import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CapabilityBadge,
  ProductCard,
} from "../components/ProductPresentation";

type LiquidityState = "Healthy" | "Watch" | "Rebalance" | "Critical";

function classifyLci(lciPercent: number): LiquidityState {
  if (lciPercent >= 115) return "Healthy";
  if (lciPercent >= 100) return "Watch";
  if (lciPercent >= 85) return "Rebalance";
  return "Critical";
}

export default function ArdiEngine() {
  const [consistency, setConsistency] = useState(70);
  const [resilience, setResilience] = useState(65);
  const [serviceUse, setServiceUse] = useState(60);
  const [availableLiquidity, setAvailableLiquidity] = useState(100000);
  const [forecastRequirement, setForecastRequirement] = useState(90000);

  const farmerScenarioIndex = useMemo(
    () => Math.round(consistency * 0.4 + resilience * 0.35 + serviceUse * 0.25),
    [consistency, resilience, serviceUse],
  );

  const lciPercent = useMemo(
    () =>
      forecastRequirement > 0
        ? Math.round((availableLiquidity / forecastRequirement) * 100)
        : 0,
    [availableLiquidity, forecastRequirement],
  );
  const liquidityState = classifyLci(lciPercent);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <section className="product-card space-y-4" data-testid="ardi-boundary">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Ardi planning calculator</h1>
        <p>
          Transparent arithmetic illustrations for synthetic planning only. Ardi is
          not an AI provider, credit bureau, underwriting engine, PartnerFI decision
          service or entitlement mechanism.
        </p>
        <p className="boundary-note">
          Outputs do not approve credit, set customer or agent limits, authorize cash
          movement, create a regulated liquidity ratio or establish settlement.
        </p>
      </section>

      <div className="product-grid">
        <ProductCard title="Farmer service scenario index" state="SYNTHETIC DEMO">
          <p>
            A simple 0–100 weighted illustration for comparing synthetic service
            scenarios. It is not a farmer credit score or eligibility decision.
          </p>
          <label>
            Transaction consistency scenario: {consistency}
            <input
              aria-label="Transaction consistency scenario"
              type="range"
              min="0"
              max="100"
              value={consistency}
              onChange={(e) => setConsistency(Number(e.target.value))}
            />
          </label>
          <label>
            Resilience scenario: {resilience}
            <input
              aria-label="Resilience scenario"
              type="range"
              min="0"
              max="100"
              value={resilience}
              onChange={(e) => setResilience(Number(e.target.value))}
            />
          </label>
          <label>
            Service-use scenario: {serviceUse}
            <input
              aria-label="Service-use scenario"
              type="range"
              min="0"
              max="100"
              value={serviceUse}
              onChange={(e) => setServiceUse(Number(e.target.value))}
            />
          </label>
          <div className="scenario-number" data-testid="farmer-scenario-index">
            {farmerScenarioIndex}
            <span>synthetic scenario index</span>
          </div>
          <p className="caption">
            Weights: consistency 40%, resilience 35%, service-use 25%. No external
            data, model inference or PartnerFI policy is applied.
          </p>
        </ProductCard>

        <ProductCard title="Agent liquidity scenario" state="SYNTHETIC DEMO">
          <p>
            Uses the Stage 3 Liquidity Coverage Index terminology for a synthetic
            operational scenario. It is not prudential regulatory LCR.
          </p>
          <label>
            Available operational-liquidity proxy (ETB)
            <input
              aria-label="Available operational-liquidity proxy"
              type="number"
              min="0"
              value={availableLiquidity}
              onChange={(e) => setAvailableLiquidity(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label>
            Forecast required liquidity (ETB)
            <input
              aria-label="Forecast required liquidity"
              type="number"
              min="1"
              value={forecastRequirement}
              onChange={(e) => setForecastRequirement(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <div className="scenario-number" data-testid="ardi-lci">
            {lciPercent}%
            <span>synthetic LCI · {liquidityState}</span>
          </div>
          <p className="caption">
            Demo bands: Healthy ≥115%, Watch ≥100%, Rebalance ≥85%, Critical &lt;85%.
            These are synthetic test thresholds, not partner-approved operating limits.
          </p>
          <Link to="/liquidity" className="text-link">
            Open governed Network Liquidity Console
          </Link>
        </ProductCard>
      </div>

      <ProductCard
        title="Authority boundary"
        state="DISABLED PENDING PARTNER AUTHORIZATION"
      >
        <p>
          No limit assignment, lending decision, agent grade, cash dispatch, partner
          posting, provider call or customer entitlement can be produced from these
          calculations.
        </p>
      </ProductCard>
    </div>
  );
}
