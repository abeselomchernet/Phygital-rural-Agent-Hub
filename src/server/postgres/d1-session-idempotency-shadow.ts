import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  HubWorkflowIntentPersistenceRecordSchema,
  HubWorkflowIntentReservationSchema,
  type HubWorkflowIntentReservation,
} from "../../domain/hubWorkflowIdempotencyCertification";
import { StoredSessionSchema, type StoredSession } from "../auth";
import { d1CanonicalPayloadSha256 } from "./d1-async-boundary";

const DigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const SourceKindSchema = z.enum(["SYNTHETIC_FILESYSTEM", "SYNTHETIC_POSTGRES"]);
const ShadowStateSchema = z.enum(["PRESENT", "SOURCE_MISSING_REVIEW_REQUIRED"]);

const SessionFileEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    sessionId: z.string().uuid(),
    expiresAtMs: z.number().int().safe().positive(),
    value: StoredSessionSchema,
  })
  .strict()
  .superRefine((envelope, ctx) => {
    if (envelope.sessionId !== envelope.value.sessionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sessionId"],
        message: "session envelope id must match stored session",
      });
    }
    if (envelope.expiresAtMs !== envelope.value.expiresAtMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAtMs"],
        message: "session envelope expiry must match stored session",
      });
    }
  });

const HubIntentFileEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    scope: z.string().min(1).max(1024),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    reservation: HubWorkflowIntentReservationSchema,
  })
  .strict()
  .superRefine((envelope, ctx) => {
    const parsed = HubWorkflowIntentPersistenceRecordSchema.safeParse({
      revision: envelope.revision,
      reservation: envelope.reservation,
    });
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reservation"],
        message: "hub idempotency persistence record is invalid",
      });
    }
    const expectedScope = `${envelope.reservation.tenantId}|${envelope.reservation.hubId}|${envelope.reservation.partnerOrgId}|${envelope.reservation.idempotencyKey}`;
    if (envelope.scope !== expectedScope) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scope"],
        message: "hub idempotency scope must match reservation scope",
      });
    }
  });

const SessionShadowPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceKind: SourceKindSchema,
    shadowState: ShadowStateSchema,
    sourcePayloadSha256: DigestSchema,
    value: StoredSessionSchema,
  })
  .strict();

const HubIntentShadowPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceKind: SourceKindSchema,
    shadowState: ShadowStateSchema,
    sourcePayloadSha256: DigestSchema,
    scope: z.string().min(1).max(1024),
    reservation: HubWorkflowIntentReservationSchema,
  })
  .strict();

export type D1SessionShadowSource = {
  sessionId: string;
  expiresAtMs: number;
  value: StoredSession;
  sourcePayloadSha256: string;
  sourceStatus: "ACTIVE" | "EXPIRED";
};

export type D1HubIntentShadowSource = {
  scopeDigest: string;
  scope: string;
  revision: number;
  reservation: HubWorkflowIntentReservation;
  sourcePayloadSha256: string;
};

export type D1SessionIdempotencyDiscovery = {
  stateDir: string;
  observedAtMs: number;
  sessions: D1SessionShadowSource[];
  hubIntents: D1HubIntentShadowSource[];
  fingerprint: string;
};

type D1Queryable = Pool | PoolClient;

type D1SessionDatabaseRecord = {
  sessionId: string;
  expiresAtMs: number;
  payload: z.infer<typeof SessionShadowPayloadSchema>;
  payloadSha256: string;
};

type D1HubIntentDatabaseRecord = {
  scopeDigest: string;
  revision: number;
  payload: z.infer<typeof HubIntentShadowPayloadSchema>;
  payloadSha256: string;
};

export type D1SessionPlanStatus =
  | "CREATE_REQUIRED"
  | "MATCHED"
  | "RESTORE_REQUIRED"
  | "EXPIRED_SOURCE_NOOP"
  | "EXPIRE_DELETE_REQUIRED"
  | "SOURCE_MISSING_MARK_REQUIRED"
  | "SOURCE_MISSING_REVIEW_REQUIRED"
  | "CONFLICT_IMMUTABLE_SESSION"
  | "CONFLICT_POSTGRES_OWNED";

