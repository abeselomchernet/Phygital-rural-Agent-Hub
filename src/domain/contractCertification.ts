import { z } from "zod";

import {
  PartnerAdapterIdSchema,
  PartnerContractCapabilityIdSchema,
  PartnerContractEnvironmentSchema,
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";

const uniqueStrings = (values: readonly string[]) =>
  new Set(values).size === values.length;

export const CertificationLevelSchema = z.enum([
  "L0_POLICY",
  "L1_SYNTHETIC",
  "L2_EXTERNAL_SANDBOX_TESTBED",
  "L3_STAGING",
  "L4_PRODUCTION_READINESS",
]);
export type CertificationLevel = z.infer<typeof CertificationLevelSchema>;

export const CertificationScopeSchema = z.enum([
  "SCHEMA_POLICY",
  "FOUNDATION_OPERATION",
  "CAPABILITY_EXECUTION",
]);
export type CertificationScope = z.infer<typeof CertificationScopeSchema>;

export const CertificationRuntimeModeSchema = z.enum([
  "FOUNDATION_ONLY",
  "EXECUTABLE",
]);
export type CertificationRuntimeMode = z.infer<
  typeof CertificationRuntimeModeSchema
>;

export const CertificationFindingSeveritySchema = z.enum([
  "BLOCKER",
  "HIGH",
  "MEDIUM",
  "LOW",
]);
export type CertificationFindingSeverity = z.infer<
  typeof CertificationFindingSeveritySchema
>;

export const CertificationResultSchema = z.enum(["PASS", "FAIL", "INCOMPLETE"]);
export type CertificationResult = z.infer<typeof CertificationResultSchema>;

const VersionSchema = z.number().int().positive().max(1_000_000);
const ConfigSchemaIdSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[A-Z0-9][A-Z0-9_.-]*$/);

export const CertificationSubjectSchema = z
  .object({
    partnerOrgId: PartnerOrgIdSchema,
    contractPartnerOrgId: PartnerOrgIdSchema,
    catalogPartnerOrgId: PartnerOrgIdSchema,
    routeProviderOrgId: PartnerOrgIdSchema,
    contractVersion: VersionSchema,
    catalogVersion: VersionSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    routeId: PartnerRouteIdSchema,
    routeVersion: VersionSchema,
    adapterId: PartnerAdapterIdSchema,
    adapterVersion: VersionSchema,
    runtimeMode: CertificationRuntimeModeSchema,
    environment: PartnerContractEnvironmentSchema,
    configSchemaId: ConfigSchemaIdSchema,
    externalContractRef: PartnerEvidenceRefSchema,
    scope: CertificationScopeSchema,
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .min(1)
      .max(64)
      .refine(uniqueStrings, "subject evidence refs must be unique"),
  })
  .strict();
export type CertificationSubject = z.infer<typeof CertificationSubjectSchema>;

export const CertificationCheckDefinitionSchema = z
  .object({
    checkId: z.string().regex(/^CERT\.[A-Z0-9_.-]{2,96}$/),
    required: z.boolean(),
    family: z.enum([
      "SCHEMA_POLICY",
      "AUTHORIZATION",
      "CAPABILITY_STATE",
      "IDEMPOTENCY_REPLAY",
      "AMBIGUOUS_OUTCOME",
      "AUTHORITY_SEMANTICS",
      "ROUTE_PROVENANCE",
      "ENVIRONMENT_ISOLATION",
      "SECRETS_PRIVACY",
      "CALLBACKS",
      "DURABILITY_RECOVERY",
      "OFFLINE",
      "WORKSPACE_UI",
      "PROVIDER_PROFILE",
    ]),
    description: z.string().min(3).max(240),
  })
  .strict();
export type CertificationCheckDefinition = z.infer<
  typeof CertificationCheckDefinitionSchema
>;

export const CertificationCheckObservationSchema = z
  .object({
    checkId: z.string().regex(/^CERT\.[A-Z0-9_.-]{2,96}$/),
    outcome: z.enum(["PASS", "FAIL", "NOT_RUN"]),
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(32)
      .refine(uniqueStrings, "check evidence refs must be unique"),
    note: z.string().min(1).max(320),
  })
  .strict();
export type CertificationCheckObservation = z.infer<
  typeof CertificationCheckObservationSchema
>;

export const CertificationFindingSchema = z
  .object({
    findingId: z.string().regex(/^finding_[A-Za-z0-9_-]+$/),
    severity: CertificationFindingSeveritySchema,
    checkId: z.string().regex(/^CERT\.[A-Z0-9_.-]{2,96}$/),
    summary: z.string().min(3).max(280),
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(32)
      .refine(uniqueStrings, "finding evidence refs must be unique"),
  })
  .strict();
export type CertificationFinding = z.infer<typeof CertificationFindingSchema>;

