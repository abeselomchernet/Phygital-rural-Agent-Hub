import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Pool } from "pg";
import { createApp } from "../src/server/app";
import {
  StoredSessionSchema,
  SyntheticAuthService,
  type StoredSession,
} from "../src/server/auth";
import { AtomicDirectorySyntheticSessionPersistence } from "../src/server/session-persistence";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import {
  discoverD1SessionIdempotencyFilesystemState,
  syncD1SessionIdempotencyShadow,
} from "../src/server/postgres/d1-session-idempotency-shadow";
import {
  loadD1SessionRuntimeReadConfig,
  PostgresD1SessionRuntimeReadCutover,
  type D1SessionRuntimeReadCutover,
} from "../src/server/postgres/d1-session-read-cutover";

const testUrl = process.env.D1_TEST_DATABASE_URL;

function localSyntheticEnv() {
  return {
    DATA_MODE: "synthetic",
    ALLOW_EXTERNAL_TELEMETRY: "false",
    D1_POSTGRES_ENABLED: "true",
    D1_POSTGRES_MODE: "local-synthetic",
    D1_POSTGRES_URL:
      "postgresql://postgres:local-only@127.0.0.1:5432/enawuga_d1",
    SYNTHETIC_STATE_DIR: "/tmp/enawuga-d1-session-canary",
    REQUIRE_DURABLE_SESSION_STORE: "true",
  };
}

test("D1 Phase 1E session runtime read cutover is filesystem-primary by default and explicitly gated", () => {
  assert.deepEqual(
    loadD1SessionRuntimeReadConfig({
      DATA_MODE: "synthetic",
      ALLOW_EXTERNAL_TELEMETRY: "false",
    }),
    { enabled: false, mode: "filesystem-primary" },
  );

  assert.throws(
    () =>
      loadD1SessionRuntimeReadConfig({
        ...localSyntheticEnv(),
        D1_SESSION_RUNTIME_READ_MODE: "postgres-shadow-canary",
      }),
    /D1_SESSION_RUNTIME_READ_ACK_REQUIRED/,
  );

  const config = loadD1SessionRuntimeReadConfig({
    ...localSyntheticEnv(),
    D1_SESSION_RUNTIME_READ_MODE: "postgres-shadow-canary",
    D1_SESSION_RUNTIME_READ_ACK: "synthetic-only",
  });
  assert.equal(config.enabled, true);
  if (!config.enabled) return;
  assert.equal(config.mode, "postgres-shadow-canary");
  assert.equal(config.applicationName, "enawuga-d1-session-read-cutover");
});

test("D1 Phase 1E cutover config refuses non-durable or non-local activation", () => {
  assert.throws(
    () =>
      loadD1SessionRuntimeReadConfig({
        ...localSyntheticEnv(),
        REQUIRE_DURABLE_SESSION_STORE: "false",
        D1_SESSION_RUNTIME_READ_MODE: "postgres-shadow-canary",
        D1_SESSION_RUNTIME_READ_ACK: "synthetic-only",
      }),
    /D1_SESSION_RUNTIME_DURABLE_STORE_REQUIRED/,
  );
  assert.throws(
    () =>
      loadD1SessionRuntimeReadConfig({
        ...localSyntheticEnv(),
        D1_POSTGRES_URL: "postgresql://db.internal/enawuga",
        D1_SESSION_RUNTIME_READ_MODE: "postgres-shadow-canary",
        D1_SESSION_RUNTIME_READ_ACK: "synthetic-only",
      }),
    /D1_POSTGRES_NONLOCAL_NOT_AUTHORIZED/,
  );
});

class FakeSessionReadCutover implements D1SessionRuntimeReadCutover {
  readonly mode = "POSTGRES_SHADOW_CANARY" as const;
  readonly records = new Map<string, StoredSession>();
  failPublish = false;
  failRead = false;
  reads = 0;

  async preflight() {}

  async publishCreatedSession(session: StoredSession) {
    if (this.failPublish) throw new Error("FAKE_PUBLISH_FAILURE");
    const parsed = StoredSessionSchema.parse(session);
    this.records.set(parsed.sessionId, structuredClone(parsed));
  }

  async readVerifiedSession(sessionId: string) {
    this.reads += 1;
    if (this.failRead) throw new Error("FAKE_READ_FAILURE");
    const record = this.records.get(sessionId);
    if (!record) throw new Error("FAKE_SESSION_MISSING");
    return structuredClone(record);
  }

  async removeRevokedSessionShadow(sessionId: string) {
    this.records.delete(sessionId);
  }

  async close() {}
}

async function closeServer(server: ReturnType<ReturnType<typeof createApp>["listen"]>) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

