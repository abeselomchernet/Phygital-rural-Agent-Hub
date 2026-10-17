# D1 Phase 1E — Controlled PostgreSQL Session Read Canary

Status: bounded synthetic implementation slice

## Purpose

Phase 1E introduces the first active runtime PostgreSQL read path for restart-durable synthetic sessions while preserving a deterministic rollback to the proven filesystem path.

This is a **read canary**, not final PostgreSQL authority and not filesystem deprecation.

The default remains:

`filesystem-primary`

The optional guarded mode is:

`postgres-shadow-canary`

## Why the canary is narrower than full read switchover

The current domain persistence contracts are synchronous while PostgreSQL I/O is asynchronous. Phase 1A through 1D deliberately avoided blocking database calls, fire-and-forget writes, or pretending an asynchronous database is a synchronous drop-in replacement.

Phase 1E therefore activates PostgreSQL only at the HTTP session boundary, where request middleware can safely await database I/O without weakening the existing synchronous domain contracts.

Hub workflow-intent idempotency is not currently mounted as a runtime persistence dependency in the Express application, so Phase 1E does not manufacture a Hub-idempotency runtime cutover surface merely to claim completion.

## Runtime model

When the canary is disabled:

1. session creation writes the existing durable filesystem record;
2. authentication reads the filesystem record;
3. logout removes the filesystem record;
4. no PostgreSQL session runtime dependency exists.

When the canary is explicitly enabled:

1. the server performs a PostgreSQL/session-shadow preflight before listening;
2. session creation first commits the existing filesystem record;
3. the request then waits for an exact PostgreSQL shadow create/readback transaction;
4. if PostgreSQL publication fails, the newly created filesystem session is revoked and the session-start request fails closed;
5. subsequent authenticated requests first pass the existing filesystem authentication and expiry/revocation gate;
6. the runtime then awaits PostgreSQL and uses the PostgreSQL shadow payload only after exact filesystem-source digest parity is proven;
7. logout removes the filesystem session first, so authority is revoked immediately;
8. PostgreSQL shadow cleanup follows. If cleanup fails, the missing filesystem source still prevents authentication and the stale shadow becomes review-required rather than authoritative.

## Filesystem revocation guard

Phase 1E intentionally retains the filesystem as a revocation guard.

A PostgreSQL row can never authenticate by itself in this slice. A runtime read requires all of the following:

- a current filesystem session record exists;
- the filesystem session is not expired;
- a PostgreSQL `session_state` row exists;
- the PostgreSQL row is `SYNTHETIC_FILESYSTEM` owned;
- the shadow state is `PRESENT`;
- the PostgreSQL row payload digest is valid;
- the PostgreSQL source-envelope digest exactly matches the current filesystem envelope;
- the PostgreSQL stored session exactly matches the current filesystem session;
- PostgreSQL expiry matches the governed session payload and is still active.

Any mismatch fails closed.

This means a stale PostgreSQL row cannot revive a filesystem-revoked session.

## Startup preflight

The guarded mode applies the checksum-controlled D1 foundation migration and then evaluates the Phase 1D session shadow plan.

Startup is permitted only when every discovered session is one of:

- `MATCHED`
- `EXPIRED_SOURCE_NOOP`

The server refuses canary startup for states such as:

- `CREATE_REQUIRED`
- `RESTORE_REQUIRED`
- `EXPIRE_DELETE_REQUIRED`
- `SOURCE_MISSING_MARK_REQUIRED`
- `SOURCE_MISSING_REVIEW_REQUIRED`
- immutable-session divergence
- PostgreSQL-owned divergence
- malformed/digest-inconsistent PostgreSQL state

This prevents a process restart from silently changing authority after a crash window.

## Session creation transaction boundary

The existing filesystem session write remains first because it is the proven revocation/rollback anchor.

PostgreSQL publication then:

- locks any existing session row in a transaction;
- accepts only an exact filesystem-owned, `PRESENT` idempotent match;
- otherwise inserts the exact source-derived shadow;
- verifies PostgreSQL payload digest;
- verifies source-envelope digest;
- verifies the full stored session matches;
- commits only after readback succeeds.

If this step fails, the HTTP session-start flow revokes the just-created filesystem session and returns a bounded `503` error.

No cookie is issued for an unverified PostgreSQL canary publication.

