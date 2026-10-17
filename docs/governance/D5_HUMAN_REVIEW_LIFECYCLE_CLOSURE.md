# D5 Human Review Lifecycle Closure — Phase 4E

**Status:** bounded Stage-4 lifecycle closure; merge-gated implementation evidence
**Program boundary:** Stage 4 synthetic / non-production only
**Architecture authority:** Wave D v1.1.1 D5.5 + `docs/architecture/ENAWUGA_MASTER_IMPLEMENTATION_PLAN.md` Gate B

## Purpose

This slice closes the bounded Human Review mutation lifecycle that was intentionally deferred by the earlier D5 Human Review foundation.

It does **not** add financial, credit, insurance, provider, legal, settlement, device-control or regulatory authority. Human Review lifecycle state describes Enawuga's internal review workflow only.

## Relationship to the Phase 4C foundation

`D5_HUMAN_REVIEW_FOUNDATION.md` remains the historical record of the read-model/policy-only foundation. That document correctly described the state at the time it was merged: no mutation endpoint, no persisted review actions, and no automatic resolution.

This closure slice adds only the bounded lifecycle that the foundation explicitly deferred. It does not revive generic operational override actions or external decision authority.

## Mounted lifecycle

Allowed transitions are exactly:

```text
PENDING -> IN_REVIEW
IN_REVIEW -> PENDING
IN_REVIEW -> ESCALATED
ESCALATED -> IN_REVIEW
IN_REVIEW -> EXTERNAL_AUTHORITY_REQUIRED
EXTERNAL_AUTHORITY_REQUIRED -> IN_REVIEW
IN_REVIEW -> RESOLVED
RESOLVED -> CLOSED
```

The mounted transition actions are:

| Action | Transition | Key condition |
|---|---|---|
| `CLAIM` | PENDING -> IN_REVIEW | internal authority owner matches reviewer role; case unassigned |
| `UNCLAIM` | IN_REVIEW -> PENDING | current assigned reviewer only |
| `ESCALATE` | IN_REVIEW -> ESCALATED | current assigned reviewer only |
| `RETURN_TO_REVIEW` | ESCALATED -> IN_REVIEW | current internal authority owner only |
| `REQUIRE_EXTERNAL_AUTHORITY` | IN_REVIEW -> EXTERNAL_AUTHORITY_REQUIRED | current assigned reviewer; ownership transfers to external authority |
| `RECORD_EXTERNAL_RESPONSE` | EXTERNAL_AUTHORITY_REQUIRED -> IN_REVIEW | external-response evidence reference required; ownership returns to the internal authority that sent the case out |
| `RESOLVE` | IN_REVIEW -> RESOLVED | current assigned reviewer only; resolves review workflow, not external/financial fact |
| `CLOSE` | RESOLVED -> CLOSED | current assigned reviewer only |

No `ESCALATED -> EXTERNAL_AUTHORITY_REQUIRED` shortcut is mounted. An escalated case must return to governed review before a new external-authority transition can be made.

## Roles and authority

### Supervisor

May mutate only cases that:
- include `SUPERVISOR` in `reviewRoles`;
- belong to the authenticated tenant, Hub and PartnerFI scope;
- are internally owned by `ENAWUGA_SUPERVISOR` when an internal action is attempted.

### Operations

May mutate only cases that:
- include `OPERATIONS` in `reviewRoles`;
- belong to the authenticated tenant, Hub and PartnerFI scope;
- are internally owned by `ENAWUGA_OPERATIONS` when an internal action is attempted.

### Partner Admin

Remains read-only. It may read only cases already included in its governed review projection. It cannot call lifecycle transitions.

### Agent

Has no Human Review queue or mutation authority.

## External authority semantics

When `REQUIRE_EXTERNAL_AUTHORITY` is applied:
- status becomes `EXTERNAL_AUTHORITY_REQUIRED`;
- `authorityOwner` becomes `PARTNERFI_OR_EXTERNAL_AUTHORITY`;
- `externalAuthorityRequired=true`;
- the internal reviewer assignment is cleared.

While the case is externally owned:
- it cannot be locally resolved or closed;
- an Enawuga reviewer cannot manufacture an external decision;
- an external response reference is required before the case can return to `IN_REVIEW`;
- that reference must resolve to an existing bounded synthetic Evidence Explorer record in the same tenant + Hub + PartnerFI scope and carry the explicit `external_response_not_external_fact` limitation.

`RECORD_EXTERNAL_RESPONSE` means only that bounded synthetic response evidence was attached and the internal review workflow may continue. It explicitly does **not** mean that an external fact was independently verified. Lifecycle events therefore carry `externalFactVerified=false`.

The returning internal authority is deterministic: it must be the same internal authority owner that transferred the case outward, or—only for an initial synthetic external-wait fixture with no prior lifecycle event—the sole mutation-capable internal role assigned to that case.

## Persistence model

Each Human Review case has a strict lifecycle record containing:
- current strict `HumanReviewCase`;
- monotonically increasing revision;
- current assigned synthetic reviewer or null;
- append-only lifecycle event array;
- append-only idempotency receipt array.

Initial seed state is revision 1 with no lifecycle events. Each successful transition appends exactly one event and exactly one idempotency receipt and increments revision by one.

Two persistence modes exist:
- in-memory persistence for bounded tests/local ephemeral runtime;
- atomic-directory CAS persistence under `SYNTHETIC_STATE_DIR/human-review` for bounded restart-durable synthetic runtime.

