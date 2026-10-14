# Enawuga Market-Design-to-Product Blueprint

**Status:** FUTURE PRODUCT / ENGINEERING BLUEPRINT — NOT CURRENT CAPABILITY EVIDENCE  
**As of:** 2026-10-14  
**Primary implementation authority:** current repository code, tests, CI, `CURRENT_BASELINE.md`, `PROGRAM_STATUS.yaml`, `CAPABILITY_REGISTRY.yaml`  
**Research inputs:** `Enawuga market.pdf` and `enawuga economics.pdf` (Wishland Networking PLC, June 2026)  
**Purpose:** translate useful market-design and unit-economic hypotheses from the Enawuga papers into a governed future product backlog without importing unsupported historical architecture or treating model assumptions as achieved outcomes.

## 1. Authority and evidence rule

This document is subordinate to the current governed repository baseline. It does not change current stage, provider authority, data mode, partner authority or production status.

Use the following evidence classes throughout future implementation:

1. **VERIFIED_CURRENT** — already implemented and validated in the canonical repository.
2. **PAPER_HYPOTHESIS** — design hypothesis or model output drawn from the Enawuga papers; not field validated.
3. **PROPOSED_PRODUCT_REQUIREMENT** — future requirement derived from paper insight plus current product architecture.
4. **EXTERNAL_EVIDENCE_REQUIRED** — requires partner, regulatory, infrastructure, contract or field evidence before activation.
5. **LOCKED_BY_STAGE** — intentionally unavailable under the current Stage 4 authority boundary.

The papers are research/market-design inputs. They do not override current implementation truth.

## 2. Product thesis carried forward

The useful thesis from the papers is not a claim that Enawuga has already proven rural economics. It is a testable product proposition:

> Rural financial access can be treated as a shared-infrastructure and coordination problem in which several authorized institutions use a common governed last-mile operating layer while retaining their own products, accounts, funds, policies and regulated authority.

Wishland remains the technology/orchestration layer. Enawuga must not become a bank, MFI, payment institution, settlement authority, government disbursement authority, cash custodian or identity authority by implication.

## 3. Current architecture remains authoritative

The accepted architecture is:

```text
Enawuga Core
   -> Partner Capability Contract
   -> Partner Service Catalog
   -> Adapter Registry + Route Resolver
   -> Certified Partner Adapter
   -> Partner-specific configuration / scope / route / region / role policy
   -> Capability-driven role workspaces
```

The following distinction remains mandatory:

```text
SERVICE != CAPABILITY != ROUTE != ADAPTER
```

The papers' older terminology — including Sovereign Nexus OS, ABS Engine, direct settlement-layer claims, Hyperledger-specific claims, direct EthSwitch integration claims, or other historical implementation language — MUST NOT be imported into current capability statements unless independently present and validated in the current canonical repository.

## 4. Major product decision: make Hub a first-class domain entity

The most important product implication from the papers is that a Value-Added Rural Hub should not be represented merely as an agent account or a UI location.

Future Enawuga development SHOULD introduce `Hub` as a first-class governed domain object.

### 4.1 Hub purpose

A Hub represents one physical rural service point operating under a defined corridor/region, operator, device set, partner capability set, service catalogue, liquidity context, operational state and evidence history.

A Hub does not itself hold regulated authority. Every financial or regulated action still resolves through an authorized partner capability and route.

### 4.2 Proposed Hub aggregate

Minimum proposed fields:

- `hubId` — immutable internal UUID.
- `hubCode` — human-readable operational code.
- `displayName`.
- `corridorId` / `regionId`.
- `locationReference` — purpose-limited location representation by maturity stage.
- `operatorOrgId`.
- `primaryOperatorUserId`.
- `operatingStatus`.
- `readinessStatus`.
- `approvedServiceIds`.
- `approvedCapabilityIds`.
- `partnerMemberships`.
- `deviceIds`.
- `connectivityProfile`.
- `trainingCertificationState`.
- `liquidityPlanningProfile`.
- `inventoryProfile`.
- `operatingHours`.
- `evidenceReferences`.
- `createdAt`, `updatedAt`, `version`.

### 4.3 Proposed Hub lifecycle

The lifecycle MUST remain evidence/stage gated. Suggested states:

