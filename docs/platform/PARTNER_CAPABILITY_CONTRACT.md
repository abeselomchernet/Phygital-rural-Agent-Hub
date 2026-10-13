# Partner Capability Contract

## Purpose

The Partner Capability Contract is the machine-readable governance boundary between the Enawuga core and every participating organization. It tells Enawuga what a partner is, what services/capabilities it may expose, where and to whom those capabilities apply, which integration routes may satisfy them, and what evidence is required before use.

This contract replaces hard-coded partner behavior. It does not itself activate a provider, confer regulated authority, or store production secrets.

## Design principles

1. Business service, capability/authority, route and adapter are separate concepts.
2. Every grant is scoped by organization, environment, role and object/region context.
3. Code presence never equals capability authorization.
4. UI decisions consume the same server-side policy result but never replace server authorization.
5. Contracts are versioned and immutable once approved; changes produce a new version.
6. Unknown capability IDs, adapter IDs, data classes or state transitions fail closed.
7. Production/staging-capable states may exist in the schema as target lifecycle values, but the current runtime must reject them unless the stage/environment gates explicitly allow them.

## Canonical concepts

### Partner organization

Stable legal/operational entity participating in Enawuga.

Recommended fields:

```yaml
partnerOrgId: org_01J...
contractVersion: 1
partnerClass: FINANCIAL_INSTITUTION
legalName: Synthetic PartnerFI Alpha
displayName: PartnerFI Alpha
environment: synthetic
lifecycleState: ACTIVE_SYNTHETIC
regions: [region_syn_adama]
evidenceRefs: [EV-SYN-ALPHA-001]
```

`partnerOrgId` is opaque and stable. It must not encode a legal name, environment or provider secret.

### Service

A user-facing product/action such as `cash-in-request`, `account-lookup`, `savings-inquiry`, `c2b-payment`, `fmcg-restock-planning` or `liquidity-planning`.

Services belong in the Partner Service Catalog, not directly in the adapter registry.

### Capability

A governed permission/ability required to perform or expose a service. Capability IDs are provider-neutral whenever possible.

Recommended namespace examples:

```text
FIN.ACCOUNT_LOOKUP
FIN.CASH_IN_AUTHORIZE
FIN.CASH_OUT_AUTHORIZE
PAY.C2B_CREATE
PAY.STATUS_QUERY
PAY.REVERSAL_REQUEST
IDV.ONBOARD_VERIFY
COMMS.SMS_SEND
FMCG.CATALOG_READ
FMCG.RESTOCK_DRAFT
FLEET.ROUTE_PLAN
FLEET.DISPATCH
FLEET.CASH_HANDOVER
LIQ.NLC_READ
LIQ.NLC_PLAN
```

Provider-specific protocol names such as `ARIFPAY_C2B` or `TELEBIRR_DIRECT_C2B` are routes/adapter capabilities, not the primary user/business authority vocabulary.

### Route

A governed path through which a capability is fulfilled.

Example:

```yaml
routeId: route_arifpay_sandbox_c2b
serviceProvider: arifpay
integrationMode: gateway
adapterId: adapter_arifpay_sandbox_v1
environment: sandbox
```

### Adapter

A reviewed software implementation of an external protocol contract. Registration does not authorize its use.

## Capability grant schema

Recommended logical shape:

```yaml
capabilityId: FIN.CASH_IN_AUTHORIZE
state: SIMULATION_ONLY
serviceIds: [svc_cash_in]
roles: [AGENT]
regions: [region_syn_adama]
agentGroups: [group_syn_alpha_agents]
dataClasses:
  - CUSTOMER_REFERENCE
  - TRANSACTION_INTENT
allowedRouteIds:
  - route_mock_partnerfi_alpha
constraints:
  currency: [ETB]
  maxAmountMinor: null
  offlinePolicy: CAPTURE_INTENT_ONLY
activation:
  effectiveAt: null
  expiresAt: null
  evidenceRefs: [EV-SYN-ALPHA-CASHIN]
```

Any numeric/business limit supplied here is a partner-owned policy constraint. Wishland must not invent live financial limits.

## Capability states

Target contract vocabulary:

- `DISABLED` — capability cannot be used.
- `SIMULATION_ONLY` — synthetic deterministic behavior only.
- `SANDBOX_BOUNDED` — external sandbox use allowed under bounded contract.
- `STAGING_BOUNDED` — governed non-production staging use allowed.
- `AUTHORIZED` — live/pilot/production authority exists under recorded evidence and current program stage.
- `SUSPENDED` — previously allowed capability is temporarily blocked.
- `EXPIRED` — approval/evidence is no longer effective.

The current Enawuga stage must fail closed for `STAGING_BOUNDED` or `AUTHORIZED` until the corresponding governance stage has been entered and all required evidence is present.

## Required organization scopes

Every principal/session evaluating partner capabilities should ultimately carry or resolve:

```text
userId
partnerOrgMemberships[]
roleAssignments[]
regionIds[]
agentGroupIds[]
customer/object scopes[]
service scopes[]
```

The current synthetic role-only session is a predecessor. Organization membership must become explicit before any multi-partner runtime.

## Authorization decision

A service/capability is usable only if all checks pass:

```text
authenticated principal
AND active partner membership
AND authorized role
AND object/customer scope
AND region/agent-group scope
AND service is published for this partner
AND required capability grant exists
AND grant state is allowed in current environment/stage
AND data scope is sufficient and not excessive
AND approved route exists
AND registered adapter supports the route/environment
AND required evidence is valid/not expired
AND server-side policy permits requested action
```

Any missing or unknown condition returns deny.

## Data-scope contract

Data classes must be typed, not arbitrary free text. Initial target vocabulary may include:

```text
CUSTOMER_REFERENCE
CUSTOMER_CONTACT_REFERENCE
IDENTITY_ATTESTATION_REFERENCE
TRANSACTION_INTENT
TRANSACTION_STATUS
PARTNER_ACCOUNT_REFERENCE
PARTNER_ACCOUNT_SUMMARY
LIQUIDITY_AGGREGATE
INVENTORY_AGGREGATE
RESTOCK_DRAFT
ROUTE_PLAN
AUDIT_REFERENCE
```

Sensitive identity artifacts, raw credentials and unrelated bank/customer data are not implied by a capability grant.

## Evidence and lifecycle

Every non-disabled grant carries evidence references appropriate to its state. Examples:

- contract/agreement reference;
- API specification version;
- sandbox certification report;
- data-processing/residency approval;
- security review;
- callback/authenticity contract;
- reconciliation/settlement semantics;
- operational RACI;
- approval effective/expiry dates.

Evidence references identify records; secrets themselves never appear in the contract.

## Versioning

Contract changes use immutable versions:

```text
org_abc / contract v1 -> superseded
org_abc / contract v2 -> active
```

A transaction or audit event records the contract version and route version used at decision time so later policy changes do not rewrite historical meaning.

## Migration from current Stage 3 model

Current `PartnerOrganizationSchema` should not be deleted immediately. Migration should be additive:

1. Introduce a versioned provider-neutral capability contract alongside current fixtures.
2. Map current Stage 3 capability switches to the new vocabulary.
3. Preserve current provider-specific route identifiers as route records.
4. Move `ARIFPAY_C2B`, `TELEBIRR_DIRECT_C2B` and `MPESA_ETHIOPIA_DIRECT_C2B` out of the generic business-capability layer over time.
5. Add explicit organization membership to the auth principal before capability-driven UI is enabled.
6. Keep current hard gates and fail-closed environment rules during migration.

## Acceptance criteria for implementation PR

- Zod/JSON-schema-equivalent strict machine-readable contract.
- Unknown keys rejected unless explicitly versioned extension points exist.
- Two different synthetic PartnerFIs can express different grants without code branches.
- Business capability IDs are independent from route/adapter IDs.
- Contract version is carried into policy decisions/audit events.
- No secret values accepted in the contract.
- `AUTHORIZED` cannot become usable under the current stage merely by configuration.
- Negative tests prove missing membership, role, region, service, route, evidence or capability all deny access.

## Out of scope

- Real institution onboarding.
- Production credentials.
- Real customer data.
- Live PartnerFI posting/settlement.
- Cash custody/movement.
- Dynamic loading of untrusted third-party executable code.
