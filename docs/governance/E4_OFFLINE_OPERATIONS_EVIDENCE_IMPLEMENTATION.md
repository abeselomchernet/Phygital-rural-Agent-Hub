# E4 Offline Operations Evidence Implementation

## Status

Implemented as the next bounded Stage-4 engineering epic after merged E3 Hub Liquidity Intelligence. E4 adds canonical offline-operations evidence and read-only Operations visibility. It does not enable remote GhostSync for real data, a live receiver, provider networking, settlement, cash movement or production authority.

## Purpose

E4 turns the governed offline-resilience requirements into an explicit evidence contract around the already-merged E1E Hub workflow-intent certification model.

The canonical product path represented in evidence is:

```text
CAPTURED_OFFLINE
-> QUEUED
-> TRANSPORT_ATTEMPTED
-> RECEIVED
-> AUTHORIZATION_PENDING
-> AUTHORIZED / REJECTED / DUPLICATE_NOOP
-> RECONCILIATION_REQUIRED where ambiguous
```

The design preserves the central architecture rule:

> A client-side queue is untrusted intent, not authority.

Transport receipt, upload, retry or reconnect state never upgrades financial authority and never implies PartnerFI posting or settlement.

## Canonical terminology

Historical Ghost/GhostSync artifacts remain bounded pattern archaeology and existing local-demo compatibility. The new E4 contract is named **Hub Offline Operations Evidence** rather than extending historical GhostSync terminology into the canonical domain model.

The legacy client outbox remains remote-disabled. E4 does not add a remote GhostSync HTTP receiver or change `remoteSyncEnabled`.

## Reuse of E1E

E4 does not invent a second idempotency or replay-authority engine.

`src/domain/hubOfflineOperationsEvidence.ts` reuses `HubWorkflowIntentCertificationStore` from E1E for:

- stable scoped idempotency identity;
- canonical business-intent digest comparison;
- duplicate no-op detection;
- changed-intent conflict detection;
- stale-intent rejection;
- replay-time server reauthorization;
- current Hub / PartnerFI / role / assignment checks;
- pinned route / adapter enforcement;
- ambiguous-outcome reconciliation state.

The E1B event `contentDigest` is not used as business-intent equality evidence. E4 records the E1E server-side business-intent digest separately and explicitly states that event-content digest is not used as business intent.

## HubOfflineQueueRecord

The queue record is a strict synthetic representation of client-captured intent. It contains:

- queue record identity;
- the strict E1E workflow-intent request;
- queue timestamp;
- optional last transport-attempt timestamp;
- retry count;
- local evidence receipt;
- schema-literal `untrustedIntent: true`;
- schema-literal `clientAuthorityGranted: false`;
- schema-literal `remoteSyncEnabled: false`.

The local receipt proves only that the synthetic client recorded a queue item. It explicitly does not prove remote receipt, PartnerFI posting or financial authority.

## Queue aging

E4 computes queue age from `queuedAt` to evidence evaluation time and projects:

- `FRESH` through 15 minutes;
- `AGING` through 60 minutes;
- `STALE` after 60 minutes.

Queue-age classification is operational evidence only. The decisive replay-expiry rule remains E1E's governed `expiresAt` check. A stale or expired item cannot become dispatch-eligible merely because the transport later succeeds.

## Transport evidence

The E4 transport state is intentionally narrow:

- `CAPTURED_OFFLINE`;
- `QUEUED`;
- `TRANSPORT_ATTEMPTED`;
- `RECEIVED`.

A synthetic remote receipt includes:

- receipt identity;
- received timestamp;
- deterministic receipt digest;
- `transportAccepted: true`;
- `financialAuthorityGranted: false`;
- `settlementAuthorityGranted: false`;
- `liveProviderReceipt: false`.

Therefore a received item may still be rejected, remain a duplicate no-op, or require reconciliation.

## Authority evidence

Authority is projected independently from transport:

- `UNTRUSTED_INTENT`;
- `AUTHORIZATION_PENDING`;
- `SYNTHETIC_AUTHORIZED`;
- `DUPLICATE_NOOP`;
- `REJECTED`;
- `RECONCILIATION_REQUIRED`.

`SYNTHETIC_AUTHORIZED` means only that the E1E replay-time synthetic gate passed. It does not mean a live provider call is permitted, that funds moved, or that a PartnerFI posted or settled anything.

Every processing record has machine-readable boundaries:

- Stage 4;
- synthetic only;
- client queue is not authority;
- replay reauthorization required;
- remote receipt does not imply financial authority;
- transport success does not imply settlement;
- live network disabled;
- external provider call count exactly zero;
- no cash movement;
- no PartnerFI posting;
- no settlement authority;
- assumed success false.

## Retry and idempotency evidence

E4 exposes role-safe idempotency evidence without exposing the raw idempotency key.

Evidence includes:

- server-computed E1E business-intent digest;
- E1E certification decision;
- reservation ID;
- original correlation ID where applicable;
- duplicate-no-op indicator;
- conflict-review indicator;
- `rawIdempotencyKeyExposed: false`;
- `eventContentDigestUsedAsBusinessIntent: false`.

An identical retry creates no second logical workflow and appears as `DUPLICATE_NOOP`.

