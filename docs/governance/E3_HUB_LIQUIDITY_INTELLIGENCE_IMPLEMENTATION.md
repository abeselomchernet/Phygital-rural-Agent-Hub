# E3 Hub Liquidity Intelligence Implementation

## Status

Implemented as the next bounded Stage-4 engineering epic after merged E2 Hub Service Composition. The implementation remains synthetic operational decision support only and does not change regulated authority, provider activation, settlement authority or production stage.

## Purpose

E3 extends the existing synthetic Network Liquidity Coverage / Liquidity Coverage Index and Cash Fleet planning foundations to the first-class Hub boundary.

The implementation follows the governed backlog requirements for:

- 2h / 4h / 8h / end-of-day NLC/LCI;
- source freshness and confidence;
- shortage/surplus classification;
- synthetic replenishment recommendations;
- eligible Cash Fleet / FMCG planning matches;
- time-series-friendly evidence;
- explicit separation of planning support from cash movement or dispatch authority.

Historical prudential LCR terminology and automated-swap semantics are not imported.

## HubLiquidityObservation

`src/domain/hubLiquidityIntelligence.ts` adds a strict synthetic time-series observation contract with:

- observation ID;
- tenant / Hub / PartnerFI scope;
- planning area;
- timestamp and source version;
- source confidence percentage;
- synthetic operational cash indicator;
- synthetic digital-float indicator;
- baseline demand forecast by 2H / 4H / 8H / EOD horizon;
- optional synthetic scheduled-bulk-demand planning input by horizon;
- evidence references;
- schema-literal negative authority assertions.

The cash and digital-float values are operational planning indicators. They are not asserted to be confirmed cash custody, PartnerFI balances, ledger positions or externally observed live balances.

## HubLiquiditySnapshot

Each snapshot deterministically combines one observation with the existing synthetic NLC/LCI calculation policy and produces:

- available synthetic operational-liquidity indicator;
- baseline demand;
- scheduled synthetic planning demand;
- total forecast demand;
- NLC/LCI percentage;
- current synthetic coverage state;
- `SURPLUS`, `BALANCED` or `SHORTAGE` classification;
- shortfall / surplus amount;
- freshness and confidence;
- bounded recommendation;
- Cash Fleet / FMCG match simulation;
- evidence references;
- deterministic SHA-256 content identity.

NLC and LCI remain synthetic operational coverage measures. The snapshot explicitly states that they are **not prudential LCR**.

## Freshness and confidence

E3 calculates observation age at evaluation time and classifies the source as:

- `FRESH` through 15 minutes;
- `AGING` through 60 minutes;
- `STALE` after 60 minutes.

The synthetic source-confidence percentage is attenuated by a deterministic freshness penalty:

- fresh: 0 percentage-point penalty;
- aging: 15 percentage-point penalty;
- stale: 40 percentage-point penalty.

Effective confidence is then mapped to `HIGH`, `MEDIUM` or `LOW` bands. This is a bounded planning convention, not a statistical calibration or externally validated probability.

A stale source forces `REFRESH_SOURCE_BEFORE_REVIEW` for every horizon. A stale snapshot is therefore never treated as an instruction to dispatch or move cash.

## Replenishment recommendation boundary

Recommendations are limited to:

- `MONITOR`;
- `REVIEW_SYNTHETIC_REPLENISHMENT`;
- `REVIEW_UNMATCHED_SYNTHETIC_SHORTFALL`;
- `REFRESH_SOURCE_BEFORE_REVIEW`.

No recommendation executes an action.

E3 reuses `buildSyntheticLiquidityMatchPlan()` for shortage horizons. Eligible Cash Fleet / FMCG sources may be matched according to their existing synthetic planning-area and capacity fixtures. The resulting plan retains the existing literals:

- `PLANNING_SIMULATION_ONLY`;
- no cash movement authority;
- no PartnerFI posting authority;
- no custody / dispatch / handover authority.

The match plan is evidence for a possible review path, not evidence that cash exists, was dispatched, was handed over or was posted by a PartnerFI.

## Scheduled bulk demand

A scheduled bulk-demand field may increase a synthetic horizon forecast. This supports scenario planning for predictable demand such as a hypothetical scheduled payment cycle.

The schema explicitly records that scheduled demand is a planning input only and does not authorize or execute a government disbursement, G2P payment, partner posting or provider transaction.

