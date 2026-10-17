import { z } from "zod";

import {
  HumanReviewAuthorityOwnerSchema,
  HumanReviewCaseSchema,
  HumanReviewCaseStatusSchema,
  HumanReviewViewerRoleSchema,
} from "./humanReview";

export const HumanReviewMutationRoleSchema = HumanReviewViewerRoleSchema.extract([
  "SUPERVISOR",
  "OPERATIONS",
]);

export const HumanReviewReviewerUserIdSchema = z.enum([
  "synthetic-supervisor-01",
  "synthetic-operations-01",
]);

export const HumanReviewTransitionActionSchema = z.enum([
  "CLAIM",
  "UNCLAIM",
  "ESCALATE",
  "RETURN_TO_REVIEW",
  "REQUIRE_EXTERNAL_AUTHORITY",
  "RECORD_EXTERNAL_RESPONSE",
  "RESOLVE",
  "CLOSE",
]);

export const HumanReviewRationaleSchema = z
  .string()
  .min(3)
  .max(96)
  .regex(/^[A-Z][A-Z0-9_.-]{2,95}$/);

export const HumanReviewIdempotencyKeySchema = z
  .string()
  .min(16)
  .max(120)
  .regex(/^hridem_syn_[a-z0-9][a-z0-9_-]*$/);

export const HumanReviewEvidenceRefSchema = z
  .string()
  .regex(/^evidence_syn_[a-z0-9_]+$/);

export const HumanReviewTransitionRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    action: HumanReviewTransitionActionSchema,
    expectedRevision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    idempotencyKey: HumanReviewIdempotencyKeySchema,
    rationale: HumanReviewRationaleSchema,
    externalResponseEvidenceRef: HumanReviewEvidenceRefSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.action === "RECORD_EXTERNAL_RESPONSE" &&
      !value.externalResponseEvidenceRef
    ) {
      context.addIssue({
        code: "custom",
        path: ["externalResponseEvidenceRef"],
        message: "EXTERNAL_RESPONSE_EVIDENCE_REQUIRED",
      });
    }
    if (
      value.action !== "RECORD_EXTERNAL_RESPONSE" &&
      value.externalResponseEvidenceRef
    ) {
      context.addIssue({
        code: "custom",
        path: ["externalResponseEvidenceRef"],
        message: "EXTERNAL_RESPONSE_EVIDENCE_NOT_APPLICABLE",
      });
    }
  });

export const HumanReviewReviewerSchema = z
  .object({
    userId: HumanReviewReviewerUserIdSchema,
    role: HumanReviewMutationRoleSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.role === "SUPERVISOR" &&
        value.userId !== "synthetic-supervisor-01") ||
      (value.role === "OPERATIONS" &&
        value.userId !== "synthetic-operations-01")
    ) {
      context.addIssue({
        code: "custom",
        path: ["userId"],
        message: "HUMAN_REVIEW_REVIEWER_ROLE_MISMATCH",
      });
    }
  });

const DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const HumanReviewLifecycleEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().uuid(),
    caseId: z.string().regex(/^case_syn_[a-z0-9_]+$/),
    action: HumanReviewTransitionActionSchema,
    fromStatus: HumanReviewCaseStatusSchema,
    toStatus: HumanReviewCaseStatusSchema,
    reviewer: HumanReviewReviewerSchema,
    at: z.string().datetime(),
    rationale: HumanReviewRationaleSchema,
    authorityOwnerFrom: HumanReviewAuthorityOwnerSchema,
    authorityOwnerTo: HumanReviewAuthorityOwnerSchema,
    externalResponseEvidenceRef: HumanReviewEvidenceRefSchema.optional(),
    synthetic: z.literal(true),
    externalFactVerified: z.literal(false),
    automaticResolutionAllowed: z.literal(false),
    financialAuthorityGranted: z.literal(false),
    creditApprovalAuthorityGranted: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
    insuranceAdjudicationAuthorityGranted: z.literal(false),
    deviceControlAuthorityGranted: z.literal(false),
  })
  .strict();

export const HumanReviewIdempotencyReceiptSchema = z
  .object({
    keyDigest: DigestSchema,
    requestDigest: DigestSchema,
    resultRevision: z.number().int().min(2).max(Number.MAX_SAFE_INTEGER),
    eventId: z.string().uuid(),
  })
  .strict();

