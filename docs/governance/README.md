# Enawuga Implementation & Execution Governance Pack

**Version:** 1.3  
**Effective date:** 2026-10-14  
**Repository baseline:** `abeselomchernet/Phygital-rural-Agent-Hub` @ `2b19cf394c931feac5fa439661998986e526270b`  
**Status:** Governing forward plan; does not itself authorize regulated operation.

## Purpose

This package is the forward implementation and execution control set for Enawuga / Phygital Rural Agent Hub. It allows engineering, product, partner-integration, security and program teams to determine what is implemented, what is authorized, what remains gated and which evidence is required next.

## Product/platform statement

Wishland provides governed shared agent-infrastructure software into which licensed institutions bring their own products, authority, accounts, rails and policies.

The platform Definition of Done is that an already-supported partner/workflow can be introduced through organization, service, capability, role/scope, route and compatible certified-adapter configuration without rebuilding shared Agent, Farmer 360, Supervisor or Operations product surfaces.

PR #37 proves this at the synthetic architecture level with Synthetic PartnerFI Gamma. This evidence does not claim a real institution, real customer/funds authority or production deployment.

## Authority hierarchy

When sources conflict, use this order:

1. executable repository evidence — merged code, tests, CI and immutable commit history establish what is implemented;
2. approved external evidence — contracts, institutional approvals, infrastructure evidence, credentials and operating policies establish what is externally authorized;
3. historical validation records — prior bounded evidence remains historically scoped and is not rewritten;
4. this governance pack — governs future implementation, stage gates and engineering handoff;
5. research/exploratory analysis — advisory only, never proof of implementation, approval or production readiness.

## Core invariants

- Wishland is the technology/orchestration layer; licensed partners retain their regulated authority.
- Provider/gateway acceptance or success is not PartnerFI settlement.
- Service, capability, route and adapter remain distinct concepts.
- UI hiding is not authorization; protected actions remain server-enforced.
- Environment registration is not runtime executability, route activation, production authorization or settlement authority.
- `FOUNDATION_ONLY` integrations may be registered/tested without exposing an executable payment route.
- NLC/LCI is non-regulatory decision support unless a licensed partner formally defines otherwise.
- Stage transitions never unlock real PII, funds, cash movement, production provider credentials or regulated mode by implication.

## Package contents

| Document | Purpose |
|---|---|
| `GOVERNANCE_CHARTER.md` | Program governance, decision rights and non-negotiable boundaries |
| `CURRENT_BASELINE.md` | Current verified implementation baseline and limitations |
| `TARGET_PRODUCT_UX_BLUEPRINT.md` | Target portals, workflows and UX principles |
| `PARTNER_ECOSYSTEM_MODEL.md` | Partner-class and authority boundaries |
| `STAGE_GATE_ROADMAP.md` | Evidence-gated path from current state through staging/pilot/production |
| `ARCHITECTURE_INTEGRATION_STANDARD.md` | Adapter, authority, callback, idempotency and route rules |
| `LIQUIDITY_FLEET_FMCG_STANDARD.md` | NLC/LCI, Cash Fleet and FMCG design boundaries |
| `SECURITY_DATA_RESIDENCY_CONTROL_STANDARD.md` | Security, residency, keys, audit and recovery controls |
| `STAGE_4_ET_STAGING_TOPOLOGY_CONTRACT.md` | Stage 4 logical topology, required residency-evidence components and fail-closed evidence semantics |
| `VALIDATION_EVIDENCE_STANDARD.md` | Required validation/evidence at every gate |
| `ENGINEERING_EXECUTION_RUNBOOK.md` | Resume/branch/validate/handoff process |
| `DECISION_EVIDENCE_TEMPLATES.md` | ADR/evidence/risk/gate templates |
| `EVIDENCE_REGISTER.md` | Stage/provider/platform evidence register |
| `RELEASE_NOTES.md` | Governance release/stage-transition record |
| `STAGE_3_EXIT_GATE_REVIEW.md` | Formal Stage 3 exit decision and retained locks |
| `PROGRAM_STATUS.yaml` | Machine-readable current stage and next actions |
| `CAPABILITY_REGISTRY.yaml` | Machine-readable capability maturity and unlock conditions |

Partner-platform architecture documents under `docs/platform/` are normative implementation companions for Partner Capability Contract, Synthetic Reference Partners, Partner Service Catalog, Adapter Registry/Route Resolver, capability-driven UI, Partner Onboarding and Contract Certification.

## How an engineer resumes work

1. Read `PROGRAM_STATUS.yaml`.
2. Verify current `main` SHA and post-merge CI against the recorded baseline.
3. Read `CURRENT_BASELINE.md`, the active stage in `STAGE_GATE_ROADMAP.md`, and `CAPABILITY_REGISTRY.yaml`.
4. Review the relevant platform/governance architecture before changing code.
5. Preserve partner-platform abstractions; do not add institution-name branches for already-supported workflow types.
6. Work on a dedicated branch and validate exact head before merge.
7. Update evidence/register/release records for stage transitions or externally meaningful capability-state changes.

## Current program statement

Stage 3 — Partner Ecosystem & Network Liquidity (synthetic) has passed its bounded exit gate. The accepted `main` baseline is `2b19cf394c931feac5fa439661998986e526270b`; post-merge validation run #347 (`38559099782`) passed.

The active substantive stage is **Stage 4 — Governed ET-resident staging foundation**. Stage 4 is infrastructure/evidence work only. Real customer data, real funds, real cash custody/movement, production provider credentials, direct Telebirr/M-PESA payment activation, live PartnerFI posting/settlement, live identity-provider access and regulated operation remain locked.

Direct Telebirr is a `REGISTERED_TESTBED` + `FOUNDATION_ONLY` integration foundation with no mounted direct-payment route. M-PESA Ethiopia is a `REGISTERED_SANDBOX` + `FOUNDATION_ONLY` foundation with token/auth evidence but no mounted payment/status/callback routes. ArifPay remains the bounded sandbox integration when its guarded runtime is configured.
