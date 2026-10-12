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
  KycPendingSnapshotSchema,
  MockIdentityProviderSnapshotSchema,
  type KycPendingPersistence,
  type KycPendingSnapshot,
  type MockIdentityProviderPersistence,
  type MockIdentityProviderSnapshot,
} from "../domain/identity";

function atomicWrite(path: string, value: unknown) {
  const directory = dirname(path),
    temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporary, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value)}\n`, "utf8");
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

/** Local synthetic mock-provider state only; never store real identity data. */
export class AtomicJsonMockIdentityPersistence
  implements MockIdentityProviderPersistence
{
  readonly filePath: string;
  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }
  load(): MockIdentityProviderSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return MockIdentityProviderSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }
  save(snapshot: MockIdentityProviderSnapshot) {
    atomicWrite(
      this.filePath,
      MockIdentityProviderSnapshotSchema.parse(snapshot),
    );
  }
}

/** Local synthetic pending-KYC state only; not Fayda or PartnerFI storage. */
export class AtomicJsonKycPendingPersistence implements KycPendingPersistence {
  readonly filePath: string;
  constructor(filePath: string) {
    this.filePath = resolve(filePath);
  }
  load(): KycPendingSnapshot | undefined {
    if (!existsSync(this.filePath)) return undefined;
    return KycPendingSnapshotSchema.parse(
      JSON.parse(readFileSync(this.filePath, "utf8")),
    );
  }
  save(snapshot: KycPendingSnapshot) {
    atomicWrite(this.filePath, KycPendingSnapshotSchema.parse(snapshot));
  }
}