- `DRAFT`
- `SYNTHETIC_CONFIGURED`
- `TRAINING_REQUIRED`
- `SYNTHETIC_READY`
- `STAGING_PENDING_EVIDENCE`
- `STAGING_READY`
- `PILOT_PENDING_AUTHORIZATION`
- `PILOT_AUTHORIZED`
- `PILOT_ACTIVE`
- `SUSPENDED`
- `RETIRED`

Current Stage 4 work may model and test early states using synthetic data only. Later states require the applicable stage gate and external evidence.

## 5. Supporting domain objects

Future engineering SHOULD avoid overloading the `Hub` object. Introduce explicit child/related objects.

### 5.1 HubOperator

Purpose: local operator identity, role, training and operational accountability.

Proposed fields:

- operator relationship to Hub;
- role/scope;
- training modules completed;
- certification/effective/expiry dates;
- authorized device references;
- suspension state;
- support/escalation references.

No training status creates financial authority.

### 5.2 HubDevice

Purpose: field device inventory and readiness.

Proposed fields:

- device ID and device class;
- assigned Hub/operator;
- application version;
- local storage/encryption capability;
- sync health;
- last check-in;
- security posture;
- replacement/retirement state.

### 5.3 HubServiceOffering

Purpose: bind a customer-facing service to the exact partner capability and route available at a Hub.

Required linkage:

```text
Hub -> Service -> Capability -> Route -> Adapter -> Partner -> Environment
```

A service tile MUST NOT exist as a standalone promise.

### 5.4 HubPartnerMembership

Purpose: declare which partner organization may expose which capability at which Hub/corridor.

Minimum fields:

- `partnerOrgId`;
- `hubId` / region scope;
- capability IDs;
- service IDs;
- route IDs;
- effective/expiry dates;
- evidence references;
- commercial tier reference where applicable;
- activation state.

Commercial participation tier MUST remain separate from authorization state.

### 5.5 HubLiquiditySnapshot

Purpose: operational decision support only.

Suggested fields:

- available authorized operational cash indicator;
- available authorized digital-float indicator;
- forecast demand by horizon;
- NLC/LCI score by horizon;
- confidence band;
- source freshness;
- recommended action;
- evidence provenance.

Do not call this prudential regulatory LCR.

### 5.6 HubRevenueAttribution

Purpose: test the papers' revenue-diversification hypothesis without turning projected economics into accounting truth.

Suggested dimensions:

- hub;
- period;
- partner;
- service;
- capability;
- revenue category;
- amount/currency;
- source/evidence class;
- synthetic/model/observed flag.

Until live pilot authorization exists, this module is synthetic/model-only.

### 5.7 HubIncident

Purpose: structured operational failure and recovery evidence.

Categories MAY include:

- connectivity;
- device;
- sync/conflict;
- liquidity shortfall;
- inventory/logistics;
- authorization failure;
- provider ambiguity;
- safety/security;
- data-quality/evidence issue.

### 5.8 Corridor

Purpose: make expansion a governed planning decision rather than a national-coverage assumption.

Proposed fields:

- corridor/region ID;
- candidate Hub locations;
- connectivity profile;
- demand assumptions;
- partner demand commitments;
- logistics/fleet feasibility;
- synthetic liquidity profile;
- readiness/evidence score;
- decision state;
- evidence references.

## 6. What the papers tell us to build

### 6.1 Partner-neutral multi-service Hub composition

**Paper insight:** low-volume rural access points need multiple demand/revenue sources rather than dependence on cash-in/cash-out alone.

**Product requirement:** build configurable Hub service composition using the existing Service Catalog and Capability Contract. No one-off institution-specific Hub fork.

Acceptance direction:

- Hub service availability resolves from partner membership + capability + route + environment + role scope.
- UI displays exact route/provenance.
- adding an already-supported service/partner does not require new shared UI branches.

### 6.2 Hub-level liquidity intelligence

**Paper insight:** liquidity instability is a proximate cause of last-mile failure; scheduled demand such as G2P may improve planning predictability.

**Product requirement:** extend current NLC/LCI and Cash Fleet planning to Hub and corridor level.

Future functions:

- 2h/4h/8h/end-of-day liquidity forecast;
- shortage/surplus classification;
- source freshness and confidence;
- replenishment recommendation;
- eligible fleet/FMCG route matching;
- exception and incident evidence;
- scenario input for scheduled bulk demand.

