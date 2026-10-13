# Capability-driven UI

## Purpose

Enawuga must not present one universal navigation menu or one institution-specific application to every user. The workspace is generated from authenticated partner membership, role, region/object scope, the Partner Service Catalog, Partner Capability Contract decisions, and current route/adapter availability.

The objective is a reusable UI framework in which a new licensed partner changes the available experience through governed configuration and certified adapters rather than partner-specific page forks.

## Platform rule

```text
Principal
+ active partner membership
+ role
+ region / agent-group / object scope
+ Partner Service Catalog
+ Partner Capability Contract
+ bounded route / adapter state
= Workspace Manifest
```

The Workspace Manifest controls presentation. The backend must still re-authorize every protected operation independently.

**UI hiding is not security.**

## Current implementation baseline

The partner-platform foundation now contains separate runtime layers for:

1. Partner Capability Contract;
2. heterogeneous Synthetic Reference Partners;
3. Partner Service Catalog;
4. governed Adapter Registry + Route Resolver.

The Stage 3 UI is truth-synced and grouped, but primary navigation is still largely authored statically. The next migration step is therefore not another bank-specific frontend. It is a policy-filtered workspace runtime that consumes the existing partner-platform layers.

Provider state must also remain layered:

```text
Environment registration
!= runtime executability
!= route activation
!= production authorization
!= PartnerFI settlement authority
```

For example, a TestBed or sandbox foundation may be registered while its payment route remains unmounted.

## Non-negotiable product definition

A new partner must be addable by configuring its organization, products/services, capabilities, memberships, scopes, policies, routes and certified adapter without rebuilding Agent Terminal, Farmer 360, Supervisor, Operations or the Enawuga core.

If a new institution requires `BankXAgentTerminal.tsx`, `BankXSupervisor.tsx` or institution-name conditionals throughout shared workflows, the architecture has failed.

A genuinely new reusable business capability may require new domain work. Once added, it becomes part of the shared platform rather than a permanent one-bank fork.

## Principal model required by the UI

The authenticated session should expose only a safe bounded principal view. Conceptually:

```json
{
  "userId": "user_syn_001",
  "activePartnerOrgId": "org_syn_alpha",
  "memberships": [
    {
      "partnerOrgId": "org_syn_alpha",
      "roles": ["AGENT"],
      "regionIds": ["region_syn_adama"],
      "agentGroupIds": ["group_syn_alpha_agents"]
    }
  ],
  "customerObjectIds": ["customer_ref_..."],
  "networkObjectIds": []
}
```

The client must never self-assert organization membership, privileged role, region, object scope, capability or route eligibility.

## Workspace Manifest

The backend returns a policy-filtered presentation manifest rather than the raw contract, catalog or registry.

Recommended shape:

```json
{
  "partnerOrgId": "org_syn_alpha",
  "role": "AGENT",
  "environment": "synthetic",
  "navigation": [
    { "id": "home", "label": "Home", "path": "/" },
    { "id": "customers", "label": "Customers", "path": "/kiosk" },
    { "id": "farmer360", "label": "Farmer 360", "path": "/farmer-360" },
    { "id": "requests", "label": "Requests", "path": "/queue" }
  ],
  "services": [
    {
      "serviceId": "svc_alpha_cash_in",
      "serviceType": "FINANCIAL_CASH_IN",
      "label": "Cash In",
      "implementationState": "IMPLEMENTED",
      "environmentState": "SYNTHETIC",
      "authorityState": "BOUNDED_SYNTHETIC",
      "actionState": "AVAILABLE"
    }
  ]
}
```

The manifest must not expose credentials, factories, secret references intended only for server composition, unrestricted internal routes or an unfiltered partner catalog.

## Service, capability, route and adapter remain separate

The UI must preserve the platform abstraction:

```text
Service
  -> required capability
  -> governed route
  -> registered adapter
  -> external partner/provider system
```

A service being published does not itself authorize the capability. A capability being granted does not itself make a route executable. An adapter being registered in sandbox/TestBed does not itself activate a payment route. Provider acceptance does not become PartnerFI settlement.

## Role-specific workspace model

### Agent

Primary flow:

```text
Home -> Customer lookup -> Farmer 360 -> Service -> Request / Offline Queue -> Evidence / Status
```

