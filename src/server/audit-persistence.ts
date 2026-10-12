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
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import {
  SyntheticAuditSnapshotSchema,
  type SyntheticAuditPersistence,
  type SyntheticAuditSnapshot,
} from "./audit";

/**
 * Local synthetic-development audit persistence only. File permissions reduce
 * accidental local disclosure but this is not encrypted storage, regulated
 * audit infrastructure, or an Ethiopia-residency claim.
 */
export class AtomicJsonSyntheticAuditPersistence
  implements SyntheticAuditPersistence
{
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): SyntheticAuditSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return SyntheticAuditSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }

  save(snapshot: SyntheticAuditSnapshot) {
    const validated = SyntheticAuditSnapshotSchema.parse(snapshot),
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
