import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fsyncDirectoryEntrySync } from "./local-directory-fsync";
import { z } from "zod";
import {
  TelebirrPreorderIntentSnapshotSchema,
  type TelebirrPreorderIntentPersistence,
  type TelebirrPreorderIntentSnapshot,
} from "../domain/telebirrPreorderIntent";

/**
 * Local synthetic-development persistence for Telebirr preorder correlation
 * intent only. It stores no Telebirr credential/private key/token/signature and
 * is not a production ledger, distributed lock, transactional outbox, or
 * residency evidence.
 *
 * Writes use a local exclusive lock file, revision compare-and-swap, fsync of
 * the candidate file, atomic rename, and directory fsync. A stale lock after
 * process/host failure intentionally fails closed and requires an operator to
 * establish that no writer is active before removing it.
 */
export class AtomicJsonTelebirrPreorderIntentPersistence
  implements TelebirrPreorderIntentPersistence
{
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): TelebirrPreorderIntentSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return TelebirrPreorderIntentSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }

  save(
    snapshot: TelebirrPreorderIntentSnapshot,
    expectedRevision: number,
  ) {
    const validated = TelebirrPreorderIntentSnapshotSchema.parse(snapshot);
    const expected = z.number().int().nonnegative().parse(expectedRevision);
    if (validated.revision !== expected + 1)
      throw new Error("TELEBIRR_PERSISTENCE_REVISION_INVALID");

    const directory = dirname(this.filePath);
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    const lockPath = `${this.filePath}.lock`;
    mkdirSync(directory, { recursive: true, mode: 0o700 });

    let lockDescriptor: number | undefined;
    let dataDescriptor: number | undefined;
    let ownsLock = false;

    try {
      try {
        lockDescriptor = openSync(lockPath, "wx", 0o600);
        ownsLock = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST")
          throw new Error("TELEBIRR_PERSISTENCE_LOCKED");
        throw error;
      }

      const current = this.load();
      const currentRevision = current?.revision ?? 0;
      if (currentRevision !== expected)
        throw new Error("TELEBIRR_PERSISTENCE_CONFLICT");

      dataDescriptor = openSync(temporary, "wx", 0o600);
      writeFileSync(dataDescriptor, `${JSON.stringify(validated)}\n`, "utf8");
      fsyncSync(dataDescriptor);
      closeSync(dataDescriptor);
      dataDescriptor = undefined;

      renameSync(temporary, this.filePath);

      // POSIX hosts fsync the containing directory. Node on Windows rejects
      // directory fsync with EPERM, so that platform limitation is explicit.
      fsyncDirectoryEntrySync(directory);
    } finally {
      if (dataDescriptor !== undefined) closeSync(dataDescriptor);
      if (lockDescriptor !== undefined) closeSync(lockDescriptor);
      if (existsSync(temporary)) unlinkSync(temporary);
      if (ownsLock && existsSync(lockPath)) unlinkSync(lockPath);
    }
  }
}
