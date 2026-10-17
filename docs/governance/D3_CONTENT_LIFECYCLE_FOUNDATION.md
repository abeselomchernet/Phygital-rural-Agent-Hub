# D3 Governed Content Lifecycle — Phase 2B-2

## Status

`TARGET_STAGE4_INTERNAL` content-governance activation foundation only.

This slice adds the review, compatibility, freshness, staleness, expiry and revocation gate around the deterministic content bundle introduced in Phase 2B-1. It does not mark any existing translation as reviewed, legally sufficient, regulator approved or production-ready.

## Design decomposition

The immutable content bundle and its activation manifest are deliberately separate:

- **content bundle**: locale-specific text + canonical terminology + immutable digest;
- **activation manifest**: internal review evidence, application namespace compatibility, effective/freshness metadata, sensitivity class, fallback policy and revocation state.

This avoids changing the content digest merely because deployment/review metadata changes while still binding activation to the exact bundle digest.

## Implemented lifecycle states

- `CURRENT_CONTENT`
- `STALE_CONTENT_REVIEW_REQUIRED`
- `EXPIRED_SENSITIVE_CONTENT`
- `EXPIRED_CONTENT_REVIEW_REQUIRED`
- `CONTENT_SIGNATURE_OR_DIGEST_INVALID`
- `CONTENT_VERSION_INCOMPATIBLE`
- `CONTENT_NOT_GOVERNANCE_APPROVED`
- `CONTENT_NOT_YET_EFFECTIVE`
- `CONTENT_REVOKED`

No state means regulator approval, regulator notification, legal sufficiency or external certification.

## Review evidence gate

Activation requires internal evidence references for:

- domain review;
- governance approval;
- local-speaker review for every non-English locale;
- legal review when internal policy marks the wording as legally sensitive.

`NOT_REQUIRED_BY_INTERNAL_POLICY` means only that the configured internal content policy did not require legal review for that content class. It is not a legal conclusion and cannot override applicable law or external requirements.

## Freshness boundary

There is deliberately **no universal numeric validity window** in this implementation. The activation manifest receives explicit `effectiveAt`, `staleAt` and `expiresAt` timestamps. Their values remain policy/configuration inputs requiring field, content, legal/privacy and operational validation where applicable.

The implementation enforces chronology but does not invent 30/60/90/120-day rules.

## Sensitive content boundary

`SENSITIVE_AUTHORITY_OR_CONSENT` covers content whose wording can materially affect understanding of authority, consent, privacy, payment, insurance, obligation or comparable sensitive state.

Stale or expired sensitive content fails closed for sensitive presentation. A content gate passing does **not** authorize the underlying financial, regulated or provider action. Domain authorization remains independent.

A configured source-language fallback may be requested only as an **approved source-language fallback with disclosure**. This slice does not decide that an English fallback is approved for any particular legal or regulated workflow.

## Integrity / compatibility

Activation requires:

- valid content-bundle digest;
- exact manifest-to-bundle digest binding;
- matching locale;
- matching required application/content namespace version.

Signature verification is intentionally not integrated yet because the D2 signing foundation is a separate Phase 2A slice. The lifecycle state name `CONTENT_SIGNATURE_OR_DIGEST_INVALID` preserves the target architecture vocabulary; in this slice only digest verification is active.

## Revocation

A revoked activation manifest fails closed even when the underlying immutable content bundle remains digest-valid. Revocation does not delete historical content evidence and does not grant authority to mutate external systems.

## Not implemented here

- actual review evidence issuance workflow;
- legal/regulatory approval;
- signature binding to content bundles;
- offline/PWA distribution;
- automatic content update;
- field-comprehension testing;
- Ethiopian calendar conversion;
- locale number/currency/date formatting;
- production content activation.

## Next bounded D3 work

1. integrate the D2 signature envelope after the signature PR is merged;
2. implement governed offline cache/distribution metadata and fail-safe stale handling;
3. add locale-aware number/currency/date formatting;
4. add Ethiopian-calendar display conversion only with authoritative vectors and boundary tests;
5. continue extraction of remaining hardcoded presentation strings.

All future work must preserve `syntheticOnly=true`, `etResidencyApproved=false` and `regulatedModeAllowed=false`.