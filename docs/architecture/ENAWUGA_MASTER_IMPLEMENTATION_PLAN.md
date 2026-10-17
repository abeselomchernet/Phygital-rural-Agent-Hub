# Enawuga / Phygital Rural Agent Hub — Master Implementation Plan

**Version:** 1.0-draft
**As of:** 2026-10-17
**Repository:** `abeselomchernet/Phygital-rural-Agent-Hub`
**Canonical branch:** `main`
**Baseline at plan creation:** `0871bac20ec24bab9477d4946a100b9cec3ce24a`
**Program mode:** Stage 4 — bounded synthetic / non-production foundation only

> This document sequences implementation. It does **not** supersede Wave D v1.1.1, confer regulatory authority, certify external readiness, or convert research findings into implementation authorization.

## 1. Authority and precedence

Implementation decisions MUST follow this precedence order:

1. `docs/architecture/wave-d/ENAWUGA_WAVE_D_BOUNDED_ARCHITECTURE_DECISION_PACKAGE_v1.1.1.md`
2. `docs/architecture/wave-d/ENAWUGA_WAVE_D_AMENDMENT_LEDGER_v1.1.1.md`
3. `docs/architecture/wave-d/ENAWUGA_WAVE_D_FINAL_CONSISTENCY_VERIFICATION.md`
4. Current governed implementation standards, ADR-derived governance documents, security/data-residency controls and accepted CI evidence in this repository.
5. This Master Implementation Plan, which sequences already-authorized bounded work and records implementation maturity.
6. Wave A/B/C research packages and capability-harvest material as design/research inputs only, never as automatic implementation authority.
7. Historical implementation notes, archived demos and superseded documents.

If this plan conflicts with Wave D v1.1.1, Wave D wins. If repository implementation conflicts with an invariant, the implementation must be corrected; the invariant must not be weakened merely to preserve code.

## 2. Program boundary

Stage 4 remains evidence-gated, not calendar-gated.

Allowed in this plan:
- bounded internal engineering;
- synthetic data;
- non-production infrastructure/evidence work;
- current-stage internal role, evidence, privacy, durability, accessibility and package-foundation work;
- configuration-driven partner architecture using synthetic/reference partners;
- tests, audit evidence and controlled migration/recovery rehearsal.

Still forbidden unless a later explicit gate authorizes otherwise:
- real customer PII;
- real funds, liabilities or cash custody;
- live PartnerFI account posting or settlement;
- production provider credentials;
- direct Telebirr or M-PESA payment activation;
- real provider fulfillment/device-control authority;
- production identity-provider federation;
- regulated pilot mode;
- claims of regulatory approval, institutional adoption or external validation not supported by primary evidence.

External partner staging remains Stage 5 and is LOCKED pending the Stage-4 exit gate.

## 3. Maturity/status taxonomy

Every implementation item MUST use one of these statuses:

- `IMPLEMENTED` — merged, validated and currently active within bounded Stage-4 scope.
- `IMPLEMENTED_BOUNDED` — implemented but intentionally constrained by Stage-4 synthetic/non-production boundaries.
- `IN_PROGRESS` — implementation started but exit criteria not yet met.
- `TARGET_STAGE4_INTERNAL` — architecture-authorized internal target not yet fully implemented.
- `FUTURE_EXTERNAL_DEPENDENT` — architecture-defined but requires external partner/legal/infrastructure/assurance dependencies before activation.
- `RESEARCH_REVIEW_REQUIRED` — research-backed concept that requires architecture/governance review before implementation.
- `BLOCKED_EXTERNAL` — cannot proceed to activation because a named external gate remains unsatisfied.
- `HISTORICAL` — preserved for lineage only; not current implementation authority.
- `DO_NOT_RESURRECT` — explicitly prohibited architecture/behavior.

UI visibility, source-code presence, adapter registration, certification PASS, sandbox token success, research inclusion or a static showcase card MUST NOT be treated as evidence of external operational authority.

## 4. Architectural invariants

The following are permanent unless superseded by a later formally accepted architecture decision:

- Wishland provides technology/orchestration/evidence infrastructure and non-binding decision support.
- Licensed PartnerFI retains regulated account, KYC, authorization, posting, settlement, credit-decision and reversal authority.
- Insurer retains underwriting, claim and payout authority.
- Suppliers/providers retain contractual fulfillment authority.
- Competent authorities retain regulatory authority.
- `SERVICE != CAPABILITY != ROUTE != ADAPTER`.
- Role/workspace = who is acting.
- Service = service/product domain.
- Capability = what may be performed or inspected.
- Projection = what that role/purpose may see.
- Route = governed service resolution.
- Adapter = provider-specific integration boundary.
- eKUB evidence MUST NEVER influence ARDI or PartnerFI credit decision-support.
- Missing evidence is `UNKNOWN`, never silently negative or positive.
- ARDI remains multidimensional, explainable and non-binding; no scalar universal social/credit score.
- UI discoverability never weakens server authorization.
- Static showcase never fabricates server state, sessions, provider connectivity, posting, settlement or partner authority.
- Provider success is not PartnerFI settlement.
- Registration is not executability; executability is not route activation; route activation is not regulated authority.

## 5. Master 11-layer product architecture

