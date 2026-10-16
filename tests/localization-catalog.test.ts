import assert from "node:assert/strict";
import test from "node:test";

import {
  criticalTerminology,
  getPresentationCopy,
  localizeWorkspaceGroup,
  localizeWorkspaceItem,
  presentationCatalog,
  presentationLanguages,
  presentationLocaleMetadata,
  workspaceGroupLabels,
  workspaceItemLabels,
} from "../src/localization/presentationCatalog";

test("technical presentation catalogs have complete identical key coverage", () => {
  const sourceKeys = Object.keys(presentationCatalog.en).sort();
  assert.ok(sourceKeys.length >= 60);
  for (const language of presentationLanguages) {
    const keys = Object.keys(presentationCatalog[language]).sort();
    assert.deepEqual(keys, sourceKeys);
    for (const key of sourceKeys) {
      const value = presentationCatalog[language][key as keyof typeof presentationCatalog.en];
      assert.equal(typeof value, "string");
      assert.ok(value.trim().length > 0, `${language}:${key} must not be empty`);
    }
  }
});

test("Amharic and Afaan Oromoo are technically complete but never self-approved", () => {
  assert.equal(presentationLocaleMetadata.en.sourceLanguage, true);
  assert.equal(presentationLocaleMetadata.en.localSpeakerReviewRequired, false);
  assert.equal(presentationLocaleMetadata.am.technicalCatalogComplete, true);
  assert.equal(presentationLocaleMetadata.or.technicalCatalogComplete, true);
  assert.equal(presentationLocaleMetadata.am.localSpeakerReviewRequired, true);
  assert.equal(presentationLocaleMetadata.or.localSpeakerReviewRequired, true);
  assert.equal(presentationLocaleMetadata.am.regulatedWordingApproved, false);
  assert.equal(presentationLocaleMetadata.or.regulatedWordingApproved, false);
  assert.equal(presentationLocaleMetadata.or.htmlLang, "om");
  assert.match(getPresentationCopy("am").languageReviewStatus, /ግምገማ/);
  assert.match(getPresentationCopy("or").languageReviewStatus, /gamaaggam/);
});

test("governed workspace navigation maps stay key-complete with English fallback", () => {
  const groupKeys = Object.keys(workspaceGroupLabels.en).sort();
  const itemKeys = Object.keys(workspaceItemLabels.en).sort();
  for (const language of presentationLanguages) {
    assert.deepEqual(Object.keys(workspaceGroupLabels[language]).sort(), groupKeys);
    assert.deepEqual(Object.keys(workspaceItemLabels[language]).sort(), itemKeys);
  }
  assert.equal(localizeWorkspaceGroup("am", "field-workflows", "fallback"), "የመስክ የሥራ ፍሰቶች");
  assert.equal(localizeWorkspaceItem("or", "requests", "fallback"), "Gaaffiiwwan fi tarree offline");
  assert.equal(localizeWorkspaceGroup("am", "future-group", "fallback"), "fallback");
  assert.equal(localizeWorkspaceItem("or", "future-item", "fallback"), "fallback");
});

test("critical terminology preserves audit distinctions and remains review-gated", () => {
  const terms = Object.values(criticalTerminology);
  assert.equal(new Set(terms.map((term) => term.canonical)).size, terms.length);
  for (const term of terms) {
    assert.ok(term.en.length > 0);
    assert.ok(term.am.length > 0);
    assert.ok(term.or.length > 0);
    assert.notEqual(term.am, term.en);
    assert.notEqual(term.or, term.en);
  }
  assert.match(criticalTerminology.queuedForSync.en, /not yet submitted/i);
  assert.match(criticalTerminology.pendingPartnerAuthorization.en, /not approved/i);
  assert.match(criticalTerminology.gatewayConfirmedNotSettlement.en, /not PartnerFI settlement/i);
  assert.match(criticalTerminology.expiredNotRejected.en, /not rejected/i);
});
