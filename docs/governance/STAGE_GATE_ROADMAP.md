# Stage-Gate Roadmap

This roadmap is evidence-gated, not calendar-gated. No stage has a guaranteed duration.

## Stage 0 - Current bounded synthetic baseline

**Status:** COMPLETE / CURRENT BASELINE.

Evidence: P0-A and P0-B merged; current `main` baseline recorded in `CURRENT_BASELINE.md`.

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

**Goal:** establish a clean private coding environment and synchronize forward documentation.

Required actions:

- verify current `main`;
- configure correct Git identity;
- Node 24 / npm 11 baseline;
- `npm ci`, production audit, lint, tests, build, E2E;
- no initial code changes during environment setup;
- add post-merge closure record;
- synchronize stale backlog wording without rewriting historical evidence.

Exit evidence:

- clean validation report;
- closure PR reviewed and merged.

## Stage 2 - ArifPay sandbox integration

**Goal:** prove one external payment-gateway integration without crossing into production.

Minimum scope:

- `PaymentGatewayAdapter` contract;
- `ArifPaySandboxAdapter`;
- hard sandbox-only configuration;
- one C2B flow first;
- success/failure/idempotency/network/uncertain-result tests;
- callback/verification mapped into existing reconciliation state;
- Operations/Reconciliation UX for sandbox transactions;
- no client-side secret exposure.

Expand only after core flow is stable to selected B2C/W2B/OTP rails.

Forbidden:

- production ArifPay host/keys;
- real customer PII;
- representing sandbox success as real cash-in/cash-out.

Exit evidence:

- external sandbox test record;
- callback/reconciliation tests;
- security review;
- provider-provenance mapping;
- Draft PR reviewed and merged.

## Stage 3 - Partner Ecosystem & Network Liquidity (synthetic)

**Goal:** build the reusable product architecture for multiple partner classes and field liquidity planning.

Scope:

- partner organization / capability-switch model;
- Partner Ecosystem Console;
- Network Liquidity Coverage / Liquidity Coverage Index;
- cash-fleet planning;
- FMCG partner/inventory/logistics model;
- liquidity-match simulation;
- role/object authorization expansion;
- Supervisor Hub network-operations UX.

Important terminology:

Use **Network Liquidity Coverage (NLC)** or **Liquidity Coverage Index (LCI)** rather than unqualified `LCR` unless a licensed partner formally defines that metric. Do not imply prudential regulatory LCR compliance.

No real cash movement.

## Stage 4 - Governed ET-resident staging foundation

**Goal:** stand up an approved non-production environment whose evidence can satisfy the B6 evidence register.

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

The environment can be technically operational while financial capabilities remain locked.

Exit evidence: completed evidence register with approvals for staging scope.

## Stage 5 - External partner staging

**Goal:** connect approved test/staging environments for the partners required by the pilot design.

Possible tracks:

- PartnerFI account/authorization API.
- ArifPay or other payment staging.
- approved identity staging.
- SMS/USSD staging.
- FMCG/distributor staging.
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

Cash fleet may become live only if custody, handover, security, insurance/operating policy, accounting and PartnerFI authority are approved.

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
