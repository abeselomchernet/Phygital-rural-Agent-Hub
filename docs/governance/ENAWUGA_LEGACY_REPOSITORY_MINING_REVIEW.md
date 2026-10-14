# Enawuga Legacy Repository Mining Review

**Status:** FUTURE ENGINEERING INPUT — NOT CURRENT CAPABILITY EVIDENCE  
**As of:** 2026-10-15  
**Reviewed sources:** `abeselomchernet/enawuga-nexus` (`main`, head `6a4d87d653a7bde77ca78c4316773c56460abad6`) and `abeselomchernet/model6-demo` (`codex/clean-demo`, reviewed head `cde08a088ca608265a34e14d0ec66cdf2b139e74`)  
**Authority rule:** current `Phygital-rural-Agent-Hub` code, tests, CI and governance remain authoritative. This review identifies reusable patterns only. It does not merge Model6 into Enawuga and does not revive historical Enawuga architecture by implication.

## 1. Executive conclusion

Both historical repositories contain useful engineering patterns, but neither should be copied wholesale.

The strongest reusable findings are:

1. first-class event correlation / trace timelines;
2. deterministic idempotency and conflicting-retry detection;
3. append-only operational/audit evidence patterns;
4. explicit synthetic provenance and dataset/run scoping;
5. scenario outcomes that distinguish accepted, duplicate, pending and review-required states;
6. evidence manifests that explicitly record what was **not** proven;
7. adapter contracts that reject unexpected fields and PII before derivation;
8. operations UI patterns for event queue, trace timeline, audit review and bounded dead-letter handling;
9. time-series liquidity observations, but with current Enawuga NLC/LCI terminology rather than historical LCR/regulatory wording.

These findings strengthen the proposed Hub architecture. They do not change current Stage 4 authority.

## 2. Repository classification

### 2.1 `enawuga-nexus`

Classification: **historical / experimental Enawuga implementation and prototype evidence**.

Useful as archaeology for workflow and operational patterns. It is not the current Enawuga architecture or baseline.

Observed characteristics include:

- FastAPI and Node mock/prototype services;
- historical `Sovereign Nexus` terminology;
- agent-liquidity time-series tables;
- swap/audit and deterministic-reference experiments;
- Ghost/offline event queue and trace UI concepts;
- demo Ekub/marketplace flows;
- historical ARDI/credit-scoring and direct rail/rebalance language;
- local Docker/Redis/Postgres/Timescale/MinIO experiments;
- repository artifacts that include certificates/private-key-shaped files, SQL backups, temporary/test material and duplicated historical implementations.

**Rule:** mine concepts only. Do not import credentials, certificates, backup data, hard-coded connection material, historical direct-rail authority claims or legacy architecture names.

### 2.2 `model6-demo`

Classification: **separate Model6 synthetic-demo technology family**.

It is not Enawuga and must remain separate. However, its evidence-governance and synthetic-contract patterns are reusable as generic engineering techniques.

Reusable techniques must be translated into Enawuga domain language rather than importing Model6 lending, reputation, securitization, shadow-ledger or Fabric semantics.

## 3. Useful patterns from `enawuga-nexus`

### 3.1 Trace/event timeline

Historical Ghost/event work used a stable `trace_id` associated with ordered events containing source/service, type/payload, status and timestamp. UI prototypes exposed a trace timeline and an event queue.

**Enawuga reuse:** introduce a generic `HubOperationalEvent` / `WorkflowEvidenceEvent` envelope with a stable correlation identifier. Operations should be able to reconstruct a workflow from bounded read models without exposing raw private logs.

Suggested fields:

- `eventId`;
- `correlationId`;
- `hubId`;
- `partnerOrgId` where applicable;
- `serviceId` / `capabilityId` / `routeId` where applicable;
- `runId` for synthetic/staging execution;
- `eventType`;
- `transportState`;
- `authorityState`;
- `outcomeState`;
- `occurredAt` / `recordedAt`;
- `evidenceRef`;
- `provenance`;
- redacted metadata only.

Do not reuse historical Ghost-specific naming as the canonical domain contract.