export const CertificationReportSchema = z
  .object({
    certificationId: z.string().regex(/^cert_[A-Za-z0-9_-]+$/),
    suiteVersion: z.literal(1),
    level: CertificationLevelSchema,
    subject: CertificationSubjectSchema,
    result: CertificationResultSchema,
    checks: z
      .array(
        z
          .object({
            definition: CertificationCheckDefinitionSchema,
            observation: CertificationCheckObservationSchema,
          })
          .strict(),
      )
      .min(1)
      .max(256),
    findings: z.array(CertificationFindingSchema).max(128),
    evidenceRefs: z
      .array(PartnerEvidenceRefSchema)
      .max(128)
      .refine(uniqueStrings, "report evidence refs must be unique"),
    controlledExternalRun: z.boolean(),
    programStage: z.literal("STAGE_3_SYNTHETIC"),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    authorityGranted: z.literal(false),
  })
  .strict();
export type CertificationReport = z.infer<typeof CertificationReportSchema>;

export const COMMON_CERTIFICATION_CHECKS: readonly CertificationCheckDefinition[] = [
  {
    checkId: "CERT.SCHEMA.SUBJECT",
    required: true,
    family: "SCHEMA_POLICY",
    description: "Certification subject is strict, complete and version-pinned.",
  },
  {
    checkId: "CERT.AUTH.PARTNER_SCOPE",
    required: true,
    family: "AUTHORIZATION",
    description: "Contract, catalog and route provider belong to the certification partner.",
  },
  {
    checkId: "CERT.STATE.RUNTIME_MODE",
    required: true,
    family: "CAPABILITY_STATE",
    description: "Foundation-only registrations cannot certify executable capability scope.",
  },
  {
    checkId: "CERT.ROUTE.PROVENANCE",
    required: true,
    family: "ROUTE_PROVENANCE",
    description: "Service, capability, route and adapter versions are explicitly pinned.",
  },
  {
    checkId: "CERT.ENV.ISOLATION",
    required: true,
    family: "ENVIRONMENT_ISOLATION",
    description: "Certification level and environment are compatible with current program stage.",
  },
  {
    checkId: "CERT.AUTHORITY.NO_AUTO_ACTIVATION",
    required: true,
    family: "AUTHORITY_SEMANTICS",
    description: "Certification evidence does not itself grant production or settlement authority.",
  },
  {
    checkId: "CERT.SECRETS.REFERENCE_ONLY",
    required: true,
    family: "SECRETS_PRIVACY",
    description: "Certification subject/report contains evidence references rather than credential values.",
  },
].map((entry) => CertificationCheckDefinitionSchema.parse(entry));

export type CertificationProgramStage = "STAGE_3_SYNTHETIC";

function autoObservation(
  definition: CertificationCheckDefinition,
  subject: CertificationSubject,
  level: CertificationLevel,
  controlledExternalRun: boolean,
): CertificationCheckObservation {
  let outcome: CertificationCheckObservation["outcome"] = "PASS";
  let note = "Deterministic common certification check passed.";

  switch (definition.checkId) {
    case "CERT.AUTH.PARTNER_SCOPE":
      if (
        subject.partnerOrgId !== subject.contractPartnerOrgId ||
        subject.partnerOrgId !== subject.catalogPartnerOrgId ||
        subject.partnerOrgId !== subject.routeProviderOrgId
      ) {
        outcome = "FAIL";
        note = "Cross-partner contract/catalog/route references are not permitted.";
      }
      break;
    case "CERT.STATE.RUNTIME_MODE":
      if (
        subject.runtimeMode === "FOUNDATION_ONLY" &&
        subject.scope === "CAPABILITY_EXECUTION"
      ) {
        outcome = "FAIL";
        note = "A FOUNDATION_ONLY adapter cannot certify executable capability scope.";
      }
      break;
    case "CERT.ENV.ISOLATION":
      if (level === "L1_SYNTHETIC" && subject.environment !== "synthetic") {
        outcome = "FAIL";
        note = "L1 synthetic certification requires a synthetic subject environment.";
      } else if (
        level === "L2_EXTERNAL_SANDBOX_TESTBED" &&
        !["sandbox", "testbed"].includes(subject.environment)
      ) {
        outcome = "FAIL";
        note = "L2 certification requires sandbox or TestBed environment.";
      } else if (level === "L2_EXTERNAL_SANDBOX_TESTBED" && !controlledExternalRun) {
        outcome = "FAIL";
        note = "L2 certification requires an explicitly controlled external run.";
      } else if (level === "L3_STAGING" || level === "L4_PRODUCTION_READINESS") {
        outcome = "FAIL";
        note = "Current Stage 3 policy blocks staging and production-readiness certification.";
      }
      break;
    case "CERT.SECRETS.REFERENCE_ONLY": {
      const serialized = JSON.stringify(subject).toLowerCase();
      if (
        serialized.includes("private key") ||
        serialized.includes("begin private") ||
        serialized.includes("apikey") ||
        serialized.includes("api_secret") ||
        serialized.includes("password")
      ) {
        outcome = "FAIL";
        note = "Secret-like material is not permitted in the certification subject.";
      }
      break;
    }
    default:
      break;
  }

  return CertificationCheckObservationSchema.parse({
    checkId: definition.checkId,
    outcome,
    evidenceRefs: subject.evidenceRefs,
    note,
  });
}

