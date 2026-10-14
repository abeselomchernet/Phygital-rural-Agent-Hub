# Partner Onboarding Workflow

## Purpose

The Partner Onboarding Workflow defines how a new institution becomes a configured, tested and eventually authorized Enawuga participant without rebuilding Agent Terminal, Farmer 360, Supervisor, Operations or shared orchestration for every partner.

It consumes the partner-platform layers that now exist in the baseline:

1. Partner Capability Contract;
2. Synthetic Reference Partners;
3. Partner Service Catalog;
4. Adapter Registry + Route Resolver;
5. capability-driven role/partner Workspace Manifest.

Onboarding does not create legal, regulatory, customer-funds, settlement, cash-custody or production authority. Enawuga records and enforces only the authority and evidence admitted through the governed partner process.

## Platform outcome

For a partner whose products and protocol already fit supported Enawuga contracts, onboarding should be configuration plus evidence work:

```text
Create partner organization
-> classify partner
-> capture authority/data evidence
-> define memberships/regions
-> publish supported services
-> bind capability grants
-> bind registered route + certified adapter
-> reference sandbox/TestBed credentials
-> run certification
-> review findings
-> approve the next permitted environment/capability state
-> generate governed workspaces
```

The core test is:

> Can a new PartnerFI be added without a new institution-specific Agent/Supervisor/Operations page?

If not, onboarding must stop and the underlying shared abstraction must be corrected instead of embedding a partner exception.

## Configuration, adapter engineering and domain engineering are separate

### Configuration-only path

Use when all of the following already exist:

- supported partner class;
- reusable service/workflow types;
- provider-neutral capabilities;
- compatible adapter/protocol family;
- bounded route model;
- compatible data/offline/reconciliation semantics;
- existing role/workspace composition.

The desired outcome is **no Enawuga core/UI code change**.

### New-adapter path

Use when the business capability is already modeled but the external protocol/API is not supported.

A separate adapter engineering + certification workstream is opened. Shared UI/workflow semantics remain unchanged.

### New-domain-capability path

Use only when the partner introduces genuinely new business states, authority semantics or reusable workflow behavior.

A separate domain/architecture workstream must define the new shared capability before onboarding resumes. The result becomes reusable platform functionality, not a permanent one-partner fork.

## Roles and separation of duties

### Partner Admin

May prepare partner metadata, memberships, regions, service-catalog configuration, non-secret route/config references and evidence references within assigned scope.

Partner Admin cannot self-create certification, production authority or bypass governance/environment gates.

### Enawuga Operations

May review connectivity, provider readiness, route provenance, reconciliation behavior and bounded operational exceptions where authorized.

Operations cannot create PartnerFI posting/settlement authority or promote a foundation-only provider route into an executable route.

### Technical / Security Reviewer

Reviews adapter version, config schema, host/network/TLS constraints, secret ownership/reference handling, callback authenticity, idempotency/recovery and technical findings.

### Governance Admin

May approve only transitions permitted by the current program stage and evidence policy. Approval remains per capability + environment + route/adapter version.

One person may hold more than one role in a small organization, but the system preserves actor/action history and should support future separation of duties.

## Organization lifecycle

Recommended organization-level states:

```text
DRAFT
CONTRACT_REVIEW
TECHNICAL_CONFIGURATION
SANDBOX_READY
CERTIFICATION_PENDING
SANDBOX_CERTIFIED
STAGING_PENDING
STAGING_APPROVED
AUTHORIZED
SUSPENDED
EXPIRED
RETIRED
```

The schema may describe future states that are not reachable in the current program stage. **State existence is not state authorization.**

Current Stage 3 policy must fail closed on staging/production/live authority.

## Capability lifecycle is independent

Organization state and capability state are separate.

Example:

```text
PartnerFI Alpha
  Account lookup      SANDBOX_CERTIFIED
  Cash in             SANDBOX_CERTIFIED
  Cash out            DISABLED
  Savings request     NOT_REQUESTED
```

One capability passing certification must never activate another capability.

## Provider registration, executability and route activation are also separate

Onboarding must preserve the layered provider model introduced by the Adapter Registry:

```text
Environment registration
!= runtime executability
!= route activation
!= production authorization
!= PartnerFI settlement authority
```

