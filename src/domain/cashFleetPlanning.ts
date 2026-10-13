import { z } from "zod";
import {
  LiquidityHorizonSchema,
  SyntheticAgentLiquiditySchema,
  priorityReplenishments,
  syntheticAgentLiquidityFixtures,
  type LiquidityHorizon,
  type SyntheticAgentLiquidity,
} from "./networkLiquidity";

export const SYNTHETIC_CASH_FLEET_POLICY = {
  mode: "PLANNING_SIMULATION_ONLY",
  custodyAuthorized: false,
  dispatchAuthorized: false,
  handoverAuthorized: false,
  cashMovementAuthorized: false,
  partnerFiPostingAuthorized: false,
  commercialSettlementAuthorized: false,
  sourceCapacityMeaning: "SYNTHETIC_PLANNING_CAPACITY_NOT_CONFIRMED_CASH",
} as const;

const AmountMinorSchema = z.number().int().nonnegative().max(100_000_000_000);
const PositiveAmountMinorSchema = z.number().int().positive().max(100_000_000_000);

export const LiquidityPlanningSourceSchema = z
  .object({
    sourceId: z.string().regex(/^synthetic-source-[a-z0-9-]+$/),
    partnerOrgId: z.enum(["synthetic-cash-fleet", "synthetic-fmcg"]),
    sourceType: z.enum(["CASH_FLEET", "FMCG_ROUTE"]),
    displayName: z.string().min(1).max(120),
    planningArea: z.string().min(1).max(80),
    eligiblePlanningAreas: z.array(z.string().min(1).max(80)).min(1).max(12),
    currency: z.literal("ETB"),
    planningCapacityMinor: PositiveAmountMinorSchema,
    etaMinutes: z.number().int().positive().max(480),
    routeRef: z.string().regex(/^synthetic-route-plan-[a-z0-9-]+$/),
    capabilityState: z.literal("SIMULATION_ONLY"),
    capacityMeaning: z.literal("SYNTHETIC_PLANNING_CAPACITY_NOT_CONFIRMED_CASH"),
    custodyAuthorized: z.literal(false),
    dispatchAuthorized: z.literal(false),
    handoverAuthorized: z.literal(false),
    digitalPostingAuthorized: z.literal(false),
  })
  .strict();
export type LiquidityPlanningSource = z.infer<typeof LiquidityPlanningSourceSchema>;

export const LiquidityMatchRecommendationSchema = z
  .object({
    matchId: z.string().regex(/^synthetic-match-[a-z0-9-]+$/),
    horizon: LiquidityHorizonSchema,
    agentId: z.string().regex(/^synthetic-agent-[a-z0-9-]+$/),
    agentDisplayName: z.string().min(1).max(80),
    planningArea: z.string().min(1).max(80),
    sourceId: z.string().regex(/^synthetic-source-[a-z0-9-]+$/),
    sourceDisplayName: z.string().min(1).max(120),
    sourceType: z.enum(["CASH_FLEET", "FMCG_ROUTE"]),
    partnerOrgId: z.enum(["synthetic-cash-fleet", "synthetic-fmcg"]),
    plannedAmountMinor: PositiveAmountMinorSchema,
    etaMinutes: z.number().int().positive().max(480),
    routeRef: z.string().regex(/^synthetic-route-plan-[a-z0-9-]+$/),
    remainingAgentShortfallAfterMatchMinor: AmountMinorSchema,
    status: z.literal("PLANNING_MATCH_ONLY"),
    authorityBoundary: z.literal(
      "NO_CUSTODY_DISPATCH_HANDOVER_CASH_MOVEMENT_OR_PARTNERFI_POSTING",
    ),
  })
  .strict();
export type LiquidityMatchRecommendation = z.infer<
  typeof LiquidityMatchRecommendationSchema
>;

export const LiquidityMatchPlanSchema = z
  .object({
    horizon: LiquidityHorizonSchema,
    totalPriorityShortfallMinor: AmountMinorSchema,
    totalPlannedMatchMinor: AmountMinorSchema,
    unmatchedShortfallMinor: AmountMinorSchema,
    sourcePlanningCapacityMinor: AmountMinorSchema,
    sourcePlanningCapacityRemainingMinor: AmountMinorSchema,
    recommendations: z.array(LiquidityMatchRecommendationSchema).max(100),
    mode: z.literal("PLANNING_SIMULATION_ONLY"),
    cashMovementAuthorized: z.literal(false),
    partnerFiPostingAuthorized: z.literal(false),
  })
  .strict();
export type LiquidityMatchPlan = z.infer<typeof LiquidityMatchPlanSchema>;