export const HumanReviewLifecycleRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    reviewCase: HumanReviewCaseSchema,
    assignedReviewerUserId: HumanReviewReviewerUserIdSchema.nullable(),
    events: z.array(HumanReviewLifecycleEventSchema).max(512),
    idempotencyReceipts: z.array(HumanReviewIdempotencyReceiptSchema).max(512),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.events.length !== record.idempotencyReceipts.length) {
      context.addIssue({
        code: "custom",
        path: ["idempotencyReceipts"],
        message: "HUMAN_REVIEW_EVENT_RECEIPT_COUNT_MISMATCH",
      });
    }
    if (record.revision !== record.events.length + 1) {
      context.addIssue({
        code: "custom",
        path: ["revision"],
        message: "HUMAN_REVIEW_REVISION_EVENT_COUNT_MISMATCH",
      });
    }
    if (
      (record.reviewCase.status === "PENDING" ||
        record.reviewCase.status === "EXTERNAL_AUTHORITY_REQUIRED") &&
      record.assignedReviewerUserId !== null
    ) {
      context.addIssue({
        code: "custom",
        path: ["assignedReviewerUserId"],
        message: "NON_ACTIVE_REVIEW_CASE_CANNOT_REMAIN_ASSIGNED",
      });
    }
    for (let index = 0; index < record.events.length; index += 1) {
      const event = record.events[index];
      const receipt = record.idempotencyReceipts[index];
      if (event.caseId !== record.reviewCase.caseId) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "caseId"],
          message: "HUMAN_REVIEW_EVENT_CASE_MISMATCH",
        });
      }
      if (index > 0) {
        const previous = record.events[index - 1];
        if (previous.toStatus !== event.fromStatus) {
          context.addIssue({
            code: "custom",
            path: ["events", index, "fromStatus"],
            message: "HUMAN_REVIEW_EVENT_STATUS_CHAIN_BROKEN",
          });
        }
        if (previous.authorityOwnerTo !== event.authorityOwnerFrom) {
          context.addIssue({
            code: "custom",
            path: ["events", index, "authorityOwnerFrom"],
            message: "HUMAN_REVIEW_AUTHORITY_CHAIN_BROKEN",
          });
        }
        if (Date.parse(previous.at) > Date.parse(event.at)) {
          context.addIssue({
            code: "custom",
            path: ["events", index, "at"],
            message: "HUMAN_REVIEW_EVENT_TIME_ORDER_INVALID",
          });
        }
      }
      if (receipt) {
        if (receipt.eventId !== event.eventId) {
          context.addIssue({
            code: "custom",
            path: ["idempotencyReceipts", index, "eventId"],
            message: "HUMAN_REVIEW_RECEIPT_EVENT_MISMATCH",
          });
        }
        if (receipt.resultRevision !== index + 2) {
          context.addIssue({
            code: "custom",
            path: ["idempotencyReceipts", index, "resultRevision"],
            message: "HUMAN_REVIEW_RECEIPT_REVISION_MISMATCH",
          });
        }
      }
    }
    const finalEvent = record.events.at(-1);
    if (finalEvent) {
      if (finalEvent.toStatus !== record.reviewCase.status) {
        context.addIssue({
          code: "custom",
          path: ["reviewCase", "status"],
          message: "HUMAN_REVIEW_CURRENT_STATUS_HISTORY_MISMATCH",
        });
      }
      if (finalEvent.authorityOwnerTo !== record.reviewCase.authorityOwner) {
        context.addIssue({
          code: "custom",
          path: ["reviewCase", "authorityOwner"],
          message: "HUMAN_REVIEW_CURRENT_AUTHORITY_HISTORY_MISMATCH",
        });
      }
      if (finalEvent.at !== record.reviewCase.updatedAt) {
        context.addIssue({
          code: "custom",
          path: ["reviewCase", "updatedAt"],
          message: "HUMAN_REVIEW_CURRENT_TIME_HISTORY_MISMATCH",
        });
      }
    }

    const eventIds = record.events.map((event) => event.eventId);
    if (new Set(eventIds).size !== eventIds.length) {
      context.addIssue({
        code: "custom",
        path: ["events"],
        message: "HUMAN_REVIEW_DUPLICATE_EVENT_ID",
      });
    }
    const keyDigests = record.idempotencyReceipts.map(
      (receipt) => receipt.keyDigest,
    );
    if (new Set(keyDigests).size !== keyDigests.length) {
      context.addIssue({
        code: "custom",
        path: ["idempotencyReceipts"],
        message: "HUMAN_REVIEW_DUPLICATE_IDEMPOTENCY_KEY",
      });
    }
  });

export type HumanReviewTransitionAction = z.infer<
  typeof HumanReviewTransitionActionSchema
>;
export type HumanReviewTransitionRequest = z.infer<
  typeof HumanReviewTransitionRequestSchema
>;
export type HumanReviewReviewer = z.infer<typeof HumanReviewReviewerSchema>;
export type HumanReviewLifecycleEvent = z.infer<
  typeof HumanReviewLifecycleEventSchema
>;
export type HumanReviewLifecycleRecord = z.infer<
  typeof HumanReviewLifecycleRecordSchema
>;

