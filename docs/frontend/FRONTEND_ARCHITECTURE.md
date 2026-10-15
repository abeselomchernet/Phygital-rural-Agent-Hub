# Enawuga Frontend Architecture

## 1. Purpose

The Enawuga frontend is one governed application with role-specific portals, not a collection of unrelated dashboards. It translates the existing Stage-4 backend capabilities into a coherent product experience while preserving the repository authority model.

Wishland Networking PLC remains the technology/software/orchestration provider. The frontend never creates financial, settlement, geographic, identity, provider, device-control or production authority that is absent from the server/domain model.

## 2. Portal model

One React application exposes four role-specific product surfaces from the authenticated workspace manifest:

| Role | Portal | Primary question |
| --- | --- | --- |
| Agent | Agent Workspace | What can I safely do for the customer now? |
| Supervisor | Hub Operations | How is this Hub/region performing and what needs attention? |
| Operations | Operations & Reconciliation | What failed, is uncertain, or needs evidence/reconciliation? |
| Partner Admin | Partner Administration | What partner services, scopes, provider states and governance evidence are visible? |

The role is session-derived. The client may switch only among server-permitted workspaces for the current role. Role switching is a controlled synthetic-development concern, not an end-user authorization mechanism.

## 3. Application shell

The shared shell has five layers:

1. Wishland/Enawuga product header and Stage-4 environment marker.
2. Governed workspace context: PartnerFI, role, region, Hub and environment.
3. Role navigation generated from `WorkspaceManifest.navigation`.
4. Portal content for the current route.
5. Persistent authority boundary language and provider/evidence state where applicable.

Desktop uses a sidebar/content layout for Supervisor, Operations and Partner Admin. Agent remains task-first and collapses cleanly for phone/tablet use.

## 4. Frontend route families

Current and planned governed route families are:

- `/` role home/dashboard
- `/hub` governed Hub overview
- `/kiosk`, `/farmer-360`, `/queue`, `/onboard`, `/academy` Agent workflows
- `/supervisor`, `/liquidity`, `/cash-fleet`, `/fmcg` Supervisor operations
- `/operations`, `/network-operations`, `/partners` Operations/Partner administration
- future Hub workspace surfaces: economics, pilot evidence, corridor planning, operator/device readiness, neutrality and operations evidence

Future screens must use the existing backend read APIs and exact domain vocabulary rather than inventing parallel client state.

## 5. Authority and navigation rules

Navigation visibility is convenience, not security. Server authorization remains authoritative for every API request.

Frontend rules:

- never infer authority from a visible card, route or button;
- never turn provider success into settlement/finality;
- never turn a recommendation into approval;
- never turn client queue persistence into provider acceptance;
- never display fabricated zero values for unavailable data;
- render explicit UNKNOWN/UNAVAILABLE states;
- preserve PartnerFI/tenant/Hub/object isolation in links, data loaders and search.

## 6. Frontend data architecture

Pages consume typed client functions, not ad-hoc fetch logic. The intended structure is:

`server/domain -> typed API client -> workspace/feature hooks -> presentational components`

Shared context contains only presentation-safe workspace facts such as role, partner, Hub, region, service manifest and bounded provider state. Mutating authority is never stored or granted in client context.

## 7. Design-system layers

The frontend design system is split into:

- brand tokens: Wishland/Enawuga color, typography, spacing and surfaces;
- semantic tokens: success/evidence/review/unknown/denied states;
- primitives: buttons, cards, chips, tables, banners, drawers, tabs and empty states;
- patterns: portal header, Hub context, metric summary, evidence drawer, exception list and activity timeline;
- page templates: task portal, management dashboard, evidence/reconciliation console and administration console.

Status color is never the sole carrier of meaning; labels/icons/text remain required.

## 8. Role-specific UX

### Agent

Phone/tablet-first, large touch targets, minimal typing, connectivity visibility, short workflows, explicit queued/submitted/provider states, and no dense management analytics.

### Supervisor

Hub-centric decision support with Overview, Services, Liquidity, Economics, Pilot Evidence, Corridor, Readiness and Neutrality surfaces. Recommendations remain non-authoritative.

### Operations

Exception/evidence-first queues: reconciliation, ambiguous outcomes, replay/idempotency, provider state, route provenance, offline aging and activity timelines.

### Partner Admin

Institution-scoped services, capabilities, provider/environment state, access scopes, evidence/certification and governance. Configuration visibility never becomes provider/payment/settlement authority.

## 9. Evidence UX

Evidence is a first-class interaction. Governed metrics should expose `View evidence` and use a reusable drawer containing, when available:

- source/evidence class;
- evidence reference;
- schema/version;
- digest/integrity reference;
- evaluated/recorded time;
- synthetic/observed/external classification;
- limitation/non-claim;
- authority implication.

The UI must visually distinguish data, evidence, interpretation, recommendation and authorization.

F2 implements the first shared evidence primitives in `EvidenceDrawer` and `GovernedStatus`. Hub service composition consumes the authenticated `/api/demo/hubs/:hubId/services` response and exposes server-provided evidence references without reconstructing capability state in the client.

F3 extends the Hub workspace with scoped Economics and Pilot Evidence dashboards. The browser presents E5/E6 read models and exact domain statuses; it does not calculate alternative economics, re-score gates or turn model/evidence state into authorization.

F4 extends the same governed Hub workspace with Corridor Planning and Operator & Device Readiness. Corridor comparison renders E7 synthetic evidence completeness/readiness and recommendation states without maps or exact coordinates that could imply site approval. Readiness renders E8 training/certification/device/support evidence without real identities, telemetry, remote-control controls or automatic return-to-service. Both surfaces reuse the Wishland/Enawuga tokens, semantic statuses and EvidenceDrawer rather than creating a parallel visual system.

## 10. Responsive behavior

- Agent: phone/tablet first.
- Supervisor: tablet/laptop first.
- Operations and Partner Admin: laptop/desktop first.
- All portals remain usable at narrow widths and retain environment/authority context.

Desktop side navigation becomes stacked navigation on narrow viewports. Tables require responsive alternatives or horizontal containment.

## 11. Accessibility and localization

Accessibility requirements include semantic headings, keyboard navigation, visible focus, screen-reader labels, touch targets, adequate contrast, field/error association and non-color status cues.

English is the implementation source language. Amharic and Afaan Oromo are presentation/localization targets and require local-speaker review before being represented as production-quality translations. Canonical IDs/status codes are never translated.

## 12. Error, empty and uncertainty states

Every governed screen must deliberately support loading, no access, no evidence, partial evidence, network unavailable, session expired, server rejection and UNKNOWN states.

Absence of evidence must not be rendered as PASS. A rejected or unavailable API call must not fall back to fabricated operational data.

## 13. Testing strategy

Frontend Definition of Done includes:

- unit/domain tests for workspace/navigation contracts;
- component tests for role visibility and semantic status rendering;
- Playwright role journeys for Agent, Supervisor, Operations and Partner Admin;
- direct-URL authorization/denial checks;
- cross-PartnerFI isolation checks;
- mobile/responsive smoke coverage;
- claim-control regression checks for Stage-4 wording.

## 14. Stage-4 boundary

The frontend is a synthetic decision-support and workflow demonstration surface. It does not prove or grant live institutions, real funds, production settlement, live identity, production provider access, regulated pilot approval, geographic authorization or device-control authority.