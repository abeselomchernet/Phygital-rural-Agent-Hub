# D1 Persistence — Phase 1B Async Boundary and Shadow Migration

## Status

Phase 1B reconciles the synchronous filesystem domain contracts with PostgreSQL's asynchronous I/O model without pretending PostgreSQL is a synchronous drop-in adapter.

The running application remains on the proven filesystem persistence path. PostgreSQL remains a bounded local-synthetic engineering target only.

## Async persistence boundary

`PostgresD1AsyncSnapshotBoundary` is an explicit asynchronous service boundary. It provides:

- asynchronous readback;
- compare-and-swap writes with explicit expected revisions;
- deterministic canonical payload digests;
- fail-closed CAS conflicts;
- source attribution (`SYNTHETIC_FILESYSTEM` or `SYNTHETIC_POSTGRES`);
- shadow-row rollback restricted to filesystem-sourced synthetic snapshots.

No domain `load()/save()` interface has been silently changed and no fire-and-forget write path is introduced.

## Shadow migration/readback scope

The bounded migration tool recognizes only strict current synthetic snapshot schemas for:

- customers;
- PartnerFI synthetic ledger;
- mock identity-provider state;
- KYC-pending state;
- payment-gateway durable state;
- payment-gateway reconciliation state;
- synthetic audit events.

Unknown files are ignored rather than imported generically. Known files must pass their current Zod schemas before any database write occurs. Symlinked state directories/files fail closed.

Audit events are imported into the append-only audit table and are never deleted by rollback. Mutable shadow snapshots can be rolled back only when their digest and expected revision still match.

Sessions and Hub-idempotency directory stores are deliberately excluded from this slice because their per-record/CAS semantics require dedicated migration handling rather than flattening them into aggregate snapshots.

## Operator gates

The shadow tool requires all of the following:

- `DATA_MODE=synthetic`;
- `D1_POSTGRES_ENABLED=true`;
- `D1_POSTGRES_MODE=local-synthetic`;
- a loopback PostgreSQL URL;
- `SYNTHETIC_STATE_DIR`;
- explicit `D1_SHADOW_MIGRATION_ACK=synthetic-only`.

Examples:

```bash
npm run d1:db:shadow -- import
npm run d1:db:shadow -- verify
npm run d1:db:shadow -- rollback
```

These commands are local synthetic engineering operations. They do not authorize real-person data migration, production hosting, PartnerFI database access, regulated mode, settlement, posting, or provider activation.

## Rollback semantics

Rollback removes only mutable shadow snapshot rows that still match the source digest and current revision. It does not delete append-only audit records. This is intentional: append-only migration evidence is retained rather than rewritten to simulate that an import never occurred.

## Next gate

Phase 1C may introduce controlled dual-write/shadow verification only after Phase 1B CI proves:

1. real PostgreSQL CAS behavior;
2. deterministic filesystem-to-PostgreSQL readback parity;
3. idempotent re-import behavior;
4. conflict rejection when PostgreSQL state diverges;
5. bounded rollback behavior;
6. append-only audit immutability.

A runtime read cutover is not authorized by Phase 1B.
