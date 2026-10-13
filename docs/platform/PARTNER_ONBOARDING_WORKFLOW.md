# Partner Onboarding Workflow

## Purpose

The Partner Onboarding Workflow defines how a new institution becomes a configured, tested and eventually authorized Enawuga participant without modifying core UI or core orchestration for every partner.

The workflow governs organization creation, contract/configuration capture, adapter/route selection, sandbox testing, certification, staging approval, activation, suspension and retirement.

Onboarding does not grant legal/regulatory authority. Enawuga records and enforces the authority/evidence supplied through the approved partner/governance process.

## Target user story

For a partner using already-supported Enawuga service types and protocol adapters, onboarding should be primarily configuration and evidence work:

```text
Create partner organization
-> assign partner class
-> attach contract/evidence references
-> define memberships/regions
-> select service catalog entries
-> grant bounded capabilities
-> select certified routes/adapters
-> configure sandbox credential references
-> run certification suite
-> review evidence
-> approve next environment/state
```

A new core feature should be required only when the partner introduces a genuinely new domain capability or unsupported protocol contract.

## Roles

### Partner Admin

May prepare partner metadata, service/catalog configuration, non-secret route configuration, user/region assignments and evidence references according to granted scope.

Cannot self-authorize live capability states.

### Enawuga Operations

May verify technical connectivity/status, investigate sandbox/staging exceptions and review operational readiness where authorized.

Cannot create PartnerFI settlement authority.

### Governance Admin

Approves stage/environment transitions, certification acceptance, capability activation/suspension and policy exceptions according to governance.

### Security/Technical Reviewer

Reviews adapter/configuration/network/secret-handling requirements where a new or changed technical integration is involved.

One person may hold multiple roles in a small organization, but the system should preserve the role/action history and support future separation of duties.

## Partner lifecycle states

Recommended organization-level lifecycle:

- `DRAFT`
- `CONTRACT_REVIEW`
- `TECHNICAL_CONFIGURATION`
- `SANDBOX_READY`
- `CERTIFICATION_PENDING`
- `SANDBOX_CERTIFIED`
- `STAGING_PENDING`
- `STAGING_APPROVED`
- `PILOT_OR_PRODUCTION_AUTHORIZED`
- `SUSPENDED`
- `EXPIRED`
- `RETIRED`

The current program stage must prevent transitions that are not yet permitted. Having a state in the schema does not make it reachable.

## Capability-level lifecycle

Partner organization lifecycle and capability lifecycle are separate. One partner can have:

```text
Account lookup -> SANDBOX_CERTIFIED
Cash in       -> STAGING_PENDING
Cash out      -> DISABLED
Identity      -> not present
```

Do not activate all partner capabilities because one capability passed certification.

## Onboarding phases

### Phase 1 — Organization registration

Capture:

- partnerOrgId;
- partner class;
- legal/display name;
- jurisdiction/operating scope references;
- primary contract/evidence references;
- operational/security contact references;
- proposed regions;
- credential owner role;
- requested services/capabilities.

No credentials or customer data are entered at this phase.

### Phase 2 — Contract and authority mapping

For each requested service/capability, document:

- legal/contractual authority owner;
- account/funds owner where relevant;
- transaction/posting/settlement authority;
- KYC/identity authority;
- reconciliation authority;
- cash custody responsibility where relevant;
- data classes permitted;
- regions/roles/agent groups permitted;
- limits/policies supplied by the partner;
- effective/expiry dates.

This phase must make it impossible to confuse Enawuga orchestration with partner authority.

### Phase 3 — Service catalog configuration

Select existing Enawuga workflow/service types and configure:

- display labels;
- role/region scope;
- required capability IDs;
- offline policy;
- allowed route policy;
- data requirements.

If a requested product does not fit an existing service/workflow type, open a separate domain-design review rather than embedding custom logic in partner configuration.

### Phase 4 — Route and adapter selection

For each external capability:

- choose an existing certified adapter where possible;
- bind an approved route;
- attach environment-specific configuration schema;
- provide secret-store credential references;
- verify host/network/TLS constraints;
- preserve provider/gateway route provenance.

If no compatible adapter exists, onboarding pauses while a separate adapter engineering/certification workstream is created.

### Phase 5 — Sandbox configuration

Sandbox setup may include:

- credential references;
- callback endpoints;
- synthetic test identities/MSISDNs where provider-approved;
- provider simulator values;
- timeouts;
- network allowlists;
- contract/API version references.

No real customer PII should be needed for the reference certification path unless a future governed test policy explicitly allows it.

### Phase 6 — Certification

Run the Contract Certification Suite against each requested adapter/capability/route.

Certification output is machine-readable evidence and must include exact versions of:

- Partner Capability Contract;
- Partner Service Catalog;
- route;
- adapter;
- API/contract spec;
- environment/config schema.

### Phase 7 — Review and approval

A reviewer evaluates:

- certification result;
- unresolved exceptions;
- data/residency/security evidence;
- reconciliation/settlement semantics;
- operational RACI;
- incident/support readiness;
- expiry/effective dates.

Approval is explicit per capability/environment.

### Phase 8 — Activation

Activation changes policy state only after required evidence exists. It must not happen by toggling a frontend boolean alone.

Runtime activation check should require:

```text
approved partner lifecycle state
AND capability approval
AND unexpired evidence
AND certified route/adapter version
AND valid environment gate
AND required secret/config references
AND server policy allow
```

### Phase 9 — Monitoring, suspension and renewal

Capabilities may be suspended for:

- expired contract/certification;
- provider/security incident;
- invalid credentials/config;
- reconciliation risk;
- governance decision;
- partner request.

Suspension should block new use while preserving historical audit/evidence.

## Onboarding record

Recommended top-level record:

```yaml
onboardingId: onboard_01J...
partnerOrgId: org_01J...
workflowVersion: 1
state: CERTIFICATION_PENDING
requestedCapabilities:
  - FIN.ACCOUNT_LOOKUP
  - FIN.CASH_IN_AUTHORIZE
requestedServices:
  - svc_partner_account_lookup
  - svc_partner_cash_in
requestedRoutes:
  - route_partnerfi_sandbox_v1
evidenceRefs:
  - EV-CONTRACT-001
  - EV-DATA-SCOPE-001
certificationRefs: []
openFindings: []
createdAt: ...
updatedAt: ...
```

No secret values are stored in this record.

## State-transition controls

Transitions must be server-enforced and auditable. Example:

```text
DRAFT -> CONTRACT_REVIEW
  requires: organization schema valid

CONTRACT_REVIEW -> TECHNICAL_CONFIGURATION
  requires: authority/data scope documented

TECHNICAL_CONFIGURATION -> SANDBOX_READY
  requires: valid service + route + adapter + config refs

SANDBOX_READY -> CERTIFICATION_PENDING
  requires: certification run created

CERTIFICATION_PENDING -> SANDBOX_CERTIFIED
  requires: required certification checks pass or approved bounded exceptions

SANDBOX_CERTIFIED -> STAGING_PENDING
  requires: program stage allows staging request
```

Unsupported transitions fail closed.

## Configuration vs engineering decision

A central goal is to determine whether a new partner requires configuration or engineering.

### Configuration-only path

Use when:

- partner class already supported;
- service/workflow types already supported;
- required provider-neutral capabilities already defined;
- an adapter supports the partner protocol/environment;
- data/offline/reconciliation semantics fit existing contracts.

### New adapter path

Use when the business capability is known but the external API/protocol is unsupported.

Core UI should still remain unchanged.

### New domain capability path

Use when the requested service has genuinely new business semantics/state/authority requirements. This requires a separate architecture/domain PR before onboarding can continue.

This prevents partner-specific exceptions from silently becoming core technical debt.

## UI/UX for onboarding

The onboarding console should show a step/evidence workflow, not a giant configuration form.

Recommended views:

- Organization
- Authority & data scope
- Services
- Capabilities
- Routes/adapters
- Sandbox configuration
- Certification
- Approval
- Operational readiness
- Audit/history

Each step clearly shows:

- complete/incomplete;
- blocking findings;
- evidence references;
- who can act;
- next permitted transition.

## Required tests

- Partner Admin cannot self-set an authorized/live state.
- Unknown capability/service/route/adapter IDs rejected.
- Missing evidence blocks transition.
- Expired certification blocks activation/renewal.
- Capability A certification cannot activate capability B.
- Adapter version change invalidates/requires appropriate re-certification.
- Secret values rejected from ordinary onboarding records.
- Suspended partner cannot create new actionable service intents.
- Historical transactions retain original contract/service/route versions.
- New partner using existing contracts can complete configuration without institution-specific UI code.

## Acceptance criteria for implementation

- Strict onboarding state machine.
- Organization and capability lifecycles tracked separately.
- Evidence and certification references required at gates.
- Configuration-only partner path demonstrated with a synthetic reference partner.
- Unsupported protocol produces a new-adapter requirement, not core provider branching.
- Unsupported domain semantics produce a domain-design requirement.
- Every transition audited.
- No frontend-only activation path.

## Out of scope

- Real production partner approval in the current synthetic stage.
- Contract/legal review automation.
- Production secret storage implementation.
- Regulatory licensing decisions by Enawuga/Wishland.
