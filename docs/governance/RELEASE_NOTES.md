# Governance Release Notes

This file records forward governance/state transitions. It does not replace immutable historical validation records or authorize regulated operation.

## 2026-10-13 - Governance v1.2 / Stage 3 exit and Stage 4 entry

### Baseline

Canonical post-Stage-3 `main` baseline:

`edfba4823cc6be9b5f001b8d0f83fb24728335d8`

GitHub Actions `Synthetic prototype validation` run #265 (`38443851184`) completed successfully on this baseline.

### Stage 3 completion

Stage 3 — Partner Ecosystem & Network Liquidity (synthetic) is complete for its governed bounded scope. The merged implementation sequence includes:

- PR #10 — Partner Ecosystem model, capability switches, route provenance, read-only console and provider UI truth-sync;
- PR #11 — Partner Ecosystem primary-navigation refinement;
- PR #12 — synthetic NLC/LCI decision support with 2H/4H/8H/EOD horizons;
- PR #13 — synthetic Cash Fleet and liquidity-match planning;
- PR #14 — bounded FMCG inventory/logistics planning;
- PR #15 — Supervisor / Regional Operations UI truth-sync;
- PR #16 — synthetic network-operations role/action/object authorization and UX.

The Stage 3 exit decision is recorded in `STAGE_3_EXIT_GATE_REVIEW.md`.

### Stage transition

- Stage 1 remains complete.
- Stage 2 remains complete for its governed ArifPay sandbox scope.
- Stage 3 is complete for its governed synthetic partner/liquidity/network-operations scope.
- Stage 4 — Governed ET-resident staging foundation becomes the active substantive stage when this governance transition is merged.
- Stage 5 external partner staging remains locked pending Stage 4 exit evidence.

### Stage 4 approved scope

Stage 4 may build and evidence a non-production Ethiopia-resident staging foundation, including:

- compute/ingress, database, backup, audit-store and observability location evidence;
- encryption/key-custody controls;
- IAM/MFA/break-glass/access review;
- incident-response and operational ownership/RACI;
- retention/deletion and subprocessor/support-access review;
- synthetic-only backup/restore and DR/RPO/RTO rehearsal;
- synthetic-only observability and staging validation.

An environment being technically operational does not by itself prove accepted Ethiopia residency, production readiness or financial authorization.

### Provider status carried into Stage 4

- **ArifPay:** bounded sandbox C2B orchestration/reconciliation remains implemented; gateway evidence is separate from PartnerFI settlement.
- **Direct Telebirr:** inactive/TestBed foundation remains gated by TLS trust, provider scope, fresh credentials and pinned protocol/authenticity evidence.
- **M-PESA Ethiopia direct:** token contract remains verified, while payment initiation/status/callback and settlement behavior remain unverified/unmounted.

Stage 4 does not activate any provider merely because staging infrastructure exists.

### Locked boundaries

Stage 4 does not authorize:

- real customer PII without explicit approved data/residency scope;
- real funds or liabilities;
- production provider credentials;
- direct Telebirr or M-PESA production/payment activation;
- live PartnerFI account/balance/posting mutation;
- live identity-provider access without later approved staging scope;
- real cash custody, dispatch, handover or movement;
- regulated pilot or production operation;
- claims that NLC/LCI is prudential regulatory LCR;
- claims that provider acceptance/success equals PartnerFI settlement;
- claims that environment availability equals residency approval or capability authorization.

### Governance files synchronized

This transition updates:

- `PROGRAM_STATUS.yaml`;
- `CAPABILITY_REGISTRY.yaml`;
- `CURRENT_BASELINE.md`;
- `STAGE_GATE_ROADMAP.md`;
- `README.md`;
- `EVIDENCE_REGISTER.md`;
- `RELEASE_NOTES.md`;
- and adds `STAGE_3_EXIT_GATE_REVIEW.md`.

The first substantive Stage 4 infrastructure/evidence work should use a separate feature/infra branch after this governance transition is reviewed and merged.

---

## 2026-10-13 - Governance v1.1 / Stage 3 entry

### Baseline

Canonical `main` baseline after PR #7:

`0028b079c1c641535e00db78b58f29bb442136ae`

GitHub Actions `Synthetic prototype validation` run #245 (`38426151886`) completed successfully on this baseline.

### Stage transition

- Stage 1 remains complete.
- Stage 2 - ArifPay Sandbox Integration is complete for its governed bounded sandbox scope.
- Stage 3 - Partner Ecosystem & Network Liquidity (synthetic) became the active substantive stage.
- Stage 4 - Governed ET-resident staging foundation remained locked pending Stage 3 exit evidence.

### Provider status carried into Stage 3

- **ArifPay:** bounded sandbox C2B orchestration/reconciliation was merged. Gateway evidence remained separate from PartnerFI settlement authority.
- **Direct Telebirr:** inactive/TestBed foundation was merged. Direct payment initiation remained disabled pending TLS trust and provider-contract/protocol gates.
- **M-PESA Ethiopia direct:** inactive sandbox foundation was merged. The documented token contract had been runtime-verified from an external local environment; payment initiation, callbacks, status, payout, reversal, balance and settlement behavior remained unverified/unmounted.

### Stage 3 approved engineering scope

Stage 3 was authorized for synthetic partner organization/capability-switch models, Partner Ecosystem UX, route provenance, NLC/LCI decision support, synthetic Cash Fleet planning, FMCG/logistics models, liquidity-match simulation and expanded network-operations authorization/UX while real-data, real-funds, cash-custody and regulated-operation boundaries remained locked.
