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
- /hub/economics, /hub/pilot-evidence, /hub/corridor-planning, /hub/readiness, /hub/neutrality governed management dashboards
- /operations/evidence governed offline/reconciliation evidence

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
## F5 governance and operations evidence

F5 adds scoped Neutrality & Scheme Governance and Offline/Reconciliation Evidence surfaces. Neutrality renders E9 review evidence without route substitution/fallback semantics. Operations evidence renders E4 queue/replay/idempotency/reconciliation traces without exposing raw intent facts, raw idempotency keys, credentials or provider payloads. Both remain read-only and preserve the difference between transport evidence and financial/regulated authority.


## F6 Agent field/mobile experience

F6 makes the Agent portal explicitly phone/tablet-first without creating a separate application or client-side authority model. The authenticated `WorkspaceManifest` still determines role, PartnerFI, Hub, region, services and navigation.

The field UX adds browser/device connectivity status, local synthetic outbox count, explicit Stage-4 remote-delivery state, large mobile task controls, a compact primary Agent navigation derived from the server-provided manifest, responsive queue cards, and canonical Wishland navy/teal/gold interaction tokens.

The connectivity indicator MUST NOT be interpreted as provider availability. `navigator.onLine` is only a browser/device network hint. A locally persisted request remains untrusted transport intent and does not prove provider receipt, authorization, posting, reconciliation or settlement.

The mobile primary navigation is a presentation shortcut only. It is derived from the authenticated Agent manifest and never grants routes or capabilities absent from server policy.


## F7 Partner Administration architecture

F7 adds a dedicated `/partner-admin` frontend workspace while preserving the same application, session, workspace manifest and server-side authority model used by every other role. It is not a separate application and does not add a new administrative authority service.

The Partner Administration page is derived from four bounded sources:

1. the authenticated `WorkspaceManifest` for active PartnerFI, Hub, region, environment and provider-foundation state;
2. the active synthetic PartnerFI service catalog for publication/capability inspection;
3. `networkOperationsAccessSummary("PARTNER_ADMIN")` for read-only object-scope presentation;
4. existing neutrality and offline/reconciliation pages for governance/evidence drill-down.

Published catalog inspection is intentionally distinct from role-specific service availability. A service may appear in the published synthetic catalog without being actionable by the Partner Admin role. Catalog presence does not grant capability, route, provider, posting or settlement authority.

`/partners` is now role-scoped at the presentation layer. Agent direct navigation receives a bounded access-denied view. Supervisor, Operations and Partner Admin views filter synthetic partner objects through each object's explicit `authorizedRoles`; route-provenance cards are then limited to route references declared by the visible partner objects. This client filtering improves UI truth and least-visibility presentation but is not a substitute for server authorization.

Playwright may enable privileged synthetic roles only inside the controlled E2E server through `ALLOW_PRIVILEGED_SYNTHETIC_ROLES=true`. Production/default runtime behavior remains fail-closed; the flag does not create production identity or SSO semantics.


## F8 accessibility, resilience and localization readiness

F8 hardens presentation behavior without altering the authenticated workspace authority model. Shared UI now provides a keyboard skip target into the governed main workspace, explicit busy/live-region semantics, a bounded loading/error/empty/denied/unavailable state component, and stronger evidence-drawer modal behavior with focus entry, focus containment, Escape close and focus restoration. Reduced-motion and forced-colors rules improve assistive-technology resilience while status meaning continues to use text/labels rather than color alone.

Localization remains presentation-only. English is the source language; non-English headings are explicitly labeled as previews requiring local-speaker review. F8 does not claim formal WCAG conformance, external accessibility certification or production-quality localization.

## F10 guided presentation architecture

F10 adds `/guided-demo` as a read-only presentation surface inside the same governed workspace shell used by all four roles. The route reads the authenticated `WorkspaceManifest` for display context only and does not introduce an alternate authority or data path. Scene navigation is manual, and the presentation performs no provider calls, business mutations, device commands or voice automation.

The obsolete unmounted voice presenter and zero-byte scene-audio placeholders are removed. Presentation claims now use the same Stage-4 synthetic/non-authority vocabulary as the operational portals, and desktop/mobile Playwright screenshots are diagnostic evidence only, not certification or production proof.
