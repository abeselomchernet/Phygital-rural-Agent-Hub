import { createHash } from "node:crypto";
import { z } from "zod";

import { HubIdSchema, HubTenantIdSchema } from "./hub";
import {
  PartnerAdapterIdSchema,
  PartnerContractCapabilityIdSchema,
  PartnerEvidenceRefSchema,
  PartnerOrgIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
} from "./partnerCapabilityContract";

const OpaqueSyntheticId = (prefix: string, max = 120) =>
  z
    .string()
    .min(prefix.length + 2)
    .max(max)
    .regex(new RegExp(`^${prefix}[a-z0-9][a-z0-9_-]*$`));

export const HubWorkflowEnvelopeSchemaVersion = 1 as const;

export const HubWorkflowEventIdSchema = OpaqueSyntheticId("hubevt_syn_");
export const HubWorkflowCorrelationIdSchema = OpaqueSyntheticId("corr_syn_");
export const HubWorkflowRunIdSchema = OpaqueSyntheticId("run_syn_");
export const HubWorkflowIdempotencyKeySchema = OpaqueSyntheticId("idem_syn_", 160);

export const HubWorkflowEventTypeSchema = z.enum([
  "HUB_WORKFLOW_CAPTURED",
  "HUB_WORKFLOW_TRANSPORT_UPDATED",
  "HUB_WORKFLOW_AUTHORITY_UPDATED",
  "HUB_WORKFLOW_EVIDENCE_RECORDED",
  "HUB_WORKFLOW_OUTCOME_RECORDED",
]);
export type HubWorkflowEventType = z.infer<typeof HubWorkflowEventTypeSchema>;

export const HubWorkflowTransportStateSchema = z.enum([
  "CAPTURED_SYNTHETIC",
  "QUEUED_SYNTHETIC",
  "SUBMITTED_SYNTHETIC",
  "PROVIDER_PENDING_SYNTHETIC",
  "PROVIDER_EVIDENCE_RECEIVED_SYNTHETIC",
  "TRANSPORT_FAILED_SYNTHETIC",
]);
export type HubWorkflowTransportState = z.infer<
  typeof HubWorkflowTransportStateSchema
>;

export const HubWorkflowAuthorityStateSchema = z.enum([
  "NO_AUTHORITY_ASSERTED",
  "PARTNER_REVIEW_REQUIRED",
  "PARTNER_AUTH_PENDING_SYNTHETIC",
  "PARTNER_AUTHORIZED_SYNTHETIC",
  "PARTNER_REJECTED_SYNTHETIC",
]);
export type HubWorkflowAuthorityState = z.infer<
  typeof HubWorkflowAuthorityStateSchema
>;

export const HubWorkflowOutcomeSchema = z.enum([
  "RECORDED",
  "DEFERRED",
  "DENIED",
  "UNVERIFIED",
  "COMPLETED_SYNTHETIC",
]);
export type HubWorkflowOutcome = z.infer<typeof HubWorkflowOutcomeSchema>;

export const HubWorkflowLimitationSchema = z.enum([
  "SYNTHETIC_ONLY",
  "NO_REAL_PII",
  "NO_REAL_FUNDS",
  "NO_SETTLEMENT_AUTHORITY",
  "NO_PROVIDER_AUTHORITY",
  "NO_DEVICE_CONTROL",
  "NO_PRODUCTION_AUTH",
  "NO_LIVE_PROVIDER_CALL",
]);
export type HubWorkflowLimitation = z.infer<typeof HubWorkflowLimitationSchema>;

export const HubWorkflowProvenanceSchema = z
  .object({
    mode: z.literal("SYNTHETIC_STAGE4"),
    source: z.literal("ENAWUGA_HUB_DOMAIN"),
    contractVersion: z.number().int().positive().nullable(),
    catalogVersion: z.number().int().positive().nullable(),
    routeVersion: z.number().int().positive().nullable(),
    adapterVersion: z.number().int().positive().nullable(),
  })
  .strict();
export type HubWorkflowProvenance = z.infer<
  typeof HubWorkflowProvenanceSchema
>;

