# P0-B — Authenticated, durable staging foundation

Status: **BOUNDED SYNTHETIC SCOPE LOCALLY VALIDATED / DRAFT REVIEW**

Base: merged P0-A `main` at `6901e5cfbd13b109c0e308c9e9780ea1bb21b574`.

P0-B starts from the P0-A boundary model and must not weaken it. Wishland Networking PLC remains the technology/software/orchestration provider. A future licensed PartnerFI remains the regulated financial principal for customer accounts, funds, authorization, settlement and regulated KYC policy. GhostSync remains transport/reconciliation infrastructure and never becomes settlement authority.

## Progress

- **B1 — implemented and validated:** server-side synthetic sessions, AGENT/SUPERVISOR/PARTNER_ADMIN domain roles, role/object authorization, CSRF, expiry/revocation, rate limiting and redacted auth audit events. Normal runtime cannot self-select a privileged synthetic role; privileged role issuance is test-only.
- **B2 — core implementation complete:** durable storage contracts and local synthetic atomic JSON adapters cover customer/alias state, mock identity-provider requests, pending KYC challenges, PartnerFI transaction/idempotency state, and test-only GhostSync replay/sequence/tombstone state. Identical transaction retries recover recorded results before mutable KYC/risk is re-evaluated; changed payloads conflict. Optional API state persists across server restart when `SYNTHETIC_STATE_DIR` is explicitly configured.
- **B3 — bounded core implemented and validated:** persisted partner-operation lifecycle, verifier-gated mock callbacks, replay conflicts, stale-sequence rejection and terminal-state protection. Authorization remains distinct from explicit authenticated synthetic settlement events. Status query reads local state; no live provider or HTTP callback exists.
- **B4 — bounded core implemented:** strict redacted audit coverage, synthetic retention and governed recovery policy; see [audit/recovery](P0_B_AUDIT_RECOVERY.md).
- **B5 — interface/threat model complete:** fail-closed unavailable encrypted-edge adapter; actual encryption/key custody is NOT implemented. See [edge security](P0_B_EDGE_SECURITY.md).
- **B6 — architecture/evidence package complete:** every infrastructure/operating evidence gate remains external and unapproved. See [staging evidence](P0_B_ET_STAGING_EVIDENCE.md).
- **B7 — active UI/claims review complete:** useful concepts retained; mock KYC/phone/balances, plaintext outbox and no-cash-authority labels explicit. See [claims review](P0_B_CLAIMS_REVIEW.md).

The local JSON adapters are development evidence only. They are not encrypted edge storage, a production database, an Ethiopia-residency claim, or authorization to persist real customer data. The HTTP GhostSync receiver remains closed.

## Non-negotiable boundaries

- `customerId` remains the immutable canonical customer reference.
- Phone remains an operational alias and separately verified communication channel, not identity proof.
- FIN/FAN must not become a routine transaction identity or lookup key.
- Identity-provider verification, phone-channel verification and PartnerFI customer linkage remain separate operations.
- Partner authorization and settlement remain distinct states.
- No cash-dispense instruction may be derived from local queue insertion, transport delivery or an unconfirmed partner result.
- External development environments remain synthetic-only until approved residency, contracts, key custody, subprocessors and retention are established.
- `regulated` execution remains fail-closed until an explicitly approved deployment mode exists.
- No live Fayda, bank, MFI, payment-provider, SMS/USSD, hardware-control or settlement integration is added in this phase without a separately reviewed provider contract and test plan.
- No real customer data, production credentials or biometric data may be introduced.

## P0-B workstreams

### B1. Server authentication and authorization foundation — IMPLEMENTED

The branch now has server-verified synthetic sessions, explicit roles, route/customer-object authorization, CSRF protection, session expiry/revocation, rate limiting and redacted security audit events. The UI labels this as local development authentication, not PartnerFI SSO, Fayda authentication or production identity.

Acceptance evidence includes unauthenticated failure, wrong-role/wrong-object failure, AGENT customer scope, privileged-role fail-closed behavior, CSRF rejection, session expiry/revocation, rate limiting and audit-secret redaction.

### B2. Durable domain persistence and transaction idempotency — CORE IMPLEMENTED

Storage interfaces preserve domain boundaries while local synthetic atomic JSON adapters provide restart-safe development evidence for canonical customer/phone/partner references, mock identity requests and pending KYC challenges, PartnerFI balances/results/idempotency keys, and test-only GhostSync event receipts/sequences/tombstones.

Implemented acceptance evidence:

- restart preserves accepted synthetic transaction/idempotency records and account simulation state;
- duplicate identical transaction submissions return the recorded prior result without double mutation;
- changed payload under the same idempotency key fails as conflict;
- phone alias and PartnerFI reference uniqueness are rebuilt and checked on restore;
- transaction retry can recover a recorded result even if KYC/risk changed after the first accepted attempt;
- pending synthetic KYC re-verification can continue after server restart without silently issuing a replacement challenge;
- GhostSync mock-receiver event IDs, per-customer sequence state and replay receipts survive receiver restart;
- old transport receipts become replay tombstones, so retention does not turn an old event into a new financial submission;
- malformed persisted state fails closed.