```text
ENAWUGA / PHYGITAL RURAL AGENT HUB
│
├── 1. GOVERNED ROLE / WORKSPACE MODEL
│   ├── CURRENT FUNCTIONAL WORKSPACES
│   │   ├── Agent
│   │   ├── Supervisor
│   │   ├── Operations
│   │   └── Partner Admin
│   └── TARGET REVIEW / ASSURANCE WORKSPACES
│       ├── PartnerFI Reviewer
│       ├── Auditor
│       └── Pilot Reviewer
│
├── 2. HUB / FIELD OPERATIONS
│   ├── Hub Overview
│   ├── Hub Economics
│   ├── Regional Operations
│   ├── Corridor Planning
│   ├── Operator & Device Readiness
│   ├── Network Liquidity / NLC-LCI
│   ├── Cash Fleet Planning
│   ├── FMCG / Inventory & Logistics
│   └── Neutrality & Governance
│
├── 3. CUSTOMER / AGENT CAPABILITIES
│   ├── Agent Terminal
│   ├── Farmer 360
│   ├── Customer-safe opaque-reference workflow
│   ├── Agent Readiness / Onboarding
│   ├── Agent Learning / Academy
│   ├── Requests / Offline Queue
│   ├── GhostSync
│   ├── Data Mule
│   └── Conversation / assisted interaction
│
├── 4. EVIDENCE & DECISION-SUPPORT
│   ├── Evidence Explorer
│   ├── Evidence correction
│   ├── Supersession / invalidation lineage
│   ├── Evidence quality / semantic state
│   ├── Human Review
│   ├── Operations / Reconciliation
│   ├── Pilot Evidence
│   ├── ARDI multidimensional evidence/recommendations
│   └── External assurance projections
│
├── 5. SERVICE ECOSYSTEMS
│   ├── Financial-service capability/catalog layer
│   ├── PAYG productive assets
│   ├── Rural commerce / agri-inputs
│   ├── Climate / Insurance
│   └── eKUB evidence
│       └── ABSOLUTE FIREWALL → never ARDI / credit input
│
├── 6. PARTNER / PROVIDER ECOSYSTEM
│   ├── PartnerFI organizations
│   ├── Partner service catalogs
│   ├── Capability contracts
│   ├── Partner/service/capability inspection
│   ├── Certification/evidence state
│   ├── Route registry
│   ├── Adapter registry
│   ├── Provider registration/readiness
│   └── Configuration-driven partner onboarding
│
├── 7. PRIVACY / IDENTITY / AUTHORIZATION
│   ├── PPID / pairwise pseudonymous identifiers
│   ├── Opaque customer references
│   ├── Role-safe projections
│   ├── Purpose limitation
│   ├── Data-class scope
│   ├── Tenant / PartnerFI / Hub / region scope
│   ├── Service / capability scope
│   ├── S-ABAC authorization
│   └── Data Access Basis Gate
│
├── 8. RESILIENCE / OFFLINE / DURABILITY
│   ├── Offline capture
│   ├── Queue persistence
│   ├── Idempotency
│   ├── Correlation
│   ├── CAS / concurrency safety
│   ├── Durable sessions
│   ├── Reconciliation-required outcomes
│   ├── PostgreSQL migration foundation
│   └── D1 canary / storage cutover controls
│
├── 9. LOCALIZATION / ACCESSIBILITY
│   ├── English source language
│   ├── Amharic
│   ├── Afaan Oromoo
│   ├── Human/local-speaker review gate
│   ├── Keyboard/accessibility semantics
│   ├── Responsive/mobile/tablet support
│   └── Governed content bundles
│
├── 10. CRYPTOGRAPHIC / EVIDENCE ASSURANCE
│   ├── Canonical digests
│   ├── Append-only evidence
│   ├── Detached signatures
│   ├── Algorithm agility
│   │   ├── Ed25519
│   │   └── ECDSA P-256
│   ├── Audit trail
│   ├── Expiry / revocation
│   └── Negative assurance
│
└── 11. D6 EXTERNAL PACKAGE FAMILIES
    ├── PartnerFiCreditDossier
    ├── InsurerClimateAssessment
    ├── PilotEvaluation
    ├── ComplianceAuditDossier
    └── RegulatorSupervisory
```

The 11 layers are a product/implementation map, not eleven independent applications. Shared cores MUST be reused. In particular, Evidence Explorer, Human Review, projection policy, audit, privacy, signatures and package generation should be shared services with role/purpose-specific projections rather than duplicated per portal.

## 6. Role model and workspace policy

### 6.1 Current functional roles

Current bounded functional workspaces:
- `AGENT`
- `SUPERVISOR`
- `OPERATIONS`
- `PARTNER_ADMIN`

These are the only roles that may currently receive functional WorkspaceManifest-backed portal behavior unless a later D4 slice deliberately extends the role model.

### 6.2 Target Stage-4 internal review/assurance roles

Architecture-authorized targets:
- `PARTNERFI_REVIEWER`
- `AUDITOR`
- `PILOT_REVIEWER`

Until implemented through D4 with role-safe DTOs, S-ABAC scopes and tests, these roles remain `TARGET_STAGE4_INTERNAL`. Static presentation may describe them as inactive architecture targets but MUST NOT fabricate sessions, OIDC, partner access, PII access or institutional approval.

