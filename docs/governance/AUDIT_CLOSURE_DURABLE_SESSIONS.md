# Audit Closure ? Restart-Durable Synthetic Sessions

## Purpose

This remediation addresses external-audit finding **F-05 (in-memory session store)** and materially improves **F-10 (lazy session garbage collection)** while preserving the Stage-4 synthetic boundary.

## Architecture

`SyntheticAuthService` now depends on a narrow `SyntheticSessionPersistence` contract instead of owning an in-process session map. Two implementations exist:

- `InMemorySyntheticSessionPersistence` ? the default for isolated local tests/development; explicitly `durable: false`.
- `AtomicDirectorySyntheticSessionPersistence` ? one strict JSON record per random session UUID under `${SYNTHETIC_STATE_DIR}/sessions`; explicitly `durable: true`.

The durable implementation uses exclusive temporary-file creation, file `fsync`, atomic rename, and directory-entry `fsync` where the host/runtime supports it. The existing Windows limitation remains explicit: Node/Windows does not provide the same directory-fsync behavior, so the implementation preserves file-fsync + atomic-rename semantics without claiming POSIX-equivalent crash durability.

Per-session files avoid an aggregate JSON session file becoming a lost-update hotspot. Multiple application processes that share the same approved filesystem path can read sessions created by another process. Session UUID collision is rejected rather than overwritten.

## Fail-closed behavior

Persisted sessions are parsed through a strict schema before use. Malformed/corrupt store state maps to `SESSION_STORE_UNAVAILABLE` (503); it never grants a session. Expired sessions fail with `SESSION_EXPIRED` and are removed. Revocation deletes durable state.

A background TTL sweep removes expired sessions in addition to authentication-time expiry checks. Sweep failure does not weaken authorization because every authentication still reloads, validates and checks expiry before returning a session.

Deployment configuration can require durability:

```text
REQUIRE_DURABLE_SESSION_STORE=true
SYNTHETIC_STATE_DIR=<approved-synthetic-state-path>
```

If durability is required but `SYNTHETIC_STATE_DIR` is absent, startup fails closed with `DURABLE_SESSION_STORE_REQUIRED`.

## Evidence / validation

Tests cover:

- session continuity across a fresh auth-service instance;
- continuity across a fresh HTTP application instance;
- durable revocation;
- expiry after restart;
- background TTL cleanup;
- corrupt persisted-state denial;
- two independent store/service instances sharing distinct sessions;
- fail-closed required-durability configuration.

## Non-claims

This is **not** PartnerFI/production authentication, SSO, a distributed consensus session service, cross-region replication, or production multi-node linearizability. It does not make the Stage-4 demo a controlled live financial pilot. Production/staging infrastructure must select an approved Ethiopia-resident shared persistence service/filesystem and complete the separate security, operational and regulatory gates.