### 3.2 Deterministic idempotency / audit reference

Historical swap experiments used deterministic transaction references and a unique audit record so retries could be recognized. The concept is sound even though the old cross-rail swap domain is not current authority.

**Enawuga reuse:** every future Hub command that may eventually cause an external mutation should have a durable pre-mutation idempotency/correlation reservation consistent with current provider-correlation standards.

Requirements:

- stable idempotency identity;
- original route/provider pinned after possible mutation;
- repeated identical request -> same logical workflow;
- altered reuse of the same key -> conflict/review, never silent overwrite;
- no cross-provider fallback after possible mutation;
- evidence records remain distinct from PartnerFI settlement evidence.

### 3.3 Operational audit table pattern

The historical `swap_audit` concept used a unique reference plus node/source/target/status/timestamp and metadata. The domain-specific name should not survive, but the audit shape is useful.

**Enawuga reuse:** build append-only or append-oriented workflow evidence records rather than mutable "latest status only" rows. A summary/read model may be mutable; the underlying evidence history should remain reconstructable.

### 3.4 Liquidity time series

Historical `agent_liquidity_logs` stored timestamped operational float/volume/liquidity observations and experimented with time-series indexing.

**Enawuga reuse:** Hub/corridor liquidity evidence should be time-series friendly and preserve source freshness/confidence. Do not copy the historical `lcr_ratio`, `ghost_sync_flag`, automated-routing claims or prudential/regulatory terminology.

Translate into current concepts such as:

- `HubLiquiditySnapshot`;
- cash/float indicators supplied under authorized data scope;
- NLC/LCI horizons;
- source freshness;
- confidence;
- shortage/surplus classification;
- recommendation only unless separately authorized.

### 3.5 Event Queue / Audit Trail / Trace View UX

Historical UI specs included `EventQueue` and `AuditTrailTable`; trace prototypes supported event-by-event inspection and a dead-letter action surface.

**Enawuga reuse:** Operations & Reconciliation should have:

- correlation/trace search;
- ordered event timeline;
- queue age and retry state;
- evidence references;
- explicit ambiguity/reconciliation-required state;
- role-gated reprocess/discard/resolve actions;
- reason, actor and approval evidence for every operator action.

Historical direct `reinject`/`discard` behavior must not be ported without authorization, review and immutable action evidence.

### 3.6 Multi-service examples

Historical Ekub and marketplace demos are useful only as evidence that the product idea previously explored multiple service categories.

**Enawuga reuse:** treat them as potential future `HubServiceOffering` examples if a licensed/authorized partner supplies the relevant capability. Do not recreate historical `/settle` endpoints or imply Wishland settlement authority.

## 4. Material from `enawuga-nexus` to quarantine

Do **not** port as current Enawuga capability:

- `Sovereign Nexus` / `Sovereign API` naming;
- direct M-PESA -> Telebirr rebalance/swap semantics;
- historical statements that automated liquidity routing executes provider movement;
- `NBE ... threshold breached` wording embedded in prototype responses;
- historical LCR terminology for operational agent liquidity;
- `Hyperledger connection established` regulator/audit claims;
- real-looking Fayda identifiers or identity-authority implications;
- ARDI credit scoring as an Enawuga core dependency;
- direct marketplace settlement authority;
- historical Ghost terminology where it implies remote/live durability not currently verified;
- hard-coded credentials, database DSNs or local secrets;
- certificates/private keys/PKCS12 files and backup database material;
- temp/nested backup trees, duplicate implementations and files referenced by tests but absent from current tree.

Any security-sensitive material in the historical repository should be handled through a separate credential/secret-hygiene review; it must never be copied into the canonical Enawuga repository.

## 5. Useful patterns from `model6-demo`

### 5.1 Provenance is part of the contract

Model6 fixture contracts explicitly carry mode, synthetic=true, dataset version, generated-fixture source and `capturedFromLive=false`.

**Enawuga reuse:** make provenance first-class for Stage 4 Hub fixtures and Pilot Evidence Engine observations.

Suggested minimum:

```text
Provenance
  classification: synthetic | staging | observed-pilot | externally-verified
  datasetVersion
  sourceType
  capturedFromLive
  generatedAt
  runId
  evidenceRefs[]
```

No UI should have to infer whether a value is synthetic.

### 5.2 Institution/run/correlation identity separation

Model6 separates institution, stable subject, transaction reference, run ID and correlation ID.

**Enawuga reuse:** maintain separate identifiers for Hub, partner organization, operator/customer subject, request/idempotency, provider correlation and synthetic run. Never overload one identifier across these meanings.

### 5.3 Scenario outcome vocabulary

Model6 replay distinguishes:

- accepted;
- duplicate ignored;
- review required;
- pending;
- declined.

Each scenario also carries a human-readable `boundary` explaining what the result does **not** prove.

**Enawuga reuse:** adopt the pattern, not the exact Model6 business semantics. Future Hub synthetic scenarios should expose explicit outcomes such as:

- `ACCEPTED_FOR_PROCESSING`;
- `DUPLICATE_NOOP`;
- `CONFLICT_REVIEW_REQUIRED`;
- `PENDING_EXTERNAL_EVIDENCE`;
- `REJECTED_POLICY`;
- `RECONCILIATION_REQUIRED`.

A boundary/limitation field is useful in test fixtures and evidence exports.

### 5.4 Conflicting retry detection

The Model6 synthetic adapter distinguishes an identical retry from altered reuse of the same institution/run/external reference and rejects conflicting retries.

**Enawuga reuse:** extend current Enawuga idempotency rules with an explicit `contentDigest` or canonical request fingerprint so the platform can distinguish:

```text
same idempotency key + same canonical content -> duplicate/no-op
same idempotency key + different canonical content -> conflict/review
```

This is especially valuable for future offline sync and Hub service requests.

### 5.5 Fail-closed input contract

Model6 synthetic adapter rejects undocumented extra fields and recursively rejects PII fields before deriving its normalized candidate event.

**Enawuga reuse:** synthetic/staging fixture endpoints should use allowlisted schemas, fail on unexpected sensitive fields and run privacy checks before persistence or downstream dispatch.

### 5.6 Adapter contract manifest

Model6 has a simple versioned adapter manifest describing adapter name/version/capabilities/endpoints.

**Enawuga reuse:** do not replace the current Adapter Registry. Instead, consider adding a versioned **machine-readable certified adapter contract descriptor** that maps cleanly into the existing registry/certification suite:

- adapter ID/version;
- supported partner capability contract version(s);
- supported environments;
- normalize/status/callback/reconcile functions where applicable;
- required correlation/idempotency semantics;
- evidence/certification status.

The current Enawuga registry remains authoritative.

### 5.7 Evidence manifest export

Model6 exports a machine-readable synthetic evidence manifest that explicitly records fixture counts and negative evidence such as zero live ledger receipts, zero external provider calls, no real personal data and unvalidated model outcomes.

**Enawuga reuse:** Pilot Evidence Engine and Stage-4 synthetic Hub demos should export evidence manifests that record both positive evidence and explicit non-evidence.

Candidate Enawuga manifest fields:

- schema/manifest version;
- stage/environment;
- run ID;
- fixture dataset version;
- Hub/partner/capability counts;
- scenarios executed;
- external provider calls count;
- real PII present?;
- real funds present?;
- PartnerFI settlement evidence count;
- authorization evidence refs;
- accepted evidence refs;
- limitations[];
- hashes/checksums for exported fixture/evidence artifacts.

### 5.8 REPLAY vs LIVE-SYNTHETIC provider separation

Model6 design explicitly prevents silently substituting replay data when a live-synthetic service fails.

**Enawuga reuse:** Stage 4 UI and tests should make `SYNTHETIC_REPLAY`, `STAGING_SYNTHETIC`, provider sandbox/testbed and later pilot modes explicit. Never hide a failed integration by falling back to replay without an obvious mode transition.

### 5.9 Evidence and Operations as first-class surfaces

Model6 separates evidence/operations views from business-flow views.