### 6.3 Target reviewer responsibilities

- PartnerFI Reviewer: PPID-scoped, PartnerFI-purpose decision-support evidence; no account/credit decision authority conferred by Enawuga.
- Auditor: assurance/evidence lineage, signatures, negative assurance and governed audit projection; no operational mutation authority by default.
- Pilot Reviewer: aggregate/bounded pilot-evaluation evidence; no default individual-farmer access and no regulated authority.

External reviewer federation remains future architecture only until partner/security dependencies are satisfied.

## 7. Current implementation baseline

This section records implementation maturity at plan creation. It does not retroactively rewrite historical governance documents whose `as_of` date predates this plan.

### 7.1 Baseline commit

Post-F11A/B `main`:

`0871bac20ec24bab9477d4946a100b9cec3ce24a`

PR #99 completed the F11A/B runtime-truth, context-safety and role-navigation foundation. Its final exact-head CI (`Synthetic prototype validation` run #489) passed before merge. The static Vercel presentation is explicitly built in `static-showcase` mode and the corrected deep-navy hero was visually verified.

### 7.2 Major completed/internal foundations

| Area | Status | Current bounded truth |
|---|---|---|
| Stage 3 partner-platform synthetic architecture | `IMPLEMENTED_BOUNDED` | Capability contracts, service catalog, adapter registry, route resolver, WorkspaceManifest, onboarding/certification and configuration-only partner proof exist within synthetic scope. |
| ARCH-16 legacy quarantine | `IMPLEMENTED` | Legacy anti-pattern build-tree quarantine completed; DO_NOT_RESURRECT register remains binding. |
| D1 PostgreSQL 17 foundation | `IMPLEMENTED_BOUNDED` | PostgreSQL persistence foundation exists behind controlled migration/cutover gates. |
| D1 sessions/idempotency shadow migration | `IMPLEMENTED_BOUNDED` | Shadow migration and session-read canary foundations exist. |
| D1 primary cutover | `IN_PROGRESS` | `continuousCanaryUptimeProven=false`; `postgresPrimaryCutoverAuthorized=false` until the real observation gate is satisfied. |
| D2 privacy/identity foundation | `IMPLEMENTED_BOUNDED` | Evidence-signature foundation, PPID/privacy foundations and data-access-basis gate foundations exist; production key custody/external profiles remain gated. |
| D3 localization/accessibility foundation | `IMPLEMENTED_BOUNDED` | Governed content lifecycle and Amharic/Afaan Oromoo technical support exist; qualified local-speaker/domain review remains required for external/pilot wording. |
| D4 S-ABAC/customer projection foundation | `IMPLEMENTED_BOUNDED` | Opaque customer refs, DTO projection foundations, scope minimization and server authorization exist for current role set. |
| D4 seven-role target | `TARGET_STAGE4_INTERNAL` | PartnerFI Reviewer, Auditor and Pilot Reviewer remain architecture targets, not functional portals. |
| D5 Evidence Explorer | `IMPLEMENTED_BOUNDED` | Shared evidence read foundation and role-safe bounded projections implemented. |
| D5 correction/lineage | `IMPLEMENTED_BOUNDED` | Append-only correction/supersession lineage foundation implemented. |
| D5 Human Review read model/policy | `IMPLEMENTED_BOUNDED` | Read model, case types, visibility and non-authority policy implemented; mutation lifecycle remains open. |
| D5.9 Evidence UX semantics | `IMPLEMENTED_BOUNDED` | Digest integrity, external confirmation, synthetic state, uncertainty, reconciliation, offline, expiry and correction semantics separated. |
| F1–F10 frontend productization | `IMPLEMENTED_BOUNDED` | Four current role surfaces, guided demo, accessibility/localization/mobile foundations and role journeys implemented. |
| F11A/B runtime truth/navigation | `IMPLEMENTED_BOUNDED` | Explicit runtime states, static showcase, manifest-authoritative functional navigation, cross-role fail-closed behavior and customer-context safety merged in PR #99. |
| F11C/D/E | `TARGET_STAGE4_INTERNAL` | Persona control, deeper portal convergence and final visual/accessibility/demo verification remain future bounded slices. |
| D6 external package engine | `TARGET_STAGE4_INTERNAL` | Architecture accepted with conditions; package generation/sharing implementation remains future and external activation remains locked. |

### 7.3 Current functional product surfaces

The current React product has four functional role-oriented workspaces:
- Agent Workspace
- Supervisor / Hub Operations
- Operations & Reconciliation
- Partner Admin

Implemented capability/navigation areas include, as applicable by role and scope:
- Agent Terminal;
- Farmer 360;
- Agent readiness/onboarding;
- Agent learning/academy;
- GhostSync/offline queue;
- Hub overview/economics;
- regional operations;
- pilot evidence;
- corridor planning;
- operator/device readiness;
- NLC/liquidity decision support;
- cash fleet planning;
- FMCG/inventory/logistics planning;
- neutrality/governance;
- partner/service/capability inspection;
- Operations/reconciliation evidence;
- Evidence Explorer;
- bounded Human Review visibility.

Presence in this list means bounded product implementation, not live external operational authorization.

## 8. Provider and partner-state truth

Provider states MUST remain layered.

