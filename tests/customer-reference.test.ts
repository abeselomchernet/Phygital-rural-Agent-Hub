import assert from "node:assert/strict";
import test from "node:test";

import {
  assignmentReferenceForCustomerReference,
  deriveSyntheticCustomerReference,
  resolveSyntheticCustomerReference,
} from "../src/domain/customerReference";
import { createApp } from "../src/server/app";

const CUSTOMER_ID = "2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b";
const SESSION_ID = "0a8c0ce0-45ea-44c0-b2bd-e48dcfdb421b";

const scope = {
  sessionId: SESSION_ID,
  tenantId: "tenant_stage4_synthetic",
  partnerOrgId: "partnerfi_alpha",
  allowedCustomerIds: [CUSTOMER_ID],
};

test("D4 opaque customer reference is deterministic within scope and changes across session/partner", () => {
  const first = deriveSyntheticCustomerReference(scope, CUSTOMER_ID);
  assert.equal(first, deriveSyntheticCustomerReference(scope, CUSTOMER_ID));
  assert.match(first, /^custref_v1_[A-Za-z0-9_-]{43}$/);
  assert.equal(first.includes(CUSTOMER_ID), false);
  assert.notEqual(
    first,
    deriveSyntheticCustomerReference(
      { ...scope, sessionId: "5d288c65-0559-412e-9669-f050077c9a10" },
      CUSTOMER_ID,
    ),
  );
  assert.notEqual(
    first,
    deriveSyntheticCustomerReference(
      { ...scope, partnerOrgId: "partnerfi_beta" },
      CUSTOMER_ID,
    ),
  );
  assert.equal(resolveSyntheticCustomerReference(scope, first), CUSTOMER_ID);
  assert.match(assignmentReferenceForCustomerReference(first), /^assignment_[a-f0-9]{32}$/);
});

test("D4 opaque customer reference cannot authorize an out-of-scope customer or another session", () => {
  const reference = deriveSyntheticCustomerReference(scope, CUSTOMER_ID);
  assert.throws(
    () => deriveSyntheticCustomerReference(scope, "f0876671-1093-46af-8a0e-28e65f3656fd"),
    /CUSTOMER_REFERENCE_SCOPE_DENIED/,
  );
  assert.throws(
    () =>
      resolveSyntheticCustomerReference(
        { ...scope, sessionId: "5d288c65-0559-412e-9669-f050077c9a10" },
        reference,
      ),
    /CUSTOMER_REFERENCE_SCOPE_DENIED/,
  );
});

type Session = { cookie: string; csrf: string; internalCustomerId: string };

async function startSession(base: string, workspaceKey = "ALPHA_AGENT_ADAMA"): Promise<Session> {
  const response = await fetch(`${base}/api/demo/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "AGENT", workspaceKey }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  assert.equal("allowedCustomerIds" in body, false);
  const legacyCustomer = await fetch(`${base}/api/demo/customer`, {
    headers: { Cookie: cookie },
  });
  assert.equal(legacyCustomer.status, 200);
  const internalCustomerId = (await legacyCustomer.json()).customerId;
  assert.ok(internalCustomerId);
  return { cookie, csrf: body.csrfToken, internalCustomerId };
}

function get(base: string, session: Session, path: string) {
  return fetch(`${base}${path}`, { headers: { Cookie: session.cookie } });
}

function post(base: string, session: Session, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      "Content-Type": "application/json",
      "X-CSRF-Token": session.csrf,
    },
    body: JSON.stringify(body),
  });
}

test("D4 v2 customer boundary uses opaque refs and role-safe projection for account and transaction workflow", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const alpha = await startSession(base);
    const customerResponse = await get(base, alpha, "/api/demo/v2/customer");
    assert.equal(customerResponse.status, 200);
    const target = await customerResponse.json();
    assert.match(target.customerRef, /^custref_v1_/);
    assert.equal(target.customer.projection, "AGENT_CUSTOMER");
    const text = JSON.stringify(target);
    for (const forbidden of [
      alpha.internalCustomerId,
      '"customerId"',
      '"primaryPhone"',
      '"partnerCustomerId"',
      '"identityReference"',
    ]) assert.equal(text.includes(forbidden), false, forbidden);

    const account = await get(
      base,
      alpha,
      `/api/demo/v2/account?customerRef=${encodeURIComponent(target.customerRef)}`,
    );
    assert.equal(account.status, 200);
    assert.equal((await account.json()).accountOwner, "PartnerFI");

    const rawUuidAttempt = await get(
      base,
      alpha,
      `/api/demo/v2/account?customerRef=${encodeURIComponent(alpha.internalCustomerId)}`,
    );
    assert.equal(rawUuidAttempt.status, 400);

    const transaction = await post(base, alpha, "/api/demo/v2/transactions", {
      customerRef: target.customerRef,
      transactionId: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      amountMinor: 1000,
      direction: "CASH_IN",
      currency: "ETB",
    });
    assert.equal(transaction.status, 200);
    const result = await transaction.json();
    assert.equal(result.customerRef, target.customerRef);
    assert.equal(result.state, "PARTNER_ACCEPTED");
    assert.equal("customerId" in result, false);

    const beta = await startSession(base, "BETA_AGENT_ADAMA");
    const crossSession = await get(
      base,
      beta,
      `/api/demo/v2/account?customerRef=${encodeURIComponent(target.customerRef)}`,
    );
    assert.equal(crossSession.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("D4 v2 lookup and customer mutations preserve opaque projection and revoked-session denial", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const session = await startSession(base);
    const lookup = await get(base, session, "/api/demo/v2/lookup?phone=%2B251900000001");
    assert.equal(lookup.status, 200);
    const found = await lookup.json();
    assert.match(found.customerRef, /^custref_v1_/);
    assert.equal(JSON.stringify(found).includes(session.internalCustomerId), false);

    const unavailable = await get(base, session, "/api/demo/v2/lookup?phone=%2B251900000002");
    const invalid = await get(base, session, "/api/demo/v2/lookup?phone=%2B251911234567");
    assert.equal(unavailable.status, 404);
    assert.equal(invalid.status, 404);
    assert.deepEqual(await unavailable.json(), await invalid.json());

    const changed = await post(base, session, "/api/demo/v2/phone", {
      customerRef: found.customerRef,
      phone: "+251900000002",
    });
    assert.equal(changed.status, 200);
    const changedBody = await changed.json();
    assert.equal(changedBody.customer.kycStatus, "REVERIFICATION_REQUIRED");
    assert.equal(JSON.stringify(changedBody).includes(session.internalCustomerId), false);

    assert.equal(
      (await post(base, session, "/api/demo/v2/reverify/start", { customerRef: found.customerRef })).status,
      200,
    );
    const confirmed = await post(base, session, "/api/demo/v2/reverify/confirm", {
      customerRef: found.customerRef,
    });
    assert.equal(confirmed.status, 200);
    assert.equal((await confirmed.json()).customer.kycStatus, "VERIFIED");

    assert.equal((await post(base, session, "/api/demo/session/logout", {})).status, 200);
    assert.equal((await get(base, session, "/api/demo/v2/customer")).status, 401);
    const replacement = await startSession(base);
    assert.equal(
      (await get(base, replacement, `/api/demo/v2/account?customerRef=${encodeURIComponent(found.customerRef)}`)).status,
      403,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