export type D1HubIntentPlanStatus =
  | "CREATE_REQUIRED"
  | "MATCHED"
  | "RESTORE_REQUIRED"
  | "UPDATE_REQUIRED"
  | "SOURCE_MISSING_MARK_REQUIRED"
  | "SOURCE_MISSING_REVIEW_REQUIRED"
  | "CONFLICT_SAME_REVISION_DIVERGENCE"
  | "CONFLICT_DATABASE_AHEAD"
  | "CONFLICT_POSTGRES_OWNED";

export type D1SessionPlanItem = {
  sessionId: string;
  sourcePresent: boolean;
  status: D1SessionPlanStatus;
};

export type D1HubIntentPlanItem = {
  scopeDigest: string;
  sourcePresent: boolean;
  sourceRevision: number | null;
  databaseRevision: number | null;
  status: D1HubIntentPlanStatus;
};

export type D1SessionIdempotencyPlan = {
  authority: "SYNTHETIC_FILESYSTEM_PRIMARY";
  runtimeCutover: false;
  sessions: D1SessionPlanItem[];
  hubIntents: D1HubIntentPlanItem[];
  conflicts: number;
  reviewRequired: number;
  writesRequired: number;
};

function parseJson(filePath: string) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("D1_SESSION_IDEMPOTENCY_SOURCE_JSON_INVALID");
  }
}

function ensureDirectory(directory: string, errorCode: string) {
  if (!existsSync(directory)) return undefined;
  if (lstatSync(directory).isSymbolicLink()) throw new Error(`${errorCode}_SYMLINK_FORBIDDEN`);
  const resolved = realpathSync(directory);
  if (!lstatSync(resolved).isDirectory()) throw new Error(`${errorCode}_INVALID`);
  return resolved;
}

function scopeDigestFor(scope: string) {
  if (!scope || scope.length > 1024) throw new Error("D1_HUB_INTENT_SCOPE_INVALID");
  return createHash("sha256").update(scope, "utf8").digest("hex");
}

function discoveryFingerprint(input: {
  sessions: D1SessionShadowSource[];
  hubIntents: D1HubIntentShadowSource[];
}) {
  return d1CanonicalPayloadSha256({
    sessions: input.sessions
      .map((source) => ({
        sessionId: source.sessionId,
        expiresAtMs: source.expiresAtMs,
        sourcePayloadSha256: source.sourcePayloadSha256,
        sourceStatus: source.sourceStatus,
      }))
      .sort((a, b) => a.sessionId.localeCompare(b.sessionId)),
    hubIntents: input.hubIntents
      .map((source) => ({
        scopeDigest: source.scopeDigest,
        revision: source.revision,
        sourcePayloadSha256: source.sourcePayloadSha256,
      }))
      .sort((a, b) => a.scopeDigest.localeCompare(b.scopeDigest)),
  });
}

export function loadD1SessionFilesystemSource(
  stateDir: string,
  sessionIdInput: string,
  observedAtMs = Date.now(),
): D1SessionShadowSource | undefined {
  if (!Number.isSafeInteger(observedAtMs) || observedAtMs <= 0)
    throw new Error("D1_SESSION_IDEMPOTENCY_OBSERVATION_TIME_INVALID");
  const sessionId = z.string().uuid().parse(sessionIdInput);
  const root = ensureDirectory(stateDir, "D1_SESSION_IDEMPOTENCY_STATE_DIR");
  if (!root) throw new Error("D1_SESSION_IDEMPOTENCY_STATE_DIR_NOT_FOUND");
  const sessionsDirectory = ensureDirectory(
    path.join(root, "sessions"),
    "D1_SESSION_SOURCE_DIR",
  );
  if (!sessionsDirectory) return undefined;
  const filePath = path.join(sessionsDirectory, `${sessionId}.json`);
  if (!existsSync(filePath)) return undefined;
  if (lstatSync(filePath).isSymbolicLink())
    throw new Error("D1_SESSION_SOURCE_SYMLINK_FORBIDDEN");
  const envelope = SessionFileEnvelopeSchema.parse(parseJson(filePath));
  if (envelope.sessionId !== sessionId)
    throw new Error("D1_SESSION_SOURCE_FILENAME_MISMATCH");
  return {
    sessionId: envelope.sessionId,
    expiresAtMs: envelope.expiresAtMs,
    value: envelope.value,
    sourcePayloadSha256: d1CanonicalPayloadSha256(envelope),
    sourceStatus: envelope.expiresAtMs <= observedAtMs ? "EXPIRED" : "ACTIVE",
  };
}