### ArifPay
- bounded sandbox integration;
- executable only under guarded sandbox configuration;
- provider/gateway success is never PartnerFI settlement.

### Direct Telebirr
- adapter registration: `REGISTERED_TESTBED`;
- runtime mode: `FOUNDATION_ONLY`;
- direct payment route: not mounted;
- activation still requires provider-contract/TLS/payment-evidence/certification gates.

### M-PESA Ethiopia direct
- adapter registration: `REGISTERED_SANDBOX`;
- runtime mode: `FOUNDATION_ONLY`;
- bounded token/auth contract verified historically;
- payment/status/callback routes remain not mounted;
- token success does not establish payment, callback, PartnerFI posting or settlement authority.

### Partner extensibility Definition of Done

A new licensed PartnerFI for an already-supported workflow type should be onboardable through governed organization, services/products, capabilities, memberships/roles/scopes, regions, policies, routes and a compatible certified adapter without a permanent partner-specific Agent/Supervisor/Operations/Product fork.

A genuinely new protocol may require a reusable new adapter. A genuinely new business capability may require shared domain development. Neither exception authorizes a permanent one-partner core fork.

## 9. Master implementation dependency graph

The authoritative Wave-D dependency remains:

`D1 → D2/D3 → D4 → D5 → D6`

The implementation program has progressed beyond the original Wave-D starting point, so remaining work is sequenced by the following gates without changing that architecture dependency:

```text
MERGED BASELINE: F11A/B + D5 foundations
        │
        ├──────────────────────────────────────────────┐
        │                                              │
        ▼                                              ▼
GATE A — Master plan accepted                  PARALLEL D1 CANARY
        │                                      real elapsed observation
        ▼                                      no fake time compression
GATE B — Phase 4E Human Review lifecycle              │
        │                                              │
        ▼                                              │
GATE C — F11C synthetic persona control               │
        │                                              │
        ▼                                              │
GATE D — F11D/E portal convergence + UX               │
        │                                              │
        ▼                                              │
GATE E — D4 seven-role internal target                │
        │                                              │
        ▼                                              │
GATE F — D5 seven-role evidence/review projections    │
        │                                              │
        ▼                                              │
GATE G — Wave-B service ecosystem bounded slices      │
        │                                              │
        ▼                                              │
GATE H — D6 shared external package engine            │
        │                                              │
        ▼                                              │
GATE I — Stage-4 exit / external-readiness evidence ◄─┘
        │
        ▼
STAGE 5+ only after explicit external gates
```

No gate may be skipped merely because a later UI, research document or package type already exists conceptually.

## 10. Parallel D1 persistence/canary program

D1 continues in parallel with non-conflicting product/evidence work.

Current gate facts:
- PostgreSQL 17 foundation exists.
- session/idempotency shadow migration exists.
- session-read canary foundation exists.
- canary evidence has been produced for bounded rehearsals.
- `continuousCanaryUptimeProven=false` remains authoritative until the required real observation interval has actually elapsed with acceptable evidence.
- `postgresPrimaryCutoverAuthorized=false` remains authoritative until explicit review authorizes promotion.

Rules:
- Do not simulate elapsed canary time.
- Do not backdate observation evidence.
- Do not infer authorization from technical readiness.
- Maintain rollback capability until explicit primary-cutover approval.
- Keep durability, idempotency, CAS/concurrency, recovery and backup/restore tests in every persistence-affecting PR.

## 11. Gate A — Master plan acceptance

**Status at creation:** `IN_PROGRESS`

Definition of Done:
- this document is reviewed against Wave D v1.1.1;
- no contradiction with the 30 governance invariants;
- no DO_NOT_RESURRECT item reintroduced;
- current implementation ledger distinguishes implemented vs target vs external-dependent;
- execution order is accepted as the forward default;
- future PRs cite the relevant master-plan gate and architecture layer;
- plan merged to `main` with CI/document checks green.

Gate A changes sequencing/governance only. It grants no product or external authority.

## 12. Gate B — Phase 4E Human Review lifecycle closure

**Architecture source:** D5.5 Human Review Architecture
**Implementation label:** Phase 4E (implementation sequencing label only; not a new Wave-D architecture phase)
**Target status after completion:** `IMPLEMENTED_BOUNDED`

Required lifecycle:

```text
PENDING -> IN_REVIEW
IN_REVIEW -> PENDING
IN_REVIEW -> ESCALATED
ESCALATED -> IN_REVIEW
IN_REVIEW -> EXTERNAL_AUTHORITY_REQUIRED
EXTERNAL_AUTHORITY_REQUIRED -> IN_REVIEW   [only after external-response evidence]
IN_REVIEW -> RESOLVED
RESOLVED -> CLOSED
```

Every mutation must capture:
- case identifier;
- previous state;
- next state;
- reviewer identity;
- timestamp;
- rationale;
- authority owner;
- append-only review event;
- audit event;
- revision/CAS guard;
- idempotency key.

Mandatory denial rules:
- Agent has no Human Review mutation authority.
- Partner Admin remains read-only unless a later explicit policy grants a bounded non-regulated action.
- Enawuga reviewer cannot override PartnerFI, insurer, provider, legal or regulatory authority.
- `EXTERNAL_AUTHORITY_REQUIRED` cannot be locally closed by an Enawuga reviewer.
- A case must not auto-resolve solely because external evidence was received; it returns to governed review.
- Review lifecycle state is not financial/regulated decision state.

