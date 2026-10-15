import { z } from "zod";

import {
  LiquidityMatchPlanSchema,
  buildSyntheticLiquidityMatchPlan,
  syntheticLiquidityPlanningSources,
  type LiquidityPlanningSource,
} from "./cashFleetPlanning";
import { computeCanonicalSha256 } from "./evidenceIntegrity";
import {
  HubIdSchema,
  HubTenantIdSchema,
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
} from "./hub";
import {
  LiquidityCoverageResultSchema,
  LiquidityHorizonSchema,
  calculateLiquidityCoverage,
  liquidityHorizons,
  type LiquidityHorizon,
  type SyntheticAgentLiquidity,
} from "./networkLiquidity";
import {
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
} from "./partnerCapabilityContract";
import { SYNTHETIC_PARTNER_IDS } from "./syntheticReferencePartners";

const AmountMinorSchema = z.number().int().nonnegative().max(100_000_000_000);
const RequiredAmountMinorSchema = z.number().int().positive().max(100_000_000_000);
const IsoTimestampSchema = z.string().datetime({ offset: true });
const UniqueEvidenceRefsSchema = z
  .array(PartnerEvidenceRefSchema)
  .min(1)
  .max(64)
  .refine((values) => new Set(values).size === values.length, {
    message: "evidence refs must be unique",
  });

const HorizonAmountSchema = z
  .object({
    "2H": AmountMinorSchema,
    "4H": AmountMinorSchema,
    "8H": AmountMinorSchema,
    EOD: AmountMinorSchema,
  })
  .strict();

const HorizonRequiredAmountSchema = z
  .object({
    "2H": RequiredAmountMinorSchema,
    "4H": RequiredAmountMinorSchema,
    "8H": RequiredAmountMinorSchema,
    EOD: RequiredAmountMinorSchema,
  })
  .strict();

export const SYNTHETIC_HUB_LIQUIDITY_POLICY = {
  metric: "NLC_LCI_SYNTHETIC_OPERATIONAL_COVERAGE",
  regulatoryMeaning: "NOT_PRUDENTIAL_LCR",
  observationMode: "SYNTHETIC_TIME_SERIES_ONLY",
  freshnessMinutes: {
    freshThrough: 15,
    agingThrough: 60,
  },
  confidencePenaltyPercent: {
    fresh: 0,
    aging: 15,
    stale: 40,
  },
  cashIndicatorMeaning: "SYNTHETIC_OPERATIONAL_INDICATOR_NOT_CONFIRMED_CUSTODY_CASH",
  digitalFloatIndicatorMeaning:
    "SYNTHETIC_OPERATIONAL_INDICATOR_NOT_CONFIRMED_PARTNERFI_BALANCE",
  scheduledDemandMeaning: "SYNTHETIC_PLANNING_INPUT_ONLY_NOT_DISBURSEMENT_AUTHORITY",
  recommendationMeaning: "DECISION_SUPPORT_ONLY_NO_EXECUTION_AUTHORITY",
  liveNetworkAllowed: false,
  cashMovementAuthorized: false,
  fleetDispatchAuthorized: false,
  partnerFiPostingAuthorized: false,
  settlementAuthorityGranted: false,
  productionAuthorityGranted: false,
} as const;

export const HubLiquidityFreshnessSchema = z.enum(["FRESH", "AGING", "STALE"]);
export type HubLiquidityFreshness = z.infer<typeof HubLiquidityFreshnessSchema>;

export const HubLiquidityConfidenceBandSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type HubLiquidityConfidenceBand = z.infer<
  typeof HubLiquidityConfidenceBandSchema
>;

export const HubLiquidityBalanceClassSchema = z.enum([
  "SURPLUS",
  "BALANCED",
  "SHORTAGE",
]);
export type HubLiquidityBalanceClass = z.infer<
  typeof HubLiquidityBalanceClassSchema
>;

