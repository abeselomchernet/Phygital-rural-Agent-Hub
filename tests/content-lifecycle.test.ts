import assert from "node:assert/strict";
import test from "node:test";

import { buildGovernedContentBundle } from "../src/localization/governedContentBundle";
import {
  ContentActivationManifestSchema,
  evaluateContentActivation,
} from "../src/localization/contentLifecycle";

const bundle = buildGovernedContentBundle("en");

function manifest(overrides: Record<string, unknown> = {}) {
  return ContentActivationManifestSchema.parse({
    manifestVersion: 1,
    bundleDigest: bundle.digest,
    locale: "en",
    namespace: "presentation-chrome",
    requiredNamespaceVersion: 1,
    translationVersion: "translation-v1",
    sensitivity: "GENERAL_INFORMATION",
    legalReviewRequirement: "NOT_REQUIRED_BY_INTERNAL_POLICY",
    reviewEvidence: {
      domainReviewRef: "evidence_domain_review_01",
      governanceApprovalRef: "evidence_governance_approval_01",
    },
    effectiveAt: "2026-10-01T00:00:00.000Z",
    staleAt: "2026-11-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    fallbackPolicy: "ALLOW_APPROVED_SOURCE_LANGUAGE_WITH_DISCLOSURE",
    ...overrides,
  });
}

test("D3 current governed content passes only the presentation-content gate", () => {
  const result = evaluateContentActivation({
    bundle,
    manifest: manifest(),
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });

  assert.equal(result.state, "CURRENT_CONTENT");
  assert.equal(result.displayAllowed, true);
  assert.equal(result.sensitivePresentationAllowed, true);
  assert.equal(result.reviewRequired, false);
  assert.equal(result.externalApprovalEstablished, false);
  assert.equal(result.regulatoryApprovalEstablished, false);
});

test("D3 missing review evidence fails closed without inventing content approval", () => {
  const result = evaluateContentActivation({
    bundle,
    manifest: manifest({
      reviewEvidence: {},
    }),
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });

  assert.equal(result.state, "CONTENT_NOT_GOVERNANCE_APPROVED");
  assert.equal(result.displayAllowed, false);
  assert.equal(result.sensitivePresentationAllowed, false);
  assert.equal(result.reviewRequired, true);
});