export interface HumanReviewPersistence {
  readonly mode: "MEMORY" | "ATOMIC_DIRECTORY_CAS";
  readonly durable: boolean;
  load(caseId: string): HumanReviewLifecycleRecord | undefined;
  create(caseId: string, record: HumanReviewLifecycleRecord): boolean;
  compareAndSet(
    caseId: string,
    expectedRevision: number,
    record: HumanReviewLifecycleRecord,
  ): boolean;
  list(): HumanReviewLifecycleRecord[];
}

export class InMemoryHumanReviewPersistence implements HumanReviewPersistence {
  readonly mode = "MEMORY" as const;
  readonly durable = false;
  private records = new Map<string, HumanReviewLifecycleRecord>();

  load(caseId: string) {
    const record = this.records.get(caseId);
    return record
      ? HumanReviewLifecycleRecordSchema.parse(structuredClone(record))
      : undefined;
  }

  create(caseId: string, recordInput: HumanReviewLifecycleRecord) {
    if (this.records.has(caseId)) return false;
    const record = HumanReviewLifecycleRecordSchema.parse(recordInput);
    if (record.reviewCase.caseId !== caseId)
      throw new Error("HUMAN_REVIEW_CASE_KEY_MISMATCH");
    this.records.set(caseId, structuredClone(record));
    return true;
  }

  compareAndSet(
    caseId: string,
    expectedRevision: number,
    recordInput: HumanReviewLifecycleRecord,
  ) {
    const current = this.records.get(caseId);
    if (!current || current.revision !== expectedRevision) return false;
    const next = HumanReviewLifecycleRecordSchema.parse(recordInput);
    assertAppendOnlyMutation(current, next, caseId);
    this.records.set(caseId, structuredClone(next));
    return true;
  }

  list() {
    return [...this.records.values()]
      .map((record) =>
        HumanReviewLifecycleRecordSchema.parse(structuredClone(record)),
      )
      .sort((left, right) =>
        left.reviewCase.caseId.localeCompare(right.reviewCase.caseId),
      );
  }
}

export function createInitialHumanReviewRecord(caseInput: unknown) {
  const reviewCase = HumanReviewCaseSchema.parse(caseInput);
  return HumanReviewLifecycleRecordSchema.parse({
    schemaVersion: 1,
    revision: 1,
    reviewCase,
    assignedReviewerUserId: null,
    events: [],
    idempotencyReceipts: [],
  });
}

export function authorityOwnerForReviewRole(
  roleInput: z.infer<typeof HumanReviewMutationRoleSchema>,
) {
  const role = HumanReviewMutationRoleSchema.parse(roleInput);
  return role === "SUPERVISOR"
    ? ("ENAWUGA_SUPERVISOR" as const)
    : ("ENAWUGA_OPERATIONS" as const);
}

export const HumanReviewActionTargetStatus: Record<
  HumanReviewTransitionAction,
  z.infer<typeof HumanReviewCaseStatusSchema>
> = {
  CLAIM: "IN_REVIEW",
  UNCLAIM: "PENDING",
  ESCALATE: "ESCALATED",
  RETURN_TO_REVIEW: "IN_REVIEW",
  REQUIRE_EXTERNAL_AUTHORITY: "EXTERNAL_AUTHORITY_REQUIRED",
  RECORD_EXTERNAL_RESPONSE: "IN_REVIEW",
  RESOLVE: "RESOLVED",
  CLOSE: "CLOSED",
};

export function assertAppendOnlyMutation(
  currentInput: unknown,
  nextInput: unknown,
  expectedCaseId?: string,
) {
  const current = HumanReviewLifecycleRecordSchema.parse(currentInput);
  const next = HumanReviewLifecycleRecordSchema.parse(nextInput);
  if (expectedCaseId && next.reviewCase.caseId !== expectedCaseId)
    throw new Error("HUMAN_REVIEW_CASE_KEY_MISMATCH");
  if (next.reviewCase.caseId !== current.reviewCase.caseId)
    throw new Error("HUMAN_REVIEW_CASE_ID_IMMUTABLE");
  if (next.revision !== current.revision + 1)
    throw new Error("HUMAN_REVIEW_REVISION_INCREMENT_REQUIRED");
  if (next.events.length !== current.events.length + 1)
    throw new Error("HUMAN_REVIEW_APPEND_ONLY_EVENT_REQUIRED");
  if (next.idempotencyReceipts.length !== current.idempotencyReceipts.length + 1)
    throw new Error("HUMAN_REVIEW_APPEND_ONLY_RECEIPT_REQUIRED");
  if (
    JSON.stringify(next.events.slice(0, -1)) !== JSON.stringify(current.events) ||
    JSON.stringify(next.idempotencyReceipts.slice(0, -1)) !==
      JSON.stringify(current.idempotencyReceipts)
  )
    throw new Error("HUMAN_REVIEW_APPEND_ONLY_HISTORY_VIOLATION");
}