export function discoverD1SessionIdempotencyFilesystemState(
  stateDir: string,
  observedAtMs = Date.now(),
): D1SessionIdempotencyDiscovery {
  if (!Number.isSafeInteger(observedAtMs) || observedAtMs <= 0)
    throw new Error("D1_SESSION_IDEMPOTENCY_OBSERVATION_TIME_INVALID");
  const root = ensureDirectory(stateDir, "D1_SESSION_IDEMPOTENCY_STATE_DIR");
  if (!root) throw new Error("D1_SESSION_IDEMPOTENCY_STATE_DIR_NOT_FOUND");

  const sessions: D1SessionShadowSource[] = [];
  const sessionsDirectory = ensureDirectory(
    path.join(root, "sessions"),
    "D1_SESSION_SOURCE_DIR",
  );
  if (sessionsDirectory) {
    for (const name of readdirSync(sessionsDirectory).sort()) {
      if (!name.endsWith(".json")) continue;
      const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.json$/i.exec(name);
      if (!match) throw new Error("D1_SESSION_SOURCE_FILENAME_INVALID");
      const filePath = path.join(sessionsDirectory, name);
      if (lstatSync(filePath).isSymbolicLink())
        throw new Error("D1_SESSION_SOURCE_SYMLINK_FORBIDDEN");
      const envelope = SessionFileEnvelopeSchema.parse(parseJson(filePath));
      if (match[1] !== envelope.sessionId)
        throw new Error("D1_SESSION_SOURCE_FILENAME_MISMATCH");
      sessions.push({
        sessionId: envelope.sessionId,
        expiresAtMs: envelope.expiresAtMs,
        value: envelope.value,
        sourcePayloadSha256: d1CanonicalPayloadSha256(envelope),
        sourceStatus: envelope.expiresAtMs <= observedAtMs ? "EXPIRED" : "ACTIVE",
      });
    }
  }

  const hubIntents: D1HubIntentShadowSource[] = [];
  const hubDirectory = ensureDirectory(
    path.join(root, "hub-idempotency"),
    "D1_HUB_INTENT_SOURCE_DIR",
  );
  if (hubDirectory) {
    for (const name of readdirSync(hubDirectory).sort()) {
      if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
      const filePath = path.join(hubDirectory, name);
      if (lstatSync(filePath).isSymbolicLink())
        throw new Error("D1_HUB_INTENT_SOURCE_SYMLINK_FORBIDDEN");
      const envelope = HubIntentFileEnvelopeSchema.parse(parseJson(filePath));
      const scopeDigest = scopeDigestFor(envelope.scope);
      if (name !== `${scopeDigest}.json`)
        throw new Error("D1_HUB_INTENT_SOURCE_SCOPE_DIGEST_MISMATCH");
      hubIntents.push({
        scopeDigest,
        scope: envelope.scope,
        revision: envelope.revision,
        reservation: envelope.reservation,
        sourcePayloadSha256: d1CanonicalPayloadSha256(envelope),
      });
    }
  }

  if (new Set(sessions.map((source) => source.sessionId)).size !== sessions.length)
    throw new Error("D1_SESSION_SOURCE_DUPLICATE");
  if (new Set(hubIntents.map((source) => source.scopeDigest)).size !== hubIntents.length)
    throw new Error("D1_HUB_INTENT_SOURCE_DUPLICATE");

  return {
    stateDir: root,
    observedAtMs,
    sessions,
    hubIntents,
    fingerprint: discoveryFingerprint({ sessions, hubIntents }),
  };
}

export function buildD1SessionShadowPayload(
  source: D1SessionShadowSource,
  sourceKind: z.infer<typeof SourceKindSchema> = "SYNTHETIC_FILESYSTEM",
  shadowState: z.infer<typeof ShadowStateSchema> = "PRESENT",
) {
  return SessionShadowPayloadSchema.parse({
    schemaVersion: 1,
    sourceKind,
    shadowState,
    sourcePayloadSha256: source.sourcePayloadSha256,
    value: source.value,
  });
}

