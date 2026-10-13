# Partner Service Catalog

## Purpose

The Partner Service Catalog is the machine-readable list of products/actions a partner makes available through Enawuga. It is the bridge between a partner's business offering and Enawuga's reusable workflows.

A service is not the same thing as a capability, route or adapter:

```text
Service -> requires capability -> resolved to governed route -> executed by adapter
```

Example:

```text
Cash-in request
  -> FIN.CASH_IN_AUTHORIZE
  -> route_partnerfi_alpha_mock
  -> MockPartnerFI adapter
```

The UI should render services from this catalog rather than hard-coding institution-specific pages.

## Core principles

1. Services are partner-owned offerings.
2. Services reference provider-neutral capabilities.
3. Routes are selected separately and remain provenance-visible.
4. A service can be visible only where membership, role, region, environment and capability grants all allow it.
5. Service publication does not create capability authority.
6. A new partner using an existing service type should normally require configuration, not core UI edits.

## Service schema

Recommended logical structure:

```yaml
serviceId: svc_alpha_cash_in
catalogVersion: 1
partnerOrgId: org_syn_alpha
serviceType: FINANCIAL_CASH_IN
display:
  name: Cash In
  shortDescription: Prepare a PartnerFI cash-in authorization request
  category: Financial services
status: PUBLISHED_SYNTHETIC
environment: synthetic
roles: [AGENT]
regions: [region_syn_adama, region_syn_arisi]
agentGroups: [group_syn_alpha_agents]
requiredCapabilities:
  - FIN.CASH_IN_AUTHORIZE
allowedRoutePolicy:
  mode: EXPLICIT
  routeIds: [route_mock_partnerfi_alpha]
dataRequirements:
  inputClasses: [CUSTOMER_REFERENCE, TRANSACTION_INTENT]
  outputClasses: [TRANSACTION_STATUS]
offlinePolicy: CAPTURE_INTENT_ONLY
workflowTemplate: CASH_SERVICE_REQUEST_V1
evidenceRefs: [EV-SYN-ALPHA-CASHIN]
```

## Required fields

### Identity

- `serviceId`
- `catalogVersion`
- `partnerOrgId`
- `serviceType`

### Presentation metadata

- display name;
- short description;
- category;
- optional localized labels;
- optional icon key from an approved internal set.

Presentation metadata must not be able to inject executable code or arbitrary HTML.

### Availability scope

- environment;
- role assignments;
- region IDs;
- agent group IDs where applicable;
- effective/expiry dates if partner policy requires them.

### Capability requirements

A service lists one or more required capability IDs. All mandatory requirements must pass policy evaluation before the service is actionable.

### Route policy

Route choice must be explicit and auditable. Supported policies should begin conservatively:

- `EXPLICIT` — one or more approved route IDs;
- `PRIORITY_ORDER` — ordered approved routes, with no silent cross-provider fallback after an ambiguous external mutation;
- `READ_ONLY_AGGREGATE` — no external mutation route.

Automatic route fallback for financial mutations is forbidden unless the contract proves it cannot duplicate execution.

### Data requirements

The service declares only the data classes required for its workflow. Runtime policy must intersect service requirements with the partner's approved data scope.

### Offline policy

Initial allowed values:

- `NOT_AVAILABLE_OFFLINE`
- `READ_CACHED_SYNTHETIC_ONLY`
- `CAPTURE_INTENT_ONLY`
- `QUEUE_NON_FINANCIAL_DRAFT`

Offline capture never upgrades authorization or settlement state.

### Workflow template

The service points to an Enawuga-owned reusable workflow template, for example:

```text
CUSTOMER_LOOKUP_V1
CASH_SERVICE_REQUEST_V1
SAVINGS_INQUIRY_V1
SERVICE_REQUEST_V1
C2B_PAYMENT_REQUEST_V1
FMCG_RESTOCK_PLAN_V1
NLC_PLANNING_V1
```

A partner may configure labels, required capabilities and mappings but cannot replace core state-transition safety with arbitrary client-side workflow code.

