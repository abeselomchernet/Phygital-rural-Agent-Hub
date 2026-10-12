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
  PaymentGatewayReconciliationSnapshotSchema,
  type PaymentGatewayReconciliationPersistence,
  type PaymentGatewayReconciliationSnapshot,
} from "../domain/paymentGatewayReconciliation";

/**
 * Local synthetic-development payment-gateway reconciliation persistence only.
 * This is not a settlement ledger, approved regulated storage, or evidence of
 * Ethiopia-resident production infrastructure.
 */
export class AtomicJsonPaymentGatewayReconciliationPersistence
  implements PaymentGatewayReconciliationPersistence
{
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }

  load(): PaymentGatewayReconciliationSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return PaymentGatewayReconciliationSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }

  save(snapshot: PaymentGatewayReconciliationSnapshot) {
    const validated = PaymentGatewayReconciliationSnapshotSchema.parse(snapshot),
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
