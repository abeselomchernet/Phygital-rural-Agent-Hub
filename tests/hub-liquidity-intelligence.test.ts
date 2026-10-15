import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS } from "../src/domain/hub";
import {
  HubLiquidityObservationSchema,
  SYNTHETIC_HUB_LIQUIDITY_POLICY,
  buildHubLiquidityTimeSeries,
  createHubLiquiditySnapshot,
  syntheticHubLiquidityObservations,
} from "../src/domain/hubLiquidityIntelligence";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";

const evaluatedAt = "2026-10-15T12:10:00.000Z";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function latestObservation() {
  const observation = syntheticHubLiquidityObservations.find(
    (entry) => entry.observationId === "hubliqobs_adama_alpha_003",
  );
  assert.ok(observation);
  return observation;
}

test("Hub liquidity fixtures are strict synthetic time-series observations with no balance or movement authority", () => {
  assert.equal(syntheticHubLiquidityObservations.length, 3);
  for (const observation of syntheticHubLiquidityObservations) {
    assert.equal(HubLiquidityObservationSchema.safeParse(observation).success, true);
    assert.equal(observation.sourceClass, "SYNTHETIC_TIME_SERIES_FIXTURE");
    assert.equal(observation.authority.realBalanceObserved, false);
    assert.equal(observation.authority.custodyConfirmed, false);
    assert.equal(observation.authority.partnerFiBalanceConfirmed, false);
    assert.equal(observation.authority.governmentDisbursementAuthorized, false);
    assert.equal(observation.authority.cashMovementAuthorized, false);
    assert.equal(observation.authority.partnerFiPostingAuthorized, false);
  }
  assert.equal(SYNTHETIC_HUB_LIQUIDITY_POLICY.regulatoryMeaning, "NOT_PRUDENTIAL_LCR");
  assert.equal(SYNTHETIC_HUB_LIQUIDITY_POLICY.liveNetworkAllowed, false);
  assert.equal(SYNTHETIC_HUB_LIQUIDITY_POLICY.fleetDispatchAuthorized, false);
});

test("latest Hub snapshot produces governed 2H/4H/8H/EOD NLC-LCI states and shortage-surplus classification", () => {
  const snapshot = createHubLiquiditySnapshot({
    observation: latestObservation(),
    evaluatedAt,
  });

  assert.equal(snapshot.availableOperationalLiquidityMinor, 10_000_000);
  assert.deepEqual(
    snapshot.horizons.map((entry) => [
      entry.horizon,
      entry.totalForecastRequiredLiquidityMinor,
      entry.nlcPercent,
      entry.state,
      entry.balanceClass,
      entry.shortfallMinor,
      entry.surplusMinor,
    ]),
    [
      ["2H", 7_000_000, 142.9, "HEALTHY", "SURPLUS", 0, 3_000_000],
      ["4H", 9_000_000, 111.1, "WATCH", "SURPLUS", 0, 1_000_000],
      ["8H", 12_000_000, 83.3, "CRITICAL", "SHORTAGE", 2_000_000, 0],
      ["EOD", 16_000_000, 62.5, "CRITICAL", "SHORTAGE", 6_000_000, 0],
    ],
  );
  assert.equal(
    snapshot.horizons.every((entry) => entry.nlcPercent === entry.lciPercent),
    true,
  );
});

test("freshness deterministically attenuates confidence across the time series", () => {
  const series = buildHubLiquidityTimeSeries({
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    observations: [...syntheticHubLiquidityObservations].reverse(),
    evaluatedAt,
  });

  assert.deepEqual(
    series.snapshots.map((snapshot) => [
      snapshot.observationId,
      snapshot.confidence.ageMinutes,
      snapshot.confidence.freshness,
      snapshot.confidence.effectiveConfidencePercent,
      snapshot.confidence.band,
    ]),
    [
      ["hubliqobs_adama_alpha_001", 100, "STALE", 52, "LOW"],
      ["hubliqobs_adama_alpha_002", 30, "AGING", 77, "MEDIUM"],
      ["hubliqobs_adama_alpha_003", 10, "FRESH", 92, "HIGH"],
    ],
  );
  assert.equal(
    series.latestSnapshotId,
    series.snapshots[series.snapshots.length - 1].snapshotId,
  );
  assert.equal(series.boundaries.timeSeriesFriendly, true);
  assert.equal(series.boundaries.prudentialLcrClaimed, false);
});

