import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  PartnerReconciliationSnapshotSchema,
  type PartnerReconciliationPersistence,
  type PartnerReconciliationSnapshot,
} from "../domain/reconciliation";

/**
 * Local synthetic-development reconciliation persistence only. This is not a
 * live PartnerFI callback store, settlement ledger, or approved regulated
 * infrastructure.
 */
export class AtomicJsonPartnerReconciliationPersistence
  implements PartnerReconciliationPersistence
{
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): PartnerReconciliationSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return PartnerReconciliationSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }

  save(snapshot: PartnerReconciliationSnapshot) {
    const validated = PartnerReconciliationSnapshotSchema.parse(snapshot),
      directory = dirname(this.filePath),
      temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temporary, "wx", 0o600);
      writeFileSync(descriptor, `${JSON.stringify(validated)}\n`, "utf8");
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, this.filePath);
    } catch (error) {
      if (descriptor !== undefined) closeSync(descriptor);
      if (existsSync(temporary)) unlinkSync(temporary);
      throw error;
    }
  }
}
