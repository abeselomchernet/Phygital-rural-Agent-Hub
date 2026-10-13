import { z } from "zod";

export const LiquidityHorizonSchema = z.enum(["2H", "4H", "8H", "EOD"]);
export type LiquidityHorizon = z.infer<typeof LiquidityHorizonSchema>;

export const LiquidityStateSchema = z.enum([
  "HEALTHY",
  "WATCH",
  "REBALANCE",
  "CRITICAL",
]);
export type LiquidityState = z.infer<typeof LiquidityStateSchema>;

export const SYNTHETIC_LIQUIDITY_POLICY = {
  metricName: "Network Liquidity Coverage",
  metricAbbreviation: "NLC",
  indexName: "Liquidity Coverage Index",
  indexAbbreviation: "LCI",
  formula:
    "synthetic available operational liquidity / synthetic forecast required liquidity",
  calibrationStatus: "SYNTHETIC_NOT_PARTNER_CALIBRATED",
  regulatoryStatus: "NOT_PRUDENTIAL_LCR",
  partnerFiPostingEnabled: false,
  cashMovementEnabled: false,
  dispatchEnabled: false,
  thresholdsPercent: {
    healthyAtOrAbove: 115,
    watchAtOrAbove: 100,
    rebalanceAtOrAbove: 85,
  },
} as const;

const AmountMinorSchema = z.number().int().nonnegative().max(100_000_000_000);
const RequiredAmountMinorSchema = z.number().int().positive().max(100_000_000_000);

export const SyntheticAgentLiquiditySchema = z
  .object({
    agentId: z.string().regex(/^synthetic-agent-[a-z0-9-]+$/),
    displayName: z.string().min(1).max(80),
    planningArea: z.string().min(1).max(80),
    currency: z.literal("ETB"),
    availableOperationalLiquidityMinor: AmountMinorSchema,
    forecastRequiredLiquidityMinor: z
      .object({
        "2H": RequiredAmountMinorSchema,
        "4H": RequiredAmountMinorSchema,
        "8H": RequiredAmountMinorSchema,
        EOD: RequiredAmountMinorSchema,
      })
      .strict(),
    source: z.literal("SYNTHETIC_FIXED_FIXTURE"),
  })
  .strict();
export type SyntheticAgentLiquidity = z.infer<typeof SyntheticAgentLiquiditySchema>;

export const LiquidityCoverageResultSchema = z
  .object({
    horizon: LiquidityHorizonSchema,
    availableOperationalLiquidityMinor: AmountMinorSchema,
    forecastRequiredLiquidityMinor: RequiredAmountMinorSchema,
    lciPercent: z.number().finite().nonnegative(),
    state: LiquidityStateSchema,
    shortfallMinor: AmountMinorSchema,
    surplusMinor: AmountMinorSchema,
  })
  .strict();
export type LiquidityCoverageResult = z.infer<typeof LiquidityCoverageResultSchema>;

export const liquidityHorizons: readonly LiquidityHorizon[] = [
  "2H",
  "4H",
  "8H",
  "EOD",
];

export const syntheticAgentLiquidityFixtures: readonly SyntheticAgentLiquidity[] = [
  {
    agentId: "synthetic-agent-alpha",
    displayName: "Agent Alpha",
    planningArea: "Synthetic East corridor",
    currency: "ETB",
    availableOperationalLiquidityMinor: 12_000_000,
    forecastRequiredLiquidityMinor: {
      "2H": 7_000_000,
      "4H": 8_500_000,
      "8H": 10_000_000,
      EOD: 12_500_000,
    },
    source: "SYNTHETIC_FIXED_FIXTURE",
  },
  {
    agentId: "synthetic-agent-bravo",
    displayName: "Agent Bravo",
    planningArea: "Synthetic Central corridor",
    currency: "ETB",
    availableOperationalLiquidityMinor: 7_000_000,
    forecastRequiredLiquidityMinor: {
      "2H": 6_500_000,
      "4H": 7_000_000,
      "8H": 8_500_000,
      EOD: 10_000_000,
    },
    source: "SYNTHETIC_FIXED_FIXTURE",
  },
  {
    agentId: "synthetic-agent-charlie",
    displayName: "Agent Charlie",
    planningArea: "Synthetic South corridor",
    currency: "ETB",
    availableOperationalLiquidityMinor: 4_500_000,
    forecastRequiredLiquidityMinor: {
      "2H": 6_000_000,
      "4H": 7_000_000,
      "8H": 9_000_000,
      EOD: 12_000_000,
    },
    source: "SYNTHETIC_FIXED_FIXTURE",
  },
].map((fixture) => SyntheticAgentLiquiditySchema.parse(fixture));

