# E1D Hub Operations Trace Read Model

## Status

Implemented as a bounded Stage-4 synthetic read model stacked directly on E1C. It does not merge or bypass PR #44, #45, #46 or #47, and it does not add any provider, payment, settlement, production-authentication, device-control or operations-mutation authority.

## Purpose

E1D turns verified E1B workflow envelopes plus E1C evidence-manifest metadata into an Operations/Reconciliation read surface that can reconstruct a bounded workflow without exposing raw private logs or provider payloads.

The implementation provides:

- exact correlation search;
- deterministic event timelines;
- typed queue, retry, conflict, denied/deferred and reconciliation states;
- bounded evidence references and E1C manifest metadata;
- tenant/Hub/PartnerFI-scoped projections;
- role-gated future action placeholders;
- a read-only synthetic API surface for Operations and Partner Admin roles.

## E1B and E1C integrity boundary

`createHubOperationsTraceReadModel()` verifies every E1B envelope and the E1C manifest before building a trace.

The read model fails closed when:

- an event run ID differs from the manifest run ID;
- the E1C event-digest inventory differs from the supplied E1B envelopes;
- the E1C correlation inventory differs from the supplied E1B envelopes; or
- one correlation crosses tenant, Hub, run or PartnerFI scope.

Events are ordered by `occurredAt` and then `eventId` so shuffled input produces the same timeline.

## Operational state semantics

Queue state is a projection of the latest E1B transport state. It remains separate from authority state and never establishes settlement or regulated authority.

E1D recognizes explicit synthetic evidence detail codes for Operations presentation:

- `RETRY_OBSERVED` -> retry evidence is present;
- `CONFLICT_REVIEW_REQUIRED` -> conflict evidence is present and review is required;
- `RECONCILIATION_REQUIRED` -> reconciliation review is required.

`UNVERIFIED` outcomes also remain review-required in the read model.

This is deliberately not E1E certification. E1D does **not** infer identical-retry, duplicate-no-op or conflicting business intent from the E1B event digest or idempotency key. E1E remains responsible for canonical workflow-intent equality, concurrency and replay certification.

## Typed denied and deferred outcomes

The read model preserves E1B outcomes and adds a bounded `attentionState` so Operations can distinguish:

- `DENIED`;
- `DEFERRED`;
- `UNVERIFIED`;
- `PARTNER_REVIEW_REQUIRED`;
- `CONFLICT_REVIEW_REQUIRED`; and
- no special attention.

No denied, deferred or ambiguous state is silently converted into success.

## Role-safe scope

The HTTP read surface is:

`GET /api/demo/hub-operations/traces?hubId=...&correlationId=...`

The endpoint requires an authenticated synthetic `OPERATIONS` or `PARTNER_ADMIN` session and then reuses the E1A Hub authorization boundary with purpose `HUB_PARTNER_REVIEW`.

The active PartnerFI comes from the authenticated server-side session. A caller cannot select another partner through the correlation query. Cross-partner correlation searches return an empty result after authorized Hub/Partner scope is established.

Agents and Supervisors are not granted this Operations trace surface in E1D.

## Redacted projection

The E1D projection includes bounded workflow metadata only:

- correlation/run/Hub/PartnerFI identifiers;
- event ID/type/time;
- transport, authority and outcome state;
- controlled detail code;
- service/capability/route/adapter references;
- limitation codes;
- evidence references;
- content digests;
- E1C manifest identity, completeness and explicit non-evidence summary.

The projection intentionally omits the E1B idempotency key and has no raw-log, raw-provider-payload, credential, secret or arbitrary metadata field.

## Future action placeholders

E1D can expose review placeholders such as:

- `REPROCESS_REVIEW_PLACEHOLDER`;
- `RECONCILIATION_REVIEW_PLACEHOLDER`;
- `CONFLICT_REVIEW_PLACEHOLDER`;
- `RESOLUTION_REVIEW_PLACEHOLDER`.

Every placeholder is schema-literal `mutationEnabled: false` and `requiresFutureAuthorization: true`.

Partner Admin receives additional conflict/resolution review placeholders where applicable. No POST/PATCH/PUT/DELETE Hub Operations action route is mounted by E1D.

These placeholders are presentation/readiness evidence only. They do not grant reprocess, discard, resolve, provider-call, posting or settlement authority.

## Synthetic fixture coverage

The E1D synthetic fixture set contains bounded Alpha traces for retry-observed, conflict-review, ambiguous/reconciliation and denied outcomes, plus a Beta trace used to prove cross-partner filtering on the shared Adama Hub.

The E1D evidence manifest remains Stage-4 synthetic and records zero external provider calls, zero PartnerFI settlement evidence, no real PII and no real funds.

## Explicit non-capabilities

E1D adds no:

- real customer PII;
- real funds or cash movement;
- account posting or settlement;
- live provider networking;
- Telebirr, M-PESA or ArifPay activation;
- production authentication;
- provider callback authority;
- device or firmware control;
- raw-log or provider-payload exposure;
- executable reprocess/discard/resolve action;
- business-intent idempotency certification;
- production cryptographic signing or non-repudiation claim.

## Validation target

Focused E1D tests cover deterministic timeline reconstruction, queue/retry/conflict/reconciliation states, denied/deferred outcomes, projection redaction, role-gated non-mutating placeholders, exact correlation filtering, cross-partner/Hub isolation, E1C digest/correlation binding, scope mismatch rejection, API authorization and absence of an Operations mutation endpoint.

The branch should additionally pass the E1A-E1D focused suite, TypeScript, production build and `git diff --check`. The full Windows suite remains compared with the established host-specific M-PESA/Telebirr persistence/fsync baseline.

## Next workstream

E1E should implement the governed idempotency/concurrency certification suite: identical retry -> one logical workflow/duplicate no-op, changed reuse -> conflict/review, deterministic out-of-order handling, required restart persistence, no cross-partner/Hub collision, no silent route/provider fallback after possible mutation, stale queued-intent rejection, replay-time reauthorization and fail-closed ambiguous external-provider outcomes.
