# Audit Closure — Technical Localization Completion

## Purpose

This gate closes the technical localization-readiness item in the approved Stage-4 audit-closure sequence. It does **not** certify linguistic, legal, financial-services, consumer-protection, accessibility, or production localization quality.

The implementation is deliberately narrower than a national localization program. It completes a governed catalog and projection mechanism for the current presentation shell and role/workspace chrome in:

- English (`en`) — source language;
- Amharic (`am`) — technical catalog complete, local-speaker review required;
- Afaan Oromoo — internal legacy key `or`, rendered with BCP-47 `lang="om"`; technical catalog complete, local-speaker review required.

## Architecture

`src/localization/presentationCatalog.ts` is a zero-dependency, local catalog. TypeScript enforces identical key coverage across all three language catalogs. The catalog contains:

- presentation shell headings and navigation;
- role portal headings and descriptions;
- workspace navigation group/item labels;
- shared bounded-state / workspace chrome messages;
- provider-readiness and authority-boundary wording;
- a small terminology-governance register for the audit-critical distinctions:
  - queued for sync != submitted;
  - PartnerFI authorization pending != approved;
  - gateway confirmed != PartnerFI settlement;
  - expired != rejected.

`PresentationLocalizationProvider` exposes the selected display language as a read-only presentation concern. Canonical server/domain identifiers, environment values, provider identifiers, role identifiers, evidence references, route/adapter identifiers, and authority state machines are not translated or mutated.

## Review status is machine-visible

Each locale carries explicit metadata:

- `technicalCatalogComplete`;
- `localSpeakerReviewRequired`;
- `regulatedWordingApproved`.

Amharic and Afaan Oromoo are hard-coded as `localSpeakerReviewRequired: true` and `regulatedWordingApproved: false`. The rendered shell exposes the same boundary through `data-local-speaker-review` and `data-regulated-wording-approved="false"` attributes plus visible status text.

This means technical coverage can be tested without allowing the software to self-certify translation quality.

## Fallback behavior

Known governed workspace group/item IDs use catalog labels. Unknown future IDs fall back to the server-provided English label rather than fabricating a translation. This preserves forward compatibility and makes missing localization visible instead of silently inventing content.

## Accessibility / layout hardening

The shared presentation CSS now:

- permits the language control to wrap instead of forcing horizontal overflow;
- gives long local-script review messages bounded wrapping;
- uses the correct document-language hint (`am` or `om`) on the localized shell;
- increases line-height for Amharic and Afaan Oromoo presentation shells;
- preserves narrow 390px rendering without horizontal overflow.

No formal WCAG certification is claimed.

## Validation contract

The gate adds tests for:

- identical, non-empty catalog key coverage in all three languages;
- explicit human-review and regulated-wording metadata;
- complete workspace navigation maps with English fallback for unknown future IDs;
- critical terminology distinctions;
- Amharic and Afaan Oromoo narrow-viewport rendering;
- localized governed workspace chrome while canonical authority/environment identifiers remain unchanged;
- full existing unit/integration and Playwright regressions.

Hosted Linux CI on the exact PR head remains the merge gate.

## Explicit non-claims / remaining external work

This gate does **not** claim:

- local-speaker approval;
- certified financial/legal translation;
- NBE-approved terminology;
- national language coverage;
- Tigrinya, Somali, Afar, Sidama, or other rollout-language completion;
- Ethiopian calendar implementation;
- translation of every domain-page sentence;
- field comprehension validation;
- external accessibility certification;
- production or controlled-live-pilot readiness.

Those remain separate research, human-review, field-validation, legal/policy, and future architecture/pilot dependencies. Stage 4 remains synthetic and all existing authority boundaries remain unchanged.