test("D1 Phase 1E HTTP canary publishes new sessions, uses verified reads, and cannot revive logout", async () => {
  const stateDir = mkdtempSync(path.join(os.tmpdir(), "enawuga-d1-cutover-api-"));
  const persistence = new AtomicDirectorySyntheticSessionPersistence(
    path.join(stateDir, "sessions"),
  );
  const cutover = new FakeSessionReadCutover();
  const server = createApp({
    sessionPersistence: persistence,
    sessionCleanupIntervalMs: 0,
    sessionRuntimeReadCutover: cutover,
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    const start = await fetch(`${base}/api/demo/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "AGENT" }),
    });
    assert.equal(start.status, 200);
    const started = await start.json();
    const cookie = start.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    assert.equal(cutover.records.size, 1);

    const sessionResponse = await fetch(`${base}/api/demo/session`, {
      headers: { Cookie: cookie },
    });
    assert.equal(sessionResponse.status, 200);
    assert.ok(cutover.reads > 0);

    cutover.failRead = true;
    const failedCanary = await fetch(`${base}/api/demo/session`, {
      headers: { Cookie: cookie },
    });
    assert.equal(failedCanary.status, 503);
    assert.deepEqual(await failedCanary.json(), {
      error: "SESSION_RUNTIME_READ_CUTOVER_UNAVAILABLE",
    });

    cutover.failRead = false;
    const logout = await fetch(`${base}/api/demo/session/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": started.csrfToken,
      },
      body: "{}",
    });
    assert.equal(logout.status, 200);
    const logoutBody = await logout.json();
    assert.equal(logoutBody.loggedOut, true);
    assert.equal(logoutBody.sessionShadowCleanup, "REMOVED");
    assert.equal(cutover.records.size, 0);

    const afterLogout = await fetch(`${base}/api/demo/session`, {
      headers: { Cookie: cookie },
    });
    assert.equal(afterLogout.status, 401);
  } finally {
    await closeServer(server);
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("D1 Phase 1E session creation rolls back filesystem state when PostgreSQL canary publish fails", async () => {
  const stateDir = mkdtempSync(path.join(os.tmpdir(), "enawuga-d1-cutover-fail-"));
  const sessionsDir = path.join(stateDir, "sessions");
  const cutover = new FakeSessionReadCutover();
  cutover.failPublish = true;
  const server = createApp({
    sessionPersistence: new AtomicDirectorySyntheticSessionPersistence(sessionsDir),
    sessionCleanupIntervalMs: 0,
    sessionRuntimeReadCutover: cutover,
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    const response = await fetch(`${base}/api/demo/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "AGENT" }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "SESSION_RUNTIME_READ_CUTOVER_UNAVAILABLE",
    });
    assert.equal(
      readdirSync(sessionsDir).filter((name) => name.endsWith(".json")).length,
      0,
    );
  } finally {
    await closeServer(server);
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test(
  "D1 Phase 1E PostgreSQL canary survives restart, preserves filesystem revocation guard, and supports targeted create/revoke",
  { skip: !testUrl },
  async () => {
    assert.ok(testUrl);
    const parsed = new URL(testUrl);
    assert.equal(parsed.pathname, "/enawuga_d1_test");
    const pool = new Pool({
      connectionString: testUrl,
      application_name: "enawuga-d1-session-cutover-ci",
      max: 4,
    });
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "enawuga-d1-cutover-pg-"));
    const persistence = new AtomicDirectorySyntheticSessionPersistence(
      path.join(stateDir, "sessions"),
    );
    const auth = new SyntheticAuthService(
      { sessionTtlMs: 600_000, cleanupIntervalMs: 0 },
      undefined,
      persistence,
    );

    try {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE");
      await applyD1FoundationMigration(pool);
      const first = auth.createSession("AGENT", []);
      const discovery = discoverD1SessionIdempotencyFilesystemState(stateDir);
      await syncD1SessionIdempotencyShadow(pool, discovery);

      const cutover = new PostgresD1SessionRuntimeReadCutover(pool, stateDir);
      await cutover.preflight();
      assert.equal((await cutover.readVerifiedSession(first.sessionId)).sessionId, first.sessionId);

      const restarted = new PostgresD1SessionRuntimeReadCutover(pool, stateDir);
      await restarted.preflight();
      assert.equal((await restarted.readVerifiedSession(first.sessionId)).csrfToken, first.csrfToken);

      const second = auth.createSession("AGENT", []);
      await restarted.publishCreatedSession(second);
      assert.equal((await restarted.readVerifiedSession(second.sessionId)).sessionId, second.sessionId);
      auth.revoke(second);
      await restarted.removeRevokedSessionShadow(second.sessionId);
      assert.equal(
        Number(
          (await pool.query(
            "SELECT count(*)::int AS count FROM enawuga.session_state WHERE session_id = $1",
            [second.sessionId],
          )).rows[0]?.count ?? 0,
        ),
        0,
      );

      persistence.remove(first.sessionId);
      await assert.rejects(
        restarted.readVerifiedSession(first.sessionId),
        /D1_SESSION_RUNTIME_FILESYSTEM_GUARD_MISSING/,
      );
      await assert.rejects(
        restarted.preflight(),
        /D1_SESSION_RUNTIME_PREFLIGHT_REVIEW_REQUIRED:SOURCE_MISSING_MARK_REQUIRED/,
      );
    } finally {
      auth.dispose();
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE").catch(() => undefined);
      await pool.end();
      rmSync(stateDir, { recursive: true, force: true });
    }
  },
);
