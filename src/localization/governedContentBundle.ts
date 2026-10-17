import { z } from "zod";

import { computeCanonicalSha256 } from "../domain/evidenceIntegrity";
import {
  criticalTerminology,
  presentationCatalog,
  presentationLocaleMetadata,
  workspaceGroupLabels,
  workspaceItemLabels,
  type PresentationLanguage,
} from "./presentationCatalog";

export const GovernedLocaleSchema = z.enum(["en", "am", "or", "ti", "so"]);
export type GovernedLocale = z.infer<typeof GovernedLocaleSchema>;

export const ContentReviewStateSchema = z.enum([
  "SOURCE_CANONICAL",
  "TECHNICAL_COMPLETE_LOCAL_REVIEW_REQUIRED",
  "STUB_NO_CONTENT",
]);

const CriticalTermEntrySchema = z
  .object({
    canonical: z.string().min(1),
    display: z.string().min(1),
  })
  .strict();

const GovernedContentPayloadSchema = z
  .object({
    bundleId: z.literal("enawuga-presentation-chrome"),
    bundleVersion: z.number().int().positive(),
    sourceVersion: z.literal("presentation-catalog-v1"),
    locale: GovernedLocaleSchema,
    sourceLocale: z.literal("en"),
    reviewState: ContentReviewStateSchema,
    technicalCatalogComplete: z.boolean(),
    localSpeakerReviewRequired: z.boolean(),
    regulatedWordingApproved: z.literal(false),
    content: z
      .object({
        presentation: z.record(z.string(), z.string()),
        workspaceGroups: z.record(z.string(), z.string()),
        workspaceItems: z.record(z.string(), z.string()),
        criticalTerminology: z.record(z.string(), CriticalTermEntrySchema),
      })
      .strict(),
  })
  .strict();

export const GovernedContentBundleSchema = GovernedContentPayloadSchema.extend({
  digest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
}).strict();

export type GovernedContentBundle = z.infer<typeof GovernedContentBundleSchema>;

type ActiveCatalogLocale = PresentationLanguage;

const localeStubMetadata = {
  ti: {
    nativeName: "Tigrinya",
    htmlLang: "ti",
  },
  so: {
    nativeName: "Somali",
    htmlLang: "so",
  },
} as const;

function criticalTermsFor(language: ActiveCatalogLocale) {
  return Object.fromEntries(
    Object.entries(criticalTerminology).map(([id, term]) => [
      id,
      {
        canonical: term.canonical,
        display: term[language],
      },
    ]),
  );
}

function activePayload(language: ActiveCatalogLocale) {
  const metadata = presentationLocaleMetadata[language];
  return GovernedContentPayloadSchema.parse({
    bundleId: "enawuga-presentation-chrome",
    bundleVersion: 1,
    sourceVersion: "presentation-catalog-v1",
    locale: language,
    sourceLocale: "en",
    reviewState: metadata.sourceLanguage
      ? "SOURCE_CANONICAL"
      : "TECHNICAL_COMPLETE_LOCAL_REVIEW_REQUIRED",
    technicalCatalogComplete: metadata.technicalCatalogComplete,
    localSpeakerReviewRequired: metadata.localSpeakerReviewRequired,
    regulatedWordingApproved: false,
    content: {
      presentation: presentationCatalog[language],
      workspaceGroups: workspaceGroupLabels[language],
      workspaceItems: workspaceItemLabels[language],
      criticalTerminology: criticalTermsFor(language),
    },
  });
}

function stubPayload(locale: "ti" | "so") {
  const metadata = localeStubMetadata[locale];
  return GovernedContentPayloadSchema.parse({
    bundleId: "enawuga-presentation-chrome",
    bundleVersion: 1,
    sourceVersion: "presentation-catalog-v1",
    locale,
    sourceLocale: "en",
    reviewState: "STUB_NO_CONTENT",
    technicalCatalogComplete: false,
    localSpeakerReviewRequired: true,
    regulatedWordingApproved: false,
    content: {
      presentation: {},
      workspaceGroups: {},
      workspaceItems: {},
      criticalTerminology: {},
    },
  });
}

function payloadFor(locale: GovernedLocale) {
  if (locale === "ti" || locale === "so") return stubPayload(locale);
  return activePayload(locale);
}

export function buildGovernedContentBundle(localeInput: string): GovernedContentBundle {
  const locale = GovernedLocaleSchema.parse(localeInput);
  const payload = payloadFor(locale);
  return GovernedContentBundleSchema.parse({
    ...payload,
    digest: computeCanonicalSha256(payload),
  });
}

export function verifyGovernedContentBundle(bundleInput: unknown) {
  const bundle = GovernedContentBundleSchema.parse(bundleInput);
  const { digest, ...payload } = bundle;
  return computeCanonicalSha256(payload) === digest;
}

export function loadGovernedContentBundle(localeInput: string) {
  const bundle = buildGovernedContentBundle(localeInput);
  if (!verifyGovernedContentBundle(bundle))
    throw new Error("CONTENT_BUNDLE_DIGEST_MISMATCH");
  return bundle;
}

export function contentLocaleAvailability() {
  return {
    en: { status: "SOURCE_CANONICAL" as const, selectable: true },
    am: {
      status: "TECHNICAL_COMPLETE_LOCAL_REVIEW_REQUIRED" as const,
      selectable: true,
    },
    or: {
      status: "TECHNICAL_COMPLETE_LOCAL_REVIEW_REQUIRED" as const,
      selectable: true,
    },
    ti: { status: "STUB_NO_CONTENT" as const, selectable: false },
    so: { status: "STUB_NO_CONTENT" as const, selectable: false },
  };
}
