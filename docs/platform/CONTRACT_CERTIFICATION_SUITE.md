# Contract Certification Suite

## Purpose

The Contract Certification Suite is the repeatable evidence system that proves a partner capability/route/adapter conforms to Enawuga contracts before onboarding may progress it to a higher governed state.

The suite consumes the current partner-platform layers rather than testing provider code in isolation:

1. Partner Capability Contract;
2. Partner Service Catalog;
3. Adapter Registry + Route Resolver;
4. capability-driven Workspace Manifest;
5. Partner Onboarding Workflow.

Certification is technical/governance evidence. It is not a regulatory license, legal approval, production authorization, customer-funds authority or PartnerFI settlement authority.

## Certification subject

Every run pins the exact subject:

```text
partnerOrgId
Partner Capability Contract version
Partner Service Catalog version
capabilityId
serviceId
routeId + routeVersion
adapterId + adapterVersion
adapter runtime mode
external API/contract evidence reference
environment
configuration schema version
certification-suite version
```

A PASS applies only to that exact subject/version/environment combination unless an explicit compatibility policy says otherwise.

## Certification levels

### L0 — Schema and policy conformance

No provider network.

Validates strict schemas, known IDs, role/region/object scopes, capability/service/route/adapter compatibility, environment consistency, data minimization, secret exclusion, onboarding binding validity and fail-closed program-stage rules.

### L1 — Synthetic contract certification

Uses local deterministic fixtures/adapters.

Validates authorization, cross-partner isolation, route provenance, idempotency/replay, ambiguous outcome behavior, durable recovery where applicable, offline intent semantics, UI/workspace policy, provider-success-versus-settlement boundaries and version-pinned evidence.

### L2 — External sandbox / TestBed certification

Controlled provider-approved non-production environment only.

Validates only external operations actually implemented and evidenced, such as:

- authentication/token contract;
- host/environment pinning;
- request schema/signature mapping;
- provider response/error semantics;
- correlation identifiers;
- bounded query/status behavior;
- callback authenticity when implemented;
- timeout/ambiguous outcome handling;
- redirect/TLS policy.

**L2 certification is operation-specific.** A successful token test does not certify payment initiation, callbacks, status mapping or settlement.

Current provider examples:

```text
ArifPay
  bounded sandbox checkout + status/reconciliation may be certified when configured

Direct Telebirr
  TestBed foundation may be certified for implemented signing/token/query/build primitives
  direct payment route remains unmounted until its separate gates pass

M-PESA Ethiopia direct
  sandbox/token foundation may be certified for verified authentication contract
  payment/status/callback routes remain unmounted until separately implemented/certified
```

### L3 — Governed staging certification

Future only. Requires program-stage authorization plus staging infrastructure, residency, IAM, key custody, observability, incident, backup/restore and operational evidence.

### L4 — Pilot / production readiness

Future and explicitly governance-gated. Technical PASS is only one evidence input; legal, partner, regulator and operational approvals remain separate external authority.

## Adapter registration, runtime mode and route activation

Certification must preserve the layered provider model:

```text
REGISTERED_SANDBOX / REGISTERED_TESTBED
!= EXECUTABLE
!= active bounded route
!= production authorization
!= PartnerFI settlement
```

A `FOUNDATION_ONLY` adapter can pass certification for foundation operations while remaining non-actionable for payment routes.

The suite must never convert `FOUNDATION_ONLY` into `EXECUTABLE` merely because a test passed.

## Mandatory common test families

### 1. Schema and contract integrity

- unknown fields and IDs rejected;
- service cannot reference unsupported capability/route;
- route cannot reference unknown/incompatible adapter;
- version/environment mismatch rejected;
- malformed identifiers, amounts or currencies rejected where relevant;
- onboarding subject and certification subject must match exactly.

### 2. Organization, role and object authorization

- active partner membership required;
- role and region/agent-group scope required;
- customer/network object scope enforced;
- equal role names across partners do not grant cross-partner access;
- frontend visibility does not bypass backend authorization.