export function buildD1HubIntentShadowPayload(
  source: D1HubIntentShadowSource,
  sourceKind: z.infer<typeof SourceKindSchema> = "SYNTHETIC_FILESYSTEM",
  shadowState: z.infer<typeof ShadowStateSchema> = "PRESENT",
) {
  return HubIntentShadowPayloadSchema.parse({
    schemaVersion: 1,
    sourceKind,
    shadowState,
    sourcePayloadSha256: source.sourcePayloadSha256,
    scope: source.scope,
    reservation: source.reservation,
  });
}

function sessionRowToRecord(row: any): D1SessionDatabaseRecord {
  const payload = SessionShadowPayloadSchema.parse(row.payload);
  const expiresAtMs = new Date(row.expires_at).getTime();
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0)
    throw new Error("D1_POSTGRES_SESSION_EXPIRY_INVALID");
  const payloadSha256 = DigestSchema.parse(row.payload_sha256);
  if (d1CanonicalPayloadSha256(payload) !== payloadSha256)
    throw new Error("D1_POSTGRES_SESSION_PAYLOAD_DIGEST_MISMATCH");
  if (row.session_id !== payload.value.sessionId || expiresAtMs !== payload.value.expiresAtMs)
    throw new Error("D1_POSTGRES_SESSION_ROW_MISMATCH");
  if (
    payload.sourceKind === "SYNTHETIC_FILESYSTEM" &&
    d1CanonicalPayloadSha256({
      schemaVersion: 1,
      sessionId: row.session_id,
      expiresAtMs,
      value: payload.value,
    }) !== payload.sourcePayloadSha256
  )
    throw new Error("D1_POSTGRES_SESSION_SOURCE_DIGEST_MISMATCH");
  return {
    sessionId: row.session_id,
    expiresAtMs,
    payload,
    payloadSha256,
  };
}

function hubIntentRowToRecord(row: any): D1HubIntentDatabaseRecord {
  const payload = HubIntentShadowPayloadSchema.parse(row.payload);
  const revision = Number(row.revision);
  if (!Number.isSafeInteger(revision) || revision < 1)
    throw new Error("D1_POSTGRES_HUB_INTENT_REVISION_INVALID");
  const payloadSha256 = DigestSchema.parse(row.payload_sha256);
  if (d1CanonicalPayloadSha256(payload) !== payloadSha256)
    throw new Error("D1_POSTGRES_HUB_INTENT_PAYLOAD_DIGEST_MISMATCH");
  if (row.scope_digest !== scopeDigestFor(payload.scope))
    throw new Error("D1_POSTGRES_HUB_INTENT_SCOPE_MISMATCH");
  if (
    payload.sourceKind === "SYNTHETIC_FILESYSTEM" &&
    d1CanonicalPayloadSha256({
      schemaVersion: 1,
      scope: payload.scope,
      revision,
      reservation: payload.reservation,
    }) !== payload.sourcePayloadSha256
  )
    throw new Error("D1_POSTGRES_HUB_INTENT_SOURCE_DIGEST_MISMATCH");
  return {
    scopeDigest: row.scope_digest,
    revision,
    payload,
    payloadSha256,
  };
}

class PostgresD1SessionShadowBoundary {
  constructor(private readonly db: D1Queryable) {}

  async list() {
    const result = await this.db.query(
      "SELECT session_id, expires_at, payload, payload_sha256 FROM enawuga.session_state ORDER BY session_id",
    );
    return result.rows.map(sessionRowToRecord);
  }

  async load(sessionId: string) {
    const result = await this.db.query(
      "SELECT session_id, expires_at, payload, payload_sha256 FROM enawuga.session_state WHERE session_id = $1",
      [sessionId],
    );
    return result.rowCount ? sessionRowToRecord(result.rows[0]) : undefined;
  }

  async create(source: D1SessionShadowSource) {
    const payload = buildD1SessionShadowPayload(source);
    const digest = d1CanonicalPayloadSha256(payload);
    const result = await this.db.query(
      "INSERT INTO enawuga.session_state (session_id, expires_at, payload, payload_sha256) " +
        "VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (session_id) DO NOTHING RETURNING session_id",
      [source.sessionId, new Date(source.expiresAtMs).toISOString(), JSON.stringify(payload), digest],
    );
    if (result.rowCount !== 1) throw new Error("D1_POSTGRES_SESSION_CAS_CONFLICT");
  }

