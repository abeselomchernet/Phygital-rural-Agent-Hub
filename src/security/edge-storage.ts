import { validateDataConfig } from "../domain/residency";

/** Design contract only. No implementation is wired to the browser outbox. */
export interface SealedEdgeRecord {
  version: 1;
  recordId: string;
  keyVersion: string;
  // A future approved adapter must authenticate these fields as associated data.
  binding: { deviceId: string; customerId: string; schemaVersion: number; sequence: number };
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  authenticationTag: Uint8Array;
}

export interface EncryptedEdgeStorage {
  readonly capability: "DISABLED_PENDING_APPROVED_KEY_CUSTODY";
  readonly dataMode: "synthetic";
  seal(recordId: string, plaintext: Uint8Array, binding: SealedEdgeRecord["binding"]): Promise<SealedEdgeRecord>;
  open(record: SealedEdgeRecord): Promise<Uint8Array>;
  rotateKey(): Promise<void>;
  retireKey(keyVersion: string): Promise<void>;
}

/** Fail-closed placeholder: never echoes plaintext, pretends to encrypt, or stores keys. */
export class UnavailableEncryptedEdgeStorage implements EncryptedEdgeStorage {
  readonly capability = "DISABLED_PENDING_APPROVED_KEY_CUSTODY" as const;
  readonly dataMode = "synthetic" as const;
  constructor(env: Record<string, string | undefined> = {}) {
    validateDataConfig(env);
  }
  async seal(_id: string, _plaintext: Uint8Array, _binding: SealedEdgeRecord["binding"]): Promise<SealedEdgeRecord> {
    throw new Error("ENCRYPTED_EDGE_STORAGE_UNAVAILABLE");
  }
  async open(_record: SealedEdgeRecord): Promise<Uint8Array> {
    throw new Error("ENCRYPTED_EDGE_STORAGE_UNAVAILABLE");
  }
  async rotateKey(): Promise<void> { throw new Error("ENCRYPTED_EDGE_STORAGE_UNAVAILABLE"); }
  async retireKey(_version: string): Promise<void> { throw new Error("ENCRYPTED_EDGE_STORAGE_UNAVAILABLE"); }
}
