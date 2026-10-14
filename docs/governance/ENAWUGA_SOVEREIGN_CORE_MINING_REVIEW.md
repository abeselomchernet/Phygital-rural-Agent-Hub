# Enawuga Sovereign Core repository-mining review

**Status:** historical archaeology / pattern-mining only  
**Reviewed:** 2026-10-15  
**Source repository:** `abeselomchernet/sovereign_core`  
**Reviewed deployed commit:** `8fceaa6d6393d2e9c59808f9ffcf4c0e56e66a17`  
**Reviewed public surface:** `https://sovereign-core-five.vercel.app/static/index.html`

## Authority boundary

`Phygital-rural-Agent-Hub` main plus the current governance pack remains the implementation authority for Enawuga.

This review does **not** promote historical Sovereign Core/SOS concepts, screens, files, integrations or deployment labels into current Enawuga capability. It mines reusable control and evidence patterns only.

The reviewed Vercel deployment is a bounded public synthetic preview. A Vercel `production` target/alias is deployment metadata, not evidence of a production financial deployment, regulatory authorization, live partner integration, or Ethiopia-resident Stage-4 hosting.

## What the deployed baseline actually demonstrates

The source release record describes the public launcher as a **controlled synthetic pilot**. Its verified scope is a bounded set of role-specific previews. The release explicitly excludes production authentication, database persistence, provider integrations, payments, uploads, exports, device control, secret handling, role mutation, public assignment and offline replay.

The stronger pilot-evaluation record describes one coherent synthetic journey:

`Agent Hub -> Farmer -> Pump -> Simulated PAYG -> Receipt -> Audit`

That path demonstrates deterministic fixtures, scoped projections, a simulation-only state transition, causal redacted audit evidence, reset/repeatability, role/tenant denial, and no production/external-network dependency. It explicitly does **not** demonstrate real payments, settlement, provider callbacks, production persistence, real credentials, live device control, production offline replay or production infrastructure.

## High-value patterns to carry into current Enawuga

### 1. Capability enablement is a gate, not a UI state

Sovereign Core's route and deferred-workflow contracts repeatedly require a capability-specific contract before a write or external integration can be enabled.

Reusable rule for current Enawuga:

> A UI control, historical page, route stub, provider registration, sandbox response or synthetic simulation never self-authorizes a capability.

Before a future capability is enabled, require as applicable:

- route/capability contract;
- server-side tenant, organization, role, object, purpose and assignment scope;
- synthetic fixtures and negative cases;
- forbidden-field/privacy tests;
- mutation idempotency and audit design;
- offline replay decision;
- provider/network boundary;
- rollback/reconciliation behavior; and
- explicit stage approval.

This strengthens E2 Hub Service Composition without replacing the current `SERVICE != CAPABILITY != ROUTE != ADAPTER` invariant.

### 2. Server-side authorization matrix and no-existence leakage

The historical authorization matrix treats frontend visibility as non-authoritative. Missing, malformed, stale or mismatched context must fail closed, with assignment/tenant/role checks enforced server-side and without leaking whether another protected resource exists.

For E1A this suggests explicit server-enforced scope over:

- Hub;
- organization/tenant;
- actor and role;
- object/resource;
- purpose;
- assignment, when relevant.

The matrix itself contains some historical naming/status inconsistencies and therefore is a pattern source, not current truth.

### 3. Untrusted offline intent and replay-time reauthorization

The C-001 offline contract is one of the strongest reusable artifacts in this repository.

Its central rule is appropriate for Enawuga:

> A client-side queue is untrusted intent, not authority.

A future offline action should be schema-validated, authenticated from the **current** session, re-scoped against current tenant/actor/role/purpose/resource/consent/assignment state, checked for expiry and idempotency, and only then considered for application.

Useful outcome distinctions include invalid, expired, scope mismatch, duplicate, conflict and operation-not-allowed. No client retry may turn a rejected intent directly into an applied action.

This belongs primarily in E4, but E1B should reserve the envelope semantics from day one.

### 4. Controlled synthetic runtime with no fallback

`SyntheticRuntime` is a useful Stage-4 pattern: one controlled behavior layer over a canonical in-memory fixture graph with typed denials and no HTTP client, provider credential, database, filesystem, queue or production fallback.

The accompanying tests deliberately fail if synthetic routes attempt external network access.

For current Enawuga, this is a strong implementation pattern for Stage-4 fixtures and demos:

- one canonical synthetic behavior boundary;
- explicit `synthetic=true` / no-external-side-effect semantics;
- no silent production/provider fallback;
- route-specific negative tests; and
- deterministic reset.

It should not replace the current partner adapter architecture. It is a test/demo boundary beneath the current governance model.

### 5. Deterministic fixture graph plus denial tenant

