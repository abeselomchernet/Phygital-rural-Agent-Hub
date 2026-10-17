import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { d1CanonicalPayloadSha256 } from "../src/server/postgres/d1-async-boundary";
import { discoverD1SyntheticFilesystemState } from "../src/server/postgres/d1-shadow-migration";

function writeJson(directory: string, name: string, value: unknown) {
  writeFileSync(path.join(directory, name), `${JSON.stringify(value)}\n`, "utf8");
}

test("D1 canonical payload digest is deterministic across object key order", () => {
  assert.equal(
    d1CanonicalPayloadSha256({ b: 2, a: { y: true, x: false } }),
    d1CanonicalPayloadSha256({ a: { x: false, y: true }, b: 2 }),
  );
});

test("D1 shadow discovery imports only governed known synthetic snapshot schemas", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "enawuga-d1-shadow-"));
  try {
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
    writeJson(directory, "unknown.json", { shouldNotMigrate: true });

    const discovery = discoverD1SyntheticFilesystemState(directory);
    assert.equal(discovery.snapshots.length, 6);
    assert.deepEqual(
      discovery.snapshots.map((source) => source.fileName).sort(),
      [
        "customers.json",
        "kyc-pending.json",
        "mock-identity-provider.json",
        "partner-ledger.json",
        "payment-gateway-reconciliation.json",
        "payment-gateway.json",
      ],
    );
    assert.equal(discovery.auditEvents.length, 0);
    assert.ok(discovery.snapshots.every((source) => /^[0-9a-f]{64}$/.test(source.payloadSha256)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("D1 shadow discovery fails closed on malformed governed source", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "enawuga-d1-shadow-"));
  try {
    writeJson(directory, "customers.json", { version: 1, customers: "not-an-array", audit: [] });
    assert.throws(
      () => discoverD1SyntheticFilesystemState(directory),
      /Invalid input|expected array/i,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("D1 shadow discovery rejects symlinked governed source files", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "enawuga-d1-shadow-"));
  const target = path.join(directory, "target.json");
  try {
    writeJson(directory, "target.json", { version: 1, customers: [], audit: [] });
    symlinkSync(target, path.join(directory, "customers.json"));
    assert.throws(
      () => discoverD1SyntheticFilesystemState(directory),
      /D1_SHADOW_SOURCE_SYMLINK_FORBIDDEN/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