  async setShadowState(
    record: D1SessionDatabaseRecord,
    shadowState: z.infer<typeof ShadowStateSchema>,
  ) {
    const payload = SessionShadowPayloadSchema.parse({
      ...record.payload,
      shadowState,
    });
    const digest = d1CanonicalPayloadSha256(payload);
    const result = await this.db.query(
      "UPDATE enawuga.session_state SET payload = $2::jsonb, payload_sha256 = $3 " +
        "WHERE session_id = $1 AND payload_sha256 = $4 RETURNING session_id",
      [record.sessionId, JSON.stringify(payload), digest, record.payloadSha256],
    );
    if (result.rowCount !== 1) throw new Error("D1_POSTGRES_SESSION_CAS_CONFLICT");
  }

  async removeExpired(record: D1SessionDatabaseRecord, observedAtMs: number) {
    const result = await this.db.query(
      "DELETE FROM enawuga.session_state WHERE session_id = $1 AND payload_sha256 = $2 AND expires_at <= $3",
      [record.sessionId, record.payloadSha256, new Date(observedAtMs).toISOString()],
    );
    if (result.rowCount !== 1) throw new Error("D1_POSTGRES_SESSION_CAS_CONFLICT");
  }
}

class PostgresD1HubIntentShadowBoundary {
  constructor(private readonly db: D1Queryable) {}

  async list() {
    const result = await this.db.query(
      "SELECT scope_digest, revision, payload, payload_sha256 FROM enawuga.hub_workflow_intent ORDER BY scope_digest",
    );
    return result.rows.map(hubIntentRowToRecord);
  }

  async load(scopeDigest: string) {
    const result = await this.db.query(
      "SELECT scope_digest, revision, payload, payload_sha256 FROM enawuga.hub_workflow_intent WHERE scope_digest = $1",
      [scopeDigest],
    );
    return result.rowCount ? hubIntentRowToRecord(result.rows[0]) : undefined;
  }

  async create(source: D1HubIntentShadowSource) {
    const payload = buildD1HubIntentShadowPayload(source);
    const digest = d1CanonicalPayloadSha256(payload);
    const result = await this.db.query(
      "INSERT INTO enawuga.hub_workflow_intent (scope_digest, revision, payload, payload_sha256) " +
        "VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (scope_digest) DO NOTHING RETURNING scope_digest",
      [source.scopeDigest, source.revision, JSON.stringify(payload), digest],
    );
    if (result.rowCount !== 1) throw new Error("D1_POSTGRES_HUB_INTENT_CAS_CONFLICT");
  }

  async updateFromSource(
    record: D1HubIntentDatabaseRecord,
    source: D1HubIntentShadowSource,
  ) {
    const payload = buildD1HubIntentShadowPayload(source);
    const digest = d1CanonicalPayloadSha256(payload);
    const result = await this.db.query(
      "UPDATE enawuga.hub_workflow_intent SET revision = $2, payload = $3::jsonb, " +
        "payload_sha256 = $4, updated_at = now() WHERE scope_digest = $1 " +
        "AND revision = $5 AND payload_sha256 = $6 RETURNING scope_digest",
      [
        source.scopeDigest,
        source.revision,
        JSON.stringify(payload),
        digest,
        record.revision,
        record.payloadSha256,
      ],
    );
    if (result.rowCount !== 1) throw new Error("D1_POSTGRES_HUB_INTENT_CAS_CONFLICT");
  }

  async setShadowState(
    record: D1HubIntentDatabaseRecord,
    shadowState: z.infer<typeof ShadowStateSchema>,
  ) {
    const payload = HubIntentShadowPayloadSchema.parse({
      ...record.payload,
      shadowState,
    });
    const digest = d1CanonicalPayloadSha256(payload);
    const result = await this.db.query(
      "UPDATE enawuga.hub_workflow_intent SET payload = $2::jsonb, payload_sha256 = $3, updated_at = now() " +
        "WHERE scope_digest = $1 AND revision = $4 AND payload_sha256 = $5 RETURNING scope_digest",
      [record.scopeDigest, JSON.stringify(payload), digest, record.revision, record.payloadSha256],
    );
    if (result.rowCount !== 1) throw new Error("D1_POSTGRES_HUB_INTENT_CAS_CONFLICT");
  }
}

