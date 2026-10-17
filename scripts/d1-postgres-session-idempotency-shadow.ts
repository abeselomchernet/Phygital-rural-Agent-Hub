import "dotenv/config";
import { Pool } from "pg";
import { loadD1PostgresFoundationConfig } from "../src/server/postgres/d1-config";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import {
  discoverD1SessionIdempotencyFilesystemState,
  planD1SessionIdempotencyShadow,
  summarizeD1SessionIdempotencyPlan,
  syncD1SessionIdempotencyShadow,
  verifyD1SessionIdempotencyShadow,
} from "../src/server/postgres/d1-session-idempotency-shadow";

const config = loadD1PostgresFoundationConfig(process.env);
if (!config.enabled) throw new Error("D1_POSTGRES_NOT_ENABLED");
if (process.env.D1_SESSION_IDEMPOTENCY_SHADOW_ACK !== "synthetic-only")
  throw new Error("D1_SESSION_IDEMPOTENCY_SHADOW_ACK_REQUIRED");

const stateDir = process.env.SYNTHETIC_STATE_DIR;
if (!stateDir) throw new Error("D1_SESSION_IDEMPOTENCY_STATE_DIR_REQUIRED");
const operation = process.argv[2] ?? "plan";
if (!["plan", "sync", "verify"].includes(operation))
  throw new Error("D1_SESSION_IDEMPOTENCY_OPERATION_INVALID");

const pool = new Pool({
  connectionString: config.connectionString,
  application_name: `${config.applicationName}-session-idempotency-shadow`,
  max: 2,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 5_000,
});

try {
  await applyD1FoundationMigration(pool);
  const discovery = discoverD1SessionIdempotencyFilesystemState(stateDir);
  const result =
    operation === "sync"
      ? await syncD1SessionIdempotencyShadow(pool, discovery)
      : operation === "verify"
        ? await verifyD1SessionIdempotencyShadow(pool, discovery)
        : summarizeD1SessionIdempotencyPlan(
            await planD1SessionIdempotencyShadow(pool, discovery),
          );

  console.log(
    JSON.stringify({
      operation,
      authority: "SYNTHETIC_FILESYSTEM_PRIMARY",
      runtimeCutover: false,
      sourceFingerprint: discovery.fingerprint,
      observedAt: new Date(discovery.observedAtMs).toISOString(),
      result,
    }),
  );
} finally {
  await pool.end();
}
