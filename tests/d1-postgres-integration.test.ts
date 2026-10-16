import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import {
  applyD1FoundationMigration,
  verifyD1Foundation,
} from "../src/server/postgres/d1-migration";

const testUrl = process.env.D1_TEST_DATABASE_URL;
const p1 = String.fromCharCode(36) + "1";
const p2 = String.fromCharCode(36) + "2";

test(
  "D1 migration applies idempotently on PostgreSQL and append-only tables reject mutation",
  { skip: !testUrl },
  async () => {
    assert.ok(testUrl);
    const parsed = new URL(testUrl);
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(parsed.hostname));
    assert.equal(parsed.pathname, "/enawuga_d1_test");

    const pool = new Pool({
      connectionString: testUrl,
      application_name: "enawuga-d1-ci",
      max: 2,
    });

    try {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE");

      const first = await applyD1FoundationMigration(pool);
      const second = await applyD1FoundationMigration(pool);
      assert.equal(first.applied, true);
      assert.equal(second.applied, false);
      assert.equal(first.checksum, second.checksum);

      const tables = await verifyD1Foundation(pool);
      for (const table of [
        "audit_event",
        "d1_schema_migrations",
        "dead_letter_entry",
        "evidence_record",
        "external_reference",
        "hub_workflow_intent",
        "persistence_snapshot",
        "session_state",
        "transactional_outbox",
      ]) {
        assert.ok(tables.includes(table), table);
      }

      const payload = JSON.stringify({ synthetic: true, event: "D1_TEST" });
      const digest = createHash("sha256").update(payload).digest("hex");
      await pool.query(
        "INSERT INTO enawuga.audit_event (event_digest, payload) VALUES (" +
          p1 +
          ", " +
          p2 +
          "::jsonb)",
        [digest, payload],
      );

      await assert.rejects(
        pool.query(
          "UPDATE enawuga.audit_event SET payload = " +
            p1 +
            "::jsonb WHERE event_digest = " +
            p2,
          [JSON.stringify({ synthetic: true, changed: true }), digest],
        ),
        /APPEND_ONLY_MUTATION_FORBIDDEN/,
      );

      await assert.rejects(
        pool.query(
          "DELETE FROM enawuga.audit_event WHERE event_digest = " + p1,
          [digest],
        ),
        /APPEND_ONLY_MUTATION_FORBIDDEN/,
      );
    } finally {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE").catch(() => undefined);
      await pool.end();
    }
  },
);
