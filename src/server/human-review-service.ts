import { randomUUID } from "node:crypto";

import { computeCanonicalSha256 } from "../domain/evidenceIntegrity";
import {
  HumanReviewCaseSchema,
  SYNTHETIC_HUMAN_REVIEW_CASES,
  isHumanReviewTransitionAllowed,
} from "../domain/humanReview";
import {
  HumanReviewActionTargetStatus,
  HumanReviewLifecycleEventSchema,
  HumanReviewLifecycleRecordSchema,
  HumanReviewReviewerSchema,
  HumanReviewTransitionRequestSchema,
  InMemoryHumanReviewPersistence,
  authorityOwnerForReviewRole,
  createInitialHumanReviewRecord,
  type HumanReviewLifecycleRecord,
  type HumanReviewPersistence,
  type HumanReviewReviewer,
  type HumanReviewTransitionAction,
  type HumanReviewTransitionRequest,
} from "../domain/humanReviewLifecycle";
import type { SyntheticAuditSink } from "../domain/audit";
import {
  EvidenceExplorerRecordSchema,
  SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
  type EvidenceExplorerRecord,
} from "../domain/evidenceExplorer";

export class HumanReviewMutationError extends Error {
  constructor(
    readonly code:
      | "HUMAN_REVIEW_CASE_ACCESS_DENIED"
      | "HUMAN_REVIEW_TRANSITION_DENIED"
      | "HUMAN_REVIEW_REVIEWER_NOT_ASSIGNED"
      | "HUMAN_REVIEW_REVIEWER_OWNERSHIP_REQUIRED"
      | "HUMAN_REVIEW_EXTERNAL_RESPONSE_EVIDENCE_REQUIRED"
      | "HUMAN_REVIEW_STALE_REVISION"
      | "HUMAN_REVIEW_IDEMPOTENCY_CONFLICT"
      | "HUMAN_REVIEW_HISTORY_LIMIT_REACHED",
    readonly status: 403 | 409,
  ) {
    super(code);
  }
}