The atomic persistence uses:
- one file per case, addressed by a SHA-256 digest of case ID;
- per-case owned lease lock;
- compare-and-set revision check;
- temporary-file write;
- file `fsync`;
- atomic rename;
- directory `fsync`.

This is local/shared-filesystem durability only. It is not distributed consensus, a regulated case-management platform or external authority evidence.

`REQUIRE_DURABLE_HUMAN_REVIEW_STORE=true` fails closed if no `SYNTHETIC_STATE_DIR` is configured.

## Idempotency and concurrency

Mutation requests carry:
- expected revision;
- bounded synthetic idempotency key;
- bounded rationale code;
- optional external-response evidence reference only for `RECORD_EXTERNAL_RESPONSE`.

Raw idempotency keys are not stored in lifecycle records or audit events. The lifecycle record stores only a canonical digest of the key plus a canonical request digest.

Rules:
- same key + same request = idempotent replay, no new lifecycle event;
- same key + different request = conflict;
- different key + stale expected revision = conflict;
- CAS failure after validation = stale revision conflict;
- event/idempotency history is append-only and prefix-preserving;
- persisted history must remain internally coherent: event case identity, status chain, authority-owner chain, chronological ordering, receipt/event binding, result revisions and current case state must all agree.

## Rationale boundary

The lifecycle stores a bounded rationale **code**, not unrestricted free text. This reduces the chance that raw PII, credentials or uncontrolled narrative data enter the durable synthetic review record.

Free-form human notes remain outside this closure slice and require a separate governed data-class/retention/privacy design before implementation.

## API surface

### Queue/read model

`GET /api/demo/human-review/cases`

- authenticated governed role required;
- tenant + Hub + PartnerFI + role scope enforced before filters;
- Supervisor/Operations projections report lifecycle mutations mounted;
- Partner Admin projection remains read-only;
- response exposes revision, assignment and event count without idempotency receipts.

### Append-only lifecycle history

`GET /api/demo/human-review/cases/:caseId/events?hubId=...`

- governed review role required;
- same scoped object authorization as queue;
- returns lifecycle events only, not idempotency-key material;
- explicitly reports append-only semantics and no financial/settlement authority.

### Lifecycle mutation

`POST /api/demo/human-review/cases/:caseId/transitions`

- JSON required;
- authenticated session required;
- CSRF required;
- Supervisor or Operations only;
- Hub scope and PartnerFI isolation enforced;
- strict transition request schema;
- lifecycle policy + reviewer ownership + CAS/idempotency enforced;
- response preserves negative authority flags;
- `currentCase` always means the latest case state;
- `mutationResult.event` and `mutationResult.resultRevision` identify the original mutation result, so a delayed idempotent replay cannot be mistaken for the current case revision.

The collection-level `POST /api/demo/human-review/cases` remains unmounted.

## Audit

Successful lifecycle transitions emit bounded `HUMAN_REVIEW` audit events containing:
- action code;
- outcome;
- reviewer identity/role;
- case ID;
- previous lifecycle state;
- next lifecycle state.

Denied lifecycle mutations emit `HUMAN_REVIEW_MUTATION_REJECTED` where the request reached the lifecycle service. Existing auth/CSRF/scope denials remain covered by the existing auth audit path.

Audit events do not contain raw rationale text or raw idempotency keys.

## Negative authority guarantees

Every lifecycle case/event/response preserves:

```text
automaticResolutionAllowed = false
financialAuthorityGranted = false
creditApprovalAuthorityGranted = false
settlementAuthorityGranted = false
insuranceAdjudicationAuthorityGranted = false
deviceControlAuthorityGranted = false
externalFactVerified = false   [where the external-response semantic is exposed]
```

`RESOLVED` and `CLOSED` describe the Human Review workflow only. They do not mean:
- PartnerFI transaction settled;
- credit approved;
- insurance claim approved;
- provider fulfillment confirmed;
- legal/privacy adjudication completed;
- regulator approval granted;
- device action authorized.

## Explicit exclusions

This slice does not implement:
- Agent review authority;
- Partner Admin mutation authority;
- PartnerFI Reviewer, Auditor or Pilot Reviewer roles;
- external reviewer OIDC/SAML federation;
- arbitrary review-note storage;
- auto-correction acceptance;
- automatic resolution;
- live provider calls;
- posting, settlement or funds movement;
- real PII;
- insurer claim adjudication;
- regulatory/legal decision authority;
- D6 external packages;
- F11C persona switching;
- F11D/E portal UX convergence.

## Validation expectations

Required tests include:
- all allowed lifecycle transitions;
- disallowed shortcuts;
- external-authority local-resolve denial;
- external-response evidence existence/scope/limitation requirement;
- invented and cross-PartnerFI external-response evidence denial;
- deterministic return authority owner;
- claim/unclaim assignment behavior;
- append-only event history;
- complete allowed/forbidden transition matrix;
- schema-valid semantic history corruption rejection;
- restart durability;
- CAS stale-write rejection;
- immediate and delayed idempotent replay with explicit original-result/current-state revisions;
- idempotency conflict;
- raw-key non-persistence;
- Supervisor/Operations role boundaries;
- Partner Admin read-only denial;
- Agent denial;
- PartnerFI/Hub/tenant isolation;
- CSRF denial before mutation;
- bounded Human Review audit events;
- all negative authority flags.

## Next dependency

After this slice is merged and CI is green, the next default master-plan gate is **F11C — server-governed synthetic persona control**, followed by F11D/E portal convergence. Human Review UI mutation controls should be integrated during the portal-convergence work without changing the server authority model established here.