Required tests:
- every allowed transition;
- every forbidden transition;
- duplicate idempotency request;
- stale-revision/CAS rejection;
- cross-tenant/partner/hub denial;
- external-authority denial;
- append-only event history;
- audit emission;
- direct-URL/API authorization;
- no authority escalation through UI visibility.

## 13. Gate C — F11C functional synthetic persona control

Purpose: make bounded demo personas usable without turning client-side selection into authority.

Requirements:
- Node functional synthetic runtime only;
- server explicitly advertises whether synthetic persona switching is enabled;
- disabled by default outside controlled demo/development runtime;
- server validates every requested transition;
- client selector alone grants nothing;
- no public/static Vercel privileged session switching;
- no silent role replacement;
- current WorkspaceManifest remains server-authoritative after switching;
- same-tenant/partner/hub constraints enforced by server policy;
- every switch is auditable as synthetic demo context, not real identity federation.

Do not implement future PartnerFI Reviewer/Auditor/Pilot Reviewer federation as part of F11C.

## 14. Gate D — F11D/E portal convergence and final product verification

### F11D — portal UX convergence

Use a common dashboard grammar while preserving role-specific authority:

`identity/context -> attention -> primary tasks -> evidence/recent activity -> secondary tools`

Agent priorities:
- field/task-first workflow;
- customer-safe opaque-reference flow;
- explicit local request vs PartnerFI authorization separation;
- offline/queue/connectivity truth;
- Farmer 360, readiness and learning in field-oriented hierarchy;
- recover useful historical F6 task-sequencing intent using current architecture only.

Supervisor priorities:
- Hub context and attention hierarchy;
- regional operations;
- economics and pilot evidence;
- corridor/readiness;
- NLC/liquidity, cash fleet and FMCG planning;
- neutrality/governance;
- Human Review visibility consistent with authority owner.

Operations priorities:
- exceptions and uncertain outcomes;
- reconciliation;
- offline/provider evidence;
- Evidence Explorer;
- correction/supersession semantics;
- Human Review queue and external-authority states;
- clear prioritization of unresolved operational evidence.

Partner Admin priorities:
- institution-scoped service/capability/configuration visibility;
- provider/route/certification state;
- role/scope governance;
- neutrality and Hub visibility;
- read-only Human Review where appropriate;
- no implied operational, posting, settlement or regulatory authority.

### F11E — visual/accessibility/demo verification

Definition of Done:
- desktop/tablet/mobile verification for all current functional roles;
- responsive navigation;
- keyboard/focus/ARIA verification;
- contrast and non-color-state cues;
- forced-colors and reduced-motion regressions preserved;
- English/Amharic/Afaan Oromoo presentation-state verification;
- explicit note that Amharic/Afaan Oromoo require qualified local-speaker/domain review before external/pilot use;
- static showcase and functional Node demo claims remain clearly separated;
- current four roles remain functional; target three reviewer roles remain inactive until Gate E.

## 15. Gate E — D4 seven-role internal target completion

Add the three target roles only after Phase 4E and current-portal convergence are stable:
- `PARTNERFI_REVIEWER`
- `AUDITOR`
- `PILOT_REVIEWER`

Required implementation:
- extend canonical role model;
- role-specific strict Zod DTO projections;
- tenant/PartnerFI/Hub/purpose/data-class scopes;
- S-ABAC policy for each reviewer role;
- read-access audit events;
- direct-URL denial tests;
- cross-partner leakage tests;
- default read-only external-reviewer verbs;
- no client-only privilege elevation.

External OIDC/SAML federation remains architecture design only in Stage 4 unless a later explicit gate authorizes implementation against an approved external test environment.

## 16. Gate F — D5 seven-role evidence/review convergence

The target architecture is one shared evidence/review core with role-safe projections, not seven duplicated systems.

```text
Evidence Core
  ├── Evidence Explorer
  ├── Query/filter
  ├── Detail projection
  ├── Correction/supersession
  ├── Derived invalidation
  ├── Human Review
  └── Audit/lineage
          │
          ▼
Role + purpose + scope + data-access-basis projection
          │
          ├── Agent
          ├── Supervisor
          ├── Operations
          ├── Partner Admin
          ├── PartnerFI Reviewer
          ├── Auditor
          └── Pilot Reviewer
```

Definition of Done:
- seven role projections are explicit and tested;
- PartnerFI Reviewer receives PPID-scoped decision-support projection only;
- Auditor receives bounded assurance projection without operational authority;
- Pilot Reviewer defaults to aggregate/bounded pilot evidence;
- Human Review mutations remain policy-bound and authority-owner aware;
- Farmer 360 consumes authorized longitudinal evidence only;
- ARDI consumes governed evidence/quality/freshness and emits multidimensional non-binding recommendations;
- eKUB evidence has executable negative tests proving it cannot enter ARDI/credit paths.

## 17. Gate G — service ecosystem bounded implementation slices

Service ecosystem work follows Wave-D §§62–65 and MUST reuse the common partner/capability/evidence/offline/reconciliation architecture.

### 17.1 PAYG productive assets

