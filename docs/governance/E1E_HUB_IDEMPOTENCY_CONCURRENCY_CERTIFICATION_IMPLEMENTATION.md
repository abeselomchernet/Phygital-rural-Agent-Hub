# E1E Hub Idempotency / Concurrency Certification

## Status

Implemented as a bounded Stage-4 synthetic certification layer stacked on E1D. It does not merge or bypass the E1A-E1D review chain and does not activate provider, payment, settlement, production-authentication, device-control or Operations mutation paths.

## Purpose

E1E closes the first Hub engineering epic by certifying the workflow-intent invariants that E1B deliberately left outside the event-envelope digest.

The E1B `contentDigest` remains event-integrity evidence. E1E introduces a separate **business-intent digest** over the stable governed intent fields only: tenant, Hub, PartnerFI, service, capability, purpose and bounded synthetic intent facts.

Correlation ID, run ID, idempotency key, capture/expiry timestamps, route and adapter metadata are intentionally not part of the business-intent digest. Route/adapter handling is governed separately by pinning rules.

## Certified behaviors

The E1E synthetic certification store proves the following bounded semantics:

- same scoped idempotency key + same business-intent digest -> `DUPLICATE_NOOP` and one logical workflow;
- same scoped idempotency key + changed business-intent digest -> `CONFLICT_REVIEW_REQUIRED`;
- one idempotency key is scoped by tenant + Hub + PartnerFI, preventing cross-Hub or cross-partner collision;
- snapshot restore preserves the reservation identity across a synthetic restart boundary;
- stale intent replay is rejected before synthetic dispatch eligibility;
- replay is re-authorized against current E1A Hub scope and the current synthetic PartnerFI contract/catalog/route fixture;
- the possible-mutation gate remains closed unless replay certification returns `SYNTHETIC_DISPATCH_ELIGIBLE`;
- changed operator assignment produces review-required rather than silent replay;
- route/adapter changes require review, and any fallback after possible external mutation evidence is rejected;
- ambiguous external outcome becomes `RECONCILIATION_REQUIRED` and is never assumed successful;
- E1D reconstruction remains deterministic when E1B events are delivered out of order.

## Replay-time authorization

A client queue or prior reservation is not authority.

Before a replay can become even **synthetically dispatch eligible**, E1E rechecks current tenant, Hub, PartnerFI, role, purpose and operator assignment through the E1A authorization boundary. Revoked Hub assignment or another authorization mismatch fails closed.

The reservation records the original operator-assignment reference. If a later authorized context resolves to a different assignment, E1E returns `ASSIGNMENT_CHANGED_REVIEW_REQUIRED` rather than applying the stale intent.

## Route pinning and possible mutation

The certification store distinguishes business intent from route metadata.

Before any possible external mutation, a changed route/adapter is not silently accepted; it becomes `ROUTE_CHANGE_REVIEW_REQUIRED`.

After `POSSIBLE_EXTERNAL_MUTATION` is recorded, the original route and adapter are pinned. A later retry proposing another route or adapter returns `ROUTE_FALLBACK_REJECTED`.

This is evidence/control semantics only. E1E does not perform any external call.

## Ambiguous outcomes

After possible external mutation evidence, an ambiguous external observation can be recorded only as `RECONCILIATION_REQUIRED`.

All E1E decisions carry:

- `liveNetworkAllowed: false`;
- `assumedSuccess: false`;
- reservation-level `settlementAuthorityGranted: false`.

Therefore ambiguity cannot become local success or settlement evidence.

## Synthetic restart boundary

`HubWorkflowIntentCertificationStore.snapshot()` and snapshot restore preserve reservations, business-intent digests, original correlation/run identity, route pins and reconciliation state.

This is a deterministic Stage-4 **synthetic restart certification boundary only**. It is not filesystem durability, a transactional outbox, distributed locking, exactly-once delivery, disaster recovery or production persistence evidence.

The existing provider-specific persistence/fsync suites remain separate and authoritative for those implementations.

## Privacy and schema boundary

The strict E1E intent schema admits only bounded synthetic facts:

- controlled intent class;
- opaque `obj_syn_*` object reference;
- optional synthetic amount/currency pair;
- controlled variant code.

Raw provider payloads, credentials, secrets, free-form logs and arbitrary extra fields are not part of the schema and fail strict validation.

## Explicit non-capabilities

E1E adds no:

- real PII;
- real funds or cash movement;
- account posting or settlement;
- live provider networking;
- provider activation;
- Telebirr, M-PESA or ArifPay activation;
- production authentication;
- provider callback authority;
- device or firmware control;
- executable Operations reprocess/discard/resolve action;
- production distributed idempotency guarantee;
- production durable queue/outbox;
- production signing or non-repudiation claim.

`SYNTHETIC_DISPATCH_ELIGIBLE` means only that the bounded Stage-4 certification gates passed. It never changes `liveNetworkAllowed: false`.

## Validation target

Focused E1A-E1E tests cover business-intent digest separation, duplicate no-op, conflicting reuse, snapshot restart, Hub/PartnerFI collision isolation, stale replay rejection, replay-time authorization, changed assignment, route pinning, ambiguous outcome handling, out-of-order E1B reconstruction and strict raw-payload rejection.

The branch should also pass TypeScript, production build and `git diff --check`. Full Windows-suite persistence/fsync behavior remains compared against the established seven-failure host-specific baseline.

## Next workstream

E1A-E1E together complete the bounded first Hub engineering epic. The next engineering work should move to the next governed epic only after the stacked PR chain is merged through its review/CI gates. E1E itself must not be used as evidence of live provider, financial or production authority.
