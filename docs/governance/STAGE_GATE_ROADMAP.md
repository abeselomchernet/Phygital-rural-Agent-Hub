# Stage-Gate Roadmap

This roadmap is evidence-gated, not calendar-gated. No stage has a guaranteed duration.

## Stage 0 — bounded synthetic baseline

**Status:** COMPLETE / HISTORICAL.

P0-A/P0-B established bounded synthetic identity, financial-institution, auth/object/CSRF, durability, reconciliation, audit, recovery and GhostSync boundaries.

## Stage 1 — workspace re-baseline and post-P0 closure

**Status:** COMPLETE.

The clean private workspace and full validation workflow were reproduced and the forward governance baseline was established.

## Stage 2 — ArifPay sandbox integration

**Status:** COMPLETE for the governed bounded sandbox scope.

ArifPay C2B sandbox orchestration/reconciliation is implemented with sandbox-only guards, durable pre-submit correlation, uncertainty handling and provider-status reconciliation. Provider success is never PartnerFI settlement.

## Stage 3 — Partner Ecosystem & Network Liquidity (synthetic)

**Status:** COMPLETE for the bounded synthetic scope as of 2026-10-14.

Completed scope includes:

- Partner Ecosystem and provider/route provenance;
- NLC/LCI synthetic decision support;
- Cash Fleet planning and liquidity-match simulation;
- FMCG inventory/logistics planning;
- role/object network-operations authorization;
- truth-synced role product surfaces;
- Partner Capability Contract;
- heterogeneous Synthetic Reference Partners;
- Partner Service Catalog;
- Adapter Registry + Route Resolver;
- capability-driven role/partner UI via server-resolved Workspace Manifest;
- governed Partner Onboarding runtime;
- deterministic Contract Certification runtime;
- PartnerFI Gamma configuration-only acceptance proof.

### Stage 3 exit evidence

- exact-head PartnerFI Gamma acceptance CI: run #346 (`38556120717`) — PASS;
- merged post-acceptance `main`: `2b19cf394c931feac5fa439661998986e526270b`;
- post-merge `main` CI: run #347 (`38559099782`) — PASS;
- formal review: `STAGE_3_EXIT_GATE_REVIEW.md`.

The PartnerFI Gamma proof demonstrates that an already-supported PartnerFI workflow can be added by contract/catalog/membership/route configuration plus an existing compatible adapter without a partner-specific Agent Terminal, Supervisor/Operations fork or shared-core branch.

Important: this is synthetic architecture acceptance, not real institutional onboarding or production authorization.

## Stage 4 — Governed ET-resident staging foundation

**Status:** ACTIVE / FOUNDATION ONLY.

**Goal:** stand up and evidence an approved non-production Ethiopia-resident staging foundation without expanding financial or provider authority.

Required evidence categories:

- physical compute/ingress location;
- database primary/replica location;
- backup location and restore evidence;
- audit-store controls;
- encryption/key custody;
- logging/monitoring data paths;
- IAM/MFA/break-glass/access review;
- incident response;
- retention/deletion;
- subprocessors/support access;
- DR/RPO/RTO;
- operational ownership/RACI.

Allowed:

- infrastructure-as-code and non-production topology work;
- synthetic data only unless a later explicit gate says otherwise;
- non-production network, IAM, encryption, observability, backup/restore and DR evidence;
- deployment of already-bounded software for staging-foundation verification.

Still forbidden:

- real customer PII;
- real funds or liabilities;
- production provider credentials;
- live PartnerFI posting/settlement;
- direct Telebirr or M-PESA payment activation;
- real cash custody/movement/dispatch/handover;
- production identity-provider access;
- regulated pilot operation.

Provider states remain layered. `REGISTERED_TESTBED` / `REGISTERED_SANDBOX` does not imply executable route activation, production authorization or settlement authority.

Exit evidence: complete Stage 4 infrastructure/evidence register and explicit gate review before Stage 5.

## Stage 5 — External partner staging

**Status:** LOCKED pending Stage 4 exit.

**Goal:** connect approved partner test/staging environments using the Partner Capability Contract, Service Catalog, certified adapters, route resolver, onboarding workflow and certification evidence.

Possible tracks include PartnerFI staging, payment-provider staging, identity staging, communications, FMCG/distributor and fleet/logistics rehearsal.

## Stage 6 — Controlled pilot readiness

**Status:** LOCKED.

Requires named scope/sites/agents/partners/limits, written pilot authorization, approved real-data/cash paths where relevant, support/incident/reconciliation procedures, training/readiness, rollback/kill switches and accepted/closed risks.

## Stage 7 — Controlled live pilot

**Status:** LOCKED.

Only written approved services, users/agents, limits and sites may operate. No automatic expansion to new partners, regions or capabilities.

## Stage 8 — Production readiness and launch

**Status:** LOCKED.

Requires production contracts/credentials, performance/capacity evidence, HA/DR, security review/remediation, SLO/SLA/on-call, change/release management, support/privacy operations, reconciliation contracts and explicit production authorization.

## Stage 9 — Scale and ecosystem expansion

**Status:** FUTURE.

Every new partner/capability repeats the relevant contract, adapter, certification, onboarding and activation gates. Scale does not bypass governance.
