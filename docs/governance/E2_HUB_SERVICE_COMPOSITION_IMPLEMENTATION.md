# E2 Hub Service Composition Implementation

## Status

Implemented as the next bounded Stage-4 engineering epic after the merged E1A-E1E Hub foundation. The implementation is synthetic-only and does not change the program authority stage.

## Purpose

E2 makes a customer-facing Hub service an explicit governed composition rather than a standalone UI promise.

The required chain is machine-evaluated as:

```text
Hub -> Service -> Capability -> Route -> Adapter -> Partner -> Environment
```

A service is emitted as an available Hub offering only when every link in that chain is present and allowed for the current synthetic principal and Hub context.

## HubServiceOffering contract

`src/domain/hubServiceComposition.ts` adds strict schemas for:

- Hub-to-service configuration bindings;
- per-service composition decisions;
- per-capability authorization decisions;
- route and adapter provenance;
- `HubServiceOffering`;
- a capability-driven `HubServiceWorkspaceManifest`.

Each available offering includes:

- Hub, PartnerFI and service identity;
- service type and workflow template;
- exact required capability bindings;
- capability grant identity and state;
- route ID and route version;
- adapter ID and adapter version;
- provider/protocol provenance;
- environment and evidence references;
- explicit Stage-4 authority literals.

The output does not expose credential references, adapter configuration schema identifiers, implementation keys, provider secrets or raw provider payloads.

## Configuration is not authority

The Hub service binding contains only the Hub, partner, service reference, synthetic enable/disable state and evidence references. It does not contain a capability grant, route, adapter or provider authority override.

The generator derives authority from the already governed partner catalog, capability contract and registered route/adapter graph. Therefore adding a binding cannot manufacture a capability that the partner contract does not grant.

Removing or disabling a binding can remove a service from a Hub. It cannot widen authority.

## Per-capability enablement gate

Every required capability is re-evaluated through the existing partner capability contract evaluator. A service is emitted only if all required capabilities return `ALLOW` under the current:

- partner membership;
- role;
- region;
- agent-group scope;
- service scope;
- capability-grant state;
- effective/expiry state;
- Stage-4 runtime policy;
- route scope;
- route availability;
- evidence requirements.

A disabled or otherwise blocked capability removes the whole service offering and preserves the underlying capability decision in the decision matrix.

## Route authorization and denial matrix

The Hub manifest records a decision for every catalog service considered for the current partner. Denial codes include Hub lifecycle/membership/configuration failures, role/region/agent-group/service scope failures, route/provider/service/capability mismatches, missing adapter metadata and underlying capability denial.

A route must be present in the current usable route graph and its registration must match:

- the active partner;
- the service;
- every required capability;
- the selected adapter;
- the contract environment.

The adapter registration must also match the resolved route and environment. Missing or inconsistent provenance fails closed.

## Shared-Hub isolation

The synthetic Adama Hub remains shared by PartnerFI Alpha and PartnerFI Beta, but composition occurs only after the active PartnerFI scope is established.

Alpha Agent composition exposes Alpha account lookup, cash-in and cash-out synthetic offerings. Beta Agent composition exposes Beta account lookup, savings inquiry and savings service request. The same Hub therefore produces materially different role-safe partner projections without partner-specific page forks.

The Alpha Supervisor projection exposes the governed NLC read service only.

## Hub lifecycle gate

The synthetic Arisi Alpha Hub has service bindings configured for future use, but its current `PLANNED_SYNTHETIC` lifecycle blocks all offerings. This demonstrates that configuration visibility is not service authority.

## Workspace integration

`generateSyntheticWorkspaceForSession()` now derives the existing UI service manifest from the E2 Hub composition result for the session's single assigned synthetic Hub. Existing workspace navigation and service tiles therefore consume only Hub offerings that have passed the full composition gate.

This preserves the existing UI contract while adding the missing Hub layer beneath it. Legacy or static UI presence is never treated as capability evidence.

## Read-only API

E2 adds:

```text
GET /api/demo/hubs/:hubId/services
```

The route:

- requires the existing synthetic authenticated session;
- reuses E1A Hub authorization with the role-appropriate Hub purpose;
- derives PartnerFI scope from the authenticated session rather than query input;
- builds a strict current principal from the session scope;
- returns the E2 Hub service workspace manifest;
- exposes no mutation endpoint.

A caller cannot choose another PartnerFI through query parameters. Inaccessible or unassigned Hubs fail through the existing E1A Hub-access boundary.

## Authority boundaries

Every valid E2 manifest records:

- `stage: STAGE_4`;
- `syntheticOnly: true`;
- `uiPresenceIsCapabilityEvidence: false`;
- `configurationGrantsAuthority: false`;
- `providerSuccessIsSettlement: false`;
- `liveNetworkAllowed: false`;
- `productionAuthorityGranted: false`.

Every emitted offering separately records:

- `syntheticOnly: true`;
- `liveNetworkAllowed: false`;
- `settlementAuthorityGranted: false`;
- `productionAuthorityGranted: false`.

E2 adds no real PII, real funds, cash movement, PartnerFI posting or settlement, production authentication, live identity access, provider callback authority, device/firmware control, production signing or regulated production authority.

It does not activate Telebirr, M-PESA, ArifPay or any other live provider route. Existing provider-foundation and sandbox boundaries remain unchanged.

## Validation

Exact local Windows validation on the E2 implementation state:

- E2 focused domain/API tests: **12/12 passed**;
- cumulative E1A-E2 Hub plus workspace tests: **71/71 passed**;
- TypeScript `tsc --noEmit` / `npm run lint`: **passed**;
- production Vite build: **passed**;
- `git diff --check`: **passed**;
- full repository suite: **303/310 passed**.

The seven full-suite failures are the same established Windows persistence/fsync baseline in the M-PESA/Telebirr durability subset. E2 adds no payment/provider persistence path and introduces no new full-suite failure.

E2-focused tests cover:

- complete Hub -> Service -> Capability -> Route -> Adapter provenance;
- shared-Hub Alpha/Beta isolation;
- per-capability grant denial;
- missing route and adapter provenance;
- configuration-only service removal;
- planned-Hub lifecycle denial;
- Supervisor NLC-only composition;
- credential/configuration redaction;
- authenticated read-only Hub API behavior;
- existing workspace compatibility after Hub composition integration.

No E2 test failed in the full repository run. Linux GitHub Actions remains the authoritative hosted merge gate when a workflow is registered for the exact PR head.

## Next gate

After E2 is merged through the normal review and CI gate, the next governed backlog epic is E3 Hub Liquidity Intelligence. E3 must remain Stage-4 synthetic decision support and must not infer prudential LCR, cash-dispatch authority or automatic cross-rail movement authority.
