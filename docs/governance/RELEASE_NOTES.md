# Governance Release Notes

This file records forward governance/state transitions. It does not replace immutable historical validation records or authorize regulated operation.

## 2026-10-14 — Governance v1.3 / Stage 3 exit / Stage 4 entry

### Accepted baseline

Canonical `main` baseline after the PartnerFI Gamma configuration-only acceptance proof:

`2b19cf394c931feac5fa439661998986e526270b`

GitHub Actions `Synthetic prototype validation` run #347 (`38559099782`) completed successfully on this baseline.

PR #37 exact head `7d5d9a597a986e51b8c3fc76477a4fe6279bf2c8` passed run #346 (`38556120717`) before merge.

### Stage transition

- Stage 3 — Partner Ecosystem & Network Liquidity (synthetic): **COMPLETE for bounded synthetic scope**.
- Stage 4 — Governed ET-resident staging foundation: **ACTIVE / FOUNDATION ONLY**.
- Stage 5 — External partner staging: **LOCKED pending Stage 4 exit evidence**.

### Partner-platform work completed in Stage 3

Stage 3 now includes a complete bounded platform chain:

`Partner Capability Contract → Synthetic Reference Partners → Partner Service Catalog → Adapter Registry/Route Resolver → Capability-driven Workspace Manifest/UI → Partner Onboarding → Contract Certification`.

The architecture/design and runtime work were delivered as separate review units across PRs #19–#36.

PR #37 then executed the approved platform Definition of Done using a brand-new Synthetic PartnerFI Gamma. Gamma was introduced through a new capability contract, service catalog, membership/scope and route while reusing an existing registered PartnerFI adapter plus the existing service/workspace/certification runtimes. No Gamma-specific Agent Terminal, Supervisor/Operations UI fork or shared-core branch was required.

This is accepted as **synthetic architecture proof**, not evidence of a real institutional integration or production authorization.

### Provider truth carried forward

- **ArifPay:** bounded sandbox integration; executable only when the guarded sandbox runtime is configured. Provider success is not PartnerFI settlement.
- **Direct Telebirr:** `REGISTERED_TESTBED` + `FOUNDATION_ONLY`; direct payment route remains unmounted pending remaining TestBed and certification/activation gates.
- **M-PESA Ethiopia direct:** `REGISTERED_SANDBOX` + `FOUNDATION_ONLY`; token/authentication contract verified; payment/status/callback routes remain unmounted.

Adapter/environment registration is not route activation, production authorization or settlement authority.

### Stage 4 approved scope

Stage 4 may build/evidence:

- Ethiopia-resident non-production compute/ingress topology;
- database primary/replica and backup topology;
- restore/recovery evidence;
- audit-store controls;
- encryption/key custody;
- logging/monitoring data paths;
- IAM/MFA/break-glass/access-review controls;
- incident-response controls;
- retention/deletion controls;
- subprocessor/support-access controls;
- DR/RPO/RTO evidence;
- operational RACI;
- infrastructure-as-code and synthetic deployment validation.

### Locked boundaries carried into Stage 4

Stage 4 does not authorize:

- real customer PII;
- real funds or liabilities;
- real cash custody, movement, dispatch or handover;
- production provider credentials;
- direct Telebirr/M-PESA payment activation;
- live PartnerFI account posting/settlement;
- live identity-provider access;
- regulated pilot or production operation;
- treating NLC/LCI as prudential regulatory LCR;
- treating UI visibility, adapter registration, onboarding state or certification PASS as external authority.

## 2026-10-13 — Governance v1.1 / Stage 3 entry

Stage 2 ArifPay sandbox integration was completed for its bounded scope and Stage 3 synthetic Partner Ecosystem/Network Liquidity work was opened. The original Stage 3 entry records remain historical evidence of that transition.
