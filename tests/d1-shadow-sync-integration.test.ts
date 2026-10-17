import assert from "node:assert/strict";
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Pool } from "pg";
import { applyD1FoundationMigration } from "../src/server/postgres/d1-migration";
import { PostgresD1AsyncSnapshotBoundary } from "../src/server/postgres/d1-async-boundary";
import { discoverD1SyntheticFilesystemState } from "../src/server/postgres/d1-shadow-migration";
import {
  planD1SyntheticFilesystemShadowSync,
  syncD1SyntheticFilesystemShadow,
} from "../src/server/postgres/d1-shadow-sync";

const testUrl = process.env.D1_TEST_DATABASE_URL;

function writeJson(directory: string, name: string, value: unknown) {
  writeFileSync(path.join(directory, name), `${JSON.stringify(value)}\n`, "utf8");
}

function emptyCustomers() {
  return { version: 1 as const, customers: [], audit: [] };
}

function oneCustomer() {
  return {
    version: 1 as const,
    customers: [
      {
        customerId: "00000000-0000-4000-8000-000000000111",
        phoneStatus: "UNVERIFIED" as const,
        kycStatus: "UNVERIFIED" as const,
        riskState: "NORMAL" as const,
        createdAt: "2026-10-17T00:00:00.000Z",
        updatedAt: "2026-10-17T00:00:00.000Z",
      },
    ],
    audit: [],
  };
}

function syntheticAudit() {
  return {
    version: 1 as const,
    events: [
      {
        eventId: "00000000-0000-4000-8000-000000000001",
        at: "2026-10-17T00:00:00.000Z",
        category: "AUTH" as const,
        action: "SESSION_CREATED" as const,
        outcome: "SUCCESS" as const,
        actor: { userId: "system", role: "SYSTEM" as const },
        simulated: true as const,
      },
    ],
  };
}

test(
  "D1 controlled shadow sync plans, updates and fails closed on PostgreSQL-owned divergence",
  { skip: !testUrl },
  async () => {
    assert.ok(testUrl);
    const parsed = new URL(testUrl);
    assert.equal(parsed.pathname, "/enawuga_d1_test");

    const pool = new Pool({
      connectionString: testUrl,
      application_name: "enawuga-d1-shadow-sync-ci",
      max: 3,
    });
    const directory = mkdtempSync(path.join(tmpdir(), "enawuga-d1-shadow-sync-"));

    try {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE");
      await applyD1FoundationMigration(pool);
      writeJson(directory, "customers.json", emptyCustomers());
      writeJson(directory, "audit.json", syntheticAudit());

      let discovery = discoverD1SyntheticFilesystemState(directory);
      let plan = await planD1SyntheticFilesystemShadowSync(pool, discovery);
      assert.equal(plan.conflicts, 0);
      assert.equal(plan.writesRequired, 2);
      assert.equal(plan.items[0]?.status, "DATABASE_MISSING");
      assert.deepEqual(plan.audit, {
        sourceEvents: 1,
        databasePresent: 0,
        databaseMissing: 1,
      });

      const first = await syncD1SyntheticFilesystemShadow(pool, discovery);
      assert.equal(first.snapshots[0]?.status, "CREATED");
      assert.equal(first.snapshots[0]?.revision, 1);
      assert.equal(first.audit.inserted, 1);
      assert.equal(first.verification.verified, true);

      plan = await planD1SyntheticFilesystemShadowSync(pool, discovery);
      assert.equal(plan.writesRequired, 0);
      assert.equal(plan.items[0]?.status, "MATCHED");
      assert.equal(plan.audit.databasePresent, 1);

      writeJson(directory, "customers.json", oneCustomer());
      discovery = discoverD1SyntheticFilesystemState(directory);
      plan = await planD1SyntheticFilesystemShadowSync(pool, discovery);
      assert.equal(plan.items[0]?.status, "UPDATE_REQUIRED");
      assert.equal(plan.items[0]?.databaseRevision, 1);
      assert.equal(plan.writesRequired, 1);

      const second = await syncD1SyntheticFilesystemShadow(pool, discovery);
      assert.equal(second.snapshots[0]?.status, "UPDATED");
      assert.equal(second.snapshots[0]?.revision, 2);
      assert.equal(second.audit.matchedExisting, 1);

      unlinkSync(path.join(directory, "customers.json"));
      const missingSource = discoverD1SyntheticFilesystemState(directory);
      const missingPlan = await planD1SyntheticFilesystemShadowSync(pool, missingSource);
      assert.equal(missingPlan.items.length, 0);
      assert.equal(missingPlan.writesRequired, 0);
      const boundary = new PostgresD1AsyncSnapshotBoundary(pool);
      assert.ok(await boundary.load("shadow/customer-store"));

      writeJson(directory, "customers.json", oneCustomer());
      discovery = discoverD1SyntheticFilesystemState(directory);
      const current = await boundary.load("shadow/customer-store");
      assert.ok(current);
      await boundary.compareAndSwap({
        storeKey: "shadow/customer-store",
        storageClass: "TRANSACTIONAL_STATE",
        expectedRevision: current.revision,
        payload: oneCustomer(),
        sourceKind: "SYNTHETIC_POSTGRES",
      });

      plan = await planD1SyntheticFilesystemShadowSync(pool, discovery);
      assert.equal(plan.conflicts, 1);
      assert.equal(plan.items[0]?.status, "CONFLICT_POSTGRES_OWNED");
      await assert.rejects(
        syncD1SyntheticFilesystemShadow(pool, discovery),
        /D1_SHADOW_SYNC_CONFLICT_REVIEW_REQUIRED/,
      );
    } finally {
      await pool.query("DROP SCHEMA IF EXISTS enawuga CASCADE").catch(() => undefined);
      await pool.end();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
