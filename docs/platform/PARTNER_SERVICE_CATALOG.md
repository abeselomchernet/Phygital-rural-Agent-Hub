# Partner Service Catalog

## Purpose

The Partner Service Catalog is the machine-readable list of products/actions a partner makes available through Enawuga. It bridges a partner's business offering to reusable Enawuga workflows without institution-specific page forks.

A service is not a capability, route or adapter:

```text
Service -> requires capability -> governed route -> reviewed adapter
```

Example:

```text
Cash-in request
  -> FIN.CASH_IN_AUTHORIZE
  -> route_syn_partnerfi_alpha_core
  -> adapter_syn_partnerfi_alpha_v1
```

The UI consumes policy-filtered service definitions. Server authorization remains authoritative on every action.

## Core principles

1. Services are partner-owned offerings.
2. Services reference provider-neutral capability IDs from the Partner Capability Contract.
3. Routes and adapters remain separate, versioned and provenance-visible.
4. Membership, role, region, agent-group, object/data scope, service publication and capability policy must all permit use.
5. Service publication never creates capability authority.
6. A new partner using an existing service/workflow type should normally require configuration plus a certified adapter, not core UI edits.
7. Unknown service semantics require domain review rather than arbitrary JSON extension.
8. Removing or suspending a service removes it from new workspaces without deleting historical evidence.

## Catalog schema

Recommended logical structure:

```yaml
schemaVersion: 1
catalogVersion: 1
partnerOrgId: org_syn_partnerfi_alpha
environment: synthetic
lifecycleState: PUBLISHED_SYNTHETIC
services:
  - serviceId: svc_alpha_cash_in
    serviceType: FINANCIAL_CASH_IN
    display:
      name: Cash In
      shortDescription: Prepare a PartnerFI cash-in authorization request
      category: Financial services
      iconKey: cash-in
    roles: [AGENT]
    regions: [region_syn_adama, region_syn_arisi]
    agentGroups: [group_syn_alpha_agents]
    requiredCapabilities: [FIN.CASH_IN_AUTHORIZE]
    routePolicy:
      mode: EXPLICIT
      routeIds: [route_syn_partnerfi_alpha_core]
    dataRequirements:
      inputClasses: [CUSTOMER_REFERENCE, TRANSACTION_INTENT]
      outputClasses: [TRANSACTION_STATUS]
    offlinePolicy: CAPTURE_INTENT_ONLY
    workflowTemplate: CASH_SERVICE_REQUEST_V1
    activation:
      effectiveAt: null
      expiresAt: null
      evidenceRefs: [EV-SYN-ALPHA-V1]
```

## Required fields

### Catalog identity

- `schemaVersion`
- `catalogVersion`
- `partnerOrgId`
- `environment`
- `lifecycleState`

### Service identity

- `serviceId`
- `serviceType`
- presentation metadata
- reusable `workflowTemplate`

### Availability scope

Each service declares:

- roles;
- region IDs;
- optional agent-group IDs;
- effective/expiry timestamps where needed.

The catalog does not replace principal/object authorization. A service can be visible only after catalog and capability-contract scopes intersect successfully.

### Capability requirements

A service lists one or more required provider-neutral capability IDs. Every required capability must exist in the partner's contract and pass the policy evaluator before the service is actionable.

A catalog cannot invent capability IDs.

### Route policy

Initial route-policy modes:

- `EXPLICIT` — one approved route;
- `PRIORITY_ORDER` — ordered approved routes, subject to the no-silent-fallback rule after ambiguous external mutation;
- `READ_ONLY_AGGREGATE` — no external mutation route.

For financial mutations, automatic cross-provider retry/fallback is prohibited after an ambiguous external outcome unless the external contract and idempotency model prove duplicate execution cannot occur.

### Data requirements

The service declares only the data classes needed by the workflow. Runtime policy intersects service requirements with the capability grant's permitted data classes.

A service requesting a data class not authorized by its capability grant must fail closed.

### Offline policy

Catalog values align exactly to the Partner Capability Contract runtime:

- `DENY_OFFLINE`
- `READ_CACHED_REFERENCE_ONLY`
- `CAPTURE_INTENT_ONLY`
- `LOCAL_SIMULATION_ONLY`

Offline capture never upgrades provider acceptance, authorization, PartnerFI posting or settlement state.

### Workflow template

The catalog points to Enawuga-owned reusable workflow templates. Initial examples:

```text
CUSTOMER_LOOKUP_V1
CASH_SERVICE_REQUEST_V1
SAVINGS_INQUIRY_V1
SERVICE_REQUEST_V1
C2B_PAYMENT_REQUEST_V1
PAYMENT_STATUS_V1
IDENTITY_VERIFY_V1
FMCG_CATALOG_V1
FMCG_INVENTORY_V1
FMCG_RESTOCK_PLAN_V1
FLEET_ROUTE_PLANNING_V1
NLC_READ_V1
SMS_REQUEST_V1
```

Partners may configure labels, scopes, capability requirements and route mappings. They cannot inject executable client code or replace governed state transitions.

## Initial service-type taxonomy