Typical modules when granted:

- Agent Terminal / customer lookup;
- Farmer 360;
- partner-published services;
- GhostSync / local request queue;
- local inventory/restock view where assigned;
- Agent Learning;
- readiness/device status.

An Agent does not receive provider credential configuration, partner contract administration, network-wide operations unless separately granted, provider activation controls, PartnerFI posting or settlement authority.

### Supervisor / Regional Operations

Typical modules when granted:

- regional overview;
- scoped agent/network health;
- NLC/LCI planning;
- Cash Fleet planning;
- FMCG/inventory planning;
- exceptions and escalations;
- read-only partner/service status relevant to assigned scope.

Until separately authorized, actions use planning/governance verbs such as `Review`, `Recommend`, `Escalate`, `Prepare` and `Simulate`, not live cash dispatch, settlement or PartnerFI posting verbs.

### Operations

Typical modules when granted:

- transaction/provider evidence;
- reconciliation;
- provider route/status monitoring;
- GhostSync operational exceptions;
- incident/evidence references;
- bounded provider-readiness status.

Operations does not automatically gain PartnerFI posting, partner administration or production provider activation.

### Partner Admin

Typical modules when granted:

- partner organization profile;
- service catalog configuration;
- capability/evidence view;
- route assignments;
- user/role/region membership administration where allowed;
- onboarding/certification status.

A Partner Admin cannot bypass central governance or certification gates by manipulating a client control.

### Governance Admin

Restricted governance responsibilities may include:

- stage/environment gates;
- evidence/certification review;
- capability activation approval;
- audit and suspension controls;
- architecture/operational policy.

This responsibility is separate from ordinary partner administration.

## Multi-role and multi-partner users

Do not union all permissions into one global menu.

Required behavior:

1. User enters/selects an active organization/workspace context.
2. Server validates that context against memberships.
3. Server generates a Workspace Manifest for that partner + role + region/object context.
4. Switching context generates a new manifest.
5. Cross-partner data and actions are removed from the new workspace and remain server-denied.

## Capability-state presentation

The UI should distinguish at least three dimensions:

```text
Software implementation state
Environment / data state
Authority / activation state
```

Recommended human-readable labels include:

- `Implemented · Synthetic data`
- `Sandbox integrated`
- `TestBed integrated`
- `Foundation implemented · route activation gated`
- `Partner authorization required`
- `Future capability`
- `Suspended`

Do not use `Synthetic Demo` as a universal label for both working software and future concepts.

### Provider examples

The provider UI should be able to truthfully represent states such as:

```text
ArifPay
Environment: Sandbox
Adapter: executable when guarded sandbox runtime is configured
Route: bounded sandbox
Settlement: not PartnerFI settlement

Telebirr direct
Environment: TestBed
Adapter registration: TestBed foundation
Runtime mode: foundation only
Payment route: not mounted until remaining TestBed gates pass
Production: not authorized

M-PESA Ethiopia direct
Environment: Sandbox
Adapter registration: sandbox foundation
Runtime mode: foundation only
Payment route: not mounted until payment/callback/status gates pass
Production: not authorized
```

The frontend must not collapse these into a single enabled/disabled boolean.

## Service action rendering

Reusable workflow templates render from the policy-filtered Partner Service Catalog manifest.

Synthetic PartnerFI Alpha Agent may receive:

```text
Account Lookup | Cash In | Cash Out
```

Synthetic PartnerFI Beta Agent may receive:

```text
Account Lookup | Savings Inquiry | Service Request
```

The same application and workflow component library must render both.

No `AlphaAgentPage.tsx` and no `BetaAgentPage.tsx`.

## Hidden versus gated behavior

### Hide

Hide a service/module when the user has no legitimate reason to know it exists, including cross-partner capabilities, out-of-scope regional functions and admin-only functions.

### Show gated

Show a gated capability where operational transparency is useful to an authorized user, for example:

```text
M-PESA direct C2B
Sandbox foundation available
Payment route not activated
```

The gated state may explain the missing class of evidence/gate but must not expose credentials or sensitive configuration.

## Ardi placement

Ardi should not be treated as a universal top-level engine for every role.

Preferred placement:

- Farmer 360: transparent service-scenario arithmetic where relevant;
- Supervisor / Network Liquidity: NLC/LCI scenario arithmetic;
- future domain analytics: embedded explainable decision-support components.

Users should encounter the governed domain decision-support function, not a generic engine detached from responsibility context.

## Server-side authorization

Every protected operation must independently validate the applicable controls, including:

- authenticated session;
- active partner membership;
- role/action permission;
- customer/network object scope;
- region/agent-group scope;
- service publication;
- required capability grant;
- route/adapter/environment state for external calls;
- CSRF/replay/idempotency controls where applicable.

Direct URL navigation or a forged request must not expand authority.

The Workspace Manifest is therefore presentation policy output, not an authorization token.

## Frontend route strategy

Do not duplicate route families by partner. Keep reusable product routes such as:

```text
/agent
/customer/:ref
/supervisor
/operations
/partners
/liquidity
/cash-fleet
/fmcg
```

Partner/service context is data. Institution names must not become route families or page filenames.

Legacy route aliases may remain during migration, but primary navigation should become manifest-driven.

## Implementation sequence

1. Add a bounded workspace-manifest runtime consuming the merged Capability Contract, Service Catalog and Adapter Registry.
2. Add partner membership/active-workspace context to the synthetic presentation principal without weakening existing server authorization.
3. Render primary navigation from the Workspace Manifest.
4. Convert Agent service actions to catalog-driven rendering.
5. Add Supervisor and Operations manifests from the same generator.
6. Add Partner Admin presentation scope without allowing client-side gate bypass.
7. Move Ardi out of universal navigation and embed domain-specific decision support where appropriate.
8. Keep direct routes fail-closed where server authorization does not allow them.
9. Add cross-role, cross-partner and manual-URL negative E2E coverage.

## Required acceptance matrix

### Alpha Agent

- sees Alpha account/cash services allowed by its catalog/contract;
- does not see Beta services;
- does not see Partner Admin/provider configuration;
- direct protected navigation/action attempts remain denied.

### Beta Agent

- does not see Alpha cash-in/cash-out;
- sees Beta savings/service-request actions;
- uses the same reusable Agent workspace component.

### Alpha Supervisor

- sees only scoped network planning modules supported by grants;
- cannot activate providers, dispatch live cash or perform PartnerFI settlement.

### Operations user

- sees provider/reconciliation evidence appropriate to its role;
- cannot access customer/network objects outside scope;
- cannot mutate partner contracts merely because it can reconcile provider evidence.

### Partner Admin

- sees partner/catalog/capability configuration appropriate to its organization;
- cannot bypass governance/certification/production gates.

### Provider foundation states

- Telebirr can display as TestBed foundation without an active direct payment route;
- M-PESA Ethiopia can display as sandbox foundation without an active direct payment route;
- ArifPay sandbox route appears only when its guarded executable sandbox runtime is configured;
- no state implies production or PartnerFI settlement authority.

### Cross-partner negative cases

- Alpha user cannot access Beta service/customer objects;
- equal role names across organizations do not grant cross-org access;
- manually changing the URL does not expand authorization;
- stale workspace state is discarded after partner-context switch.

## Accessibility and field constraints

Capability-driven rendering must preserve:

- keyboard navigation;
- textual status labels rather than color-only status;
- responsive/mobile layouts used by field agents;
- low-bandwidth/static-first behavior where practical;
- no dependency on external analytics/telemetry for core navigation;
- clear distinction between unavailable, gated and unauthorized actions.

## Definition of Done

The capability-driven UI workstream is complete only when:

- primary navigation is generated from a server-resolved Workspace Manifest;
- at least two synthetic PartnerFIs produce materially different Agent workspaces through the same reusable UI code;
- Supervisor, Operations and Partner Admin manifests differ by responsibility;
- service actions originate from partner catalog/capability policy rather than institution-name branches;
- direct-route/action attempts remain server-denied when membership/capability/object scope is absent;
- capability-state language separates implementation, environment and authority;
- provider foundation registration is not confused with payment-route activation;
- no partner-specific page forks are required for existing workflow types;
- automated tests cover positive and negative partner/role cases.

## Out of scope

- real partner SSO/IdP;
- production user provisioning;
- production service activation;
- arbitrary partner-provided UI scripts/components;
- relaxing PartnerFI/provider authority boundaries.
