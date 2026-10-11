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
  CustomerStoreSnapshotSchema,
  type CustomerStorePersistence,
  type CustomerStoreSnapshot,
} from "../domain/customer";

/**
 * Local synthetic-development persistence only.
 *
 * This adapter is intentionally Node-only and must not be interpreted as
 * approved regulated storage, Ethiopia-resident infrastructure, encrypted
 * edge storage, or authorization to persist real customer data.
 */
export class AtomicJsonCustomerPersistence implements CustomerStorePersistence {
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): CustomerStoreSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return CustomerStoreSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }

  save(snapshot: CustomerStoreSnapshot) {
    const validated = CustomerStoreSnapshotSchema.parse(snapshot),
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
