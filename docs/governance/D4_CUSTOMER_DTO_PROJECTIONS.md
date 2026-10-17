# D4 Strict Customer DTO Projections — Phase 3B

## Status

`TARGET_STAGE4_INTERNAL` projection-contract foundation only.

This slice implements strict role-safe customer projection schemas and pure projection functions. It does **not** yet replace the existing `/api/demo/customer` response because the current synthetic transaction API still uses the canonical internal customer UUID. Runtime migration requires an explicit opaque-reference compatibility design rather than silently breaking or weakening the existing workflow.

## Purpose

Authorization determines whether a request may reach a projection boundary. Projection determines which fields may cross that boundary. An authorization ALLOW never permits returning the raw `Customer` domain object.

The target projector deliberately excludes:

- canonical internal `customerId`;
- legacy `partnerCustomerId`;
- raw phone number;
- raw `identityReference`;
- KYC method/source details;
- internal created/updated timestamps;
- other partner identifiers.

## Role projections

### AGENT
Receives:
- opaque assignment reference supplied by authorized workflow context;
- masked phone if available;
- phone status;
- KYC status;
- bounded risk state.

The projector does not derive the assignment reference from the internal customer UUID.

### SUPERVISOR
Receives the same minimum identity/status projection under an opaque assigned-case reference. Cluster/escalation evidence belongs in separate scoped projections, not the core customer identity DTO.

### OPERATIONS
Receives only:
- `customerPiiAccess: BARRED`

No customer identity or decision-support fields are emitted.

### PARTNER_ADMIN
Receives:
- partner-scoped PPID supplied by the D2 privacy boundary;
- phone verification status;
- KYC status.

No raw phone, internal UUID or legacy partner customer ID is returned.

### PARTNERFI_REVIEWER
Receives:
- partner-scoped PPID;
- KYC status;
- explicit `PARTNERFI_DECISION_REQUIRED` authority boundary;
- `recommendationBinding=false`.

ARDI vectors/evidence packets are separate projections and are not fabricated by this customer identity projector.

### AUDITOR
Receives:
- an externally supplied evidence digest/reference;
- `piiIncluded=false`.

The projector does not derive a stable customer digest from raw identity fields, avoiding creation of another linkable identifier.

### PILOT_REVIEWER
Individual customer projection is rejected. Pilot review remains aggregate-only.

## Phone masking

A valid Ethiopian mobile MSISDN such as `+251911234567` is projected as `+251 9*** **67`. The raw value is never included in the DTO.

Masking is a presentation minimization control, not anonymization. The underlying phone remains PII.

## Current runtime boundary

The current synthetic demo API uses `customerId` as an internal transaction reference in existing tests and mutation requests. Replacing that field at the API boundary requires an opaque assignment/workflow-reference migration with replay/idempotency compatibility and regression tests.

Therefore this Phase 3B slice introduces the strict target DTOs first. Phase 3C must migrate selected API responses and requests deliberately; it must not simply delete `customerId` from one response while dependent APIs still require it.

## Authority boundary

These DTOs control data minimization only. They do not grant:

- financial authority;
- credit approval;
- settlement;
- insurance adjudication;
- provider activation;
- KYC core-system mutation;
- regulated processing authority.

## Next bounded work

1. introduce opaque synthetic workflow/assignment references for current customer API interactions;
2. migrate `/api/demo/customer` and lookup responses to strict current-role projections;
3. keep Operations direct customer access denied;
4. add direct-URL/API regression tests proving raw PII/internal UUIDs cannot leak;
5. later integrate target reviewer roles only after scoped session/runtime configuration exists.

All future work must preserve `syntheticOnly=true`, `etResidencyApproved=false` and `regulatedModeAllowed=false`.