## Runtime read semantics

The runtime does not trust PostgreSQL merely because a row exists.

For each authenticated request in canary mode:

1. existing filesystem authentication checks session existence and expiry;
2. existing per-session rate limiting is consumed;
3. PostgreSQL row integrity is checked;
4. the current filesystem source envelope is re-read;
5. exact source digest parity is required;
6. exact stored-session parity is required;
7. the verified PostgreSQL payload becomes the session supplied to the downstream request path.

If the PostgreSQL read is unavailable or divergent, the request returns:

`SESSION_RUNTIME_READ_CUTOVER_UNAVAILABLE`

with HTTP `503`.

The runtime does not silently fall back within an enabled canary process because silent fallback would hide divergence.

## Deterministic rollback

Operational rollback is configuration-level:

```text
D1_SESSION_RUNTIME_READ_MODE=filesystem-primary
```

or removal of the canary mode setting.

The default path then uses the existing filesystem session persistence exactly as before.

No reverse data conversion is required because Phase 1E never stops writing or enforcing the filesystem session record.

Rollback does not authorize ignoring filesystem corruption, expiry, or other existing session safety gates.

## Crash/restart behavior

The expected crash windows are fail-closed:

### Crash after filesystem create but before PostgreSQL publication

On restart, preflight detects `CREATE_REQUIRED` and refuses canary startup. The operator must reconcile/synchronize the shadow or explicitly roll back to filesystem-primary.

### Crash after PostgreSQL publication but before the HTTP response

Both stores match. Canary startup may proceed. The unclaimed session eventually expires if no browser received its cookie.

### Crash after filesystem revocation but before PostgreSQL shadow deletion

The filesystem record is absent, so the session cannot authenticate. Canary restart detects a source-missing PostgreSQL row and refuses startup pending review/cleanup.

### PostgreSQL unavailable at startup

Canary startup fails. It does not silently change to filesystem-primary.

### PostgreSQL unavailable during an authenticated request

The request fails with HTTP `503`. It does not silently bypass the canary.

## Activation gates

Canary mode requires all of the following:

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

The existing D1 PostgreSQL config continues to reject non-loopback hosts and regulated mode.

## What Phase 1E does not authorize

Phase 1E does not authorize:

- PostgreSQL as sole session authority;
- PostgreSQL-only authentication;
- filesystem deprecation;
- silent read fallback while canary mode is enabled;
- Hub-idempotency runtime cutover;
- runtime PostgreSQL ownership of session rows;
- non-loopback PostgreSQL;
- real-person data;
- regulated data processing;
- live PartnerFI/provider activation;
- posting, settlement, custody, cash movement, insurance payout, or regulatory authority;
- distributed exactly-once claims.

## Validation requirements

The slice is acceptable only if CI proves:

- feature gate is filesystem-primary by default;
- canary requires separate acknowledgement and durable filesystem sessions;
- non-local PostgreSQL remains rejected;
- new session publication is transactional and exact;
- failed publication revokes the filesystem session before returning failure;
- verified PostgreSQL reads match current filesystem source digest;
- PostgreSQL unavailability/divergence fails closed;
- logout revokes filesystem authority before PostgreSQL cleanup;
- stale PostgreSQL rows cannot revive missing filesystem sessions;
- restart preflight accepts exact parity and refuses source-missing/divergent state;
- real PostgreSQL 17 integration tests pass;
- the full existing unit/integration, build, Docker and browser E2E suites remain green.

## Next gate

Phase 1E is a canary, not the architecture package's final Phase-3 read switchover.

Before PostgreSQL can become the primary session persistence backend, the next D1 work must decide and validate an asynchronous persistence/application-service boundary for authoritative database writes, including:

1. PostgreSQL-native session create/read/revoke/expiry semantics without a filesystem authority dependency;
2. PostgreSQL-native Hub-idempotency create/CAS/list semantics if and when that store is mounted into runtime workflows;
3. controlled dual-write duration/evidence or an explicitly approved alternative migration strategy;
4. rollback from PostgreSQL-primary without reviving revoked or stale state;
5. connection-loss and transaction-failure behavior under authoritative PostgreSQL writes;
6. backup/restore and recovery evidence appropriate to the bounded Stage-4 environment.

Until that later gate is completed, filesystem persistence remains an active safety authority in the bounded synthetic runtime.
