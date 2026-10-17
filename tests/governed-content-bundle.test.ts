import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGovernedContentBundle,
  contentLocaleAvailability,
  loadGovernedContentBundle,
  verifyGovernedContentBundle,
} from "../src/localization/governedContentBundle";
import { presentationCatalog } from "../src/localization/presentationCatalog";

test("D3 governed content bundles are deterministic, versioned and digest verified", () => {
  const first = buildGovernedContentBundle("en");
  const second = buildGovernedContentBundle("en");

  assert.deepEqual(first, second);
  assert.equal(first.bundleVersion, 1);
  assert.equal(first.sourceVersion, "presentation-catalog-v1");
  assert.match(first.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(verifyGovernedContentBundle(first), true);
  assert.deepEqual(loadGovernedContentBundle("en"), first);
});

test("D3 technical Amharic and Afaan Oromoo bundles remain explicitly review gated", () => {
  for (const locale of ["am", "or"] as const) {
    const bundle = buildGovernedContentBundle(locale);
    assert.equal(bundle.reviewState, "TECHNICAL_COMPLETE_LOCAL_REVIEW_REQUIRED");
    assert.equal(bundle.technicalCatalogComplete, true);
    assert.equal(bundle.localSpeakerReviewRequired, true);
    assert.equal(bundle.regulatedWordingApproved, false);
    assert.deepEqual(bundle.content.presentation, presentationCatalog[locale]);
  }
});

test("D3 Tigrinya and Somali are non-selectable empty stubs, not fabricated translations", () => {
  const availability = contentLocaleAvailability();
  for (const locale of ["ti", "so"] as const) {
    const bundle = buildGovernedContentBundle(locale);
    assert.equal(bundle.reviewState, "STUB_NO_CONTENT");
    assert.equal(bundle.technicalCatalogComplete, false);
    assert.equal(bundle.localSpeakerReviewRequired, true);
    assert.equal(bundle.regulatedWordingApproved, false);
    assert.deepEqual(bundle.content.presentation, {});
    assert.deepEqual(bundle.content.workspaceGroups, {});
    assert.deepEqual(bundle.content.workspaceItems, {});
    assert.deepEqual(bundle.content.criticalTerminology, {});
    assert.equal(availability[locale].selectable, false);
  }
});

test("D3 canonical authority identifiers remain language neutral across active bundles", () => {
  const expected = {
    queuedForSync: "QUEUED_FOR_SYNC",
    pendingPartnerAuthorization: "PARTNER_AUTH_PENDING",
    gatewayConfirmedNotSettlement: "GATEWAY_CONFIRMED_NOT_SETTLED",
    expiredNotRejected: "EXPIRED_NOT_REJECTED",
  };

  for (const locale of ["en", "am", "or"] as const) {
    const terms = buildGovernedContentBundle(locale).content.criticalTerminology;
    assert.deepEqual(
      Object.fromEntries(Object.entries(terms).map(([id, term]) => [id, term.canonical])),
      expected,
    );
  }
});

test("D3 content bundle verification detects schema-valid tampering", () => {
  const original = buildGovernedContentBundle("en");
  const tampered = {
    ...original,
    content: {
      ...original.content,
      presentation: {
        ...original.content.presentation,
        footerBoundary: "Production approved",
      },
    },
  };

  assert.equal(verifyGovernedContentBundle(tampered), false);
});

test("D3 bundle loader rejects unsupported locale instead of silently inventing fallback content", () => {
  assert.throws(() => loadGovernedContentBundle("fr"));
});
