# Adapter Registry and Route Resolver

## Purpose

The Adapter Registry decouples the Enawuga core from provider-specific bootstrap logic. The core requests a governed service/capability/route; the resolver returns a reviewed adapter implementation for the current partner and environment.

This is **not** a marketplace for arbitrary executable plug-ins. Initial adapters are reviewed, compiled Enawuga modules. Registration makes an adapter discoverable to the runtime; it does not authorize the adapter to execute a service.

The governing separation is:

```text
Service != Capability != Route != Adapter
```

and the execution chain is:

```text
Authenticated partner context
  -> Partner Service Catalog
  -> Partner Capability Contract decision
  -> Route Resolver
  -> Adapter Registry
  -> Reviewed adapter
  -> External/synthetic partner system
```

## Current baseline

The prerequisite partner-platform layers now exist separately:

- Partner Capability Contract runtime;
- heterogeneous Synthetic Reference Partners;
- Partner Service Catalog runtime and policy-filtered manifest generation.

The remaining composition problem is that current server bootstrap still directly constructs the ArifPay sandbox adapter when ArifPay environment variables are present, while the demo API directly constructs the mock PartnerFI. Those paths are explicit and bounded, but provider selection is still application wiring rather than governed route resolution.

The Adapter Registry workstream removes that coupling without activating any new provider capability.

## Core principles

1. Registry membership does not create service or regulatory authority.
2. Service publication does not create adapter authority.
3. Capability grants remain provider-neutral.
4. Routes bind approved service/capability policy to one reviewed adapter registration.
5. Route provenance is explicit and reconstructable.
6. Unknown, disabled, suspended, environment-mismatched or unsupported adapters fail closed.
7. Sandbox/TestBed/synthetic registrations remain distinct from any future staging/authorized registration.
8. No silent provider fallback after an ambiguous external financial mutation.
9. Secrets are referenced only by opaque handles; secret values never live in registry, catalog, contract or frontend records.
10. Provider health/readiness is not authorization.

## Adapter registration

A registry record should be strict and non-executable metadata, for example:

```yaml
adapterId: adapter_arifpay_sandbox_v1
adapterVersion: 1
partnerClass: PAYMENT_GATEWAY_SYSTEM_OPERATOR
providerKey: ARIFPAY
protocolFamily: ARIFPAY_REST
environment: sandbox
supportedCapabilities:
  - PAY.C2B_CREATE
  - PAY.STATUS_QUERY
configSchemaId: cfg_arifpay_sandbox_v1
credentialRef: secretref_arifpay_sandbox
networkPolicyId: net_arifpay_sandbox
implementationKey: ARIFPAY_SANDBOX_V1
status: REGISTERED_SANDBOX
evidenceRefs: [EV-ARIFPAY-S2]
```

`implementationKey` is an internal allow-listed discriminator. It is not an import path supplied by a partner and cannot load arbitrary code.

### Initial registration states

The current runtime should accept only bounded states needed now:

- `REGISTERED_DISABLED`
- `REGISTERED_SYNTHETIC`
- `REGISTERED_SANDBOX`
- `REGISTERED_TESTBED`
- `SUSPENDED`

Future governance may add separately gated staging/certified/authorized states. Configuration alone must never create those states.

## Route registration

A route is separate from the adapter registration:

```yaml
routeId: route_arifpay_sandbox_c2b
routeVersion: 1
providerOrgId: org_arifpay_sandbox_reference
serviceIds: [svc_arifpay_c2b]
adapterId: adapter_arifpay_sandbox_v1
environment: sandbox
supportedCapabilities: [PAY.C2B_CREATE, PAY.STATUS_QUERY]
status: SANDBOX_BOUNDED
evidenceRefs: [EV-ARIFPAY-S2]
```

For the synthetic PartnerFI references, the route IDs already used by the partner-platform fixtures remain authoritative inputs, including the distinct Alpha and Beta routes.

A route must preserve enough provenance to reconstruct:

```text
service
 -> partner organization
 -> capability grant
 -> route ID/version
 -> adapter ID/version
 -> provider/gateway evidence
 -> resulting authority state
```

Provider evidence remains separate from PartnerFI settlement.

## Resolver contract

The resolver receives an already authenticated/policy-scoped internal context such as:

```text
partnerOrgId
serviceId + catalogVersion
capabilityId
route policy / candidate route IDs
environment
region/object context
mutation state
```

It must:

1. verify the requested route is explicitly allowed by the service catalog;
2. verify the capability contract grants the capability/service/route for the principal context;
3. verify the route registration exists and matches partner/environment/capability;
4. verify the referenced adapter registration exists and matches route/environment/capability;
5. verify the adapter registration state is currently usable for that bounded environment;
6. select deterministically according to the declared route policy;
7. return immutable route + adapter provenance with the typed adapter handle;
8. fail closed if any check is unresolved.

