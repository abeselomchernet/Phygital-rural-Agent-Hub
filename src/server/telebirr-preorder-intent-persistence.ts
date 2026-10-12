import { randomUUID } from "node:crypto";
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
import {
  TelebirrPreorderIntentSnapshotSchema,
  type TelebirrPreorderIntentPersistence,
  type TelebirrPreorderIntentSnapshot,
} from "../domain/telebirrPreorderIntent";

/**
 * Local synthetic-development persistence for Telebirr preorder correlation
 * intent only. It stores no Telebirr credential/private key/token/signature and
 * is not a production ledger, transactional outbox, or residency evidence.
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

  save(snapshot: TelebirrPreorderIntentSnapshot) {
    const validated = TelebirrPreorderIntentSnapshotSchema.parse(snapshot);
    const directory = dirname(this.filePath);
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
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
