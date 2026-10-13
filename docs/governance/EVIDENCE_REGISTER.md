# Governance Evidence Register

**Established:** 2026-10-13  
**Scope:** Forward stage/provider/governance evidence for Enawuga / Phygital Rural Agent Hub.

This register records evidence used for internal engineering and stage-gate decisions. An `Accepted` decision here means accepted as evidence for the stated bounded engineering purpose. It does **not** mean regulatory approval, provider endorsement, PartnerFI authorization, production certification or permission to move real funds.

Historical validation documents remain immutable evidence of their original scope and are not rewritten by this register.

## Entries

| Evidence ID | Category | Artifact / version | Owner | Review date | Decision | Conditions / interpretation | Related capability | Related stage gate | Storage / reference |
|---|---|---|---|---|---|---|---|---|---|
| EV-2026-10-12-ARIFPAY-S2 | Provider | Stage 2 ArifPay sandbox C2B integration | Wishland / Abeselom Girum Chernet | 2026-10-13 | Accepted | Accepted only for bounded sandbox gateway orchestration/reconciliation. Gateway success is evidence, never PartnerFI settlement. No production credentials, real PII or real funds. | `arifpay_gateway` | Stage 2 exit | PR #5; merge `023a0919a44a28241711331a2dfc115e530d2294`; sandbox network evidence recorded in PR |
| EV-2026-10-13-TELEBIRR-FOUNDATION | Provider | Direct Telebirr TestBed T1-T10 inactive foundation | Wishland / Abeselom Girum Chernet | 2026-10-13 | Conditional | Accepted as an inactive/read-only foundation only. Direct initiation remains blocked by TLS trust, product scope, fresh credential and protocol/authenticity gates. No TLS bypass permitted. | `telebirr_direct` | Provider-specific future activation gate | PR #6; merge `75abae49b323d48ec9574dc086c65814726e3012` |
| EV-2026-10-13-MPESA-TOKEN | Provider | Safaricom Ethiopia M-PESA sandbox token contract | Wishland / Abeselom Girum Chernet | 2026-10-13 | Accepted | Runtime token contract verified from an external local environment with sanitized output: provider `MPESA_ETHIOPIA_DIRECT`, sandbox, `Bearer`, expiry `3599`. This does not verify or authorize payment initiation, callbacks, settlement, B2C, status, reversal or balance transport. | `mpesa_ethiopia_direct` | Provider-specific future activation gate | PR #7; merge `0028b079c1c641535e00db78b58f29bb442136ae`; `docs/MPESA_ETHIOPIA_SANDBOX.md` |
| EV-2026-10-13-MAIN-245 | Other | Canonical post-PR #7 `main` validation | GitHub Actions / Wishland | 2026-10-13 | Accepted | Synthetic validation only. Production dependency audit, lint, tests, build, Docker and Chromium E2E passed. Does not prove production readiness or external authorization. | repository baseline | Stage 2-to-3 transition | `Synthetic prototype validation` run #245 / `38426151886`; baseline `0028b079c1c641535e00db78b58f29bb442136ae` |
| EV-2026-10-13-STAGE3-GATE | Other | Stage 2-to-3 governance transition | Wishland / Abeselom Girum Chernet | 2026-10-13 | Accepted | Stage 3 is synthetic partner-ecosystem/network-liquidity architecture only. Real PII, funds, cash custody, production credentials, direct-provider activation, PartnerFI posting and regulated operation remain locked. NLC/LCI must not be represented as regulatory LCR. | `partner_ecosystem_core`, `network_liquidity_coverage`, `cash_fleet_planning`, `fmcg_commerce` | Stage 3 entry | `PROGRAM_STATUS.yaml`, `CAPABILITY_REGISTRY.yaml`, `CURRENT_BASELINE.md`, `STAGE_GATE_ROADMAP.md` |

## Open evidence requirements for Stage 3 exit

Stage 3 exit requires, at minimum:

- synthetic partner organization/capability-switch implementation evidence;
- explicit route-provenance tests and claims review;
- NLC/LCI metric definition, horizon behavior and boundary tests;
- synthetic cash-fleet and liquidity-match simulation evidence with no live custody/movement;
- FMCG data-scope/minimization evidence;
- role/object authorization tests for new network-operations surfaces;
- Operations/Supervisor/Partner Ecosystem UX validation;
- security/claims review confirming that no code/configuration is represented as financial authorization;
- a green exact-head validation and an explicit Stage 3 gate review before Stage 4.
