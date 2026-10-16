# D1 Persistence Foundation — Phase 1A

## Status

This is the first bounded implementation slice of Wave-D D1 persistence. It establishes a PostgreSQL schema, migration ledger, storage-class vocabulary, local-synthetic configuration guard, migration command, and real-PostgreSQL CI verification.

It does not replace the current filesystem runtime persistence.

## Preserved authority boundaries

- DATA_MODE remains synthetic.
- Regulated mode remains fail-closed.
- PostgreSQL activation in this slice is local-synthetic only.
- No real customer data migration is authorized.
- No production or external PartnerFI database is configured.
- Provider success remains distinct from PartnerFI settlement.
- Offline edge state remains edge-local and is not moved into PostgreSQL by this slice.

## PostgreSQL engineering target

PostgreSQL 17 is the CI reference version for this bounded foundation. This is not a production-hosting or residency selection. Production version, topology, WAL archive destination, backup policy, retention, and ET-resident hosting remain separate engineering/external decisions.

## Schema scope

The foundation adds governed structures for:

- mutable transactional snapshots;
- durable synthetic sessions;
- Hub workflow intent CAS state;
- append-only audit events;
- append-only evidence records;
- append-only external references;
- transactional outbox state;
- dead-letter review state;
- a checksum-protected schema migration ledger.

No fixed legal retention duration is encoded.

## Runtime cutover constraint discovered during implementation

The current persistence interfaces are synchronous load/save contracts. Standard Node.js PostgreSQL drivers are asynchronous. A direct PostgreSQL runtime adapter cannot truthfully preserve the current synchronous interface without one of the following:

1. changing the persistence boundary to asynchronous contracts;
2. introducing an explicitly governed asynchronous persistence service boundary; or
3. using unsafe blocking/fire-and-forget behavior, which is rejected.

Therefore Phase 1A intentionally does not pretend that PostgreSQL can be swapped under the current synchronous contracts with zero domain impact. The filesystem adapters remain authoritative while the next Phase-1 slice resolves the interface transition explicitly and tests migration/rollback behavior.

## Validation

The repository CI uses an ephemeral PostgreSQL 17 service database named enawuga_d1_test. The integration test:

- applies migration 001;
- re-applies it as an idempotent no-op with checksum verification;
- verifies the expected tables;
- proves audit-event UPDATE and DELETE fail closed.

This CI database is synthetic test infrastructure only.
