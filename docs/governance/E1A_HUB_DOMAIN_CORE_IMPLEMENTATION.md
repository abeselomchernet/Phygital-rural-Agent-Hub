# E1A Hub Aggregate & Scope — implementation evidence

**Date:** 2026-10-15
**Status:** IMPLEMENTED ON STACKED REVIEW BRANCH / NOT MERGED / NOT CURRENT PRODUCTION CAPABILITY
**Branch:** `feat/e1a-hub-domain-core`
**Parent review:** PR #44, head `934071a855629cc9f43653ad45a8013eb64d4898`

## Purpose

Implement the first bounded workstream of `E1_HUB_DOMAIN_CORE` without widening Stage 4 or promoting historical Sovereign Core screens into current Enawuga capability.

This change creates a first-class synthetic Hub aggregate and server-enforced Hub scope. It remains a synthetic software proof only.

## Implemented domain boundary

`src/domain/hub.ts` defines strict schemas for:

- `Hub`
- `HubOperator`
- `HubDevice`
- `HubPartnerMembership`
- Hub lifecycle state
- Hub access purpose
- Hub access context

The fixtures include:

- one shared synthetic Adama Hub with independently scoped PartnerFI Alpha and PartnerFI Beta membership;
- one planned synthetic Arisi Hub;
- one separate denial-tenant Hub used only for negative isolation tests.

Every Hub is explicitly synthetic. Every device has `controlEnabled: false` and `providerCommandEnabled: false`. Every partner membership has `regulatedAuthorityGranted: false`.

## Authorization contract

Hub access is evaluated server-side across all applicable dimensions:

`tenant -> region -> Hub assignment -> partner membership -> role -> purpose -> operator assignment`

A client-visible page, Hub ID, workspace selection or partner membership is not authorization by itself.

The allowed synthetic purposes are:

- `HUB_VIEW`
- `HUB_OPERATE`
- `HUB_SUPERVISE`
- `HUB_PARTNER_REVIEW`
- `HUB_ADMINISTER`

Role/purpose compatibility and explicit operator assignment must both pass. Malformed, unknown, cross-tenant, cross-region and unassigned Hub references all fail through the same Hub-access denial path rather than revealing protected-resource existence.

## Session and API integration

The existing synthetic workspace context now carries:

- synthetic tenant ID;
- Hub assignments;
- Hub purpose scopes;
- existing partner, region, agent-group, service and object scopes.

The existing server-side synthetic session remains the authority source. A new protected read endpoint is available inside the existing `/api/demo` session boundary:

`GET /api/demo/hubs/:hubId?purpose=<purpose>`

The default purpose is `HUB_VIEW`.

Authorized responses are role-safe projections. They contain only the requesting partner's Hub membership and operator assignment. Device assignment references are exposed only when they refer to the current authorized operator assignment.

## Explicit non-capabilities

E1A does not add or authorize:

- real customer PII;
- real funds or cash movement;
- PartnerFI posting or settlement;
- Telebirr or M-PESA payment activation;
- provider credentials or provider calls;
- production authentication;
- live identity-provider access;
- device control, firmware or provider commands;
- Hub persistence or public Hub administration;
- regulated pilot or production deployment.

Wishland remains the technology/orchestration provider. Licensed institutions retain regulated authority within their approved scope.

## Validation evidence

### Parent archaeology/review gate

PR #44 exact-head GitHub Actions validation succeeded on `934071a855629cc9f43653ad45a8013eb64d4898` in run #362 (`38651795666`).

### E1A focused validation

Focused Hub domain/API suite:

- 8 tests
- 8 passed
- 0 failed

Covered cases include shared-Hub partner isolation, role-safe projection, tenant/region/assignment denial, purpose gating, privileged-role assignment checks, disabled device-control authority and no-existence-leakage denial behavior.

### TypeScript and build

- `npm run lint` (`tsc --noEmit`): PASS
- `npm run build`: PASS
- `git diff --check`: PASS

### Repository-wide local Windows control

The E1A worktree repository-wide run completed 255 tests with 248 passes and 7 failures. All seven failures were persistence/fsync failures in M-PESA/Telebirr tests outside the Hub change.

A control run of the same affected persistence test files against the untouched PR #44 parent commit on the same Windows host reproduced the same result: 31 tests, 24 passes, 7 failures, including `EPERM: operation not permitted, fsync` and the dependent payment-attempt persistence failure.

Therefore these seven local failures are baseline/host-specific and are not attributed to E1A. They are not being modified or suppressed in this workstream. Linux CI remains the authoritative full-suite gate when this stacked branch is retargeted to `main`.

## Review/merge gate

This implementation is intentionally stacked on PR #44 so archaeology/governance and implementation remain separately reviewable.

Until the parent review is merged and this implementation passes the normal Linux PR workflow against `main`, E1A must remain review-branch evidence rather than merged/current capability evidence.
