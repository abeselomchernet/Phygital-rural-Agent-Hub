# Frontend Delivery Plan

## Goal

Turn the governed Stage-4 backend into one coherent role-based Enawuga product without widening authority.

This delivery plan uses frontend workstream identifiers `F1`–`F11`. They are not backend epic identifiers. In particular, frontend `F10` does not unlock backend Epic E10 Inclusion Analytics.

## Implementation status

- F1 - MERGED: role-aware shell, governed Hub context, Wishland design foundation.
- F2 - MERGED: Hub service composition and reusable evidence/status UX.
- F3 - MERGED: Hub Economics and Pilot Evidence dashboards.
- F4 - MERGED: Corridor Planning, Operator/Device Readiness and official Wishland brand asset synchronization.
- F5 - MERGED: Neutrality Governance and Offline/Reconciliation Evidence.
- F6 - MERGED: Agent phone/tablet UX, browser/offline status, bounded queue presentation and branded field interaction patterns.
- F7 - MERGED: Partner Administration portal refinement, role-scoped ecosystem evidence and governed test-mode role journeys.
- F8 - MERGED: accessibility, responsive resilience and localization-readiness hardening.
- F9 - MERGED: end-to-end role journeys and visible claim audit.
- F10 - MERGED: guided demo and presentation polish.
- F11 - ACTIVE BOUNDED WORKSTREAM: runtime truth, context safety, authoritative navigation and role-portal convergence; status does not grant new authority.

## F1 — Role-aware shell, Hub context and dashboards

Deliver:

- formal Wishland/Enawuga application design tokens;
- role portal header and responsive navigation shell;
- Hub/partner/role/region/environment context;
- role-specific home dashboards;
- governed Hub overview route;
- frontend architecture and brand/design documentation;
- regression tests for Hub context and role navigation.

No new backend authority.

## F2 — Hub overview, services and evidence pattern

Deliver:

- richer Hub Overview backed by Hub/service APIs;
- service/capability composition panel;
- shared status vocabulary components;
- reusable evidence drawer/provenance panel;
- explicit loading/empty/unknown/access-denied patterns.

## F3 — Economics and Pilot Evidence

Deliver:

- Hub Economics dashboard using E5 read models;
- model-assumption vs model-output labels;
- Pilot Evidence P1–P11 workspace using E6;
- exact gate vocabulary and no-authorization banner;
- evidence-detail integration.

## F4 — Corridor Planning and Readiness

Deliver:

- corridor candidate comparison using E7;
- bounded recommendation states;
- explicit `Geographic authorization: NOT GRANTED` treatment;
- operator/device readiness dashboard using E8;
- evidence/limitations actions with no device-control verbs.

## F5 — Neutrality and Operations Evidence

Deliver:

- E9 neutrality/governance dashboard;
- E4 offline/reconciliation evidence integration;
- exception/evidence queues for Operations;
- activity/provenance timeline components.

## F6 — Agent field/mobile UX

Deliver:

- phone/tablet-first Agent dashboard;
- large task controls;
- connectivity/offline/sync state;
- bounded queue language;
- agent readiness/learning integration;
- Farmer 360 and service launcher consistency.

## F7 — Partner Administration refinement

Deliver:

- partner profile/service capability views;
- provider/environment/route provenance;
- access/scope presentation;
- governance/evidence views;
- configuration UI that never implies activation authority.

## F8 — Accessibility, responsive and localization readiness

Deliver:

- keyboard/focus/semantic audit;
- narrow/tablet/desktop responsive pass;
- non-color status cues;
- error/empty/loading/unknown state audit;
- localization extraction/readiness;
- reviewed-language gating.

## F9 — End-to-end role journeys and claim audit

Deliver Playwright journeys for:

- Alpha Agent and Beta Agent isolation;
- Supervisor Hub decision support;
- Operations reconciliation/evidence;
- Partner Admin governance/configuration;
- direct URL denial;
- Stage-4 synthetic/non-authority persistence across screenshots/routes.

## F10 — Presentation and demo polish

Deliver:

- guided demo/presentation mode separate from operational portal semantics;
- final visual consistency pass;
- screenshot/readability verification;
- removal of obsolete presentation fragments where safely superseded;
- final frontend implementation documentation.

## F11 — Role portal visibility and product experience convergence

F11 converges the current frontend without treating the four implemented functional roles as the complete long-term architecture.

Current functional runtime roles remain `AGENT`, `SUPERVISOR`, `OPERATIONS`, and `PARTNER_ADMIN`. Wave D v1.1.1 also defines `PARTNERFI_REVIEWER`, `AUDITOR`, and `PILOT_REVIEWER` as TARGET_STAGE4_INTERNAL roles. Those target reviewer roles are not activated by F11A/B, are not added to the current functional workspace switcher, and do not imply external authentication, partner access or institutional acceptance.

F11A/B establishes explicit runtime states, truthful static-showcase presentation, fail-closed cross-role navigation, customer-context consistency and manifest-authoritative functional navigation. Static showcase descriptors are presentation metadata only and cannot become authenticated `WorkspaceManifest` objects.

The product taxonomy remains: role/workspace = who is acting; service = service domain; capability = what can be performed or inspected; projection = what data the role may see; route = governed resolution; adapter = provider-specific integration. `SERVICE != CAPABILITY != ROUTE != ADAPTER` remains invariant.

Wave A/B/C/D capability families may be discoverable in a static architecture showcase only with truthful status labels such as CURRENT_IMPLEMENTED, TARGET_STAGE4_INTERNAL, FUTURE_EXTERNAL_DEPENDENT or RESEARCH/EXTERNAL_REVIEW_REQUIRED. Discoverability creates no authority and does not implement PAYG, climate/insurance, eKUB, external reviewer access or D6 sharing.
## Backend E10 remains gated

Backend Epic E10 Inclusion Analytics is not unlocked by frontend work. It remains subject to approved purpose, approved data fields, privacy/legal review and partner policy. No frontend dashboard may self-authorize collection of sensitive data.

## Definition of Done for each frontend PR

Each PR must be independently reviewable and include:

- bounded scope and authority/non-claims;
- typed data use;
- focused tests;
- full lint/test/build validation;
- hosted Linux CI on exact head before merge;
- responsive/accessibility consideration appropriate to the PR;
- documentation update when architecture or design-system decisions change.

## F10 completion record

F10 is implemented as a bounded `/guided-demo` route with five read-only scenes, governed workspace context, desktop/mobile screenshot-readability coverage, removal of the obsolete voice presenter/audio placeholders, and final presentation claim hardening. F10 does not unlock backend E10 or any production/provider/settlement authority.
