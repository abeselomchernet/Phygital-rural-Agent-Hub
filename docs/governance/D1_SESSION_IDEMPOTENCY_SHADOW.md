# D1 Phase 1D — Session and Hub-Idempotency Shadow Migration

Status: bounded synthetic implementation slice

## Purpose

Phase 1D extends the D1 PostgreSQL foundation to the two per-record persistence classes that were intentionally excluded from the aggregate snapshot shadow path:

- synthetic session state
- E1E Hub workflow-intent idempotency state

This is not a runtime cutover. The filesystem remains the active bounded synthetic source of truth.

## Why these stores need a separate design

The existing session and Hub-idempotency stores are not aggregate JSON snapshots.

Synthetic sessions are one file per session and have lifecycle semantics:

- create once
- authenticate by exact session ID
- expire
- revoke by removal
- never revive a missing or expired session implicitly

Hub workflow intents are one file per scoped idempotency key and have compare-and-set revision semantics:

- create at revision 1
- advance only from the exact observed revision
- preserve route/adapter pinning and ambiguity/reconciliation state
- reject stale or conflicting updates

Treating either class as a generic last-write-wins snapshot would weaken existing safety properties.

## Source-of-truth boundary

Phase 1D keeps:

`SYNTHETIC_FILESYSTEM_PRIMARY`

and explicitly reports:

`runtimeCutover: false`

PostgreSQL is a shadow target only.

No code in this slice changes `server.ts`, `src/server/app.ts`, `src/server/demo-api.ts`, `SyntheticAuthService`, or the E1E runtime to read from PostgreSQL.

## Discovery rules

The operator command reads only the existing bounded synthetic state directory.

### Sessions

Expected source directory:

`<SYNTHETIC_STATE_DIR>/sessions`

Each source file must:

- be a regular non-symlink JSON file
- have a UUID filename matching the embedded session ID
- contain the existing session envelope shape
- have envelope expiry equal to the stored session expiry
- pass the governed stored-session schema

Each session is classified as `ACTIVE` or `EXPIRED` at one explicit observation time.

### Hub idempotency

Expected source directory:

`<SYNTHETIC_STATE_DIR>/hub-idempotency`

Each source file must:

- be a regular non-symlink JSON file
- use the SHA-256 digest of the persisted scope as its filename
- pass the governed Hub workflow-intent reservation schema
- preserve the persisted revision
- have scope exactly equal to `tenant|hub|partner|idempotencyKey` from the reservation

## PostgreSQL shadow semantics

### Session shadow

A PostgreSQL session shadow carries:

- session ID
- expiry
- full bounded synthetic stored-session payload
- canonical source-envelope digest
- source kind
- shadow state

Synthetic sessions are immutable after creation. If the same session ID appears with different source content, the planner fails closed with `CONFLICT_IMMUTABLE_SESSION`.

If a filesystem session disappears while the PostgreSQL shadow is still unexpired, Phase 1D does **not** delete or revive it. It marks the shadow `SOURCE_MISSING_REVIEW_REQUIRED`.

If the exact source later returns, the shadow may be restored to `PRESENT`.

Expired filesystem-owned session shadows may be deleted from PostgreSQL because deletion cannot grant access or revive authority.

### Hub-idempotency shadow

A PostgreSQL Hub workflow-intent shadow carries:

- scope digest
- exact source revision
- governed reservation payload
- canonical source-envelope digest
- source kind
- shadow state

Updates are permitted only when the filesystem source revision is greater than the observed PostgreSQL shadow revision and the database row still matches the exact observed revision and digest.

The following fail closed:

- PostgreSQL-owned rows
- database revision ahead of the filesystem
- same-revision source divergence
- row/source digest inconsistency
- concurrent compare-and-set loss

If a filesystem Hub-intent file disappears, the PostgreSQL shadow is retained and marked `SOURCE_MISSING_REVIEW_REQUIRED`. Missing source never authorizes deletion of idempotency evidence.

## Integrity checks

Phase 1D uses two distinct digests:

1. the PostgreSQL row payload digest, which protects the stored shadow payload
2. the canonical source-envelope digest, which proves the shadow payload still corresponds to the exact filesystem record it claims to mirror

For filesystem-owned rows, readback reconstructs the original source envelope and recomputes its canonical digest. A row whose content was changed while retaining a stale claimed source digest fails closed.

## Operator command

The command is:

```bash
npm run d1:db:session-idempotency-shadow -- plan
npm run d1:db:session-idempotency-shadow -- sync
npm run d1:db:session-idempotency-shadow -- verify
```

It requires all existing D1 local-synthetic PostgreSQL gates plus:

```text
D1_SESSION_IDEMPOTENCY_SHADOW_ACK=synthetic-only
```

The command applies the D1 schema migration idempotently before planning.

## Plan states

Session planning can report:

- `CREATE_REQUIRED`
- `MATCHED`
- `RESTORE_REQUIRED`
- `EXPIRED_SOURCE_NOOP`
- `EXPIRE_DELETE_REQUIRED`
- `SOURCE_MISSING_MARK_REQUIRED`
- `SOURCE_MISSING_REVIEW_REQUIRED`
- `CONFLICT_IMMUTABLE_SESSION`
- `CONFLICT_POSTGRES_OWNED`

Hub-idempotency planning can report:

- `CREATE_REQUIRED`
- `MATCHED`
- `RESTORE_REQUIRED`
- `UPDATE_REQUIRED`
- `SOURCE_MISSING_MARK_REQUIRED`
- `SOURCE_MISSING_REVIEW_REQUIRED`
- `CONFLICT_SAME_REVISION_DIVERGENCE`
- `CONFLICT_DATABASE_AHEAD`
- `CONFLICT_POSTGRES_OWNED`

Any conflict blocks synchronization.

## Transaction and source-change protection

Synchronization runs inside one PostgreSQL transaction.

After writes are staged, Phase 1D rediscovers the filesystem source at the same observation time and compares a deterministic discovery fingerprint. If the source changed during synchronization, the transaction rolls back with:

`D1_SESSION_IDEMPOTENCY_SOURCE_CHANGED_DURING_SYNC`

## Verification meaning

`verify` proves only bounded shadow consistency for this local synthetic slice.

`shadowParityComplete: true` means the current filesystem records and PostgreSQL shadows match and no source-missing review state remains.

`shadowParityComplete: false` means synchronization is stable but at least one missing-source record remains review-required.

It does not mean:

- PostgreSQL is authoritative
- runtime cutover is complete
- production authentication is approved
- distributed exactly-once semantics exist
- live PartnerFI/provider authority exists
- regulated data is permitted

## Deliberate exclusions

Phase 1D does not:

- switch session reads to PostgreSQL
- switch E1E idempotency reads to PostgreSQL
- dual-write from runtime request paths
- add background synchronization
- enable non-loopback PostgreSQL
- enable regulated mode
- introduce real-person data
- change financial/provider/PartnerFI authority
- claim cross-region consensus or financial exactly-once delivery

## Next gate

A future read-cutover slice must be separately reviewed before PostgreSQL can become an active runtime read path. That review must prove at minimum:

- runtime adapters preserve current session expiry/revocation behavior
- Hub idempotency preserves exact CAS and conflict semantics
- `SOURCE_MISSING_REVIEW_REQUIRED` can never authenticate or authorize dispatch
- rollback to filesystem-primary remains deterministic
- crash/restart behavior is tested against real PostgreSQL
- no provider or regulated authority is introduced by persistence activation
