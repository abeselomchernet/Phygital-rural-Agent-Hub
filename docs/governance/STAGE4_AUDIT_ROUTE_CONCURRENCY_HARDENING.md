# Stage-4 Audit Route-Version and Concurrency Hardening

## Scope

This bounded follow-up addresses two test-quality gaps identified by the independent 2026-10-15 audit: route-version drift and Promise-based concurrent idempotency races. The audit remains an external artifact; this document records the repository response only.

## Route-version drift

Post-submit and ambiguous governed route resolution now requires the originally observed route and adapter versions in addition to the pinned route ID. The technical resolver can receive expected route/adapter versions and fails closed on mismatch with `ROUTE_VERSION_MISMATCH` or `ADAPTER_VERSION_MISMATCH`.

Pre-submit resolution remains unchanged: it resolves the currently governed route and returns version provenance. The caller can then pin that provenance before any future mutation boundary.

This closes a bounded restart/configuration-drift gap where the same route identifier could otherwise resolve to changed route or adapter metadata after submission. It does not authorize route fallback, adapter substitution, live networking, provider mutation, or production execution.

## Concurrent idempotency tests

The E1E workflow-intent certification suite now exercises `Promise.all` races against the shared Stage-4 store. Identical scoped intents must create exactly one logical workflow and all other contenders become duplicate no-ops. A changed intent racing on the same scoped idempotency key must produce exactly one reservation and one conflict-review result, with no assumed success.

These tests cover the current single-process JavaScript execution model only. They are not evidence of distributed locking, multi-node linearizability, production exactly-once processing, or crash-safe persistence. Those remain future production requirements.
