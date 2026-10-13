# Capability-driven UI

## Purpose

Enawuga should not present one universal navigation menu to every user. The workspace should be generated from authenticated partner membership, role, object/region scope, published partner services and currently usable capabilities.

The objective is a reusable UI framework where a new partner can change the available experience through governed configuration rather than institution-specific page forks.

## Core rule

```text
Principal + Partner Membership + Role + Region/Object Scope
+ Partner Service Catalog + Capability Contract
= Workspace Manifest
```

The Workspace Manifest controls what the user sees. The backend still re-authorizes every protected operation independently.

UI hiding is not security.

## Current-state migration problem

The Stage 3 UI is truth-synced and grouped, but the navigation is statically authored. Synthetic auth already knows role and object scopes, yet the frontend does not derive its module/action set from a server-side partner/service policy decision.

The target is to keep reusable pages/components but make their presence and actions data-driven.

## Principal model required by the UI

The authenticated session should ultimately expose a safe, bounded view such as:

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

The client must not be allowed to self-assert partner membership or privileged roles.

## Workspace Manifest

The backend should return a policy-filtered presentation manifest, not the raw capability database.

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
      "actionState": "AVAILABLE_SYNTHETIC"
    }
  ]
}
```

No secret, provider credential, unrestricted internal route or unfiltered partner catalog should be returned.

## Role-specific workspace model

### Agent

Primary flow:

```text
Home -> Customer lookup -> Farmer 360 -> Service -> Request/Offline Queue -> Evidence/Status
```

Typical modules when granted:

- Customer/Agent Terminal
- Farmer 360
- Partner-published services
- GhostSync/local request queue
- local inventory/restock view where assigned
- Agent Learning
- readiness/device status

Agent must not receive:

- provider credential configuration;
- partner contract administration;
- network-wide liquidity/fleet views unless a separate authorized role explicitly grants them;
- provider activation switches;
- settlement authority.

### Supervisor / Regional Operations

Typical modules when granted:

- regional overview;
- scoped agent/network health;
- NLC/LCI planning;
- Cash Fleet planning;
- FMCG/inventory planning;
- exceptions and escalations;
- read-only partner/service status relevant to the region.

Preferred actions are planning/governance verbs such as `Review`, `Recommend`, `Escalate`, `Prepare` and `Simulate` until live authority is explicitly granted.

### Operations

Typical modules when granted:

- transaction/provider evidence;
- reconciliation;
- provider route/status monitoring;
- GhostSync operational exceptions;
- incident/evidence references.

Operations does not automatically gain PartnerFI posting or partner administration.

### Partner Admin

Typical modules:

- partner organization profile;
- service catalog configuration;
- capability/evidence view;
- route assignments;
- user/role/region membership administration where allowed;
- onboarding/certification status.

A Partner Admin cannot override central governance gates by flipping a client control.

### Governance Admin

Future restricted role for:

- stage/environment gates;
- evidence/certification review;
- capability activation approval;
- audit and suspension controls;
- architecture/operational policy.

This role should be separate from day-to-day partner administration.

## Multi-role users

A user may belong to more than one partner or role. Do not merge all permissions into one ambiguous global menu.

Recommended behavior:

1. User selects/enters an active organization/workspace context.
2. Server resolves that context against memberships.
3. Workspace Manifest is generated for that partner + role/context.
4. Switching context triggers a new server-resolved manifest.

Cross-partner data must never remain visible after context switch.

## Capability state presentation

UI state should communicate implementation and authorization separately.

Recommended labels:

- `Implemented · Synthetic data`
- `Sandbox integrated`
- `Foundation implemented · activation gated`
- `Partner authorization required`
- `Future capability`
- `Suspended`

Avoid using `Synthetic Demo` as the only status for both working software and unimplemented concepts.

The UI should distinguish:

```text
Software implementation state
vs
Environment/data state
vs
Authority/activation state
```

## Service action rendering

Reusable workflow templates should render actions from the Partner Service Catalog.

Example:

PartnerFI Alpha Agent:

```text
Account Lookup | Cash In | Cash Out
```

PartnerFI Beta Agent:

```text
Account Lookup | Savings Inquiry | Service Request
```

Same application and workflow component library; different service manifest.

No `AlphaAgentPage.tsx` or `BetaAgentPage.tsx`.

## Disabled vs hidden behavior

### Hide

Hide a service/module when the user has no legitimate reason to know it exists, such as cross-partner capabilities or admin-only functions.

### Show disabled

Show a disabled/gated capability when transparency is useful to an authorized operator, for example:

`M-PESA direct C2B — Foundation implemented · activation gated`

The disabled state must explain the missing gate without exposing credentials or sensitive contract data.

## Ardi placement

Ardi should not remain a universal top-level product module.

Target placement:

- Farmer 360: transparent service-scenario arithmetic where relevant;
- Supervisor/Network Liquidity: NLC/LCI scenario arithmetic;
- future domain analytics: embedded explainable decision-support components.

The user encounters the domain decision/support explanation, not a generic engine detached from role context.

## Server-side authorization

Every protected request must independently validate:

- authenticated session;
- active partner membership;
- role/action permission;
- customer/network object scope;
- region/agent group;
- service publication;
- required capability grant;
- route/adapter/environment state where the action invokes an external route;
- CSRF/replay/idempotency rules where applicable.

A forged UI request must fail even if the client manually navigates to a hidden route.

## Frontend route strategy

Do not duplicate pages per partner. Keep reusable route families:

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

Partner/service context should be data, not file naming.

Legacy route aliases can remain during migration, but the new Workspace Manifest should become the source for primary navigation.

## Migration plan

1. Add authenticated workspace-manifest endpoint using current synthetic auth.
2. Add partner membership to synthetic principals.
3. Back manifest generation with Synthetic Reference Partners + Partner Service Catalog.
4. Replace static primary navigation with manifest rendering.
5. Convert Agent Terminal service buttons to catalog-driven actions.
6. Add Supervisor/Operations manifests.
7. Remove Ardi from universal primary navigation and embed bounded tools in domain surfaces.
8. Keep current direct routes accessible only where server authorization permits, to avoid breaking E2E during migration.

## Required E2E matrix

At minimum:

### Alpha Agent

- sees Cash In/Cash Out;
- does not see Partner Admin/provider config;
- cannot navigate directly to protected admin functions.

### Beta Agent

- does not see cash services;
- sees savings/service-request actions;
- same reusable Agent workspace component renders correctly.

### Alpha Supervisor

- sees scoped NLC/Cash Fleet/FMCG modules where grants allow;
- cannot activate providers or perform PartnerFI settlement.

### Operations user

- sees provider/reconciliation views;
- cannot access customer objects outside assigned scope;
- cannot mutate partner contracts.

### Partner Admin

- sees partner/catalog/capability configuration;
- cannot bypass governance activation gates.

### Cross-partner negative cases

- Alpha user cannot access Beta customer/service objects;
- role name equality across organizations does not grant cross-org access;
- changing URL manually does not expand authorization.

## Accessibility and field constraints

Capability-driven rendering must preserve:

- keyboard navigation;
- readable status labels, not color-only states;
- mobile layouts used by field agents;
- low-bandwidth/static-first behavior where possible;
- no dependency on external analytics/telemetry for core navigation.

## Acceptance criteria for implementation

- Primary navigation is generated from server-resolved workspace manifest.
- At least two synthetic PartnerFIs produce materially different Agent workspaces.
- Server denies direct-route access/actions when membership/capability is absent.
- Supervisor, Operations and Partner Admin manifests differ by responsibility.
- Capability state language distinguishes implementation from authority.
- No partner-specific page forks are needed for existing workflow types.
- E2E tests cover positive and negative role/partner cases.

## Out of scope

- Real partner SSO/IdP.
- Real production user provisioning.
- Production service activation.
- Arbitrary partner-provided UI components/scripts.
