import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import {
  SYNTHETIC_HUMAN_REVIEW_CASES,
  isHumanReviewTransitionAllowed,
} from "../src/domain/humanReview";
import {
  HumanReviewLifecycleRecordSchema,
  InMemoryHumanReviewPersistence,
  assertAppendOnlyMutation,
  createInitialHumanReviewRecord,
} from "../src/domain/humanReviewLifecycle";
import {
  EvidenceExplorerRecordSchema,
  SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
} from "../src/domain/evidenceExplorer";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";
import { SyntheticAuditLog } from "../src/server/audit";
import {
  AtomicDirectoryHumanReviewPersistence,
  createConfiguredHumanReviewPersistence,
} from "../src/server/human-review-persistence";
import {
  HumanReviewLifecycleService,
  HumanReviewMutationError,
  type HumanReviewMutationActor,
} from "../src/server/human-review-service";

const TENANT_ID = "tenant_syn_enawuga_stage4";
const HUB_ID = SYNTHETIC_HUB_IDS.ADAMA_SHARED;
const ALPHA = SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA;
const OPS_CASE = "case_syn_alpha_identity_conflict_001";
const EXTERNAL_CASE = "case_syn_alpha_outcome_uncertainty_001";
const SUPERVISOR_CASE = "case_syn_alpha_evidence_correction_001";

const operationsActor = {
  userId: "synthetic-operations-01" as const,
  role: "OPERATIONS" as const,
  tenantId: TENANT_ID,
  hubId: HUB_ID,
  partnerOrgId: ALPHA,
};

const supervisorActor = {
  userId: "synthetic-supervisor-01" as const,
  role: "SUPERVISOR" as const,
  tenantId: TENANT_ID,
  hubId: HUB_ID,
  partnerOrgId: ALPHA,
};

function transition(
  service: HumanReviewLifecycleService,
  caseId: string,
  action:
    | "CLAIM"
    | "UNCLAIM"
    | "ESCALATE"
    | "RETURN_TO_REVIEW"
    | "REQUIRE_EXTERNAL_AUTHORITY"
    | "RECORD_EXTERNAL_RESPONSE"
    | "RESOLVE"
    | "CLOSE",
  expectedRevision: number,
  key: string,
  actor: HumanReviewMutationActor = operationsActor,
  extras: { externalResponseEvidenceRef?: string; rationale?: string } = {},
) {
  return service.transition({
    caseId,
    actor,
    request: {
      schemaVersion: 1,
      action,
      expectedRevision,
      idempotencyKey: key,
      rationale: extras.rationale ?? `CASE_${action}`,
      ...(extras.externalResponseEvidenceRef
        ? { externalResponseEvidenceRef: extras.externalResponseEvidenceRef }
        : {}),
    },
    now: `2026-10-17T1${Math.min(expectedRevision, 9)}:00:00.000Z`,
  });
}

function newService(audit?: SyntheticAuditLog) {
  return new HumanReviewLifecycleService(
    new InMemoryHumanReviewPersistence(),
    audit,
  );
}

test("Phase 4E lifecycle transition matrix is exhaustive and fail-closed", () => {
  const statuses = [
    "PENDING",
    "IN_REVIEW",
    "ESCALATED",
    "EXTERNAL_AUTHORITY_REQUIRED",
    "RESOLVED",
    "CLOSED",
  ] as const;
  const allowed = new Set([
    "PENDING->IN_REVIEW",
    "IN_REVIEW->PENDING",
    "IN_REVIEW->ESCALATED",
    "IN_REVIEW->EXTERNAL_AUTHORITY_REQUIRED",
    "IN_REVIEW->RESOLVED",
    "ESCALATED->IN_REVIEW",
    "EXTERNAL_AUTHORITY_REQUIRED->IN_REVIEW",
    "RESOLVED->CLOSED",
  ]);
  for (const from of statuses) {
    for (const to of statuses) {
      assert.equal(
        isHumanReviewTransitionAllowed(from, to),
        allowed.has(`${from}->${to}`),
        `${from}->${to}`,
      );
    }
  }
});

