import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Pool } from "pg";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import { PostgresD1AsyncSnapshotBoundary } from "../src/server/postgres/d1-async-boundary";
import {
  discoverD1SyntheticFilesystemState,
  migrateD1SyntheticFilesystemShadow,
  rollbackD1SyntheticFilesystemShadow,
  verifyD1SyntheticFilesystemShadow,
} from "../src/server/postgres/d1-shadow-migration";

const testUrl = process.env.D1_TEST_DATABASE_URL;

function writeJson(directory: string, name: string, value: unknown) {
  writeFileSync(path.join(directory, name), `${JSON.stringify(value)}\n`, "utf8");
}

function buildSyntheticState(directory: string) {
  writeJson(directory, "customers.json", { version: 1, customers: [], audit: [] });
  writeJson(directory, "partner-ledger.json", {
    version: 1,
    balances: {},
    results: [],
    transactionKeys: [],
  });
  writeJson(directory, "mock-identity-provider.json", { version: 1, requests: [] });
  writeJson(directory, "kyc-pending.json", { version: 1, pending: [] });
  writeJson(directory, "payment-gateway.json", { version: 1, records: [] });
  writeJson(directory, "payment-gateway-reconciliation.json", {
    version: 1,
    records: [],
  });
  writeJson(directory, "audit.json", {
    version: 1,
    events: [
      {
        eventId: "00000000-0000-4000-8000-000000000001",
        at: "2026-10-17T00:00:00.000Z",
        category: "AUTH",
        action: "SESSION_CREATED",
        outcome: "SUCCESS",
        actor: { userId: "system", role: "SYSTEM" },
        simulated: true,
      },
    ],
  });
}

test(
  "D1 shadow migration proves async CAS, readback parity, idempotency and bounded rollback on PostgreSQL",
  { skip: !testUrl },
  async () => {
    assert.ok(testUrl);
    const parsed = new URL(testUrl);
    assert.equal(parsed.pathname, "/enawuga_d1_test");

    const pool = new Pool({
      connectionString: testUrl,
      application_name: "enawuga-d1-shadow-ci",
      max: 3,
    });
    const directory = mkdtempSync(path.join(tmpdir(), "enawuga-d1-shadow-pg-"));

    try {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE");
      await applyD1FoundationMigration(pool);
      buildSyntheticState(directory);
      const discovery = discoverD1SyntheticFilesystemState(directory);
      assert.equal(discovery.snapshots.length, 6);
      assert.equal(discovery.auditEvents.length, 1);

      const first = await migrateD1SyntheticFilesystemShadow(pool, discovery);
      assert.equal(first.snapshots.filter((item) => item.status === "IMPORTED").length, 6);
      assert.deepEqual(first.audit, {
        inserted: 1,
        matchedExisting: 0,
        total: 1,
      });

      assert.deepEqual(await verifyD1SyntheticFilesystemShadow(pool, discovery), {
        snapshotCount: 6,
        auditEventCount: 1,
        verified: true,
      });

      const second = await migrateD1SyntheticFilesystemShadow(pool, discovery);
      assert.equal(second.snapshots.filter((item) => item.status === "MATCHED_EXISTING").length, 6);
      assert.deepEqual(second.audit, {
        inserted: 0,
        matchedExisting: 1,
        total: 1,
      });

      const boundary = new PostgresD1AsyncSnapshotBoundary(pool);
      await assert.rejects(
        boundary.compareAndSwap({
          storeKey: "shadow/customer-store",
          storageClass: "TRANSACTIONAL_STATE",
          expectedRevision: 0,
          payload: { version: 1, customers: [], audit: [] },
          sourceKind: "SYNTHETIC_FILESYSTEM",
        }),
        /D1_POSTGRES_CAS_CONFLICT/,
      );

      const rollback = await rollbackD1SyntheticFilesystemShadow(pool, discovery);
      assert.deepEqual(rollback, {
        removedSnapshots: 6,
        retainedAppendOnlyAuditEvents: 1,
      });
      await assert.rejects(
        verifyD1SyntheticFilesystemShadow(pool, discovery),
        /D1_SHADOW_READBACK_MISSING/,
      );

      const third = await migrateD1SyntheticFilesystemShadow(pool, discovery);
      assert.equal(third.snapshots.filter((item) => item.status === "IMPORTED").length, 6);
      assert.deepEqual(third.audit, {
        inserted: 0,
        matchedExisting: 1,
        total: 1,
      });

      const customer = await boundary.load("shadow/customer-store");
      assert.ok(customer);
      await boundary.compareAndSwap({
        storeKey: "shadow/customer-store",
        storageClass: "TRANSACTIONAL_STATE",
        expectedRevision: customer.revision,
        payload: { version: 1, customers: [], audit: [], changed: true },
        sourceKind: "SYNTHETIC_POSTGRES",
      });
      await assert.rejects(
        migrateD1SyntheticFilesystemShadow(pool, discovery),
        /D1_SHADOW_EXISTING_STATE_MISMATCH/,
      );

      await assert.rejects(
        pool.query("DELETE FROM enawuga.audit_event"),
        /APPEND_ONLY_MUTATION_FORBIDDEN/,
      );
    } finally {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE").catch(() => undefined);
      await pool.end();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
