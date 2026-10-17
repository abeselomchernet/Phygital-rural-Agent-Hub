# D3 Governed Content Bundle Foundation — Phase 2B-1

## Status

`TARGET_STAGE4_INTERNAL` localization/content-governance foundation only.

This slice extends the existing compile-time typed presentation catalog into deterministic, versioned, digest-verifiable content bundles. It does not claim approved translations, regulatory wording approval, field-comprehension validation, or production content release.

## Implemented

- governed locale registry for English, Amharic, Afaan Oromoo, Tigrinya and Somali;
- deterministic content bundle ID, source version and bundle version;
- SHA-256 digest over canonical bundle payload;
- fail-closed bundle digest verification;
- compiled bundle loader for the existing typed catalogs;
- explicit review states rather than a binary translated/not-translated flag;
- Amharic and Afaan Oromoo remain technically complete but local-speaker-review required;
- Tigrinya and Somali exist only as empty, non-selectable stubs;
- canonical workflow/authority identifiers remain language-neutral while display strings localize separately;
- `regulatedWordingApproved=false` remains explicit for every locale.

## Not implemented in this slice

- new Tigrinya or Somali translations;
- professional translation workflow;
- local-speaker review;
- legal/regulatory terminology approval;
- field-comprehension testing;
- signed content bundles;
- offline/PWA content distribution;
- stale-bundle expiry enforcement;
- Ethiopian-calendar display conversion;
- locale-aware currency/number/date formatting;
- extraction of every remaining hardcoded application string.

## Governance boundary

A cryptographic digest verifies bundle integrity against the compiled source. It does not prove that a translation is correct, legally adequate, locally comprehensible, regulator-approved, or safe for a regulated workflow.

The active technical catalogs remain:

- `en`: source canonical technical content;
- `am`: technical catalog complete, local-speaker review required;
- `or`: technical catalog complete, local-speaker review required.

The additional locales remain:

- `ti`: stub only, no content, not selectable;
- `so`: stub only, no content, not selectable.

No fallback silently promotes a stub or unsupported locale into approved content.

## Canonical state rule

Persisted domain states and evidence identifiers remain canonical and language-neutral. For example:

- `QUEUED_FOR_SYNC`
- `PARTNER_AUTH_PENDING`
- `GATEWAY_CONFIRMED_NOT_SETTLED`
- `EXPIRED_NOT_REJECTED`

Only their presentation labels are localized. Display language must never mutate domain state or authority semantics.

## Next bounded D3 slices

1. extract additional hardcoded UI strings into governed catalogs;
2. implement locale-aware date/number/currency formatting;
3. implement verified Ethiopian-calendar display conversion while retaining UTC/ISO canonical storage;
4. introduce content lifecycle metadata and stale-offline-bundle policy;
5. add optional signed content-bundle verification after the D2 signing foundation exists;
6. add offline asset/content caching without self-approving translation content.

All future slices must preserve `syntheticOnly=true`, `etResidencyApproved=false` and `regulatedModeAllowed=false`.