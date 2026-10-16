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
  HubWorkflowIntentPersistenceRecordSchema,
  HubWorkflowIntentReservationSchema,
  type HubWorkflowIntentPersistence,
  type HubWorkflowIntentPersistenceRecord,
  type HubWorkflowIntentReservation,
} from "../domain/hubWorkflowIdempotencyCertification";
import { fsyncDirectoryEntrySync } from "./local-directory-fsync";
import { withLocalFileLeaseSync } from "./local-file-lease";

type StoredRecord = {
  schemaVersion: 1;
  scope: string;
  revision: number;
  reservation: HubWorkflowIntentReservation;
};

function scopeDigest(scope: string) {
  if (!scope || scope.length > 1024) throw new Error("HUB_IDEMPOTENCY_SCOPE_INVALID");
  return createHash("sha256").update(scope, "utf8").digest("hex");
}

function parseStored(raw: string, expectedScope?: string): StoredRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("HUB_IDEMPOTENCY_PERSISTENCE_CORRUPT");
  }
  if (!parsed || typeof parsed !== "object")
    throw new Error("HUB_IDEMPOTENCY_PERSISTENCE_CORRUPT");
  const candidate = parsed as Record<string, unknown>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.scope !== "string" ||
    !Number.isSafeInteger(candidate.revision) ||
    (candidate.revision as number) < 1
  )
    throw new Error("HUB_IDEMPOTENCY_PERSISTENCE_CORRUPT");
  if (expectedScope && candidate.scope !== expectedScope)
    throw new Error("HUB_IDEMPOTENCY_PERSISTENCE_CORRUPT");
  const record = HubWorkflowIntentPersistenceRecordSchema.parse({
    revision: candidate.revision,
    reservation: candidate.reservation,
  });
  return {
    schemaVersion: 1,
    scope: candidate.scope,
    revision: record.revision,
    reservation: record.reservation,
  };
}

function toDomain(record: StoredRecord): HubWorkflowIntentPersistenceRecord {
  return HubWorkflowIntentPersistenceRecordSchema.parse({
    revision: record.revision,
    reservation: structuredClone(record.reservation),
  });
}

/**
 * Bounded local/staging persistence for E1E workflow-intent idempotency.
 *
 * This adapter provides restart durability plus per-scope compare-and-set on a
 * shared local filesystem. It deliberately does not claim distributed-database
 * consensus, cross-region linearizability or financial exactly-once delivery.
 * Per-scope writes use owned bounded lease locks with ownership-checked stale
 * recovery. This remains local/shared-filesystem coordination, not consensus.
 */
export class AtomicDirectoryHubWorkflowIntentPersistence
  implements HubWorkflowIntentPersistence
{
  readonly mode = "ATOMIC_DIRECTORY_CAS" as const;
  readonly durable = true;

  constructor(
    private readonly directory: string,
    private readonly lockWaitMs = 2_000,
    private readonly lockLeaseMs = 60_000,
  ) {
    if (!Number.isSafeInteger(lockWaitMs) || lockWaitMs < 0 || lockWaitMs > 30_000)
      throw new Error("HUB_IDEMPOTENCY_LOCK_WAIT_INVALID");
    if (!Number.isSafeInteger(lockLeaseMs) || lockLeaseMs < 1 || lockLeaseMs > 300_000)
      throw new Error("HUB_IDEMPOTENCY_LOCK_LEASE_INVALID");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }

  load(scope: string) {
    const file = this.recordPath(scope);
    if (!existsSync(file)) return undefined;
    return toDomain(parseStored(readFileSync(file, "utf8"), scope));
  }

  create(scope: string, reservationInput: HubWorkflowIntentReservation) {
    const reservation = HubWorkflowIntentReservationSchema.parse(reservationInput);
    return this.withScopeLock(scope, () => {
      const file = this.recordPath(scope);
      if (existsSync(file)) return false;
      this.writeRecord(file, {
        schemaVersion: 1,
        scope,
        revision: 1,
        reservation,
      });
      return true;
    });
  }

  compareAndSet(
    scope: string,
    expectedRevision: number,
    reservationInput: HubWorkflowIntentReservation,
  ) {
    const reservation = HubWorkflowIntentReservationSchema.parse(reservationInput);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
      throw new Error("HUB_IDEMPOTENCY_REVISION_INVALID");
    return this.withScopeLock(scope, () => {
      const file = this.recordPath(scope);
      if (!existsSync(file)) return false;
      const current = parseStored(readFileSync(file, "utf8"), scope);
      if (current.revision !== expectedRevision) return false;
      this.writeRecord(file, {
        schemaVersion: 1,
        scope,
        revision: current.revision + 1,
        reservation,
      });
      return true;
    });
  }

  list() {
    const records: HubWorkflowIntentPersistenceRecord[] = [];
    for (const name of readdirSync(this.directory).sort()) {
      if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
      records.push(toDomain(parseStored(readFileSync(path.join(this.directory, name), "utf8"))));
    }
    return records;
  }

  private recordPath(scope: string) {
    return path.join(this.directory, `${scopeDigest(scope)}.json`);
  }

  private withScopeLock<T>(scope: string, action: () => T): T {
    const record = this.recordPath(scope);
    return withLocalFileLeaseSync(
      {
        lockPath: `${record}.lock`,
        waitMs: this.lockWaitMs,
        leaseMs: this.lockLeaseMs,
        lockedErrorCode: "HUB_IDEMPOTENCY_PERSISTENCE_LOCKED",
        ownershipLostErrorCode: "HUB_IDEMPOTENCY_LOCK_OWNERSHIP_LOST",
        staleRecoveryErrorCode: "HUB_IDEMPOTENCY_LOCK_RECOVERY_FAILED",
      },
      action,
    );
  }

  private writeRecord(file: string, record: StoredRecord) {
    const validatedReservation = HubWorkflowIntentReservationSchema.parse(record.reservation);
    const body = JSON.stringify({ ...record, reservation: validatedReservation });
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temporary, "wx", 0o600);
      writeFileSync(descriptor, body, "utf8");
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


export function createConfiguredHubWorkflowIntentPersistence(input: {
  syntheticStateDir?: string;
  requireDurable: boolean;
  lockWaitMs?: number;
  lockLeaseMs?: number;
}): HubWorkflowIntentPersistence | undefined {
  if (!input.syntheticStateDir) {
    if (input.requireDurable)
      throw new Error("DURABLE_HUB_IDEMPOTENCY_STORE_REQUIRED");
    return undefined;
  }
  return new AtomicDirectoryHubWorkflowIntentPersistence(
    path.join(input.syntheticStateDir, "hub-idempotency"),
    input.lockWaitMs,
    input.lockLeaseMs,
  );
}
