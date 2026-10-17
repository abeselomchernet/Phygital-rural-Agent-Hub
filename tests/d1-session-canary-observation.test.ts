import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Pool } from "pg";
import { SyntheticAuthService } from "../src/server/auth";
import { AtomicDirectorySyntheticSessionPersistence } from "../src/server/session-persistence";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import {
  discoverD1SessionIdempotencyFilesystemState,
  syncD1SessionIdempotencyShadow,
} from "../src/server/postgres/d1-session-idempotency-shadow";
import {
  D1SessionCanaryObservationSchema,
  appendD1SessionCanaryObservation,
  buildD1SessionCanaryObservation,
  loadD1SessionCanaryObservations,
  summarizeD1SessionCanaryObservationHistory,
  type D1SessionCanaryObservation,
} from "../src/server/postgres/d1-session-canary-observation";

const testUrl = process.env.D1_TEST_DATABASE_URL;

function observation(
  observedAt: string,
  clean = true,
): D1SessionCanaryObservation {
  return D1SessionCanaryObservationSchema.parse({
    schemaVersion: 1,
    evidenceType: "D1_SESSION_CANARY_PARITY_OBSERVATION",
    observedAt,
    sourceFingerprint: "a".repeat(64),
    authority: "SYNTHETIC_FILESYSTEM_PRIMARY",
    readCanaryMode: "POSTGRES_SHADOW_CANARY",
    runtimeActivationProvenByThisRecord: false,
    sessionCount: 1,
    sessionStatuses: {
      MATCHED: clean ? 1 : 0,
      EXPIRED_SOURCE_NOOP: 0,
      CREATE_REQUIRED: clean ? 0 : 1,
      RESTORE_REQUIRED: 0,
      EXPIRE_DELETE_REQUIRED: 0,
      SOURCE_MISSING_MARK_REQUIRED: 0,
      SOURCE_MISSING_REVIEW_REQUIRED: 0,
      CONFLICT_IMMUTABLE_SESSION: 0,
      CONFLICT_POSTGRES_OWNED: 0,
    },
    sessionConflicts: 0,
    sessionReviewRequired: 0,
    sessionWritesRequired: clean ? 0 : 1,
    recordedSampleClean: clean,
    cutoverAuthorized: false,
    limitations: [
      "POINT_IN_TIME_SAMPLE_ONLY",
      "DOES_NOT_PROVE_CONTINUOUS_CANARY_UPTIME",
      "DOES_NOT_AUTHORIZE_POSTGRES_PRIMARY",
    ],
  });
}

test("D1 Phase 1F observation history records the 14-day architecture span without self-authorizing cutover", () => {
  const report = summarizeD1SessionCanaryObservationHistory([
    observation("2026-10-01T00:00:00.000Z"),
    observation("2026-10-15T00:00:00.000Z"),
  ]);

  assert.equal(report.observationCount, 2);
  assert.equal(report.cleanSampleCount, 2);
  assert.equal(report.uncleanSampleCount, 0);
  assert.equal(report.observedSpanDays, 14);
  assert.equal(report.architectureMinimumSpanDays, 14);
  assert.equal(report.architectureMinimumSpanObserved, true);
  assert.equal(report.allRecordedSamplesClean, true);
  assert.equal(report.continuousCanaryUptimeProven, false);
  assert.equal(report.postgresPrimaryCutoverAuthorized, false);
  assert.equal(report.nextGate, "MANUAL_STAGING_EVIDENCE_REVIEW_REQUIRED");
});

test("D1 Phase 1F observation history keeps an unclean sample explicit even after enough calendar span", () => {
  const report = summarizeD1SessionCanaryObservationHistory([
    observation("2026-10-01T00:00:00.000Z"),
    observation("2026-10-08T00:00:00.000Z", false),
    observation("2026-10-15T00:00:00.000Z"),
  ]);

  assert.equal(report.architectureMinimumSpanObserved, true);
  assert.equal(report.cleanSampleCount, 2);
  assert.equal(report.uncleanSampleCount, 1);
  assert.equal(report.allRecordedSamplesClean, false);
  assert.equal(report.postgresPrimaryCutoverAuthorized, false);
});

test("D1 Phase 1F refuses to turn one point-in-time sample into duration evidence", () => {
  const report = summarizeD1SessionCanaryObservationHistory([
    observation("2026-10-15T00:00:00.000Z"),
  ]);
  assert.equal(report.observationCount, 1);
  assert.equal(report.observedSpanDays, 0);
  assert.equal(report.architectureMinimumSpanObserved, false);
  assert.equal(report.continuousCanaryUptimeProven, false);
  assert.equal(report.postgresPrimaryCutoverAuthorized, false);
});

test(
  "D1 Phase 1F records digest-verified point-in-time parity evidence on real PostgreSQL without granting cutover",
  { skip: !testUrl },
  async () => {
    assert.ok(testUrl);
    const parsed = new URL(testUrl);
    assert.equal(parsed.pathname, "/enawuga_d1_test");
    const pool = new Pool({
      connectionString: testUrl,
      application_name: "enawuga-d1-session-canary-observation-ci",
      max: 3,
    });
    const stateDir = mkdtempSync(path.join(os.tmpdir(), "enawuga-d1-observe-"));
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
      auth.createSession("AGENT", []);
      const discovery = discoverD1SessionIdempotencyFilesystemState(stateDir);
      await syncD1SessionIdempotencyShadow(pool, discovery);

      const recordedAt = new Date();
      const first = await buildD1SessionCanaryObservation({
        pool,
        stateDir,
        observedAt: recordedAt,
      });
      assert.equal(first.sessionCount, 1);
      assert.equal(first.sessionStatuses.MATCHED, 1);
      assert.equal(first.recordedSampleClean, true);
      assert.equal(first.runtimeActivationProvenByThisRecord, false);
      assert.equal(first.cutoverAuthorized, false);

      const appended = await appendD1SessionCanaryObservation(pool, first);
      assert.equal(appended.inserted, true);
      assert.match(appended.digest, /^[0-9a-f]{64}$/);
      const duplicate = await appendD1SessionCanaryObservation(pool, first);
      assert.equal(duplicate.inserted, false);
      assert.equal(duplicate.digest, appended.digest);

      const loaded = await loadD1SessionCanaryObservations(pool);
      assert.equal(loaded.length, 1);
      assert.deepEqual(loaded[0], first);
      const report = summarizeD1SessionCanaryObservationHistory(loaded);
      assert.equal(report.observationCount, 1);
      assert.equal(report.cleanSampleCount, 1);
      assert.equal(report.architectureMinimumSpanObserved, false);
      assert.equal(report.continuousCanaryUptimeProven, false);
      assert.equal(report.postgresPrimaryCutoverAuthorized, false);

      await assert.rejects(
        pool.query(
          "UPDATE enawuga.evidence_record SET payload = $1::jsonb WHERE evidence_digest = $2",
          [JSON.stringify({ changed: true }), appended.digest],
        ),
        /APPEND_ONLY_MUTATION_FORBIDDEN/,
      );
    } finally {
      auth.dispose();
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE").catch(() => undefined);
      await pool.end();
      rmSync(stateDir, { recursive: true, force: true });
    }
  },
);