G2P schedules may be synthetic/planning inputs before authorization. Enawuga MUST NOT execute government disbursement merely because the planning module supports a schedule.

### 6.3 Offline resilience as a product workflow

**Paper insight:** rural connectivity is an operating condition, not an edge case.

**Product requirement:** strengthen observable offline workflow around current GhostSync and local durability patterns.

Required product states:

```text
CAPTURED_OFFLINE
-> QUEUED
-> TRANSPORT_ATTEMPTED
-> RECEIVED
-> AUTHORIZATION_PENDING
-> AUTHORIZED / REJECTED
-> RECONCILIATION_REQUIRED where ambiguous
-> partner-defined terminal state
```

Future UX SHOULD surface:

- queue age;
- last sync;
- retry state;
- conflict state;
- local evidence receipt;
- remote receipt evidence;
- authority state separately from transport state.

Remote GhostSync for real data remains locked until current registry requirements are satisfied.

### 6.4 Revenue attribution and Hub economics

**Paper insight:** viability depends on diversified revenue and shared fixed cost.

**Product requirement:** build a Hub Economics evidence module that records assumptions and observations separately.

The module SHOULD support:

- synthetic/model projections;
- observed pilot values when later authorized;
- partner/service revenue attribution;
- fixed vs variable cost categories;
- shareable vs non-shareable cost classification;
- margin by Hub/corridor/service;
- model-vs-observation variance;
- evidence source and confidence.

It MUST display `MODEL ASSUMPTION`, `MODEL OUTPUT`, `OBSERVED`, and `EXTERNALLY VERIFIED` distinctly.

### 6.5 Partner participation/commercial tier configuration

**Paper insight:** partners may extract different value and bear different commercial fees.

**Product requirement:** future commercial participation tiers MAY be represented as configuration, but they MUST be logically separate from capabilities and authority.

Example abstraction:

```text
CommercialTier
  -> pricing / support / reporting entitlement

CapabilityAuthorization
  -> whether an action is legally/contractually executable
```

Paying a higher fee MUST NOT unlock regulated capability.

### 6.6 Governance neutrality and anti-capture controls

**Paper insight:** shared infrastructure can fail if a dominant institution gains preferential treatment.

**Product requirement:** make neutrality inspectable.

Future controls SHOULD include:

- versioned scheme/policy rules;
- route-decision evidence;
- partner-equivalence checks;
- change approval history;
- partner-specific incentive disclosure where relevant;
- conflict-of-interest flags;
- governance decision record;
- independent audit evidence references.

No partner may inspect another partner's customer-level restricted data by default.

### 6.7 Hub operator training and readiness

**Paper insight:** consistent rural service depends on operator retention, training and trust.

**Product requirement:** add governed onboarding/readiness status to Hub operators and devices.

Future features:

- training curriculum assignment;
- language pack;
- completion evidence;
- certification expiry;
- refresher requirements;
- support tickets;
- device readiness;
- suspension/return-to-service workflow.

### 6.8 Corridor planning

**Paper insight:** expansion should be corridor-by-corridor, not assumed nationally.

**Product requirement:** build a Corridor Planning workspace for synthetic/staging decision support.

Potential dimensions:

- candidate Hub density;
- population/demand assumptions;
- connectivity;
- partner interest/coverage;
- logistics feasibility;
- liquidity pattern;
- operating-cost assumptions;
- evidence completeness;
- proposed pilot boundary.

The tool recommends; it does not authorize geographic expansion.

### 6.9 Privacy-safe inclusion monitoring

**Paper insight:** gender and other inclusion gaps require intentional design.

**Product requirement:** where lawful, consented and purpose-limited, support aggregate inclusion metrics.

Rules:

- do not collect sensitive data merely for dashboards;
- minimize attributes;
- aggregate wherever possible;
- apply partner/legal policy;
- prevent partner cross-visibility;
- record metric provenance and suppression rules.

### 6.10 Safe advisory services

**Paper insight:** farmer-facing advisory can create harm if generated inaccurately.

**Product requirement:** any future advisory capability must be a separate maturity-gated partner/service capability.

Before live use require:

- approved knowledge sources;
- human/expert ownership;
- retrieval/evidence trace;
- answer limitation rules;
- prohibited high-risk decision categories;
- evaluation evidence;
- incident/escalation path.

Open-ended AI advice is not a default Enawuga core capability.