const STATUS_AUDIT_CODE = {
  PENDING: "PENDING",
  IN_REVIEW: "IN_REVIEW",
  ESCALATED: "ESCALATED",
  EXTERNAL_AUTHORITY_REQUIRED: "EXTERNAL_AUTHORITY_REQUIRED",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

const ACTION_AUDIT_CODE = {
  CLAIM: "HUMAN_REVIEW_CLAIMED",
  UNCLAIM: "HUMAN_REVIEW_UNCLAIMED",
  ESCALATE: "HUMAN_REVIEW_ESCALATED",
  RETURN_TO_REVIEW: "HUMAN_REVIEW_RETURNED_TO_REVIEW",
  REQUIRE_EXTERNAL_AUTHORITY: "HUMAN_REVIEW_EXTERNAL_AUTHORITY_REQUIRED",
  RECORD_EXTERNAL_RESPONSE: "HUMAN_REVIEW_EXTERNAL_RESPONSE_RECORDED",
  RESOLVE: "HUMAN_REVIEW_RESOLVED",
  CLOSE: "HUMAN_REVIEW_CLOSED",
} as const;

export interface HumanReviewMutationActor extends HumanReviewReviewer {
  tenantId: string;
  hubId: string;
  partnerOrgId: string;
}

export interface HumanReviewMutationResult {
  record: HumanReviewLifecycleRecord;
  event: ReturnType<typeof HumanReviewLifecycleEventSchema.parse>;
  idempotentReplay: boolean;
  resultRevision: number;
  currentRevision: number;
}


export class HumanReviewLifecycleService {
  readonly persistence: HumanReviewPersistence;

  constructor(
    persistence: HumanReviewPersistence = new InMemoryHumanReviewPersistence(),
    private readonly audit?: SyntheticAuditSink,
    seedCases: readonly unknown[] = SYNTHETIC_HUMAN_REVIEW_CASES,
    private readonly evidenceRecords: readonly EvidenceExplorerRecord[] =
      SYNTHETIC_EVIDENCE_EXPLORER_RECORDS.map((record) =>
        EvidenceExplorerRecordSchema.parse(record),
      ),
  ) {
    this.persistence = persistence;
    for (const caseInput of seedCases) {
      const record = createInitialHumanReviewRecord(caseInput);
      this.persistence.create(record.reviewCase.caseId, record);
    }
  }

  listRecords() {
    return this.persistence.list();
  }

  loadAccessible(caseId: string, actorInput: HumanReviewMutationActor) {
    const actor = this.parseActor(actorInput);
    const record = this.persistence.load(caseId);
    if (!record || !this.actorCanAccess(record, actor))
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_CASE_ACCESS_DENIED",
        403,
      );
    return record;
  }

  transition(input: {
    caseId: string;
    actor: HumanReviewMutationActor;
    request: HumanReviewTransitionRequest;
    now?: string;
  }): HumanReviewMutationResult {
    const actor = this.parseActor(input.actor);
    const request = HumanReviewTransitionRequestSchema.parse(input.request);
    const now = new Date(input.now ?? new Date().toISOString()).toISOString();
    const record = this.persistence.load(input.caseId);
    if (!record || !this.actorCanAccess(record, actor)) {
      this.recordDenied(actor, input.caseId);
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_CASE_ACCESS_DENIED",
        403,
      );
    }

    const keyDigest = computeCanonicalSha256({
      domain: "HUMAN_REVIEW_IDEMPOTENCY_KEY_V1",
      key: request.idempotencyKey,
    });
    const requestDigest = computeCanonicalSha256({
      domain: "HUMAN_REVIEW_TRANSITION_REQUEST_V1",
      caseId: input.caseId,
      tenantId: actor.tenantId,
      hubId: actor.hubId,
      partnerOrgId: actor.partnerOrgId,
      reviewer: { userId: actor.userId, role: actor.role },
      action: request.action,
      expectedRevision: request.expectedRevision,
      rationale: request.rationale,
      externalResponseEvidenceRef:
        request.externalResponseEvidenceRef ?? null,
    });

    const receipt = record.idempotencyReceipts.find(
      (entry) => entry.keyDigest === keyDigest,
    );
    if (receipt) {
      if (receipt.requestDigest !== requestDigest) {
        this.recordDenied(actor, input.caseId);
        throw new HumanReviewMutationError(
          "HUMAN_REVIEW_IDEMPOTENCY_CONFLICT",
          409,
        );
      }
      const event = record.events.find(
        (entry) => entry.eventId === receipt.eventId,
      );
      if (!event) throw new Error("HUMAN_REVIEW_RECEIPT_EVENT_MISSING");
      return {
        record,
        event,
        idempotentReplay: true,
        resultRevision: receipt.resultRevision,
        currentRevision: record.revision,
      };
    }

    if (record.revision !== request.expectedRevision) {
      this.recordDenied(actor, input.caseId);
      throw new HumanReviewMutationError("HUMAN_REVIEW_STALE_REVISION", 409);
    }
    if (
      record.events.length >= 512 ||
      record.idempotencyReceipts.length >= 512
    ) {
      this.recordDenied(actor, input.caseId);
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_HISTORY_LIMIT_REACHED",
        409,
      );
    }

    let next: HumanReviewLifecycleRecord;
    try {
      next = this.buildNextRecord(record, actor, request, now, {
        keyDigest,
        requestDigest,
      });
    } catch (error) {
      if (error instanceof HumanReviewMutationError)
        this.recordDenied(actor, input.caseId);
      throw error;
    }
    const event = next.events.at(-1)!;
    if (!this.persistence.compareAndSet(input.caseId, record.revision, next)) {
      this.recordDenied(actor, input.caseId);
      throw new HumanReviewMutationError("HUMAN_REVIEW_STALE_REVISION", 409);
    }

    this.audit?.record({
      category: "HUMAN_REVIEW",
      action: ACTION_AUDIT_CODE[request.action],
      outcome: "SUCCESS",
      actor: { userId: actor.userId, role: actor.role },
      caseId: input.caseId,
      stateFrom: STATUS_AUDIT_CODE[event.fromStatus],
      stateTo: STATUS_AUDIT_CODE[event.toStatus],
    });

    return {
      record: next,
      event,
      idempotentReplay: false,
      resultRevision: next.revision,
      currentRevision: next.revision,
    };
  }

  private buildNextRecord(
    current: HumanReviewLifecycleRecord,
    actor: HumanReviewMutationActor,
    request: HumanReviewTransitionRequest,
    now: string,
    digests: { keyDigest: string; requestDigest: string },
  ) {
    const reviewCase = HumanReviewCaseSchema.parse(current.reviewCase);
    const targetStatus = HumanReviewActionTargetStatus[request.action];
    if (!isHumanReviewTransitionAllowed(reviewCase.status, targetStatus))
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_TRANSITION_DENIED",
        409,
      );

    const internalOwner = authorityOwnerForReviewRole(actor.role);
    this.assertActionOwnership(current, actor, request.action, internalOwner);

    if (
      request.action === "RECORD_EXTERNAL_RESPONSE" &&
      !request.externalResponseEvidenceRef
    )
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_EXTERNAL_RESPONSE_EVIDENCE_REQUIRED",
        409,
      );
    if (request.action === "RECORD_EXTERNAL_RESPONSE")
      this.requireScopedExternalResponseEvidence(
        request.externalResponseEvidenceRef!,
        actor,
      );

    let assignedReviewerUserId = current.assignedReviewerUserId;
    let authorityOwner = reviewCase.authorityOwner;
    let externalAuthorityRequired = reviewCase.externalAuthorityRequired;
    let evidenceRefs = [...reviewCase.evidenceRefs];

    if (request.action === "CLAIM") assignedReviewerUserId = actor.userId;
    if (request.action === "UNCLAIM") assignedReviewerUserId = null;
    if (request.action === "RETURN_TO_REVIEW")
      assignedReviewerUserId = actor.userId;
    if (request.action === "REQUIRE_EXTERNAL_AUTHORITY") {
      assignedReviewerUserId = null;
      authorityOwner = "PARTNERFI_OR_EXTERNAL_AUTHORITY";
      externalAuthorityRequired = true;
    }
    if (request.action === "RECORD_EXTERNAL_RESPONSE") {
      assignedReviewerUserId = actor.userId;
      authorityOwner = internalOwner;
      externalAuthorityRequired = false;
      if (!evidenceRefs.includes(request.externalResponseEvidenceRef!))
        evidenceRefs = [...evidenceRefs, request.externalResponseEvidenceRef!];
    }

    const nextCase = HumanReviewCaseSchema.parse({
      ...reviewCase,
      status: targetStatus,
      authorityOwner,
      externalAuthorityRequired,
      evidenceRefs,
      updatedAt: now,
    });

    const event = HumanReviewLifecycleEventSchema.parse({
      schemaVersion: 1,
      eventId: randomUUID(),
      caseId: reviewCase.caseId,
      action: request.action,
      fromStatus: reviewCase.status,
      toStatus: targetStatus,
      reviewer: { userId: actor.userId, role: actor.role },
      at: now,
      rationale: request.rationale,
      authorityOwnerFrom: reviewCase.authorityOwner,
      authorityOwnerTo: authorityOwner,
      ...(request.externalResponseEvidenceRef
        ? { externalResponseEvidenceRef: request.externalResponseEvidenceRef }
        : {}),
      synthetic: true,
      externalFactVerified: false,
      automaticResolutionAllowed: false,
      financialAuthorityGranted: false,
      creditApprovalAuthorityGranted: false,
      settlementAuthorityGranted: false,
      insuranceAdjudicationAuthorityGranted: false,
      deviceControlAuthorityGranted: false,
    });

    return HumanReviewLifecycleRecordSchema.parse({
      schemaVersion: 1,
      revision: current.revision + 1,
      reviewCase: nextCase,
      assignedReviewerUserId,
      events: [...current.events, event],
      idempotencyReceipts: [
        ...current.idempotencyReceipts,
        {
          keyDigest: digests.keyDigest,
          requestDigest: digests.requestDigest,
          resultRevision: current.revision + 1,
          eventId: event.eventId,
        },
      ],
    });
  }

  private assertActionOwnership(
    current: HumanReviewLifecycleRecord,
    actor: HumanReviewMutationActor,
    action: HumanReviewTransitionAction,
    internalOwner: "ENAWUGA_SUPERVISOR" | "ENAWUGA_OPERATIONS",
  ) {
    const reviewCase = current.reviewCase;
    if (action === "RECORD_EXTERNAL_RESPONSE") {
      if (
        reviewCase.status !== "EXTERNAL_AUTHORITY_REQUIRED" ||
        reviewCase.authorityOwner !== "PARTNERFI_OR_EXTERNAL_AUTHORITY" ||
        !reviewCase.externalAuthorityRequired
      )
        throw new HumanReviewMutationError(
          "HUMAN_REVIEW_TRANSITION_DENIED",
          409,
        );
      const priorExternalization = [...current.events]
        .reverse()
        .find(
          (event) =>
            event.action === "REQUIRE_EXTERNAL_AUTHORITY" &&
            event.toStatus === "EXTERNAL_AUTHORITY_REQUIRED",
        );
      const inferredInternalOwners = reviewCase.reviewRoles
        .filter((role) => role === "SUPERVISOR" || role === "OPERATIONS")
        .map((role) => authorityOwnerForReviewRole(role));
      const returnOwner =
        priorExternalization?.authorityOwnerFrom ??
        (new Set(inferredInternalOwners).size === 1
          ? inferredInternalOwners[0]
          : undefined);
      if (!returnOwner || returnOwner !== internalOwner)
        throw new HumanReviewMutationError(
          "HUMAN_REVIEW_REVIEWER_OWNERSHIP_REQUIRED",
          403,
        );
      return;
    }

    if (reviewCase.authorityOwner !== internalOwner)
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_REVIEWER_OWNERSHIP_REQUIRED",
        403,
      );

    if (action === "CLAIM") {
      if (current.assignedReviewerUserId !== null)
        throw new HumanReviewMutationError(
          "HUMAN_REVIEW_REVIEWER_OWNERSHIP_REQUIRED",
          409,
        );
      return;
    }

    if (current.assignedReviewerUserId !== actor.userId)
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_REVIEWER_NOT_ASSIGNED",
        403,
      );
  }

  private requireScopedExternalResponseEvidence(
    evidenceRef: string,
    actor: HumanReviewMutationActor,
  ) {
    const evidence = this.evidenceRecords.find(
      (record) => record.evidenceId === evidenceRef,
    );
    if (
      !evidence ||
      evidence.tenantId !== actor.tenantId ||
      evidence.hubId !== actor.hubId ||
      evidence.partnerOrgId !== actor.partnerOrgId ||
      evidence.synthetic !== true ||
      evidence.rawPayloadIncluded !== false ||
      evidence.piiIncluded !== false ||
      evidence.externalAuthorityState === "EXTERNALLY_AUTHORITATIVE" ||
      !evidence.limitationCodes.includes("external_response_not_external_fact")
    )
      throw new HumanReviewMutationError(
        "HUMAN_REVIEW_EXTERNAL_RESPONSE_EVIDENCE_REQUIRED",
        409,
      );
    return evidence;
  }

  private actorCanAccess(
    record: HumanReviewLifecycleRecord,
    actor: HumanReviewMutationActor,
  ) {
    const reviewCase = record.reviewCase;
    return (
      reviewCase.tenantId === actor.tenantId &&
      reviewCase.hubId === actor.hubId &&
      reviewCase.partnerOrgId === actor.partnerOrgId &&
      reviewCase.reviewRoles.includes(actor.role)
    );
  }

  private parseActor(actorInput: HumanReviewMutationActor) {
    const reviewer = HumanReviewReviewerSchema.parse({
      userId: actorInput.userId,
      role: actorInput.role,
    });
    if (
      typeof actorInput.tenantId !== "string" ||
      typeof actorInput.hubId !== "string" ||
      typeof actorInput.partnerOrgId !== "string"
    )
      throw new Error("HUMAN_REVIEW_ACTOR_SCOPE_INVALID");
    return {
      ...reviewer,
      tenantId: actorInput.tenantId,
      hubId: actorInput.hubId,
      partnerOrgId: actorInput.partnerOrgId,
    };
  }

  private recordDenied(actor: HumanReviewMutationActor, caseId: string) {
    this.audit?.record({
      category: "HUMAN_REVIEW",
      action: "HUMAN_REVIEW_MUTATION_REJECTED",
      outcome: "DENY",
      actor: { userId: actor.userId, role: actor.role },
      caseId,
    });
  }
}
