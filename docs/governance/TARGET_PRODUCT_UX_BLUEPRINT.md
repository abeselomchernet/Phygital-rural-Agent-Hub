# Target Product & UX Blueprint

## 1. Product positioning

The target product is an **operating system for a rural service point and its partner ecosystem**, not merely a payment demo.

The product SHOULD present one coherent Enawuga platform with role-based navigation rather than many disconnected applications.

## 2. Primary operating surfaces

### 2.1 Agent Terminal

Primary user: rural agent.

Core capabilities by maturity:

- customer lookup by approved alias;
- identity/KYC status display;
- partner account/service access where authorized;
- cash-in/cash-out transaction-intent workflow;
- payment and payout initiation through approved rails;
- receipt/status display;
- offline queue visibility;
- inventory/restock;
- agent liquidity position and alerts;
- training/support;
- language switching.

UX principles:

- field-first tablet/PWA design;
- large touch targets and minimal typing;
- visible connectivity state;
- visible transaction authority state;
- no green “success” for mere queueing/submission;
- sensitive identifiers masked by default.

Recommended transaction state labels:

`CAPTURED_OFFLINE -> QUEUED -> SUBMITTED -> PARTNER_PENDING -> AUTHORIZED -> RECONCILIATION_REQUIRED -> COMPLETED / REJECTED`

State vocabulary MUST map to actual backend authority and MUST NOT imply settlement from transport delivery.

### 2.2 Farmer 360 / Customer Workspace

Primary users: agent + customer interaction.

Top-level sections:

- Customer profile and canonical ID.
- KYC/identity state.
- Partner account/service linkage.
- Recent authorized activity.
- Consent/preferences.
- Service eligibility.
- Service catalog.

Service catalog MAY include, as separate maturity-gated modules:

- savings groups / Equb support;
- agricultural input vouchers;
- climate relief / insurance integrations;
- solar / irrigation PAYG;
- regenerative/carbon programs;
- diaspora-matched programs;
- school feeding / market access;
- partner financial and payment services.

A visible tile does not mean live authorization. Each tile MUST be driven by capability status and partner scope.

### 2.3 Supervisor Hub

Primary user: field supervisor / regional operations.

Dashboard areas:

- agent network health;
- onboarding/readiness;
- transaction status and exceptions;
- GhostSync queue/conflicts;
- liquidity coverage and low-liquidity alerts;
- cash-fleet planning and dispatch status;
- inventory / field supplies;
- device readiness;
- operational alerts;
- training/compliance readiness.

### 2.4 Operations & Reconciliation Center

Primary users: Wishland operations, reconciliation and support.

Dashboard SHOULD answer: “Is the Enawuga network operating correctly right now?”

Core views:

- integration health;
- payments by rail/provider;
- reconciliation exceptions;
- uncertain outcomes;
- webhook/callback status;
- offline queue aging;
- replay/idempotency conflicts;
- incident queue;
- per-transaction event timeline.

### 2.5 Partner Ecosystem Console

This replaces the narrower concept of a PartnerFI-only portal.

Access is institution-scoped and role-scoped. Examples:

- Financial institution operations/compliance.
- Payment gateway operator.
- Mobile-money/telco operations.
- FMCG/distributor operator.
- Cash-logistics/fleet operator.
- Identity-provider coordination where appropriate.
- Other authorized commercial/program partners.

Each partner sees only data and actions required by its contract. An FMCG partner MUST NOT see KYC or bank balances; a fleet operator MUST NOT gain posting authority; a payment provider MUST NOT inherit PartnerFI account authority.

### 2.6 Governance, Audit & Platform Administration

Core views:

- users/roles/institutions;
- capability switches;
- audit search/export;
- security/infrastructure evidence;
- data residency status;
- backup/restore evidence;
- key rotation status;
- access review;
- approved integrations and scopes;
- incident/change records.

## 3. Partner/service integration center

Every integration SHOULD expose:

- partner type;
- environment (`mock`, `sandbox`, `staging`, `production`);
- route/provenance (e.g. mobile-money provider reached via ArifPay vs direct);
- enabled capabilities;
- credential ownership;
- health state;
- last successful reconciliation;
- approved data classes;
- authorization expiry/review date.

## 4. Language and accessibility

The current English / Amharic / Afaan Oromoo shell should evolve into production-quality language packs with local-speaker review. Accessibility SHOULD include:

- keyboard navigation where relevant;
- high contrast;
- large touch targets;
- readable error/status text;
- screen-reader labels;
- offline indicators not dependent on color alone.

## 5. UX claim-control rule

The UI MUST display the difference between:

- captured;
- transported;
- received;
- authorized;
- posted;
- reconciled;
- settled / final where the partner contract defines such a state.

The system MUST NOT display fabricated zero balances when account data is unavailable; use an explicit unavailable/unknown state.
