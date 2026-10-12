import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/server/app";
import { AtomicJsonCustomerPersistence } from "../src/server/customer-persistence";
import { AtomicJsonPartnerLedgerPersistence } from "../src/server/partner-ledger-persistence";
import {
  AtomicJsonKycPendingPersistence,
  AtomicJsonMockIdentityPersistence,
} from "../src/server/identity-persistence";

async function listenWithState(directory: string) {
  const app = createApp({
      customerPersistence: new AtomicJsonCustomerPersistence(
        join(directory, "customers.json"),
      ),
      partnerLedgerPersistence: new AtomicJsonPartnerLedgerPersistence(
        join(directory, "partner-ledger.json"),
      ),
      identityProviderPersistence: new AtomicJsonMockIdentityPersistence(
        join(directory, "mock-identity-provider.json"),
      ),
      kycPendingPersistence: new AtomicJsonKycPendingPersistence(
        join(directory, "kyc-pending.json"),
      ),
    }),
    server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return {
    server,
    base: `http://127.0.0.1:${(server.address() as any).port}`,
  };
}

async function close(server: ReturnType<ReturnType<typeof createApp>["listen"]>) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

async function session(base: string) {
  const started = await fetch(base + "/api/demo/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "AGENT" }),
    }),
    cookie = started.headers.get("set-cookie")?.split(";")[0],
    body = await started.json();
  assert.equal(started.status, 200);
  assert.ok(cookie);
  return { cookie, csrfToken: body.csrfToken as string };
}

async function get(base: string, auth: Awaited<ReturnType<typeof session>>, path: string) {
  return fetch(base + path, { headers: { Cookie: auth.cookie } });
}

async function post(
  base: string,
  auth: Awaited<ReturnType<typeof session>>,
  path: string,
  body: unknown,
) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: auth.cookie,
      "X-CSRF-Token": auth.csrfToken,
    },
    body: JSON.stringify(body),
  });
}

test("opt-in synthetic customer and PartnerFI records survive server restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-api-restart-"));
  let firstServer: Awaited<ReturnType<typeof listenWithState>> | undefined,
    secondServer: Awaited<ReturnType<typeof listenWithState>> | undefined;
  try {
    firstServer = await listenWithState(directory);
    const firstAuth = await session(firstServer.base),
      firstCustomer = await (
        await get(firstServer.base, firstAuth, "/api/demo/customer")
      ).json(),
      request = {
        transactionId: crypto.randomUUID(),
        customerId: firstCustomer.customerId,
        idempotencyKey: crypto.randomUUID(),
        amountMinor: 1000,
        direction: "CASH_IN",
        currency: "ETB",
      };
    const firstResult = await (
      await post(firstServer.base, firstAuth, "/api/demo/transactions", request)
    ).json();
    assert.equal(firstResult.state, "PARTNER_ACCEPTED");
    assert.equal(
      (
        await (
          await get(firstServer.base, firstAuth, "/api/demo/account")
        ).json()
      ).balanceMinor,
      101000,
    );
    await close(firstServer.server);
    firstServer = undefined;

    secondServer = await listenWithState(directory);
    const secondAuth = await session(secondServer.base),
      secondCustomer = await (
        await get(secondServer.base, secondAuth, "/api/demo/customer")
      ).json();
    assert.equal(secondCustomer.customerId, firstCustomer.customerId);
    assert.equal(
      (
        await (
          await get(secondServer.base, secondAuth, "/api/demo/account")
        ).json()
      ).balanceMinor,
      101000,
    );
    const retry = await (
      await post(secondServer.base, secondAuth, "/api/demo/transactions", request)
    ).json();
    assert.deepEqual(
      {
        transactionId: retry.transactionId,
        customerId: retry.customerId,
        state: retry.state,
        accountOwner: retry.accountOwner,
        simulated: retry.simulated,
      },
      {
        transactionId: firstResult.transactionId,
        customerId: firstResult.customerId,
        state: firstResult.state,
        accountOwner: firstResult.accountOwner,
        simulated: firstResult.simulated,
      },
    );
    assert.equal(
      (
        await (
          await get(secondServer.base, secondAuth, "/api/demo/account")
        ).json()
      ).balanceMinor,
      101000,
    );
  } finally {
    if (firstServer) await close(firstServer.server);
    if (secondServer) await close(secondServer.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("pending synthetic re-verification challenge survives server restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-kyc-restart-"));
  let firstServer: Awaited<ReturnType<typeof listenWithState>> | undefined,
    secondServer: Awaited<ReturnType<typeof listenWithState>> | undefined;
  try {
    firstServer = await listenWithState(directory);
    const firstAuth = await session(firstServer.base),
      firstCustomer = await (
        await get(firstServer.base, firstAuth, "/api/demo/customer")
      ).json();
    const changed = await (
      await post(firstServer.base, firstAuth, "/api/demo/phone", {
        phone: "+251900000002",
      })
    ).json();
    assert.equal(changed.customerId, firstCustomer.customerId);
    assert.equal(changed.kycStatus, "REVERIFICATION_REQUIRED");
    assert.equal(
      (await post(firstServer.base, firstAuth, "/api/demo/reverify/start", {}))
        .status,
      200,
    );
    await close(firstServer.server);
    firstServer = undefined;

    secondServer = await listenWithState(directory);
    const secondAuth = await session(secondServer.base),
      beforeConfirm = await (
        await get(secondServer.base, secondAuth, "/api/demo/customer")
      ).json();
    assert.equal(beforeConfirm.customerId, firstCustomer.customerId);
    assert.equal(beforeConfirm.kycStatus, "REVERIFICATION_REQUIRED");
    const confirmed = await (
      await post(secondServer.base, secondAuth, "/api/demo/reverify/confirm", {})
    ).json();
    assert.equal(confirmed.customerId, firstCustomer.customerId);
    assert.equal(confirmed.kycStatus, "VERIFIED");
    assert.equal(confirmed.phoneStatus, "VERIFIED");
    assert.equal(confirmed.primaryPhone, "+251900000002");
  } finally {
    if (firstServer) await close(firstServer.server);
    if (secondServer) await close(secondServer.server);
    rmSync(directory, { recursive: true, force: true });
  }
});
