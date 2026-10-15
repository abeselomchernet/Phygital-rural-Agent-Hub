# E6 â€” Pilot Evidence Engine Implementation

**Status:** Stage-4 synthetic implementation
**Epic:** E6 â€” Pilot Evidence Engine
**Base:** merged `main` after E5 Hub Economics
**Authority posture:** evidence/read model only; no real pilot, scale, regulated, funds, posting or settlement authority

## 1. Purpose

E6 implements the generic Pilot Evidence Engine defined in the governed Enawuga market-design backlog. It turns the pilot-gate concept into strict domain objects, deterministic synthetic fixtures, evidence-linked gate evaluation and a bounded read-only API.

The engine implements all configured gates **P1â€“P11** rather than bespoke dashboards. The canonical chain remains:

`HYPOTHESIS -> TARGET -> OBSERVATION -> EVIDENCE -> REVIEW -> STATUS -> SCALE DECISION`

A numeric threshold never self-authorizes pilot progression or scale.

## 2. Core objects

`src/domain/pilotEvidenceEngine.ts` defines strict schemas for:

- `PilotProgram`
- `PilotGateDefinition`
- `PilotTarget`
- `MetricObservation`
- `EvidenceArtifactReference`
- `GateReview`
- `GateDecision`
- `ScaleDecision`
- deterministic `PilotGateAssessment`
- digest-protected `PilotEvidenceReadModel`

Unknown fields fail schema validation. Evidence references and identifiers are bounded. No raw customer payload, credential, provider secret, balance, transaction payload or production authorization object is added.

## 3. Gate vocabulary

The engine preserves the governed evidence status vocabulary:

- `UNKNOWN`
- `COLLECTING`
- `PARTIAL`
- `MEETS_TARGET_UNREVIEWED`
- `MISSES_TARGET_UNREVIEWED`
- `EVIDENCE_ACCEPTED_MEETS_TARGET`
- `EVIDENCE_ACCEPTED_MISSES_TARGET`
- `WAIVED_WITH_REASON`
- `NOT_APPLICABLE`

The last four governance-reviewed states are modeled for the generic contract, but the Stage-4 constructor rejects accepted/waived/not-applicable gate decisions because no real pilot evidence is authorized at Stage 4.

## 4. P1â€“P5 research-hypothesis targets

The first five gates preserve the product-blueprint paper targets as **configurable hypotheses**, not achieved results:

| Gate | Target represented by E6 | Status class |
| --- | --- | --- |
| P1 â€” Hub profitability | monthly Hub net profit `> USD 150` | `PAPER_HYPOTHESIS` |
| P2 â€” Hub/operator retention | churn `< 10%` | `PAPER_HYPOTHESIS` |
| P3 â€” Revenue diversification | value-added revenue share `> 40%` | `PAPER_HYPOTHESIS` |
| P4 â€” Liquidity/service continuity | uptime `>= 99.9%` and no sustained shortfall `> 30 minutes` | `PAPER_HYPOTHESIS` |
| P5 â€” resilience/value-added uptake | eligible-customer uptake `> 20%` | `PAPER_HYPOTHESIS` |

P4 uses Hub NLC/LCI/service-continuity terminology. It is not a prudential regulatory LCR claim.

The numeric thresholds are encoded using integer units (`USD_CENTS_PER_MONTH`, basis points and seconds) to avoid floating-point ambiguity. E6 does not perform FX conversion and does not reinterpret E5 ETB model outputs as P1 observed USD pilot evidence.

## 5. P6â€“P11 engineering gates

The engineering gates are configurable checklist-style evidence gates:

- **P6 â€” Partner neutrality:** no unauthorized preferential routing; route/provenance evidence complete; contract/capability consistency; approved/versioned policy changes.
- **P7 â€” Offline recovery integrity:** offline reconciliation; no silent duplication; idempotency-conflict detection; ambiguous outcomes become reconciliation-required.
- **P8 â€” Data-isolation compliance:** organization/object isolation; non-financial partner scope boundaries; redaction; retention/deletion evidence completeness.
- **P9 â€” Device/operator readiness:** training; approved device state; security controls; support/escalation readiness.
- **P10 â€” Evidence completeness:** source/provenance; claim-to-artifact mapping; missing evidence must remain unknown rather than pass.
- **P11 â€” Incident/recovery readiness:** ownership; severity/escalation rehearsal; rollback/kill-switch testing; reconciliation/support path.

## 6. Synthetic fixtures are exercises, not pilot observations

The Alpha fixture deliberately produces a mix of:

- meets-target-unreviewed,
- misses-target-unreviewed,
- collecting,
- partial.

These states exercise the engine. Every fixture observation is explicitly `SYNTHETIC_TEST_FIXTURE` with `realPilotObservation: false`.

The Beta fixture contains the same gate/target configuration but no metric observations, proving configuration reuse and shared-Hub PartnerFI isolation without fabricating Beta pilot results.

The Stage-4 constructor rejects:

- `REAL_PILOT_OBSERVATION`;
- real-pilot evidence artifacts;
- externally verified evidence;
- formal acceptance of real pilot evidence;
- accepted/waived/not-applicable gate decisions;
- any `ScaleDecision` instance.

