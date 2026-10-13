# Contract Certification Suite

## Purpose

The Contract Certification Suite is the repeatable evidence system that proves a partner capability/route/adapter conforms to Enawuga contracts before it can progress from disabled or synthetic states into higher environments.

Provider-specific tests already exist in the current codebase. This suite standardizes the common requirements every new adapter/service path must satisfy so partner onboarding does not depend on ad hoc manual confidence.

Certification is technical/governance evidence. It is not a legal license, regulatory approval or PartnerFI settlement authority.

## Certification subject

A certification run must identify exact versions of:

```text
partnerOrgId
Partner Capability Contract version
Partner Service Catalog version
capabilityId
routeId + routeVersion
adapterId + adapterVersion
external API/contract specification reference
environment
configuration schema version
certification-suite version
```

A passing result applies only to that subject/version/environment combination unless an explicit compatibility policy says otherwise.

## Certification levels

### L0 — Schema and policy conformance

No provider network required.

Validates:

- strict partner/capability/service/route/adapter schemas;
- known IDs and version references;
- environment compatibility;
- data-scope constraints;
- role/region/object policy;
- no secret values in ordinary configuration records;
- code presence does not imply activation.

### L1 — Synthetic contract certification

Uses deterministic local/synthetic adapters.

Validates:

- success/rejection/uncertainty mapping;
- idempotency/replay behavior;
- offline intent semantics;
- route provenance;
- authorization boundaries;
- audit redaction;
- durable recovery where required;
- capability-driven UI visibility/denial.

### L2 — External sandbox/TestBed certification

Uses provider-approved sandbox/TestBed only.

Validates the actual external contract that has been supplied/verified, such as:

- authentication/token contract;
- request schema/field mapping;
- pinned host/environment;
- response/error semantics;
- correlation identifiers;
- status/reconciliation behavior;
- redirect policy;
- callback authenticity policy where applicable;
- timeout/ambiguous-outcome handling.

L2 does not imply production approval.

### L3 — Governed staging certification

Future, only when program governance permits staging.

Adds evidence for:

- approved staging infrastructure/data residency;
- staging credentials and key custody;
- observability/incident handling;
- operational RACI;
- staging reconciliation runbook;
- controlled integration tests.

### L4 — Pilot/production readiness certification

Future and explicitly gated.

Technical certification alone is insufficient. This level requires separate legal/partner/governance approvals and should record them as external evidence references rather than pretending the test suite grants authority.

## Mandatory common test families

### 1. Contract/schema validation

- valid contract accepted;
- unknown fields/IDs fail closed;
- incompatible versions rejected;
- malformed amounts/currencies/identifiers rejected;
- service cannot reference unknown capability/route;
- route cannot reference unknown adapter.

### 2. Organization/role/object authorization

- correct partner membership required;
- role required;
- region/agent-group scope required where configured;
- customer/network object scope enforced;
- cross-partner access denied even when role names match;
- UI-hidden routes remain server-denied when called directly.

### 3. Capability-state enforcement

- `DISABLED` cannot execute;
- `SIMULATION_ONLY` cannot call external provider network;
- `SANDBOX_BOUNDED` cannot use staging/production route;
- expired/suspended grants denied;
- adapter registration alone cannot execute;
- service publication alone cannot execute.

### 4. Idempotency and replay

For externally mutating requests:

- same idempotency key + same canonical request returns/reconciles safely;
- same key + changed payload fails closed;
- same transaction cannot silently switch routes;
- duplicate callback/event is idempotent;
- stale/out-of-order sequence handling follows the contract;
- restart does not cause automatic repost where outcome is uncertain.

### 5. Ambiguous outcome/reconciliation

- network timeout -> uncertain/reconciliation-required, not fabricated failure/success;
- provider 5xx/ambiguous response -> bounded uncertain state;
- malformed provider response -> bounded uncertain/error state;
- no automatic fallback to a second provider after possible mutation;
- reconciliation uses the recorded original route/provider correlation.

### 6. Authority semantics

- provider/gateway acceptance does not become PartnerFI settlement;
- payment URL/session creation does not become payment completion;
- token acquisition does not become payment authority;
- transport receipt does not become financial authorization;
- fleet planning does not become dispatch/custody;
- identity-provider response does not imply phone possession/account ownership unless contract says so.

### 7. Route provenance

Every intent/result can reconstruct:

```text
serviceId/catalogVersion
partnerOrgId/contractVersion
capabilityId
routeId/routeVersion
adapterId/adapterVersion
provider/gateway identifiers
internal transactionId
```

Direct and gateway-routed paths remain distinct.

### 8. Environment isolation

- sandbox adapter rejects production host;
- production/staging adapters are not substituted into synthetic/sandbox flow;
- environment credentials cannot be used by incompatible adapter registration;
- redirects to unapproved origins rejected where the provider contract requires host pinning;
- environment state cannot be changed by request payload.

### 9. Secret/privacy/logging controls

- credentials never returned to client;
- secrets not serialized in contract/catalog/registry/audit;
- logs/audit contain approved references/codes only;
- raw PII is minimized/rejected according to data contract;
- partner cannot request data classes outside approved scope.

### 10. Callback/webhook controls

When callbacks exist:

- sender verification/authentication per provider contract;
- schema validation;
- correlation to existing transaction;
- replay/sequence protection;
- terminal state cannot regress;
- unauthenticated callback never becomes authoritative;
- raw sensitive callback payload not retained unnecessarily.

If provider callback authenticity is not available, the suite must verify callbacks remain non-authoritative and trigger reconciliation rather than settlement.

### 11. Durability/recovery

Where the workflow can mutate externally:

- intent recorded before submission when required;
- recorded provider result survives restart;
- unresolved submission survives restart as reconciliation-required;
- malformed durable state fails closed;
- duplicate/replay controls survive restart.

### 12. Offline/GhostSync

Where offline capture is allowed:

- only approved intent/draft can be captured;
- offline transport does not perform unavailable credential verification;
- receiver re-runs authorization/object/capability checks;
- sync acknowledgment does not equal settlement;
- conflicts preserved for authorized resolution.

### 13. UI contract tests

For a partner service exposed to users:

- available services are derived from policy-filtered workspace manifest;
- unavailable cross-partner/admin services absent or appropriately gated;
- state labels distinguish implementation/environment/authority;
- no misleading settlement/approval claim;
- mobile/field layout remains usable for Agent roles.

## Adapter-specific certification profiles

Common tests are mandatory, then adapter families add profiles.

### Financial Institution profile

Additional tests may cover:

- partner customer/account reference mapping;
- account owner remains PartnerFI;
- authorization vs posting vs settlement state separation;
- partner-supplied limits/policy behavior;
- reconciliation/statement reference contract.

### Payment Gateway profile

- checkout/payment initiation mapping;
- provider session/reference correlation;
- status query semantics;
- callback/notification behavior;
- gateway success != PartnerFI settlement.

### Mobile Money profile

- direct vs gateway route provenance;
- provider-specific token/signature/password derivation contract;
- MSISDN/test-fixture handling;
- reversal/status semantics where implemented.

### Identity profile

- attestation/reference mapping;
- minimum-data handling;
- re-verification semantics;
- no implicit account linkage.

### FMCG profile

- catalog/inventory scope;
- order/restock state semantics;
- no unrelated KYC/account data;
- commercial settlement separated from planning.

### Fleet profile

- route planning vs dispatch/handover distinction;
- custody evidence requirements for any future live flow;
- no financial posting authority from logistics role.

## Certification report

Machine-readable output should resemble:

```json
{
  "certificationId": "cert_01J...",
  "suiteVersion": 1,
  "subject": {
    "partnerOrgId": "org_syn_alpha",
    "contractVersion": 1,
    "serviceCatalogVersion": 1,
    "capabilityId": "FIN.CASH_IN_AUTHORIZE",
    "routeId": "route_mock_partnerfi_alpha",
    "routeVersion": 1,
    "adapterId": "adapter_mock_partnerfi_alpha_v1",
    "adapterVersion": 1,
    "environment": "synthetic"
  },
  "level": "L1_SYNTHETIC",
  "result": "PASS",
  "checks": [],
  "openFindings": [],
  "evidenceRefs": [],
  "startedAt": "...",
  "completedAt": "..."
}
```

The report contains no credentials/raw provider secrets.

## Finding severity

Recommended:

- `BLOCKER` — certification cannot pass;
- `HIGH` — capability cannot progress environment/state;
- `MEDIUM` — bounded exception requires explicit approval/evidence;
- `LOW` — non-authority/non-safety issue that may be scheduled.

No unresolved blocker/high finding may be hidden by changing UI text.

## Re-certification triggers

Require a new certification run when material changes occur, including:

- adapter version/protocol behavior changes;
- provider API/contract version changes;
- route/environment changes;
- capability authority semantics change;
- callback/authentication method changes;
- data-scope expansion;
- material service workflow changes;
- security-critical dependency/config changes where policy requires it.

Minor presentation copy changes should not invalidate an adapter certification unless they alter authority claims.

## Relationship to onboarding

Onboarding requests certification; it does not define pass criteria itself.

```text
Partner Onboarding
 -> creates certification subject
 -> Certification Suite executes
 -> report/evidence returned
 -> Governance reviews
 -> capability lifecycle may progress
```

A pass does not automatically activate a capability. Activation remains a separate governed decision.

## CI integration

Initial L0/L1 profiles should run in ordinary CI using synthetic fixtures.

External sandbox L2 tests should be explicitly invoked and secrets-gated; they should not run on every untrusted pull request. Manual/controlled workflows should sanitize outputs.

Future staging/pilot profiles require environment-specific protected workflows.

## Acceptance criteria for implementation

- Versioned certification subject/report schemas.
- Common L0/L1 suite reusable across at least two different synthetic PartnerFIs/adapters.
- Existing ArifPay safety behavior mapped into gateway certification profile without weakening provider-specific tests.
- Telebirr/M-PESA foundations can be certified only for operations actually implemented (for example token/foundation readiness), not falsely for payment initiation.
- Capability progression consumes certification reference but remains separately approval-gated.
- CI runs deterministic L0/L1 tests.
- External sandbox runs are controlled/secrets-safe.
- Negative tests prove environment/authority/route/cross-partner failures.

## Out of scope

- Regulatory certification by government/central bank.
- Legal approval automation.
- Real production authorization in the current stage.
- Real customer/funds/cash movement.