**Enawuga reuse:** strengthen current Operations/Reconciliation and Governance surfaces with:

- evidence manifest/export;
- fixture/staging mode labels;
- run/correlation search;
- pending/ambiguous outcomes;
- expiry/readiness state;
- no raw private logs exposed through normal UI.

## 6. Model6 material that MUST stay outside Enawuga

Do not import the following merely because implementations exist in Model6:

- ARDI/reputation scoring;
- shadow-ledger semantics;
- Fabric anchoring as a default Enawuga dependency;
- loan decision engine;
- lending portfolio/receivable logic;
- ABS/securitization/pooling/waterfall logic;
- investor-demo institution/customer domain model;
- Model6 digital-twin semantics;
- Model6 deployment topology as Enawuga hosting authority.

Model6 remains a separate technology/evidence/workflow family.

## 7. Revised Epic E1 recommendation

The repository review changes the recommended shape of Epic E1.

### E1A — Hub aggregate and scope

Implement:

- `Hub`;
- `HubOperator`;
- `HubDevice`;
- `HubPartnerMembership`;
- lifecycle/status vocabulary;
- server-enforced organization/role scope;
- synthetic fixtures only.

### E1B — Hub workflow event/evidence envelope

Implement a generic envelope before adding real Hub workflows:

- correlation ID;
- run ID;
- idempotency key;
- canonical content digest;
- Hub/partner/service/capability/route references where applicable;
- transport state separate from authority state;
- provenance;
- evidence reference;
- explicit outcome/limitation.

### E1C — Synthetic provenance and evidence manifest

Implement:

- versioned fixture manifest;
- synthetic/staging classification;
- explicit zero/false non-evidence fields;
- checksums/version references;
- export tests.

### E1D — Operations trace read model

Implement synthetic-only:

- correlation search;
- event timeline;
- queue/retry/conflict states;
- evidence refs;
- no raw logs/secrets;
- role-gated future action placeholders that remain non-mutating in Stage 4.

### E1E — Idempotency/concurrency certification tests

Test at minimum:

1. identical retry -> one logical workflow / duplicate no-op;
2. conflicting retry -> conflict/review required;
3. out-of-order event -> deterministic state;
4. restart persistence where the canonical persistence boundary requires it;
5. no cross-partner or cross-Hub idempotency collision;
6. no silent provider/route fallback after possible mutation;
7. ambiguous outcome -> reconciliation required, never assumed success.

## 8. Changes recommended to later epics

### E3 Hub Liquidity Intelligence

Borrow time-series observation discipline, not old LCR/automated-swap semantics.

### E4 Offline Operations Evidence

Promote correlation timeline, duplicate/conflict detection and queue-age/retry evidence to core acceptance criteria.

### E6 Pilot Evidence Engine

Add machine-readable evidence manifest export and explicit negative/non-evidence assertions.

### E9 Neutrality & Scheme Governance

Require route-decision evidence to carry stable correlation IDs and policy/rule version references.

## 9. Security/cleanliness warning from archaeology

The historical `enawuga-nexus` tree contains certificate/private-key-shaped artifacts, PKCS12 material, database backup material and substantial temporary/duplicate test content. This review did not expose or copy secret contents.

Before any repository is shared, made public, used as a build source or given to an external developer, conduct a separate secret-history and backup-data review. Historical credentials should be assumed untrusted until rotation/revocation is confirmed.

The canonical Enawuga repository must remain clean of migrated historical secret material.

## 10. Decision

**Decision:** use both repositories as bounded pattern libraries only.

- `enawuga-nexus` contributes historical Enawuga operational ideas: trace timeline, queue/audit UI, deterministic idempotency experiments and liquidity time-series concepts.
- `model6-demo` contributes generic evidence-engineering techniques: provenance, fixture/run isolation, conflicting-retry detection, explicit scenario boundaries, adapter contract descriptors and evidence manifest export.
- Neither repository changes the current Enawuga architecture, stage boundary or authority model.
- Epic E1 SHOULD begin with E1A-E1E above before higher-level Hub economics or pilot dashboards.
