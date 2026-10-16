# Audit Closure — Restart-Durable Hub Idempotency CAS

## Purpose

This remediation addresses external-audit finding **F-06 (in-memory idempotency store)** for the governed E1E Hub workflow-intent certification boundary. It adds restart-durable, scoped compare-and-set persistence without widening Stage-4 authority.

## Architecture

`HubWorkflowIntentCertificationStore` now depends on the narrow `HubWorkflowIntentPersistence` contract rather than owning a private in-process `Map`.

Two implementations are available:

- `InMemoryHubWorkflowIntentPersistence` — default for isolated local tests/development; explicitly `durable: false`.
- `AtomicDirectoryHubWorkflowIntentPersistence` — one strict JSON record per scoped idempotency identity; explicitly `durable: true`.

The durable scope remains the existing governed tuple:

```text
tenantId | hubId | partnerOrgId | idempotencyKey
```

The scope is SHA-256 digested only for a safe filesystem filename. The full scope remains inside the persisted record and must match when a record is loaded.

## Durable CAS behavior

Each persisted record carries a monotonic revision. Initial creation occurs under a per-scope exclusive lock. Updates use compare-and-set against the previously loaded revision. A stale revision returns `false`; the domain store converts concurrent update races into fail-closed review/error behavior rather than overwriting newer state.

Record writes use exclusive temporary-file creation, file `fsync`, atomic rename and directory-entry `fsync` where supported. Existing Windows directory-fsync limitations remain explicit and are not represented as POSIX-equivalent crash durability.

A configuration helper can require a durable idempotency persistence implementation. If a caller requires durability but provides no synthetic state directory, construction fails closed with `DURABLE_HUB_IDEMPOTENCY_STORE_REQUIRED`.

## Preserved E1E semantics

Persistence does not change the existing certification rules:

- identical retries remain `DUPLICATE_NOOP`;
- changed reuse remains `CONFLICT_REVIEW_REQUIRED`;
- ambiguous external mutation remains reconciliation-required;
- original route/adapter identity and version provenance remain pinned;
- replay still requires fresh Hub/PartnerFI authorization;
- live network and settlement authority remain false.

## Evidence / validation

Tests cover:

- restart continuity through a fresh certification-store instance;
- duplicate-no-op after restart;
- changed business intent remaining a conflict after restart;
- stale CAS revision rejection across independent persistence instances;
- corrupt persisted record failing closed;
- required-durability configuration failing closed without a state directory;
- all pre-existing E1E certification/idempotency tests unchanged.

## Follow-on F-09 status

The original idempotency PR deliberately left stale-lock recovery as a separate gate. The subsequent F-09 remediation now applies the shared owned lease/TTL recovery primitive to this filesystem CAS adapter; see AUDIT_CLOSURE_STALE_LOCK_RECOVERY.md.

## Non-claims

This is bounded synthetic/staging idempotency infrastructure. It is **not** a claim of financial exactly-once delivery, distributed-database consensus, cross-region linearizability, PartnerFI posting, settlement, funds movement, production execution or controlled-live-pilot authorization. Stage 4 remains synthetic and all existing `z.literal(false)` authority boundaries remain unchanged.
