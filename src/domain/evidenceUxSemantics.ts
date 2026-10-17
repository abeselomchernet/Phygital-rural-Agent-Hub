import { z } from "zod";

import {
  EvidenceExplorerRecordSchema,
  type EvidenceExplorerRecord,
} from "./evidenceExplorer";

export const EvidenceUxStateSchema = z.enum([
  "DIGEST_VALID",
  "DIGEST_MISMATCH",
  "EXTERNALLY_VERIFIED",
  "NOT_EXTERNALLY_VERIFIED",
  "SYNTHETIC",
  "OUTCOME_UNCERTAIN",
  "RECONCILIATION_REQUIRED",
  "OFFLINE_CAPTURED",
  "EXPIRED",
  "CORRECTED",
  "SUPERSEDED",
]);

export type EvidenceUxState = z.infer<typeof EvidenceUxStateSchema>;

export const EvidenceUxToneSchema = z.enum([
  "integrity",
  "external",
  "synthetic",
  "attention",
  "neutral",
  "failure",
]);

export const EvidenceUxDescriptorSchema = z
  .object({
    state: EvidenceUxStateSchema,
    label: z.string().min(1).max(80),
    tooltip: z.string().min(1).max(260),
    tone: EvidenceUxToneSchema,
    semanticTruthEstablished: z.literal(false),
    financialAuthorityGranted: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
  })
  .strict();

export type EvidenceUxDescriptor = z.infer<typeof EvidenceUxDescriptorSchema>;

const DESCRIPTORS: Record<EvidenceUxState, EvidenceUxDescriptor> = {
  DIGEST_VALID: {
    state: "DIGEST_VALID",
    label: "Integrity verified",
    tooltip:
      "The recorded digest matches the governed evidence bytes. This does not verify semantic truth.",
    tone: "integrity",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  DIGEST_MISMATCH: {
    state: "DIGEST_MISMATCH",
    label: "Integrity failed",
    tooltip:
      "The evidence digest does not match the governed content. The evidence must not be treated as intact.",
    tone: "failure",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  EXTERNALLY_VERIFIED: {
    state: "EXTERNALLY_VERIFIED",
    label: "Externally confirmed",
    tooltip:
      "An external authority confirmation is recorded for this evidence. It does not grant Enawuga financial authority.",
    tone: "external",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  NOT_EXTERNALLY_VERIFIED: {
    state: "NOT_EXTERNALLY_VERIFIED",
    label: "Not externally verified",
    tooltip:
      "No external institutional confirmation is established for this evidence.",
    tone: "neutral",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  SYNTHETIC: {
    state: "SYNTHETIC",
    label: "Synthetic fixture",
    tooltip:
      "Generated from synthetic test data. It does not represent a real farmer, live institution or financial transaction.",
    tone: "synthetic",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  OUTCOME_UNCERTAIN: {
    state: "OUTCOME_UNCERTAIN",
    label: "Outcome uncertain",
    tooltip:
      "The external outcome is ambiguous. No success, failure or settlement inference is permitted until reconciliation.",
    tone: "attention",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  RECONCILIATION_REQUIRED: {
    state: "RECONCILIATION_REQUIRED",
    label: "Needs reconciliation",
    tooltip:
      "Internal and external records require governed comparison before an authoritative outcome can be recorded.",
    tone: "attention",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  OFFLINE_CAPTURED: {
    state: "OFFLINE_CAPTURED",
    label: "Captured offline",
    tooltip:
      "Captured while offline. Server-side re-evaluation is required after sync; local capture creates no authority.",
    tone: "neutral",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  EXPIRED: {
    state: "EXPIRED",
    label: "Evidence expired",
    tooltip:
      "The evidence freshness period has passed and it may not reflect current state.",
    tone: "failure",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  CORRECTED: {
    state: "CORRECTED",
    label: "Corrected",
    tooltip:
      "A correction exists. The original remains in the append-only history and downstream projections may require refresh.",
    tone: "attention",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
  SUPERSEDED: {
    state: "SUPERSEDED",
    label: "Superseded",
    tooltip:
      "A newer evidence record supersedes this record. The original remains visible for audit lineage.",
    tone: "neutral",
    semanticTruthEstablished: false,
    financialAuthorityGranted: false,
    settlementAuthorityGranted: false,
  },
};

for (const descriptor of Object.values(DESCRIPTORS))
  EvidenceUxDescriptorSchema.parse(descriptor);

const ORDER: readonly EvidenceUxState[] = [
  "DIGEST_MISMATCH",
  "OUTCOME_UNCERTAIN",
  "RECONCILIATION_REQUIRED",
  "EXPIRED",
  "CORRECTED",
  "SUPERSEDED",
  "OFFLINE_CAPTURED",
  "SYNTHETIC",
  "EXTERNALLY_VERIFIED",
  "NOT_EXTERNALLY_VERIFIED",
  "DIGEST_VALID",
];

export function describeEvidenceUxState(stateInput: unknown) {
  const state = EvidenceUxStateSchema.parse(stateInput);
  return DESCRIPTORS[state];
}

export function describeEvidenceUxStates(statesInput: readonly unknown[]) {
  const unique = new Set(
    statesInput.map((state) => EvidenceUxStateSchema.parse(state)),
  );
  if (unique.has("DIGEST_VALID") && unique.has("DIGEST_MISMATCH"))
    throw new Error("EVIDENCE_UX_INTEGRITY_STATE_CONFLICT");
  if (
    unique.has("EXTERNALLY_VERIFIED") &&
    unique.has("NOT_EXTERNALLY_VERIFIED")
  )
    throw new Error("EVIDENCE_UX_EXTERNAL_STATE_CONFLICT");
  if (unique.has("SYNTHETIC") && unique.has("EXTERNALLY_VERIFIED"))
    throw new Error("SYNTHETIC_EVIDENCE_CANNOT_SHOW_EXTERNAL_CONFIRMATION");

  return ORDER.filter((state) => unique.has(state)).map(
    (state) => DESCRIPTORS[state],
  );
}

export function evidenceExplorerUxStates(recordInput: unknown): EvidenceUxState[] {
  const record: EvidenceExplorerRecord = EvidenceExplorerRecordSchema.parse(recordInput);
  const states: EvidenceUxState[] = [];

  if (record.integrityState === "INTEGRITY_VERIFIED") states.push("DIGEST_VALID");
  if (record.synthetic) states.push("SYNTHETIC");
  if (record.externalAuthorityState === "EXTERNALLY_AUTHORITATIVE")
    states.push("EXTERNALLY_VERIFIED");
  else states.push("NOT_EXTERNALLY_VERIFIED");

  if (record.reviewState === "RECONCILIATION_REQUIRED")
    states.push("RECONCILIATION_REQUIRED");
  if (record.reviewState === "EXPIRED") states.push("EXPIRED");
  if (record.reviewState === "CORRECTED") states.push("CORRECTED");

  describeEvidenceUxStates(states);
  return states;
}

export function offlineEvidenceUxStates(input: {
  digestVerified: boolean;
  reconciliationRequired: boolean;
  outcomeUncertain?: boolean;
}) {
  const states: EvidenceUxState[] = [
    input.digestVerified ? "DIGEST_VALID" : "DIGEST_MISMATCH",
    "SYNTHETIC",
    "NOT_EXTERNALLY_VERIFIED",
    "OFFLINE_CAPTURED",
  ];
  if (input.reconciliationRequired) states.push("RECONCILIATION_REQUIRED");
  if (input.outcomeUncertain) states.push("OUTCOME_UNCERTAIN");
  describeEvidenceUxStates(states);
  return states;
}