export function classifyLiquidityCoverage(lciPercent: number): LiquidityState {
  if (!Number.isFinite(lciPercent) || lciPercent < 0) {
    throw new Error("LIQUIDITY_COVERAGE_INVALID_PERCENT");
  }
  if (lciPercent >= SYNTHETIC_LIQUIDITY_POLICY.thresholdsPercent.healthyAtOrAbove) {
    return "HEALTHY";
  }
  if (lciPercent >= SYNTHETIC_LIQUIDITY_POLICY.thresholdsPercent.watchAtOrAbove) {
    return "WATCH";
  }
  if (lciPercent >= SYNTHETIC_LIQUIDITY_POLICY.thresholdsPercent.rebalanceAtOrAbove) {
    return "REBALANCE";
  }
  return "CRITICAL";
}

export function calculateLiquidityCoverage(
  availableOperationalLiquidityMinor: number,
  forecastRequiredLiquidityMinor: number,
  horizon: LiquidityHorizon,
): LiquidityCoverageResult {
  const available = AmountMinorSchema.parse(availableOperationalLiquidityMinor);
  const required = RequiredAmountMinorSchema.parse(forecastRequiredLiquidityMinor);
  const parsedHorizon = LiquidityHorizonSchema.parse(horizon);
  const lciPercent = Math.round((available / required) * 1000) / 10;

  return LiquidityCoverageResultSchema.parse({
    horizon: parsedHorizon,
    availableOperationalLiquidityMinor: available,
    forecastRequiredLiquidityMinor: required,
    lciPercent,
    state: classifyLiquidityCoverage(lciPercent),
    shortfallMinor: Math.max(required - available, 0),
    surplusMinor: Math.max(available - required, 0),
  });
}

export function calculateAgentLiquidityCoverage(
  agent: SyntheticAgentLiquidity,
): readonly LiquidityCoverageResult[] {
  const parsed = SyntheticAgentLiquiditySchema.parse(agent);
  return liquidityHorizons.map((horizon) =>
    calculateLiquidityCoverage(
      parsed.availableOperationalLiquidityMinor,
      parsed.forecastRequiredLiquidityMinor[horizon],
      horizon,
    ),
  );
}

export function calculateNetworkLiquidityCoverage(
  agents: readonly SyntheticAgentLiquidity[] = syntheticAgentLiquidityFixtures,
): readonly LiquidityCoverageResult[] {
  const parsedAgents = agents.map((agent) => SyntheticAgentLiquiditySchema.parse(agent));
  if (parsedAgents.length === 0) {
    throw new Error("LIQUIDITY_NETWORK_REQUIRES_AGENT_FIXTURES");
  }

  const available = parsedAgents.reduce(
    (sum, agent) => sum + agent.availableOperationalLiquidityMinor,
    0,
  );

  return liquidityHorizons.map((horizon) => {
    const required = parsedAgents.reduce(
      (sum, agent) => sum + agent.forecastRequiredLiquidityMinor[horizon],
      0,
    );
    return calculateLiquidityCoverage(available, required, horizon);
  });
}

export function priorityReplenishments(
  horizon: LiquidityHorizon,
  agents: readonly SyntheticAgentLiquidity[] = syntheticAgentLiquidityFixtures,
) {
  const parsedHorizon = LiquidityHorizonSchema.parse(horizon);
  return agents
    .map((agent) => {
      const parsed = SyntheticAgentLiquiditySchema.parse(agent);
      const coverage = calculateLiquidityCoverage(
        parsed.availableOperationalLiquidityMinor,
        parsed.forecastRequiredLiquidityMinor[parsedHorizon],
        parsedHorizon,
      );
      return {
        agentId: parsed.agentId,
        displayName: parsed.displayName,
        planningArea: parsed.planningArea,
        horizon: parsedHorizon,
        lciPercent: coverage.lciPercent,
        state: coverage.state,
        shortfallMinor: coverage.shortfallMinor,
      } as const;
    })
    .filter((entry) => entry.shortfallMinor > 0)
    .sort((a, b) => b.shortfallMinor - a.shortfallMinor);
}
