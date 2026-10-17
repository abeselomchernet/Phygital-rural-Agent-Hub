# D1 Phase 1F — Session Canary Observation Evidence

Status: bounded synthetic implementation slice

## Purpose

Phase 1F adds append-only, point-in-time evidence for the Phase 1E PostgreSQL session read canary.

It exists because the Wave-D persistence migration requires a minimum two-week dual-write period before a later read-switchover decision. The passage of calendar time must not be fabricated, compressed, or converted into authorization by code.

Phase 1F therefore provides a governed way to accumulate and review evidence over real elapsed time while preserving these truths:

- filesystem remains an active session safety/revocation authority;
- PostgreSQL remains a verified canary/shadow read path, not sole authority;
- each observation is point-in-time only;
- recorded samples do not prove continuous runtime uptime;
- two weeks of elapsed sample span alone does not authorize PostgreSQL-primary cutover;
- the later cutover remains a separate manual governance/engineering decision.

## Evidence record

Each observation is a strict `D1_SESSION_CANARY_PARITY_OBSERVATION` payload stored in the D1 append-only `evidence_record` table.

The record contains only bounded operational metadata:

- schema version;
- evidence type;
- observation timestamp;
- deterministic filesystem source fingerprint;
- current bounded authority label;
- canary mode label;
- session count;
- counts for every governed Phase 1D/1E session parity status;
- conflict/review/write-required counts;
- whether this recorded sample is clean;
- explicit non-authorization and limitation fields.

It does **not** contain:

- session IDs;
- CSRF tokens;
- customer IDs;
- names, phones, Fayda/national IDs or other PII;
- provider credentials;
- PartnerFI credentials;
- financial balances or transaction payloads.

## Clean recorded sample

A point-in-time sample is clean only when every discovered session is either:

- `MATCHED`, or
- `EXPIRED_SOURCE_NOOP`.

Any of these states make the sample unclean/reviewable:

- `CREATE_REQUIRED`
- `RESTORE_REQUIRED`
- `EXPIRE_DELETE_REQUIRED`
- `SOURCE_MISSING_MARK_REQUIRED`
- `SOURCE_MISSING_REVIEW_REQUIRED`
- `CONFLICT_IMMUTABLE_SESSION`
- `CONFLICT_POSTGRES_OWNED`

An unclean sample is still recorded. Phase 1F must not hide unfavorable evidence.

## Append-only integrity

The payload is canonicalized and SHA-256 digested before insertion into `enawuga.evidence_record`.

The existing D1 append-only database trigger prevents update or delete of the evidence row. Loading history re-computes and verifies the canonical payload digest before accepting a record.

Re-recording the exact same payload is idempotent through the evidence digest and does not create a duplicate logical evidence record.

## Operator command

The bounded command is:

```text
npm run d1:db:session-canary-observe -- record
npm run d1:db:session-canary-observe -- report
```

Both operations require:

```text
D1_SESSION_CANARY_OBSERVATION_ACK=synthetic-only
```

`record` additionally requires the Phase 1E canary configuration to pass:

```text
DATA_MODE=synthetic
D1_POSTGRES_ENABLED=true
D1_POSTGRES_MODE=local-synthetic
D1_POSTGRES_URL=<loopback PostgreSQL URL>
SYNTHETIC_STATE_DIR=<bounded synthetic state directory>
REQUIRE_DURABLE_SESSION_STORE=true
D1_SESSION_RUNTIME_READ_MODE=postgres-shadow-canary
D1_SESSION_RUNTIME_READ_ACK=synthetic-only
```

This confirms only that the operator invoked the observation command under the guarded canary configuration. The evidence payload explicitly says that the record does not, by itself, prove continuous runtime activation.

## Report semantics

The report provides:

- number of recorded samples;
- clean and unclean sample counts;
- first and last recorded observation times;
- observed time span in milliseconds and days;
- the architecture minimum span of 14 days;
- whether at least two recorded observations span 14 or more days;
- whether every recorded sample is clean.

The report always preserves:

```text
continuousCanaryUptimeProven=false
postgresPrimaryCutoverAuthorized=false
nextGate=MANUAL_STAGING_EVIDENCE_REVIEW_REQUIRED
```

This is deliberate. A first and last sample 14 days apart cannot prove the canary operated continuously between those observations.

## Why no automatic cutover

The architecture requires a minimum observation period, but elapsed time is only one prerequisite.

A safe read-switchover decision still requires review of:

- whether the canary was actually enabled for the intended staging interval;
- whether the environment remained the approved bounded Stage-4 synthetic environment;
- whether discrepancies or outages occurred between point samples;
- whether session create/read/revoke/expiry behavior remained correct;
- whether backup/restore and recovery evidence is adequate;
- whether PostgreSQL-primary rollback semantics have been tested;
- whether any architecture or implementation baseline changed during the observation period.

Phase 1F therefore refuses to encode `AUTHORIZED`, `APPROVED`, or equivalent cutover states.

## Time integrity

The operator script records the current process time. It does not accept a command-line timestamp override.

Tests may supply explicit timestamps to validate duration arithmetic, but production/operator execution cannot use those test hooks through the CLI.

This prevents the ordinary evidence command from manufacturing a two-week history instantly.

## Failure behavior

Observation fails closed if:

- D1 PostgreSQL is disabled;
- the D1 mode is not bounded local synthetic;
- PostgreSQL is non-loopback;
- regulated mode is attempted;
- the separate observation acknowledgement is absent;
- `record` is attempted outside the Phase 1E canary configuration;
- the synthetic state directory is absent or malformed;
- session source records are malformed;
- PostgreSQL shadow rows fail digest/schema checks;
- stored evidence fails its canonical digest check.

An unclean parity result is **not** an observation-command failure. It is valid negative evidence and is appended with `recordedSampleClean=false`.

## Relationship to Phase 1E

Phase 1E introduced a fail-closed PostgreSQL shadow read canary while retaining filesystem authority and rollback.

Phase 1F does not alter that runtime path. It adds only evidence collection and reporting around the parity state required to assess the canary over real elapsed time.

Therefore Phase 1F cannot expand financial, provider, identity or regulatory authority.

## What Phase 1F does not authorize

Phase 1F does not authorize:

- PostgreSQL-primary sessions;
- filesystem deprecation;
- PostgreSQL-only authentication;
- Hub-idempotency runtime cutover;
- production or non-loopback PostgreSQL;
- real-person data;
- live provider or PartnerFI activation;
- funds movement, posting, settlement or custody;
- regulator or institution acceptance;
- externally verified staging evidence;
- a claim of continuous two-week uptime;
- automatic progression to a live pilot or production.

## Exit condition for this implementation slice

Phase 1F code is implementation-complete when CI proves:

- observation schema is strict and bounded;
- a clean point sample is calculated correctly;
- an unclean sample remains visible;
- one observation cannot become duration evidence;
- a 14-day synthetic unit-test span is recognized only as time-span arithmetic;
- even a 14-day all-clean history never self-authorizes cutover;
- real PostgreSQL 17 can append and reload digest-verified evidence;
- duplicate evidence is idempotent;
- append-only mutation protection remains enforced;
- existing build, Docker and browser E2E suites remain green.

The **architecture observation period itself is not complete merely because this code is merged**. It must accrue over actual time in an appropriately configured bounded environment.
