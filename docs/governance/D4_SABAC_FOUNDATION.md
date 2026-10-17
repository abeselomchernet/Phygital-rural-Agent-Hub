# D4 Scoped Authorization (S-ABAC) Foundation — Phase 3A

## Status

`TARGET_STAGE4_INTERNAL` authorization-foundation only.

This slice implements the Wave-D seven-role target vocabulary and a fail-closed scoped authorization evaluator. It composes the Phase 2A `DATA_ACCESS_BASIS_GATE` for customer-specific access but does not replace the current four-role HTTP session implementation yet.

## Seven target roles

### Field & Fleet
- `AGENT`
- `SUPERVISOR`
- `OPERATIONS`

### Partner Boundary
- `PARTNER_ADMIN`
- `PARTNERFI_REVIEWER`

### Independent Trust
- `AUDITOR`
- `PILOT_REVIEWER`

No role creates regulated or financial authority.

## S-ABAC evaluation order

The bounded evaluator checks:

1. role + verb;
2. tenant;
3. partner membership;
4. Hub;
5. region;
6. service;
7. capability;
8. data class;
9. purpose;
10. static role/data-class policy;
11. for customer-specific access, `DATA_ACCESS_BASIS_GATE`.

The Wave-D conceptual six scope dimensions remain intact: tenant, partner, Hub/region, service/capability, data/evidence class and purpose, followed by the seventh data-access-basis predicate. The implementation expands composite dimensions into explicit checks so failures are auditable.

An ALLOW result from the basis gate cannot override any earlier DENY.

## Verb boundary

The initial internal vocabulary is:

- `READ`
- `CAPTURE`
- `REVIEW`
- `ADMINISTER`

Independent-trust roles are read-only in this foundation. `ADMINISTER` is an Enawuga configuration/governance verb and never means financial posting, settlement, provider activation, credit approval, insurance adjudication or regulator authority.

## Data-class boundary

Customer-specific data classes are inherited from the D2 basis gate:

- `PROFILE`
- `CONTACT`
- `SERVICE_HISTORY`
- `EVIDENCE`
- `DECISION_SUPPORT`

D4 additionally introduces `AGGREGATE` as a non-customer-specific projection class. Aggregate requests cannot carry a customer subject or basis ID.

Role restrictions remain deliberately conservative:

- `OPERATIONS` cannot access customer PROFILE, CONTACT or DECISION_SUPPORT data;
- `PARTNERFI_REVIEWER` is limited to EVIDENCE and DECISION_SUPPORT in this foundation;
- `AUDITOR` customer-specific access is limited to EVIDENCE and still requires a basis gate;
- `PILOT_REVIEWER` receives AGGREGATE only and cannot make customer-specific requests.

Strict DTO projection remains a separate Phase 3B implementation requirement. An authorization ALLOW does not mean raw domain objects may be returned.

## Authority flags

Every authorization result hard-codes:

- `financialAuthorityGranted=false`
- `creditApprovalAuthorityGranted=false`
- `settlementAuthorityGranted=false`
- `insuranceAdjudicationAuthorityGranted=false`
- `regulatedAuthorityGranted=false`

A PartnerFI reviewer may receive a bounded non-binding decision-support projection, but `PARTNERFI_DECISION_REQUIRED` remains the external authority boundary.

## Current-runtime boundary

The existing `SyntheticAuthService` remains the current four-role Stage-4 demo session implementation. This PR does not add external reviewer accounts, OIDC, new UI routes, new navigation, or new customer API exposure.

The target seven-role evaluator is introduced separately so it can be certified before runtime integration. A later Phase 3 slice must explicitly map authenticated sessions to target roles/scopes and retain server-side direct-URL enforcement.

## Not implemented here

- OIDC or external identity federation;
- production reviewer identities;
- automatic mapping of IdP roles/claims;
- strict role DTO schemas;
- customer API migration away from generic domain-object cloning;
- persistent authorization-policy administration;
- live legal/privacy policy;
- provider activation;
- financial posting/settlement;
- credit or insurance decision authority.

## Next bounded D4 slices

1. Phase 3B — strict customer/evidence DTO projection schemas for current and target roles;
2. Phase 3C — integrate scoped authorization into bounded synthetic API endpoints without enabling external identities;
3. Phase 3D — add audit-safe authorization decision events and direct-URL regression tests;
4. future OIDC/federation only after partner/security configuration is externally available.

All future work must preserve `syntheticOnly=true`, `etResidencyApproved=false` and `regulatedModeAllowed=false`.