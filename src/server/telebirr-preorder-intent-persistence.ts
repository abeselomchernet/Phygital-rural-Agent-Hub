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
import { withLocalFileLeaseSync } from "./local-file-lease";
import { z } from "zod";
import {
  TelebirrPreorderIntentSnapshotSchema,
  type TelebirrPreorderIntentPersistence,
  type TelebirrPreorderIntentSnapshot,
} from "../domain/telebirrPreorderIntent";

const DEFAULT_LOCK_LEASE_MS = 60_000;

/**
 * Local synthetic-development persistence for Telebirr preorder correlation
 * intent only. It stores no Telebirr credential/private key/token/signature and
 * is not a production ledger, distributed lock, transactional outbox, or
 * residency evidence.
 *
 * Writes use an owned bounded lease lock, revision compare-and-swap, fsync of
 * the candidate file, atomic rename, and directory fsync. Expired lock files
 * may be recovered only through ownership-checked stale-lock quarantine.
 */
export class AtomicJsonTelebirrPreorderIntentPersistence
  implements TelebirrPreorderIntentPersistence
{
  readonly filePath: string;

  constructor(
    filePath: string,
    private readonly lockOptions: { leaseMs?: number; waitMs?: number } = {},
  ) {
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
    let dataDescriptor: number | undefined;

    try {
      withLocalFileLeaseSync(
        {
          lockPath,
          waitMs: this.lockOptions.waitMs ?? 0,
          leaseMs: this.lockOptions.leaseMs ?? DEFAULT_LOCK_LEASE_MS,
          lockedErrorCode: "TELEBIRR_PERSISTENCE_LOCKED",
          ownershipLostErrorCode: "TELEBIRR_PERSISTENCE_LOCK_OWNERSHIP_LOST",
          staleRecoveryErrorCode: "TELEBIRR_PERSISTENCE_LOCK_RECOVERY_FAILED",
        },
        () => {
          const current = this.load();
          const currentRevision = current?.revision ?? 0;
          if (currentRevision !== expected)
            throw new Error("TELEBIRR_PERSISTENCE_CONFLICT");

          dataDescriptor = openSync(temporary, "wx", 0o600);
          writeFileSync(
            dataDescriptor,
            `${JSON.stringify(validated)}\n`,
            "utf8",
          );
          fsyncSync(dataDescriptor);
          closeSync(dataDescriptor);
          dataDescriptor = undefined;

          renameSync(temporary, this.filePath);
          fsyncDirectoryEntrySync(directory);
        },
      );
    } finally {
      if (dataDescriptor !== undefined) closeSync(dataDescriptor);
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
}
