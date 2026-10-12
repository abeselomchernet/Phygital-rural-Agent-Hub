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
  TransportReceiverSnapshotSchema,
  type TransportReceiverPersistence,
  type TransportReceiverSnapshot,
} from "../domain/transport";

/**
 * Local synthetic-development replay/sequence persistence only.
 *
 * This is not a remote GhostSync receiver, financial ledger, settlement store,
 * approved Ethiopia-resident regulated storage, or authorization to process
 * real customer data.
 */
export class AtomicJsonTransportPersistence
  implements TransportReceiverPersistence
{
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): TransportReceiverSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return TransportReceiverSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }

  save(snapshot: TransportReceiverSnapshot) {
    const validated = TransportReceiverSnapshotSchema.parse(snapshot),
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