Examples in the current baseline:

```text
Direct Telebirr
  environment: TestBed
  adapter: REGISTERED_TESTBED
  runtime mode: FOUNDATION_ONLY
  direct payment route: not mounted

M-PESA Ethiopia direct
  environment: Sandbox
  adapter: REGISTERED_SANDBOX
  runtime mode: FOUNDATION_ONLY
  payment/status/callback routes: not mounted

ArifPay
  environment: Sandbox
  adapter: executable only when guarded sandbox runtime is configured
  route: bounded sandbox
  settlement: separate PartnerFI authority
```

Onboarding must never collapse these states into one `enabled` boolean.

## Onboarding phases

### 1. Organization registration

Capture only governed metadata and references:

- partner organization ID;
- partner class;
- legal/display-name reference;
- jurisdiction/operating-scope reference;
- contract/evidence references;
- proposed regions;
- role/membership model;
- credential-owner role;
- requested service/capability references.

Do not store credentials or customer data in the onboarding record.

### 2. Authority and data mapping

For each requested capability record:

- legal/contractual authority owner;
- account/funds owner where relevant;
- authorization/posting/settlement owner;
- KYC/identity authority where relevant;
- reconciliation responsibility;
- cash custody/handover responsibility where relevant;
- allowed data classes;
- roles, regions, agent groups and object scopes;
- effective/expiry dates;
- evidence references.

This phase must make Wishland orchestration visibly distinct from partner authority.

### 3. Service Catalog configuration

Configure supported reusable services with:

- service/workflow type;
- display label;
- role/region/agent-group scope;
- required capabilities;
- allowed route;
- required data classes;
- offline policy.

If a product does not fit an existing reusable service type, stop and open the new-domain-capability path.

### 4. Route and adapter binding

For each external capability:

- resolve an existing registered adapter if compatible;
- bind an approved route;
- verify partner class and environment match;
- bind config-schema/version reference;
- bind opaque secret-store reference where required;
- verify host/TLS/network constraints;
- preserve provider/gateway provenance;
- record runtime mode (`FOUNDATION_ONLY` or `EXECUTABLE`).

If no compatible adapter exists, stop and open the new-adapter path.

### 5. Sandbox / TestBed configuration

May include only governed non-production references such as:

- secret references, never secret values;
- provider-approved synthetic identities/test numbers;
- callback URL references;
- network allowlist references;
- timeout/retry policy;
- API/contract version;
- provider evidence IDs.

A registered foundation may remain non-executable until separate route-activation gates pass.

### 6. Certification

Run the Contract Certification Suite separately for each requested capability/route/adapter combination.

Certification evidence must bind exact versions of:

- Partner Capability Contract;
- Partner Service Catalog;
- adapter registration;
- route registration;
- configuration schema;
- external API/contract reference;
- environment;
- test/certification profile.

### 7. Review

Reviewer evaluates:

- certification result;
- unresolved findings/exceptions;
- data/residency/security evidence;
- idempotency/recovery semantics;
- callback/status/reconciliation semantics;
- provider success vs PartnerFI settlement boundary;
- operational RACI;
- incident/support readiness;
- effective/expiry dates.

### 8. Approval

Approval is explicit **per capability, environment and version set**.

Partner Admin cannot approve its own live authority. Current program-stage policy can keep future states unreachable even when the record schema knows they exist.

### 9. Activation

Activation must be a server-side policy decision, not a frontend switch.

A future actionable capability should require at minimum:

```text
organization state permitted
AND capability state permitted
AND current program stage permits environment
AND unexpired authority/evidence
AND certification accepted
AND route version certified
AND adapter version certified
AND adapter runtime mode executable
AND route activation permitted
AND required config/secret references valid
AND role/region/object policy allows request
```

Failure of any term fails closed.

### 10. Workspace generation

After bounded approval, the existing capability-driven UI composes the workspace from:

```text
membership
+ role
+ region/object scope
+ Service Catalog
+ Capability Contract
+ route/adapter state
= Workspace Manifest
```

No partner-specific page fork is created.

### 11. Suspension, renewal and retirement

Suspend capability use when required by:

- expired evidence/certification;
- provider/security incident;
- invalid credentials/config;
- adapter/contract version change;
- reconciliation risk;
- governance decision;
- partner request.

Suspension blocks new use but preserves historical versioned evidence and transaction provenance.

## Machine-readable onboarding record

Recommended bounded record:

```yaml
onboardingId: onboard_01J...
workflowVersion: 1
partnerOrgId: org_01J...
organizationState: CERTIFICATION_PENDING
requestedServices:
  - svc_partner_account_lookup
requestedCapabilities:
  - FIN.ACCOUNT_LOOKUP
bindings:
  - serviceId: svc_partner_account_lookup
    capabilityId: FIN.ACCOUNT_LOOKUP
    routeId: route_partnerfi_sandbox_v1
    adapterId: adapter_partnerfi_v1
    adapterVersion: 1
    environment: sandbox
    runtimeMode: EXECUTABLE
evidenceRefs:
  - EV-CONTRACT-001
  - EV-DATA-SCOPE-001
certificationRefs: []
openFindings: []
createdAt: ...
updatedAt: ...
```

No secret value, private key, token, PIN, customer PII or unrestricted executable code belongs in this record.

## Transition controls

Illustrative current-safe transition rules:

```text
DRAFT -> CONTRACT_REVIEW
  requires organization schema valid

CONTRACT_REVIEW -> TECHNICAL_CONFIGURATION
  requires authority + data scope evidence

TECHNICAL_CONFIGURATION -> SANDBOX_READY
  requires valid service/capability/route/adapter/config references

SANDBOX_READY -> CERTIFICATION_PENDING
  requires certification run reference

CERTIFICATION_PENDING -> SANDBOX_CERTIFIED
  requires required certification levels pass

SANDBOX_CERTIFIED -> STAGING_PENDING
  requires program-stage gate that is NOT currently granted by Stage 3
```

Unsupported transitions fail closed and are auditable.

## Onboarding UI

Use a step/evidence workflow rather than a giant unstructured form:

```text
Organization
Authority & data scope
Services
Capabilities
Routes & adapters
Sandbox / TestBed
Certification
Approval
Operational readiness
Audit history
```

Each step shows:

- complete / incomplete;
- blockers;
- evidence refs;
- actor permitted to act;
- next permitted transition;
- versions that would be invalidated by a change.

## Required implementation tests

- Partner Admin cannot self-authorize staging/production/live state.
- Unknown partner/service/capability/route/adapter IDs are rejected.
- Cross-partner references are rejected.
- Missing/expired evidence blocks transitions.
- Capability A certification cannot activate capability B.
- Adapter or route version change invalidates/requires relevant re-certification.
- Secret-bearing fields are rejected from onboarding records.
- `FOUNDATION_ONLY` adapter cannot activate an executable payment route.
- Registered sandbox/TestBed foundation does not imply production authorization.
- Suspended/expired capability cannot create a new actionable request.
- Historical records retain the original contract/catalog/route/adapter versions.
- A configuration-only synthetic partner can be onboarded without institution-specific UI/core branches.
- Unsupported protocol produces `NEW_ADAPTER_REQUIRED` rather than provider branching in core.
- Unsupported business semantics produces `NEW_DOMAIN_CAPABILITY_REQUIRED`.
- Every transition emits an auditable decision/evidence reference.

## Definition of Done

The onboarding workstream is complete only when:

- a strict versioned onboarding state machine exists;
- organization and capability lifecycles are tracked separately;
- route/adapter runtime state is not conflated with authority;
- transitions are server-enforced and auditable;
- configuration-only, new-adapter and new-domain paths are explicit;
- evidence/certification references are required at gates;
- a synthetic new PartnerFI can complete the configuration-only path and generate a valid workspace with no core/UI fork;
- frontend controls cannot self-promote capability authority;
- production/live states remain unreachable until a later program stage explicitly permits them.

## Out of scope for the current synthetic stage

- real production partner approval;
- legal/regulatory decision automation;
- production secret-store implementation;
- production SSO/provisioning;
- real customer PII/funds;
- live PartnerFI posting/settlement;
- live provider payment activation solely from this workflow;
- regulatory licensing decisions by Wishland/Enawuga.
