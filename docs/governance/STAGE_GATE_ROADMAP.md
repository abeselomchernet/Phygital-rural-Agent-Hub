# Stage-Gate Roadmap

This roadmap is evidence-gated, not calendar-gated. No stage has a guaranteed duration.

## Stage 0 - Current bounded synthetic baseline

**Status:** COMPLETE / HISTORICAL BOUNDED BASELINE.

Evidence: P0-A and P0-B merged; the current verified baseline is recorded in `CURRENT_BASELINE.md`.

Allowed:

- synthetic fixtures;
- mocks;
- local durable development state;
- bounded synthetic authentication/reconciliation/audit behavior.

Forbidden:

- real customer PII;
- real funds;
- production provider credentials;
- real cash custody;
- claims of regulated deployment.

## Stage 1 - Workspace re-baseline and post-P0 closure

**Status:** COMPLETE.

**Goal:** establish a clean private coding environment and synchronize forward documentation.

Exit evidence: clean validation report and merged closure/governance records.

## Stage 2 - ArifPay sandbox integration

**Status:** COMPLETE for the governed ArifPay sandbox scope; PR #5 merged.

**Goal:** prove one external payment-gateway integration without crossing into production.

Exit evidence included bounded external sandbox evidence, reconciliation tests, security review, provider-provenance mapping and explicit separation from PartnerFI settlement authority.

## Stage 3 - Partner Ecosystem & Network Liquidity (synthetic)

**Status:** COMPLETE for the governed synthetic scope.

**Goal:** build the reusable product architecture for multiple partner classes and field liquidity planning.

Completed scope:

- partner organization / capability-switch model and Partner Ecosystem Console — PR #10;
- primary Partner Ecosystem navigation — PR #11;
- Network Liquidity Coverage / Liquidity Coverage Index with 2H/4H/8H/EOD synthetic horizons — PR #12;
- synthetic Cash Fleet planning and liquidity-match simulation — PR #13;
- bounded FMCG partner/inventory/logistics model — PR #14;
- Supervisor / Regional Operations claims truth-sync — PR #15;
- network-operations role/action/object authorization and Supervisor/Operations access UX — PR #16.

Important terminology remains binding: use **Network Liquidity Coverage (NLC)** or **Liquidity Coverage Index (LCI)** rather than unqualified `LCR` unless a licensed partner formally defines that metric. Synthetic demo thresholds are not partner-approved operating limits or prudential compliance claims.

No real cash movement, custody, PartnerFI posting or provider activation was introduced.

Stage 3 exit evidence is recorded in `STAGE_3_EXIT_GATE_REVIEW.md`. Canonical post-Stage-3 `main` validation is run #265 (`38443851184`) on `edfba4823cc6be9b5f001b8d0f83fb24728335d8`, result PASS.

## Stage 4 - Governed ET-resident staging foundation

**Status:** ACTIVE ON MERGE OF THE STAGE 3 EXIT / STAGE 4 ENTRY GOVERNANCE TRANSITION; APPROVED WITH CONDITIONS.

**Goal:** stand up and evidence an approved non-production environment whose evidence can satisfy the staging evidence register while all regulated financial capabilities remain locked.

Required evidence categories:

- physical compute/ingress location;
- database primary/replica location;
- backup location and restore evidence;
- audit store controls;
- encryption/key custody;
- logging/monitoring data paths;
- IAM/MFA/break-glass/access review;
- incident response;
- retention/deletion;
- subprocessors/support access;
- DR/RPO/RTO;
- operational ownership/RACI.

Allowed Stage 4 work:

- infrastructure-as-code or equivalent reproducible non-production environment definition;
- ET-residency evidence capture for compute, storage, databases, backup, audit and observability paths;
- staging IAM/MFA/break-glass/access-review controls;
- key-management and encryption evidence;
- synthetic-only backup/restore and DR rehearsals;
- synthetic-only observability, incident-response and retention/deletion validation;
- operational RACI and access/support/subprocessor review.

Still forbidden in Stage 4:

- real customer PII before explicit approved data/residency scope;
- real funds or liabilities;
- production provider credentials;
- live PartnerFI posting/account mutation;
- live cash custody, dispatch, handover or movement;
- direct Telebirr or M-PESA payment activation merely because infrastructure exists;
- live identity-provider access without a later approved staging contract;
- claims that an operational environment is approved ET-resident staging before the required evidence is accepted;
- regulated pilot or production operation.

The environment may be technically operational while financial capabilities remain locked.

Exit evidence: completed Stage 4 evidence register, synthetic staging validation, security/claims review and explicit Stage 4 gate decision before Stage 5.

## Stage 5 - External partner staging

**Status:** PLANNED / LOCKED pending Stage 4 exit evidence.

**Goal:** connect approved test/staging environments for the partners required by the pilot design.

Possible tracks:

- PartnerFI account/authorization API;
- ArifPay or other payment staging;
- approved identity staging;
- SMS/USSD staging;
- FMCG/distributor staging;
- fleet/cash logistics rehearsal using non-live/test value or controlled simulations.

Requirements:

- partner-specific adapter contracts;
- credentials in secrets management;
- end-to-end route provenance;
- joint test cases;
- reconciliation and incident procedures;
- approved data classes.

## Stage 6 - Controlled pilot readiness

**Goal:** prove the organization, technology and evidence are ready to request/enter a bounded live pilot.

Must be complete before activation:

- named scope, sites, agents, partners and limits;
- written pilot authorization/agreements;
- approved real-data paths;
- approved cash custody model if cash is in scope;
- identity/customer-consent process;
- support/escalation/incident procedures;
- monitoring and audit access;
- training/readiness;
- rollback/kill switches;
- operational rehearsal and DR test;
- unresolved risks formally accepted or closed.

## Stage 7 - Controlled live pilot

**Goal:** operate real but bounded transactions under written scope.

Controls:

- capability switches only for approved services;
- small named user/agent population;
- conservative limits;
- real-time exception monitoring;
- daily reconciliation;
- incident reporting;
- pilot evidence log;
- no automatic expansion to new regions/services.

Cash Fleet may become live only if custody, handover, security, insurance/operating policy, accounting and PartnerFI authority are approved.

## Stage 8 - Production readiness and launch

Required:

- production contracts/credentials;
- capacity/performance evidence;
- HA/DR evidence;
- security assessment and remediation;
- operational SLO/SLA and on-call;
- change/release management;
- support/complaints processes;
- privacy/retention operations;
- partner reconciliation contracts;
- production authorization decision.

## Stage 9 - Scale and ecosystem expansion

Possible expansion:

- additional financial institutions;
- additional payment/mobile-money rails;
- regional agent networks;
- FMCG/distributor integrations;
- agriculture services;
- insurance/PAYG/voucher programs;
- advanced liquidity optimization;
- permitted analytics.

Each new capability/partner repeats the relevant evidence and activation gate. Scale does not bypass governance.