## 7. Five core pilot gates to turn into software

The two papers propose five useful pilot hypotheses. Enawuga SHOULD implement them as configurable evidence gates, not hard-coded claims.

The canonical pattern is:

```text
HYPOTHESIS
-> TARGET
-> OBSERVATION
-> EVIDENCE
-> REVIEW
-> STATUS
-> SCALE DECISION
```

### Gate P1 — Hub profitability

Paper target: average monthly Hub net profit `> USD 150`.

Status: `PAPER_HYPOTHESIS`.

Software requirement:

- target configurable by pilot/currency;
- model and observed values separate;
- cost/revenue source provenance;
- no automatic scale approval from threshold alone.

### Gate P2 — Hub/operator retention

Paper target: Hub churn `< 10%` over pilot period.

Status: `PAPER_HYPOTHESIS`.

Software requirement:

- define denominator/window explicitly;
- distinguish voluntary exit, suspension, replacement and failed onboarding;
- record reason codes and evidence.

### Gate P3 — Revenue diversification

Paper target: value-added services `> 40%` of Hub revenue, excluding basic cash-in/cash-out.

Status: `PAPER_HYPOTHESIS`.

Software requirement:

- configurable included/excluded revenue categories;
- partner/service attribution;
- model vs observed separation;
- no fabricated values when data unavailable.

### Gate P4 — Liquidity/service continuity

Paper target: `99.9%` liquidity-coverage uptime with no sustained shortfall > 30 minutes.

Status: `PAPER_HYPOTHESIS`.

Current terminology correction: use Hub NLC/LCI or service-continuity terminology; do not imply prudential regulatory LCR.

Software requirement:

- define forecast horizon and shortage definition;
- record data freshness/confidence;
- track duration and severity of shortfall;
- track customer-impact/service-impact separately;
- require independently reviewable source events.

### Gate P5 — Resilience/value-added service uptake

Paper target: parametric/resilience-product enrolment `> 20%` among Hub customers.

Status: `PAPER_HYPOTHESIS`.

Software requirement:

- capability remains partner-supplied;
- denominator and eligibility definition explicit;
- customer consent and partner policy apply;
- uptake target must be configurable because actual product/partner may differ.

## 8. Additional engineering gates recommended beyond the papers

The papers' five gates test commercial viability but are not sufficient for controlled pilot readiness. Add these evidence gates:

### P6 — Partner neutrality

- no unauthorized preferential routing;
- route/provenance evidence complete;
- capability access consistent with contract;
- policy changes approved and versioned.

### P7 — Offline recovery integrity

- offline-captured requests reconcile after sync;
- no silent duplication;
- idempotency conflicts detected;
- ambiguous outcomes enter reconciliation-required state.

### P8 — Data-isolation compliance

- object/organization isolation tests pass;
- no FMCG/fleet access to unrelated KYC/balances;
- log redaction tests pass;
- retention/deletion evidence complete for pilot scope.

### P9 — Device/operator readiness

- training current;
- approved device state;
- security controls active;
- support and escalation tested.

### P10 — Evidence completeness

- every pilot metric has source/provenance;
- every claim maps to an evidence artifact;
- missing evidence produces `UNKNOWN`, not PASS.

### P11 — Incident/recovery readiness

- incident ownership defined;
- severity/escalation rehearsed;
- rollback/kill switch tested;
- reconciliation and customer-support path proven.

## 9. Pilot Evidence Engine

Future development SHOULD implement a generic evidence-gate engine rather than five bespoke dashboards.

### 9.1 Core objects

`PilotProgram`

`PilotGateDefinition`

`PilotTarget`

`MetricObservation`

`EvidenceArtifactReference`

`GateReview`

`GateDecision`

`ScaleDecision`

### 9.2 Evidence status vocabulary

Suggested statuses:

- `UNKNOWN`
- `COLLECTING`
- `PARTIAL`
- `MEETS_TARGET_UNREVIEWED`
- `MISSES_TARGET_UNREVIEWED`
- `EVIDENCE_ACCEPTED_MEETS_TARGET`
- `EVIDENCE_ACCEPTED_MISSES_TARGET`
- `WAIVED_WITH_REASON`
- `NOT_APPLICABLE`

A metric reaching a numeric target MUST NOT self-authorize expansion.

### 9.3 Scale-decision rule