The fixture catalog uses a complete demonstration tenant plus an intentionally empty denial tenant. The latter proves isolation rather than duplicating the happy-path world.

For Enawuga this is worth retaining:

- a stable canonical Hub fixture graph;
- explicit relationships across Hub/operator/device/partner/service/evidence objects;
- at least one denial organization/Hub/tenant with no mirrored records;
- independent reset; and
- no credentials, provider callbacks or production identifiers in fixtures.

### 6. Coherent cross-surface journey evidence

The P3 synthetic journey is more persuasive than disconnected screenshots because it proves a causal sequence and can be repeated after reset.

Future current-Enawuga demos should similarly prove bounded end-to-end journeys, for example:

`Hub -> service offering -> governed route decision -> synthetic adapter outcome -> event/evidence -> Operations trace`

Stage 4 must still assert no external side effect, no real funds, no PartnerFI settlement, no live provider call and no production authorization.

### 7. External-provider fail-closed contract

The C-004 provider design is compatible with the current adapter direction when translated carefully.

Useful controls include:

- server-side, purpose-specific, tenant-scoped connectors;
- credentials outside source/browser/logs/fixtures;
- explicit operation/field/destination/time-out/retry allowlists;
- server-generated correlation and idempotency identifiers;
- callback signature/replay/timestamp/tenant checks;
- provider outage never becoming local success;
- raw provider payload not exposed to the UI; and
- ambiguous result represented as pending/reconciliation rather than assumed success.

This supplements, not replaces, the current Partner Capability Contract -> Route -> Adapter model.

### 8. Evidence-package integrity

The audit-package manifest uses an owner/retention/file-index/checksum structure. The historical manifest is incomplete in places (`PENDING` hashes), so it is not verification evidence by itself, but the structure is useful.

For E1C/E6, retain the pattern:

- manifest version;
- artifact inventory;
- owner;
- retention class;
- content digest/checksum;
- provenance/run references; and
- explicit completeness status.

Unknown or pending evidence must remain unknown/pending, never be promoted to pass.

### 9. Localization assets as a later UX pattern

The repository includes English, Amharic and Oromo assets plus USSD/SMS-oriented material. This is useful future rural-access UX archaeology, but it is not E1 authority and is not evidence of complete localization, accessibility, telecom integration or live USSD support.

## Historical material that must remain quarantined

Do not import the following as current Enawuga capability or architecture:

- Sovereign Core/SOS naming as the current core;
- the old `Hub Ledger First` screen as implementation authority;
- wallet/CICO/payment controls as live financial authority;
- ARDI/Agri Score as a core dependency;
- Ekub, AgriTrust, PAYG, KinetiQ or IoT screens as proof of implemented partner services;
- Fayda/live identity implications;
- Hyperledger/Fabric artifacts as the current evidence architecture;
- device-control/firmware/remote-command implications;
- Vercel `production` target wording as financial-production evidence; or
- the public Vercel preview as Ethiopia-resident staging evidence.

## Repository hygiene / security quarantine

The private historical repository contains categories of material that should never be migrated into the current Enawuga codebase without a separate security review, including:

- Fabric CA/private-key-shaped material;
- CA/server state;
- database dumps/backups;
- environment and log artifacts;
- historical backup source files; and
- committed dependency trees.

No secret or key content was copied into this review.

Before any change in repository visibility, external sharing, build reuse or credential reuse, perform a dedicated history/exposure audit and rotate/revoke anything whose confidentiality cannot be proved.

## Impact on current E1 plan

The existing E1A-E1E split remains correct, but Sovereign Core strengthens it:

### E1A — Hub aggregate and scope

Add purpose/assignment-aware server scope and explicit no-existence-leakage denial tests.

### E1B — workflow event/evidence envelope

Reserve creation/expiry metadata and actor/role/purpose references as evidence context, while making clear that client-supplied values are never authorization.

### E1C — synthetic provenance/evidence manifest

Add deterministic fixture-graph identity and artifact checksum/completeness concepts.

### E1D — Operations trace read model

Add typed denied/deferred outcomes and redacted role-safe projections; do not expose raw logs, credentials or provider payloads.

### E1E — idempotency/concurrency certification

Add stale queued-intent rejection, replay-time reauthorization, changed-assignment rejection, closed-gate-before-network tests, and fail-closed external-provider ambiguity.

## Decision

**Mine the control/evidence patterns; do not port the legacy product architecture.**

The current Enawuga implementation should be newly built on the canonical `Phygital-rural-Agent-Hub` architecture and Stage-4 constraints. Sovereign Core is valuable primarily because it already explored several negative-security, authorization, synthetic-runtime, offline and evidence-contract problems that E1-E6 will otherwise need to rediscover.
