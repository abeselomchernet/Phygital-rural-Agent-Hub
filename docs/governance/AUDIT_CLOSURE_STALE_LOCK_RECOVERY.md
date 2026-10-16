# Audit Closure — Bounded Stale-Lock Recovery

## Purpose

This remediation addresses external-audit finding **F-09 (stale file-lock risk)** for the bounded local/shared-filesystem persistence paths used by Stage-4 synthetic and staging evidence flows.

It does not change financial, provider, settlement, device, geographic or regulated authority. It changes only how cooperating local persistence writers coordinate and recover from abandoned lock files.

## Affected persistence paths

The shared lease primitive is applied to every `.lock` writer currently present in `src/server`:

- neutral payment-attempt persistence;
- Telebirr preorder-intent persistence;
- Hub workflow idempotency/CAS persistence.

No provider route is activated by this work.

## Lease record

A newly acquired lock is an exclusive-create JSON lease record containing:

- schema version;
- cryptographically random owner UUID;
- process ID;
- host name;
- creation time;
- bounded lease-expiry time.

The default persistence lease is **60 seconds**. The critical sections are synchronous local file CAS/write/rename operations and are expected to complete well within that bound. This is not a heartbeat-based distributed lease service.

## Recovery algorithm

A competing writer first attempts exclusive lock creation. If the lock already exists:

1. a valid structured lease is recoverable only after its lease expiry;
2. a legacy/malformed lock is recoverable only after its filesystem modification age exceeds the configured lease TTL;
3. a stale candidate is atomically renamed to a unique quarantine path before deletion;
4. quarantined content is re-read and compared with the originally observed lock before deletion;
5. if the observed lock changed during recovery, restoration is attempted and recovery fails closed;
6. fresh/unproven locks remain blocking;
7. Windows `EACCES`/`EPERM` during stale quarantine is treated as active/unrecoverable contention, not permission to delete;
8. containing-directory durability uses the existing explicit platform-aware directory-fsync helper.

This permits bounded crash-stale recovery without blindly deleting an existing lock file.

## Ownership-safe release

Release verifies the current lock owner before removal. It then renames the owned lock to an owner-specific release path, re-verifies the owner, removes only that quarantined owned lock, and fsyncs the containing directory where supported.

If the lock is missing, malformed, or has been replaced by another owner, release fails closed with an ownership-loss error and does **not** intentionally delete the replacement owner's lock.

## Concurrency and failure semantics

- Active/fresh contention remains fail-closed.
- Revision compare-and-set remains the authoritative lost-update guard after lock acquisition.
- Payment-attempt, Telebirr intent and Hub idempotency persistence retain their existing atomic temp-file + file-fsync + rename behavior.
- A recovered lock does not imply that an external provider call, financial mutation, posting or settlement did or did not occur; existing reconciliation/ambiguity rules still apply.
- Lock recovery never converts unknown external outcome into success.

## Validation target

Tests cover:

- fresh owned-lock contention;
- actual separate-process contention;
- expired structured lease recovery;
- legacy malformed crash-lock recovery after TTL;
- no recovery of a fresh/unproven legacy lock;
- owner-replacement detection on release;
- integration recovery for payment-attempt persistence;
- integration recovery for Telebirr preorder-intent persistence;
- integration recovery for Hub idempotency persistence;
- existing revision-CAS and duplicate/conflict behavior.

The same implementation is exercised on Windows locally and by hosted Linux CI. The repository continues to state the Windows directory-fsync limitation explicitly rather than claiming POSIX-equivalent directory durability.

## Non-claims

This is **not** a distributed lock manager, database transaction coordinator, cross-region lease, fencing-token protocol, consensus system, production outbox, financial exactly-once guarantee, PartnerFI ledger, provider settlement proof, or controlled-live-pilot authorization.

For future multi-host production infrastructure, an approved transactional persistence service with native uniqueness/CAS/locking semantics remains preferable to filesystem coordination.
