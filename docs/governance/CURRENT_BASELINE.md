# Current Verified Baseline

**As of:** 2026-10-14  
**Canonical repository:** `abeselomchernet/Phygital-rural-Agent-Hub`  
**Visibility:** Private  
**Canonical branch:** `main`  
**Canonical baseline commit:** `2b19cf394c931feac5fa439661998986e526270b`

## 1. Completed governed phases

P0-A/P0-B established the bounded synthetic identity, financial-institution, GhostSync, authentication, object authorization, CSRF, local durability, reconciliation, audit and recovery boundaries. Stage 1 revalidated the clean private workspace. Stage 2 completed the bounded ArifPay sandbox integration for its governed scope.

Stage 3 is now complete for its bounded synthetic product/platform scope. It implemented and validated:

- Partner Ecosystem and route-provenance views;
- NLC / Liquidity Coverage Index decision support using non-regulatory terminology;
- synthetic Cash Fleet/liquidity-match planning with no custody or dispatch authority;
- bounded FMCG inventory/logistics planning;
- role/object network-operations authorization;
- truth-synced Agent, Farmer 360, Supervisor and Operations UX;
- a versioned Partner Capability Contract;
- heterogeneous Synthetic Reference Partners;
- a Partner Service Catalog;
- a governed Adapter Registry + Route Resolver;
- capability-driven role/partner Workspace Manifests;
- a governed Partner Onboarding state machine;
- a deterministic Contract Certification runtime;
- a configuration-only PartnerFI Gamma acceptance proof.

## 2. Partner-platform Definition of Done

The approved product acceptance rule is:

> A new partner can be added through organization, service, capability, membership/scope, route and compatible certified-adapter configuration without rebuilding Agent Terminal, Farmer 360, Supervisor, Operations or the Enawuga core for an already-supported workflow type.

PR #37 proves this at the **synthetic architecture level**. Synthetic PartnerFI Gamma was introduced only through a new Partner Capability Contract, Service Catalog, Agent membership/scope, route registration and reuse of an existing registered synthetic PartnerFI adapter. The existing Service Catalog manifest generator, Workspace Manifest generator and Contract Certification runtime were reused without a Gamma-specific Agent Terminal, route family or shared-UI branch.

This does not claim that every future institution will require zero engineering. A genuinely new protocol may require a new certified adapter; a genuinely new reusable business capability may require shared domain development. Neither case should create a permanent one-partner product fork.

## 3. Provider foundation truth

### ArifPay

ArifPay remains the bounded sandbox integration. It becomes executable only when its guarded sandbox runtime is configured. Gateway/provider success remains separate from PartnerFI settlement.

### Direct Telebirr

Direct Telebirr is represented as:

- environment: TestBed;
- adapter registration: `REGISTERED_TESTBED`;
- runtime mode: `FOUNDATION_ONLY`;
- direct payment route: not mounted.

The implemented foundation does not become an active direct-payment route until its remaining TestBed TLS/provider-contract/payment-evidence and certification/activation gates pass.

### M-PESA Ethiopia direct

M-PESA Ethiopia is represented as:

- environment: Sandbox;
- adapter registration: `REGISTERED_SANDBOX`;
- runtime mode: `FOUNDATION_ONLY`;
- token/authentication contract: verified in the bounded sandbox evidence set;
- payment/status/callback routes: not mounted.

Token verification does not establish payment, callback, PartnerFI posting or settlement authority.

## 4. Canonical validation evidence

The accepted post-Stage-3 `main` baseline `2b19cf394c931feac5fa439661998986e526270b` was validated by GitHub Actions `Synthetic prototype validation` run #347 (`38559099782`) on 2026-10-14.

Result: **PASS**.

Validated gates:

- `npm ci`;
- production dependency audit;
- TypeScript/lint;
- unit/domain/API tests;
- production build;
- synthetic Docker image build;
- Chromium installation;
- Chromium E2E.

PR #37's exact head `7d5d9a597a986e51b8c3fc76477a4fe6279bf2c8` also passed run #346 (`38556120717`) before merge.

## 5. Current hard boundaries

The repository remains a bounded synthetic/sandbox-capable system. Stage 3 completion does **not** establish:

- real customer PII;
- real customer funds or liabilities;
- real cash custody, dispatch or handover;
- live PartnerFI account posting/settlement;
- production provider credentials;
- direct Telebirr or M-PESA payment initiation;
- live identity-provider access;
- production SSO/provisioning;
- regulated pilot or production authorization.

Provider acceptance/success MUST NOT be represented as PartnerFI settlement. UI visibility, adapter registration, certification PASS and onboarding state MUST NOT be treated as external institutional authority.

## 6. Current program position

The active substantive stage is now:

> **Stage 4 — Governed ET-resident staging foundation**

Stage 4 is infrastructure/evidence work only. Its purpose is to build and evidence a non-production Ethiopia-resident staging foundation while the financial/provider authority gates remain locked.

Required evidence includes compute/ingress location, database/replica location, backups and restore evidence, audit-store controls, encryption/key custody, IAM/MFA/break-glass/access review, logging/monitoring paths, incident response, retention/deletion, subprocessors/support access, DR/RPO/RTO and operational RACI.

External partner staging remains Stage 5 and is not authorized by this transition.