### 3. Capability and lifecycle state

- disabled/suspended/expired capability denied;
- service publication alone does not authorize execution;
- adapter registration alone does not authorize execution;
- `FOUNDATION_ONLY` cannot back an executable route;
- sandbox/TestBed state cannot use staging/production route;
- onboarding cannot progress a different capability using another capability's certification.

### 4. Idempotency and replay

For externally mutating operations:

- same key + same canonical request remains safe;
- same key + changed payload fails closed;
- transaction cannot silently switch providers/routes after submit;
- duplicate callback/event is idempotent;
- restart cannot silently repost an uncertain external mutation.

### 5. Ambiguous outcomes and reconciliation

- timeout/provider 5xx/malformed response maps to bounded uncertain state;
- no fabricated success/failure;
- no cross-provider fallback after possible mutation;
- reconciliation pins original route/provider correlation;
- provider evidence remains distinct from PartnerFI settlement evidence.

### 6. Authority semantics

Tests explicitly prove that:

- token acquisition != payment authority;
- checkout/session creation != payment completion;
- gateway/provider success != PartnerFI settlement;
- transport receipt != financial authorization;
- fleet planning != dispatch/custody;
- inventory planning != commercial order/settlement;
- identity attestation != broader account authority.

### 7. Route provenance

Evidence reconstructs:

```text
partnerOrgId + contractVersion
serviceId + catalogVersion
capabilityId
routeId + routeVersion
adapterId + adapterVersion + runtimeMode
provider/gateway reference
internal transaction/reference
```

Direct and gateway-routed provider paths remain distinct.

### 8. Environment isolation

- sandbox adapter rejects production host;
- environment cannot be changed by request payload;
- credentials/config references cannot cross incompatible environment registrations;
- unapproved redirects/hosts rejected;
- insecure TLS bypass is not accepted as certification evidence.

### 9. Secrets, privacy and logging

- no credentials returned to clients;
- contract/catalog/registry/onboarding/report contain references, not secret values;
- logs/audit avoid raw secrets and unnecessary PII;
- data class cannot exceed approved scope.

### 10. Callback/webhook controls

Where implemented:

- authenticity verification;
- strict schema/correlation;
- replay protection;
- terminal state cannot regress;
- unauthenticated callback remains non-authoritative.

If authenticity is not established, certification must explicitly mark the callback operation unsupported/non-authoritative rather than PASS it.

### 11. Durability and recovery

Where external mutation occurs:

- durable intent before submit when required;
- unresolved submit survives restart as reconciliation-required;
- provider result survives restart;
- corrupt durable state fails closed;
- replay controls survive restart.

### 12. Offline / GhostSync

- only approved drafts/intents captured offline;
- offline transport does not fabricate online verification;
- receiver re-authorizes membership/object/capability;
- delivery acknowledgment != settlement;
- conflicts retained for governed resolution.

### 13. Workspace/UI contract

- partner services derive from the policy-filtered Workspace Manifest;
- Alpha/Beta-style heterogeneous partners produce different services through shared UI code;
- admin/operations modules absent from Agent workspace;
- implementation/environment/authority labels remain distinct;
- provider foundation registration is not shown as payment-route activation;
- no misleading settlement/production claim.

## Profiles

Every run executes common checks plus a partner-class/profile set.

### Financial Institution

- PartnerFI remains account/funds owner;
- lookup/auth/posting/settlement semantics separated;
- partner policy/limits are not invented by Wishland;
- account/transaction references map deterministically.

### Payment Gateway

- checkout/request mapping;
- provider-session correlation;
- status/reconciliation semantics;
- callback policy;
- gateway success != PartnerFI settlement.

### Mobile Money

- direct versus gateway provenance;
- token/signature/auth contract;
- provider-approved synthetic MSISDN fixture policy;
- only implemented operations certified;
- reversal/status semantics certified separately when implemented.

### Identity Provider

- minimum-data/reference mapping;
- attestation/re-verification semantics;
- no implicit broader account linkage.