The resolver does not grant authority by itself. It consumes authority decisions and verifies technical routing consistency.

## No unsafe automatic fallback

For read-only requests, an explicitly declared priority order may be used when every candidate is authorized.

For external financial mutations:

- before any external submission, policy may choose one approved route;
- once submission occurs, the route is pinned for that attempt;
- if outcome becomes ambiguous, the transaction becomes reconciliation-required;
- the resolver must not silently switch to another provider/adapter and repost.

This protects idempotency and prevents duplicate execution.

## Adapter families

### Financial Institution

Provider-neutral `FinancialInstitutionAdapter` remains the current seam. The initial registry should expose the synthetic mock PartnerFI through the synthetic PartnerFI route rather than direct demo-API construction.

The Alpha and Beta service/capability differences remain in their contracts/catalogs. A shared reviewed synthetic adapter implementation may serve both if the route/configuration semantics are identical; that must not collapse their organization/capability scopes.

### Payment gateway / system operator

`ArifPaySandboxAdapter` remains the bounded sandbox implementation. Existing exact-host, sandbox-key, network-enable, idempotency and uncertain-outcome controls remain inside the concrete adapter.

The server should resolve the adapter through the registry instead of importing/constructing it as normal route-selection logic.

### Mobile money / payment instrument issuer

Direct Telebirr and M-PESA Ethiopia foundations may be represented in registry metadata only for the operations that are actually implemented and verified.

Registration must **not** mount direct payment initiation or imply provider authorization. Current activation gates remain unchanged.

### Identity, communications, FMCG and fleet

These classes may register reviewed adapters only when a concrete external integration seam exists. A domain planning capability with no external adapter requirement remains an Enawuga domain capability and should not be forced through the registry.

## Credential and configuration handling

Registry metadata may contain only opaque credential references, for example:

```text
secretref_arifpay_sandbox
```

Requirements:

- no secret value in repository, contract, catalog, registry serialization or frontend;
- adapter configuration schemas are strict;
- environment-specific host allowlists remain enforced by the adapter;
- credential access is adapter/environment scoped;
- audit/log output never contains credential values.

The current workstream does not create a production secret store.

## Compile-time registry first

The first implementation is an in-process registry of reviewed factories:

```ts
registry.registerAdapter(metadata, factory)
registry.registerRoute(route)
registry.resolve(request)
```

Factories are compiled into Enawuga and registered by trusted bootstrap code.

Do not dynamically import a path supplied by a partner. Do not evaluate partner-supplied JavaScript. Do not accept executable callback code in contract/catalog/registry records.

Future isolation may move adapters to separate processes/services while preserving the same metadata and certification model.

## Health/readiness vs authority

A registry/readiness view may report:

- adapter registered;
- configuration schema valid;
- credential reference configured;
- network disabled/enabled;
- sandbox/TestBed host valid;
- technical status check available.

These are technical facts only. They must not be presented as PartnerFI settlement authority, production authorization, provider endorsement or regulatory approval.

## Required implementation tests

- duplicate adapter IDs rejected;
- duplicate route IDs rejected;
- unknown adapter on a route rejected;
- unsupported capability rejected;
- environment mismatch rejected;
- provider/partner mismatch rejected;
- disabled/suspended registration cannot resolve;
- route not allowed by the service/catalog cannot resolve;
- capability not granted by the contract cannot resolve;
- deterministic route selection;
- no cross-provider fallback after mutation becomes submitted/ambiguous;
- returned provenance includes route ID/version and adapter ID/version before adapter invocation;
- serialized registry metadata contains no secret values or executable import paths;
- ArifPay sandbox safety checks remain unchanged;
- synthetic Alpha/Beta remain distinct despite shared infrastructure.

## Acceptance criteria

The workstream is complete when:

- normal server route selection no longer directly imports provider-specific adapters;
- the demo PartnerFI is obtained through a registered synthetic route rather than direct global construction;
- existing ArifPay sandbox behavior is obtained through a registered sandbox route without weakening safeguards;
- Telebirr/M-PESA can be represented as disabled/bounded foundations without becoming active payment routes;
- resolver behavior is deterministic and fail-closed;
- route + adapter provenance is available to downstream audit/transaction context;
- no arbitrary third-party executable plug-in mechanism exists.

## Out of scope

- production provider authorization;
- production/staging credential deployment;
- arbitrary marketplace/package upload;
- live PartnerFI posting or settlement;
- real customer PII/funds;
- cross-provider automatic failover for ambiguous financial mutations.