test("shortage horizons produce eligible synthetic fleet/FMCG match simulation but no dispatch or posting authority", () => {
  const snapshot = createHubLiquiditySnapshot({
    observation: latestObservation(),
    evaluatedAt,
  });
  const eightHour = snapshot.horizons.find((entry) => entry.horizon === "8H");
  const eod = snapshot.horizons.find((entry) => entry.horizon === "EOD");
  assert.ok(eightHour && eod);

  assert.equal(eightHour.recommendation, "REVIEW_SYNTHETIC_REPLENISHMENT");
  assert.equal(eightHour.matchSimulation.totalPriorityShortfallMinor, 2_000_000);
  assert.equal(eightHour.matchSimulation.totalPlannedMatchMinor, 2_000_000);
  assert.equal(eightHour.matchSimulation.unmatchedShortfallMinor, 0);
  assert.equal(eightHour.matchSimulation.recommendations.length, 1);
  assert.equal(
    eightHour.matchSimulation.recommendations[0]?.sourceId,
    "synthetic-source-cash-fleet-central",
  );

  assert.equal(eod.matchSimulation.totalPriorityShortfallMinor, 6_000_000);
  assert.equal(eod.matchSimulation.totalPlannedMatchMinor, 6_000_000);
  assert.equal(eod.matchSimulation.recommendations.length, 2);
  assert.equal(eod.matchSimulation.cashMovementAuthorized, false);
  assert.equal(eod.matchSimulation.partnerFiPostingAuthorized, false);
  assert.equal(
    eod.matchSimulation.recommendations.every(
      (entry) =>
        entry.status === "PLANNING_MATCH_ONLY" &&
        entry.authorityBoundary ===
          "NO_CUSTODY_DISPATCH_HANDOVER_CASH_MOVEMENT_OR_PARTNERFI_POSTING",
    ),
    true,
  );
});

test("scheduled bulk demand changes planning requirements without becoming government-disbursement authority", () => {
  const snapshot = createHubLiquiditySnapshot({
    observation: latestObservation(),
    evaluatedAt,
  });
  const eightHour = snapshot.horizons.find((entry) => entry.horizon === "8H");
  const eod = snapshot.horizons.find((entry) => entry.horizon === "EOD");
  assert.ok(eightHour && eod);
  assert.equal(eightHour.baselineRequiredLiquidityMinor, 11_000_000);
  assert.equal(eightHour.scheduledBulkDemandMinor, 1_000_000);
  assert.equal(eightHour.totalForecastRequiredLiquidityMinor, 12_000_000);
  assert.equal(eod.scheduledBulkDemandMinor, 2_000_000);
  assert.equal(snapshot.boundaries.scheduledDemandExecutesDisbursement, false);
  assert.equal(snapshot.boundaries.recommendationExecutesAction, false);
});

test("stale observations force source refresh before any replenishment review", () => {
  const snapshot = createHubLiquiditySnapshot({
    observation: syntheticHubLiquidityObservations[0],
    evaluatedAt,
  });
  assert.equal(snapshot.confidence.freshness, "STALE");
  assert.equal(
    snapshot.horizons.every(
      (entry) => entry.recommendation === "REFRESH_SOURCE_BEFORE_REVIEW",
    ),
    true,
  );
});

test("snapshot identity and digest are deterministic and content sensitive", () => {
  const observation = latestObservation();
  const first = createHubLiquiditySnapshot({ observation, evaluatedAt });
  const second = createHubLiquiditySnapshot({ observation, evaluatedAt });
  assert.equal(first.snapshotId, second.snapshotId);
  assert.equal(first.snapshotDigest, second.snapshotDigest);

  const changed = clone(observation);
  changed.availableOperationalCashIndicatorMinor += 100_000;
  const third = createHubLiquiditySnapshot({ observation: changed, evaluatedAt });
  assert.notEqual(third.snapshotId, first.snapshotId);
  assert.notEqual(third.snapshotDigest, first.snapshotDigest);
});

test("Hub liquidity time series fails closed on future, duplicate and cross-scope observations", () => {
  assert.throws(
    () =>
      createHubLiquiditySnapshot({
        observation: latestObservation(),
        evaluatedAt: "2026-10-15T11:59:59.000Z",
      }),
    /HUB_LIQUIDITY_FUTURE_OBSERVATION/,
  );

  assert.throws(
    () =>
      buildHubLiquidityTimeSeries({
        tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
        hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
        observations: [latestObservation(), clone(latestObservation())],
        evaluatedAt,
      }),
    /HUB_LIQUIDITY_DUPLICATE_OBSERVATION_ID/,
  );

  assert.throws(
    () =>
      buildHubLiquidityTimeSeries({
        tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
        hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
        observations: syntheticHubLiquidityObservations,
        evaluatedAt,
      }),
    /HUB_LIQUIDITY_SCOPE_HAS_NO_OBSERVATIONS/,
  );
});

test("snapshot schema carries explicit non-authority boundaries and no prudential LCR claim", () => {
  const snapshot = createHubLiquiditySnapshot({
    observation: latestObservation(),
    evaluatedAt,
  });
  assert.deepEqual(snapshot.boundaries, {
    stage: "STAGE_4",
    syntheticOnly: true,
    metricIsPrudentialLcr: false,
    realBalanceObserved: false,
    liveNetworkAllowed: false,
    cashMovementAuthorized: false,
    fleetDispatchAuthorized: false,
    partnerFiPostingAuthorized: false,
    settlementAuthorityGranted: false,
    productionAuthorityGranted: false,
    scheduledDemandExecutesDisbursement: false,
    recommendationExecutesAction: false,
  });
  assert.doesNotMatch(JSON.stringify(snapshot), /prudential lcr/i);
});
