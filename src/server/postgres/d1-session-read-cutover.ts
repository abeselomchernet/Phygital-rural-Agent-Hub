import { existsSync } from "node:fs";
import type { Pool, PoolClient } from "pg";
import { Pool as PgPool } from "pg";
import { z } from "zod";
import { StoredSessionSchema, type StoredSession } from "../auth";
import { d1CanonicalPayloadSha256 } from "./d1-async-boundary";
import { loadD1PostgresFoundationConfig } from "./d1-config";
import { applyD1FoundationMigration } from "./d1-migration";
import {
  buildD1SessionShadowPayload,
  discoverD1SessionIdempotencyFilesystemState,
  loadD1SessionFilesystemSource,
  planD1SessionIdempotencyShadow,
  type D1SessionIdempotencyDiscovery,
} from "./d1-session-idempotency-shadow";

const DigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const RuntimeModeSchema = z.enum(["filesystem-primary", "postgres-shadow-canary"]);

const RuntimeSessionPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceKind: z.enum(["SYNTHETIC_FILESYSTEM", "SYNTHETIC_POSTGRES"]),
    shadowState: z.enum(["PRESENT", "SOURCE_MISSING_REVIEW_REQUIRED"]),
    sourcePayloadSha256: DigestSchema,
    value: StoredSessionSchema,
  })
  .strict();

export type D1SessionRuntimeReadConfig =
  | {
      enabled: false;
      mode: "filesystem-primary";
    }
  | {
      enabled: true;
      mode: "postgres-shadow-canary";
      connectionString: string;
      applicationName: "enawuga-d1-session-read-cutover";
    };

export interface D1SessionRuntimeReadCutover {
  readonly mode: "POSTGRES_SHADOW_CANARY";
  preflight(): Promise<void>;
  publishCreatedSession(session: StoredSession): Promise<void>;
  readVerifiedSession(sessionId: string): Promise<StoredSession>;
  removeRevokedSessionShadow(sessionId: string): Promise<void>;
  close(): Promise<void>;
}

type RuntimeSessionRow = {
  sessionId: string;
  expiresAtMs: number;
  payload: z.infer<typeof RuntimeSessionPayloadSchema>;
  payloadSha256: string;
};

function safeSessionId(sessionId: string) {
  return z.string().uuid().parse(sessionId);
}

function parseRow(row: any): RuntimeSessionRow {
  const payload = RuntimeSessionPayloadSchema.parse(row.payload);
  const expiresAtMs = new Date(row.expires_at).getTime();
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0)
    throw new Error("D1_SESSION_RUNTIME_POSTGRES_EXPIRY_INVALID");
  const payloadSha256 = DigestSchema.parse(row.payload_sha256);
  if (d1CanonicalPayloadSha256(payload) !== payloadSha256)
    throw new Error("D1_SESSION_RUNTIME_POSTGRES_PAYLOAD_DIGEST_MISMATCH");
  if (row.session_id !== payload.value.sessionId || expiresAtMs !== payload.value.expiresAtMs)
    throw new Error("D1_SESSION_RUNTIME_POSTGRES_ROW_MISMATCH");
  return {
    sessionId: safeSessionId(row.session_id),
    expiresAtMs,
    payload,
    payloadSha256,
  };
}

async function readRow(db: Pool | PoolClient, sessionId: string, forUpdate = false) {
  const result = await db.query(
    "SELECT session_id, expires_at, payload, payload_sha256 FROM enawuga.session_state " +
      "WHERE session_id = $1" + (forUpdate ? " FOR UPDATE" : ""),
    [safeSessionId(sessionId)],
  );
  return result.rowCount ? parseRow(result.rows[0]) : undefined;
}

function exactSessionMatch(left: StoredSession, right: StoredSession) {
  return d1CanonicalPayloadSha256(StoredSessionSchema.parse(left)) ===
    d1CanonicalPayloadSha256(StoredSessionSchema.parse(right));
}

