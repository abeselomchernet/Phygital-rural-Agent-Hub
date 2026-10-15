# F2 ? Hub Service Composition & Evidence UX

## Scope

F2 builds on the F1 role-aware Wishland/Enawuga shell and turns the governed Hub overview into a data-backed workspace. It remains read-oriented Stage-4 frontend integration and does not add backend capability or authority.

## Delivered

- typed Hub service client for `/api/demo/hubs/:hubId/services`;
- Hub Overview service/capability composition backed by the authenticated server response;
- explicit loading, unavailable, empty and unavailable-decision states;
- reusable governed-status component;
- reusable evidence drawer with classification, evidence references, schema version, limitation and authority implication;
- explicit rendering of unavailable decisions rather than fabricated zero/PASS values;
- retained Wishland/Enawuga branding and Stage-4 authority markers.

## Data and authority architecture

The frontend does not reconstruct service availability. The server-generated `HubServiceWorkspaceManifest` remains authoritative for Hub/PartnerFI/role scoped offerings and decisions. The client only presents the returned state.

Navigation remains convenience rather than security. API authorization continues to be enforced server-side.

## Evidence pattern

The first reusable evidence pattern is intentionally conservative. It surfaces evidence references already present in the service composition domain and states that synthetic composition evidence does not prove live provider execution, PartnerFI posting, settlement or production authority.

This component is the base for later Economics, Pilot Evidence, Corridor, Readiness and Neutrality evidence views; those domains will provide richer field-specific evidence metadata in their own bounded frontend increments.

## Uncertainty semantics

F2 does not convert absence into zeros. When the API is unavailable, the UI says `UNAVAILABLE`. When a service decision is not available, the decision code remains visible. Unknown/missing/review/denied status families use shared semantic treatment while preserving the original canonical status text.

## Non-claims

F2 does not add or imply:

- provider activation or live provider execution;
- real funds, posting or settlement;
- production authentication or production readiness;
- regulated approval or geographic authorization;
- device-control authority;
- external evidence acceptance.

## Validation

Merge readiness requires focused F2 tests, the full repository suite, lint/typecheck, production build, Playwright UI coverage, `git diff --check`, and exact-head hosted Linux CI.