async function planInternal(
  db: D1Queryable,
  discovery: D1SessionIdempotencyDiscovery,
): Promise<D1SessionIdempotencyPlan> {
  const sessionBoundary = new PostgresD1SessionShadowBoundary(db);
  const hubBoundary = new PostgresD1HubIntentShadowBoundary(db);
  const databaseSessions = await sessionBoundary.list();
  const databaseHubIntents = await hubBoundary.list();
  const sessionMap = new Map(databaseSessions.map((record) => [record.sessionId, record]));
  const hubMap = new Map(databaseHubIntents.map((record) => [record.scopeDigest, record]));
  const sessions: D1SessionPlanItem[] = [];
  const hubIntents: D1HubIntentPlanItem[] = [];

  for (const source of discovery.sessions) {
    const existing = sessionMap.get(source.sessionId);
    sessionMap.delete(source.sessionId);
    if (source.sourceStatus === "EXPIRED") {
      if (!existing) {
        sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "EXPIRED_SOURCE_NOOP" });
      } else if (existing.payload.sourceKind !== "SYNTHETIC_FILESYSTEM") {
        sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "CONFLICT_POSTGRES_OWNED" });
      } else if (existing.payload.sourcePayloadSha256 !== source.sourcePayloadSha256) {
        sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "CONFLICT_IMMUTABLE_SESSION" });
      } else {
        sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "EXPIRE_DELETE_REQUIRED" });
      }
      continue;
    }

    if (!existing) {
      sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "CREATE_REQUIRED" });
    } else if (existing.payload.sourceKind !== "SYNTHETIC_FILESYSTEM") {
      sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "CONFLICT_POSTGRES_OWNED" });
    } else if (existing.payload.sourcePayloadSha256 !== source.sourcePayloadSha256) {
      sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "CONFLICT_IMMUTABLE_SESSION" });
    } else if (existing.payload.shadowState === "SOURCE_MISSING_REVIEW_REQUIRED") {
      sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "RESTORE_REQUIRED" });
    } else {
      sessions.push({ sessionId: source.sessionId, sourcePresent: true, status: "MATCHED" });
    }
  }

  for (const record of sessionMap.values()) {
    if (record.payload.sourceKind !== "SYNTHETIC_FILESYSTEM") {
      sessions.push({ sessionId: record.sessionId, sourcePresent: false, status: "CONFLICT_POSTGRES_OWNED" });
    } else if (record.expiresAtMs <= discovery.observedAtMs) {
      sessions.push({ sessionId: record.sessionId, sourcePresent: false, status: "EXPIRE_DELETE_REQUIRED" });
    } else if (record.payload.shadowState === "SOURCE_MISSING_REVIEW_REQUIRED") {
      sessions.push({ sessionId: record.sessionId, sourcePresent: false, status: "SOURCE_MISSING_REVIEW_REQUIRED" });
    } else {
      sessions.push({ sessionId: record.sessionId, sourcePresent: false, status: "SOURCE_MISSING_MARK_REQUIRED" });
    }
  }

  for (const source of discovery.hubIntents) {
    const existing = hubMap.get(source.scopeDigest);
    hubMap.delete(source.scopeDigest);
    if (!existing) {
      hubIntents.push({
        scopeDigest: source.scopeDigest,
        sourcePresent: true,
        sourceRevision: source.revision,
        databaseRevision: null,
        status: "CREATE_REQUIRED",
      });
    } else if (existing.payload.sourceKind !== "SYNTHETIC_FILESYSTEM") {
      hubIntents.push({
        scopeDigest: source.scopeDigest,
        sourcePresent: true,
        sourceRevision: source.revision,
        databaseRevision: existing.revision,
        status: "CONFLICT_POSTGRES_OWNED",
      });
    } else if (source.revision < existing.revision) {
      hubIntents.push({
        scopeDigest: source.scopeDigest,
        sourcePresent: true,
        sourceRevision: source.revision,
        databaseRevision: existing.revision,
        status: "CONFLICT_DATABASE_AHEAD",
      });
    } else if (source.revision === existing.revision) {
      const status: D1HubIntentPlanStatus =
        existing.payload.sourcePayloadSha256 !== source.sourcePayloadSha256
          ? "CONFLICT_SAME_REVISION_DIVERGENCE"
          : existing.payload.shadowState === "SOURCE_MISSING_REVIEW_REQUIRED"
            ? "RESTORE_REQUIRED"
            : "MATCHED";
      hubIntents.push({
        scopeDigest: source.scopeDigest,
        sourcePresent: true,
        sourceRevision: source.revision,
        databaseRevision: existing.revision,
        status,
      });
    } else {
      hubIntents.push({
        scopeDigest: source.scopeDigest,
        sourcePresent: true,
        sourceRevision: source.revision,
        databaseRevision: existing.revision,
        status: "UPDATE_REQUIRED",
      });
    }
  }

  for (const record of hubMap.values()) {
    hubIntents.push({
      scopeDigest: record.scopeDigest,
      sourcePresent: false,
      sourceRevision: null,
      databaseRevision: record.revision,
      status:
        record.payload.sourceKind !== "SYNTHETIC_FILESYSTEM"
          ? "CONFLICT_POSTGRES_OWNED"
          : record.payload.shadowState === "SOURCE_MISSING_REVIEW_REQUIRED"
            ? "SOURCE_MISSING_REVIEW_REQUIRED"
            : "SOURCE_MISSING_MARK_REQUIRED",
    });
  }

  const allStatuses = [...sessions.map((item) => item.status), ...hubIntents.map((item) => item.status)];
  const conflicts = allStatuses.filter((status) => status.startsWith("CONFLICT_")).length;
  const reviewRequired = allStatuses.filter(
    (status) => status.includes("SOURCE_MISSING") || status.startsWith("CONFLICT_"),
  ).length;
  const writesRequired = allStatuses.filter((status) =>
    [
      "CREATE_REQUIRED",
      "RESTORE_REQUIRED",
      "UPDATE_REQUIRED",
      "EXPIRE_DELETE_REQUIRED",
      "SOURCE_MISSING_MARK_REQUIRED",
    ].includes(status),
  ).length;

  return {
    authority: "SYNTHETIC_FILESYSTEM_PRIMARY",
    runtimeCutover: false,
    sessions: sessions.sort((a, b) => a.sessionId.localeCompare(b.sessionId)),
    hubIntents: hubIntents.sort((a, b) => a.scopeDigest.localeCompare(b.scopeDigest)),
    conflicts,
    reviewRequired,
    writesRequired,
  };
}

