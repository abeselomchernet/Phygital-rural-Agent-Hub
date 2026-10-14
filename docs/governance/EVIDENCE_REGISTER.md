# Governance Evidence Register

**Updated:** 2026-10-14  
**Scope:** Forward stage/provider/platform governance evidence for Enawuga / Phygital Rural Agent Hub.

An `Accepted` decision here means accepted as evidence for the stated bounded engineering purpose. It does **not** mean regulatory approval, provider endorsement, PartnerFI authorization, production certification or permission to move real funds.

## Evidence entries

| Evidence ID | Category | Artifact / version | Decision | Conditions / interpretation | Related gate | Reference |
|---|---|---|---|---|---|---|
| EV-2026-10-12-ARIFPAY-S2 | Provider | ArifPay sandbox C2B integration | Accepted | Bounded sandbox gateway orchestration/reconciliation only. Provider success is not PartnerFI settlement. | Stage 2 exit | PR #5; merge `023a0919a44a28241711331a2dfc115e530d2294` |
| EV-2026-10-13-TELEBIRR-FOUNDATION | Provider | Direct Telebirr TestBed T1-T10 foundation | Conditional | `REGISTERED_TESTBED` + `FOUNDATION_ONLY`; direct payment route remains unmounted pending TLS/provider-contract/payment-evidence/certification/activation gates. | Provider activation | PR #6; merge `75abae49b323d48ec9574dc086c65814726e3012`; PR #30 state model |
| EV-2026-10-13-MPESA-TOKEN | Provider | M-PESA Ethiopia sandbox/token foundation | Accepted | `REGISTERED_SANDBOX` + `FOUNDATION_ONLY`; token/auth contract verified. Payment/status/callback routes remain unmounted. | Provider activation | PR #7; merge `0028b079c1c641535e00db78b58f29bb442136ae`; PR #30 state model |
| EV-2026-10-13-STAGE3-GATE | Governance | Stage 2→3 transition | Accepted | Synthetic partner-platform/network-liquidity scope only. | Stage 3 entry | PR #9 and governance pack |
| EV-2026-10-14-PARTNER-CONTRACT | Platform | Partner Capability Contract | Accepted | Strict machine-readable organization/capability/role/region/object/route/evidence policy. Does not create external authority. | Stage 3 exit | PR #20 + runtime PR #27 |
| EV-2026-10-14-REFERENCE-PARTNERS | Platform | Heterogeneous Synthetic Reference Partners | Accepted | Multiple PartnerFI/provider classes with deliberately different capabilities; no real partnership claim. | Stage 3 exit | PR #21 + runtime PR #28 |
| EV-2026-10-14-SERVICE-CATALOG | Platform | Partner Service Catalog | Accepted | Partner-owned services map to reusable workflows/capabilities/routes; publication alone does not authorize execution. | Stage 3 exit | PR #22 + runtime PR #29 |
| EV-2026-10-14-ADAPTER-REGISTRY | Platform | Adapter Registry + Route Resolver | Accepted | Service/capability/route/adapter separation; provider foundations separated from executable routes; pinned route after submission/ambiguity. | Stage 3 exit | PR #24 + runtime PR #30 |
| EV-2026-10-14-CAPABILITY-UI | Product | Capability-driven role/partner UI | Accepted | Server-resolved Workspace Manifest; Alpha/Beta Agents differ via policy using shared UI; Operations bounded separately; UI hiding is not authorization. | Stage 3 exit | PR #31 + runtime PR #32; exact-head run #336 `38552959492` |
| EV-2026-10-14-ONBOARDING | Platform | Partner Onboarding state machine | Accepted | Configuration-only/new-adapter/new-domain paths separated; organization/capability lifecycle separated; Stage 3 blocks staging/live transitions. | Stage 3 exit | PR #33 + runtime PR #34; exact-head run #340 `38554247025` |
| EV-2026-10-14-CERTIFICATION | Platform | Contract Certification runtime | Accepted | Deterministic L0/L1/L2 policy runner; foundation-only cannot certify executable capability scope; PASS carries `authorityGranted=false`. | Stage 3 exit | PR #35 + runtime PR #36; exact-head run #344 `38555417012` |
| EV-2026-10-14-GAMMA-DOD | Platform acceptance | Synthetic PartnerFI Gamma configuration-only proof | Accepted | New PartnerFI contract/catalog/membership/route + existing adapter + existing workspace/certification runtime; no Gamma-specific core/UI fork. Synthetic architecture proof only. | Stage 3 exit | PR #37 exact head `7d5d9a597a986e51b8c3fc76477a4fe6279bf2c8`; run #346 `38556120717`; merge `2b19cf394c931feac5fa439661998986e526270b` |
| EV-2026-10-14-MAIN-347 | Repository validation | Post-PartnerFI-Gamma `main` validation | Accepted | Full synthetic CI passed; does not establish production readiness. | Stage 3 exit | `main` `2b19cf394c931feac5fa439661998986e526270b`; run #347 `38559099782` |

## Stage 3 exit decision

**PASS for the bounded synthetic scope.** See `STAGE_3_EXIT_GATE_REVIEW.md`.

The evidence supports entry into Stage 4 infrastructure/evidence work. It does not unlock real PII, funds, cash movement, production credentials, provider-production routes, PartnerFI posting/settlement, live identity, regulated pilot or production mode.

## Open evidence requirements for Stage 4 exit

Stage 4 must produce, at minimum:

- physical compute/ingress location evidence for the chosen Ethiopia-resident non-production topology;
- database primary/replica and backup location evidence;
- restore rehearsal evidence;
- audit-store controls;
- encryption/key-custody design and implementation evidence;
- logging/monitoring data-path evidence;
- IAM/MFA/break-glass/access-review evidence;
- incident-response evidence;
- retention/deletion evidence;
- subprocessor/support-access evidence;
- DR/RPO/RTO evidence;
- operational ownership/RACI;
- exact-head and post-merge validation;
- explicit Stage 4 exit gate review before any Stage 5 external partner staging.