function deriveResult(input: {
  checks: CertificationReport["checks"];
  findings: readonly CertificationFinding[];
}): CertificationResult {
  if (
    input.findings.some(
      (finding) => finding.severity === "BLOCKER" || finding.severity === "HIGH",
    ) ||
    input.checks.some(
      (entry) => entry.definition.required && entry.observation.outcome === "FAIL",
    )
  )
    return "FAIL";

  if (
    input.checks.some(
      (entry) => entry.definition.required && entry.observation.outcome === "NOT_RUN",
    )
  )
    return "INCOMPLETE";

  return "PASS";
}

export function runContractCertification(input: {
  certificationId: string;
  subject: CertificationSubject;
  level: CertificationLevel;
  profileChecks?: CertificationCheckDefinition[];
  observations?: CertificationCheckObservation[];
  findings?: CertificationFinding[];
  controlledExternalRun?: boolean;
  startedAt: string;
  completedAt: string;
  programStage?: CertificationProgramStage;
}) {
  const subject = CertificationSubjectSchema.parse(input.subject);
  const level = CertificationLevelSchema.parse(input.level);
  const controlledExternalRun = input.controlledExternalRun ?? false;
  const definitions = [
    ...COMMON_CERTIFICATION_CHECKS,
    ...(input.profileChecks ?? []).map((entry) =>
      CertificationCheckDefinitionSchema.parse(entry),
    ),
  ];
  if (!uniqueStrings(definitions.map((entry) => entry.checkId)))
    throw new Error("CERTIFICATION_CHECK_ID_DUPLICATE");

  const supplied = new Map(
    (input.observations ?? []).map((entry) => {
      const parsed = CertificationCheckObservationSchema.parse(entry);
      return [parsed.checkId, parsed] as const;
    }),
  );
  if (supplied.size !== (input.observations ?? []).length)
    throw new Error("CERTIFICATION_OBSERVATION_DUPLICATE");
  for (const checkId of supplied.keys()) {
    if (!definitions.some((entry) => entry.checkId === checkId))
      throw new Error("CERTIFICATION_OBSERVATION_UNKNOWN_CHECK");
  }

  const checks = definitions.map((definition) => {
    const observation =
      supplied.get(definition.checkId) ??
      (COMMON_CERTIFICATION_CHECKS.some(
        (entry) => entry.checkId === definition.checkId,
      )
        ? autoObservation(definition, subject, level, controlledExternalRun)
        : CertificationCheckObservationSchema.parse({
            checkId: definition.checkId,
            outcome: "NOT_RUN",
            evidenceRefs: [],
            note: "Required profile check was not executed.",
          }));
    if (observation.checkId !== definition.checkId)
      throw new Error("CERTIFICATION_CHECK_OBSERVATION_MISMATCH");
    return { definition, observation };
  });

  const findings = (input.findings ?? []).map((entry) =>
    CertificationFindingSchema.parse(entry),
  );
  for (const finding of findings) {
    if (!definitions.some((entry) => entry.checkId === finding.checkId))
      throw new Error("CERTIFICATION_FINDING_UNKNOWN_CHECK");
  }

  const evidenceRefs = [
    ...new Set([
      ...subject.evidenceRefs,
      ...checks.flatMap((entry) => entry.observation.evidenceRefs),
      ...findings.flatMap((entry) => entry.evidenceRefs),
    ]),
  ];

  return CertificationReportSchema.parse({
    certificationId: input.certificationId,
    suiteVersion: 1,
    level,
    subject,
    result: deriveResult({ checks, findings }),
    checks,
    findings,
    evidenceRefs,
    controlledExternalRun,
    programStage: input.programStage ?? "STAGE_3_SYNTHETIC",
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    authorityGranted: false,
  });
}

export function certificationEvidenceRef(report: CertificationReport) {
  const parsed = CertificationReportSchema.parse(report);
  if (parsed.result !== "PASS") throw new Error("CERTIFICATION_PASS_REQUIRED");
  return PartnerEvidenceRefSchema.parse(
    `CERT:${parsed.certificationId}:${parsed.subject.capabilityId}:${parsed.subject.adapterVersion}:${parsed.subject.routeVersion}`,
  );
}
