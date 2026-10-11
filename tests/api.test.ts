import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server/app";

type DemoSession = { cookie: string; csrfToken: string; role: string };

async function startSession(base: string, role = "AGENT"): Promise<DemoSession> {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const body = await response.json();
  assert.equal(body.localDevelopmentAuth, true);
  assert.equal(body.role, role);
  assert.equal(typeof body.csrfToken, "string");
  return { cookie, csrfToken: body.csrfToken, role };
}

function authedFetch(
  base: string,
  session: DemoSession,
  path: string,
  init: RequestInit = {},
) {
  return fetch(base + path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Cookie: session.cookie,
      ...(init.method && init.method !== "GET"
        ? { "X-CSRF-Token": session.csrfToken }
        : {}),
    },
  });
}

function post(
  base: string,
  session: DemoSession,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return authedFetch(base, session, path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
}

test("synthetic customer API requires session, CSRF, role and object authorization", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal(
      (await (await fetch(base + "/api/health")).json()).status,
      "ok",
    );
    assert.equal((await fetch(base + "/api/demo/customer")).status, 401);

    const agent = await startSession(base, "AGENT");
    const customerResponse = await authedFetch(
      base,
      agent,
      "/api/demo/customer",
    );
    assert.equal(customerResponse.status, 200);
    const customer = await customerResponse.json();

    const request = {
      customerId: customer.customerId,
      transactionId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      amountMinor: 1000,
      direction: "CASH_IN",
      currency: "ETB",
    };

    assert.equal(
      (
        await fetch(base + "/api/demo/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agent.cookie,
          },
          body: JSON.stringify(request),
        })
      ).status,
      403,
    );
    assert.equal(
      (await (await post(base, agent, "/api/demo/transactions", request)).json())
        .state,
      "PARTNER_ACCEPTED",
    );
    assert.equal(
      (await post(base, agent, "/api/demo/transactions", request)).status,
      200,
    );
    assert.equal(
      (
        await (
          await authedFetch(base, agent, "/api/demo/account")
        ).json()
      ).balanceMinor,
      101000,
    );
    assert.equal(
      (
        await post(base, agent, "/api/demo/transactions", {
          ...request,
          customerId: crypto.randomUUID(),
        })
      ).status,
      403,
    );

    assert.equal(
      (
        await post(base, agent, "/api/demo/phone", {
          phone: "+251911234567",
        })
      ).status,
      400,
    );
    const changed = await (
      await post(base, agent, "/api/demo/phone", { phone: "+251900000002" })
    ).json();
    assert.equal(changed.customerId, customer.customerId);
    assert.equal(changed.kycStatus, "REVERIFICATION_REQUIRED");
    assert.equal(
      (
        await post(base, agent, "/api/demo/transactions", {
          ...request,
          transactionId: crypto.randomUUID(),
          idempotencyKey: crypto.randomUUID(),
        })
      ).status,
      400,
    );
    assert.equal(
      (await post(base, agent, "/api/demo/reverify/confirm", {})).status,
      400,
    );
    assert.equal(
      (await post(base, agent, "/api/demo/reverify/start", {})).status,
      200,
    );
    assert.equal(
      (
        await (
          await post(base, agent, "/api/demo/reverify/confirm", {})
        ).json()
      ).kycStatus,
      "VERIFIED",
    );

    const supervisor = await startSession(base, "SUPERVISOR");
    assert.equal(
      (
        await post(base, supervisor, "/api/demo/phone", {
          phone: "+251900000003",
        })
      ).status,
      403,
    );
    const admin = await startSession(base, "PARTNER_ADMIN");
    const auditResponse = await authedFetch(
      base,
      admin,
      "/api/demo/security/audit",
    );
    assert.equal(auditResponse.status, 200);
    const auditText = JSON.stringify(await auditResponse.json());
    assert.match(auditText, /ROLE_DENIED|CSRF_DENIED|OBJECT_ACCESS_DENIED/);
    assert.doesNotMatch(auditText, new RegExp(agent.csrfToken));
    assert.doesNotMatch(auditText, /sessionId|FIN|FAN|biometric/i);

    assert.equal(
      (await post(base, agent, "/api/demo/session/logout", {})).status,
      200,
    );
    assert.equal(
      (await authedFetch(base, agent, "/api/demo/customer")).status,
      401,
    );

    for (const path of [
      "/api/ghostsync",
      "/api/fayda/otp/send",
      "/api/fayda/otp/verify",
      "/api/settlement/iso20022",
      "/api/reconciliation/run",
      "/api/worker/tasks",
    ])
      assert.equal(
        (
          await fetch(base + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          })
        ).status,
        403,
      );

    assert.equal(
      (
        await fetch(base + "/api/demo/session/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://untrusted.example",
          },
          body: JSON.stringify({ role: "AGENT" }),
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
    const session = await startSession(base);
    for (const route of [
      "/api/demo/customer",
      "/api/demo/account",
      "/api/demo/lookup?phone=%2B251900000001",
    ]) {
      const response = await authedFetch(base, session, route),
        data = await response.json();
      assert.equal(response.status, 200);
      assert.equal(data.simulated, true);
      assert.equal(data.dataMode, "synthetic");
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
