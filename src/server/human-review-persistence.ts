import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  HumanReviewLifecycleRecordSchema,
  assertAppendOnlyMutation,
  type HumanReviewLifecycleRecord,
  type HumanReviewPersistence,
} from "../domain/humanReviewLifecycle";
import { fsyncDirectoryEntrySync } from "./local-directory-fsync";
import { withLocalFileLeaseSync } from "./local-file-lease";

function caseDigest(caseId: string) {
  if (!/^case_syn_[a-z0-9_]+$/.test(caseId))
    throw new Error("HUMAN_REVIEW_CASE_ID_INVALID");
  return createHash("sha256").update(caseId, "utf8").digest("hex");
}

function parseStored(raw: string, expectedCaseId?: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("HUMAN_REVIEW_PERSISTENCE_CORRUPT");
  }
  const record = HumanReviewLifecycleRecordSchema.parse(parsed);
  if (expectedCaseId && record.reviewCase.caseId !== expectedCaseId)
    throw new Error("HUMAN_REVIEW_PERSISTENCE_CORRUPT");
  return record;
}

/**
 * Local bounded Stage-4 synthetic Human Review persistence.
 *
 * Each case is stored independently and updated through a per-case lease plus
 * compare-and-set revision check. Writes fsync the file and containing
 * directory. This provides local/shared-filesystem restart durability only;
 * it is not distributed consensus, regulated case management, or external
 * authority evidence.
 */
export class AtomicDirectoryHumanReviewPersistence
  implements HumanReviewPersistence
{
  readonly mode = "ATOMIC_DIRECTORY_CAS" as const;
  readonly durable = true;

  constructor(
    private readonly directory: string,
    private readonly lockWaitMs = 2_000,
    private readonly lockLeaseMs = 60_000,
  ) {
    if (
      !Number.isSafeInteger(lockWaitMs) ||
      lockWaitMs < 0 ||
      lockWaitMs > 30_000
    )
      throw new Error("HUMAN_REVIEW_LOCK_WAIT_INVALID");
    if (
      !Number.isSafeInteger(lockLeaseMs) ||
      lockLeaseMs < 1 ||
      lockLeaseMs > 300_000
    )
      throw new Error("HUMAN_REVIEW_LOCK_LEASE_INVALID");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }

  load(caseId: string) {
    const file = this.recordPath(caseId);
    if (!existsSync(file)) return undefined;
    return structuredClone(parseStored(readFileSync(file, "utf8"), caseId));
  }

  create(caseId: string, recordInput: HumanReviewLifecycleRecord) {
    const record = HumanReviewLifecycleRecordSchema.parse(recordInput);
    if (record.reviewCase.caseId !== caseId)
      throw new Error("HUMAN_REVIEW_CASE_KEY_MISMATCH");
    return this.withCaseLock(caseId, () => {
      const file = this.recordPath(caseId);
      if (existsSync(file)) return false;
      this.writeRecord(file, record);
      return true;
    });
  }

  compareAndSet(
    caseId: string,
    expectedRevision: number,
    recordInput: HumanReviewLifecycleRecord,
  ) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
      throw new Error("HUMAN_REVIEW_REVISION_INVALID");
    const next = HumanReviewLifecycleRecordSchema.parse(recordInput);
    return this.withCaseLock(caseId, () => {
      const file = this.recordPath(caseId);
      if (!existsSync(file)) return false;
      const current = parseStored(readFileSync(file, "utf8"), caseId);
      if (current.revision !== expectedRevision) return false;
      assertAppendOnlyMutation(current, next, caseId);
      this.writeRecord(file, next);
      return true;
    });
  }

  list() {
    const records: HumanReviewLifecycleRecord[] = [];
    for (const name of readdirSync(this.directory).sort()) {
      if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
      records.push(
        structuredClone(
          parseStored(readFileSync(path.join(this.directory, name), "utf8")),
        ),
      );
    }
    return records.sort((left, right) =>
      left.reviewCase.caseId.localeCompare(right.reviewCase.caseId),
    );
  }

  private recordPath(caseId: string) {
    return path.join(this.directory, `${caseDigest(caseId)}.json`);
  }

  private withCaseLock<T>(caseId: string, action: () => T): T {
    const record = this.recordPath(caseId);
    return withLocalFileLeaseSync(
      {
        lockPath: `${record}.lock`,
        waitMs: this.lockWaitMs,
        leaseMs: this.lockLeaseMs,
        lockedErrorCode: "HUMAN_REVIEW_PERSISTENCE_LOCKED",
        ownershipLostErrorCode: "HUMAN_REVIEW_LOCK_OWNERSHIP_LOST",
        staleRecoveryErrorCode: "HUMAN_REVIEW_LOCK_RECOVERY_FAILED",
      },
      action,
    );
  }

  private writeRecord(file: string, recordInput: HumanReviewLifecycleRecord) {
    const record = HumanReviewLifecycleRecordSchema.parse(recordInput);
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temporary, "wx", 0o600);
      writeFileSync(descriptor, JSON.stringify(record), "utf8");
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, file);
      fsyncDirectoryEntrySync(this.directory);
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      if (existsSync(temporary)) rmSync(temporary, { force: true });
    }
  }
}

export function createConfiguredHumanReviewPersistence(input: {
  syntheticStateDir?: string;
  requireDurable: boolean;
  lockWaitMs?: number;
  lockLeaseMs?: number;
}): HumanReviewPersistence | undefined {
  if (!input.syntheticStateDir) {
    if (input.requireDurable)
      throw new Error("DURABLE_HUMAN_REVIEW_STORE_REQUIRED");
    return undefined;
  }
  return new AtomicDirectoryHumanReviewPersistence(
    path.join(input.syntheticStateDir, "human-review"),
    input.lockWaitMs,
    input.lockLeaseMs,
  );
}
