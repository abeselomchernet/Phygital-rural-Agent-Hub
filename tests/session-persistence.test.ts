import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createApp } from "../src/server/app";
import { SyntheticAuthError, SyntheticAuthService } from "../src/server/auth";
import { AtomicDirectorySyntheticSessionPersistence, createConfiguredSyntheticSessionPersistence } from "../src/server/session-persistence";

function request(headers: Record<string, string> = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    secure: false,
    get(name: string) { return normalized[name.toLowerCase()]; },
  } as any;
}

function response() {
  const headers = new Map<string, string>();
  return { headers, setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); } } as any;
}

function cookieFor(auth: SyntheticAuthService, session: ReturnType<SyntheticAuthService["createSession"]>) {
  const res = response();
  auth.setSessionCookie(request(), res, session);
  return res.headers.get("set-cookie")!.split(";")[0];
}

function expectAuthError(fn: () => unknown, code: string, status: number) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof SyntheticAuthError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

function tempSessionDir() {
  return mkdtempSync(path.join(tmpdir(), "enawuga-session-test-"));
}

test("restart-durable synthetic session survives a new auth-service instance and revocation persists", () => {
  const directory = tempSessionDir();
  try {
    const first = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    const created = first.createSession("AGENT", ["customer-a"]);
    const cookie = cookieFor(first, created);
    first.dispose();

    const second = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    const restored = second.authenticate(request({ cookie }));
    assert.equal(second.view(restored).role, "AGENT");
    assert.deepEqual(second.persistenceMode(), { mode: "ATOMIC_DIRECTORY", durable: true });
    second.revoke(restored);
    second.dispose();

    const third = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    expectAuthError(() => third.authenticate(request({ cookie })), "AUTHENTICATION_REQUIRED", 401);
    third.dispose();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("two independent durable session stores share distinct sessions without aggregate-file overwrite", () => {
  const directory = tempSessionDir();
  try {
    const authA = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    const authB = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    const a = authA.createSession("AGENT", ["customer-a"]);
    const b = authB.createSession("AGENT", ["customer-b"]);
    assert.notEqual(a.sessionId, b.sessionId);
    assert.equal(readdirSync(directory).filter((name) => name.endsWith(".json")).length, 2);

    const reader = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    assert.equal(reader.authenticate(request({ cookie: cookieFor(authA, a) })).sessionId, a.sessionId);
    assert.equal(reader.authenticate(request({ cookie: cookieFor(authB, b) })).sessionId, b.sessionId);
    authA.dispose(); authB.dispose(); reader.dispose();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("expired durable session fails closed after restart and is removed", async () => {
  const directory = tempSessionDir();
  try {
    const first = new SyntheticAuthService({ sessionTtlMs: 10, cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    const session = first.createSession("AGENT", ["customer-a"]);
    const cookie = cookieFor(first, session);
    first.dispose();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    expectAuthError(() => second.authenticate(request({ cookie })), "SESSION_EXPIRED", 401);
    assert.equal(readdirSync(directory).filter((name) => name.endsWith(".json")).length, 0);
    second.dispose();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("background TTL sweep removes expired durable session without granting authority", async () => {
  const directory = tempSessionDir();
  try {
    const auth = new SyntheticAuthService({ sessionTtlMs: 5, cleanupIntervalMs: 5 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    auth.createSession("AGENT", ["customer-a"]);
    assert.equal(readdirSync(directory).filter((name) => name.endsWith(".json")).length, 1);
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.equal(readdirSync(directory).filter((name) => name.endsWith(".json")).length, 0);
    auth.dispose();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("corrupt durable session record fails closed as store unavailable", () => {
  const directory = tempSessionDir();
  try {
    const first = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    const session = first.createSession("AGENT", ["customer-a"]);
    const cookie = cookieFor(first, session);
    first.dispose();
    writeFileSync(path.join(directory, `${session.sessionId}.json`), "{not-json", "utf8");

    const second = new SyntheticAuthService({ cleanupIntervalMs: 0 }, undefined, new AtomicDirectorySyntheticSessionPersistence(directory));
    expectAuthError(() => second.authenticate(request({ cookie })), "SESSION_STORE_UNAVAILABLE", 503);
    second.dispose();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("session remains authenticated after HTTP app restart when durable store is shared", async () => {
  const directory = tempSessionDir();
  const firstPersistence = new AtomicDirectorySyntheticSessionPersistence(directory);
  const first = createApp({ sessionPersistence: firstPersistence, sessionCleanupIntervalMs: 0 }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => first.once("listening", resolve));
  const firstBase = `http://127.0.0.1:${(first.address() as any).port}`;
  let cookie = "";
  try {
    const started = await fetch(firstBase + "/api/demo/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "AGENT" }),
    });
    assert.equal(started.status, 200);
    cookie = started.headers.get("set-cookie")!.split(";")[0];
  } finally {
    await new Promise<void>((resolve, reject) => first.close((error) => error ? reject(error) : resolve()));
  }

  const secondPersistence = new AtomicDirectorySyntheticSessionPersistence(directory);
  const second = createApp({ sessionPersistence: secondPersistence, sessionCleanupIntervalMs: 0 }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => second.once("listening", resolve));
  const secondBase = `http://127.0.0.1:${(second.address() as any).port}`;
  try {
    const restored = await fetch(secondBase + "/api/demo/session", { headers: { Cookie: cookie } });
    assert.equal(restored.status, 200);
    const body = await restored.json();
    assert.equal(body.role, "AGENT");
    assert.equal(body.localDevelopmentAuth, true);
  } finally {
    await new Promise<void>((resolve, reject) => second.close((error) => error ? reject(error) : resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});


test("durable-session deployment guard fails closed when persistence is required but not configured", () => {
  assert.throws(
    () => createConfiguredSyntheticSessionPersistence({ requireDurable: true }),
    /DURABLE_SESSION_STORE_REQUIRED/,
  );
  assert.equal(createConfiguredSyntheticSessionPersistence({ requireDurable: false }), undefined);
  const directory = tempSessionDir();
  try {
    const configured = createConfiguredSyntheticSessionPersistence({ syntheticStateDir: directory, requireDurable: true });
    assert.deepEqual(
      configured && { mode: configured.mode, durable: configured.durable },
      { mode: "ATOMIC_DIRECTORY", durable: true },
    );
    assert.equal(existsSync(path.join(directory, "sessions")), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
