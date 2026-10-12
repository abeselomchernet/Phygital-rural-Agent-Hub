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
  PartnerLedgerSnapshotSchema,
  type PartnerLedgerPersistence,
  type PartnerLedgerSnapshot,
} from "../domain/financial";

/**
 * Local synthetic-development persistence only.
 *
 * This is deliberately a Node-only adapter. It is not approved regulated
 * storage, not an Ethiopia-residency claim, and not suitable for real customer
 * or PartnerFI data. A production/staging provider remains a separate evidence
 * and architecture decision.
 */
export class AtomicJsonPartnerLedgerPersistence
  implements PartnerLedgerPersistence
{
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): PartnerLedgerSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    const parsed = JSON.parse(readFileSync(this.filePath, "utf8"));
    return PartnerLedgerSnapshotSchema.parse(parsed);
  }

  save(snapshot: PartnerLedgerSnapshot) {
    const validated = PartnerLedgerSnapshotSchema.parse(snapshot),
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
