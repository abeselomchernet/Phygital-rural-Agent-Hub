import "dotenv/config";
import { Pool } from "pg";
import { loadD1PostgresFoundationConfig } from "../src/server/postgres/d1-config";
import {
  applyD1FoundationMigration,
  verifyD1Foundation,
} from "../src/server/postgres/d1-migration";

const config = loadD1PostgresFoundationConfig(process.env);
if (!config.enabled) throw new Error("D1_POSTGRES_NOT_ENABLED");

const pool = new Pool({
  connectionString: config.connectionString,
  application_name: config.applicationName,
  max: 2,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 5_000,
});

try {
  const migration = await applyD1FoundationMigration(pool);
  const tables = await verifyD1Foundation(pool);
  console.log(
    JSON.stringify({
      migrationId: migration.migrationId,
      applied: migration.applied,
      checksum: migration.checksum,
      schema: "enawuga",
      tableCount: tables.length,
      tables,
      authority: "SYNTHETIC_LOCAL_FOUNDATION_ONLY",
    }),
  );
} finally {
  await pool.end();
}
