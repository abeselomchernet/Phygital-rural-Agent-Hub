# Current Verified Baseline

**As of:** 2026-10-13  
**Canonical repository:** `abeselomchernet/Phygital-rural-Agent-Hub`  
**Visibility:** Private  
**Canonical branch:** `main`  
**Canonical baseline commit:** `edfba4823cc6be9b5f001b8d0f83fb24728335d8`

## 1. Completed governed phases

### P0-A — partner-led financial, identity and residency boundaries

Merged. The project established canonical customer references, explicit KYC state, mock identity/provider boundaries, PartnerFI authority separation, GhostSync separation from financial state, fail-closed regulated execution and closure of legacy unsafe mutation/claim paths.

### P0-B — authenticated durable synthetic staging foundation

Merged. Bounded synthetic work includes server-verified synthetic sessions and role/object/CSRF controls, durable local development persistence, restart-safe idempotency, reconciliation with uncertain outcomes, authenticated mock callback controls, redacted audit/recovery controls and fail-closed edge/residency contracts.

### Stage 1 — workspace re-baseline and post-P0 closure

Complete. The clean hosted validation baseline and governance handoff controls were established.

### Stage 2 — ArifPay sandbox integration

Complete for its governed bounded sandbox scope. PR #5 merged ArifPay sandbox C2B orchestration/reconciliation with hard sandbox guards, durable correlation, uncertainty handling, server-side session-ID reconciliation and explicit separation from PartnerFI settlement authority.

### Stage 3 — Partner Ecosystem & Network Liquidity (synthetic)

Complete for its governed synthetic scope.

Merged Stage 3 slices:

- PR #10 — governed synthetic Partner Ecosystem model, capability switches, route provenance, read-only console and provider-readiness truth sync;
- PR #11 — primary-navigation access to Partner Ecosystem;
- PR #12 — synthetic Network Liquidity Coverage / Liquidity Coverage Index decision support with 2H/4H/8H/EOD horizons and explicit non-regulatory terminology;
- PR #13 — synthetic Cash Fleet and liquidity-match planning with no custody, dispatch, handover or cash movement authority;
- PR #14 — bounded FMCG inventory/logistics planning with purpose-limited data and no live ordering/settlement authority;
- PR #15 — Supervisor / Regional Operations UI truth-sync removing stale Virtual ATM / swap-ledger wording from the active route;
- PR #16 — synthetic network-operations role/action/object authorization and Supervisor/Operations access-boundary UX.

The Stage 3 exit gate is recorded in `STAGE_3_EXIT_GATE_REVIEW.md`.

## 2. Provider foundations carried forward

These provider-specific foundations remain independently gated and are **not** activated by Stage 3 completion or Stage 4 entry.

### ArifPay

Bounded sandbox C2B orchestration/reconciliation is implemented. Gateway confirmation remains provider evidence only and never becomes PartnerFI settlement automatically.

### Direct Telebirr

PR #6 merged an inactive/TestBed foundation. Direct payment initiation remains disabled pending TLS trust, provider scope, fresh credentials and pinned protocol/authenticity semantics. No TLS bypass is permitted.

### M-PESA Ethiopia direct

PR #7 merged an inactive Ethiopia sandbox contract/correlation foundation. The documented token contract was verified from a controlled external local runtime with sanitized output. Payment initiation, status, callbacks, payout, reversal, balance transport, PartnerFI posting and settlement remain unverified/unmounted.

## 3. Canonical validation evidence

The current `main` baseline `edfba4823cc6be9b5f001b8d0f83fb24728335d8` was validated by GitHub Actions `Synthetic prototype validation` run #265 (`38443851184`) on 2026-10-13.

Result: **PASS**.

Validated gates:

- clean dependency installation;
- production dependency audit;
- TypeScript/lint;
- unit/domain/API tests;
- production build;
- synthetic Docker image build;
- Chromium installation;
- Chromium E2E.

The validation remains synthetic with external telemetry disabled. Development/tooling dependency findings and the existing Vite >500 kB chunk advisory remain non-blocking engineering observations and do not constitute production-readiness evidence.

## 4. Current product surfaces

The governed product skeleton now includes:

- Agent Terminal;
- Farmer 360 / customer workbench;
- Supervisor / Regional Operations truth-synced workspace;
- Operations & Reconciliation;
- Partner Ecosystem Console;
- Network Liquidity Console (NLC/LCI);
- Cash Fleet Planning Console;
- FMCG Inventory & Logistics Console;
- Network Operations Access console;
- provider-readiness visibility;
- GhostSync queue and Data Mule transport demonstration;
- agent readiness/onboarding walkthrough;
- node/architecture status view;
- Academy/training;
- conversation/transcription concept;
- Ardi arithmetic illustration.

These surfaces are bounded synthetic/sandbox-capable product evidence, not proof of external institutional authorization.

## 5. Current hard boundaries

The repository remains a **bounded synthetic / sandbox-capable prototype**. It does not establish:

- real customer PII processing;
- real customer funds or liabilities;
- live bank/MFI posting authority;
- live Fayda/identity connectivity;
- production payment-provider credentials;
- direct Telebirr payment initiation;
- M-PESA Ethiopia payment initiation;
- real cash-in/cash-out authority, cash custody, fleet dispatch or handover;
- PartnerFI settlement authority;
- approved Ethiopia-resident staging merely because infrastructure exists;
- approved production key custody;
- production HA/DR;
- regulated pilot or production authorization.

Provider acceptance or success MUST NOT be represented as PartnerFI settlement. Code presence, a UI surface or an operational environment MUST NOT be represented as capability authorization.

## 6. Current program position

Stage 3 exit is approved by the recorded internal engineering gate review. The governance transition now proposes:

> **Stage 4 — Governed ET-resident staging foundation**

Stage 4 is limited to building and evidencing an approved **non-production** Ethiopia-resident staging foundation. Required evidence includes:

1. physical compute/ingress location;
2. database primary/replica location;
3. backup location and restore evidence;
4. audit-store controls;
5. encryption/key custody;
6. logging/monitoring data paths;
7. IAM/MFA/break-glass/access review;
8. incident response;
9. retention/deletion;
10. subprocessors/support access;
11. DR/RPO/RTO;
12. operational ownership/RACI.

Stage 4 does **not** authorize real PII, real funds, provider production activation, PartnerFI financial mutation, cash movement or regulated operation. Stage 5 external partner staging remains locked until Stage 4 evidence is complete and reviewed.