test("Phase 4E lifecycle closes an internal Operations case only through governed transitions", () => {
  const service = newService();

  const claimed = transition(
    service,
    OPS_CASE,
    "CLAIM",
    1,
    "hridem_syn_claim_ops_001",
  );
  assert.equal(claimed.record.reviewCase.status, "IN_REVIEW");
  assert.equal(claimed.record.assignedReviewerUserId, operationsActor.userId);
  assert.equal(claimed.record.revision, 2);

  const escalated = transition(
    service,
    OPS_CASE,
    "ESCALATE",
    2,
    "hridem_syn_escalate_ops_001",
  );
  assert.equal(escalated.record.reviewCase.status, "ESCALATED");
  assert.equal(
    isHumanReviewTransitionAllowed("ESCALATED", "EXTERNAL_AUTHORITY_REQUIRED"),
    false,
  );

  const returned = transition(
    service,
    OPS_CASE,
    "RETURN_TO_REVIEW",
    3,
    "hridem_syn_return_ops_001",
  );
  assert.equal(returned.record.reviewCase.status, "IN_REVIEW");

  const resolved = transition(
    service,
    OPS_CASE,
    "RESOLVE",
    4,
    "hridem_syn_resolve_ops_001",
  );
  assert.equal(resolved.record.reviewCase.status, "RESOLVED");
  assert.equal(resolved.record.reviewCase.financialAuthorityGranted, false);
  assert.equal(resolved.record.reviewCase.settlementAuthorityGranted, false);

  const closed = transition(
    service,
    OPS_CASE,
    "CLOSE",
    5,
    "hridem_syn_close_ops_001",
  );
  assert.equal(closed.record.reviewCase.status, "CLOSED");
  assert.equal(closed.record.revision, 6);
  assert.equal(closed.record.events.length, 5);
  assert.deepEqual(
    closed.record.events.map((event) => event.action),
    ["CLAIM", "ESCALATE", "RETURN_TO_REVIEW", "RESOLVE", "CLOSE"],
  );
});

test("Phase 4E claim and unclaim clear reviewer ownership without deleting history", () => {
  const service = newService();
  transition(service, OPS_CASE, "CLAIM", 1, "hridem_syn_claim_ops_002");
  const unclaimed = transition(
    service,
    OPS_CASE,
    "UNCLAIM",
    2,
    "hridem_syn_unclaim_ops_002",
  );
  assert.equal(unclaimed.record.reviewCase.status, "PENDING");
  assert.equal(unclaimed.record.assignedReviewerUserId, null);
  assert.equal(unclaimed.record.events.length, 2);
  assert.equal(unclaimed.record.events[0].action, "CLAIM");
});

test("Phase 4E external-authority wait cannot resolve locally and requires response evidence before returning to review", () => {
  const service = newService();

  assert.throws(
    () =>
      transition(
        service,
        EXTERNAL_CASE,
        "RESOLVE",
        1,
        "hridem_syn_external_bad_001",
      ),
    (error: unknown) =>
      error instanceof HumanReviewMutationError &&
      error.code === "HUMAN_REVIEW_TRANSITION_DENIED",
  );

  assert.throws(
    () =>
      transition(
        service,
        EXTERNAL_CASE,
        "RECORD_EXTERNAL_RESPONSE",
        1,
        "hridem_syn_external_missing_001",
      ),
  );

  assert.throws(
    () =>
      transition(
        service,
        EXTERNAL_CASE,
        "RECORD_EXTERNAL_RESPONSE",
        1,
        "hridem_syn_external_invented_001",
        operationsActor,
        {
          externalResponseEvidenceRef:
            "evidence_syn_alpha_external_response_invented_001",
        },
      ),
    (error: unknown) =>
      error instanceof HumanReviewMutationError &&
      error.code === "HUMAN_REVIEW_EXTERNAL_RESPONSE_EVIDENCE_REQUIRED",
  );

  const alphaExternal = SYNTHETIC_EVIDENCE_EXPLORER_RECORDS.find(
    (record) =>
      record.evidenceId === "evidence_syn_alpha_external_response_001",
  )!;
  const crossPartnerService = new HumanReviewLifecycleService(
    new InMemoryHumanReviewPersistence(),
    undefined,
    SYNTHETIC_HUMAN_REVIEW_CASES,
    [
      ...SYNTHETIC_EVIDENCE_EXPLORER_RECORDS.map((record) =>
        EvidenceExplorerRecordSchema.parse(record),
      ),
      EvidenceExplorerRecordSchema.parse({
        ...alphaExternal,
        evidenceId: "evidence_syn_beta_external_response_001",
        partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      }),
    ],
  );
  assert.throws(
    () =>
      transition(
        crossPartnerService,
        EXTERNAL_CASE,
        "RECORD_EXTERNAL_RESPONSE",
        1,
        "hridem_syn_external_cross_partner_001",
        operationsActor,
        {
          externalResponseEvidenceRef:
            "evidence_syn_beta_external_response_001",
        },
      ),
    (error: unknown) =>
      error instanceof HumanReviewMutationError &&
      error.code === "HUMAN_REVIEW_EXTERNAL_RESPONSE_EVIDENCE_REQUIRED",
  );

  const returned = transition(
    service,
    EXTERNAL_CASE,
    "RECORD_EXTERNAL_RESPONSE",
    1,
    "hridem_syn_external_response_001",
    operationsActor,
    { externalResponseEvidenceRef: "evidence_syn_alpha_external_response_001" },
  );
  assert.equal(returned.record.reviewCase.status, "IN_REVIEW");
  assert.equal(returned.record.reviewCase.externalAuthorityRequired, false);
  assert.equal(returned.record.reviewCase.authorityOwner, "ENAWUGA_OPERATIONS");
  assert.equal(returned.record.assignedReviewerUserId, operationsActor.userId);
  assert.equal(returned.event.externalFactVerified, false);
  assert.equal(
    returned.record.reviewCase.evidenceRefs.includes(
      "evidence_syn_alpha_external_response_001",
    ),
    true,
  );

  const resolved = transition(
    service,
    EXTERNAL_CASE,
    "RESOLVE",
    2,
    "hridem_syn_external_resolve_001",
  );
  assert.equal(resolved.record.reviewCase.status, "RESOLVED");
  assert.equal(resolved.record.reviewCase.creditApprovalAuthorityGranted, false);
});