export const syntheticLiquidityPlanningSources: readonly LiquidityPlanningSource[] = [
  {
    sourceId: "synthetic-source-cash-fleet-east",
    partnerOrgId: "synthetic-cash-fleet",
    sourceType: "CASH_FLEET",
    displayName: "Synthetic Cash Fleet · East route",
    planningArea: "Synthetic East corridor",
    eligiblePlanningAreas: ["Synthetic East corridor", "Synthetic Central corridor"],
    currency: "ETB",
    planningCapacityMinor: 4_000_000,
    etaMinutes: 28,
    routeRef: "synthetic-route-plan-east",
    capabilityState: "SIMULATION_ONLY",
    capacityMeaning: "SYNTHETIC_PLANNING_CAPACITY_NOT_CONFIRMED_CASH",
    custodyAuthorized: false,
    dispatchAuthorized: false,
    handoverAuthorized: false,
    digitalPostingAuthorized: false,
  },
  {
    sourceId: "synthetic-source-cash-fleet-central",
    partnerOrgId: "synthetic-cash-fleet",
    sourceType: "CASH_FLEET",
    displayName: "Synthetic Cash Fleet · Central route",
    planningArea: "Synthetic Central corridor",
    eligiblePlanningAreas: ["Synthetic Central corridor", "Synthetic South corridor"],
    currency: "ETB",
    planningCapacityMinor: 2_500_000,
    etaMinutes: 20,
    routeRef: "synthetic-route-plan-central",
    capabilityState: "SIMULATION_ONLY",
    capacityMeaning: "SYNTHETIC_PLANNING_CAPACITY_NOT_CONFIRMED_CASH",
    custodyAuthorized: false,
    dispatchAuthorized: false,
    handoverAuthorized: false,
    digitalPostingAuthorized: false,
  },
  {
    sourceId: "synthetic-source-fmcg-south",
    partnerOrgId: "synthetic-fmcg",
    sourceType: "FMCG_ROUTE",
    displayName: "Synthetic FMCG route · South corridor",
    planningArea: "Synthetic South corridor",
    eligiblePlanningAreas: ["Synthetic South corridor"],
    currency: "ETB",
    planningCapacityMinor: 3_000_000,
    etaMinutes: 35,
    routeRef: "synthetic-route-plan-fmcg-south",
    capabilityState: "SIMULATION_ONLY",
    capacityMeaning: "SYNTHETIC_PLANNING_CAPACITY_NOT_CONFIRMED_CASH",
    custodyAuthorized: false,
    dispatchAuthorized: false,
    handoverAuthorized: false,
    digitalPostingAuthorized: false,
  },
].map((source) => LiquidityPlanningSourceSchema.parse(source));

function stableMatchId(
  horizon: LiquidityHorizon,
  agentId: string,
  sourceId: string,
  sequence: number,
) {
  return `synthetic-match-${horizon.toLowerCase()}-${agentId.replace("synthetic-agent-", "")}-${sourceId.replace("synthetic-source-", "")}-${sequence}`;
}

export function buildSyntheticLiquidityMatchPlan(
  horizon: LiquidityHorizon,
  agents: readonly SyntheticAgentLiquidity[] = syntheticAgentLiquidityFixtures,
  sources: readonly LiquidityPlanningSource[] = syntheticLiquidityPlanningSources,
): LiquidityMatchPlan {
  const parsedHorizon = LiquidityHorizonSchema.parse(horizon);
  const parsedAgents = agents.map((agent) => SyntheticAgentLiquiditySchema.parse(agent));
  const parsedSources = sources.map((source) => LiquidityPlanningSourceSchema.parse(source));

  const priorities = priorityReplenishments(parsedHorizon, parsedAgents);
  const totalPriorityShortfallMinor = priorities.reduce(
    (sum, entry) => sum + entry.shortfallMinor,
    0,
  );
  const sourcePlanningCapacityMinor = parsedSources.reduce(
    (sum, source) => sum + source.planningCapacityMinor,
    0,
  );

  const capacityRemaining = new Map(
    parsedSources.map((source) => [source.sourceId, source.planningCapacityMinor]),
  );
  const recommendations: LiquidityMatchRecommendation[] = [];
  let sequence = 1;

  for (const priority of priorities) {
    let remainingShortfall = priority.shortfallMinor;
    const eligibleSources = parsedSources
      .filter((source) => source.eligiblePlanningAreas.includes(priority.planningArea))
      .sort((a, b) => a.etaMinutes - b.etaMinutes || a.sourceId.localeCompare(b.sourceId));

    for (const source of eligibleSources) {
      if (remainingShortfall <= 0) break;
      const remainingCapacity = capacityRemaining.get(source.sourceId) ?? 0;
      if (remainingCapacity <= 0) continue;

      const plannedAmountMinor = Math.min(remainingShortfall, remainingCapacity);
      remainingShortfall -= plannedAmountMinor;
      capacityRemaining.set(source.sourceId, remainingCapacity - plannedAmountMinor);

      recommendations.push(
        LiquidityMatchRecommendationSchema.parse({
          matchId: stableMatchId(parsedHorizon, priority.agentId, source.sourceId, sequence++),
          horizon: parsedHorizon,
          agentId: priority.agentId,
          agentDisplayName: priority.displayName,
          planningArea: priority.planningArea,
          sourceId: source.sourceId,
          sourceDisplayName: source.displayName,
          sourceType: source.sourceType,
          partnerOrgId: source.partnerOrgId,
          plannedAmountMinor,
          etaMinutes: source.etaMinutes,
          routeRef: source.routeRef,
          remainingAgentShortfallAfterMatchMinor: remainingShortfall,
          status: "PLANNING_MATCH_ONLY",
          authorityBoundary:
            "NO_CUSTODY_DISPATCH_HANDOVER_CASH_MOVEMENT_OR_PARTNERFI_POSTING",
        }),
      );
    }
  }

  const totalPlannedMatchMinor = recommendations.reduce(
    (sum, entry) => sum + entry.plannedAmountMinor,
    0,
  );
  const sourcePlanningCapacityRemainingMinor = Array.from(
    capacityRemaining.values(),
  ).reduce((sum, amount) => sum + amount, 0);

  return LiquidityMatchPlanSchema.parse({
    horizon: parsedHorizon,
    totalPriorityShortfallMinor,
    totalPlannedMatchMinor,
    unmatchedShortfallMinor: Math.max(
      totalPriorityShortfallMinor - totalPlannedMatchMinor,
      0,
    ),
    sourcePlanningCapacityMinor,
    sourcePlanningCapacityRemainingMinor,
    recommendations,
    mode: "PLANNING_SIMULATION_ONLY",
    cashMovementAuthorized: false,
    partnerFiPostingAuthorized: false,
  });
}
