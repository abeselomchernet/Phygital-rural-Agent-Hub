import assert from "node:assert/strict";
import { once } from "node:events";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  acquireLocalFileLeaseSync,
  releaseLocalFileLeaseSync,
  type LocalFileLeaseOptions,
} from "../src/server/local-file-lease";

function leaseOptions(
  lockPath: string,
  overrides: Partial<LocalFileLeaseOptions> = {},
): LocalFileLeaseOptions {
  return {
    lockPath,
    waitMs: 0,
    leaseMs: 1_000,
    lockedErrorCode: "TEST_LEASE_LOCKED",
    ownershipLostErrorCode: "TEST_LEASE_OWNERSHIP_LOST",
    staleRecoveryErrorCode: "TEST_LEASE_RECOVERY_FAILED",
    ...overrides,
  };
}

function withTempLock(run: (lockPath: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-lock-lease-"));
  const lockPath = join(directory, "state.json.lock");
  try {
    run(lockPath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("fresh owned lease blocks a competing acquirer and releases cleanly", () => {
  withTempLock((lockPath) => {
    const options = leaseOptions(lockPath);
    const first = acquireLocalFileLeaseSync(options);
    assert.equal(existsSync(lockPath), true);
    assert.throws(
      () => acquireLocalFileLeaseSync(options),
      /TEST_LEASE_LOCKED/,
    );
    releaseLocalFileLeaseSync(first, options);
    assert.equal(existsSync(lockPath), false);

    const second = acquireLocalFileLeaseSync(options);
    releaseLocalFileLeaseSync(second, options);
  });
});

test("expired structured lease is quarantined and recovered", () => {
  withTempLock((lockPath) => {
    const now = Date.now();
    writeFileSync(
      lockPath,
      JSON.stringify({
        schemaVersion: 1,
        owner: randomUUID(),
        pid: 999_999,
        host: "expired-owner-host",
        createdAtMs: now - 5_000,
        leaseExpiresAtMs: now - 4_000,
      }),
      "utf8",
    );

    const options = leaseOptions(lockPath);
    const recovered = acquireLocalFileLeaseSync(options);
    assert.notEqual(recovered.host, "expired-owner-host");
    releaseLocalFileLeaseSync(recovered, options);
    assert.equal(existsSync(lockPath), false);
  });
});

test("legacy malformed lock is recovered only after filesystem-age TTL", () => {
  withTempLock((lockPath) => {
    const options = leaseOptions(lockPath, { leaseMs: 100 });
    writeFileSync(lockPath, "legacy-stale-lock", "utf8");

    assert.throws(
      () => acquireLocalFileLeaseSync(options),
      /TEST_LEASE_LOCKED/,
    );

    const old = new Date(Date.now() - 2_000);
    utimesSync(lockPath, old, old);
    const recovered = acquireLocalFileLeaseSync(options);
    releaseLocalFileLeaseSync(recovered, options);
    assert.equal(existsSync(lockPath), false);
  });
});

test("release detects owner replacement and never deletes the replacement lock", () => {
  withTempLock((lockPath) => {
    const options = leaseOptions(lockPath);
    const lease = acquireLocalFileLeaseSync(options);
    const now = Date.now();
    const replacement = {
      schemaVersion: 1 as const,
      owner: randomUUID(),
      pid: process.pid,
      host: "replacement-owner",
      createdAtMs: now,
      leaseExpiresAtMs: now + 5_000,
    };
    writeFileSync(lockPath, JSON.stringify(replacement), "utf8");

    assert.throws(
      () => releaseLocalFileLeaseSync(lease, options),
      /TEST_LEASE_OWNERSHIP_LOST/,
    );
    assert.equal(existsSync(lockPath), true);
    assert.equal(
      (JSON.parse(readFileSync(lockPath, "utf8")) as { owner: string }).owner,
      replacement.owner,
    );
  });
});

test("fresh lock created by another process is not stolen", async () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-lock-process-"));
  const lockPath = join(directory, "shared.json.lock");
  const script = [
    "const fs=require('node:fs');",
    "const os=require('node:os');",
    "const crypto=require('node:crypto');",
    "const p=process.argv[1];",
    "const now=Date.now();",
    "fs.writeFileSync(p,JSON.stringify({schemaVersion:1,owner:crypto.randomUUID(),pid:process.pid,host:os.hostname(),createdAtMs:now,leaseExpiresAtMs:now+5000}),{flag:'wx'});",
    "process.stdout.write('READY\\n');",
    "setTimeout(()=>{},5000);",
  ].join("");
  const child = spawn(process.execPath, ["-e", script, lockPath], {
    stdio: ["ignore", "pipe", "inherit"],
  });

  try {
    assert.ok(child.stdout);
    let ready = "";
    while (!ready.includes("READY")) {
      const [chunk] = (await once(child.stdout, "data")) as [Buffer];
      ready += chunk.toString("utf8");
    }

    assert.throws(
      () =>
        acquireLocalFileLeaseSync(
          leaseOptions(lockPath, { waitMs: 25, leaseMs: 1_000 }),
        ),
      /TEST_LEASE_LOCKED/,
    );
  } finally {
    child.kill();
    await once(child, "exit").catch(() => undefined);
    rmSync(directory, { recursive: true, force: true });
  }
});
