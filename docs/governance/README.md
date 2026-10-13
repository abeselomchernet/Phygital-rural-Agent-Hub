# Enawuga Implementation & Execution Governance Pack

**Version:** 1.2  
**Effective date:** 2026-10-13  
**Repository baseline:** `abeselomchernet/Phygital-rural-Agent-Hub` @ `edfba4823cc6be9b5f001b8d0f83fb24728335d8`  
**Status:** Governing forward plan; does not itself authorize regulated operation.

## Purpose

This package is the forward implementation and execution control set for Enawuga / Phygital Rural Agent Hub. It is designed so that an engineer, technical lead, partner-integration team, product designer, security reviewer or program manager can enter the program at any later stage, determine the current approved state and continue without reconstructing the project's history from chat transcripts.

The pack governs how the project advances from the bounded synthetic/sandbox-capable prototype through partner-ecosystem development, governed Ethiopia-resident staging, partner staging, pilot authorization, production readiness and scale.

## Authority hierarchy

When sources conflict, use this order:

1. **Executable repository evidence** — merged code, tests, CI, deployment evidence and immutable commit history establish what is actually implemented.
2. **Approved external evidence** — signed contracts, written institutional approvals, approved infrastructure evidence, identity/payment-provider credentials and formal operating policies establish what is authorized externally.
3. **Historical validation records** — prior bounded validation/closure documents remain evidence of their original scope and must not be rewritten to make the past look current.
4. **This governance pack** — controls future implementation, stage gates, UX/product direction and engineering handoff.
5. **Research reports and exploratory analysis** — advisory inputs only; they do not prove implementation, compliance, approval, licensing, production readiness or partner commitments.

## Normative language

- **MUST / MUST NOT**: mandatory program control.
- **SHOULD / SHOULD NOT**: default engineering practice; deviations require a recorded decision.
- **MAY**: optional where stage conditions allow.

## Package contents

| Document | Purpose |
|---|---|
| `GOVERNANCE_CHARTER.md` | Program governance, decision rights and non-negotiable boundaries |
| `CURRENT_BASELINE.md` | Current verified implementation baseline and known limitations |
| `TARGET_PRODUCT_UX_BLUEPRINT.md` | Target portals, dashboards, workflows and UX principles |
| `PARTNER_ECOSYSTEM_MODEL.md` | Bank/MFI, payment, telco/mobile-money, FMCG, fleet and other partner boundaries |
| `STAGE_GATE_ROADMAP.md` | End-to-end stage sequence from current state to scaled production |
| `ARCHITECTURE_INTEGRATION_STANDARD.md` | Adapter model, state authority, callbacks, idempotency and integration rules |
| `LIQUIDITY_FLEET_FMCG_STANDARD.md` | Network liquidity, Cash Fleet and FMCG operating design |
| `SECURITY_DATA_RESIDENCY_CONTROL_STANDARD.md` | Security, data classification, residency, key, audit and recovery controls |
| `VALIDATION_EVIDENCE_STANDARD.md` | Test, evidence and exit criteria required at every gate |
| `ENGINEERING_EXECUTION_RUNBOOK.md` | How a future engineer resumes, branches, validates, records and hands off work |
| `DECISION_EVIDENCE_TEMPLATES.md` | ADR, evidence register, risk acceptance and gate review templates |
| `EVIDENCE_REGISTER.md` | Forward evidence register for stage/provider/governance decisions |
| `STAGE_3_EXIT_GATE_REVIEW.md` | Stage 3 exit / Stage 4 entry decision and conditions |
| `RELEASE_NOTES.md` | Forward governance release and stage-transition record |
| `PROGRAM_STATUS.yaml` | Machine-readable current stage and next actions |
| `CAPABILITY_REGISTRY.yaml` | Machine-readable capability maturity and unlock conditions |

## How an engineer resumes work

1. Read `PROGRAM_STATUS.yaml`.
2. Confirm the repository `main` SHA and compare it to the recorded baseline.
3. Read `CURRENT_BASELINE.md` and the active stage in `STAGE_GATE_ROADMAP.md`.
4. Read the most recent gate review, currently `STAGE_3_EXIT_GATE_REVIEW.md`.
5. Check `CAPABILITY_REGISTRY.yaml` for what may and may not be enabled.
6. Review the relevant architecture/security/UX standard before changing code or infrastructure.
7. Work on a dedicated branch; do not push directly to `main`.
8. Produce the validation and evidence required by `VALIDATION_EVIDENCE_STANDARD.md`.
9. Update the evidence register and release notes when a stage transition or externally relevant capability state changes.
10. Open a Draft PR and stop at the specified review gate unless explicit approval to proceed is recorded.

## Current program statement

The repository is a **bounded synthetic / sandbox-capable prototype**. Stage 2 — ArifPay Sandbox Integration remains complete for its governed scope. Direct Telebirr remains an inactive/TestBed foundation and M-PESA Ethiopia remains an inactive sandbox foundation with only the token contract verified; neither direct-provider payment path is activated.

Stage 3 — Partner Ecosystem & Network Liquidity (synthetic) is complete for its governed scope. Merged Stage 3 evidence now includes the Partner Ecosystem Console and route provenance, NLC/LCI decision support, synthetic Cash Fleet/liquidity-match planning, bounded FMCG inventory/logistics planning, a truth-synced Supervisor / Regional Operations surface and synthetic network-operations role/action/object authorization.

The active substantive stage becomes **Stage 4 — Governed ET-resident staging foundation** when the Stage 3 exit / Stage 4 entry governance transition is merged. Stage 4 is limited to building and evidencing an Ethiopia-resident **non-production** staging foundation: compute/data location, backup/restore, audit store, encryption/key custody, observability paths, IAM/MFA/break-glass/access review, incident response, retention/deletion, subprocessor/support access, DR/RPO/RTO and operational RACI.

Real customer data, real funds, real cash custody, production provider credentials, live identity-provider access, live PartnerFI posting and regulated financial operation remain gated. Provider acceptance or success must never be represented as PartnerFI settlement. Environment availability must never be treated as residency approval or capability authorization without accepted evidence.
