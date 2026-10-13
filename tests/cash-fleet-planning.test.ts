import assert from "node:assert/strict";
import test from "node:test";
import {
  LiquidityPlanningSourceSchema,
  SYNTHETIC_CASH_FLEET_POLICY,
  buildSyntheticLiquidityMatchPlan,
  syntheticLiquidityPlanningSources,
} from "../src/domain/cashFleetPlanning";

test("synthetic Cash Fleet keeps custody, dispatch, handover, movement and PartnerFI posting disabled", () => {
  assert.deepEqual(
    {
      mode: SYNTHETIC_CASH_FLEET_POLICY.mode,
      custodyAuthorized: SYNTHETIC_CASH_FLEET_POLICY.custodyAuthorized,
      dispatchAuthorized: SYNTHETIC_CASH_FLEET_POLICY.dispatchAuthorized,
      handoverAuthorized: SYNTHETIC_CASH_FLEET_POLICY.handoverAuthorized,
      cashMovementAuthorized: SYNTHETIC_CASH_FLEET_POLICY.cashMovementAuthorized,
      partnerFiPostingAuthorized: SYNTHETIC_CASH_FLEET_POLICY.partnerFiPostingAuthorized,
      commercialSettlementAuthorized:
        SYNTHETIC_CASH_FLEET_POLICY.commercialSettlementAuthorized,
    },
    {
      mode: "PLANNING_SIMULATION_ONLY",
      custodyAuthorized: false,
      dispatchAuthorized: false,
      handoverAuthorized: false,
      cashMovementAuthorized: false,
      partnerFiPostingAuthorized: false,
      commercialSettlementAuthorized: false,
    },
  );

  for (const source of syntheticLiquidityPlanningSources) {
    assert.equal(source.capabilityState, "SIMULATION_ONLY");
    assert.equal(source.custodyAuthorized, false);
    assert.equal(source.dispatchAuthorized, false);
    assert.equal(source.handoverAuthorized, false);
    assert.equal(source.digitalPostingAuthorized, false);
    assert.equal(
      source.capacityMeaning,
      "SYNTHETIC_PLANNING_CAPACITY_NOT_CONFIRMED_CASH",
    );
  }
});

test("2H planning deterministically matches the priority synthetic shortfall", () => {
  const plan = buildSyntheticLiquidityMatchPlan("2H");

  assert.equal(plan.totalPriorityShortfallMinor, 1_500_000);
  assert.equal(plan.totalPlannedMatchMinor, 1_500_000);
  assert.equal(plan.unmatchedShortfallMinor, 0);
  assert.equal(plan.recommendations.length, 1);
  assert.deepEqual(
    {
      horizon: plan.recommendations[0]?.horizon,
      agentId: plan.recommendations[0]?.agentId,
      sourceId: plan.recommendations[0]?.sourceId,
      plannedAmountMinor: plan.recommendations[0]?.plannedAmountMinor,
      remainingAgentShortfallAfterMatchMinor:
        plan.recommendations[0]?.remainingAgentShortfallAfterMatchMinor,
      status: plan.recommendations[0]?.status,
      authorityBoundary: plan.recommendations[0]?.authorityBoundary,
    },
    {
      horizon: "2H",
      agentId: "synthetic-agent-charlie",
      sourceId: "synthetic-source-cash-fleet-central",
      plannedAmountMinor: 1_500_000,
      remainingAgentShortfallAfterMatchMinor: 0,
      status: "PLANNING_MATCH_ONLY",
      authorityBoundary:
        "NO_CUSTODY_DISPATCH_HANDOVER_CASH_MOVEMENT_OR_PARTNERFI_POSTING",
    },
  );
});

test("EOD planning does not over-allocate shared synthetic planning capacity", () => {
  const plan = buildSyntheticLiquidityMatchPlan("EOD");

  assert.equal(plan.totalPriorityShortfallMinor, 11_000_000);
  assert.equal(plan.sourcePlanningCapacityMinor, 9_500_000);
  assert.equal(plan.totalPlannedMatchMinor, 9_000_000);
  assert.equal(plan.unmatchedShortfallMinor, 2_000_000);
  assert.equal(plan.sourcePlanningCapacityRemainingMinor, 500_000);

  const allocatedBySource = new Map<string, number>();
  for (const recommendation of plan.recommendations) {
    allocatedBySource.set(
      recommendation.sourceId,
      (allocatedBySource.get(recommendation.sourceId) ?? 0) +
        recommendation.plannedAmountMinor,
    );
    assert.equal(recommendation.status, "PLANNING_MATCH_ONLY");
  }

  for (const source of syntheticLiquidityPlanningSources) {
    assert.ok(
      (allocatedBySource.get(source.sourceId) ?? 0) <= source.planningCapacityMinor,
    );
  }
});

test("planning source schema fails closed on asserted dispatch authority", () => {
  const source = syntheticLiquidityPlanningSources[0];
  assert.throws(() =>
    LiquidityPlanningSourceSchema.parse({
      ...source,
      dispatchAuthorized: true,
    }),
  );
});

test("liquidity matching rejects unsupported horizons", () => {
  assert.throws(() => buildSyntheticLiquidityMatchPlan("24H" as never));
});
