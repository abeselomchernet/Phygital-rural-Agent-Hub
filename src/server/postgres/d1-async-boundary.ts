import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { canonicalizeEvidenceValue } from "../../domain/evidenceIntegrity";

const SnapshotStorageClassSchema = z.enum([
  "TRANSACTIONAL_STATE",
  "CONFIGURATION",
]);
const SnapshotSourceKindSchema = z.enum([
  "SYNTHETIC_FILESYSTEM",
  "SYNTHETIC_POSTGRES",
]);
const StoreKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._/-]*$/);

export type D1SnapshotStorageClass = z.infer<typeof SnapshotStorageClassSchema>;
export type D1SnapshotSourceKind = z.infer<typeof SnapshotSourceKindSchema>;

export type D1SnapshotRecord = {
  storeKey: string;
  storageClass: D1SnapshotStorageClass;
  revision: number;
  payload: unknown;
  payloadSha256: string;
  sourceKind: D1SnapshotSourceKind;
};

export type D1SnapshotWrite = {
  storeKey: string;
  storageClass: D1SnapshotStorageClass;
  expectedRevision: number;
  payload: unknown;
  sourceKind: D1SnapshotSourceKind;
};

export interface D1AsyncSnapshotBoundary {
  load(storeKey: string): Promise<D1SnapshotRecord | undefined>;
  compareAndSwap(input: D1SnapshotWrite): Promise<D1SnapshotRecord>;
  removeSyntheticFilesystemShadow(
    storeKey: string,
    expectedRevision: number,
  ): Promise<boolean>;
}

export function d1CanonicalPayloadSha256(payload: unknown) {
  return createHash("sha256")
    .update(canonicalizeEvidenceValue(payload), "utf8")
    .digest("hex");
}

function validateStoreKey(storeKey: string) {
  return StoreKeySchema.parse(storeKey);
}

function validateRevision(revision: number, allowZero = false) {
  if (!Number.isSafeInteger(revision) || revision < (allowZero ? 0 : 1))
    throw new Error("D1_POSTGRES_REVISION_INVALID");
  return revision;
}

function rowToRecord(row: any): D1SnapshotRecord {
  const record: D1SnapshotRecord = {
    storeKey: validateStoreKey(row.store_key),
    storageClass: SnapshotStorageClassSchema.parse(row.storage_class),
    revision: Number(row.revision),
    payload: row.payload,
    payloadSha256: z.string().regex(/^[0-9a-f]{64}$/).parse(row.payload_sha256),
    sourceKind: SnapshotSourceKindSchema.parse(row.source_kind),
  };
  validateRevision(record.revision);
  if (d1CanonicalPayloadSha256(record.payload) !== record.payloadSha256)
    throw new Error("D1_POSTGRES_PAYLOAD_DIGEST_MISMATCH");
  return record;
}

async function readRecord(client: Pool | PoolClient, storeKey: string) {
  const result = await client.query(
    "SELECT store_key, storage_class, revision, payload, payload_sha256, source_kind " +
      "FROM enawuga.persistence_snapshot WHERE store_key = $1",
    [validateStoreKey(storeKey)],
  );
  if (!result.rowCount) return undefined;
  return rowToRecord(result.rows[0]);
}

export class PostgresD1AsyncSnapshotBoundary
  implements D1AsyncSnapshotBoundary
{
  constructor(private readonly pool: Pool) {}

  load(storeKey: string) {
    return readRecord(this.pool, storeKey);
  }

  async compareAndSwap(input: D1SnapshotWrite) {
    const storeKey = validateStoreKey(input.storeKey);
    const storageClass = SnapshotStorageClassSchema.parse(input.storageClass);
    const sourceKind = SnapshotSourceKindSchema.parse(input.sourceKind);
    const expectedRevision = validateRevision(input.expectedRevision, true);
    const payloadSha256 = d1CanonicalPayloadSha256(input.payload);
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      let result;
      if (expectedRevision === 0) {
        result = await client.query(
          "INSERT INTO enawuga.persistence_snapshot " +
            "(store_key, storage_class, revision, payload, payload_sha256, source_kind) " +
            "VALUES ($1, $2, 1, $3::jsonb, $4, $5) " +
            "ON CONFLICT (store_key) DO NOTHING " +
            "RETURNING store_key, storage_class, revision, payload, payload_sha256, source_kind",
          [storeKey, storageClass, JSON.stringify(input.payload), payloadSha256, sourceKind],
        );
      } else {
        result = await client.query(
          "UPDATE enawuga.persistence_snapshot SET " +
            "storage_class = $2, revision = revision + 1, payload = $3::jsonb, " +
            "payload_sha256 = $4, source_kind = $5, updated_at = now() " +
            "WHERE store_key = $1 AND revision = $6 " +
            "RETURNING store_key, storage_class, revision, payload, payload_sha256, source_kind",
          [
            storeKey,
            storageClass,
            JSON.stringify(input.payload),
            payloadSha256,
            sourceKind,
            expectedRevision,
          ],
        );
      }

      if (result.rowCount !== 1) throw new Error("D1_POSTGRES_CAS_CONFLICT");
      const record = rowToRecord(result.rows[0]);
      await client.query("COMMIT");
      return record;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeSyntheticFilesystemShadow(
    storeKey: string,
    expectedRevision: number,
  ) {
    validateRevision(expectedRevision);
    const result = await this.pool.query(
      "DELETE FROM enawuga.persistence_snapshot " +
        "WHERE store_key = $1 AND revision = $2 AND source_kind = 'SYNTHETIC_FILESYSTEM'",
      [validateStoreKey(storeKey), expectedRevision],
    );
    return result.rowCount === 1;
  }
}
