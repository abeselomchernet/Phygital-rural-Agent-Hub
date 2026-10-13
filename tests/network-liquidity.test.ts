import assert from "node:assert/strict";
import test from "node:test";
import {
  SYNTHETIC_LIQUIDITY_POLICY,
  SyntheticAgentLiquiditySchema,
  calculateAgentLiquidityCoverage,
  calculateLiquidityCoverage,
  calculateNetworkLiquidityCoverage,
  classifyLiquidityCoverage,
  liquidityHorizons,
  priorityReplenishments,
  syntheticAgentLiquidityFixtures,
} from "../src/domain/networkLiquidity";

test("synthetic NLC fixtures are strict, bounded and contain the four governed horizons", () => {
  assert.equal(syntheticAgentLiquidityFixtures.length, 3);
  assert.deepEqual(liquidityHorizons, ["2H", "4H", "8H", "EOD"]);

  for (const fixture of syntheticAgentLiquidityFixtures) {
    assert.equal(SyntheticAgentLiquiditySchema.safeParse(fixture).success, true);
    assert.match(fixture.agentId, /^synthetic-agent-/);
    assert.equal(fixture.currency, "ETB");
    assert.equal(fixture.source, "SYNTHETIC_FIXED_FIXTURE");
  }
});

test("network NLC/LCI produces deterministic synthetic horizon states", () => {
  const coverage = calculateNetworkLiquidityCoverage();
  assert.deepEqual(
    coverage.map((entry) => [entry.horizon, entry.lciPercent, entry.state]),
    [
      ["2H", 120.5, "HEALTHY"],
      ["4H", 104.4, "WATCH"],
      ["8H", 85.5, "REBALANCE"],
      ["EOD", 68.1, "CRITICAL"],
    ],
  );
});

test("state thresholds are explicitly synthetic and deterministic", () => {
  assert.equal(classifyLiquidityCoverage(115), "HEALTHY");
  assert.equal(classifyLiquidityCoverage(114.9), "WATCH");
  assert.equal(classifyLiquidityCoverage(100), "WATCH");
  assert.equal(classifyLiquidityCoverage(99.9), "REBALANCE");
  assert.equal(classifyLiquidityCoverage(85), "REBALANCE");
  assert.equal(classifyLiquidityCoverage(84.9), "CRITICAL");

  assert.equal(SYNTHETIC_LIQUIDITY_POLICY.regulatoryStatus, "NOT_PRUDENTIAL_LCR");
  assert.equal(SYNTHETIC_LIQUIDITY_POLICY.partnerFiPostingEnabled, false);
  assert.equal(SYNTHETIC_LIQUIDITY_POLICY.cashMovementEnabled, false);
  assert.equal(SYNTHETIC_LIQUIDITY_POLICY.dispatchEnabled, false);
});

test("agent horizon calculations preserve shortfall/surplus rather than implying movement", () => {
  const charlie = syntheticAgentLiquidityFixtures.find(
    (fixture) => fixture.agentId === "synthetic-agent-charlie",
  );
  assert.ok(charlie);

  const coverage = calculateAgentLiquidityCoverage(charlie);
  const twoHour = coverage.find((entry) => entry.horizon === "2H");
  assert.ok(twoHour);
  assert.equal(twoHour.lciPercent, 75);
  assert.equal(twoHour.state, "CRITICAL");
  assert.equal(twoHour.shortfallMinor, 1_500_000);
  assert.equal(twoHour.surplusMinor, 0);

  const priorities = priorityReplenishments("2H");
  assert.deepEqual(priorities.map((entry) => entry.agentId), ["synthetic-agent-charlie"]);
  assert.equal(priorities[0]?.shortfallMinor, 1_500_000);
});

test("coverage fails closed on zero requirements, invalid percentages and empty networks", () => {
  assert.throws(() => calculateLiquidityCoverage(100, 0, "2H"));
  assert.throws(() => classifyLiquidityCoverage(Number.NaN), /LIQUIDITY_COVERAGE_INVALID_PERCENT/);
  assert.throws(() => calculateNetworkLiquidityCoverage([]), /LIQUIDITY_NETWORK_REQUIRES_AGENT_FIXTURES/);
});