export function summarizeD1SessionIdempotencyPlan(plan: D1SessionIdempotencyPlan) {
  const count = <T extends { status: string }>(items: T[]) =>
    Object.fromEntries(
      [...new Set(items.map((item) => item.status))]
        .sort()
        .map((status) => [status, items.filter((item) => item.status === status).length]),
    );
  return {
    authority: plan.authority,
    runtimeCutover: plan.runtimeCutover,
    sessionCount: plan.sessions.length,
    sessionStatuses: count(plan.sessions),
    hubIntentCount: plan.hubIntents.length,
    hubIntentStatuses: count(plan.hubIntents),
    conflicts: plan.conflicts,
    reviewRequired: plan.reviewRequired,
    writesRequired: plan.writesRequired,
  };
}

export function planD1SessionIdempotencyShadow(
  pool: Pool,
  discovery: D1SessionIdempotencyDiscovery,
) {
  return planInternal(pool, discovery);
}

async function applyPlan(
  db: D1Queryable,
  discovery: D1SessionIdempotencyDiscovery,
  plan: D1SessionIdempotencyPlan,
) {
  const sessionBoundary = new PostgresD1SessionShadowBoundary(db);
  const hubBoundary = new PostgresD1HubIntentShadowBoundary(db);
  const sessionSources = new Map(discovery.sessions.map((source) => [source.sessionId, source]));
  const hubSources = new Map(discovery.hubIntents.map((source) => [source.scopeDigest, source]));
  let sessionWrites = 0;
  let hubIntentWrites = 0;

  for (const item of plan.sessions) {
    const source = sessionSources.get(item.sessionId);
    if (item.status === "CREATE_REQUIRED") {
      if (!source || source.sourceStatus !== "ACTIVE") throw new Error("D1_SESSION_SYNC_SOURCE_MISSING");
      await sessionBoundary.create(source);
      sessionWrites += 1;
    } else if (item.status === "RESTORE_REQUIRED") {
      const record = await sessionBoundary.load(item.sessionId);
      if (!record || !source) throw new Error("D1_SESSION_SYNC_SOURCE_MISSING");
      if (record.payload.sourcePayloadSha256 !== source.sourcePayloadSha256)
        throw new Error("D1_POSTGRES_SESSION_CAS_CONFLICT");
      await sessionBoundary.setShadowState(record, "PRESENT");
      sessionWrites += 1;
    } else if (item.status === "EXPIRE_DELETE_REQUIRED") {
      const record = await sessionBoundary.load(item.sessionId);
      if (!record) continue;
      if (record.payload.sourceKind !== "SYNTHETIC_FILESYSTEM")
        throw new Error("D1_SESSION_IDEMPOTENCY_SHADOW_CONFLICT_REVIEW_REQUIRED");
      await sessionBoundary.removeExpired(record, discovery.observedAtMs);
      sessionWrites += 1;
    } else if (item.status === "SOURCE_MISSING_MARK_REQUIRED") {
      const record = await sessionBoundary.load(item.sessionId);
      if (!record) throw new Error("D1_POSTGRES_SESSION_CAS_CONFLICT");
      await sessionBoundary.setShadowState(record, "SOURCE_MISSING_REVIEW_REQUIRED");
      sessionWrites += 1;
    }
  }

  for (const item of plan.hubIntents) {
    const source = hubSources.get(item.scopeDigest);
    if (item.status === "CREATE_REQUIRED") {
      if (!source) throw new Error("D1_HUB_INTENT_SYNC_SOURCE_MISSING");
      await hubBoundary.create(source);
      hubIntentWrites += 1;
    } else if (item.status === "UPDATE_REQUIRED") {
      const record = await hubBoundary.load(item.scopeDigest);
      if (!record || !source) throw new Error("D1_HUB_INTENT_SYNC_SOURCE_MISSING");
      await hubBoundary.updateFromSource(record, source);
      hubIntentWrites += 1;
    } else if (item.status === "RESTORE_REQUIRED") {
      const record = await hubBoundary.load(item.scopeDigest);
      if (!record || !source) throw new Error("D1_HUB_INTENT_SYNC_SOURCE_MISSING");
      if (record.payload.sourcePayloadSha256 !== source.sourcePayloadSha256)
        throw new Error("D1_POSTGRES_HUB_INTENT_CAS_CONFLICT");
      await hubBoundary.setShadowState(record, "PRESENT");
      hubIntentWrites += 1;
    } else if (item.status === "SOURCE_MISSING_MARK_REQUIRED") {
      const record = await hubBoundary.load(item.scopeDigest);
      if (!record) throw new Error("D1_POSTGRES_HUB_INTENT_CAS_CONFLICT");
      await hubBoundary.setShadowState(record, "SOURCE_MISSING_REVIEW_REQUIRED");
      hubIntentWrites += 1;
    }
  }

  return { sessionWrites, hubIntentWrites };
}

