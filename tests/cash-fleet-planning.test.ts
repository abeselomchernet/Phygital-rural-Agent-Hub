import { describe, expect, it } from "vitest";
import {
  LiquidityPlanningSourceSchema,
  SYNTHETIC_CASH_FLEET_POLICY,
  buildSyntheticLiquidityMatchPlan,
  syntheticLiquidityPlanningSources,
} from "../src/domain/cashFleetPlanning";

describe("synthetic Cash Fleet and liquidity-match planning", () => {
  it("keeps custody, dispatch, handover, cash movement and PartnerFI posting disabled", () => {
    expect(SYNTHETIC_CASH_FLEET_POLICY).toMatchObject({
      mode: "PLANNING_SIMULATION_ONLY",
      custodyAuthorized: false,
      dispatchAuthorized: false,
      handoverAuthorized: false,
      cashMovementAuthorized: false,
      partnerFiPostingAuthorized: false,
      commercialSettlementAuthorized: false,
    });

    for (const source of syntheticLiquidityPlanningSources) {
      expect(source.capabilityState).toBe("SIMULATION_ONLY");
      expect(source.custodyAuthorized).toBe(false);
      expect(source.dispatchAuthorized).toBe(false);
      expect(source.handoverAuthorized).toBe(false);
      expect(source.digitalPostingAuthorized).toBe(false);
      expect(source.capacityMeaning).toBe(
        "SYNTHETIC_PLANNING_CAPACITY_NOT_CONFIRMED_CASH",
      );
    }
  });

  it("builds a deterministic 2H match for the priority synthetic shortfall", () => {
    const plan = buildSyntheticLiquidityMatchPlan("2H");

    expect(plan.totalPriorityShortfallMinor).toBe(1_500_000);
    expect(plan.totalPlannedMatchMinor).toBe(1_500_000);
    expect(plan.unmatchedShortfallMinor).toBe(0);
    expect(plan.recommendations).toHaveLength(1);
    expect(plan.recommendations[0]).toMatchObject({
      horizon: "2H",
      agentId: "synthetic-agent-charlie",
      sourceId: "synthetic-source-cash-fleet-central",
      plannedAmountMinor: 1_500_000,
      remainingAgentShortfallAfterMatchMinor: 0,
      status: "PLANNING_MATCH_ONLY",
      authorityBoundary:
        "NO_CUSTODY_DISPATCH_HANDOVER_CASH_MOVEMENT_OR_PARTNERFI_POSTING",
    });
  });

  it("does not over-allocate shared synthetic planning capacity at EOD", () => {
    const plan = buildSyntheticLiquidityMatchPlan("EOD");

    expect(plan.totalPriorityShortfallMinor).toBe(11_000_000);
    expect(plan.sourcePlanningCapacityMinor).toBe(9_500_000);
    expect(plan.totalPlannedMatchMinor).toBe(9_000_000);
    expect(plan.unmatchedShortfallMinor).toBe(2_000_000);
    expect(plan.sourcePlanningCapacityRemainingMinor).toBe(500_000);

    const allocatedBySource = new Map<string, number>();
    for (const recommendation of plan.recommendations) {
      allocatedBySource.set(
        recommendation.sourceId,
        (allocatedBySource.get(recommendation.sourceId) ?? 0) +
          recommendation.plannedAmountMinor,
      );
      expect(recommendation.status).toBe("PLANNING_MATCH_ONLY");
    }

    for (const source of syntheticLiquidityPlanningSources) {
      expect(allocatedBySource.get(source.sourceId) ?? 0).toBeLessThanOrEqual(
        source.planningCapacityMinor,
      );
    }
  });

  it("fails closed if a planning source tries to assert dispatch authority", () => {
    const source = syntheticLiquidityPlanningSources[0];
    expect(() =>
      LiquidityPlanningSourceSchema.parse({
        ...source,
        dispatchAuthorized: true,
      }),
    ).toThrow();
  });

  it("rejects an unsupported liquidity horizon", () => {
    expect(() => buildSyntheticLiquidityMatchPlan("24H" as never)).toThrow();
  });
});
