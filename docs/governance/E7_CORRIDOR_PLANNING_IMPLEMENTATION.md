# E7 - Corridor Planning Implementation

**Status:** Stage-4 synthetic implementation
**Epic:** E7 - Corridor Planning
**Base:** merged `main` after E6 and the Windows local-persistence compatibility fix
**Authority posture:** planning/read model only; no geographic, pilot, funds, posting, settlement, site-activation or regulated authority

## 1. Purpose

E7 implements the governed Enawuga Corridor Planning backlog item as synthetic/staging decision support. It makes corridor expansion an evidence-bounded planning exercise rather than a national-coverage assumption.

The implementation covers the blueprint dimensions:

- corridor and region identity;
- candidate Hub locations/references;
- candidate Hub density assumptions;
- demand assumptions;
- connectivity assumptions;
- PartnerFI interest inputs;
- logistics feasibility;
- synthetic liquidity feasibility;
- operating-cost feasibility;
- evidence completeness;
- a proposed synthetic pilot boundary;
- a bounded review recommendation.

The tool can recommend **review**. It cannot authorize geography, activate a site, start a pilot or grant financial/regulated authority.

## 2. Core domain objects

`src/domain/corridorPlanning.ts` defines strict schemas for:

- `CorridorEvidenceInput`;
- `CorridorCandidate`;
- `CorridorReviewPolicy`;
- `CorridorPlan`;
- `CorridorCandidateEvaluation`;
- `CorridorPlanningReadModel`.

Unknown fields fail schema validation. IDs, evidence arrays and candidate counts are bounded.

## 3. Synthetic planning inputs are not observations

Every candidate numeric planning input is classified as:

`SYNTHETIC_MODEL_ASSUMPTION`

The readiness score and evidence-completeness score are classified as:

`SYNTHETIC_MODEL_OUTPUT`

The inputs are engineering fixtures for exercising decision-support behavior. They are not:

- population estimates asserted as fact;
- observed demand;
- PartnerFI commitments;
- measured connectivity;
- observed liquidity;
- audited operating costs;
- field logistics evidence;
- pilot results;
- forecasts with claimed accuracy.

## 4. Evidence completeness and uncertainty

Each candidate carries exactly seven governed evidence dimensions:

1. `HUB_LOCATION`
2. `CONNECTIVITY`
3. `DEMAND`
4. `PARTNER_INTEREST`
5. `LOGISTICS`
6. `LIQUIDITY`
7. `OPERATING_COST`

Each dimension is either:

- `PRESENT_SYNTHETIC`; or
- `MISSING`.

A present dimension must carry at least one evidence reference. A missing dimension must carry no evidence reference.

Missing evidence cannot coexist with a fabricated numeric value. For connectivity, logistics and liquidity, missing evidence also requires the qualitative profile to be `UNKNOWN`.

If any candidate in a corridor comparison has missing evidence, the corridor-level result is `RESEARCH_MORE`. The engine does not rank an incomplete comparison into a bounded-review recommendation.

## 5. Readiness scoring

A candidate receives `readinessScoreBasisPoints` only when all seven evidence dimensions are present.

The score is the deterministic equal-weight average of seven bounded synthetic planning indices:

- candidate Hub density;
- demand;
- connectivity;
- PartnerFI interest;
- logistics feasibility;
- liquidity feasibility;
- operating-cost feasibility.

If any required evidence is missing, readiness is `null`, not estimated.

The review threshold is configurable per corridor plan through `CorridorReviewPolicy` and is explicitly labeled:

`SYNTHETIC_REVIEW_HEURISTIC_NOT_AUTHORIZATION`

Changing the threshold changes only the synthetic recommendation state. It never creates authority.

## 6. Recommendation states

Candidate-level states:

- `RESEARCH_MORE`
- `HOLD_FOR_EVIDENCE`
- `CANDIDATE_FOR_BOUNDED_REVIEW`

Corridor-level states:

- `RESEARCH_MORE`
- `HOLD`
- `RECOMMEND_BOUNDED_REVIEW`

A corridor can reach `RECOMMEND_BOUNDED_REVIEW` only when the comparison is evidence-complete and at least one candidate meets the configured synthetic review heuristic.

Every recommendation contains:

- `recommendationOnly: true`;
- `geographicAuthorizationGranted: false`;
- `pilotAuthorized: false`;
- `expansionAuthorized: false`.

Candidate evaluation additionally states `liveSiteActivationAuthorized: false`.

## 7. Hub, tenant, region and PartnerFI scope

The corridor plan is anchored to an E1A Hub and must match:

- tenant;
- anchor Hub;
- PartnerFI membership.

If a candidate references an existing Hub, the referenced Hub must match:

- the same tenant;
- the candidate region;
- the corridor PartnerFI membership.

Cross-tenant, wrong-region and non-member PartnerFI references fail closed.

The shared Adama Hub has separate Alpha and Beta corridor-planning fixtures. `searchStage4CorridorPlanning()` filters by tenant + anchor Hub + PartnerFI before returning read models.

## 8. Synthetic fixtures

### PartnerFI Alpha

The Alpha plan models a synthetic Adama-Arisi corridor with two evidence-complete planning candidates.

The Arisi candidate has the highest synthetic readiness above the configured review heuristic, so the read model returns `RECOMMEND_BOUNDED_REVIEW` for that candidate.

This is only a recommendation to review a synthetic candidate. It is not evidence that Arisi is commercially suitable, approved, contracted or authorized for a live pilot.

### PartnerFI Beta

The Beta plan deliberately lacks `PARTNER_INTEREST` evidence.

Its PartnerFI-interest numeric input is `null`, readiness is `null`, evidence completeness is partial and the corridor result is `RESEARCH_MORE`.

This proves the engine preserves uncertainty rather than filling missing evidence with synthetic precision.

## 9. Integrity metadata

Each read model includes a deterministic canonical SHA-256 `planningDigest` computed with the existing evidence-integrity canonicalization utility.

The digest protects the serialized read-model content against schema-valid tampering. It is not:

- external verification;
- provider attestation;
- an audit opinion;
- proof of a physical site or corridor;
- proof of partner commitment;
- geographic approval;
- legal non-repudiation.

## 10. Read-only API

E7 adds:

`GET /api/demo/hubs/:hubId/corridor-planning`

The route:

1. requires an authenticated synthetic session;
2. permits only `SUPERVISOR`, `OPERATIONS` or `PARTNER_ADMIN`;
3. reuses the E1A Hub authorization boundary (`HUB_SUPERVISE` or `HUB_PARTNER_REVIEW`);
4. derives tenant, anchor Hub and PartnerFI scope from the authenticated Hub projection;
5. returns only matching Stage-4 read models.

There is no POST/PATCH/PUT/DELETE endpoint for geographic approval, pilot authorization, site activation or expansion.

## 11. Explicit Stage-4 read boundary

Every E7 read model asserts:

- `stage: STAGE_4`;
- `syntheticOnly: true`;
- `readOnly: true`;
- `exactCoordinatesPresent: false`;
- `realPartnerCommitmentsPresent: false`;
- `realDemandDataPresent: false`;
- `realConnectivityDataPresent: false`;
- `realLogisticsDataPresent: false`;
- `realLiquidityDataPresent: false`;
- `realOperatingCostDataPresent: false`;
- `externalEvidenceAccepted: false`;
- `realFundsIncluded: false`;
- `recommendationCreatesAuthority: false`;
- `geographicAuthorizationGranted: false`;
- `regulatedPilotAuthorityGranted: false`.

## 12. Explicit non-capabilities

E7 does **not** add or claim:

- a live map or exact site coordinates;
- real population/demand evidence;
- real PartnerFI demand commitments;
- live telco/connectivity measurements;
- live logistics or fleet dispatch;
- observed cash/liquidity positions;
- audited corridor economics;
- real PII;
- real funds or cash movement/custody;
- PartnerFI posting or settlement;
- live provider activation;
- production credentials/authentication;
- a regulated pilot;
- geographic authorization;
- site activation;
- automatic expansion or scale.

## 13. Validation contract

Exact local Windows validation for this implementation:

- focused E7 domain/API tests: **16/16 PASS**;
- cumulative governed Hub/workspace E1-E7 tests: **147/147 PASS**;
- TypeScript `tsc --noEmit`: **PASS**;
- production Vite build: **PASS**;
- `git diff --check`: **PASS**;
- full repository suite: **386/386 PASS**.

The former seven Windows M-PESA/Telebirr directory-fsync failures were resolved in the preceding bounded compatibility PR before E7 resumed. E7 adds no payment/provider persistence behavior.

Hosted Linux GitHub Actions remains the authoritative merge gate for the exact E7 PR head.

## 14. Files

- `src/domain/corridorPlanning.ts`
- `src/server/demo-api.ts`
- `tests/corridor-planning.test.ts`
- `tests/corridor-planning-api.test.ts`
- `docs/governance/E7_CORRIDOR_PLANNING_IMPLEMENTATION.md`

## 15. Next governed gate

After E7 passes review and authoritative CI/merge, the machine-readable backlog next epic is **E8 - Operator Training & Device Readiness**.

E8 must remain Stage-4-safe and model training assignment/completion, certification expiry, device readiness, support/escalation, suspension and return-to-service without implying production device control or regulated operating authority.