export const HubWorkflowEnvelopeContentSchema = z
  .object({
    schemaVersion: z.literal(HubWorkflowEnvelopeSchemaVersion),
    eventId: HubWorkflowEventIdSchema,
    eventType: HubWorkflowEventTypeSchema,
    occurredAt: z.string().datetime({ offset: true }),
    correlationId: HubWorkflowCorrelationIdSchema,
    runId: HubWorkflowRunIdSchema,
    idempotencyKey: HubWorkflowIdempotencyKeySchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema.nullable(),
    capabilityId: PartnerContractCapabilityIdSchema.nullable(),
    routeId: PartnerRouteIdSchema.nullable(),
    adapterId: PartnerAdapterIdSchema.nullable(),
    transportState: HubWorkflowTransportStateSchema,
    authorityState: HubWorkflowAuthorityStateSchema,
    outcome: HubWorkflowOutcomeSchema,
    limitationCodes: z.array(HubWorkflowLimitationSchema).min(1).max(16),
    evidenceRefs: z.array(PartnerEvidenceRefSchema).max(64),
    provenance: HubWorkflowProvenanceSchema,
    detailCode: z
      .string()
      .min(1)
      .max(96)
      .regex(/^[A-Z0-9][A-Z0-9_.-]*$/)
      .nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.limitationCodes).size !== value.limitationCodes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limitationCodes"],
        message: "limitation codes must be unique",
      });
    }
    if (new Set(value.evidenceRefs).size !== value.evidenceRefs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "evidence refs must be unique",
      });
    }
    const hasService = value.serviceId !== null;
    const hasCapability = value.capabilityId !== null;
    if (hasService !== hasCapability) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceId"],
        message: "service and capability references must be present together",
      });
    }
    const hasRoute = value.routeId !== null;
    const hasAdapter = value.adapterId !== null;
    if (hasRoute !== hasAdapter) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["routeId"],
        message: "route and adapter references must be present together",
      });
    }
    if (
      hasService &&
      (value.provenance.contractVersion === null ||
        value.provenance.catalogVersion === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provenance"],
        message: "service/capability evidence requires contract and catalog versions",
      });
    }
    if (
      hasRoute &&
      (value.provenance.routeVersion === null ||
        value.provenance.adapterVersion === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provenance"],
        message: "route/adapter evidence requires route and adapter versions",
      });
    }
    if (
      value.authorityState === "PARTNER_AUTHORIZED_SYNTHETIC" &&
      !value.limitationCodes.includes("NO_SETTLEMENT_AUTHORITY")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limitationCodes"],
        message:
          "synthetic partner authorization must retain the no-settlement-authority limitation",
      });
    }
  });
export type HubWorkflowEnvelopeContent = z.infer<
  typeof HubWorkflowEnvelopeContentSchema
>;

export const HubWorkflowEnvelopeSchema = HubWorkflowEnvelopeContentSchema.extend({
  contentDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
}).strict();
export type HubWorkflowEnvelope = z.infer<typeof HubWorkflowEnvelopeSchema>;

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(",")}}`;
  }
  throw new Error("HUB_WORKFLOW_CANONICALIZATION_UNSUPPORTED_VALUE");
}

export function computeHubWorkflowContentDigest(
  content: HubWorkflowEnvelopeContent,
) {
  const validated = HubWorkflowEnvelopeContentSchema.parse(content);
  return `sha256:${createHash("sha256").update(canonicalize(validated)).digest("hex")}`;
}

export function createHubWorkflowEnvelope(
  content: HubWorkflowEnvelopeContent,
): HubWorkflowEnvelope {
  const validated = HubWorkflowEnvelopeContentSchema.parse(content);
  return HubWorkflowEnvelopeSchema.parse({
    ...validated,
    contentDigest: computeHubWorkflowContentDigest(validated),
  });
}

export function verifyHubWorkflowEnvelope(input: unknown): HubWorkflowEnvelope {
  const envelope = HubWorkflowEnvelopeSchema.parse(input);
  const { contentDigest, ...content } = envelope;
  if (computeHubWorkflowContentDigest(content) !== contentDigest)
    throw new Error("HUB_WORKFLOW_CONTENT_DIGEST_MISMATCH");
  return envelope;
}