Scale decision is a governance action informed by gates, not a computed side effect.

Possible decisions:

- `CONTINUE_PILOT`
- `REMEDIATE_AND_RETEST`
- `PAUSE`
- `STOP`
- `APPROVE_BOUNDED_EXPANSION`

## 10. Product-surface evolution

### 10.1 Agent Terminal

Add future Hub context:

- current Hub/service availability;
- operator readiness;
- device/sync state;
- liquidity warning;
- service provenance;
- clear authority state.

### 10.2 Farmer 360 / Customer Workspace

Keep customer context separate from Hub economics. Add only authorized service availability and consented interaction history.

### 10.3 Supervisor Hub

Evolve into Hub/network supervision:

- Hub readiness;
- operator/device state;
- NLC/LCI;
- queue/sync health;
- liquidity incidents;
- service availability;
- inventory/logistics;
- pilot-gate indicators;
- corridor heatmap.

### 10.4 Operations & Reconciliation Center

Add:

- Hub incident queue;
- offline recovery integrity;
- route-equivalence/neutrality exceptions;
- Hub economics data-quality exceptions;
- evidence completeness;
- pilot-gate review workflow.

### 10.5 Partner Ecosystem Console

Add partner-scoped Hub view:

- contracted Hub/corridor coverage;
- approved capabilities;
- operational SLA/status;
- only the partner's own permitted transaction/service evidence;
- commercial-tier information where applicable;
- certification/expiry state.

### 10.6 Governance & Platform Administration

Add:

- Hub lifecycle approval;
- corridor decision records;
- pilot gate definitions and target versions;
- commercial-tier definitions;
- neutrality policies;
- evidence review and scale decision history.

## 11. Recommended implementation epics

### Epic E1 — Hub Domain Core

Deliver first-class Hub, operator, device, membership and lifecycle models with synthetic fixtures and server-enforced scope.

### Epic E2 — Hub Service Composition

Bind Service Catalog entries to Hub + partner capability + route + environment.

### Epic E3 — Hub Liquidity Intelligence

Extend NLC/LCI to Hub/corridor horizons with confidence/freshness and synthetic fleet matching.

### Epic E4 — Offline Operations Evidence

Strengthen queue/sync/conflict/recovery observability and authority-state separation.

### Epic E5 — Hub Economics & Revenue Attribution

Implement model-vs-observed economic evidence with no implied forecast accuracy.

### Epic E6 — Pilot Evidence Engine

Implement configurable gates P1-P11 with evidence references and governance decisions.

### Epic E7 — Corridor Planning

Implement synthetic/staging corridor comparison without geographic authorization.

### Epic E8 — Operator Training & Device Readiness

Implement readiness/certification/expiry/support state.

### Epic E9 — Neutrality & Scheme Governance

Implement versioned policy, route-equivalence evidence and change approval history.

### Epic E10 — Privacy-Safe Inclusion Analytics

Implement only after purpose/legal/data-field approval; aggregate by default.

### Epic E11 — Partner Commercial Tier Configuration

Model pricing/support/reporting tiers separately from capability authority.

### Epic E12 — Advisory Safety Foundation

Only if future approved partner/service requires advisory; build source-bound retrieval and evaluation before any live advice.

## 12. Stage alignment

### Stage 4 — current

Allowed development from this blueprint:

- documentation;
- domain schemas;
- synthetic fixtures;
- synthetic UI/workflows;
- generic Pilot Evidence Engine;
- Hub economics model labels;
- synthetic corridor planning;
- Hub NLC/LCI synthetic extension;
- unit/integration/E2E tests;
- staging-foundation deployment of bounded software.

Still forbidden:

- real PII;
- real funds;
- real cash custody/movement;
- live G2P execution;
- production credentials;
- PartnerFI posting/settlement;
- live identity access;
- direct Telebirr/M-PESA payment activation;
- regulated pilot operation.

### Stage 5 — external partner staging

May introduce approved partner test/staging feeds and partner-specific contract certification. No automatic progression to live data/funds.

### Stage 6 — pilot readiness

This is where named Hubs, operators, corridor, limits, training, contracts, custody policy, real-data scope and pilot gate definitions must be formally accepted.

### Stage 7 — controlled live pilot

Only written approved capability/site/user/limit scope. Gate observations become real pilot evidence.

### Stage 8+ — production/scale

