import { z } from "zod";

import { computeCanonicalSha256 } from "./evidenceIntegrity";
import { HubIdSchema, HubTenantIdSchema, SYNTHETIC_HUB_IDS, SYNTHETIC_HUB_TENANT_IDS, syntheticHubs } from "./hub";
import { SYNTHETIC_HUB_SERVICE_BINDINGS } from "./hubServiceComposition";
import {
  PartnerOrgIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "./syntheticReferencePartners";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

const EvidenceRefsSchema = z
  .array(z.string().min(1).max(160))
  .min(1)
  .max(32)
  .refine(uniqueStrings, "evidence refs must be unique");

export const HubEconomicsSchemaVersion = 1 as const;

export const HubEconomicsEvidenceClassSchema = z.enum([
  "MODEL_ASSUMPTION",
  "MODEL_OUTPUT",
  "OBSERVED",
  "EXTERNALLY_VERIFIED",
]);
export type HubEconomicsEvidenceClass = z.infer<
  typeof HubEconomicsEvidenceClassSchema
>;

export const HubEconomicsEvidenceConfidenceSchema = z.enum([
  "SYNTHETIC_MODEL_ONLY",
  "OBSERVED_PENDING_REVIEW",
  "EXTERNALLY_VERIFIED",
]);

export const HubEconomicsCostBehaviorSchema = z.enum(["FIXED", "VARIABLE"]);
export const HubEconomicsCostSharingSchema = z.enum([
  "SHAREABLE",
  "NON_SHAREABLE",
]);

export const HubEconomicsServiceAssumptionSchema = z
  .object({
    serviceId: PartnerServiceIdSchema,
    monthlyVolume: z.number().int().nonnegative().max(1_000_000),
    unitRevenueMinor: z.number().int().nonnegative().max(1_000_000),
    unitVariableCostMinor: z.number().int().nonnegative().max(1_000_000),
    evidenceClass: z.literal("MODEL_ASSUMPTION"),
    confidence: z.literal("SYNTHETIC_MODEL_ONLY"),
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict();
export type HubEconomicsServiceAssumption = z.infer<
  typeof HubEconomicsServiceAssumptionSchema
>;

export const HubEconomicsFixedCostAssumptionSchema = z
  .object({
    costId: z.string().regex(/^hubcost_syn_[a-z0-9_]+$/),
    label: z.string().min(1).max(96),
    monthlyAmountMinor: z
      .number()
      .int()
      .nonnegative()
      .max(1_000_000_000_000),
    behavior: z.literal("FIXED"),
    sharingClass: HubEconomicsCostSharingSchema,
    evidenceClass: z.literal("MODEL_ASSUMPTION"),
    confidence: z.literal("SYNTHETIC_MODEL_ONLY"),
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict();
export type HubEconomicsFixedCostAssumption = z.infer<
  typeof HubEconomicsFixedCostAssumptionSchema
>;

export const HubEconomicsScenarioSchema = z
  .object({
    schemaVersion: z.literal(HubEconomicsSchemaVersion),
    scenarioId: z.string().regex(/^hubecon_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    modelVersion: z.string().regex(/^hub-economics-model-v[0-9]+$/),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    serviceAssumptions: z
      .array(HubEconomicsServiceAssumptionSchema)
      .min(1)
      .max(64),
    fixedCostAssumptions: z
      .array(HubEconomicsFixedCostAssumptionSchema)
      .min(1)
      .max(64),
    evidenceRefs: EvidenceRefsSchema,
    stage: z.literal("STAGE_4"),
    syntheticOnly: z.literal(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    const serviceIds = value.serviceAssumptions.map((item) => item.serviceId);
    if (new Set(serviceIds).size !== serviceIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "service assumptions must be unique",
        path: ["serviceAssumptions"],
      });
    }
    const costIds = value.fixedCostAssumptions.map((item) => item.costId);
    if (new Set(costIds).size !== costIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fixed cost assumptions must be unique",
        path: ["fixedCostAssumptions"],
      });
    }
    if (Date.parse(value.periodEnd) <= Date.parse(value.periodStart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "periodEnd must be later than periodStart",
        path: ["periodEnd"],
      });
    }
  });
export type HubEconomicsScenario = z.infer<typeof HubEconomicsScenarioSchema>;

export const HubRevenueAttributionSchema = z
  .object({
    serviceId: PartnerServiceIdSchema,
    monthlyVolume: z.number().int().nonnegative(),
    unitRevenueMinor: z.number().int().nonnegative(),
    modeledRevenueMinor: z.number().int().nonnegative(),
    currency: z.literal("ETB"),
    volumeEvidenceClass: z.literal("MODEL_ASSUMPTION"),
    unitRevenueEvidenceClass: z.literal("MODEL_ASSUMPTION"),
    revenueEvidenceClass: z.literal("MODEL_OUTPUT"),
    confidence: z.literal("SYNTHETIC_MODEL_ONLY"),
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict();
export type HubRevenueAttribution = z.infer<typeof HubRevenueAttributionSchema>;

export const HubEconomicsVariableCostOutputSchema = z
  .object({
    serviceId: PartnerServiceIdSchema,
    monthlyVolume: z.number().int().nonnegative(),
    unitVariableCostMinor: z.number().int().nonnegative(),
    modeledVariableCostMinor: z.number().int().nonnegative(),
    currency: z.literal("ETB"),
    behavior: z.literal("VARIABLE"),
    unitCostEvidenceClass: z.literal("MODEL_ASSUMPTION"),
    costEvidenceClass: z.literal("MODEL_OUTPUT"),
    confidence: z.literal("SYNTHETIC_MODEL_ONLY"),
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict();

export const HubEconomicsModelObservedVarianceSchema = z
  .object({
    status: z.literal("NOT_AVAILABLE_STAGE4"),
    modeledMarginMinor: z.number().int(),
    observedMarginMinor: z.null(),
    varianceMinor: z.null(),
    observedEvidenceRefs: z.array(z.never()).length(0),
    reason: z.literal(
      "Stage-4 synthetic model outputs are not observed pilot performance.",
    ),
  })
  .strict();

export const HubEconomicsReadModelSchema = z
  .object({
    schemaVersion: z.literal(HubEconomicsSchemaVersion),
    scenarioId: z.string().regex(/^hubecon_syn_[a-z0-9_]+$/),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    modelVersion: z.string().regex(/^hub-economics-model-v[0-9]+$/),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    revenueAttribution: z.array(HubRevenueAttributionSchema).min(1).max(64),
    variableCostOutputs: z
      .array(HubEconomicsVariableCostOutputSchema)
      .min(1)
      .max(64),
    fixedCostClassification: z
      .array(HubEconomicsFixedCostAssumptionSchema)
      .min(1)
      .max(64),
    totals: z
      .object({
        modeledRevenueMinor: z.number().int().nonnegative(),
        modeledVariableCostMinor: z.number().int().nonnegative(),
        modeledFixedCostMinor: z.number().int().nonnegative(),
        modeledTotalCostMinor: z.number().int().nonnegative(),
        modeledMarginMinor: z.number().int(),
        currency: z.literal("ETB"),
        evidenceClass: z.literal("MODEL_OUTPUT"),
        confidence: z.literal("SYNTHETIC_MODEL_ONLY"),
      })
      .strict(),
    modelVsObservedVariance: HubEconomicsModelObservedVarianceSchema,
    evidenceClassAvailability: z
      .object({
        MODEL_ASSUMPTION: z.literal(true),
        MODEL_OUTPUT: z.literal(true),
        OBSERVED: z.literal(false),
        EXTERNALLY_VERIFIED: z.literal(false),
      })
      .strict(),
    evidenceRefs: EvidenceRefsSchema,
    economicsDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    readBoundary: z
      .object({
        stage: z.literal("STAGE_4"),
        syntheticOnly: z.literal(true),
        readOnly: z.literal(true),
        modelIsObservedPerformance: z.literal(false),
        forecastAccuracyClaimed: z.literal(false),
        accountingTruthClaimed: z.literal(false),
        realFundsIncluded: z.literal(false),
        partnerPostingAuthorityGranted: z.literal(false),
        settlementAuthorityGranted: z.literal(false),
        observedPilotEvidencePresent: z.literal(false),
        externalVerificationPresent: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type HubEconomicsReadModel = z.infer<typeof HubEconomicsReadModelSchema>;

function uniqueEvidence(...groups: readonly (readonly string[])[]) {
  return [...new Set(groups.flat())].sort();
}

function validateScenarioScope(scenario: HubEconomicsScenario) {
  const hub = syntheticHubs.find((item) => item.hubId === scenario.hubId);
  if (!hub || hub.tenantId !== scenario.tenantId) {
    throw new Error("HUB_ECONOMICS_HUB_SCOPE_MISMATCH");
  }
  if (
    !hub.partnerMemberships.some(
      (membership) => membership.partnerOrgId === scenario.partnerOrgId,
    )
  ) {
    throw new Error("HUB_ECONOMICS_PARTNER_SCOPE_MISMATCH");
  }
  const enabledServices = new Set(
    SYNTHETIC_HUB_SERVICE_BINDINGS.filter(
      (binding) =>
        binding.hubId === scenario.hubId &&
        binding.partnerOrgId === scenario.partnerOrgId &&
        binding.state === "ENABLED_SYNTHETIC",
    ).map((binding) => binding.serviceId),
  );
  for (const assumption of scenario.serviceAssumptions) {
    if (!enabledServices.has(assumption.serviceId)) {
      throw new Error("HUB_ECONOMICS_SERVICE_NOT_GOVERNED");
    }
  }
}

export function createStage4HubEconomicsReadModel(
  input: unknown,
): HubEconomicsReadModel {
  const scenario = HubEconomicsScenarioSchema.parse(input);
  validateScenarioScope(scenario);

  const revenueAttribution = scenario.serviceAssumptions.map((assumption) =>
    HubRevenueAttributionSchema.parse({
      serviceId: assumption.serviceId,
      monthlyVolume: assumption.monthlyVolume,
      unitRevenueMinor: assumption.unitRevenueMinor,
      modeledRevenueMinor: assumption.monthlyVolume * assumption.unitRevenueMinor,
      currency: "ETB",
      volumeEvidenceClass: "MODEL_ASSUMPTION",
      unitRevenueEvidenceClass: "MODEL_ASSUMPTION",
      revenueEvidenceClass: "MODEL_OUTPUT",
      confidence: "SYNTHETIC_MODEL_ONLY",
      evidenceRefs: uniqueEvidence(
        assumption.evidenceRefs,
        scenario.evidenceRefs,
      ),
    }),
  );

  const variableCostOutputs = scenario.serviceAssumptions.map((assumption) =>
    HubEconomicsVariableCostOutputSchema.parse({
      serviceId: assumption.serviceId,
      monthlyVolume: assumption.monthlyVolume,
      unitVariableCostMinor: assumption.unitVariableCostMinor,
      modeledVariableCostMinor:
        assumption.monthlyVolume * assumption.unitVariableCostMinor,
      currency: "ETB",
      behavior: "VARIABLE",
      unitCostEvidenceClass: "MODEL_ASSUMPTION",
      costEvidenceClass: "MODEL_OUTPUT",
      confidence: "SYNTHETIC_MODEL_ONLY",
      evidenceRefs: uniqueEvidence(
        assumption.evidenceRefs,
        scenario.evidenceRefs,
      ),
    }),
  );

  const modeledRevenueMinor = revenueAttribution.reduce(
    (total, item) => total + item.modeledRevenueMinor,
    0,
  );
  const modeledVariableCostMinor = variableCostOutputs.reduce(
    (total, item) => total + item.modeledVariableCostMinor,
    0,
  );
  const modeledFixedCostMinor = scenario.fixedCostAssumptions.reduce(
    (total, item) => total + item.monthlyAmountMinor,
    0,
  );
  const modeledTotalCostMinor = modeledVariableCostMinor + modeledFixedCostMinor;
  const modeledMarginMinor = modeledRevenueMinor - modeledTotalCostMinor;

  const core = {
    schemaVersion: HubEconomicsSchemaVersion,
    scenarioId: scenario.scenarioId,
    tenantId: scenario.tenantId,
    hubId: scenario.hubId,
    partnerOrgId: scenario.partnerOrgId,
    modelVersion: scenario.modelVersion,
    periodStart: scenario.periodStart,
    periodEnd: scenario.periodEnd,
    revenueAttribution,
    variableCostOutputs,
    fixedCostClassification: scenario.fixedCostAssumptions,
    totals: {
      modeledRevenueMinor,
      modeledVariableCostMinor,
      modeledFixedCostMinor,
      modeledTotalCostMinor,
      modeledMarginMinor,
      currency: "ETB" as const,
      evidenceClass: "MODEL_OUTPUT" as const,
      confidence: "SYNTHETIC_MODEL_ONLY" as const,
    },
    modelVsObservedVariance: {
      status: "NOT_AVAILABLE_STAGE4" as const,
      modeledMarginMinor,
      observedMarginMinor: null,
      varianceMinor: null,
      observedEvidenceRefs: [] as [],
      reason:
        "Stage-4 synthetic model outputs are not observed pilot performance." as const,
    },
    evidenceClassAvailability: {
      MODEL_ASSUMPTION: true as const,
      MODEL_OUTPUT: true as const,
      OBSERVED: false as const,
      EXTERNALLY_VERIFIED: false as const,
    },
    evidenceRefs: uniqueEvidence(
      scenario.evidenceRefs,
      scenario.serviceAssumptions.flatMap((item) => item.evidenceRefs),
      scenario.fixedCostAssumptions.flatMap((item) => item.evidenceRefs),
    ),
    readBoundary: {
      stage: "STAGE_4" as const,
      syntheticOnly: true as const,
      readOnly: true as const,
      modelIsObservedPerformance: false as const,
      forecastAccuracyClaimed: false as const,
      accountingTruthClaimed: false as const,
      realFundsIncluded: false as const,
      partnerPostingAuthorityGranted: false as const,
      settlementAuthorityGranted: false as const,
      observedPilotEvidencePresent: false as const,
      externalVerificationPresent: false as const,
    },
  };

  return HubEconomicsReadModelSchema.parse({
    ...core,
    economicsDigest: computeCanonicalSha256(core),
  });
}

export function verifyStage4HubEconomicsReadModel(
  input: unknown,
): HubEconomicsReadModel {
  const model = HubEconomicsReadModelSchema.parse(input);
  const { economicsDigest, ...core } = model;
  if (economicsDigest !== computeCanonicalSha256(core)) {
    throw new Error("HUB_ECONOMICS_DIGEST_MISMATCH");
  }
  return model;
}

export function searchHubEconomics(input: {
  readModels: readonly unknown[];
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
}): readonly HubEconomicsReadModel[] {
  const tenantId = HubTenantIdSchema.parse(input.tenantId);
  const hubId = HubIdSchema.parse(input.hubId);
  const partnerOrgId = PartnerOrgIdSchema.parse(input.partnerOrgId);
  return input.readModels
    .map((model) => verifyStage4HubEconomicsReadModel(model))
    .filter(
      (model) =>
        model.tenantId === tenantId &&
        model.hubId === hubId &&
        model.partnerOrgId === partnerOrgId,
    )
    .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId));
}

function serviceAssumption(input: HubEconomicsServiceAssumption) {
  return HubEconomicsServiceAssumptionSchema.parse(input);
}

function fixedCost(input: HubEconomicsFixedCostAssumption) {
  return HubEconomicsFixedCostAssumptionSchema.parse(input);
}

export const SYNTHETIC_E5_HUB_ECONOMICS_SCENARIOS: readonly HubEconomicsScenario[] = [
  HubEconomicsScenarioSchema.parse({
    schemaVersion: 1,
    scenarioId: "hubecon_syn_adama_alpha_baseline",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    modelVersion: "hub-economics-model-v1",
    periodStart: "2026-10-01T00:00:00.000Z",
    periodEnd: "2026-11-01T00:00:00.000Z",
    serviceAssumptions: [
      serviceAssumption({
        serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
        monthlyVolume: 1200,
        unitRevenueMinor: 50,
        unitVariableCostMinor: 10,
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-ALPHA-ACCOUNT-ASSUMPTION-V1"],
      }),
      serviceAssumption({
        serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
        monthlyVolume: 400,
        unitRevenueMinor: 500,
        unitVariableCostMinor: 120,
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-ALPHA-CASHIN-ASSUMPTION-V1"],
      }),
      serviceAssumption({
        serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
        monthlyVolume: 300,
        unitRevenueMinor: 600,
        unitVariableCostMinor: 150,
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-ALPHA-CASHOUT-ASSUMPTION-V1"],
      }),
      serviceAssumption({
        serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ,
        monthlyVolume: 60,
        unitRevenueMinor: 1000,
        unitVariableCostMinor: 100,
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-ALPHA-NLC-ASSUMPTION-V1"],
      }),
    ],
    fixedCostAssumptions: [
      fixedCost({
        costId: "hubcost_syn_adama_alpha_connectivity",
        label: "Synthetic shared connectivity cost assumption",
        monthlyAmountMinor: 500_000,
        behavior: "FIXED",
        sharingClass: "SHAREABLE",
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-ALPHA-CONNECTIVITY-COST-V1"],
      }),
      fixedCost({
        costId: "hubcost_syn_adama_alpha_operations",
        label: "Synthetic partner operations cost assumption",
        monthlyAmountMinor: 900_000,
        behavior: "FIXED",
        sharingClass: "NON_SHAREABLE",
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-ALPHA-OPERATIONS-COST-V1"],
      }),
    ],
    evidenceRefs: ["EV-SYN-E5-ADAMA-ALPHA-BASELINE-V1"],
    stage: "STAGE_4",
    syntheticOnly: true,
  }),
  HubEconomicsScenarioSchema.parse({
    schemaVersion: 1,
    scenarioId: "hubecon_syn_adama_beta_baseline",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    modelVersion: "hub-economics-model-v1",
    periodStart: "2026-10-01T00:00:00.000Z",
    periodEnd: "2026-11-01T00:00:00.000Z",
    serviceAssumptions: [
      serviceAssumption({
        serviceId: SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
        monthlyVolume: 700,
        unitRevenueMinor: 40,
        unitVariableCostMinor: 10,
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-BETA-ACCOUNT-ASSUMPTION-V1"],
      }),
      serviceAssumption({
        serviceId: SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
        monthlyVolume: 250,
        unitRevenueMinor: 300,
        unitVariableCostMinor: 80,
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-BETA-SAVINGS-ASSUMPTION-V1"],
      }),
      serviceAssumption({
        serviceId: SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
        monthlyVolume: 100,
        unitRevenueMinor: 400,
        unitVariableCostMinor: 100,
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-BETA-SERVICE-ASSUMPTION-V1"],
      }),
    ],
    fixedCostAssumptions: [
      fixedCost({
        costId: "hubcost_syn_adama_beta_connectivity",
        label: "Synthetic shared connectivity cost assumption",
        monthlyAmountMinor: 350_000,
        behavior: "FIXED",
        sharingClass: "SHAREABLE",
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-BETA-CONNECTIVITY-COST-V1"],
      }),
      fixedCost({
        costId: "hubcost_syn_adama_beta_operations",
        label: "Synthetic partner operations cost assumption",
        monthlyAmountMinor: 600_000,
        behavior: "FIXED",
        sharingClass: "NON_SHAREABLE",
        evidenceClass: "MODEL_ASSUMPTION",
        confidence: "SYNTHETIC_MODEL_ONLY",
        evidenceRefs: ["EV-SYN-E5-BETA-OPERATIONS-COST-V1"],
      }),
    ],
    evidenceRefs: ["EV-SYN-E5-ADAMA-BETA-BASELINE-V1"],
    stage: "STAGE_4",
    syntheticOnly: true,
  }),
] as const;

export const SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS =
  SYNTHETIC_E5_HUB_ECONOMICS_SCENARIOS.map((scenario) =>
    createStage4HubEconomicsReadModel(scenario),
  );