test("Phase 4E can require external authority only from an actively claimed internal case", () => {
  const service = newService();
  transition(service, OPS_CASE, "CLAIM", 1, "hridem_syn_claim_ops_003");
  const external = transition(
    service,
    OPS_CASE,
    "REQUIRE_EXTERNAL_AUTHORITY",
    2,
    "hridem_syn_require_external_003",
  );
  assert.equal(external.record.reviewCase.status, "EXTERNAL_AUTHORITY_REQUIRED");
  assert.equal(external.record.reviewCase.externalAuthorityRequired, true);
  assert.equal(
    external.record.reviewCase.authorityOwner,
    "PARTNERFI_OR_EXTERNAL_AUTHORITY",
  );
  assert.equal(external.record.assignedReviewerUserId, null);
});

test("Phase 4E is idempotent by hashed key and rejects conflicting reuse and stale revisions", () => {
  const service = newService();
  const requestKey = "hridem_syn_claim_ops_idempotent_001";
  const first = transition(service, OPS_CASE, "CLAIM", 1, requestKey);
  const replay = transition(service, OPS_CASE, "CLAIM", 1, requestKey);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.event.eventId, first.event.eventId);
  assert.equal(replay.record.events.length, 1);
  assert.equal(
    JSON.stringify(replay.record).includes(requestKey),
    false,
    "raw idempotency keys must not enter stored lifecycle records",
  );
  assert.equal(replay.resultRevision, 2);
  assert.equal(replay.currentRevision, 2);

  transition(
    service,
    OPS_CASE,
    "UNCLAIM",
    2,
    "hridem_syn_delayed_replay_unclaim_001",
  );
  const delayedReplay = transition(service, OPS_CASE, "CLAIM", 1, requestKey);
  assert.equal(delayedReplay.idempotentReplay, true);
  assert.equal(delayedReplay.event.action, "CLAIM");
  assert.equal(delayedReplay.resultRevision, 2);
  assert.equal(delayedReplay.currentRevision, 3);
  assert.equal(delayedReplay.record.reviewCase.status, "PENDING");

  assert.throws(
    () =>
      transition(
        service,
        OPS_CASE,
        "CLAIM",
        1,
        requestKey,
        operationsActor,
        { rationale: "DIFFERENT_RATIONALE" },
      ),
    (error: unknown) =>
      error instanceof HumanReviewMutationError &&
      error.code === "HUMAN_REVIEW_IDEMPOTENCY_CONFLICT",
  );

  assert.throws(
    () =>
      transition(
        service,
        OPS_CASE,
        "UNCLAIM",
        1,
        "hridem_syn_stale_ops_001",
      ),
    (error: unknown) =>
      error instanceof HumanReviewMutationError &&
      error.code === "HUMAN_REVIEW_STALE_REVISION",
  );
});

test("Phase 4E preserves role, PartnerFI and authority ownership boundaries", () => {
  const service = newService();

  assert.throws(
    () =>
      transition(
        service,
        SUPERVISOR_CASE,
        "CLAIM",
        1,
        "hridem_syn_wrong_role_001",
      ),
    (error: unknown) =>
      error instanceof HumanReviewMutationError &&
      error.code === "HUMAN_REVIEW_CASE_ACCESS_DENIED",
  );

  const supervisorClaim = transition(
    service,
    SUPERVISOR_CASE,
    "CLAIM",
    1,
    "hridem_syn_supervisor_claim_001",
    supervisorActor,
  );
  assert.equal(
    supervisorClaim.record.reviewCase.authorityOwner,
    "ENAWUGA_SUPERVISOR",
  );

  assert.throws(
    () =>
      service.transition({
        caseId: OPS_CASE,
        actor: { ...operationsActor, partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA },
        request: {
          schemaVersion: 1,
          action: "CLAIM",
          expectedRevision: 1,
          idempotencyKey: "hridem_syn_cross_partner_001",
          rationale: "CASE_CLAIM",
        },
      }),
    (error: unknown) =>
      error instanceof HumanReviewMutationError &&
      error.code === "HUMAN_REVIEW_CASE_ACCESS_DENIED",
  );
});