Scale only after production authorization and evidence. Every new corridor/partner/capability repeats relevant contract/certification/activation gates.

## 13. Research-to-product quarantine rules

The following paper claims MUST remain quarantined as hypotheses/model outputs until separately evidenced:

- 17M potential customer base;
- 78-80% rural share where used as an Enawuga addressable-market input;
- USD 1.68M Year-1 model revenue;
- ~40% delivery-cost reduction;
- 35 -> 70 partner trajectory;
- > USD 150 monthly Hub profit target;
- > 40% value-added revenue target;
- 99.9% liquidity/service-continuity target;
- > 20% resilience-product uptake target;
- projected ARI improvement;
- direct causal statements from exploratory regression/model analysis;
- any technical claim tied to historical Sovereign Nexus OS/ABS components that is not validated in the current repository.

Public/product UI MUST label these `Model assumption`, `Pilot target`, `Research hypothesis`, or equivalent.

## 14. Risks and controls

### Market capture

Risk: dominant partner influences routing, fees or operator behavior.  
Control: versioned neutrality rules, partner equivalence checks, governance evidence, organization-scoped data.

### Commercial-tier/authority confusion

Risk: higher commercial tier appears to grant regulated capability.  
Control: separate data models and UI labels; server authorization based only on capability/route/contract evidence.

### Liquidity-metric overclaim

Risk: operational NLC/LCI is presented as prudential LCR.  
Control: terminology rule from `LIQUIDITY_FLEET_FMCG_STANDARD.md`.

### G2P authority overreach

Risk: scheduled demand-planning support is interpreted as government disbursement authority.  
Control: planning/event schedule separate from executable payment capability.

### Economic-model leakage

Risk: model outputs appear as actual revenue/profit.  
Control: evidence class on every economic observation; UI styling for model vs observed.

### Offline double execution

Risk: retries create duplicated financial action.  
Control: stable idempotency, conflict handling, reconciliation-required states.

### Cross-partner data leakage

Risk: shared infrastructure exposes competitor/customer data.  
Control: organization/object scope, data-class permissions, aggregate-only cross-network analytics.

### Unsafe AI/advisory

Risk: inaccurate financial/agronomic advice.  
Control: separate gated capability, approved corpus, traceable evidence, human ownership, evaluation and escalation.

### Premature geographic expansion

Risk: a successful Hub triggers unsupported national rollout.  
Control: corridor-specific evidence and explicit `APPROVE_BOUNDED_EXPANSION` governance decision.

## 15. Definition of Done for this future product line

The Hub/market-design product line is not complete merely when dashboards exist.

Minimum future acceptance requires:

1. Hub is a first-class object with server-enforced organization/role scope.
2. Hub service availability is resolved through Service -> Capability -> Route -> Adapter -> Partner -> Environment.
3. No commercial tier, UI tile or configuration can self-grant authority.
4. NLC/LCI, economics and pilot gates distinguish synthetic/model/observed/evidence-accepted states.
5. Offline transport state remains separate from partner authority/settlement state.
6. Pilot gates are configurable and evidence-linked.
7. Scale decisions require explicit governance action.
8. Corridor expansion is bounded and evidence-specific.
9. current Stage 4 locks remain fail-closed until later approved gates.
10. validation proves no partner-specific core/UI fork is required for already-supported Hub workflows.

## 16. Recommended next engineering sequence after Stage 4 foundation work

Subject to stage priority and explicit authorization:

1. Hub Domain Core.
2. Hub Service Composition.
3. Pilot Evidence Engine with synthetic fixtures.
4. Hub NLC/LCI and offline-operations evidence.
5. Hub Economics model-vs-observed framework.
6. Operator/device readiness.
7. Corridor Planning.
8. Neutrality/governance controls.
9. Partner commercial-tier configuration.
10. privacy-safe inclusion analytics and any advisory capability only after separate purpose/evidence approval.

## 17. Source interpretation note

The market-design paper contributes the shared-agent/VARH thesis, governance neutrality, diversified revenue hypothesis, liquidity emphasis, five pilot targets and corridor-based validation pathway.

The economics paper contributes the coordination-architecture framing, shareable-vs-non-shareable cost concept, partner participation logic, economic evidence labels and model limitations.

Where either paper conflicts with the current repository, the current repository and governance pack win. Historical research architecture remains useful context, not implementation truth.
