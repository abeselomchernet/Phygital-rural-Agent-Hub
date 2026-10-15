import { z } from "zod";

import { computeCanonicalSha256 } from "./evidenceIntegrity";
import {
  HubIdSchema,
  HubTenantIdSchema,
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  syntheticHubs,
} from "./hub";
import { PartnerOrgIdSchema } from "./partnerCapabilityContract";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
} from "./syntheticReferencePartners";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const EvidenceRefsSchema = z
  .array(z.string().min(1).max(160))
  .max(32)
  .refine(uniqueStrings, "evidence refs must be unique");

const RequiredEvidenceRefsSchema = EvidenceRefsSchema.min(1);

export const CorridorPlanningSchemaVersion = 1 as const;

export const CorridorEvidenceDimensionSchema = z.enum([
  "HUB_LOCATION",
  "CONNECTIVITY",
  "DEMAND",
  "PARTNER_INTEREST",
  "LOGISTICS",
  "LIQUIDITY",
  "OPERATING_COST",
]);
export type CorridorEvidenceDimension = z.infer<
  typeof CorridorEvidenceDimensionSchema
>;

export const CorridorEvidenceStateSchema = z.enum([
  "PRESENT_SYNTHETIC",
  "MISSING",
]);

export const CorridorEvidenceInputSchema = z
  .object({
    dimension: CorridorEvidenceDimensionSchema,
    state: CorridorEvidenceStateSchema,
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.state === "PRESENT_SYNTHETIC" && value.evidenceRefs.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "present synthetic evidence requires at least one evidence ref",
        path: ["evidenceRefs"],
      });
    }
    if (value.state === "MISSING" && value.evidenceRefs.length !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "missing evidence must not carry evidence refs",
        path: ["evidenceRefs"],
      });
    }
  });
export type CorridorEvidenceInput = z.infer<typeof CorridorEvidenceInputSchema>;

export const CorridorConnectivityProfileSchema = z.enum([
  "STRONG_SYNTHETIC",
  "MIXED_SYNTHETIC",
  "LIMITED_SYNTHETIC",
  "UNKNOWN",
]);
export const CorridorLogisticsStateSchema = z.enum([
  "FEASIBLE_SYNTHETIC",
  "CONSTRAINED_SYNTHETIC",
  "UNKNOWN",
]);
export const CorridorLiquidityProfileSchema = z.enum([
  "STABLE_SYNTHETIC",
  "VARIABLE_SYNTHETIC",
  "SHORTFALL_RISK_SYNTHETIC",
  "UNKNOWN",
]);
export const CorridorProposedPilotBoundarySchema = z
  .object({
    boundaryClass: z.literal("SYNTHETIC_PLANNING_ONLY"),
    maxCandidateHubs: z.number().int().positive().max(20),
  })
  .strict();

