# Current Verified Baseline

**As of:** 2026-10-13  
**Canonical repository:** `abeselomchernet/Phygital-rural-Agent-Hub`  
**Visibility:** Private  
**Canonical branch:** `main`  
**Canonical baseline commit:** `0028b079c1c641535e00db78b58f29bb442136ae`

## 1. Completed governed phases

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

### Stage 1 - workspace re-baseline and post-P0 closure

Complete. The clean hosted validation baseline was reproduced and the post-P0 closure was recorded without rewriting historical validation evidence.

### Stage 2 - ArifPay sandbox integration

Complete for its governed scope. PR #5 merged the bounded ArifPay sandbox C2B orchestration/reconciliation slice with hard sandbox guards, pre-submit durable correlation, uncertainty handling, server-side session-ID reconciliation, Operations UX and explicit separation from PartnerFI settlement authority.

Stage 2 did **not** authorize production provider credentials, real customer PII, real funds, cash custody, live PartnerFI posting or regulated operation.

## 2. Additional merged provider foundations

These are provider-specific foundations layered onto the bounded baseline; they do not expand regulated authority.

### Direct Telebirr

PR #6 merged an inactive/TestBed foundation with strict configuration, guarded token/query primitives, canonical signing/builders, durable pre-submit correlation and read-only provider-readiness visibility. Networking/payment initiation remains disabled pending provider/TLS and protocol gates. Standard TLS verification failed against the supplied TestBed path; no TLS bypass is permitted.

### M-PESA Ethiopia direct

PR #7 merged an inactive Ethiopia sandbox contract/correlation foundation with a hard-pinned Safaricom Ethiopia sandbox token client and provider-neutral attempt primitives. A controlled external local runtime successfully verified the documented token contract and returned sanitized metadata indicating `Bearer` with `expires_in=3599`.

That token verification does **not** verify or authorize payment initiation, payout, callback authority, status mapping, reversal, account-balance transport, PartnerFI posting or settlement.

## 3. Canonical validation evidence

The current `main` baseline `0028b079c1c641535e00db78b58f29bb442136ae` was validated by GitHub Actions `Synthetic prototype validation` run #245 (`38426151886`) on 2026-10-13.

Result: **PASS**.

Validated gates:

- `npm ci`;
- production dependency audit with 0 production findings;
- TypeScript/lint;
- unit/domain/API tests;
- production build;
- synthetic Docker image build;
- Chromium installation;
- Chromium E2E.

The validation remains explicitly synthetic with external telemetry disabled. Known non-blocking observations remain the development/tooling graph's 23 findings (2 low, 4 moderate, 17 high) and the existing Vite >500 kB chunk advisory.

## 4. Existing UI/product skeleton

Current product surfaces provide the base to evolve rather than replace:

- Agent Terminal;
- Farmer 360 / customer workbench;
- Supervisor Hub;
- Operations & Reconciliation;
- partner/provider readiness visibility;
- GhostSync queue and Data Mule transport demonstration;
- agent readiness/onboarding walkthrough;
- node/architecture status view;
- Academy/training;
- conversation/transcription concept;
- Ardi arithmetic illustration;
- inventory and liquidity-planning demonstrations.

Stage 3 should add Partner Ecosystem and network-liquidity capabilities into this governed product architecture rather than create ungoverned provider silos.

## 5. Current hard boundaries

The current repository remains a **bounded synthetic / sandbox-capable prototype**, not a live regulated financial deployment. It does not establish:

- live bank/MFI connectivity or posting authority;
- live Fayda/identity connectivity;
- production payment-provider credentials;
- direct Telebirr payment initiation;
- M-PESA Ethiopia payment initiation;
- real customer PII;
- real customer funds or liabilities;
- real cash-in/cash-out authority or physical cash custody;
- approved Ethiopia-resident production/staging infrastructure;
- approved production key custody;
- production HA/DR;
- live SMS/USSD/hardware control;
- regulated pilot authorization.

Provider acceptance or provider success MUST NOT be represented as PartnerFI settlement.

## 6. Current program position

The active substantive stage is now:

> **Stage 3 - Partner Ecosystem & Network Liquidity (synthetic)**

Stage 3 is restricted to reusable synthetic product architecture and decision support:

1. partner organization and capability-switch model;
2. Partner Ecosystem Console;
3. route provenance across service provider, integration route, gateway/operator and Enawuga transaction;
4. Network Liquidity Coverage / Liquidity Coverage Index using non-regulatory terminology;
5. synthetic 2h/4h/8h/EOD liquidity horizons and operational states;
6. synthetic cash-fleet planning and liquidity-match simulation;
7. bounded FMCG partner/inventory/logistics models;
8. role/object authorization expansion;
9. Supervisor/Operations network-operations UX;
10. no real cash movement, custody, regulated posting or provider activation.

The next substantive stage after evidence-gated Stage 3 completion is Stage 4 - Governed ET-resident staging foundation.