async function verifyInternal(
  db: D1Queryable,
  discovery: D1SessionIdempotencyDiscovery,
) {
  const plan = await planInternal(db, discovery);
  if (plan.conflicts > 0 || plan.writesRequired > 0)
    throw new Error("D1_SESSION_IDEMPOTENCY_SHADOW_VERIFICATION_MISMATCH");
  return {
    ...summarizeD1SessionIdempotencyPlan(plan),
    shadowParityComplete: plan.reviewRequired === 0,
  };
}

export function verifyD1SessionIdempotencyShadow(
  pool: Pool,
  discovery: D1SessionIdempotencyDiscovery,
) {
  return verifyInternal(pool, discovery);
}

export async function syncD1SessionIdempotencyShadow(
  pool: Pool,
  discovery: D1SessionIdempotencyDiscovery,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const plan = await planInternal(client, discovery);
    if (plan.conflicts > 0)
      throw new Error("D1_SESSION_IDEMPOTENCY_SHADOW_CONFLICT_REVIEW_REQUIRED");

    const writes = await applyPlan(client, discovery, plan);
    const refreshed = discoverD1SessionIdempotencyFilesystemState(
      discovery.stateDir,
      discovery.observedAtMs,
    );
    if (refreshed.fingerprint !== discovery.fingerprint)
      throw new Error("D1_SESSION_IDEMPOTENCY_SOURCE_CHANGED_DURING_SYNC");

    const verification = await verifyInternal(client, refreshed);
    await client.query("COMMIT");
    return {
      authority: "SYNTHETIC_FILESYSTEM_PRIMARY" as const,
      runtimeCutover: false as const,
      ...writes,
      verification,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
