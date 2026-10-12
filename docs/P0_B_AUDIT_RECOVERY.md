# B4 — bounded synthetic audit, privacy and recovery

Implemented for synthetic development; not an immutable regulatory audit platform. `SyntheticAuditLog` accepts only strict schemas, controlled action/state codes, fixed synthetic actor IDs and UUID references. No free-text provider error, request body, cookie, CSRF token, phone, FIN/FAN, identity payload, biometric, provider reference or idempotency key is logged. Rejected input is not echoed into audit. UUID references remain linkable metadata; real deployments must treat them as restricted data.

| Executable path | Audit evidence |
| --- | --- |
| Session creation, expiry, revocation, denied authentication | AUTH records; no session identifier or token |
| Role/object/CSRF/rate/origin/privileged-role denial | Controlled denial codes; no raw headers or requested role payload |
| Customer KYC transitions | KYC_TRANSITION with UUID and controlled before/after/reason; fixture bootstrap is a SYSTEM event |
| Phone alias change | PHONE_ALIAS_CHANGED without either alias; transition remains separately auditable |
| Mock PartnerFI request | PARTNER_TRANSACTION_SUBMITTED before submission; RESULT or REJECTED after evaluation. Replay attempts may create audit records but do not repost funds |
| Local reconciliation contract | Registration, authenticated callback applied/duplicate/rejected, and local status query. No callback signature, provider reference or raw body |
| Domain administrative recovery | Denied attempt and completed SUSPENDED → VERIFIED transition; existing explicit PARTNER_ADMIN authority remains mandatory |

Administrative recovery is an internal synthetic domain operation, not an exposed HTTP admin endpoint or a real partner credential. Runtime cannot self-select privileged roles. The reconciliation service remains a local/test contract; `statusQuery` reads persisted local state, not a live provider. No HTTP callback or remote GhostSync receiver was enabled.

## Retention and replay

- Synthetic audit defaults to the newest 1,000 events, configurable by constructor; records survive restart with the optional atomic JSON adapter. This is count-based development retention, not an approved legal schedule, tamper-evident chain, or evidence-preservation guarantee.
- Audit pruning is separate from financial/idempotency state. Never delete transaction uniqueness records because an audit entry expires.
- Test receiver receipts default to 30 days, then retain replay tombstones for 60 days after pruning. Per-customer sequence watermarks survive tombstone pruning. New events older than seven days or over 60 seconds in the future are rejected. These are synthetic test policy values, not approved retention requirements.
- Callback replay records and PartnerFI idempotency records currently have no automatic expiry. Customer snapshots also contain a separate KYC-transition history. Production deletion/retention must cover all stores, snapshots and backups, minimize fingerprints, preserve replay safety and account for legal holds.
- Atomic JSON files are single-process development snapshots, unencrypted and not a transactional cross-store database. A state write and its audit write are not one atomic transaction. Failure recovery and exactly-once regulatory audit require a transactional database/outbox design before real use.

## Browser/device recovery

Current IndexedDB contains synthetic requests only, in plaintext. Losing browser storage loses local-only queued records; no server recovery of unsent messages is claimed. Logout, server-session expiry and restart require a new server session and never authorize old queue entries. Domain state can optionally survive restart, sessions do not. No identity/phone proof is inferred from possession of local records.

Legacy `GhostSyncDB` is neither read nor migrated by application startup. `EnawugaSyntheticOutbox` stays separate. Reconnect, page reload, retry and apparent receiver availability never upload either database. A browser regression test preserves a seeded legacy record while a simulated receiver is reachable and asserts zero upload attempts. Existing offline tests preserve the current outbox across reload/reconnect without settlement.

Future recovery/migration requires an explicit reviewed workflow: authenticate a newly authorized device and actor; inventory/quarantine records; validate schema/provenance and customer ownership; obtain applicable customer consent and PartnerFI authorization; preserve original IDs and replay/tombstone history; record a redacted migration decision; reconcile uncertain outcomes before retry. No silent import, blanket consent flag, reset of sequence history or automatic upload is permitted. That governed migration path is not implemented; receiver availability alone must never enable it.

Lost/stolen devices require session revocation, device/key revocation and partner-led recovery. Remote wipe is not implemented. Approval of replacement credentials does not make an old untrusted queue authoritative.