## Service type taxonomy

Initial target taxonomy should be small and domain-oriented:

### Financial institution services

- `FINANCIAL_ACCOUNT_LOOKUP`
- `FINANCIAL_CASH_IN`
- `FINANCIAL_CASH_OUT`
- `FINANCIAL_SAVINGS_INQUIRY`
- `FINANCIAL_SERVICE_REQUEST`

### Payment services

- `PAYMENT_C2B`
- `PAYMENT_STATUS`

### Identity services

- `IDENTITY_ONBOARDING`
- `IDENTITY_REVERIFICATION`

### FMCG/logistics services

- `FMCG_CATALOG_VIEW`
- `FMCG_RESTOCK_DRAFT`
- `FLEET_ROUTE_PLANNING`

### Network operations services

- `NETWORK_LIQUIDITY_READ`
- `NETWORK_LIQUIDITY_PLAN`
- `PROVIDER_RECONCILIATION`

New service types require domain review. A partner should not create arbitrary service semantics merely by adding JSON.

## Example: two PartnerFIs, same UI framework

### PartnerFI Alpha

Publishes:

- Account Lookup
- Cash In
- Cash Out

### PartnerFI Beta

Publishes:

- Account Lookup
- Savings Inquiry
- Savings Service Request

The Agent workspace uses the same components/workflow templates, but the generated menu/action set differs because the catalog differs.

No files such as `AlphaAgentPage.tsx` or `BetaAgentPage.tsx` should be required.

## Service discovery API target

The backend should ultimately expose an authenticated, policy-filtered manifest rather than returning the entire raw catalog to every user.

Example conceptual response:

```json
{
  "partnerOrgId": "org_syn_alpha",
  "role": "AGENT",
  "regionId": "region_syn_adama",
  "services": [
    {
      "serviceId": "svc_alpha_cash_in",
      "serviceType": "FINANCIAL_CASH_IN",
      "name": "Cash In",
      "actionState": "AVAILABLE_SYNTHETIC"
    }
  ]
}
```

The manifest is a presentation aid. Every subsequent API request still re-runs authorization.

## Service lifecycle

Recommended states:

- `DRAFT`
- `PUBLISHED_SYNTHETIC`
- `PUBLISHED_SANDBOX`
- `PUBLISHED_STAGING`
- `AUTHORIZED`
- `SUSPENDED`
- `RETIRED`

The current stage must reject live/authorized use until governance permits it.

## Versioning

Catalog entries are versioned. Material changes such as capability requirements, route policy, data scope or workflow type create a new catalog version.

Transactions/audit events should record `serviceId` + `catalogVersion` so historical execution can be reconstructed.

## Relationship to route provenance

Every actionable service result must be able to answer:

```text
What service did the user request?
Which partner published it?
Which capability authorized it?
Which route was selected?
Which adapter executed/read the provider contract?
What authority state resulted?
```

This chain is mandatory for auditability and truthful UI claims.

## Migration from current UI

1. Keep current presentation pages operational.
2. Convert hard-coded service cards into catalog-backed definitions one workflow at a time.
3. Begin with two synthetic PartnerFIs.
4. Add policy-filtered workspace manifest.
5. Move primary Agent actions to catalog-driven rendering.
6. Preserve direct route links for Supervisor/Operations where needed, but generate them from scoped services/capabilities over time.

## Acceptance criteria for implementation

- Strict schema with no executable content.
- Services cannot reference unknown capabilities/routes.
- Two synthetic PartnerFIs publish materially different catalogs.
- Agent UI changes from catalog data without institution-specific component forks.
- Region/role restrictions are enforced server-side.
- Service data requirements are intersected with partner data permissions.
- Offline policy is explicit per service.
- Route provenance and catalog version are attached to resulting intents/audit records.
- Removing/suspending a service removes it from the workspace manifest without deleting historical records.

## Out of scope

- Partner pricing/fees unless separately governed.
- Real product terms.
- Credit underwriting/approval.
- Production settlement.
- Arbitrary third-party UI code or scripts.
