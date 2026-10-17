import { z } from "zod";

import {
  GovernedContentBundleSchema,
  GovernedLocaleSchema,
  verifyGovernedContentBundle,
} from "./governedContentBundle";

export const ContentSensitivitySchema = z.enum([
  "GENERAL_INFORMATION",
  "SENSITIVE_AUTHORITY_OR_CONSENT",
]);

export const ContentLegalReviewRequirementSchema = z.enum([
  "REQUIRED_BY_INTERNAL_POLICY",
  "NOT_REQUIRED_BY_INTERNAL_POLICY",
]);

export const ContentFallbackPolicySchema = z.enum([
  "ALLOW_APPROVED_SOURCE_LANGUAGE_WITH_DISCLOSURE",
  "BLOCK_SENSITIVE_ACTION",
]);

export const ContentLifecycleStateSchema = z.enum([
  "CURRENT_CONTENT",
  "STALE_CONTENT_REVIEW_REQUIRED",
  "EXPIRED_SENSITIVE_CONTENT",
  "EXPIRED_CONTENT_REVIEW_REQUIRED",
  "CONTENT_SIGNATURE_OR_DIGEST_INVALID",
  "CONTENT_VERSION_INCOMPATIBLE",
  "CONTENT_NOT_GOVERNANCE_APPROVED",
  "CONTENT_NOT_YET_EFFECTIVE",
  "CONTENT_REVOKED",
]);

const EvidenceRefSchema = z.string().regex(/^evidence_[a-z0-9][a-z0-9_-]{2,119}$/);

export const ContentReviewEvidenceSchema = z
  .object({
    localSpeakerReviewRef: EvidenceRefSchema.optional(),
    domainReviewRef: EvidenceRefSchema.optional(),
    legalReviewRef: EvidenceRefSchema.optional(),
    governanceApprovalRef: EvidenceRefSchema.optional(),
  })
  .strict();

export const ContentActivationManifestSchema = z
  .object({
    manifestVersion: z.literal(1),
    bundleDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    locale: GovernedLocaleSchema,
    namespace: z.literal("presentation-chrome"),
    requiredNamespaceVersion: z.number().int().positive(),
    translationVersion: z.string().regex(/^translation-v[1-9]\d*$/),
    sensitivity: ContentSensitivitySchema,
    legalReviewRequirement: ContentLegalReviewRequirementSchema,
    reviewEvidence: ContentReviewEvidenceSchema,
    effectiveAt: z.string().datetime(),
    staleAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    supersedesBundleDigest: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/)
      .optional(),
    fallbackPolicy: ContentFallbackPolicySchema,
    revokedAt: z.string().datetime().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const effectiveAt = Date.parse(value.effectiveAt);
    const staleAt = Date.parse(value.staleAt);
    const expiresAt = Date.parse(value.expiresAt);
    if (!(effectiveAt < staleAt && staleAt < expiresAt)) {
      context.addIssue({
        code: "custom",
        message: "CONTENT_LIFECYCLE_TIME_ORDER_INVALID",
        path: ["effectiveAt"],
      });
    }
    if (value.revokedAt && Date.parse(value.revokedAt) < effectiveAt) {
      context.addIssue({
        code: "custom",
        message: "CONTENT_REVOCATION_PRECEDES_EFFECTIVE_TIME",
        path: ["revokedAt"],
      });
    }
  });

export type ContentActivationManifest = z.infer<
  typeof ContentActivationManifestSchema
>;
export type ContentLifecycleState = z.infer<typeof ContentLifecycleStateSchema>;

export const ContentLifecycleDecisionSchema = z
  .object({
    state: ContentLifecycleStateSchema,
    displayAllowed: z.boolean(),
    sensitivePresentationAllowed: z.boolean(),
    approvedSourceFallbackRequired: z.boolean(),
    reviewRequired: z.boolean(),
    reason: z.string().min(1).max(160),
    externalApprovalEstablished: z.literal(false),
    regulatoryApprovalEstablished: z.literal(false),
  })
  .strict();

function reviewGateSatisfied(manifest: ContentActivationManifest) {
  const evidence = manifest.reviewEvidence;
  if (!evidence.domainReviewRef || !evidence.governanceApprovalRef) return false;
  if (manifest.locale !== "en" && !evidence.localSpeakerReviewRef) return false;
  if (
    manifest.legalReviewRequirement === "REQUIRED_BY_INTERNAL_POLICY" &&
    !evidence.legalReviewRef
  )
    return false;
  return true;
}