Remaining production-grade work is intentionally not claimed: transactional multi-process database semantics, encrypted storage, HA/concurrency controls, approved retention, Ethiopia-resident deployment, and authenticated remote GhostSync remain future evidence/implementation gates.

### B3. Partner result reconciliation contract — BOUNDED CORE IMPLEMENTED / VALIDATED

The durable partner-operation state model covers uncertain outcomes and authenticated mock callback handling. `statusQuery` returns persisted local state; it does not contact a provider. This core is tested with injected local persistence/verifier and is not wired to an HTTP callback or remote receiver. Preserve `PARTNER_ACCEPTED != SETTLED` and prohibit local transport state from creating a settled financial outcome.

Implemented acceptance evidence:

- a recorded mock `RECONCILIATION_REQUIRED` result maps to `OUTCOME_UNCERTAIN`; live timeout handling is not implemented;
- duplicate callbacks are idempotent;
- stale/out-of-order callbacks cannot regress a terminal state;
- callback authentication is represented by a local test verifier abstraction, not hardcoded shared secrets;
- no settlement or cash-dispense claim is created without the explicit partner settlement/reconciliation event required by the model.

### B4. Audit, privacy and recovery controls — BOUNDED CORE IMPLEMENTED

Implemented redacted audit events for authentication, authorization denial, KYC state transition, alias change, partner submission, callback/reconciliation and administrative recovery. Audit records must avoid raw identity payloads, biometrics, FIN/FAN and unnecessary phone exposure.

Documented retention/tombstone requirements and a recovery model for device/browser records. Existing browser records must never be auto-uploaded merely because a remote receiver later becomes available.

### B5. Edge/offline security design — CONTRACT / THREAT MODEL COMPLETE

The explicit unavailable encrypted-edge-storage contract and threat model replace any assumption of encrypted browser persistence, covering device compromise, stolen session, offline replay, queued-message tampering, clock skew and recovery. All adapter operations reject; current browser storage is still plaintext and synthetic-only. Actual encryption requires approved key-management/residency design and separate implementation.

No claim of secure hardware, TPM, HSM, SE, TEE or certified key custody may be made unless actually implemented and independently verified.

### B6. Ethiopia-resident staging architecture package — DOCUMENTATION COMPLETE

The staging evidence package provides a proposed deployment design and evidence checklist for an eventual Ethiopia-resident staging environment: application compute, database, backups, audit store, key custody, logging, incident response, retention, access administration, approved subprocessors and disaster recovery.

This workstream is architecture/documentation until a specific provider and contractual evidence are approved. Do not enable regulated mode based only on a region label or self-declared environment variable.

### B7. Legacy/proposed UI hardening — ACTIVE ROUTES REVIEWED

Active routing and its imported presentation were reviewed; historical financial screens remain unmounted. Proposed financial and scoring capabilities need separate review before execution. Keep arithmetic/scoring demonstrations explicitly illustrative. Supervisor terminal, inventory, mesh, printer, Data Mule and training views remain synthetic or proposed unless backed by implemented controls.

## External prerequisites that code cannot satisfy

The following remain `needs-review` / external evidence gates: written Wishland/PartnerFI operating roles; PartnerFI licensed-scope confirmation; identity-provider contract and permitted integration pattern; approved Ethiopia-resident hosting/database/backup architecture; key-custody responsibility; subprocessors and retention; incident/operational ownership; and any authorization needed before handling real customer data.

Absence of these items must keep real-data and regulated modes disabled regardless of test success.

## Implementation order

1. B1 authentication/authorization foundation — implemented.
2. B2 durable storage/idempotency and restart-safe tests — core implemented.
3. B3 uncertain partner-result reconciliation — bounded core implemented/validated.
4. B4 audit/recovery controls — bounded core implemented; production atomic audit remains external work.
5. B5 encrypted-edge interface/threat model — complete as contract only.
6. B6 staging architecture evidence package — complete as documentation only.
7. B7 final active UI/claims review — complete.

Each increment must keep the full P0-A validation suite green.

## Required continuous validation

Every P0-B commit that changes runtime behavior must preserve:

- `npm audit --omit=dev` production gate;
- `npm run lint`;
- domain/API tests;
- production build;
- Docker build;
- Playwright coverage;
- synthetic-only external environment behavior;
- regulated-mode fail-closed behavior.

New authentication, durability and reconciliation tests are additive; existing P0-A boundary tests must not be deleted merely to make P0-B pass.

## P0-B completion definition

P0-B is complete only when the synthetic staging architecture has authenticated users, role/object authorization, durable idempotent state, restart-safe replay handling, explicit uncertain-result reconciliation, redacted auditable state changes and documented edge/staging controls — while all live regulated integrations remain disabled unless separately approved.

Even after P0-B, passing tests alone must not be described as regulatory approval, PartnerFI approval, Fayda approval, production readiness or authorization to process real customer funds/data.

## Completion-pass evidence

See [validation record](P0_B_COMPLETION_VALIDATION.md): clean install, production audit (zero vulnerabilities), typecheck, 59 domain/API tests, build, Docker with environment trust mount, 12 Chromium tests and whitespace check passed locally. Hosted checks are recorded on existing Draft PR #3 at the consolidated completion head. External approval and deployment/access evidence remains separate.