### FMCG

- inventory/catalog scope;
- order/restock state semantics;
- no unrelated customer financial/identity access;
- planning separated from commercial settlement.

### Fleet / Cash Logistics

- planning separated from dispatch/handover;
- custody evidence required for any future live state;
- logistics role cannot create financial posting authority.

## Machine-readable report

```json
{
  "certificationId": "cert_gamma_001",
  "suiteVersion": 1,
  "subject": {
    "partnerOrgId": "org_syn_gamma",
    "contractVersion": 1,
    "catalogVersion": 1,
    "serviceId": "svc_gamma_account_lookup",
    "capabilityId": "FIN.ACCOUNT_LOOKUP",
    "routeId": "route_gamma_sandbox_v1",
    "routeVersion": 1,
    "adapterId": "adapter_gamma_sandbox_v1",
    "adapterVersion": 1,
    "runtimeMode": "EXECUTABLE",
    "environment": "sandbox"
  },
  "level": "L1_SYNTHETIC",
  "result": "PASS",
  "checks": [],
  "findings": [],
  "evidenceRefs": [],
  "startedAt": "...",
  "completedAt": "..."
}
```

No raw credentials, private keys, PINs, tokens or unnecessary PII belong in the report.

## Results and findings

Certification result:

- `PASS`
- `FAIL`
- `INCOMPLETE`

Finding severity:

- `BLOCKER`
- `HIGH`
- `MEDIUM`
- `LOW`

Any blocker/high finding prevents PASS. A required check that was not executed produces `INCOMPLETE`, not PASS.

A medium exception must be explicit evidence reviewed by governance; changing UI text is never a way to hide a failed authority/safety control.

## Re-certification triggers

Material changes require a new subject/run, including:

- adapter version/protocol behavior;
- route version/environment;
- provider API/contract version;
- capability authority semantics;
- authentication/callback method;
- data-scope expansion;
- material service workflow;
- security-critical configuration/dependency where policy requires.

Certification references are version-pinned. Onboarding must invalidate/review prior evidence when the bound version set changes.

## Relationship to Partner Onboarding

```text
Partner Onboarding
  -> creates exact certification subject
Certification Suite
  -> executes permitted profile/level
  -> returns immutable report/evidence
Governance / Onboarding
  -> consumes the report reference
  -> may progress only that capability if current stage permits
```

Certification never self-activates a capability.

## CI and external-test policy

L0/L1 deterministic profiles run in ordinary CI.

L2 provider sandbox/TestBed operations run only in controlled workflows with approved non-production secret handling and sanitized output. They do not run automatically on untrusted pull requests.

L3/L4 remain unavailable until their program stages and protected environments exist.

## Required implementation tests

- strict subject/report schemas;
- deterministic L0/L1 runner;
- required-check omission => INCOMPLETE;
- blocker/high => FAIL;
- exact version/environment mismatch rejected;
- cross-partner subject rejected;
- foundation-only profile cannot certify payment route execution;
- Telebirr/M-PESA foundation operations can PASS only for implemented foundation scope;
- ArifPay bounded sandbox profile can certify implemented checkout/status semantics without claiming settlement;
- certification for capability A cannot satisfy capability B;
- report contains no secret fields;
- report evidence can be consumed by Partner Onboarding but does not auto-activate it.

## Definition of Done

The certification workstream is complete when:

- versioned subject/check/report schemas exist;
- reusable L0/L1 runner executes common checks;
- at least two heterogeneous PartnerFI subjects can be evaluated without institution-specific runner branches;
- provider foundation vs executable-route semantics are tested explicitly;
- deterministic CI covers negative authority/environment/provenance cases;
- onboarding consumes certification references per capability;
- a PASS never changes capability authority by itself;
- L2/L3/L4 execution remains controlled by explicit environment/program-stage policy.

## Out of scope

- regulatory certification;
- legal approval automation;
- production provider activation in current Stage 3;
- real customer/funds/cash movement;
- PartnerFI posting/settlement authority granted by Wishland.
