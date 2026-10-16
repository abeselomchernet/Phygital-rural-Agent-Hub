# F8 Accessibility, Resilience and Localization Readiness

## Status

Frontend workstream F8 hardens the Stage-4 Enawuga portal presentation without adding backend authority or changing domain decisions.

This work is an internal accessibility/resilience readiness pass. It is **not** a claim of formal WCAG certification, external accessibility audit, production localization approval, or regulated deployment readiness.

## Scope

F8 adds shared interaction and state patterns across the role-aware frontend:

- keyboard-visible skip navigation to the governed main workspace;
- explicit busy/live-region semantics for workspace changes and loading states;
- a reusable `BoundedState` pattern for loading, unavailable, empty, denied and error states;
- stronger keyboard behavior for the evidence drawer, including initial focus, Escape close, focus trapping and focus restoration;
- minimum control/touch target sizing for shared form controls and mobile workspace navigation;
- reduced-motion support and forced-colors fallbacks;
- non-color state communication through icons plus explicit labels/text;
- responsive preservation of role, environment and authority context;
- a catalog-backed three-language presentation/workspace chrome with explicit machine-visible local-speaker-review and regulated-wording status.

## Governed state semantics

`BoundedState` is presentation-only. It does not infer server state or transform missing evidence into success.

- `loading`: authenticated/read-model work is pending;
- `error`: the requested governed read failed;
- `empty`: a successful read returned no scoped evidence/model;
- `denied`: the active role cannot access the presentation surface;
- `unavailable`: required authenticated workspace context is absent.

These labels remain separate from domain statuses such as `PASS`, `REVIEW_REQUIRED`, `UNKNOWN` or `NOT_AUTHORIZED`.

## Evidence drawer keyboard contract

When an evidence drawer opens, focus moves to the close control. Tab/Shift+Tab remain inside the modal, Escape closes the drawer, background scrolling is suppressed while open, and focus is restored to the element that opened the drawer.

The drawer also exposes a stable authority reminder: evidence visibility does not grant approval, execution, settlement or production authority.

## Localization readiness

English remains the implementation/source language. The later audit-closure localization gate replaces the heading-only preview with a type-checked local catalog for presentation shell and governed workspace chrome in English, Amharic and Afaan Oromoo. Amharic and Afaan Oromoo remain review-gated content: `localSpeakerReviewRequired` is true and `regulatedWordingApproved` is false.

Technical catalog completion is not linguistic approval. The UI exposes the review state visibly and through machine-readable attributes, and unknown future workspace labels fall back to the server-provided English label rather than fabricating a translation. Canonical product/provider identifiers, evidence references, environment values, domain status codes and authority state machines remain immutable.

F8 and the follow-on localization gate do not claim formal linguistic, legal, financial-services or production UX approval. See `docs/governance/AUDIT_CLOSURE_LOCALIZATION.md` for the closure scope and remaining external review requirements.

## Responsive and assistive-technology boundary

Shared styles add narrow-width touch targets, reduced-motion handling and forced-colors fallbacks. Existing Agent, Supervisor, Operations and Partner Admin layouts remain role-specific; F8 does not replace them with a single generic layout.

No UI accessibility treatment is authorization. No skip link, focus state, status announcement, responsive layout or language presentation can create a capability absent from the authenticated workspace/server policy.

## Validation expectations

The F8 change must pass:

- focused F8 component/state tests;
- existing frontend role/access regression tests;
- Playwright keyboard/evidence/mobile checks;
- the full unit/integration suite;
- the full Playwright suite;
- lint, production build and `git diff --check`;
- hosted Linux CI on the exact PR head before merge.