function requireFilesystemOwnedPresent(row: RuntimeSessionRow) {
  if (row.payload.sourceKind !== "SYNTHETIC_FILESYSTEM")
    throw new Error("D1_SESSION_RUNTIME_POSTGRES_OWNED_REVIEW_REQUIRED");
  if (row.payload.shadowState !== "PRESENT")
    throw new Error("D1_SESSION_RUNTIME_SOURCE_MISSING_REVIEW_REQUIRED");
}

export function loadD1SessionRuntimeReadConfig(
  env: Record<string, string | undefined>,
): D1SessionRuntimeReadConfig {
  const rawMode = env.D1_SESSION_RUNTIME_READ_MODE ?? "filesystem-primary";
  const mode = RuntimeModeSchema.safeParse(rawMode);
  if (!mode.success) throw new Error("D1_SESSION_RUNTIME_READ_MODE_INVALID");
  if (mode.data === "filesystem-primary") return { enabled: false, mode: mode.data };

  if (env.D1_SESSION_RUNTIME_READ_ACK !== "synthetic-only")
    throw new Error("D1_SESSION_RUNTIME_READ_ACK_REQUIRED");
  if (!env.SYNTHETIC_STATE_DIR)
    throw new Error("D1_SESSION_RUNTIME_STATE_DIR_REQUIRED");
  if (env.REQUIRE_DURABLE_SESSION_STORE !== "true")
    throw new Error("D1_SESSION_RUNTIME_DURABLE_STORE_REQUIRED");

  const foundation = loadD1PostgresFoundationConfig(env);
  if (!foundation.enabled) throw new Error("D1_SESSION_RUNTIME_POSTGRES_REQUIRED");

  return {
    enabled: true,
    mode: mode.data,
    connectionString: foundation.connectionString,
    applicationName: "enawuga-d1-session-read-cutover",
  };
}