export const CorridorReviewPolicySchema = z
  .object({
    readinessThresholdBasisPoints: z.number().int().min(0).max(10_000),
    evidenceClass: z.literal("SYNTHETIC_MODEL_ASSUMPTION"),
    meaning: z.literal("SYNTHETIC_REVIEW_HEURISTIC_NOT_AUTHORIZATION"),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict();

export const CorridorCandidateSchema = z
  .object({
    candidateId: z.string().regex(/^corridor_candidate_syn_[a-z0-9_]+$/),
    regionId: z.string().regex(/^region_syn_[a-z0-9_]+$/),
    locationRef: z.string().regex(/^location_syn_[a-z0-9_]+$/),
    displayLabel: z.string().min(1).max(120),
    planningInputEvidenceClass: z.literal("SYNTHETIC_MODEL_ASSUMPTION"),
    existingHubRef: HubIdSchema.nullable(),
    candidateHubDensityIndex: z.number().int().min(0).max(100).nullable(),
    demandIndex: z.number().int().min(0).max(100).nullable(),
    connectivityIndex: z.number().int().min(0).max(100).nullable(),
    partnerInterestIndex: z.number().int().min(0).max(100).nullable(),
    logisticsFeasibilityIndex: z.number().int().min(0).max(100).nullable(),
    liquidityFeasibilityIndex: z.number().int().min(0).max(100).nullable(),
    operatingCostFeasibilityIndex: z.number().int().min(0).max(100).nullable(),
    connectivityProfile: z.enum([
      "STRONG_SYNTHETIC",
      "MIXED_SYNTHETIC",
      "LIMITED_SYNTHETIC",
      "UNKNOWN",
    ]),
    logisticsState: z.enum([
      "FEASIBLE_SYNTHETIC",
      "CONSTRAINED_SYNTHETIC",
      "UNKNOWN",
    ]),
    liquidityProfile: z.enum([
      "STABLE_SYNTHETIC",
      "VARIABLE_SYNTHETIC",
      "SHORTFALL_RISK_SYNTHETIC",
      "UNKNOWN",
    ]),
    partnerCommitmentState: z.literal("NOT_COMMITTED_STAGE4"),
    proposedPilotBoundary: z
      .object({
        boundaryClass: z.literal("SYNTHETIC_PLANNING_ONLY"),
        maxCandidateHubs: z.number().int().positive().max(20),
      })
      .strict(),
    evidence: z.array(CorridorEvidenceInputSchema).length(7),
    evidenceRefs: RequiredEvidenceRefsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const dimensions = value.evidence.map((entry) => entry.dimension);
    if (new Set(dimensions).size !== dimensions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "corridor evidence dimensions must be unique",
        path: ["evidence"],
      });
    }
    for (const required of CorridorEvidenceDimensionSchema.options) {
      if (!dimensions.includes(required)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `missing corridor evidence dimension ${required}`,
          path: ["evidence"],
        });
      }
    }

    const evidenceByDimension = new Map(
      value.evidence.map((entry) => [entry.dimension, entry] as const),
    );
    const requireDimensionValue = (
      dimension: CorridorEvidenceDimension,
      valueAtDimension: number | null,
      field: string,
    ) => {
      const evidence = evidenceByDimension.get(dimension);
      if (!evidence) return;
      if (evidence.state === "MISSING" && valueAtDimension !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} must be null when ${dimension} evidence is missing`,
          path: [field],
        });
      }
      if (evidence.state === "PRESENT_SYNTHETIC" && valueAtDimension === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is required when ${dimension} evidence is present`,
          path: [field],
        });
      }
    };
    requireDimensionValue(
      "HUB_LOCATION",
      value.candidateHubDensityIndex,
      "candidateHubDensityIndex",
    );
    requireDimensionValue("DEMAND", value.demandIndex, "demandIndex");
    requireDimensionValue(
      "CONNECTIVITY",
      value.connectivityIndex,
      "connectivityIndex",
    );
    requireDimensionValue(
      "PARTNER_INTEREST",
      value.partnerInterestIndex,
      "partnerInterestIndex",
    );
    requireDimensionValue(
      "LOGISTICS",
      value.logisticsFeasibilityIndex,
      "logisticsFeasibilityIndex",
    );
    requireDimensionValue(
      "LIQUIDITY",
      value.liquidityFeasibilityIndex,
      "liquidityFeasibilityIndex",
    );
    requireDimensionValue(
      "OPERATING_COST",
      value.operatingCostFeasibilityIndex,
      "operatingCostFeasibilityIndex",
    );

    const connectivityEvidence = evidenceByDimension.get("CONNECTIVITY");
    if (
      connectivityEvidence?.state === "MISSING" &&
      value.connectivityProfile !== "UNKNOWN"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "connectivityProfile must be UNKNOWN without connectivity evidence",
        path: ["connectivityProfile"],
      });
    }
    if (
      connectivityEvidence?.state === "PRESENT_SYNTHETIC" &&
      value.connectivityProfile === "UNKNOWN"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "connectivityProfile cannot be UNKNOWN when synthetic evidence is present",
        path: ["connectivityProfile"],
      });
    }
    const logisticsEvidence = evidenceByDimension.get("LOGISTICS");
    if (
      logisticsEvidence?.state === "MISSING" &&
      value.logisticsState !== "UNKNOWN"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "logisticsState must be UNKNOWN without logistics evidence",
        path: ["logisticsState"],
      });
    }
    if (
      logisticsEvidence?.state === "PRESENT_SYNTHETIC" &&
      value.logisticsState === "UNKNOWN"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "logisticsState cannot be UNKNOWN when synthetic evidence is present",
        path: ["logisticsState"],
      });
    }
    const liquidityEvidence = evidenceByDimension.get("LIQUIDITY");
    if (
      liquidityEvidence?.state === "MISSING" &&
      value.liquidityProfile !== "UNKNOWN"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "liquidityProfile must be UNKNOWN without liquidity evidence",
        path: ["liquidityProfile"],
      });
    }
    if (
      liquidityEvidence?.state === "PRESENT_SYNTHETIC" &&
      value.liquidityProfile === "UNKNOWN"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "liquidityProfile cannot be UNKNOWN when synthetic evidence is present",
        path: ["liquidityProfile"],
      });
    }
  });
