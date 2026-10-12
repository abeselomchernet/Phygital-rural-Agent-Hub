import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/server/app";
import type {
  PaymentGatewayAdapter,
  PaymentGatewayC2BRequest,
  PaymentGatewayResult,
} from "../src/domain/paymentGateway";

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
  return { cookie, csrfToken: body.csrfToken, role: body.role };
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
  body: unknown,
  includeCsrf = true,
) {
  return fetch(base + "/api/demo/payments/arifpay/c2b/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: session.cookie,
      ...(includeCsrf ? { "X-CSRF-Token": session.csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
}

class StubGateway implements PaymentGatewayAdapter {
  calls: PaymentGatewayC2BRequest[] = [];
  constructor(
    private readonly behavior:
      | "success"
      | "recovery" = "success",
  ) {}
  getRecordedResult() {
    return undefined;
  }
  async createC2BCheckout(
    request: PaymentGatewayC2BRequest,
  ): Promise<PaymentGatewayResult> {
    this.calls.push(structuredClone(request));
    if (this.behavior === "recovery")
      throw new Error("GATEWAY_RECOVERY_RECONCILIATION_REQUIRED");
    return {
      transactionId: request.transactionId,
      customerId: request.customerId,
      state: "CHECKOUT_CREATED",
      code: "GATEWAY_ACCEPTED_CHECKOUT",
      provider: "ARIFPAY",
      environment: "sandbox",
      providerSessionId: "synthetic-session",
      paymentUrl: "https://gateway.arifpay.org/pay/synthetic-session",
    };
  }
}

async function fixtureCustomer(base: string, session: DemoSession) {
  const response = await authedFetch(base, session, "/api/demo/customer");
  assert.equal(response.status, 200);
  return response.json();
}

function checkoutRequest(customerId: string) {
  return {
    customerId,
    transactionId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    amountMinor: 2500,
    currency: "ETB",
  };
}

test("ArifPay checkout API is session, CSRF, role and object protected", async () => {
  const gateway = new StubGateway();
  const server = createApp({
    allowPrivilegedSyntheticRoles: true,
    paymentGateway: gateway,
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const unauthenticated = await fetch(
      base + "/api/demo/payments/arifpay/c2b/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutRequest(crypto.randomUUID())),
      },
    );
    assert.equal(unauthenticated.status, 401);

    const agent = await startSession(base, "AGENT"),
      customer = await fixtureCustomer(base, agent),
      request = checkoutRequest(customer.customerId);
    assert.equal((await post(base, agent, request, false)).status, 403);
    assert.equal(
      (
        await post(base, agent, {
          ...request,
          customerId: crypto.randomUUID(),
        })
      ).status,
      403,
    );

    const supervisor = await startSession(base, "SUPERVISOR");
    assert.equal((await post(base, supervisor, request)).status, 403);
    assert.equal(gateway.calls.length, 0);
  } finally {
    server.close();
  }
});

test("ArifPay checkout API is unavailable by default and never enables provider networking implicitly", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const agent = await startSession(base),
      customer = await fixtureCustomer(base, agent),
      response = await post(base, agent, checkoutRequest(customer.customerId));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "PAYMENT_GATEWAY_UNAVAILABLE");
  } finally {
    server.close();
  }
});

test("ArifPay checkout API accepts only the bounded synthetic request and returns checkout creation without settlement", async () => {
  const gateway = new StubGateway();
  const server = createApp({ paymentGateway: gateway }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const agent = await startSession(base),
      customer = await fixtureCustomer(base, agent),
      request = checkoutRequest(customer.customerId),
      response = await post(base, agent, request);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.state, "CHECKOUT_CREATED");
    assert.equal(body.code, "GATEWAY_ACCEPTED_CHECKOUT");
    assert.equal(body.provider, "ARIFPAY");
    assert.equal(body.environment, "sandbox");
    assert.equal(gateway.calls.length, 1);
    assert.deepEqual(gateway.calls[0], request);
    assert.equal("settled" in body, false);
    assert.equal("partnerAccount" in body, false);

    const piiAttempt = await post(base, agent, {
      ...checkoutRequest(customer.customerId),
      phone: "+251911234567",
    });
    assert.equal(piiAttempt.status, 400);
    assert.equal(gateway.calls.length, 1);
  } finally {
    server.close();
  }
});

test("ArifPay checkout API surfaces restart uncertainty as reconciliation required without reposting", async () => {
  const gateway = new StubGateway("recovery");
  const server = createApp({ paymentGateway: gateway }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const agent = await startSession(base),
      customer = await fixtureCustomer(base, agent),
      response = await post(base, agent, checkoutRequest(customer.customerId));
    assert.equal(response.status, 409);
    assert.equal(
      (await response.json()).error,
      "PAYMENT_GATEWAY_RECONCILIATION_REQUIRED",
    );
    assert.equal(gateway.calls.length, 1);
  } finally {
    server.close();
  }
});