Target bounded capabilities:
- asset/service catalog projection;
- synthetic eligibility/preparation evidence;
- payment-schedule evidence;
- Farmer 360 projection where authorized;
- Human Review for ambiguity/dispute;
- possible ARDI input only where expressly permitted by product policy and evidence provenance.

Forbidden:
- remote physical device lockout;
- automatic repossession;
- autonomous financing approval;
- representation of Enawuga as lender/credit authority;
- live provider activation before external agreement/certification.

### 17.2 Rural commerce / agri-inputs

Target bounded capabilities:
- product/catalog visibility;
- inventory/planning;
- order intent/preparation;
- delivery/logistics evidence;
- FMCG planning reuse;
- reconciliation of uncertain/failed evidence.

External supplier fulfillment and settlement remain external authority.

### 17.3 Climate / insurance

Target bounded capabilities:
- climate observation evidence;
- coverage/policy reference projection;
- claim-support evidence;
- Human Review;
- insurer-scoped evidence package preparation.

Insurer retains underwriting, claim and payout authority. No automated smart-contract payout.

### 17.4 eKUB evidence

Allowed evidence:
- contribution evidence;
- rotation evidence;
- participation evidence;
- group-governance evidence.

Absolute firewall:
- no eKUB feature may enter ARDI feature assembly;
- no eKUB feature may enter PartnerFI credit decision-support;
- no hidden derived proxy from eKUB may influence credit recommendation;
- Enawuga does not custody pooled eKUB funds;
- Enawuga does not automate group draws or create financial liability.

The firewall MUST be enforced in code/tests, not only documentation.

## 18. Gate H — D6 shared external package engine

D6 should be one governed package engine with recipient-specific projections, not five unrelated exporters.

Shared package pipeline:

```text
Authorized Evidence
      │
      ▼
Recipient Profile
      │
Purpose + DATA_ACCESS_BASIS_GATE
      │
Role/Recipient Projection + Minimization
      │
PPID-only external identifiers
      │
Negative Assurance
      │
Canonical JSON
      │
Detached Algorithm-Agile Signature
      │
Expiry / Revocation Metadata
      │
Download / Access Audit Event
```

Target package families:
- `PartnerFiCreditDossier`
- `InsurerClimateAssessment`
- `PilotEvaluation`
- `ComplianceAuditDossier`
- `RegulatorSupervisory`

### 18.1 Required D6 controls

- recipient-scoped, default-deny projection;
- purpose and data-access-basis check before generation;
- PPID/minimized identifiers only where external identifiers are required;
- no raw cross-partner customer identifier leakage;
- canonical JSON as the canonical machine representation;
- optional human-review derivative only if it cannot silently diverge from canonical content;
- detached signature supporting the accepted algorithm-agility profile (Ed25519 + ECDSA P-256 compatibility where required);
- package freshness/expiry;
- revocation/re-evaluation semantics;
- package access/download audit;
- executable leakage/negative tests;
- no external delivery endpoint activated merely because package generation works internally.

### 18.2 Mandatory negative assurance

Unless a later explicit authorized architecture changes a statement, every applicable external package must make clear that Enawuga does **not** confer:

- `settlementAuthorityGranted = false`
- `creditDecisionConferred = false`
- `insurancePayoutApproved = false`
- `regulatoryPermitConveyed = false`
- `deviceActuationAuthorized = false`
- `externalFactVerified = false`

Negative assurance must be machine-readable and human-readable.

### 18.3 D6 activation boundary

Internal package generation/testing may proceed inside bounded Stage 4 after prerequisites are satisfied. Real recipient delivery, partner webhooks, external production credentials, real-person data use and regulated sharing remain `BLOCKED_EXTERNAL` until explicit later-stage approval.

## 19. Gate I — Stage-4 exit and external-readiness evidence

No move to Stage 5 merely because internal software is feature-complete.

Required categories remain:
- approved ET-resident non-production hosting/residency evidence;
- compute/ingress/database/backup/audit-store location evidence;
- IAM/MFA/break-glass/access-review evidence;
- encryption/key-custody profile;
- logging/monitoring data-path evidence;
- backup/restore and DR/RPO/RTO evidence;
- incident-response evidence;
- retention/deletion policy evidence without invented statutory periods;
- subprocessors/support-access evidence;
- operating RACI;
- qualified privacy/legal review where applicable;
- qualified local-language/domain review for externally governed wording;
- ARDI fairness methodology/baseline before controlled live use;
- explicit Stage-4 exit review.

Stage-4 internal completion does not by itself establish partner agreements or regulated pilot approval.

## 20. Cross-cutting controls that apply to every gate

### 20.1 Privacy / identity / authorization

Every new read or mutation must identify:
- actor role;
- tenant;
- PartnerFI scope;
- Hub/region scope where relevant;
- purpose;
- data class;
- service/capability scope;
- data-access basis where required;
- projection schema;
- audit behavior.

Do not pass generic domain objects over external/UI boundaries when a strict projection can be defined.

### 20.2 Evidence semantics

Never collapse these into one status:
- digest/integrity match;
- semantic correctness;
- external confirmation;
- synthetic fixture status;
- outcome uncertainty;
- reconciliation requirement;
- offline-capture state;
- expiry/freshness;
- correction/supersession.

`integrity=true` does not mean the underlying business fact is true, authorized or externally verified.

### 20.3 Offline / resilience

