import { z } from "zod";
import {
  EvidenceExplorerRecordSchema,
  EvidenceExplorerViewerRoleSchema,
  SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
  projectEvidenceExplorerRecord,
} from "./evidenceExplorer";

const EvidenceIdSchema = z.string().regex(/^evidence_syn_[a-z0-9_]+$/);
const CorrectionIdSchema = z.string().regex(/^correction_syn_[a-z0-9_]+$/);
const IdentifierSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,119}$/);

export const EvidenceCorrectionReasonSchema = z.enum([
  "FACTUAL_CORRECTION",
  "PROVENANCE_CORRECTION",
  "STATUS_CORRECTION",
  "DUPLICATE_SUPERSESSION",
]);

export const EvidenceCorrectionRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    correctionId: CorrectionIdSchema,
    tenantId: IdentifierSchema,
    hubId: z.string().regex(/^hub_[a-z0-9][a-z0-9_-]{2,119}$/),
    partnerOrgId: IdentifierSchema,
    supersededEvidenceId: EvidenceIdSchema,
    replacementEvidenceId: EvidenceIdSchema,
    reason: EvidenceCorrectionReasonSchema,
    recordedAt: z.string().datetime(),
    appendOnly: z.literal(true),
    originalEvidenceDeleted: z.literal(false),
    automaticRecomputeAuthorized: z.literal(false),
    mutationAuthorityGranted: z.literal(false),
  })
  .strict()
  .refine(
    (record) => record.supersededEvidenceId !== record.replacementEvidenceId,
    "EVIDENCE_CORRECTION_SELF_SUPERSESSION_FORBIDDEN",
  );

export const EvidenceProjectionTargetSchema = z.enum([
  "EVIDENCE_EXPLORER",
  "FARMER360",
  "ARDI_DECISION_SUPPORT",
]);

export const EvidenceDependencySchema = z
  .object({
    schemaVersion: z.literal(1),
    dependencyId: z.string().regex(/^dependency_syn_[a-z0-9_]+$/),
    tenantId: IdentifierSchema,
    hubId: z.string().regex(/^hub_[a-z0-9][a-z0-9_-]{2,119}$/),
    partnerOrgId: IdentifierSchema,
    derivedEvidenceId: EvidenceIdSchema,
    sourceEvidenceIds: z.array(EvidenceIdSchema).min(1).max(32),
    projectionTargets: z.array(EvidenceProjectionTargetSchema).min(1).max(3),
    automaticRecomputeAuthorized: z.literal(false),
    decisionAuthorityGranted: z.literal(false),
  })
  .strict()
  .superRefine((dependency, context) => {
    if (new Set(dependency.sourceEvidenceIds).size !== dependency.sourceEvidenceIds.length)
      context.addIssue({
        code: "custom",
        message: "EVIDENCE_DEPENDENCY_SOURCE_DUPLICATE",
        path: ["sourceEvidenceIds"],
      });
    if (dependency.sourceEvidenceIds.includes(dependency.derivedEvidenceId))
      context.addIssue({
        code: "custom",
        message: "EVIDENCE_DEPENDENCY_SELF_REFERENCE_FORBIDDEN",
        path: ["derivedEvidenceId"],
      });
  });

export const EvidenceLineageResultSchema = z
  .object({
    requestedEvidenceId: EvidenceIdSchema,
    chain: z.array(
      z
        .object({
          evidence: z.unknown(),
          superseded: z.boolean(),
          supersededByEvidenceId: EvidenceIdSchema.optional(),
          correctionId: CorrectionIdSchema.optional(),
        })
        .strict(),
    ),
    invalidatedDerivedEvidenceIds: z.array(EvidenceIdSchema),
    projectionRecomputeRequired: z.array(EvidenceProjectionTargetSchema),
    originalEvidenceDeleted: z.literal(false),
    automaticRecomputePerformed: z.literal(false),
    decisionAuthorityGranted: z.literal(false),
  })
  .strict();

export type EvidenceCorrectionRecord = z.infer<typeof EvidenceCorrectionRecordSchema>;
export type EvidenceDependency = z.infer<typeof EvidenceDependencySchema>;