test("D3 non-English content requires local-speaker review evidence", () => {
  const amBundle = buildGovernedContentBundle("am");
  const base = manifest({
    bundleDigest: amBundle.digest,
    locale: "am",
  });
  const withoutLocalReview = evaluateContentActivation({
    bundle: amBundle,
    manifest: base,
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(withoutLocalReview.state, "CONTENT_NOT_GOVERNANCE_APPROVED");

  const withLocalReview = evaluateContentActivation({
    bundle: amBundle,
    manifest: {
      ...base,
      reviewEvidence: {
        ...base.reviewEvidence,
        localSpeakerReviewRef: "evidence_local_speaker_review_01",
      },
    },
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(withLocalReview.state, "CURRENT_CONTENT");
});

test("D3 sensitive wording requiring legal review fails closed until evidence is supplied", () => {
  const sensitive = manifest({
    sensitivity: "SENSITIVE_AUTHORITY_OR_CONSENT",
    legalReviewRequirement: "REQUIRED_BY_INTERNAL_POLICY",
    fallbackPolicy: "BLOCK_SENSITIVE_ACTION",
  });
  const before = evaluateContentActivation({
    bundle,
    manifest: sensitive,
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(before.state, "CONTENT_NOT_GOVERNANCE_APPROVED");
  assert.equal(before.sensitivePresentationAllowed, false);

  const after = evaluateContentActivation({
    bundle,
    manifest: {
      ...sensitive,
      reviewEvidence: {
        ...sensitive.reviewEvidence,
        legalReviewRef: "evidence_legal_review_01",
      },
    },
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(after.state, "CURRENT_CONTENT");
  assert.equal(after.sensitivePresentationAllowed, true);
  assert.equal(after.regulatoryApprovalEstablished, false);
});

test("D3 stale sensitive content never remains eligible for sensitive presentation", () => {
  const result = evaluateContentActivation({
    bundle,
    manifest: manifest({
      sensitivity: "SENSITIVE_AUTHORITY_OR_CONSENT",
      legalReviewRequirement: "REQUIRED_BY_INTERNAL_POLICY",
      reviewEvidence: {
        domainReviewRef: "evidence_domain_review_01",
        legalReviewRef: "evidence_legal_review_01",
        governanceApprovalRef: "evidence_governance_approval_01",
      },
      fallbackPolicy: "BLOCK_SENSITIVE_ACTION",
    }),
    currentNamespaceVersion: 1,
    now: new Date("2026-11-15T00:00:00.000Z"),
  });

  assert.equal(result.state, "STALE_CONTENT_REVIEW_REQUIRED");
  assert.equal(result.displayAllowed, false);
  assert.equal(result.sensitivePresentationAllowed, false);
  assert.equal(result.reviewRequired, true);
});

test("D3 expired sensitive content fails closed and general content cannot self-renew", () => {
  const sensitive = evaluateContentActivation({
    bundle,
    manifest: manifest({
      sensitivity: "SENSITIVE_AUTHORITY_OR_CONSENT",
      legalReviewRequirement: "REQUIRED_BY_INTERNAL_POLICY",
      reviewEvidence: {
        domainReviewRef: "evidence_domain_review_01",
        legalReviewRef: "evidence_legal_review_01",
        governanceApprovalRef: "evidence_governance_approval_01",
      },
    }),
    currentNamespaceVersion: 1,
    now: new Date("2026-12-01T00:00:00.000Z"),
  });
  assert.equal(sensitive.state, "EXPIRED_SENSITIVE_CONTENT");
  assert.equal(sensitive.displayAllowed, false);

  const general = evaluateContentActivation({
    bundle,
    manifest: manifest(),
    currentNamespaceVersion: 1,
    now: new Date("2026-12-01T00:00:00.000Z"),
  });
  assert.equal(general.state, "EXPIRED_CONTENT_REVIEW_REQUIRED");
  assert.equal(general.displayAllowed, false);
});

test("D3 lifecycle detects digest binding, locale and namespace incompatibility", () => {
  const wrongDigest = evaluateContentActivation({
    bundle,
    manifest: manifest({
      bundleDigest: `sha256:${"0".repeat(64)}`,
    }),
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(wrongDigest.state, "CONTENT_SIGNATURE_OR_DIGEST_INVALID");

  const incompatible = evaluateContentActivation({
    bundle,
    manifest: manifest({ requiredNamespaceVersion: 2 }),
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(incompatible.state, "CONTENT_VERSION_INCOMPATIBLE");
});

test("D3 lifecycle enforces chronological metadata without hardcoded validity durations", () => {
  assert.throws(() =>
    manifest({
      effectiveAt: "2026-12-01T00:00:00.000Z",
      staleAt: "2026-11-01T00:00:00.000Z",
      expiresAt: "2026-10-01T00:00:00.000Z",
    }),
  );

  const future = evaluateContentActivation({
    bundle,
    manifest: manifest({
      effectiveAt: "2026-10-20T00:00:00.000Z",
      staleAt: "2026-11-20T00:00:00.000Z",
      expiresAt: "2026-12-20T00:00:00.000Z",
    }),
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(future.state, "CONTENT_NOT_YET_EFFECTIVE");
});

test("D3 revoked activation cannot be revived by a still-valid bundle digest", () => {
  const result = evaluateContentActivation({
    bundle,
    manifest: manifest({ revokedAt: "2026-10-16T00:00:00.000Z" }),
    currentNamespaceVersion: 1,
    now: new Date("2026-10-17T00:00:00.000Z"),
  });
  assert.equal(result.state, "CONTENT_REVOKED");
  assert.equal(result.displayAllowed, false);
  assert.equal(result.sensitivePresentationAllowed, false);
});