All mutation-capable offline flows must preserve:
- durable local intent where required;
- correlation identifiers;
- idempotency;
- replay handling;
- uncertainty state;
- reconciliation path;
- audit trail;
- fail-closed behavior when authority cannot be established.

### 20.4 Localization / accessibility

- canonical state and wire values remain language-neutral;
- translations are presentation/content projections;
- no translation changes authority or canonical status;
- local-language bundles are versioned/digest-governed where applicable;
- human/local-speaker/domain review remains an explicit external-quality gate for pilot/external wording;
- keyboard/focus/ARIA/responsive regressions are release-blocking for affected user journeys.

### 20.5 Cryptographic assurance

- digests and signatures are distinct concepts;
- signature algorithm/profile is explicit and versioned;
- no claim of zero-knowledge proof without a mathematically specified proof system;
- production KMS/HSM/key-custody choices remain external/security decisions until approved;
- signature success does not establish semantic truth or recipient authority.

## 21. Testing and CI policy

Every implementation PR must run the smallest focused tests needed during development and the full governed validation gate before merge.

Minimum merge gate unless a documentation-only PR clearly cannot affect runtime:
- dependency install from lockfile;
- production dependency audit;
- TypeScript/lint;
- unit/domain/API tests;
- production build;
- relevant Playwright/E2E;
- Docker/image validation where the workflow requires it;
- `git diff --check`;
- exact-head GitHub CI success.

Additional mandatory suites by change type:
- role/auth change → direct URL, cross-role, cross-partner and scope denial tests;
- customer projection change → opaque-ref/privacy leakage tests;
- Human Review change → lifecycle, CAS/idempotency, authority-owner and append-only history tests;
- D1 change → migration, rollback, crash/recovery, backup/restore and concurrency tests;
- D5 change → correction/invalidation/evidence-state regressions;
- eKUB/ARDI change → explicit negative firewall tests;
- D6 change → projection leakage, purpose/basis denial, signature, expiry/revocation and negative-assurance tests;
- localization/UI change → accessibility, responsive and locale regressions.

A green CI run proves the tested software state, not external/legal/regulatory authorization.

## 22. DO_NOT_RESURRECT register

The following Wave-D v1.1.1 prohibitions remain binding:

1. Automatic dynamic credit line issuance.
2. Sovereign Core settlement claims.
3. CommunityCoin token rewards.
4. Web3 DAO quadratic voting.
5. Fake NBE permit issuance.
6. Remote physical device lockout.
7. Unauthenticated webhooks.
8. ISO 20022 ungrounded dossier wizard.
9. Single scalar universal credit score.
10. Automated insurance smart-contract payouts.
11. eKUB pool balance custody.
12. Peer social credit index.
13. Hyperledger Fabric as a default dependency.
14. Blockchain for architecture prestige.
15. Zero-knowledge claims without a mathematically specified ZK proof system.

Historical/unmounted code containing these ideas is not implementation authority. Reuse of styling/components from quarantined code must not reintroduce prohibited semantics.

## 23. External dependency register

The implementation program must explicitly name dependencies rather than inventing readiness.

Current major external dependencies include:
- ET-resident infrastructure/hosting approval;
- PartnerFI bilateral agreement(s);
- payment-provider agreement/certification where relevant;
- PAYG provider agreement;
- licensed insurer agreement;
- supplier/distributor/logistics agreements where live fulfillment is contemplated;
- independent privacy impact assessment;
- qualified legal review for applicable financial/privacy wording and data-use basis;
- qualified Amharic/Afaan Oromoo local-speaker/domain review for pilot/external content;
- ARDI fairness methodology and independent evaluation baseline;
- production key custody/KMS/HSM profile;
- approved external reviewer identity-federation profile;
- explicit pilot governance approval;
- regulator/competent-authority engagement where legally required.

Research, emails, meetings, positive feedback, demos, sandbox credentials and technical interoperability are not substitutes for these dependencies.

## 24. Definition of Done by architecture layer

### Layer 1 — Governed role/workspace model
Done when:
- all intended current roles have strict server authorization and projections;
- seven-role target is implemented only when D4 Gate E passes;
- direct-URL and cross-role tests fail closed;
- client navigation cannot grant authority.

### Layer 2 — Hub/field operations
Done when:
- Hub/economics/regional/corridor/readiness/liquidity/fleet/FMCG/neutrality views use governed current data/projections;
- no planning surface implies custody/dispatch/regulatory authority;
- service/capability availability is manifest/policy-driven.

### Layer 3 — Customer/agent capabilities
Done when:
- customer-safe opaque refs are preserved end-to-end;
- task-first field flow is coherent on mobile/tablet/desktop;
- offline state is truthful;
- pending requests cannot leak across customer context;
- PartnerFI authorization remains explicit and separate.

### Layer 4 — Evidence & decision-support
Done when:
- evidence core, correction, invalidation, Human Review and ARDI seams are role/purpose scoped;
- integrity, external confirmation and outcome state remain separate;
- authority owner is explicit;
- no evidence UI confers regulated authority.

### Layer 5 — Service ecosystems
Done when:
- each service uses shared capability/route/adapter/evidence seams;
- service-specific authority remains external where required;
- eKUB firewall is executable/tested;
- no one-off partner/service fork is introduced without architecture review.

