import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fsyncDirectoryEntrySync } from "./local-directory-fsync";
import { withLocalFileLeaseSync } from "./local-file-lease";
import {
  PaymentAttemptSnapshotSchema,
  type PaymentAttemptPersistence,
  type PaymentAttemptSnapshot,
} from "../domain/paymentAttempt";

const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
const DEFAULT_LOCK_LEASE_MS = 60_000;

/**
 * Synthetic local file only. Cooperating writers share one file, an owned
 * bounded lease lock and revision CAS. This is not distributed exactly-once
 * processing, a production outbox, or a ledger.
 */
export class AtomicJsonPaymentAttemptPersistence implements PaymentAttemptPersistence {
  readonly filePath: string;

  constructor(
    filePath: string,
    private readonly lockOptions: { leaseMs?: number; waitMs?: number } = {},
  ) {
    this.filePath = resolve(filePath);
  }

  load(): PaymentAttemptSnapshot | undefined {
    try {
      if (!existsSync(this.filePath)) return undefined;
      if (statSync(this.filePath).size > MAX_SNAPSHOT_BYTES)
        throw new Error("Snapshot too large");
      return PaymentAttemptSnapshotSchema.parse(
        JSON.parse(readFileSync(this.filePath, "utf8")),
      );
    } catch {
      throw new Error("PAYMENT_ATTEMPT_SNAPSHOT_INVALID");
    }
  }

  save(snapshot: PaymentAttemptSnapshot, expectedRevision: number): void {
    const parsed = PaymentAttemptSnapshotSchema.safeParse(snapshot);
    if (
      !parsed.success ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0 ||
      parsed.data.revision !== expectedRevision + 1
    )
      throw new Error("PAYMENT_ATTEMPT_SNAPSHOT_INVALID");
    const serialized = `${JSON.stringify(parsed.data)}\n`;
    if (Buffer.byteLength(serialized) > MAX_SNAPSHOT_BYTES)
      throw new Error("PAYMENT_ATTEMPT_SNAPSHOT_INVALID");

    const directory = dirname(this.filePath);
    const temporary = `${this.filePath}.${randomUUID()}.tmp`;
    const lockPath = `${this.filePath}.lock`;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    let data: number | undefined;

    try {
      withLocalFileLeaseSync(
        {
          lockPath,
          waitMs: this.lockOptions.waitMs ?? 0,
          leaseMs: this.lockOptions.leaseMs ?? DEFAULT_LOCK_LEASE_MS,
          lockedErrorCode: "PAYMENT_ATTEMPT_PERSISTENCE_LOCKED",
          ownershipLostErrorCode:
            "PAYMENT_ATTEMPT_PERSISTENCE_LOCK_OWNERSHIP_LOST",
          staleRecoveryErrorCode:
            "PAYMENT_ATTEMPT_PERSISTENCE_LOCK_RECOVERY_FAILED",
        },
        () => {
          if ((this.load()?.revision ?? 0) !== expectedRevision)
            throw new Error("Revision conflict");
          data = openSync(temporary, "wx", 0o600);
          writeFileSync(data, serialized, "utf8");
          fsyncSync(data);
          closeSync(data);
          data = undefined;
          renameSync(temporary, this.filePath);
          fsyncDirectoryEntrySync(directory);
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("PAYMENT_ATTEMPT_PERSISTENCE_LOCK")) throw error;
      throw new Error("PAYMENT_ATTEMPT_PERSISTENCE_FAILED");
    } finally {
      // Temp cleanup failure also fails closed; no raw path/error reaches callers.
      let cleanupFailed = false;
      if (data !== undefined) {
        try {
          closeSync(data);
        } catch {
          cleanupFailed = true;
        }
      }
      try {
        if (existsSync(temporary)) unlinkSync(temporary);
      } catch {
        cleanupFailed = true;
      }
      if (cleanupFailed) throw new Error("PAYMENT_ATTEMPT_PERSISTENCE_FAILED");
    }
  }
}
