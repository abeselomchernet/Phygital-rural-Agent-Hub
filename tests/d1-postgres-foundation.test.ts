import assert from "node:assert/strict";
import test from "node:test";
import { loadD1PostgresFoundationConfig } from "../src/server/postgres/d1-config";
import {
  D1_STORAGE_CLASSES,
  D1_STORAGE_CLASS_TARGETS,
} from "../src/server/postgres/d1-storage-classification";
import {
  D1_FOUNDATION_MIGRATION_ID,
  d1FoundationMigrationChecksum,
  readD1FoundationMigrationSql,
} from "../src/server/postgres/d1-migration";

test("D1 PostgreSQL foundation is disabled by default and preserves synthetic mode", () => {
  assert.deepEqual(
    loadD1PostgresFoundationConfig({
      DATA_MODE: "synthetic",
      ALLOW_EXTERNAL_TELEMETRY: "false",
    }),
    { enabled: false },
  );
});

test("D1 PostgreSQL foundation fails closed for regulated or non-local activation", () => {
  assert.throws(
    () =>
      loadD1PostgresFoundationConfig({
        DATA_MODE: "regulated",
        REGULATED_DATA_RESIDENCY: "ET",
        ALLOW_EXTERNAL_TELEMETRY: "false",
        D1_POSTGRES_ENABLED: "true",
        D1_POSTGRES_MODE: "local-synthetic",
        D1_POSTGRES_URL: "postgresql://example.invalid/enawuga",
      }),
    /REGULATED_MODE_UNSUPPORTED_PENDING_APPROVED_ET_INFRASTRUCTURE/,
  );

  assert.throws(
    () =>
      loadD1PostgresFoundationConfig({
        DATA_MODE: "synthetic",
        ALLOW_EXTERNAL_TELEMETRY: "false",
        D1_POSTGRES_ENABLED: "true",
        D1_POSTGRES_MODE: "local-synthetic",
        D1_POSTGRES_URL: "postgresql://db.internal/enawuga",
      }),
    /D1_POSTGRES_NONLOCAL_NOT_AUTHORIZED/,
  );
});

test("D1 PostgreSQL foundation accepts only explicit local synthetic configuration", () => {
  const config = loadD1PostgresFoundationConfig({
    DATA_MODE: "synthetic",
    ALLOW_EXTERNAL_TELEMETRY: "false",
    D1_POSTGRES_ENABLED: "true",
    D1_POSTGRES_MODE: "local-synthetic",
    D1_POSTGRES_URL: "postgresql://postgres:local-only@127.0.0.1:5432/enawuga_d1",
  });

  assert.equal(config.enabled, true);
  if (!config.enabled) return;
  assert.equal(config.mode, "local-synthetic");
  assert.equal(config.applicationName, "enawuga-d1-foundation");
});

test("D1 storage classification preserves all nine governed classes", () => {
  assert.deepEqual(D1_STORAGE_CLASSES, [
    "TRANSACTIONAL_STATE",
    "APPEND_ONLY_EVIDENCE",
    "AUDIT_EVENT",
    "EPHEMERAL_CACHE",
    "OFFLINE_EDGE_STATE",
    "DERIVED_PROJECTION",
    "CONFIGURATION",
    "CONTENT_BUNDLE",
    "EXTERNAL_REFERENCE",
  ]);
  assert.equal(D1_STORAGE_CLASS_TARGETS.AUDIT_EVENT, "postgresql-append-only");
  assert.equal(D1_STORAGE_CLASS_TARGETS.OFFLINE_EDGE_STATE, "edge-local");
});

test("D1 schema migration is deterministic, append-only aware, and retention-neutral", () => {
  const sql = readD1FoundationMigrationSql();
  const checksum = d1FoundationMigrationChecksum(sql);

  assert.equal(D1_FOUNDATION_MIGRATION_ID, "001_persistence_foundation");
  assert.match(checksum, /^[0-9a-f]{64}$/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS enawuga\.audit_event/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS enawuga\.evidence_record/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS enawuga\.external_reference/);
  assert.match(sql, /APPEND_ONLY_MUTATION_FORBIDDEN/);
  assert.doesNotMatch(sql, /7 years|10 years|ten years|seven years/i);
  assert.doesNotMatch(sql, /settlement_authority|regulatedModeAllowed\s*=\s*true/i);
});