### Financial institution

- `FINANCIAL_ACCOUNT_LOOKUP`
- `FINANCIAL_CASH_IN`
- `FINANCIAL_CASH_OUT`
- `FINANCIAL_SAVINGS_INQUIRY`
- `FINANCIAL_SERVICE_REQUEST`

### Payments

- `PAYMENT_C2B`
- `PAYMENT_STATUS`

### Identity

- `IDENTITY_ONBOARD_VERIFY`

`IDENTITY_REVERIFY` is a future service type unless/until a matching provider-neutral capability is added through domain review.

### FMCG / logistics

- `FMCG_CATALOG_VIEW`
- `FMCG_INVENTORY_VIEW`
- `FMCG_RESTOCK_DRAFT`
- `FLEET_ROUTE_PLANNING`

Dispatch and cash handover are not exposed as active service types while their capability grants remain disabled.

### Network operations

- `NETWORK_LIQUIDITY_READ`

Planning or mutation-oriented network operations require separately governed capability support.

### Communications

- `COMMUNICATIONS_SMS_REQUEST`

## Synthetic reference catalogs

The first implementation must prove heterogeneity through the merged reference organizations.

### Synthetic PartnerFI Alpha

Publishes:

- Account Lookup
- Cash In
- Cash Out
- NLC/LCI read-only view for Supervisor

Regions: Adama and Arisi.

### Synthetic PartnerFI Beta

Publishes:

- Account Lookup
- Savings Inquiry
- Savings Service Request

Region: Adama only.

It publishes no cash-in/cash-out service. If the generated Agent workspace still exposes cash controls for Beta, the abstraction has failed.

### Other reference partners

Gateway Gamma, Mobile Money Delta, Identity Epsilon, FMCG Zeta, Fleet Eta and Telco Theta publish only the service types supported by their current synthetic capability grants. Disabled grants may be represented as readiness/evidence state but must not become actionable services.

## Policy-filtered workspace manifest

The backend should expose an authenticated, filtered manifest rather than sending the complete raw catalog to every user.

Conceptual response:

```json
{
  "partnerOrgId": "org_syn_partnerfi_alpha",
  "catalogVersion": 1,
  "role": "AGENT",
  "regionId": "region_syn_adama",
  "services": [
    {
      "serviceId": "svc_alpha_cash_in",
      "serviceType": "FINANCIAL_CASH_IN",
      "name": "Cash In",
      "workflowTemplate": "CASH_SERVICE_REQUEST_V1",
      "actionState": "AVAILABLE_SYNTHETIC"
    }
  ]
}
```

The manifest is presentation/discovery evidence, not authorization. Every subsequent operation re-runs server-side capability authorization.

## Catalog lifecycle

Target states:

- `DRAFT`
- `PUBLISHED_SYNTHETIC`
- `PUBLISHED_SANDBOX`
- `PUBLISHED_TESTBED`
- `PUBLISHED_STAGING`
- `AUTHORIZED`
- `SUSPENDED`
- `RETIRED`

Current runtime gates must reject staging/authorized actionability until governance explicitly permits those environments.

## Versioning and audit

Catalogs are immutable by version for execution/audit purposes. Material changes to capability requirements, route policy, data scope, workflow type, role/region scope or lifecycle state create a new catalog version.

Every resulting request/audit event should be able to reconstruct:

```text
serviceId + catalogVersion
partnerOrgId + partnerContractVersion
capabilityId + grantId
routeId + adapterId/version
resulting authority/status state
```

## Migration from current UI

1. Keep current product surfaces operational.
2. Introduce strict catalog schema and catalog evaluator.
3. Publish Alpha and Beta catalogs from the same runtime model.
4. Add policy-filtered workspace-manifest generation.
5. In the dedicated capability-driven UI workstream, replace hard-coded service cards/navigation with manifest-backed rendering.
6. Preserve server-side authorization on every action.
7. Migrate Supervisor/Operations surfaces incrementally using the same service/capability vocabulary.

## Acceptance criteria

Implementation is complete only when:

- the catalog uses a strict schema with no executable content or secret fields;
- every service belongs to the catalog partner and references known contract capability IDs;
- route IDs must be explicitly permitted by the relevant capability grants;
- service data requirements are a subset of capability-grant data permissions;
- service roles, regions and agent groups cannot exceed contract/grant scopes;
- offline policy cannot be more permissive than the capability grant;
- Alpha and Beta publish materially different catalogs through the same code;
- Beta cannot acquire Alpha cash services merely by sharing the `AGENT` role;
- suspending/removing a service removes it from new manifests without erasing historical records;
- catalog version and route/capability provenance are available for downstream audit;
- later capability-driven UI can change the workspace solely from partner/catalog/context data, with no `AlphaAgentPage` / `BetaAgentPage` forks.

## Out of scope

- real partner pricing or product terms;
- real credit underwriting or approval;
- production settlement or PartnerFI posting;
- arbitrary third-party UI code/scripts;
- provider credential storage;
- runtime Adapter Registry implementation (separate workstream);
- final capability-driven UI implementation (separate workstream).
