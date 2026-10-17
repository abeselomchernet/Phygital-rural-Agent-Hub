import "dotenv/config";
import { Pool } from "pg";
import { loadD1PostgresFoundationConfig } from "../src/server/postgres/d1-config";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import { loadD1SessionRuntimeReadConfig } from "../src/server/postgres/d1-session-read-cutover";
import {
  appendD1SessionCanaryObservation,
  buildD1SessionCanaryObservation,
  loadD1SessionCanaryObservations,
  summarizeD1SessionCanaryObservationHistory,
} from "../src/server/postgres/d1-session-canary-observation";

if (process.env.D1_SESSION_CANARY_OBSERVATION_ACK !== "synthetic-only")
  throw new Error("D1_SESSION_CANARY_OBSERVATION_ACK_REQUIRED");

const operation = process.argv[2] ?? "report";
if (!["record", "report"].includes(operation))
  throw new Error("D1_SESSION_CANARY_OBSERVATION_OPERATION_INVALID");

const foundation = loadD1PostgresFoundationConfig(process.env);
if (!foundation.enabled) throw new Error("D1_POSTGRES_NOT_ENABLED");

const pool = new Pool({
  connectionString: foundation.connectionString,
  application_name: `${foundation.applicationName}-session-canary-observation`,
  max: 2,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 5_000,
});

try {
  await applyD1FoundationMigration(pool);

  if (operation === "record") {
    const runtime = loadD1SessionRuntimeReadConfig(process.env);
    if (!runtime.enabled || runtime.mode !== "postgres-shadow-canary")
      throw new Error("D1_SESSION_CANARY_RUNTIME_MODE_REQUIRED");
    const stateDir = process.env.SYNTHETIC_STATE_DIR;
    if (!stateDir) throw new Error("D1_SESSION_CANARY_STATE_DIR_REQUIRED");

    const observation = await buildD1SessionCanaryObservation({
      pool,
      stateDir,
    });
    const append = await appendD1SessionCanaryObservation(pool, observation);
    console.log(
      JSON.stringify({
        operation,
        append,
        observation,
        cutoverAuthorized: false,
      }),
    );
  } else {
    const observations = await loadD1SessionCanaryObservations(pool);
    console.log(
      JSON.stringify({
        operation,
        report: summarizeD1SessionCanaryObservationHistory(observations),
      }),
    );
  }
} finally {
  await pool.end();
}