export type CorridorCandidate = z.infer<typeof CorridorCandidateSchema>;

export const CorridorPlanSchema = z
  .object({
    schemaVersion: z.literal(CorridorPlanningSchemaVersion),
    planId: z.string().regex(/^corridor_plan_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    anchorHubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    corridorId: z.string().regex(/^corridor_syn_[a-z0-9_]+$/),
    corridorLabel: z.string().min(1).max(120),
    regionIds: z
      .array(z.string().regex(/^region_syn_[a-z0-9_]+$/))
      .min(1)
      .max(12)
      .refine(uniqueStrings, "region IDs must be unique"),
    candidates: z.array(CorridorCandidateSchema).min(1).max(32),
    reviewPolicy: CorridorReviewPolicySchema,
    evidenceRefs: RequiredEvidenceRefsSchema,
    stage: z.literal("STAGE_4"),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    const candidateIds = value.candidates.map((candidate) => candidate.candidateId);
    if (new Set(candidateIds).size !== candidateIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "candidate IDs must be unique",
        path: ["candidates"],
      });
    }
    for (const candidate of value.candidates) {
      if (!value.regionIds.includes(candidate.regionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "candidate region must be included in corridor region IDs",
          path: ["candidates"],
        });
      }
    }
  });
export type CorridorPlan = z.infer<typeof CorridorPlanSchema>;

export const CorridorCandidateRecommendationStateSchema = z.enum([
  "RESEARCH_MORE",
  "HOLD_FOR_EVIDENCE",
  "CANDIDATE_FOR_BOUNDED_REVIEW",
]);

