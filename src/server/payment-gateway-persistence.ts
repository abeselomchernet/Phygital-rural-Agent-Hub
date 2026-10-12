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
  PaymentGatewaySnapshotSchema,
  type PaymentGatewayPersistence,
  type PaymentGatewaySnapshot,
} from "../domain/paymentGatewayState";

/**
 * Local synthetic-development payment-gateway persistence only. This is not a
 * production payment ledger, approved regulated storage, Ethiopia-residency
 * evidence, or an exactly-once transactional outbox.
 */
export class AtomicJsonPaymentGatewayPersistence
  implements PaymentGatewayPersistence
{
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): PaymentGatewaySnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return PaymentGatewaySnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }

  save(snapshot: PaymentGatewaySnapshot) {
    const validated = PaymentGatewaySnapshotSchema.parse(snapshot),
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
