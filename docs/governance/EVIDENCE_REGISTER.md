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
| EV-2026-10-13-STAGE3-IMPLEMENTATION | Code / architecture | Stage 3 synthetic partner/liquidity/network-operations implementation | Wishland / Abeselom Girum Chernet | 2026-10-13 | Accepted | Accepted only for bounded synthetic implementation: Partner Ecosystem, route provenance, NLC/LCI, Cash Fleet planning, FMCG inventory/logistics, Supervisor claims truth-sync and synthetic role/action/object authorization. No live financial/cash/settlement authority. | `partner_ecosystem_core`, `network_liquidity_coverage`, `cash_fleet_planning`, `fmcg_commerce`, `network_operations_authorization` | Stage 3 exit | PRs #10, #11, #12, #13, #14, #15, #16 |
| EV-2026-10-13-MAIN-265 | Other | Canonical post-Stage-3 `main` validation | GitHub Actions / Wishland | 2026-10-13 | Accepted | Exact baseline `edfba4823cc6be9b5f001b8d0f83fb24728335d8`; clean dependency install, production audit, lint, tests, build, Docker and Chromium E2E passed. Synthetic validation does not prove production readiness, residency approval or external authorization. | repository baseline | Stage 3 exit | `Synthetic prototype validation` run #265 / `38443851184` |
| EV-2026-10-13-STAGE3-EXIT | Gate review | Stage 3 exit / Stage 4 entry review | Wishland / Abeselom Girum Chernet | 2026-10-13 | Approved with conditions | Stage 3 exit approved. Stage 4 entry is limited to governed ET-resident **non-production** staging foundation work. Real PII, funds, production credentials, live PartnerFI mutation, live cash movement and regulated operation remain locked. | `et_resident_staging_foundation` | Stage 3 exit / Stage 4 entry | `docs/governance/STAGE_3_EXIT_GATE_REVIEW.md` |

## Open evidence requirements for Stage 4 exit

Stage 4 exit requires, at minimum:

- accepted physical compute/ingress location evidence;
- accepted database primary/replica location evidence;
- accepted backup location plus successful synthetic restore evidence;
- audit-store controls and access evidence;
- encryption/key-custody evidence;
- logging/monitoring data-path evidence;
- IAM/MFA/break-glass/access-review evidence;
- incident-response procedures and rehearsal evidence where applicable;
- retention/deletion evidence;
- subprocessor/support-access review;
- DR/RPO/RTO evidence using synthetic data;
- operational ownership/RACI;
- claims review confirming that an operational environment is not represented as approved residency or financial authorization without accepted evidence;
- green Stage 4 validation and explicit Stage 4 gate review before Stage 5 external partner staging.
