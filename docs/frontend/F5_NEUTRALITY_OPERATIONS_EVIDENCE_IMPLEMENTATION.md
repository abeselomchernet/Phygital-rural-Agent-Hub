# F5 ? Neutrality Governance & Operations Evidence

## Scope

F5 surfaces existing E9 Neutrality & Scheme Governance and E4 Offline Operations Evidence inside the Wishland/Enawuga role-based frontend. It does not add a route-selection engine, partner preference mechanism, settlement workflow or mutation endpoint.

## Routes

- `/hub/neutrality` ? Supervisor, Operations and Partner Admin navigation to E9 read-only governance evidence.
- `/operations/evidence` ? Operations and Partner Admin navigation to E4 offline/reconciliation read evidence.

Agent navigation remains bounded. Server authorization remains authoritative for direct requests.

## Neutrality UX

The E9 dashboard presents the versioned seven-rule policy, route-equivalence comparisons, conflict/incentive disclosure fixtures, policy change history and exact neutrality state. `NO_SYNTHETIC_EXCEPTION_IDENTIFIED` is explicitly described as a bounded synthetic state, not production neutrality, independent audit assurance or regulatory/commercial approval.

Route comparisons retain `routeInterchangeable: false`, `fallbackAuthorized: false` and `automaticRouteSelectionAuthorized: false`. `EQUIVALENT_FOR_SYNTHETIC_REVIEW` means governance eligibility comparison only and cannot be rendered as interchangeable providers/routes.

The neutrality digest is surfaced only as an integrity reference. The read model contains no real commercial-incentive data or external audit evidence.

## Operations Evidence UX

The E4 dashboard presents correlation-scoped traces, latest transport/authority/outcome, queue age, retries, duplicate/conflict/reconciliation flags, ordered timelines and minimized evidence-record projections.

The UI does not expose raw intent facts, raw idempotency keys, credentials or provider payloads. Client queue/local receipt remains untrusted for authority. Remote/transport acceptance does not imply PartnerFI posting, financial authority or settlement.

Optional correlation filtering is server-scoped and does not broaden object visibility. Empty results remain empty rather than being interpreted as success.

## Wishland / Enawuga design

F5 uses the official Wishland wordmark/palette token system synchronized in F4 and the shared `GovernedStatus` / `EvidenceDrawer` patterns from F2-F4. Governance and exception data use semantic states with text labels; color alone never communicates approval or denial.

## Non-claims

F5 does not add or imply live route mutation, automatic routing, provider substitution, commercial preference authority, independent audit acceptance, real incentive data, live provider calls, real funds, PartnerFI posting/settlement, production routing or regulated authority.

## Validation

Merge readiness requires focused F5/E9/E4 tests, full repository tests, lint/typecheck, production build, Playwright coverage, `git diff --check` and exact-head hosted Linux CI.