function ensureUnique<T>(values: readonly T[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(label);
}

function validateScopedLineage(input: {
  records: readonly unknown[];
  corrections: readonly unknown[];
  dependencies: readonly unknown[];
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
}) {
  const records = input.records.map((item) => EvidenceExplorerRecordSchema.parse(item));
  const corrections = input.corrections.map((item) => EvidenceCorrectionRecordSchema.parse(item));
  const dependencies = input.dependencies.map((item) => EvidenceDependencySchema.parse(item));
  ensureUnique(records.map((item) => item.evidenceId), "EVIDENCE_ID_DUPLICATE");
  ensureUnique(corrections.map((item) => item.correctionId), "EVIDENCE_CORRECTION_ID_DUPLICATE");
  ensureUnique(
    corrections.map((item) => item.supersededEvidenceId),
    "EVIDENCE_MULTIPLE_DIRECT_SUPERSESSIONS_FORBIDDEN",
  );
  ensureUnique(dependencies.map((item) => item.dependencyId), "EVIDENCE_DEPENDENCY_ID_DUPLICATE");

  const scopeRecord = (record: (typeof records)[number]) =>
    record.tenantId === input.tenantId &&
    record.hubId === input.hubId &&
    record.partnerOrgId === input.partnerOrgId;
  const scopedRecords = records.filter(scopeRecord);
  const byId = new Map(scopedRecords.map((record) => [record.evidenceId, record]));

  const scopedCorrections = corrections.filter(
    (item) =>
      item.tenantId === input.tenantId &&
      item.hubId === input.hubId &&
      item.partnerOrgId === input.partnerOrgId,
  );
  for (const correction of scopedCorrections) {
    const original = byId.get(correction.supersededEvidenceId);
    const replacement = byId.get(correction.replacementEvidenceId);
    if (!original || !replacement) throw new Error("EVIDENCE_CORRECTION_REFERENCE_OUT_OF_SCOPE");
    if (Date.parse(replacement.occurredAt) < Date.parse(original.occurredAt))
      throw new Error("EVIDENCE_CORRECTION_REPLACEMENT_PRECEDES_ORIGINAL");
    if (Date.parse(correction.recordedAt) < Date.parse(replacement.occurredAt))
      throw new Error("EVIDENCE_CORRECTION_RECORDED_BEFORE_REPLACEMENT");
  }

  const nextByEvidence = new Map(
    scopedCorrections.map((item) => [item.supersededEvidenceId, item]),
  );
  for (const start of scopedRecords) {
    const seen = new Set<string>();
    let cursor: string | undefined = start.evidenceId;
    while (cursor) {
      if (seen.has(cursor)) throw new Error("EVIDENCE_CORRECTION_CYCLE_FORBIDDEN");
      seen.add(cursor);
      cursor = nextByEvidence.get(cursor)?.replacementEvidenceId;
    }
  }

  const scopedDependencies = dependencies.filter(
    (item) =>
      item.tenantId === input.tenantId &&
      item.hubId === input.hubId &&
      item.partnerOrgId === input.partnerOrgId,
  );
  for (const dependency of scopedDependencies) {
    if (!byId.has(dependency.derivedEvidenceId))
      throw new Error("EVIDENCE_DEPENDENCY_DERIVED_OUT_OF_SCOPE");
    if (dependency.sourceEvidenceIds.some((id) => !byId.has(id)))
      throw new Error("EVIDENCE_DEPENDENCY_SOURCE_OUT_OF_SCOPE");
  }

  return { scopedRecords, scopedCorrections, scopedDependencies, byId, nextByEvidence };
}

export function buildEvidenceLineage(input: {
  records: readonly unknown[];
  corrections: readonly unknown[];
  dependencies: readonly unknown[];
  role: unknown;
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
  evidenceId: string;
}) {
  const role = EvidenceExplorerViewerRoleSchema.parse(input.role);
  const requestedEvidenceId = EvidenceIdSchema.parse(input.evidenceId);
  const validated = validateScopedLineage(input);
  if (!validated.byId.has(requestedEvidenceId)) return undefined;

  const predecessor = new Map(
    validated.scopedCorrections.map((item) => [item.replacementEvidenceId, item]),
  );
  let root = requestedEvidenceId;
  while (predecessor.has(root)) root = predecessor.get(root)!.supersededEvidenceId;

  const chain = [];
  const correctedSourceIds = new Set<string>();
  let cursor: string | undefined = root;
  while (cursor) {
    const record = validated.byId.get(cursor);
    if (!record) throw new Error("EVIDENCE_CORRECTION_CHAIN_OUT_OF_SCOPE");
    const correction = validated.nextByEvidence.get(cursor);
    if (correction) correctedSourceIds.add(cursor);
    chain.push({
      evidence: projectEvidenceExplorerRecord(record, role),
      superseded: Boolean(correction),
      ...(correction
        ? {
            supersededByEvidenceId: correction.replacementEvidenceId,
            correctionId: correction.correctionId,
          }
        : {}),
    });
    cursor = correction?.replacementEvidenceId;
  }

  const invalidated = new Set<string>();
  const targets = new Set<z.infer<typeof EvidenceProjectionTargetSchema>>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const dependency of validated.scopedDependencies) {
      if (invalidated.has(dependency.derivedEvidenceId)) continue;
      const sourceInvalid = dependency.sourceEvidenceIds.some(
        (id) => correctedSourceIds.has(id) || invalidated.has(id),
      );
      if (!sourceInvalid) continue;
      invalidated.add(dependency.derivedEvidenceId);
      for (const target of dependency.projectionTargets) targets.add(target);
      changed = true;
    }
  }

  return EvidenceLineageResultSchema.parse({
    requestedEvidenceId,
    chain,
    invalidatedDerivedEvidenceIds: [...invalidated].sort(),
    projectionRecomputeRequired: [...targets].sort(),
    originalEvidenceDeleted: false,
    automaticRecomputePerformed: false,
    decisionAuthorityGranted: false,
  });
}