export const CorridorCandidateEvaluationSchema = z
  .object({
    candidateId: z.string().regex(/^corridor_candidate_syn_[a-z0-9_]+$/),
    regionId: z.string().regex(/^region_syn_[a-z0-9_]+$/),
    locationRef: z.string().regex(/^location_syn_[a-z0-9_]+$/),
    displayLabel: z.string().min(1).max(120),
    planningInputEvidenceClass: z.literal("SYNTHETIC_MODEL_ASSUMPTION"),
    existingHubRef: HubIdSchema.nullable(),
    readinessScoreBasisPoints: z.number().int().min(0).max(10_000).nullable(),
    readinessEvidenceClass: z.literal("SYNTHETIC_MODEL_OUTPUT"),
    evidenceCompletenessBasisPoints: z.number().int().min(0).max(10_000),
    evidenceCompletenessEvidenceClass: z.literal("SYNTHETIC_MODEL_OUTPUT"),
    missingEvidenceDimensions: z.array(CorridorEvidenceDimensionSchema).max(7),
    recommendationState: CorridorCandidateRecommendationStateSchema,
    connectivityProfile: CorridorConnectivityProfileSchema,
    logisticsState: CorridorLogisticsStateSchema,
    liquidityProfile: CorridorLiquidityProfileSchema,
    partnerCommitmentState: z.literal("NOT_COMMITTED_STAGE4"),
    proposedPilotBoundary: CorridorProposedPilotBoundarySchema,
    evidenceRefs: RequiredEvidenceRefsSchema,
    authority: z
      .object({
        recommendationOnly: z.literal(true),
        geographicAuthorizationGranted: z.literal(false),
        pilotAuthorized: z.literal(false),
        expansionAuthorized: z.literal(false),
        liveSiteActivationAuthorized: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type CorridorCandidateEvaluation = z.infer<
  typeof CorridorCandidateEvaluationSchema
>;

export const CorridorPlanningReadModelSchema = z
  .object({
    schemaVersion: z.literal(CorridorPlanningSchemaVersion),
    planId: z.string().regex(/^corridor_plan_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    anchorHubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    corridorId: z.string().regex(/^corridor_syn_[a-z0-9_]+$/),
    corridorLabel: z.string().min(1).max(120),
    reviewPolicy: CorridorReviewPolicySchema,
    regionIds: z.array(z.string().regex(/^region_syn_[a-z0-9_]+$/)).min(1).max(12),
    candidates: z.array(CorridorCandidateEvaluationSchema).min(1).max(32),
    boundedExpansionRecommendation: z
      .object({
        state: z.enum([
          "RESEARCH_MORE",
          "HOLD",
          "RECOMMEND_BOUNDED_REVIEW",
        ]),
        candidateId: z.string().regex(/^corridor_candidate_syn_[a-z0-9_]+$/).nullable(),
        reasonCodes: z
          .array(
            z.enum([
              "EVIDENCE_INCOMPLETE",
              "READINESS_BELOW_REVIEW_THRESHOLD",
              "COMPLETE_SYNTHETIC_EVIDENCE",
              "HIGHEST_SYNTHETIC_READINESS",
            ]),
          )
          .min(1)
          .max(4),
        recommendationOnly: z.literal(true),
        geographicAuthorizationGranted: z.literal(false),
        pilotAuthorized: z.literal(false),
        expansionAuthorized: z.literal(false),
      })
      .strict(),
    evidenceRefs: RequiredEvidenceRefsSchema,
    planningDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    readBoundary: z
      .object({
        stage: z.literal("STAGE_4"),
        syntheticOnly: z.literal(true),
        readOnly: z.literal(true),
        exactCoordinatesPresent: z.literal(false),
        realPartnerCommitmentsPresent: z.literal(false),
        realDemandDataPresent: z.literal(false),
        realConnectivityDataPresent: z.literal(false),
        realLogisticsDataPresent: z.literal(false),
        realLiquidityDataPresent: z.literal(false),
        realOperatingCostDataPresent: z.literal(false),
        externalEvidenceAccepted: z.literal(false),
        realFundsIncluded: z.literal(false),
        recommendationCreatesAuthority: z.literal(false),
        geographicAuthorizationGranted: z.literal(false),
        regulatedPilotAuthorityGranted: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type CorridorPlanningReadModel = z.infer<
  typeof CorridorPlanningReadModelSchema
>;

function uniqueEvidence(...groups: readonly (readonly string[])[]) {
  return [...new Set(groups.flat())].sort();
}

function validatePlanScope(plan: CorridorPlan) {
  const anchorHub = syntheticHubs.find((hub) => hub.hubId === plan.anchorHubId);
  if (!anchorHub || anchorHub.tenantId !== plan.tenantId) {
    throw new Error("CORRIDOR_PLAN_ANCHOR_SCOPE_MISMATCH");
  }
  if (
    !anchorHub.partnerMemberships.some(
      (membership) => membership.partnerOrgId === plan.partnerOrgId,
    )
  ) {
    throw new Error("CORRIDOR_PLAN_PARTNER_SCOPE_MISMATCH");
  }

  for (const candidate of plan.candidates) {
    if (candidate.existingHubRef === null) continue;
    const existingHub = syntheticHubs.find(
      (hub) => hub.hubId === candidate.existingHubRef,
    );
    if (!existingHub || existingHub.tenantId !== plan.tenantId) {
      throw new Error("CORRIDOR_PLAN_CANDIDATE_HUB_SCOPE_MISMATCH");
    }
    if (existingHub.regionId !== candidate.regionId) {
      throw new Error("CORRIDOR_PLAN_CANDIDATE_REGION_MISMATCH");
    }
    if (
      !existingHub.partnerMemberships.some(
        (membership) =>
          membership.partnerOrgId === plan.partnerOrgId &&
          membership.membershipState === "SYNTHETIC_MEMBER",
      )
    ) {
      throw new Error("CORRIDOR_PLAN_CANDIDATE_PARTNER_SCOPE_MISMATCH");
    }
  }
}

function evaluateCandidate(
  candidate: CorridorCandidate,
  readinessThresholdBasisPoints: number,
): CorridorCandidateEvaluation {
  const missingEvidenceDimensions = candidate.evidence
    .filter((entry) => entry.state === "MISSING")
    .map((entry) => entry.dimension)
    .sort();
  const presentCount = 7 - missingEvidenceDimensions.length;
  const evidenceCompletenessBasisPoints = Math.floor((presentCount * 10_000) / 7);
  const readinessInputs = [
    candidate.candidateHubDensityIndex,
    candidate.demandIndex,
    candidate.connectivityIndex,
    candidate.partnerInterestIndex,
    candidate.logisticsFeasibilityIndex,
    candidate.liquidityFeasibilityIndex,
    candidate.operatingCostFeasibilityIndex,
  ];
  const readinessScoreBasisPoints =
    missingEvidenceDimensions.length === 0
      ? Math.floor(
          readinessInputs.reduce<number>(
            (sum, value) => sum + (value ?? 0),
            0,
          ) *
            10_000 /
            700,
        )
      : null;
  const recommendationState =
    missingEvidenceDimensions.length > 0
      ? "RESEARCH_MORE"
      : (readinessScoreBasisPoints ?? 0) < readinessThresholdBasisPoints
        ? "HOLD_FOR_EVIDENCE"
        : "CANDIDATE_FOR_BOUNDED_REVIEW";

  return CorridorCandidateEvaluationSchema.parse({
    candidateId: candidate.candidateId,
    regionId: candidate.regionId,
    locationRef: candidate.locationRef,
    displayLabel: candidate.displayLabel,
    planningInputEvidenceClass: candidate.planningInputEvidenceClass,
    existingHubRef: candidate.existingHubRef,
    readinessScoreBasisPoints,
    readinessEvidenceClass: "SYNTHETIC_MODEL_OUTPUT",
    evidenceCompletenessBasisPoints,
    evidenceCompletenessEvidenceClass: "SYNTHETIC_MODEL_OUTPUT",
    missingEvidenceDimensions,
    recommendationState,
    connectivityProfile: candidate.connectivityProfile,
    logisticsState: candidate.logisticsState,
    liquidityProfile: candidate.liquidityProfile,
    partnerCommitmentState: candidate.partnerCommitmentState,
    proposedPilotBoundary: candidate.proposedPilotBoundary,
    evidenceRefs: uniqueEvidence(
      candidate.evidenceRefs,
      candidate.evidence.flatMap((entry) => entry.evidenceRefs),
    ),
    authority: {
      recommendationOnly: true,
      geographicAuthorizationGranted: false,
      pilotAuthorized: false,
      expansionAuthorized: false,
      liveSiteActivationAuthorized: false,
    },
  });
}

export function createStage4CorridorPlanningReadModel(
  input: unknown,
): CorridorPlanningReadModel {
  const plan = CorridorPlanSchema.parse(input);
  validatePlanScope(plan);
  const candidates = plan.candidates
    .map((candidate) =>
      evaluateCandidate(
        candidate,
        plan.reviewPolicy.readinessThresholdBasisPoints,
      ),
    )
    .sort(
      (left, right) =>
        right.evidenceCompletenessBasisPoints - left.evidenceCompletenessBasisPoints ||
        (right.readinessScoreBasisPoints ?? -1) -
          (left.readinessScoreBasisPoints ?? -1) ||
        left.candidateId.localeCompare(right.candidateId),
    );
  const incomplete = candidates.some(
    (candidate) => candidate.evidenceCompletenessBasisPoints < 10_000,
  );
  const reviewCandidates = incomplete
    ? []
    : candidates.filter(
        (candidate) =>
          candidate.recommendationState === "CANDIDATE_FOR_BOUNDED_REVIEW",
      );
  const selected = reviewCandidates[0] ?? null;
  const boundedExpansionRecommendation = incomplete
    ? {
        state: "RESEARCH_MORE" as const,
        candidateId: null,
        reasonCodes: ["EVIDENCE_INCOMPLETE" as const],
        recommendationOnly: true as const,
        geographicAuthorizationGranted: false as const,
        pilotAuthorized: false as const,
        expansionAuthorized: false as const,
      }
    : selected
    ? {
        state: "RECOMMEND_BOUNDED_REVIEW" as const,
        candidateId: selected.candidateId,
        reasonCodes: [
          "COMPLETE_SYNTHETIC_EVIDENCE" as const,
          "HIGHEST_SYNTHETIC_READINESS" as const,
        ],
        recommendationOnly: true as const,
        geographicAuthorizationGranted: false as const,
        pilotAuthorized: false as const,
        expansionAuthorized: false as const,
      }
    : {
          state: "HOLD" as const,
          candidateId: null,
          reasonCodes: ["READINESS_BELOW_REVIEW_THRESHOLD" as const],
          recommendationOnly: true as const,
          geographicAuthorizationGranted: false as const,
          pilotAuthorized: false as const,
          expansionAuthorized: false as const,
        };

  const core = {
    schemaVersion: CorridorPlanningSchemaVersion,
    planId: plan.planId,
    tenantId: plan.tenantId,
    anchorHubId: plan.anchorHubId,
    partnerOrgId: plan.partnerOrgId,
    corridorId: plan.corridorId,
    corridorLabel: plan.corridorLabel,
    reviewPolicy: plan.reviewPolicy,
    regionIds: [...plan.regionIds].sort(),
    candidates,
    boundedExpansionRecommendation,
    evidenceRefs: uniqueEvidence(
      plan.evidenceRefs,
      plan.reviewPolicy.evidenceRefs,
      plan.candidates.flatMap((candidate) => candidate.evidenceRefs),
      plan.candidates.flatMap((candidate) =>
        candidate.evidence.flatMap((entry) => entry.evidenceRefs),
      ),
    ),
    readBoundary: {
      stage: "STAGE_4" as const,
      syntheticOnly: true as const,
      readOnly: true as const,
      exactCoordinatesPresent: false as const,
      realPartnerCommitmentsPresent: false as const,
      realDemandDataPresent: false as const,
      realConnectivityDataPresent: false as const,
      realLogisticsDataPresent: false as const,
      realLiquidityDataPresent: false as const,
      realOperatingCostDataPresent: false as const,
      externalEvidenceAccepted: false as const,
      realFundsIncluded: false as const,
      recommendationCreatesAuthority: false as const,
      geographicAuthorizationGranted: false as const,
      regulatedPilotAuthorityGranted: false as const,
    },
  };

  return CorridorPlanningReadModelSchema.parse({
    ...core,
    planningDigest: computeCanonicalSha256(core),
  });
}

export function verifyStage4CorridorPlanningReadModel(
  input: unknown,
): CorridorPlanningReadModel {
  const model = CorridorPlanningReadModelSchema.parse(input);
  const { planningDigest, ...core } = model;
  if (planningDigest !== computeCanonicalSha256(core)) {
    throw new Error("CORRIDOR_PLAN_DIGEST_MISMATCH");
  }
  return model;
}

export function searchStage4CorridorPlanning(input: {
  readModels: readonly unknown[];
  tenantId: string;
  anchorHubId: string;
  partnerOrgId: string;
}): readonly CorridorPlanningReadModel[] {
  const tenantId = HubTenantIdSchema.parse(input.tenantId);
  const anchorHubId = HubIdSchema.parse(input.anchorHubId);
  const partnerOrgId = PartnerOrgIdSchema.parse(input.partnerOrgId);
  return input.readModels
    .map((model) => verifyStage4CorridorPlanningReadModel(model))
    .filter(
      (model) =>
        model.tenantId === tenantId &&
        model.anchorHubId === anchorHubId &&
        model.partnerOrgId === partnerOrgId,
    )
    .sort((left, right) => left.planId.localeCompare(right.planId));
}

function evidence(
  dimension: CorridorEvidenceDimension,
  state: "PRESENT_SYNTHETIC" | "MISSING",
  suffix: string,
): CorridorEvidenceInput {
  return CorridorEvidenceInputSchema.parse({
    dimension,
    state,
    evidenceRefs:
      state === "PRESENT_SYNTHETIC" ? [`EV-SYN-E7-${suffix}-${dimension}`] : [],
  });
}

const completeEvidence = (suffix: string) =>
  CorridorEvidenceDimensionSchema.options.map((dimension) =>
    evidence(dimension, "PRESENT_SYNTHETIC", suffix),
  );

export const SYNTHETIC_E7_CORRIDOR_PLANS: readonly CorridorPlan[] = [
  CorridorPlanSchema.parse({
    schemaVersion: 1,
    planId: "corridor_plan_syn_alpha_adama_arisi",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    anchorHubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    corridorId: "corridor_syn_adama_arisi_alpha",
    corridorLabel: "Synthetic Adama-Arisi planning corridor",
    regionIds: [SYNTHETIC_REGION_IDS.ADAMA, SYNTHETIC_REGION_IDS.ARISI],
    candidates: [
      {
        candidateId: "corridor_candidate_syn_alpha_arisi_existing",
        regionId: SYNTHETIC_REGION_IDS.ARISI,
        locationRef: "location_syn_arisi_candidate_001",
        displayLabel: "Synthetic Arisi candidate reference 001",
        planningInputEvidenceClass: "SYNTHETIC_MODEL_ASSUMPTION",
        existingHubRef: SYNTHETIC_HUB_IDS.ARISI_ALPHA,
        candidateHubDensityIndex: 70,
        demandIndex: 72,
        connectivityIndex: 68,
        partnerInterestIndex: 75,
        logisticsFeasibilityIndex: 66,
        liquidityFeasibilityIndex: 64,
        operatingCostFeasibilityIndex: 62,
        connectivityProfile: "MIXED_SYNTHETIC",
        logisticsState: "FEASIBLE_SYNTHETIC",
        liquidityProfile: "VARIABLE_SYNTHETIC",
        partnerCommitmentState: "NOT_COMMITTED_STAGE4",
        proposedPilotBoundary: {
          boundaryClass: "SYNTHETIC_PLANNING_ONLY",
          maxCandidateHubs: 1,
        },
        evidence: completeEvidence("ALPHA-ARISI-001"),
        evidenceRefs: ["EV-SYN-E7-ALPHA-ARISI-CANDIDATE-V1"],
      },
      {
        candidateId: "corridor_candidate_syn_alpha_east_research",
        regionId: SYNTHETIC_REGION_IDS.ADAMA,
        locationRef: "location_syn_adama_east_research_001",
        displayLabel: "Synthetic Adama east research reference 001",
        planningInputEvidenceClass: "SYNTHETIC_MODEL_ASSUMPTION",
        existingHubRef: null,
        candidateHubDensityIndex: 55,
        demandIndex: 61,
        connectivityIndex: 45,
        partnerInterestIndex: 58,
        logisticsFeasibilityIndex: 52,
        liquidityFeasibilityIndex: 47,
        operatingCostFeasibilityIndex: 54,
        connectivityProfile: "LIMITED_SYNTHETIC",
        logisticsState: "CONSTRAINED_SYNTHETIC",
        liquidityProfile: "SHORTFALL_RISK_SYNTHETIC",
        partnerCommitmentState: "NOT_COMMITTED_STAGE4",
        proposedPilotBoundary: {
          boundaryClass: "SYNTHETIC_PLANNING_ONLY",
          maxCandidateHubs: 1,
        },
        evidence: completeEvidence("ALPHA-EAST-001"),
        evidenceRefs: ["EV-SYN-E7-ALPHA-EAST-RESEARCH-V1"],
      },
    ],
    reviewPolicy: {
      readinessThresholdBasisPoints: 6_000,
      evidenceClass: "SYNTHETIC_MODEL_ASSUMPTION",
      meaning: "SYNTHETIC_REVIEW_HEURISTIC_NOT_AUTHORIZATION",
      evidenceRefs: ["EV-SYN-E7-ALPHA-REVIEW-POLICY-V1"],
    },
    evidenceRefs: ["EV-SYN-E7-ALPHA-CORRIDOR-PLAN-V1"],
    stage: "STAGE_4",
    syntheticOnly: true,
  }),
  CorridorPlanSchema.parse({
    schemaVersion: 1,
    planId: "corridor_plan_syn_beta_adama",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    anchorHubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    corridorId: "corridor_syn_adama_beta",
    corridorLabel: "Synthetic Adama PartnerFI Beta planning corridor",
    regionIds: [SYNTHETIC_REGION_IDS.ADAMA],
    candidates: [
      {
        candidateId: "corridor_candidate_syn_beta_adama_research",
        regionId: SYNTHETIC_REGION_IDS.ADAMA,
        locationRef: "location_syn_adama_beta_research_001",
        displayLabel: "Synthetic Beta candidate reference 001",
        planningInputEvidenceClass: "SYNTHETIC_MODEL_ASSUMPTION",
        existingHubRef: null,
        candidateHubDensityIndex: 48,
        demandIndex: 53,
        connectivityIndex: 57,
        partnerInterestIndex: null,
        logisticsFeasibilityIndex: 49,
        liquidityFeasibilityIndex: 51,
        operatingCostFeasibilityIndex: 52,
        connectivityProfile: "MIXED_SYNTHETIC",
        logisticsState: "CONSTRAINED_SYNTHETIC",
        liquidityProfile: "VARIABLE_SYNTHETIC",
        partnerCommitmentState: "NOT_COMMITTED_STAGE4",
        proposedPilotBoundary: {
          boundaryClass: "SYNTHETIC_PLANNING_ONLY",
          maxCandidateHubs: 1,
        },
        evidence: CorridorEvidenceDimensionSchema.options.map((dimension) =>
          evidence(
            dimension,
            dimension === "PARTNER_INTEREST" ? "MISSING" : "PRESENT_SYNTHETIC",
            "BETA-ADAMA-001",
          ),
        ),
        evidenceRefs: ["EV-SYN-E7-BETA-ADAMA-RESEARCH-V1"],
      },
    ],
    reviewPolicy: {
      readinessThresholdBasisPoints: 6_000,
      evidenceClass: "SYNTHETIC_MODEL_ASSUMPTION",
      meaning: "SYNTHETIC_REVIEW_HEURISTIC_NOT_AUTHORIZATION",
      evidenceRefs: ["EV-SYN-E7-BETA-REVIEW-POLICY-V1"],
    },
    evidenceRefs: ["EV-SYN-E7-BETA-CORRIDOR-PLAN-V1"],
    stage: "STAGE_4",
    syntheticOnly: true,
  }),
] as const;

export const SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS =
  SYNTHETIC_E7_CORRIDOR_PLANS.map((plan) =>
    createStage4CorridorPlanningReadModel(plan),
  );
