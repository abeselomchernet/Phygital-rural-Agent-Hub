import { randomUUID } from "node:crypto";
import {
  closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync,
  renameSync, statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  PaymentAttemptSnapshotSchema,
  type PaymentAttemptPersistence,
  type PaymentAttemptSnapshot,
} from "../domain/paymentAttempt";

const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;

/**
 * Synthetic local file only. Cooperating writers share one file, exclusive
 * lock and revision CAS. This is not distributed exactly-once processing,
 * a production outbox, or a ledger. Stale locks require operator inspection.
 */
export class AtomicJsonPaymentAttemptPersistence implements PaymentAttemptPersistence {
  readonly filePath: string;

  constructor(filePath: string) { this.filePath = resolve(filePath); }

  load(): PaymentAttemptSnapshot | undefined {
    try {
      if (!existsSync(this.filePath)) return undefined;
      if (statSync(this.filePath).size > MAX_SNAPSHOT_BYTES)
        throw new Error("Snapshot too large");
      return PaymentAttemptSnapshotSchema.parse(JSON.parse(readFileSync(this.filePath, "utf8")));
    } catch {
      throw new Error("PAYMENT_ATTEMPT_SNAPSHOT_INVALID");
    }
  }

  save(snapshot: PaymentAttemptSnapshot, expectedRevision: number): void {
    const parsed = PaymentAttemptSnapshotSchema.safeParse(snapshot);
    if (!parsed.success || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
      parsed.data.revision !== expectedRevision + 1)
      throw new Error("PAYMENT_ATTEMPT_SNAPSHOT_INVALID");
    const serialized = `${JSON.stringify(parsed.data)}\n`;
    if (Buffer.byteLength(serialized) > MAX_SNAPSHOT_BYTES)
      throw new Error("PAYMENT_ATTEMPT_SNAPSHOT_INVALID");

    const directory = dirname(this.filePath);
    const temporary = `${this.filePath}.${randomUUID()}.tmp`;
    const lockPath = `${this.filePath}.lock`;
    let lock: number | undefined, data: number | undefined, parent: number | undefined;
    try {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      lock = openSync(lockPath, "wx", 0o600);
      if ((this.load()?.revision ?? 0) !== expectedRevision)
        throw new Error("Revision conflict");
      data = openSync(temporary, "wx", 0o600);
      writeFileSync(data, serialized, "utf8");
      fsyncSync(data);
      closeSync(data);
      data = undefined;
      renameSync(temporary, this.filePath);
      parent = openSync(directory, "r");
      fsyncSync(parent);
    } catch {
      throw new Error("PAYMENT_ATTEMPT_PERSISTENCE_FAILED");
    } finally {
      // Cleanup failure also fails closed; no raw path/error reaches callers.
      let cleanupFailed = false;
      for (const descriptor of [data, parent, lock]) {
        if (descriptor !== undefined) {
          try { closeSync(descriptor); } catch { cleanupFailed = true; }
        }
      }
      for (const path of [temporary, ...(lock !== undefined ? [lockPath] : [])]) {
        try { if (existsSync(path)) unlinkSync(path); } catch { cleanupFailed = true; }
      }
      if (cleanupFailed) throw new Error("PAYMENT_ATTEMPT_PERSISTENCE_FAILED");
    }
  }
}
