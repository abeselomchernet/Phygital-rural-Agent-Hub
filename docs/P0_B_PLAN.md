# P0-B — Authenticated, durable staging foundation

Status: **PLANNED / SYNTHETIC-ONLY IMPLEMENTATION PHASE**

Base: merged P0-A `main` at `6901e5cfbd13b109c0e308c9e9780ea1bb21b574`.

P0-B starts from the P0-A boundary model and must not weaken it. Wishland Networking PLC remains the technology/software/orchestration provider. A future licensed PartnerFI remains the regulated financial principal for customer accounts, funds, authorization, settlement and regulated KYC policy. GhostSync remains transport/reconciliation infrastructure and never becomes settlement authority.

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

### B1. Server authentication and authorization foundation

Implement server-verified sessions for synthetic users only, with explicit roles such as agent submitter, supervisor and partner-admin test authority. Add route authorization, customer/object-level authorization, CSRF/session protections, rate limiting, session expiry/revocation and redacted security audit events.

The synthetic login mechanism must be visibly labelled as local development authentication. It must not be presented as PartnerFI SSO, Fayda authentication or production identity.

Acceptance gate:

- unauthenticated mutation requests fail closed;
- wrong-role and wrong-object requests fail closed;
- synthetic agent access is scoped to permitted customer/agent objects;
- partner-admin-only recovery remains unreachable to ordinary agents;
- browser and API tests cover session expiry, CSRF, replay and authorization failures.

### B2. Durable domain persistence and transaction idempotency

Replace process-memory Maps used for authoritative server state with storage interfaces and a durable development implementation. Preserve current domain contracts while adding atomic uniqueness for canonical customer IDs, phone aliases, partner customer references, transaction IDs, idempotency keys, transport event IDs and per-device/per-customer sequence policy.

Use synthetic data only. The first implementation may use an isolated local/test database, but it must not be described as Ethiopia-approved regulated storage.

Acceptance gate:

- restart does not lose accepted synthetic transaction/idempotency records;
- duplicate identical submissions return the recorded prior result;
- changed payload under the same idempotency key fails as replay/conflict;
- phone alias updates are atomic and collision-safe;
- transaction retry can recover a previously recorded result even if mutable KYC/risk state changed after the first accepted attempt;
- tombstone/replay-window behavior is tested.

### B3. Partner result reconciliation contract

Add a durable partner-operation state model for uncertain outcomes and authenticated mock callback/status-query handling. Preserve `PARTNER_ACCEPTED != SETTLED` and prohibit local transport state from creating a settled financial outcome.

Acceptance gate:

- timeout/unknown partner results enter an explicit uncertain/reconciliation state;
- duplicate callbacks are idempotent;
- stale/out-of-order callbacks cannot regress a terminal state;
- callback authentication is represented by a local test verifier abstraction, not hardcoded shared secrets;
- no settlement or cash-dispense claim is created without the explicit partner settlement/reconciliation event required by the model.

### B4. Audit, privacy and recovery controls

Create redacted audit events for authentication, authorization denial, KYC state transition, alias change, partner submission, callback/reconciliation and administrative recovery. Audit records must avoid raw identity payloads, biometrics, FIN/FAN and unnecessary phone exposure.

Define retention/tombstone requirements and a recovery model for device/browser records. Existing browser records must never be auto-uploaded merely because a remote receiver later becomes available.

### B5. Edge/offline security design

Replace plain browser persistence assumptions with an encrypted-edge-storage interface and threat model covering device compromise, stolen session, offline replay, queued-message tampering, clock skew and recovery. Implementation remains synthetic until key-management/residency design is approved.

No claim of secure hardware, TPM, HSM, SE, TEE or certified key custody may be made unless actually implemented and independently verified.

### B6. Ethiopia-resident staging architecture package

Produce a deployment design and evidence checklist for an eventual Ethiopia-resident staging environment: application compute, database, backups, audit store, key custody, logging, incident response, retention, access administration, approved subprocessors and disaster recovery.

This workstream is architecture/documentation until a specific provider and contractual evidence are approved. Do not enable regulated mode based only on a region label or self-declared environment variable.

### B7. Legacy/proposed UI hardening

Continue reviewing proposed financial and scoring screens before making them interactive. Keep arithmetic/scoring demonstrations explicitly illustrative. Supervisor terminal, inventory, mesh, printer, Data Mule and training views remain synthetic or proposed unless backed by implemented controls.

## External prerequisites that code cannot satisfy

The following remain `needs-review` / external evidence gates: written Wishland/PartnerFI operating roles; PartnerFI licensed-scope confirmation; identity-provider contract and permitted integration pattern; approved Ethiopia-resident hosting/database/backup architecture; key-custody responsibility; subprocessors and retention; incident/operational ownership; and any authorization needed before handling real customer data.

Absence of these items must keep real-data and regulated modes disabled regardless of test success.

## Implementation order

1. B1 authentication/authorization foundation.
2. B2 durable storage/idempotency and restart-safe tests.
3. B3 uncertain partner-result reconciliation.
4. B4 audit/recovery controls.
5. B5 encrypted-edge interface/threat model.
6. B6 staging architecture evidence package.
7. B7 final UI/claims review.

Each increment should land in this P0-B branch through small reviewed commits and must keep the full P0-A validation suite green.

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
