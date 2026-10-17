import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Pool } from "pg";
import {
  HubWorkflowIntentCertificationStore,
  HubWorkflowIntentRequestSchema,
  type HubWorkflowIntentRequest,
} from "../src/domain/hubWorkflowIdempotencyCertification";
import {
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  type HubAccessContext,
} from "../src/domain/hub";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_OBJECT_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";
import { SyntheticAuthService } from "../src/server/auth";
import { AtomicDirectoryHubWorkflowIntentPersistence } from "../src/server/hub-idempotency-persistence";
import { AtomicDirectorySyntheticSessionPersistence } from "../src/server/session-persistence";
import { d1CanonicalPayloadSha256 } from "../src/server/postgres/d1-async-boundary";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import {
  discoverD1SessionIdempotencyFilesystemState,
  planD1SessionIdempotencyShadow,
  syncD1SessionIdempotencyShadow,
  verifyD1SessionIdempotencyShadow,
} from "../src/server/postgres/d1-session-idempotency-shadow";

const testUrl = process.env.D1_TEST_DATABASE_URL;

function alphaContext(): HubAccessContext {
  return {
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: "AGENT",
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    assignedHubIds: [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  };
}

function request(overrides: Partial<HubWorkflowIntentRequest> = {}) {
  return HubWorkflowIntentRequestSchema.parse({
    schemaVersion: 1,
    capturedAt: "2026-10-16T10:00:00+03:00",
    expiresAt: "2026-10-16T11:00:00+03:00",
    correlationId: "corr_syn_d1_phase1d_001",
    runId: "run_syn_d1_phase1d_001",
    idempotencyKey: "idem_syn_d1_phase1d_001",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
    purpose: "HUB_OPERATE",
    facts: {
      intentClass: "SYNTHETIC_FINANCIAL_INTENT",
      objectRef: SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER,
      amountMinor: 1250,
      currency: "ETB",
      variant: "BASELINE",
    },
    ...overrides,
  });
}

function createState() {
  const stateDir = mkdtempSync(path.join(os.tmpdir(), "enawuga-d1-phase1d-"));
  const sessionPersistence = new AtomicDirectorySyntheticSessionPersistence(
    path.join(stateDir, "sessions"),
  );
  const auth = new SyntheticAuthService(
    { sessionTtlMs: 60 * 60_000, cleanupIntervalMs: 0 },
    undefined,
    sessionPersistence,
  );
  const session = auth.createSession("AGENT", [SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER]);
  auth.dispose();

  const hubPersistence = new AtomicDirectoryHubWorkflowIntentPersistence(
    path.join(stateDir, "hub-idempotency"),
  );
  const store = new HubWorkflowIntentCertificationStore(undefined, hubPersistence);
  assert.equal(store.reserve(request(), alphaContext()).decision, "RESERVED_NEW");
  return { stateDir, session, hubPersistence, store };
}

function sessionFile(stateDir: string, sessionId: string) {
  return path.join(stateDir, "sessions", `${sessionId}.json`);
}

function hubFile(stateDir: string) {
  const directory = path.join(stateDir, "hub-idempotency");
  const [name] = readdirSync(directory).filter((entry) => entry.endsWith(".json"));
  assert.ok(name);
  return path.join(directory, name);
}

test("D1 Phase 1D discovery preserves per-record session and Hub idempotency semantics", () => {
  const { stateDir, session } = createState();
  try {
    const observedAtMs = Date.now();
    const first = discoverD1SessionIdempotencyFilesystemState(stateDir, observedAtMs);
    const second = discoverD1SessionIdempotencyFilesystemState(stateDir, observedAtMs);
    assert.equal(first.sessions.length, 1);
    assert.equal(first.sessions[0]?.sessionId, session.sessionId);
    assert.equal(first.sessions[0]?.sourceStatus, "ACTIVE");
    assert.equal(first.hubIntents.length, 1);
    assert.equal(first.hubIntents[0]?.revision, 1);
    assert.match(first.hubIntents[0]?.scopeDigest ?? "", /^[0-9a-f]{64}$/);
    assert.match(first.fingerprint, /^[0-9a-f]{64}$/);
    assert.equal(first.fingerprint, second.fingerprint);
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("D1 Phase 1D discovery classifies an expired session without reviving it", () => {
  const { stateDir, session } = createState();
  try {
    const discovery = discoverD1SessionIdempotencyFilesystemState(
      stateDir,
      session.expiresAtMs + 1,
    );
    assert.equal(discovery.sessions[0]?.sourceStatus, "EXPIRED");
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("D1 Phase 1D discovery fails closed when a session envelope disagrees with its stored value", () => {
  const { stateDir, session } = createState();
  try {
    const file = sessionFile(stateDir, session.sessionId);
    const envelope = JSON.parse(readFileSync(file, "utf8"));
    envelope.expiresAtMs += 1;
    writeFileSync(file, JSON.stringify(envelope), "utf8");
    assert.throws(
      () => discoverD1SessionIdempotencyFilesystemState(stateDir, Date.now()),
      /session envelope expiry must match stored session/i,
    );
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("D1 Phase 1D discovery verifies Hub scope against both file identity and reservation scope", () => {
  const { stateDir } = createState();
  try {
    const file = hubFile(stateDir);
    const directory = path.dirname(file);
    const envelope = JSON.parse(readFileSync(file, "utf8"));
    envelope.scope = `${envelope.scope}|tampered`;
    const renamed = path.join(
      directory,
      `${createHash("sha256").update(envelope.scope, "utf8").digest("hex")}.json`,
    );
    writeFileSync(file, JSON.stringify(envelope), "utf8");
    renameSync(file, renamed);
    assert.throws(
      () => discoverD1SessionIdempotencyFilesystemState(stateDir, Date.now()),
      /hub idempotency scope must match reservation scope/i,
    );
  } finally {
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test(
  "D1 Phase 1D synchronizes session and Hub idempotency shadows without reviving missing or expired state",
  { skip: !testUrl },
  async () => {
    assert.ok(testUrl);
    const parsed = new URL(testUrl);
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(parsed.hostname));
    assert.equal(parsed.pathname, "/enawuga_d1_test");

    const pool = new Pool({
      connectionString: testUrl,
      application_name: "enawuga-d1-phase1d-ci",
      max: 3,
    });
    const { stateDir, session, store } = createState();

    try {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE");
      await applyD1FoundationMigration(pool);

      let discovery = discoverD1SessionIdempotencyFilesystemState(stateDir, Date.now());
      let plan = await planD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(plan.conflicts, 0);
      assert.equal(plan.writesRequired, 2);
      assert.equal(plan.sessions[0]?.status, "CREATE_REQUIRED");
      assert.equal(plan.hubIntents[0]?.status, "CREATE_REQUIRED");

      const first = await syncD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(first.sessionWrites, 1);
      assert.equal(first.hubIntentWrites, 1);
      assert.equal(first.verification.shadowParityComplete, true);

      const verified = await verifyD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(verified.shadowParityComplete, true);
      assert.equal(verified.writesRequired, 0);

      store.markPossibleExternalMutation({
        request: request(),
        context: alphaContext(),
        markedAt: "2026-10-16T10:05:00+03:00",
      });
      discovery = discoverD1SessionIdempotencyFilesystemState(stateDir, Date.now());
      plan = await planD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(plan.hubIntents[0]?.sourceRevision, 2);
      assert.equal(plan.hubIntents[0]?.databaseRevision, 1);
      assert.equal(plan.hubIntents[0]?.status, "UPDATE_REQUIRED");

      const updated = await syncD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(updated.hubIntentWrites, 1);
      const revision = await pool.query(
        "SELECT revision FROM enawuga.hub_workflow_intent LIMIT 1",
      );
      assert.equal(Number(revision.rows[0]?.revision), 2);

      const file = sessionFile(stateDir, session.sessionId);
      const originalSessionEnvelope = readFileSync(file, "utf8");
      unlinkSync(file);
      discovery = discoverD1SessionIdempotencyFilesystemState(stateDir, Date.now());
      plan = await planD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(plan.sessions[0]?.status, "SOURCE_MISSING_MARK_REQUIRED");

      const missing = await syncD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(missing.sessionWrites, 1);
      assert.equal(missing.verification.shadowParityComplete, false);
      const retained = await pool.query(
        "SELECT count(*)::int AS count FROM enawuga.session_state WHERE session_id = $1",
        [session.sessionId],
      );
      assert.equal(retained.rows[0]?.count, 1);

      writeFileSync(file, originalSessionEnvelope, "utf8");
      discovery = discoverD1SessionIdempotencyFilesystemState(stateDir, Date.now());
      plan = await planD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(plan.sessions[0]?.status, "RESTORE_REQUIRED");
      const restored = await syncD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(restored.verification.shadowParityComplete, true);

      discovery = discoverD1SessionIdempotencyFilesystemState(
        stateDir,
        session.expiresAtMs + 1,
      );
      plan = await planD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(plan.sessions[0]?.status, "EXPIRE_DELETE_REQUIRED");
      const expired = await syncD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(expired.sessionWrites, 1);
      const remaining = await pool.query(
        "SELECT count(*)::int AS count FROM enawuga.session_state WHERE session_id = $1",
        [session.sessionId],
      );
      assert.equal(remaining.rows[0]?.count, 0);
    } finally {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE").catch(() => undefined);
      await pool.end();
      rmSync(stateDir, { recursive: true, force: true });
    }
  },
);

test(
  "D1 Phase 1D rejects PostgreSQL-owned or digest-inconsistent session shadow divergence",
  { skip: !testUrl },
  async () => {
    assert.ok(testUrl);
    const pool = new Pool({
      connectionString: testUrl,
      application_name: "enawuga-d1-phase1d-conflict-ci",
      max: 3,
    });
    const { stateDir, session } = createState();

    try {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE");
      await applyD1FoundationMigration(pool);
      const discovery = discoverD1SessionIdempotencyFilesystemState(stateDir, Date.now());
      await syncD1SessionIdempotencyShadow(pool, discovery);

      const row = await pool.query(
        "SELECT payload FROM enawuga.session_state WHERE session_id = $1",
        [session.sessionId],
      );
      const postgresOwned = structuredClone(row.rows[0]?.payload);
      postgresOwned.sourceKind = "SYNTHETIC_POSTGRES";
      await pool.query(
        "UPDATE enawuga.session_state SET payload = $2::jsonb, payload_sha256 = $3 WHERE session_id = $1",
        [
          session.sessionId,
          JSON.stringify(postgresOwned),
          d1CanonicalPayloadSha256(postgresOwned),
        ],
      );

      let plan = await planD1SessionIdempotencyShadow(pool, discovery);
      assert.equal(plan.conflicts, 1);
      assert.equal(plan.sessions[0]?.status, "CONFLICT_POSTGRES_OWNED");
      await assert.rejects(
        syncD1SessionIdempotencyShadow(pool, discovery),
        /D1_SESSION_IDEMPOTENCY_SHADOW_CONFLICT_REVIEW_REQUIRED/,
      );

      const filesystemOwned = structuredClone(postgresOwned);
      filesystemOwned.sourceKind = "SYNTHETIC_FILESYSTEM";
      filesystemOwned.value.role = "SUPERVISOR";
      await pool.query(
        "UPDATE enawuga.session_state SET payload = $2::jsonb, payload_sha256 = $3 WHERE session_id = $1",
        [
          session.sessionId,
          JSON.stringify(filesystemOwned),
          d1CanonicalPayloadSha256(filesystemOwned),
        ],
      );
      await assert.rejects(
        planD1SessionIdempotencyShadow(pool, discovery),
        /D1_POSTGRES_SESSION_SOURCE_DIGEST_MISMATCH/,
      );
    } finally {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE").catch(() => undefined);
      await pool.end();
      rmSync(stateDir, { recursive: true, force: true });
    }
  },
);