## Time-series contract

`buildHubLiquidityTimeSeries()`:

- filters observations by exact tenant / Hub / PartnerFI scope;
- sorts snapshots deterministically by observation timestamp and ID;
- rejects duplicate observation IDs;
- rejects duplicate timestamps within the scoped series;
- rejects future observations relative to evaluation time;
- fails closed when no observation exists for the requested scope;
- identifies the latest snapshot without destroying prior evidence.

The series records `timeSeriesFriendly: true`, `syntheticOnly: true`, `readOnly: true`, no prudential-LCR claim, no automatic cross-rail movement authority and no dispatch authority.

## Synthetic fixture

E3 includes three PartnerFI Alpha observations for the shared synthetic Adama Hub. The fixture is intentionally time-series shaped so freshness and confidence behavior can be tested without live data.

At the fixed test evaluation time of `2026-10-15T12:10:00Z`, the three snapshots exercise:

- stale / low confidence;
- aging / medium confidence;
- fresh / high confidence.

The latest synthetic observation has ETB 10,000,000 of combined operational-liquidity indicators and produces governed horizon forecasts including an 8H and EOD shortage. Those shortage horizons generate planning-only source matches from the already-existing Cash Fleet/FMCG fixture set.

These amounts are synthetic test values, not observed balances.

## Capability and Hub authorization

E3 does not create an independent liquidity authorization path.

The read endpoint first requires:

1. authenticated synthetic session;
2. current `SUPERVISOR` role;
3. E1A `HUB_SUPERVISE` authorization for the requested Hub;
4. E2 Hub Service Composition to emit a current `NETWORK_LIQUIDITY_READ` offering for that session / Hub / PartnerFI scope.

Only after all four gates pass is E3 time-series evidence returned.

The initial Stage-4 synthetic contract therefore follows the currently granted Alpha Supervisor NLC capability rather than inventing broader Operations or Partner Admin authority.

## Read-only API

E3 adds:

```text
GET /api/demo/hubs/:hubId/liquidity
```

The response contains the role-safe scoped time series and a convenience latest-snapshot projection. The route is read-only. There is no POST / PATCH / PUT / DELETE liquidity action endpoint.

The existing E2 Hub-service route was also refactored to reuse the same server-side Hub-service workspace helper used by E3, preserving one capability-composition path rather than duplicating authorization logic.

## Explicit non-capabilities

E3 adds no:

- real PII;
- confirmed real cash balance;
- confirmed PartnerFI float / ledger balance;
- cash custody;
- cash movement;
- fleet dispatch or handover;
- automatic cross-rail movement;
- PartnerFI posting or settlement;
- provider activation or live provider networking;
- Telebirr / M-PESA / ArifPay payment activation;
- government-disbursement execution;
- production authentication;
- production signing / non-repudiation claim;
- regulated production authority.

Wishland remains technology/orchestration; licensed institutions retain regulated authority.

## Validation

Exact local Windows validation on the E3 implementation state:

- E3 focused domain/API tests: **12/12 passed**;
- cumulative E1A-E3 Hub, workspace, Network Liquidity and Cash Fleet tests: **93/93 passed**;
- TypeScript `tsc --noEmit` / `npm run lint`: **passed**;
- production Vite build: **passed**;
- `git diff --check`: **passed**;
- full repository suite: **315/322 passed**.

The seven full-suite failures are the same established Windows persistence/fsync baseline in the M-PESA/Telebirr durability subset. E3 adds no payment/provider persistence path and introduces no new full-suite failure.

E3-focused tests cover:

- strict synthetic observation and authority boundaries;
- deterministic 2H / 4H / 8H / EOD NLC/LCI values;
- shortage/surplus classification;
- freshness and confidence attenuation;
- planning-only Cash Fleet / FMCG matching;
- scheduled-demand planning without disbursement authority;
- stale-source refresh behavior;
- deterministic snapshot digest identity;
- duplicate / future / cross-scope fail-closed behavior;
- authenticated capability-gated read API;
- no mutation surface.

No E3 test failed in the full repository run. Hosted Linux GitHub Actions remains the authoritative merge gate for the exact PR head.

## Next gate

After E3 is merged, the next governed backlog epic is **E4 — Offline Operations Evidence**. E4 should build on the already-merged E1E idempotency/replay contract and must continue treating the client queue as untrusted intent requiring server reauthorization at replay time.
