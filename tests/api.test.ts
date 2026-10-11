import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server/app";
test("synthetic API enforces KYC, alias identity, replay and closed legacy endpoints", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const post = (path: string, body: unknown) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await (await fetch(base + "/api/health")).json()).status,
      "ok",
    );
    const customer = await (await fetch(base + "/api/demo/customer")).json();
    const request = {
      customerId: customer.customerId,
      transactionId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      amountMinor: 1000,
      direction: "CASH_IN",
      currency: "ETB",
    };
    assert.equal(
      (await (await post("/api/demo/transactions", request)).json()).state,
      "PARTNER_ACCEPTED",
    );
    assert.equal((await post("/api/demo/transactions", request)).status, 200);
    assert.equal(
      (await (await fetch(base + "/api/demo/account")).json()).balanceMinor,
      101000,
    );
    assert.equal(
      (
        await post("/api/demo/transactions", {
          ...request,
          customerId: crypto.randomUUID(),
        })
      ).status,
      400,
    );
    assert.equal(
      (await post("/api/demo/phone", { phone: "+251911234567" })).status,
      400,
    );
    const changed = await (
      await post("/api/demo/phone", { phone: "+251900000002" })
    ).json();
    assert.equal(changed.customerId, customer.customerId);
    assert.equal(changed.kycStatus, "REVERIFICATION_REQUIRED");
    assert.equal(
      (
        await post("/api/demo/transactions", {
          ...request,
          transactionId: crypto.randomUUID(),
          idempotencyKey: crypto.randomUUID(),
        })
      ).status,
      400,
    );
    assert.equal((await post("/api/demo/reverify/confirm", {})).status, 400);
    assert.equal((await post("/api/demo/reverify/start", {})).status, 200);
    assert.equal(
      (await (await post("/api/demo/reverify/confirm", {})).json()).kycStatus,
      "VERIFIED",
    );
    for (const path of [
      "/api/ghostsync",
      "/api/fayda/otp/send",
      "/api/fayda/otp/verify",
      "/api/settlement/iso20022",
      "/api/reconciliation/run",
      "/api/worker/tasks",
    ])
      assert.equal((await post(path, {})).status, 403);
    assert.equal(
      (
        await fetch(base + "/api/demo/phone", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://untrusted.example",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal((await fetch(base + "/api/not-a-route")).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("all presentation GET fixtures are deterministic and explicitly synthetic", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    for (const route of [
      "/api/health",
      "/api/demo/agents",
      "/api/agents",
      "/api/demo/swaps",
      "/api/swaps",
      "/api/demo/infrastructure",
      "/api/node/metrics",
      "/api/demo/iso20022/logs",
      "/api/iso20022/logs",
      "/api/demo/statements/AGT-842",
      "/api/statements/AGT-842",
    ]) {
      const first = await (await fetch(base + route)).json(),
        second = await (await fetch(base + route)).json();
      assert.equal(first.simulated, true);
      assert.equal(first.dataMode, "synthetic");
      assert.equal(first.capabilityStatus, "SYNTHETIC DEMO");
      assert.deepEqual(first, second);
      assert.doesNotMatch(
        JSON.stringify(first),
        /NAGA-NODE|Sovereign|Raxio|GCP AI|Fabric Ledger|EthSwitch/i,
      );
    }
    for (const route of [
      "/api/demo/customer",
      "/api/demo/account",
      "/api/demo/lookup?phone=%2B251900000001",
    ]) {
      const data = await (await fetch(base + route)).json();
      assert.equal(data.simulated, true);
      assert.equal(data.dataMode, "synthetic");
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
