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

Historical validation recorded 59 domain/API tests and 12 Chromium E2E tests passing, a passing build and zero production dependency vulnerabilities at that validation point.

## 2. Existing UI/product skeleton

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

## 3. Current hard boundaries

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

## 4. Known documentation synchronization item

`docs/P0_BACKLOG.md` contains some pre-completion descriptions of P0-B controls. It is historical/stale in parts and SHOULD be synchronized in a separate closure update without rewriting `P0_B_COMPLETION_VALIDATION.md`.

## 5. Immediate program position

The next sequence is:

1. Re-baseline the private coding workspace against current `main` without code edits or deployment.
2. Complete a small post-P0-B closure/documentation synchronization.
3. Begin a separate sandbox-only ArifPay payment-gateway adapter workstream.
4. Add partner-ecosystem, network-liquidity, fleet and FMCG simulation capabilities behind clear maturity states.
5. Advance toward approved ET-resident staging only when its evidence gate can be populated with external artifacts.