function decision(input: Omit<z.infer<typeof ContentLifecycleDecisionSchema>,
  "externalApprovalEstablished" | "regulatoryApprovalEstablished"
>) {
  return ContentLifecycleDecisionSchema.parse({
    ...input,
    externalApprovalEstablished: false,
    regulatoryApprovalEstablished: false,
  });
}

export function evaluateContentActivation(input: {
  bundle: unknown;
  manifest: unknown;
  currentNamespaceVersion: number;
  now?: Date;
}) {
  const bundle = GovernedContentBundleSchema.parse(input.bundle);
  const manifest = ContentActivationManifestSchema.parse(input.manifest);
  const nowMs = (input.now ?? new Date()).getTime();
  const currentNamespaceVersion = z.number().int().positive().parse(
    input.currentNamespaceVersion,
  );

  if (!verifyGovernedContentBundle(bundle) || bundle.digest !== manifest.bundleDigest) {
    return decision({
      state: "CONTENT_SIGNATURE_OR_DIGEST_INVALID",
      displayAllowed: false,
      sensitivePresentationAllowed: false,
      approvedSourceFallbackRequired: false,
      reviewRequired: true,
      reason: "Bundle integrity or manifest binding failed",
    });
  }

  if (bundle.locale !== manifest.locale || manifest.requiredNamespaceVersion !== currentNamespaceVersion) {
    return decision({
      state: "CONTENT_VERSION_INCOMPATIBLE",
      displayAllowed: false,
      sensitivePresentationAllowed: false,
      approvedSourceFallbackRequired: false,
      reviewRequired: true,
      reason: "Locale or application namespace version is incompatible",
    });
  }

  if (manifest.revokedAt && Date.parse(manifest.revokedAt) <= nowMs) {
    return decision({
      state: "CONTENT_REVOKED",
      displayAllowed: false,
      sensitivePresentationAllowed: false,
      approvedSourceFallbackRequired:
        manifest.fallbackPolicy === "ALLOW_APPROVED_SOURCE_LANGUAGE_WITH_DISCLOSURE",
      reviewRequired: true,
      reason: "Content activation manifest has been revoked",
    });
  }

  if (!reviewGateSatisfied(manifest)) {
    return decision({
      state: "CONTENT_NOT_GOVERNANCE_APPROVED",
      displayAllowed: false,
      sensitivePresentationAllowed: false,
      approvedSourceFallbackRequired:
        manifest.fallbackPolicy === "ALLOW_APPROVED_SOURCE_LANGUAGE_WITH_DISCLOSURE",
      reviewRequired: true,
      reason: "Required internal content-review evidence is incomplete",
    });
  }

  if (nowMs < Date.parse(manifest.effectiveAt)) {
    return decision({
      state: "CONTENT_NOT_YET_EFFECTIVE",
      displayAllowed: false,
      sensitivePresentationAllowed: false,
      approvedSourceFallbackRequired:
        manifest.fallbackPolicy === "ALLOW_APPROVED_SOURCE_LANGUAGE_WITH_DISCLOSURE",
      reviewRequired: false,
      reason: "Bundle effective time has not been reached",
    });
  }

  if (nowMs >= Date.parse(manifest.expiresAt)) {
    const sensitive = manifest.sensitivity === "SENSITIVE_AUTHORITY_OR_CONSENT";
    return decision({
      state: sensitive ? "EXPIRED_SENSITIVE_CONTENT" : "EXPIRED_CONTENT_REVIEW_REQUIRED",
      displayAllowed: false,
      sensitivePresentationAllowed: false,
      approvedSourceFallbackRequired:
        manifest.fallbackPolicy === "ALLOW_APPROVED_SOURCE_LANGUAGE_WITH_DISCLOSURE",
      reviewRequired: true,
      reason: sensitive
        ? "Sensitive content is expired and fails closed"
        : "Expired content requires review before activation",
    });
  }

  if (nowMs >= Date.parse(manifest.staleAt)) {
    return decision({
      state: "STALE_CONTENT_REVIEW_REQUIRED",
      displayAllowed: manifest.sensitivity === "GENERAL_INFORMATION",
      sensitivePresentationAllowed: false,
      approvedSourceFallbackRequired:
        manifest.fallbackPolicy === "ALLOW_APPROVED_SOURCE_LANGUAGE_WITH_DISCLOSURE",
      reviewRequired: true,
      reason: "Bundle freshness threshold has passed",
    });
  }

  return decision({
    state: "CURRENT_CONTENT",
    displayAllowed: true,
    sensitivePresentationAllowed: true,
    approvedSourceFallbackRequired: false,
    reviewRequired: false,
    reason: "Bundle is integrity-valid, reviewed, compatible and current",
  });
}