export class PostgresD1SessionRuntimeReadCutover
  implements D1SessionRuntimeReadCutover
{
  readonly mode = "POSTGRES_SHADOW_CANARY" as const;

  constructor(
    private readonly pool: Pool,
    private readonly stateDir: string,
  ) {
    if (!stateDir) throw new Error("D1_SESSION_RUNTIME_STATE_DIR_REQUIRED");
  }

  async preflight() {
    if (!existsSync(this.stateDir))
      throw new Error("D1_SESSION_RUNTIME_STATE_DIR_NOT_FOUND");
    await applyD1FoundationMigration(this.pool);
    const discovery = this.discovery();
    const plan = await planD1SessionIdempotencyShadow(this.pool, discovery);
    const unsafe = plan.sessions.filter(
      (item) => !["MATCHED", "EXPIRED_SOURCE_NOOP"].includes(item.status),
    );
    if (unsafe.length > 0)
      throw new Error(
        `D1_SESSION_RUNTIME_PREFLIGHT_REVIEW_REQUIRED:${unsafe
          .map((item) => item.status)
          .sort()
          .join(",")}`,
      );
  }

  async publishCreatedSession(sessionInput: StoredSession) {
    const session = StoredSessionSchema.parse(sessionInput);
    const source = loadD1SessionFilesystemSource(
      this.stateDir,
      session.sessionId,
      Date.now(),
    );
    if (!source || source.sourceStatus !== "ACTIVE")
      throw new Error("D1_SESSION_RUNTIME_SOURCE_NOT_ACTIVE");
    if (!exactSessionMatch(source.value, session))
      throw new Error("D1_SESSION_RUNTIME_SOURCE_SESSION_MISMATCH");

    const payload = buildD1SessionShadowPayload(source);
    const payloadSha256 = d1CanonicalPayloadSha256(payload);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await readRow(client, session.sessionId, true);
      if (existing) {
        requireFilesystemOwnedPresent(existing);
        if (
          existing.payload.sourcePayloadSha256 !== source.sourcePayloadSha256 ||
          existing.payloadSha256 !== payloadSha256 ||
          !exactSessionMatch(existing.payload.value, session)
        )
          throw new Error("D1_SESSION_RUNTIME_CREATE_DIVERGENCE");
      } else {
        const inserted = await client.query(
          "INSERT INTO enawuga.session_state " +
            "(session_id, expires_at, payload, payload_sha256) " +
            "VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (session_id) DO NOTHING RETURNING session_id",
          [
            session.sessionId,
            new Date(session.expiresAtMs).toISOString(),
            JSON.stringify(payload),
            payloadSha256,
          ],
        );
        if (inserted.rowCount !== 1)
          throw new Error("D1_SESSION_RUNTIME_CREATE_CAS_CONFLICT");
      }

      const readback = await readRow(client, session.sessionId);
      if (!readback) throw new Error("D1_SESSION_RUNTIME_CREATE_READBACK_MISSING");
      requireFilesystemOwnedPresent(readback);
      if (
        readback.payload.sourcePayloadSha256 !== source.sourcePayloadSha256 ||
        !exactSessionMatch(readback.payload.value, session)
      )
        throw new Error("D1_SESSION_RUNTIME_CREATE_READBACK_MISMATCH");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async readVerifiedSession(sessionIdInput: string) {
    const sessionId = safeSessionId(sessionIdInput);
    const observedAtMs = Date.now();
    const source = loadD1SessionFilesystemSource(this.stateDir, sessionId, observedAtMs);
    if (!source) throw new Error("D1_SESSION_RUNTIME_FILESYSTEM_GUARD_MISSING");
    if (source.sourceStatus !== "ACTIVE")
      throw new Error("D1_SESSION_RUNTIME_FILESYSTEM_GUARD_EXPIRED");

    const row = await readRow(this.pool, sessionId);
    if (!row) throw new Error("D1_SESSION_RUNTIME_POSTGRES_MISSING");
    requireFilesystemOwnedPresent(row);
    if (row.expiresAtMs <= observedAtMs)
      throw new Error("D1_SESSION_RUNTIME_POSTGRES_EXPIRED");
    if (row.payload.sourcePayloadSha256 !== source.sourcePayloadSha256)
      throw new Error("D1_SESSION_RUNTIME_SOURCE_DIGEST_MISMATCH");
    if (!exactSessionMatch(row.payload.value, source.value))
      throw new Error("D1_SESSION_RUNTIME_SESSION_MISMATCH");
    return StoredSessionSchema.parse(row.payload.value);
  }

  async removeRevokedSessionShadow(sessionIdInput: string) {
    const sessionId = safeSessionId(sessionIdInput);
    if (loadD1SessionFilesystemSource(this.stateDir, sessionId, Date.now()))
      throw new Error("D1_SESSION_RUNTIME_REVOKE_SOURCE_STILL_PRESENT");

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await readRow(client, sessionId, true);
      if (!existing) {
        await client.query("COMMIT");
        return;
      }
      if (existing.payload.sourceKind !== "SYNTHETIC_FILESYSTEM")
        throw new Error("D1_SESSION_RUNTIME_POSTGRES_OWNED_REVIEW_REQUIRED");
      const deleted = await client.query(
        "DELETE FROM enawuga.session_state WHERE session_id = $1 AND payload_sha256 = $2",
        [sessionId, existing.payloadSha256],
      );
      if (deleted.rowCount !== 1)
        throw new Error("D1_SESSION_RUNTIME_REVOKE_CAS_CONFLICT");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }

  private discovery(): D1SessionIdempotencyDiscovery {
    // The shared discovery remains the governed parser for both Phase 1D record classes.
    // Phase 1E preflight intentionally evaluates only the session statuses.
    return discoverD1SessionIdempotencyFilesystemState(this.stateDir, Date.now());
  }
}

export async function createD1SessionRuntimeReadCutover(input: {
  config: Extract<D1SessionRuntimeReadConfig, { enabled: true }>;
  stateDir: string;
}) {
  const pool = new PgPool({
    connectionString: input.config.connectionString,
    application_name: input.config.applicationName,
    max: 4,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
  });
  const cutover = new PostgresD1SessionRuntimeReadCutover(pool, input.stateDir);
  try {
    await cutover.preflight();
    return cutover;
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }
}