Reuse of the same scoped idempotency key with changed canonical intent becomes `CONFLICT_REVIEW_REQUIRED`; it is never silently overwritten.

Each processing evidence record also carries a deterministic canonical SHA-256 evidence digest and digest-derived evidence ID. The read-model constructor recomputes both and fails closed on schema-valid content tampering. This is content-integrity evidence only; it is not provider attestation, legal non-repudiation or proof that an external event occurred.

## Replay-time authorization

For a received queue item, E4 records `AUTHORIZATION_PENDING` before using the E1E replay gate against the current server context.

The current context must still satisfy the governed Hub / tenant / PartnerFI / role / region / assignment / service / capability / route / adapter state and intent expiry.

The synthetic fixture includes a request that was valid at capture but whose replay scope has been revoked. Transport reaches `RECEIVED`, while authority independently becomes `REJECTED` with `REPLAY_AUTHORIZATION_DENIED`.

This proves reconnect or receipt cannot bypass current authorization.

## Ambiguous outcome handling

E4 includes a bounded synthetic ambiguity path over E1E's possible-mutation certification state.

The path never performs a provider call. It only exercises the synthetic certification state machine and then records an ambiguous outcome as `RECONCILIATION_REQUIRED`.

The resulting evidence retains:

- external provider calls = 0;
- live network disabled;
- assumed success = false;
- settlement authority = false.

No automatic retry is inferred after an ambiguous outcome where duplicate execution could be unsafe.

## Correlation timeline

Each processing record carries a typed timeline. The read model groups records by exact correlation ID and deterministically reconstructs the combined timeline regardless of evidence delivery order.

A trace summarizes:

- queue-record count;
- total retry count;
- maximum queue age;
- latest transport state;
- latest authority state;
- latest outcome;
- duplicate-no-op observed;
- conflict observed;
- reconciliation required;
- role-safe processing-record projections.

One correlation is not permitted to cross tenant, Hub or PartnerFI scope.

## Role-safe projection

The Operations projection deliberately omits:

- raw workflow-intent facts;
- raw idempotency key;
- credentials;
- provider payloads;
- mutation authority;
- settlement authority.

It retains only the bounded evidence needed to understand queue age, retry state, conflict/duplicate status, transport receipt, server replay decision and reconciliation requirement.

## Shared-Hub PartnerFI isolation

The synthetic fixture includes both PartnerFI Alpha and PartnerFI Beta evidence on the shared Adama Hub.

Search is scoped by authenticated tenant / Hub / PartnerFI before optional exact correlation matching. An Alpha Operations caller querying the exact Beta correlation receives an empty result rather than cross-partner evidence.

## Read-only API

E4 adds:

```text
GET /api/demo/hub-operations/offline-evidence?hubId=<hub>&correlationId=<optional exact correlation>
```

The route:

- requires an authenticated synthetic session;
- permits only `OPERATIONS` and `PARTNER_ADMIN` roles;
- reuses E1A `HUB_PARTNER_REVIEW` authorization;
- derives tenant / Hub / PartnerFI scope from the authenticated session and authorized Hub membership;
- accepts only exact validated correlation IDs;
- returns read-only role-safe evidence.

There is no POST / PUT / PATCH / DELETE replay, sync, retry, discard, resolve or reconciliation action endpoint.

## Synthetic fixture coverage

The fixture set includes:

- queued but not remotely received intent;
- successfully received and replay-authorized synthetic intent;
- identical retry -> duplicate no-op;
- changed retry -> conflict review;
- expired/stale queued intent;
- replay-scope revocation after capture;
- ambiguous synthetic post-gate outcome -> reconciliation required;
- PartnerFI Beta shared-Hub isolation evidence.

These are deterministic Stage-4 test fixtures, not production events.

## Explicit non-capabilities

E4 adds no:

- real PII;
- real customer offline payload transport;
- production GhostSync receiver;
- remote GhostSync activation;
- live provider call;
- provider callback authority;
- real funds or cash movement;
- PartnerFI posting or settlement;
- cash dispense instruction;
- device transfer authority;
- automatic retry after ambiguous possible mutation;
- production authentication;
- production signing / non-repudiation claim;
- regulated production authority.

Wishland remains technology/orchestration; licensed institutions retain regulated authority.

## Validation target

E4-focused tests cover:

- untrusted local queue evidence and queue aging;
- transport receipt vs financial-authority separation;
- replay-time authorization evidence;
- duplicate-no-op evidence;
- changed-intent conflict visibility;
- stale intent rejection;
- revoked replay scope rejection;
- ambiguous outcome -> reconciliation required;
- zero-provider-call / no-assumed-success boundaries;
- redacted Operations projection;
- shared-Hub PartnerFI isolation;
- deterministic correlation reconstruction;
- malformed/fuzzy input rejection;
- authenticated Operations/Partner Admin API scope;
- absence of mutation endpoints.

Before merge, the exact branch must pass TypeScript, production build, `git diff --check`, cumulative E1A-E4 focused coverage and the full-suite baseline comparison. Hosted Linux GitHub Actions remains the authoritative merge gate for the exact PR head.

## Next gate

After E4 is merged, the next governed backlog epic is **E5 — Hub Economics**. E5 must keep model assumptions, model outputs, observations and externally verified evidence classes distinct and must not present synthetic economics as observed pilot performance.