export const HubLiquidityRecommendationSchema = z.enum([
  "MONITOR",
  "REVIEW_SYNTHETIC_REPLENISHMENT",
  "REVIEW_UNMATCHED_SYNTHETIC_SHORTFALL",
  "REFRESH_SOURCE_BEFORE_REVIEW",
]);
export type HubLiquidityRecommendation = z.infer<
  typeof HubLiquidityRecommendationSchema
>;

export const HubLiquidityObservationSchema = z
  .object({
    observationId: z.string().regex(/^hubliqobs_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    planningArea: z.string().min(1).max(80),
    currency: z.literal("ETB"),
    observedAt: IsoTimestampSchema,
    sourceClass: z.literal("SYNTHETIC_TIME_SERIES_FIXTURE"),
    sourceVersion: z.string().regex(/^hub-liquidity-synthetic-v[0-9]+$/),
    sourceConfidencePercent: z.number().int().min(0).max(100),
    availableOperationalCashIndicatorMinor: AmountMinorSchema,
    availableDigitalFloatIndicatorMinor: AmountMinorSchema,
    forecastBaselineRequiredLiquidityMinor: HorizonRequiredAmountSchema,
    scheduledBulkDemandMinor: HorizonAmountSchema,
    evidenceRefs: UniqueEvidenceRefsSchema,
    authority: z
      .object({
        realBalanceObserved: z.literal(false),
        custodyConfirmed: z.literal(false),
        partnerFiBalanceConfirmed: z.literal(false),
        governmentDisbursementAuthorized: z.literal(false),
        cashMovementAuthorized: z.literal(false),
        partnerFiPostingAuthorized: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubLiquidityObservation = z.infer<
  typeof HubLiquidityObservationSchema
>;

export const HubLiquidityConfidenceSchema = z
  .object({
    sourceConfidencePercent: z.number().int().min(0).max(100),
    effectiveConfidencePercent: z.number().int().min(0).max(100),
    band: HubLiquidityConfidenceBandSchema,
    freshness: HubLiquidityFreshnessSchema,
    ageMinutes: z.number().int().nonnegative(),
  })
  .strict();

export const HubLiquidityHorizonResultSchema = z
  .object({
    horizon: LiquidityHorizonSchema,
    availableOperationalLiquidityMinor: AmountMinorSchema,
    baselineRequiredLiquidityMinor: RequiredAmountMinorSchema,
    scheduledBulkDemandMinor: AmountMinorSchema,
    totalForecastRequiredLiquidityMinor: RequiredAmountMinorSchema,
    nlcPercent: z.number().finite().nonnegative(),
    lciPercent: z.number().finite().nonnegative(),
    state: LiquidityCoverageResultSchema.shape.state,
    balanceClass: HubLiquidityBalanceClassSchema,
    shortfallMinor: AmountMinorSchema,
    surplusMinor: AmountMinorSchema,
    recommendation: HubLiquidityRecommendationSchema,
    matchSimulation: LiquidityMatchPlanSchema,
  })
  .strict();
export type HubLiquidityHorizonResult = z.infer<
  typeof HubLiquidityHorizonResultSchema
>;

export const HubLiquiditySnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    snapshotId: z.string().regex(/^hubliq_[a-f0-9]{16}$/),
    snapshotDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    observationId: HubLiquidityObservationSchema.shape.observationId,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    planningArea: z.string().min(1).max(80),
    currency: z.literal("ETB"),
    observedAt: IsoTimestampSchema,
    evaluatedAt: IsoTimestampSchema,
    sourceClass: z.literal("SYNTHETIC_TIME_SERIES_FIXTURE"),
    sourceVersion: z.string().regex(/^hub-liquidity-synthetic-v[0-9]+$/),
    confidence: HubLiquidityConfidenceSchema,
    availableOperationalCashIndicatorMinor: AmountMinorSchema,
    availableDigitalFloatIndicatorMinor: AmountMinorSchema,
    availableOperationalLiquidityMinor: AmountMinorSchema,
    horizons: z.array(HubLiquidityHorizonResultSchema).length(4),
    evidenceRefs: UniqueEvidenceRefsSchema,
    boundaries: z
      .object({
        stage: z.literal("STAGE_4"),
        syntheticOnly: z.literal(true),
        metricIsPrudentialLcr: z.literal(false),
        realBalanceObserved: z.literal(false),
        liveNetworkAllowed: z.literal(false),
        cashMovementAuthorized: z.literal(false),
        fleetDispatchAuthorized: z.literal(false),
        partnerFiPostingAuthorized: z.literal(false),
        settlementAuthorityGranted: z.literal(false),
        productionAuthorityGranted: z.literal(false),
        scheduledDemandExecutesDisbursement: z.literal(false),
        recommendationExecutesAction: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubLiquiditySnapshot = z.infer<typeof HubLiquiditySnapshotSchema>;

export const HubLiquidityTimeSeriesSchema = z
  .object({
    schemaVersion: z.literal(1),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    evaluatedAt: IsoTimestampSchema,
    latestSnapshotId: HubLiquiditySnapshotSchema.shape.snapshotId,
    snapshots: z.array(HubLiquiditySnapshotSchema).min(1).max(500),
    boundaries: z
      .object({
        timeSeriesFriendly: z.literal(true),
        syntheticOnly: z.literal(true),
        readOnly: z.literal(true),
        prudentialLcrClaimed: z.literal(false),
        automaticCrossRailMovementAuthorized: z.literal(false),
        dispatchAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubLiquidityTimeSeries = z.infer<typeof HubLiquidityTimeSeriesSchema>;

function freshnessForAge(ageMinutes: number): HubLiquidityFreshness {
  if (ageMinutes <= SYNTHETIC_HUB_LIQUIDITY_POLICY.freshnessMinutes.freshThrough)
    return "FRESH";
  if (ageMinutes <= SYNTHETIC_HUB_LIQUIDITY_POLICY.freshnessMinutes.agingThrough)
    return "AGING";
  return "STALE";
}

function confidenceFor(input: {
  sourceConfidencePercent: number;
  ageMinutes: number;
}) {
  const freshness = freshnessForAge(input.ageMinutes);
  const penalty =
    freshness === "FRESH"
      ? SYNTHETIC_HUB_LIQUIDITY_POLICY.confidencePenaltyPercent.fresh
      : freshness === "AGING"
        ? SYNTHETIC_HUB_LIQUIDITY_POLICY.confidencePenaltyPercent.aging
        : SYNTHETIC_HUB_LIQUIDITY_POLICY.confidencePenaltyPercent.stale;
  const effectiveConfidencePercent = Math.max(
    0,
    input.sourceConfidencePercent - penalty,
  );
  const band: HubLiquidityConfidenceBand =
    effectiveConfidencePercent >= 80
      ? "HIGH"
      : effectiveConfidencePercent >= 60
        ? "MEDIUM"
        : "LOW";
  return HubLiquidityConfidenceSchema.parse({
    sourceConfidencePercent: input.sourceConfidencePercent,
    effectiveConfidencePercent,
    band,
    freshness,
    ageMinutes: input.ageMinutes,
  });
}

function observationAgeMinutes(observedAt: string, evaluatedAt: string) {
  const observed = Date.parse(observedAt);
  const evaluated = Date.parse(evaluatedAt);
  if (!Number.isFinite(observed) || !Number.isFinite(evaluated))
    throw new Error("HUB_LIQUIDITY_INVALID_TIMESTAMP");
  if (evaluated < observed) throw new Error("HUB_LIQUIDITY_FUTURE_OBSERVATION");
  return Math.floor((evaluated - observed) / 60_000);
}

function totalRequired(
  observation: HubLiquidityObservation,
  horizon: LiquidityHorizon,
) {
  return (
    observation.forecastBaselineRequiredLiquidityMinor[horizon] +
    observation.scheduledBulkDemandMinor[horizon]
  );
}

function asSyntheticHubAgent(
  observation: HubLiquidityObservation,
): SyntheticAgentLiquidity {
  return {
    agentId: `synthetic-agent-${observation.hubId.replace("hub_syn_", "hub-").replaceAll("_", "-")}`,
    displayName: `Synthetic Hub ${observation.hubId}`,
    planningArea: observation.planningArea,
    currency: "ETB",
    availableOperationalLiquidityMinor:
      observation.availableOperationalCashIndicatorMinor +
      observation.availableDigitalFloatIndicatorMinor,
    forecastRequiredLiquidityMinor: {
      "2H": totalRequired(observation, "2H"),
      "4H": totalRequired(observation, "4H"),
      "8H": totalRequired(observation, "8H"),
      EOD: totalRequired(observation, "EOD"),
    },
    source: "SYNTHETIC_FIXED_FIXTURE",
  };
}

function balanceClass(
  coverage: z.infer<typeof LiquidityCoverageResultSchema>,
): HubLiquidityBalanceClass {
  if (coverage.shortfallMinor > 0) return "SHORTAGE";
  if (coverage.surplusMinor > 0) return "SURPLUS";
  return "BALANCED";
}

function recommendationFor(input: {
  freshness: HubLiquidityFreshness;
  coverage: z.infer<typeof LiquidityCoverageResultSchema>;
  matchPlan: z.infer<typeof LiquidityMatchPlanSchema>;
}): HubLiquidityRecommendation {
  if (input.freshness === "STALE") return "REFRESH_SOURCE_BEFORE_REVIEW";
  if (input.coverage.shortfallMinor <= 0) return "MONITOR";
  if (input.matchPlan.unmatchedShortfallMinor > 0)
    return "REVIEW_UNMATCHED_SYNTHETIC_SHORTFALL";
  return "REVIEW_SYNTHETIC_REPLENISHMENT";
}

function snapshotCore(input: {
  observation: HubLiquidityObservation;
  evaluatedAt: string;
  planningSources: readonly LiquidityPlanningSource[];
}) {
  const observation = HubLiquidityObservationSchema.parse(input.observation);
  const evaluatedAt = IsoTimestampSchema.parse(input.evaluatedAt);
  const ageMinutes = observationAgeMinutes(observation.observedAt, evaluatedAt);
  const confidence = confidenceFor({
    sourceConfidencePercent: observation.sourceConfidencePercent,
    ageMinutes,
  });
  const agent = asSyntheticHubAgent(observation);
  const horizons = liquidityHorizons.map((horizon) => {
    const baselineRequiredLiquidityMinor =
      observation.forecastBaselineRequiredLiquidityMinor[horizon];
    const scheduledBulkDemandMinor = observation.scheduledBulkDemandMinor[horizon];
    const totalForecastRequiredLiquidityMinor =
      baselineRequiredLiquidityMinor + scheduledBulkDemandMinor;
    const coverage = calculateLiquidityCoverage(
      agent.availableOperationalLiquidityMinor,
      totalForecastRequiredLiquidityMinor,
      horizon,
    );
    const matchSimulation = buildSyntheticLiquidityMatchPlan(
      horizon,
      [agent],
      input.planningSources,
    );
    return HubLiquidityHorizonResultSchema.parse({
      horizon,
      availableOperationalLiquidityMinor:
        coverage.availableOperationalLiquidityMinor,
      baselineRequiredLiquidityMinor,
      scheduledBulkDemandMinor,
      totalForecastRequiredLiquidityMinor,
      nlcPercent: coverage.lciPercent,
      lciPercent: coverage.lciPercent,
      state: coverage.state,
      balanceClass: balanceClass(coverage),
      shortfallMinor: coverage.shortfallMinor,
      surplusMinor: coverage.surplusMinor,
      recommendation: recommendationFor({
        freshness: confidence.freshness,
        coverage,
        matchPlan: matchSimulation,
      }),
      matchSimulation,
    });
  });

  return {
    schemaVersion: 1 as const,
    observationId: observation.observationId,
    tenantId: observation.tenantId,
    hubId: observation.hubId,
    partnerOrgId: observation.partnerOrgId,
    planningArea: observation.planningArea,
    currency: observation.currency,
    observedAt: observation.observedAt,
    evaluatedAt,
    sourceClass: observation.sourceClass,
    sourceVersion: observation.sourceVersion,
    confidence,
    availableOperationalCashIndicatorMinor:
      observation.availableOperationalCashIndicatorMinor,
    availableDigitalFloatIndicatorMinor:
      observation.availableDigitalFloatIndicatorMinor,
    availableOperationalLiquidityMinor: agent.availableOperationalLiquidityMinor,
    horizons,
    evidenceRefs: [
      ...new Set([
        ...observation.evidenceRefs,
        "EV-SYN-HUB-LIQUIDITY-POLICY-V1",
        "EV-SYN-CASH-FLEET-PLANNING-V1",
      ]),
    ].sort(),
    boundaries: {
      stage: "STAGE_4" as const,
      syntheticOnly: true as const,
      metricIsPrudentialLcr: false as const,
      realBalanceObserved: false as const,
      liveNetworkAllowed: false as const,
      cashMovementAuthorized: false as const,
      fleetDispatchAuthorized: false as const,
      partnerFiPostingAuthorized: false as const,
      settlementAuthorityGranted: false as const,
      productionAuthorityGranted: false as const,
      scheduledDemandExecutesDisbursement: false as const,
      recommendationExecutesAction: false as const,
    },
  };
}

export function createHubLiquiditySnapshot(input: {
  observation: unknown;
  evaluatedAt: string;
  planningSources?: readonly LiquidityPlanningSource[];
}): HubLiquiditySnapshot {
  const observation = HubLiquidityObservationSchema.parse(input.observation);
  const core = snapshotCore({
    observation,
    evaluatedAt: input.evaluatedAt,
    planningSources: input.planningSources ?? syntheticLiquidityPlanningSources,
  });
  const snapshotDigest = computeCanonicalSha256(core);
  return HubLiquiditySnapshotSchema.parse({
    ...core,
    snapshotId: `hubliq_${snapshotDigest.slice(7, 23)}`,
    snapshotDigest,
  });
}

export function buildHubLiquidityTimeSeries(input: {
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
  observations: readonly unknown[];
  evaluatedAt: string;
  planningSources?: readonly LiquidityPlanningSource[];
}): HubLiquidityTimeSeries {
  const tenantId = HubTenantIdSchema.parse(input.tenantId);
  const hubId = HubIdSchema.parse(input.hubId);
  const partnerOrgId = PartnerOrgIdSchema.parse(input.partnerOrgId);
  const evaluatedAt = IsoTimestampSchema.parse(input.evaluatedAt);
  const parsed = input.observations.map((observation) =>
    HubLiquidityObservationSchema.parse(observation),
  );
  const ids = parsed.map((observation) => observation.observationId);
  if (new Set(ids).size !== ids.length)
    throw new Error("HUB_LIQUIDITY_DUPLICATE_OBSERVATION_ID");

  const scoped = parsed
    .filter(
      (observation) =>
        observation.tenantId === tenantId &&
        observation.hubId === hubId &&
        observation.partnerOrgId === partnerOrgId,
    )
    .sort(
      (left, right) =>
        Date.parse(left.observedAt) - Date.parse(right.observedAt) ||
        left.observationId.localeCompare(right.observationId),
    );
  if (scoped.length === 0) throw new Error("HUB_LIQUIDITY_SCOPE_HAS_NO_OBSERVATIONS");
  const timestamps = scoped.map((observation) => observation.observedAt);
  if (new Set(timestamps).size !== timestamps.length)
    throw new Error("HUB_LIQUIDITY_DUPLICATE_OBSERVED_AT");

  const snapshots = scoped.map((observation) =>
    createHubLiquiditySnapshot({
      observation,
      evaluatedAt,
      planningSources: input.planningSources,
    }),
  );
  return HubLiquidityTimeSeriesSchema.parse({
    schemaVersion: 1,
    tenantId,
    hubId,
    partnerOrgId,
    evaluatedAt,
    latestSnapshotId: snapshots[snapshots.length - 1].snapshotId,
    snapshots,
    boundaries: {
      timeSeriesFriendly: true,
      syntheticOnly: true,
      readOnly: true,
      prudentialLcrClaimed: false,
      automaticCrossRailMovementAuthorized: false,
      dispatchAuthorityGranted: false,
    },
  });
}

export const syntheticHubLiquidityObservations: readonly HubLiquidityObservation[] = [
  {
    observationId: "hubliqobs_adama_alpha_001",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    planningArea: "Synthetic Central corridor",
    currency: "ETB",
    observedAt: "2026-10-15T10:30:00.000Z",
    sourceClass: "SYNTHETIC_TIME_SERIES_FIXTURE",
    sourceVersion: "hub-liquidity-synthetic-v1",
    sourceConfidencePercent: 92,
    availableOperationalCashIndicatorMinor: 4_700_000,
    availableDigitalFloatIndicatorMinor: 4_300_000,
    forecastBaselineRequiredLiquidityMinor: {
      "2H": 6_800_000,
      "4H": 8_400_000,
      "8H": 10_700_000,
      EOD: 13_000_000,
    },
    scheduledBulkDemandMinor: { "2H": 0, "4H": 0, "8H": 800_000, EOD: 1_500_000 },
    evidenceRefs: ["EV-SYN-HUB-LIQUIDITY-ADAMA-001"],
    authority: {
      realBalanceObserved: false,
      custodyConfirmed: false,
      partnerFiBalanceConfirmed: false,
      governmentDisbursementAuthorized: false,
      cashMovementAuthorized: false,
      partnerFiPostingAuthorized: false,
    },
  },
  {
    observationId: "hubliqobs_adama_alpha_002",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    planningArea: "Synthetic Central corridor",
    currency: "ETB",
    observedAt: "2026-10-15T11:40:00.000Z",
    sourceClass: "SYNTHETIC_TIME_SERIES_FIXTURE",
    sourceVersion: "hub-liquidity-synthetic-v1",
    sourceConfidencePercent: 92,
    availableOperationalCashIndicatorMinor: 4_900_000,
    availableDigitalFloatIndicatorMinor: 4_600_000,
    forecastBaselineRequiredLiquidityMinor: {
      "2H": 6_900_000,
      "4H": 8_700_000,
      "8H": 10_900_000,
      EOD: 13_500_000,
    },
    scheduledBulkDemandMinor: { "2H": 0, "4H": 0, "8H": 900_000, EOD: 1_800_000 },
    evidenceRefs: ["EV-SYN-HUB-LIQUIDITY-ADAMA-002"],
    authority: {
      realBalanceObserved: false,
      custodyConfirmed: false,
      partnerFiBalanceConfirmed: false,
      governmentDisbursementAuthorized: false,
      cashMovementAuthorized: false,
      partnerFiPostingAuthorized: false,
    },
  },
  {
    observationId: "hubliqobs_adama_alpha_003",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    planningArea: "Synthetic Central corridor",
    currency: "ETB",
    observedAt: "2026-10-15T12:00:00.000Z",
    sourceClass: "SYNTHETIC_TIME_SERIES_FIXTURE",
    sourceVersion: "hub-liquidity-synthetic-v1",
    sourceConfidencePercent: 92,
    availableOperationalCashIndicatorMinor: 5_000_000,
    availableDigitalFloatIndicatorMinor: 5_000_000,
    forecastBaselineRequiredLiquidityMinor: {
      "2H": 7_000_000,
      "4H": 9_000_000,
      "8H": 11_000_000,
      EOD: 14_000_000,
    },
    scheduledBulkDemandMinor: { "2H": 0, "4H": 0, "8H": 1_000_000, EOD: 2_000_000 },
    evidenceRefs: ["EV-SYN-HUB-LIQUIDITY-ADAMA-003"],
    authority: {
      realBalanceObserved: false,
      custodyConfirmed: false,
      partnerFiBalanceConfirmed: false,
      governmentDisbursementAuthorized: false,
      cashMovementAuthorized: false,
      partnerFiPostingAuthorized: false,
    },
  },
].map((observation) => HubLiquidityObservationSchema.parse(observation));
