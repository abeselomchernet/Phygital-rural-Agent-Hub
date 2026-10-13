import { AlertTriangle, Droplets, Gauge, ShieldCheck } from "lucide-react";
import { CapabilityBadge } from "../components/ProductPresentation";
import {
  SYNTHETIC_LIQUIDITY_POLICY,
  calculateAgentLiquidityCoverage,
  calculateNetworkLiquidityCoverage,
  priorityReplenishments,
  syntheticAgentLiquidityFixtures,
  type LiquidityState,
} from "../domain/networkLiquidity";

const stateLabel: Record<LiquidityState, string> = {
  HEALTHY: "Healthy",
  WATCH: "Watch",
  REBALANCE: "Rebalance",
  CRITICAL: "Critical",
};

function etb(minor: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export default function NetworkLiquidity() {
  const networkCoverage = calculateNetworkLiquidityCoverage();
  const twoHourPriorities = priorityReplenishments("2H");

  return (
    <section className="max-w-6xl mx-auto space-y-6" data-testid="network-liquidity-console">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <CapabilityBadge state="IMPLEMENTED" />
          <CapabilityBadge state="SYNTHETIC DEMO" />
        </div>

        <div className="flex items-start gap-3">
          <Droplets className="h-7 w-7 text-indigo-400 mt-1" />
          <div>
            <h1 className="text-2xl font-black">Network Liquidity Coverage</h1>
            <p className="mt-2 text-slate-300">
              Synthetic NLC / Liquidity Coverage Index decision support for 2-hour,
              4-hour, 8-hour and end-of-day planning horizons. This is an operational
              planning metric, not a prudential regulatory Liquidity Coverage Ratio.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-4 text-sm text-amber-100" data-testid="nlc-calibration-boundary">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle className="h-4 w-4" /> Synthetic thresholds only
          </div>
          <p className="mt-2 text-amber-100/80">
            The numerator, denominator, exclusions, confidence treatment and state
            thresholds require PartnerFI/partner calibration before any live decisioning.
            No cash movement, dispatch or PartnerFI posting is enabled here.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="nlc-horizon-summary">
        {networkCoverage.map((coverage) => (
          <article key={coverage.horizon} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                {coverage.horizon === "EOD" ? "End of day" : coverage.horizon}
              </span>
              <Gauge className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <strong className="text-3xl">{coverage.lciPercent}%</strong>
              <p className="text-xs text-slate-500">Liquidity Coverage Index</p>
            </div>
            <p className="font-black text-sm">{stateLabel[coverage.state]}</p>
            <dl className="text-xs space-y-1 text-slate-400">
              <div className="flex justify-between gap-3">
                <dt>Synthetic available</dt>
                <dd>{etb(coverage.availableOperationalLiquidityMinor)} ETB</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Forecast required</dt>
                <dd>{etb(coverage.forecastRequiredLiquidityMinor)} ETB</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-400" />
          <div>
            <h2 className="font-black text-lg">Metric definition & synthetic state bands</h2>
            <p className="text-sm text-slate-400 mt-1">
              {SYNTHETIC_LIQUIDITY_POLICY.formula}
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <strong>Healthy</strong>
            <p className="text-slate-400 mt-1">LCI ≥ {SYNTHETIC_LIQUIDITY_POLICY.thresholdsPercent.healthyAtOrAbove}%</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <strong>Watch</strong>
            <p className="text-slate-400 mt-1">LCI ≥ {SYNTHETIC_LIQUIDITY_POLICY.thresholdsPercent.watchAtOrAbove}%</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <strong>Rebalance</strong>
            <p className="text-slate-400 mt-1">LCI ≥ {SYNTHETIC_LIQUIDITY_POLICY.thresholdsPercent.rebalanceAtOrAbove}%</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <strong>Critical</strong>
            <p className="text-slate-400 mt-1">Below {SYNTHETIC_LIQUIDITY_POLICY.thresholdsPercent.rebalanceAtOrAbove}%</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          These bands are deterministic synthetic-demo policy values only. They are not
          partner-approved operating limits and must not be presented as regulatory LCR
          compliance thresholds.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-4">
        <div>
          <h2 className="font-black text-lg">Synthetic agent horizon view</h2>
          <p className="text-sm text-slate-400 mt-1">
            Fixed cash/e-float planning fixtures only; no bank balances, customer funds or live agent accounts are read.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="nlc-agent-table">
            <thead className="text-left text-slate-500 border-b border-slate-800">
              <tr>
                <th className="py-3 pr-4">Synthetic agent</th>
                <th className="py-3 pr-4">Available</th>
                <th className="py-3 pr-4">2H</th>
                <th className="py-3 pr-4">4H</th>
                <th className="py-3 pr-4">8H</th>
                <th className="py-3">EOD</th>
              </tr>
            </thead>
            <tbody>
              {syntheticAgentLiquidityFixtures.map((agent) => {
                const coverage = calculateAgentLiquidityCoverage(agent);
                return (
                  <tr key={agent.agentId} className="border-b border-slate-900" data-testid={`nlc-${agent.agentId}`}>
                    <td className="py-4 pr-4">
                      <strong>{agent.displayName}</strong>
                      <p className="text-xs text-slate-500">{agent.planningArea}</p>
                    </td>
                    <td className="py-4 pr-4">{etb(agent.availableOperationalLiquidityMinor)} ETB</td>
                    {coverage.map((entry) => (
                      <td key={entry.horizon} className="py-4 pr-4">
                        <strong>{entry.lciPercent}%</strong>
                        <p className="text-xs text-slate-500">{stateLabel[entry.state]}</p>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-4" data-testid="nlc-priority-replenishments">
        <div>
          <h2 className="font-black text-lg">2-hour planning priorities</h2>
          <p className="text-sm text-slate-400 mt-1">
            Read-only replenishment signals. No fleet dispatch, handover, cash custody or value transfer occurs.
          </p>
        </div>
        {twoHourPriorities.length === 0 ? (
          <p className="text-sm text-slate-400">No synthetic 2-hour shortfall in the current fixture.</p>
        ) : (
          <div className="space-y-3">
            {twoHourPriorities.map((priority) => (
              <div key={priority.agentId} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong>{priority.displayName}</strong>
                  <p className="text-xs text-slate-500">{priority.planningArea} · {stateLabel[priority.state]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Synthetic shortfall</p>
                  <strong>{etb(priority.shortfallMinor)} ETB</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