const correctedCapture = EvidenceExplorerRecordSchema.parse({
  ...SYNTHETIC_EVIDENCE_EXPLORER_RECORDS[0],
  evidenceId: "evidence_syn_alpha_capture_corrected_001",
  occurredAt: "2026-10-15T06:11:00.000Z",
  reviewState: "CORRECTED",
  evidenceDigest: `sha256:${"e".repeat(64)}`,
  limitationCodes: ["synthetic_stage4", "corrects_prior_synthetic_evidence"],
});

export const SYNTHETIC_EVIDENCE_LINEAGE_RECORDS = [
  ...SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
  correctedCapture,
] as const;

export const SYNTHETIC_EVIDENCE_CORRECTIONS = [
  EvidenceCorrectionRecordSchema.parse({
    schemaVersion: 1,
    correctionId: "correction_syn_alpha_capture_001",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    supersededEvidenceId: "evidence_syn_alpha_capture_001",
    replacementEvidenceId: "evidence_syn_alpha_capture_corrected_001",
    reason: "FACTUAL_CORRECTION",
    recordedAt: "2026-10-15T06:12:00.000Z",
    appendOnly: true,
    originalEvidenceDeleted: false,
    automaticRecomputeAuthorized: false,
    mutationAuthorityGranted: false,
  }),
] as const;

export const SYNTHETIC_EVIDENCE_DEPENDENCIES = [
  EvidenceDependencySchema.parse({
    schemaVersion: 1,
    dependencyId: "dependency_syn_alpha_conflict_001",
    tenantId: "tenant_syn_enawuga_stage4",
    hubId: "hub_syn_adama_001",
    partnerOrgId: "org_syn_partnerfi_alpha",
    derivedEvidenceId: "evidence_syn_alpha_conflict_001",
    sourceEvidenceIds: ["evidence_syn_alpha_capture_001"],
    projectionTargets: [
      "EVIDENCE_EXPLORER",
      "FARMER360",
      "ARDI_DECISION_SUPPORT",
    ],
    automaticRecomputeAuthorized: false,
    decisionAuthorityGranted: false,
  }),
] as const;
