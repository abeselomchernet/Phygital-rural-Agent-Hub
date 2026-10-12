# Current Verified Baseline

**As of:** 2026-10-12  
**Canonical repository:** `abeselomchernet/Phygital-rural-Agent-Hub`  
**Visibility:** Private  
**Canonical branch:** `main`  
**Canonical baseline commit:** `cd48c377e4398b77f2cd725eb2bd5706774d2817`

## 1. Completed historical phases

### P0-A - partner-led financial, identity and residency boundaries

Merged. The project established:

- immutable `customerId` as canonical customer reference;
- phone as changeable operational alias;
- explicit KYC state machine;
- mock identity-provider boundary rather than transaction-time identity lookup;
- `FinancialInstitutionAdapter` boundary with PartnerFI authority separate from Wishland;
- GhostSync transport separated from financial state;
- regulated execution fail-closed;
- removal/closure of legacy unsafe mutation paths and misleading claims.

### P0-B - authenticated durable synthetic staging foundation

Merged. Bounded synthetic work includes:

- server-verified synthetic sessions and role/object/CSRF controls;
- durable local JSON persistence and restart-safe idempotency;
- reconciliation state model with uncertain outcomes;
- authenticated mock callback verification, replay/sequence/terminal-state protections;
- redacted audit schema and recovery controls;
- encrypted-edge interface/threat-model contract that fails closed where unsupported;
- Ethiopia-resident staging evidence checklist;
- active UI/claims review.

## 2. Stage 1 re-validation and closure

Stage 1 — Workspace Re-baseline & P0 Closure is complete for its governed scope.

Fresh GitHub-hosted validation on 2026-10-12 reproduced the bounded baseline with:

- Node `v24.21.0` and npm `11.19.0`;
- `npm ci` PASS with 576 packages;
- `npm audit --omit=dev` PASS with 0 production vulnerabilities;
- lint PASS;
- 59/59 domain/API tests PASS;
- production build PASS;
- Docker image build PASS;
- 12/12 Chromium E2E tests PASS;
- `DATA_MODE=synthetic` and external telemetry disabled.

Known non-blocking observations remain the full development/tooling graph's 23 findings (2 low, 4 moderate, 17 high) and the existing Vite >500 kB chunk advisory.

See `docs/P0_POST_MERGE_CLOSURE.md` for the closure record. Historical P0-A/P0-B validation documents remain unchanged.

## 3. Existing UI/product skeleton

Current routes provide a useful product base:

- Agent Terminal.
- Farmer 360 / customer workbench.
- GhostSync queue.
- Agent readiness/onboarding walkthrough.
- Supervisor Hub.
- Data Mule transport demonstration.
- Node/architecture status view.
- Academy/training.
- Conversation/transcription concept.
- Ardi arithmetic illustration.
- Inventory and liquidity-planning demonstrations.

These surfaces SHOULD be evolved rather than discarded.

## 4. Current hard boundaries

The current repository MUST still be described as a bounded synthetic prototype. It does not establish:

- live bank/MFI connectivity;
- live Fayda/identity connectivity;
- live ArifPay/payment-provider connectivity;
- real cash-in/cash-out authority;
- real customer funds or liabilities;
- production-grade encrypted edge storage;
- approved Ethiopia-resident production/staging infrastructure;
- approved key custody;
- production HA/DR;
- live SMS/USSD/hardware control;
- regulated pilot authorization.

## 5. Current program position

The active substantive stage is now:

> **Stage 2 — ArifPay Sandbox Integration**

The Stage 2 sequence is:

1. Re-verify current official ArifPay sandbox documentation before implementation.
2. Create a separate task-specific branch after governance PR closure.
3. Implement `PaymentGatewayAdapter` and `ArifPaySandboxAdapter` with a hard sandbox-only guard.
4. Prove one narrow C2B sandbox flow using synthetic customer/amount data.
5. Integrate callback/status reconciliation with the existing P0-B state model, idempotency and replay protections.
6. Add bounded sandbox Operations/Reconciliation UX and validation evidence.
7. Keep ArifPay separate from PartnerFI authority and keep all real-data/live-cash/production-provider capabilities disabled.

After Stage 2, the next planned substantive stage is Partner Ecosystem & Network Liquidity: partner organization types, NLC/LCI, Cash Fleet planning, FMCG/logistics, synthetic liquidity matching and expanded Supervisor/Operations UX.
