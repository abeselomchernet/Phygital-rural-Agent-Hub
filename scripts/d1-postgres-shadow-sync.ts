import "dotenv/config";
import { Pool } from "pg";
import { loadD1PostgresFoundationConfig } from "../src/server/postgres/d1-config";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import { discoverD1SyntheticFilesystemState, verifyD1SyntheticFilesystemShadow } from "../src/server/postgres/d1-shadow-migration";
import {
  planD1SyntheticFilesystemShadowSync,
  syncD1SyntheticFilesystemShadow,
} from "../src/server/postgres/d1-shadow-sync";

const config = loadD1PostgresFoundationConfig(process.env);
if (!config.enabled) throw new Error("D1_POSTGRES_NOT_ENABLED");
if (process.env.D1_SHADOW_SYNC_ACK !== "synthetic-only")
  throw new Error("D1_SHADOW_SYNC_ACK_REQUIRED");

const stateDir = process.env.SYNTHETIC_STATE_DIR;
if (!stateDir) throw new Error("D1_SHADOW_STATE_DIR_REQUIRED");
const operation = process.argv[2] ?? "plan";
if (!["plan", "sync", "verify"].includes(operation))
  throw new Error("D1_SHADOW_SYNC_OPERATION_INVALID");

const pool = new Pool({
  connectionString: config.connectionString,
  application_name: `${config.applicationName}-shadow-sync`,
  max: 2,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 5_000,
});

try {
  await applyD1FoundationMigration(pool);
  const discovery = discoverD1SyntheticFilesystemState(stateDir);
  const result =
    operation === "sync"
      ? await syncD1SyntheticFilesystemShadow(pool, discovery)
      : operation === "verify"
        ? await verifyD1SyntheticFilesystemShadow(pool, discovery)
        : await planD1SyntheticFilesystemShadowSync(pool, discovery);
  console.log(
    JSON.stringify({
      operation,
      stateDir: discovery.stateDir,
      authority: "SYNTHETIC_FILESYSTEM_PRIMARY",
      runtimeCutover: false,
      result,
    }),
  );
} finally {
  await pool.end();
}
