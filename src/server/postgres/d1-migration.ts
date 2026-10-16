import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Pool, PoolClient } from "pg";

export const D1_FOUNDATION_MIGRATION_ID = "001_persistence_foundation";
const SQL_PARAM_1 = String.fromCharCode(36) + "1";
const SQL_PARAM_2 = String.fromCharCode(36) + "2";

const migrationUrl = new URL(
  "../../../migrations/d1/001_persistence_foundation.sql",
  import.meta.url,
);

export function readD1FoundationMigrationSql() {
  return readFileSync(migrationUrl, "utf8");
}

export function d1FoundationMigrationChecksum(
  sql = readD1FoundationMigrationSql(),
) {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

async function ensureMigrationLedger(client: PoolClient) {
  await client.query("CREATE SCHEMA IF NOT EXISTS enawuga");
  await client.query(
    "CREATE TABLE IF NOT EXISTS enawuga.d1_schema_migrations (" +
      "migration_id text PRIMARY KEY, " +
      "migration_sha256 char(64) NOT NULL CHECK (migration_sha256 ~ '^[0-9a-f]{64}$'), " +
      "applied_at timestamptz NOT NULL DEFAULT now()" +
      ")",
  );
}

export async function applyD1FoundationMigration(pool: Pool) {
  const sql = readD1FoundationMigrationSql();
  const checksum = d1FoundationMigrationChecksum(sql);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureMigrationLedger(client);

    const existing = await client.query<{ migration_sha256: string }>(
      "SELECT migration_sha256 FROM enawuga.d1_schema_migrations WHERE migration_id = " + SQL_PARAM_1,
      [D1_FOUNDATION_MIGRATION_ID],
    );

    if (existing.rowCount) {
      if (existing.rows[0]?.migration_sha256 !== checksum)
        throw new Error("D1_POSTGRES_MIGRATION_CHECKSUM_MISMATCH");
      await client.query("COMMIT");
      return {
        applied: false as const,
        migrationId: D1_FOUNDATION_MIGRATION_ID,
        checksum,
      };
    }

    await client.query(sql);
    await client.query(
      "INSERT INTO enawuga.d1_schema_migrations (migration_id, migration_sha256) VALUES (" +
        SQL_PARAM_1 +
        ", " +
        SQL_PARAM_2 +
        ")",
      [D1_FOUNDATION_MIGRATION_ID, checksum],
    );
    await client.query("COMMIT");
    return {
      applied: true as const,
      migrationId: D1_FOUNDATION_MIGRATION_ID,
      checksum,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyD1Foundation(pool: Pool) {
  const result = await pool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables " +
      "WHERE table_schema = 'enawuga' ORDER BY table_name",
  );
  return result.rows.map((row) => row.table_name);
}