This is intentionally stricter than the future generic schemas.

## 7. Threshold evaluation and governance separation

Each target contains one or more versioned constraints:

- metric key;
- comparator (`GT`, `GTE`, `LT`, `LTE`, `EQ`);
- integer threshold;
- unit.

The engine evaluates only exact metric-key/unit matches. A missing metric produces collecting/partial/unknown state rather than pass. A unit mismatch fails closed.

Even when every synthetic metric meets a target, the result is only `MEETS_TARGET_UNREVIEWED`. Every assessment has `selfAuthorizedScale: false`.

A future governance review may inform a separate `GateDecision`; a `ScaleDecision` remains a separate governance action, never a computed threshold side effect.

## 8. Program scope and PartnerFI isolation

A `PilotProgram` is scoped to:

- tenant;
- one or more governed Hub IDs;
- one PartnerFI;
- program version.

Every referenced Hub must exist in the E1A synthetic Hub graph, belong to the same tenant and contain the PartnerFI membership. Cross-tenant and non-member PartnerFI programs fail closed.

The shared Adama Hub has separate Alpha and Beta program fixtures. `searchStage4PilotEvidence()` filters by tenant + Hub + PartnerFI before returning a read model.

## 9. Integrity evidence

Each read model has a deterministic canonical SHA-256 `pilotEvidenceDigest` computed with the shared E1C canonicalization utility.

The digest provides content-integrity metadata only. It is **not**:

- provider attestation;
- external verification;
- an audit opinion;
- proof that a real pilot observation occurred;
- legal non-repudiation;
- authorization to scale.

Schema-valid tampering causes verification failure.

## 10. Read-only API

E6 adds:

`GET /api/demo/hubs/:hubId/pilot-evidence`

The route:

1. requires an authenticated synthetic session;
2. permits only `SUPERVISOR`, `OPERATIONS` or `PARTNER_ADMIN`;
3. reuses the E1A Hub authorization boundary (`HUB_SUPERVISE` or `HUB_PARTNER_REVIEW`);
4. derives tenant, Hub and PartnerFI scope from the authenticated session/Hub projection;
5. returns only matching read models.

There is no POST/PATCH/PUT/DELETE decision, review, waiver, scale or expansion endpoint.

## 11. Explicit Stage-4 read boundary

Every read model asserts:

- `stage: STAGE_4`
- `syntheticOnly: true`
- `readOnly: true`
- `actualPilotRunning: false`
- `realPilotObservationsPresent: false`
- `externallyVerifiedPilotEvidencePresent: false`
- `numericThresholdCanAuthorizeScale: false`
- `governanceActionRequiredForScale: true`
- `boundedExpansionAuthorityGranted: false`
- `realDataIncluded: false`
- `realFundsIncluded: false`
- `partnerPostingAuthorityGranted: false`
- `settlementAuthorityGranted: false`

## 12. Non-capabilities

E6 does **not** add or claim:

- a real or regulated pilot;
- named live pilot sites/users/limits;
- real PII or customer records;
- real funds or cash movement/custody;
- PartnerFI posting or settlement;
- live provider/network activation;
- production credentials/authentication;
- observed pilot performance;
- external verification;
- forecast accuracy;
- automatic gate acceptance;
- automatic pilot progression;
- automatic corridor/geographic authorization;
- automatic bounded expansion or scale;
- production signing/non-repudiation.

## 13. Validation contract

Exact local Windows validation for this implementation:

- focused E6 domain/API tests: **17/17 PASS**;
- cumulative Hub/workspace E1â€“E6 tests: **131/131 PASS**;
- TypeScript `tsc --noEmit`: **PASS**;
- production Vite build: **PASS**;
- `git diff --check`: **PASS**;
- full repository suite: **363/370 PASS**.

The seven failures are the same established Windows M-PESA/Telebirr persistence/fsync baseline:

1. reserved unresolved attempt survives restart and requires reconciliation without repost;
2. two preloaded local stores cannot overwrite one another;
3. preorder correlation intent survives restart before any provider mutation;
4. same idempotency key with changed preorder intent fails closed;
5. same Enawuga transaction cannot reserve a second Telebirr intent;
6. merchant-order ID and nonce are globally replay protected;
7. durable snapshot stores correlation intent but no Telebirr secrets or signatures.

E6 adds no provider/payment persistence path. Hosted Linux GitHub Actions remains the authoritative merge gate for the exact PR head.

## 14. Files

- `src/domain/pilotEvidenceEngine.ts`
- `src/server/demo-api.ts`
- `tests/pilot-evidence-engine.test.ts`
- `tests/pilot-evidence-api.test.ts`
- `docs/governance/E6_PILOT_EVIDENCE_ENGINE_IMPLEMENTATION.md`

## 15. Next governed gate

After E6 passes review and the authoritative CI/merge gate, the backlog next epic is **E7 â€” Corridor Planning**.

E7 must remain synthetic/staging planning only, preserve evidence completeness and uncertainty, and treat expansion as a bounded recommendation rather than geographic authorization.