### Layer 6 — Partner/provider ecosystem
Done when:
- contracts/catalog/capabilities/routes/adapters/certification/onboarding remain configuration-driven for already-supported workflows;
- provider states are layered and truthful;
- route provenance is visible;
- certification cannot be confused with live activation.

### Layer 7 — Privacy/identity/authorization
Done when:
- PPID/opaque-ref/projection/S-ABAC/data-access-basis rules are enforced at every wire/read/mutation boundary;
- leakage tests are present;
- purpose/data-class scopes are auditable.

### Layer 8 — Resilience/offline/durability
Done when:
- durable stores satisfy required D1 semantics;
- idempotency/CAS/reconciliation/recovery are tested;
- D1 canary exits with real evidence before primary cutover;
- backup/restore evidence exists.

### Layer 9 — Localization/accessibility
Done when:
- governed catalog/bundle lifecycle is stable;
- current supported languages render without canonical-state drift;
- accessibility regressions are prevented;
- external/pilot language has required human/domain review.

### Layer 10 — Cryptographic/evidence assurance
Done when:
- digests/signatures/key versions/audit integrity are implemented/tested;
- algorithm-agility profile is explicit;
- expiry/revocation and negative assurance are enforced where applicable;
- production key custody remains externally gated until approved.

### Layer 11 — D6 external package families
Done internally when:
- one package engine produces all approved recipient profiles;
- purpose/basis/minimization/PPID/signature/negative-assurance/expiry/revocation/audit controls pass tests;
- no external delivery is implied by internal generation success.

## 25. PR decomposition rules

Every implementation PR should be bounded enough to answer:
- Which master-plan gate does this PR advance?
- Which architecture layer(s) does it modify?
- Which Wave-D ADR/section authorizes the change?
- Which maturity status changes, if any?
- What authority does it explicitly **not** grant?
- What negative tests prove prohibited authority/cross-scope behavior remains blocked?
- What rollback path exists?
- Which external dependency remains unresolved?

Avoid PRs that simultaneously modify unrelated persistence, role, product, service and external-sharing semantics unless the dependency is unavoidable and explicitly reviewed.

## 26. Documentation truth policy

Documentation must distinguish:
- repository fact;
- architecture requirement;
- UX/design recommendation;
- implementation recommendation;
- external/legal dependency;
- historical fact;
- research/proposal.

When a capability becomes implemented, update current-status documents without rewriting historical CI or research claims. When a capability is only proposed, do not label it implemented because a static card exists.

`docs/governance/CURRENT_BASELINE.md` and `docs/governance/PROGRAM_STATUS.yaml` currently preserve an earlier 2026-10-14 baseline and should be refreshed in a dedicated truth-sync PR after this Master Plan is accepted; they must not be silently treated as current post-F11 status until refreshed.

## 27. Change control for this Master Plan

This file is a living sequencing document.

Changes require:
- a dedicated PR or clearly isolated documentation commit;
- explicit reason for changing order/status/DoD;
- references to the controlling Wave-D ADR/section for architecture-affecting changes;
- no weakening of an invariant without a formally accepted architecture amendment;
- preservation of historical implementation evidence;
- CI/document checks green before merge.

A change to this plan cannot by itself authorize live data, live funds, external partner access, provider production activation, regulatory mode or production launch.

## 28. Forward execution order

Default execution order after this plan is accepted:

1. **Phase 4E — D5 Human Review lifecycle closure.**
2. **F11C — server-governed synthetic persona control.**
3. **F11D — current four-portal UX convergence, including safe recovery of valuable F6 task-first intent.**
4. **F11E — responsive/accessibility/localization/demo verification.**
5. **D4 seven-role internal target completion** (`PARTNERFI_REVIEWER`, `AUDITOR`, `PILOT_REVIEWER`).
6. **D5 seven-role Evidence Explorer/Human Review projections.**
7. **Wave-B service ecosystem bounded slices**: PAYG, rural commerce/agri-inputs, climate/insurance, eKUB evidence firewall.
8. **D6 shared external package engine** and five recipient/package families.
9. **Stage-4 exit evidence and explicit review.**
10. **Stage 5 external partner staging only after gate approval.**

The D1 real canary/storage-cutover program continues in parallel and may gate persistence-dependent promotion decisions.

## 29. Immediate next implementation slice

After this Master Plan is reviewed/merged, the next code slice is:

**Phase 4E — Human Review lifecycle closure**

It should not include F11C persona switching, reviewer-role activation, D6 packages, live providers, real-person data, external webhooks or regulated authority.

The expected deliverable is a bounded, append-only, idempotent, CAS-safe Human Review mutation lifecycle with explicit authority ownership, audit evidence and fail-closed external-authority handling.

---

## 30. Final program statement

Enawuga is being developed as governed rural-finance/financial-inclusion infrastructure with role-safe product surfaces, evidence architecture, resilient field operations, privacy-preserving projections and non-binding decision support. Its implementation sequence is intentionally incremental: technical capability must mature without silently expanding financial, institutional, legal or regulatory authority.

The program is successful only if new functionality remains configuration-driven where appropriate, evidence-backed, testable, reversible, privacy-preserving, accessible, explicit about uncertainty and external authority, and faithful to the Wave-D bounded architecture.