test("Phase 4E emits bounded Human Review audit events without raw rationale or idempotency keys", () => {
  const audit = new SyntheticAuditLog();
  const service = newService(audit);
  const key = "hridem_syn_audit_ops_001";
  transition(service, OPS_CASE, "CLAIM", 1, key);
  const event = audit.list().at(-1)!;
  assert.equal(event.category, "HUMAN_REVIEW");
  assert.equal(event.action, "HUMAN_REVIEW_CLAIMED");
  assert.equal(event.caseId, OPS_CASE);
  assert.equal(event.stateFrom, "PENDING");
  assert.equal(event.stateTo, "IN_REVIEW");
  assert.equal(JSON.stringify(event).includes(key), false);
  assert.equal(JSON.stringify(event).includes("CASE_CLAIM"), false);
});

test("Phase 4E atomic persistence survives restart and enforces CAS plus append-only history", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "enawuga-human-review-"));
  try {
    const persistence = new AtomicDirectoryHumanReviewPersistence(directory);
    const service = new HumanReviewLifecycleService(persistence);
    transition(service, OPS_CASE, "CLAIM", 1, "hridem_syn_durable_claim_001");

    const restartedPersistence = new AtomicDirectoryHumanReviewPersistence(directory);
    const restarted = new HumanReviewLifecycleService(restartedPersistence);
    const restored = restarted.persistence.load(OPS_CASE)!;
    assert.equal(restored.revision, 2);
    assert.equal(restored.reviewCase.status, "IN_REVIEW");
    assert.equal(restored.events.length, 1);
    assert.equal(restored.assignedReviewerUserId, operationsActor.userId);

    assert.equal(
      restartedPersistence.compareAndSet(OPS_CASE, 1, restored),
      false,
      "stale CAS must fail without rewriting state",
    );

    const initial = createInitialHumanReviewRecord(
      SYNTHETIC_HUMAN_REVIEW_CASES.find((entry) => entry.caseId === OPS_CASE)!,
    );
    const tampered = structuredClone(restored);
    tampered.revision = 3;
    tampered.events = [structuredClone(restored.events[0]), structuredClone(restored.events[0])];
    tampered.events[0].rationale = "TAMPERED_HISTORY";
    tampered.events[1].eventId = randomUUID();
    tampered.idempotencyReceipts = [
      structuredClone(restored.idempotencyReceipts[0]),
      {
        ...structuredClone(restored.idempotencyReceipts[0]),
        keyDigest: `sha256:${"1".repeat(64)}`,
        requestDigest: `sha256:${"2".repeat(64)}`,
        resultRevision: 3,
        eventId: tampered.events[1].eventId,
      },
    ];
    assert.throws(() => assertAppendOnlyMutation(restored, tampered));

    const statusChainCorrupt = structuredClone(restored);
    statusChainCorrupt.reviewCase.status = "RESOLVED";
    assert.throws(() => HumanReviewLifecycleRecordSchema.parse(statusChainCorrupt));

    const authorityCorrupt = structuredClone(restored);
    authorityCorrupt.reviewCase.authorityOwner = "ENAWUGA_SUPERVISOR";
    assert.throws(() => HumanReviewLifecycleRecordSchema.parse(authorityCorrupt));

    const receiptCorrupt = structuredClone(restored);
    receiptCorrupt.idempotencyReceipts[0].resultRevision = 99;
    assert.throws(() => HumanReviewLifecycleRecordSchema.parse(receiptCorrupt));

    const eventCaseCorrupt = structuredClone(restored);
    eventCaseCorrupt.events[0].caseId = "case_syn_alpha_evidence_correction_001";
    assert.throws(() => HumanReviewLifecycleRecordSchema.parse(eventCaseCorrupt));

    assert.equal(initial.revision, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Phase 4E durable-store configuration fails closed when durability is required without a state directory", () => {
  assert.throws(
    () =>
      createConfiguredHumanReviewPersistence({
        requireDurable: true,
      }),
    /DURABLE_HUMAN_REVIEW_STORE_REQUIRED/,
  );
  assert.equal(
    createConfiguredHumanReviewPersistence({ requireDurable: false }),
    undefined,
  );
});
