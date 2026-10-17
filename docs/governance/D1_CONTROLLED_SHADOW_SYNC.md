# D1 Persistence — Phase 1C Controlled Shadow Synchronization

## Status

Phase 1C adds a repeatable, operator-triggered filesystem-to-PostgreSQL shadow synchronization process. It does **not** make PostgreSQL an authoritative runtime read path and does not change current synchronous domain persistence contracts.

The filesystem remains the bounded synthetic runtime source of truth in this phase.

## Why this is not runtime dual-write

Current domain persistence contracts are synchronous while PostgreSQL I/O is asynchronous. Wiring database writes directly into synchronous domain `save()` methods would require blocking, fire-and-forget behavior, or a wider domain-contract change. Those options are not authorized by this phase.

Instead, Phase 1C performs explicit asynchronous synchronization from stable, schema-validated filesystem snapshots after the filesystem write boundary.

## Planning states

For each governed snapshot source, the synchronization planner emits exactly one state:

- `DATABASE_MISSING` — filesystem source exists; no PostgreSQL shadow row exists;
- `MATCHED` — PostgreSQL shadow digest matches the current filesystem source;
- `UPDATE_REQUIRED` — PostgreSQL row is still filesystem-owned but reflects an older filesystem digest;
- `CONFLICT_POSTGRES_OWNED` — the row is marked `SYNTHETIC_POSTGRES`; automatic filesystem overwrite is forbidden and human review is required.

A synchronization run fails closed before snapshot writes if any `CONFLICT_POSTGRES_OWNED` state exists.

## Concurrency and overwrite rules

All creates and updates use the Phase 1B PostgreSQL compare-and-swap boundary:

- a new shadow row requires expected revision `0`;
- an update requires the exact revision observed during planning;
- a concurrent change causes `D1_POSTGRES_CAS_CONFLICT` rather than silent overwrite;
- a PostgreSQL-owned row is never automatically replaced by filesystem state.

After writes, the process performs digest readback verification against the current filesystem discovery.

## Append-only audit synchronization

Synthetic audit events are synchronized independently using their canonical digest. Existing events are matched idempotently; missing events are inserted. UPDATE and DELETE remain rejected by the database append-only trigger.

## Missing-source behavior

The synchronizer operates only on governed source files that exist and pass their current strict schemas. It does not infer deletion authority from a missing filesystem file and does not delete PostgreSQL state because a file is absent.

Sessions and Hub-idempotency directory stores remain outside this phase. Their per-record lifecycle, expiry, and CAS semantics require dedicated migration/synchronization design.

## Operator gates

The command requires:

- `DATA_MODE=synthetic`;
- `D1_POSTGRES_ENABLED=true`;
- `D1_POSTGRES_MODE=local-synthetic`;
- a loopback PostgreSQL URL;
- `SYNTHETIC_STATE_DIR`;
- `D1_SHADOW_SYNC_ACK=synthetic-only`.

Commands:

```bash
npm run d1:db:shadow-sync -- plan
npm run d1:db:shadow-sync -- sync
npm run d1:db:shadow-sync -- verify
```

`plan` is the pre-write comparison. `sync` applies only missing or older filesystem-owned shadow snapshots and missing append-only audit events. `verify` requires exact readback parity for all discovered governed sources.

## Authority boundaries

Phase 1C does not authorize:

- PostgreSQL runtime reads;
- automatic background synchronization;
- real-person data;
- PartnerFI production data access;
- regulated mode;
- live provider activation;
- posting, settlement, custody, cash movement, insurance payout, or regulatory authority;
- automatic conflict resolution.

## Next gate

Before any PostgreSQL read cutover, the next D1 slice must separately resolve:

1. dedicated session persistence migration and expiry semantics;
2. Hub-idempotency per-scope CAS migration semantics;
3. controlled runtime async service boundaries for request paths that require durable database state;
4. startup and rollback behavior when PostgreSQL is unavailable or diverged;
5. crash/restart tests across filesystem-primary and PostgreSQL-shadow state;
6. an explicit feature gate whose default remains filesystem-primary.

Until those gates are met, filesystem persistence remains authoritative for the bounded synthetic runtime.
