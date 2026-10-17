import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/server/app";
import type {
  PaymentGatewayAdapter,
  PaymentGatewayC2BRequest,
  PaymentGatewayResult,
} from "../src/domain/paymentGateway";
import {
  PaymentGatewayReconciliationService,
  type PaymentGatewayStatusReader,
} from "../src/domain/paymentGatewayReconciliation";

type DemoSession = { cookie: string; csrfToken: string; role: string };

async function startSession(base: string, role: string): Promise<DemoSession> {
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

async function customer(base: string, session: DemoSession) {
  const response = await authedFetch(base, session, "/api/demo/customer");
  assert.equal(response.status, 200);
  return response.json();
}

class Gateway implements PaymentGatewayAdapter {
  calls: PaymentGatewayC2BRequest[] = [];
  results = new Map<string, PaymentGatewayResult>();
  getRecordedResult(request: PaymentGatewayC2BRequest) {
    return this.results.get(request.transactionId);
  }
  async createC2BCheckout(request: PaymentGatewayC2BRequest) {
    this.calls.push(structuredClone(request));
    const result: PaymentGatewayResult = {
      transactionId: request.transactionId,
      customerId: request.customerId,
      state: "CHECKOUT_CREATED",
      code: "GATEWAY_ACCEPTED_CHECKOUT",
      provider: "ARIFPAY",
      environment: "sandbox",
      providerSessionId: `session-${request.transactionId}`,
    };
    this.results.set(request.transactionId, result);
    return structuredClone(result);
  }
  getRecordedResultByTransactionId(transactionId: string) {
    const result = this.results.get(transactionId);
    return result ? structuredClone(result) : undefined;
  }
}

class StatusReader implements PaymentGatewayStatusReader {
  calls = 0;
  async getC2BStatus(input: {
    transactionId: string;
    customerId: string;
    providerSessionId: string;
  }) {
    this.calls += 1;
    return {
      transactionId: input.transactionId,
      customerId: input.customerId,
      state: "GATEWAY_CONFIRMED" as const,
      code: "GATEWAY_STATUS_SUCCESS" as const,
      provider: "ARIFPAY" as const,
      environment: "sandbox" as const,
      checkedAt: new Date().toISOString(),
    };
  }
}

function postJson(
  base: string,
  session: DemoSession,
  path: string,
  body: unknown,
  includeCsrf = true,
) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: session.cookie,
      ...(includeCsrf ? { "X-CSRF-Token": session.csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("gateway reconciliation is supervisor/admin controlled and never reports settlement", async () => {
  const gateway = new Gateway(),
    reader = new StatusReader(),
    reconciliation = new PaymentGatewayReconciliationService(gateway, reader),
    server = createApp({
      allowPrivilegedSyntheticRoles: true,
      paymentGateway: gateway,
      paymentGatewayReconciliation: reconciliation,
    }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;

  try {
    const agent = await startSession(base, "AGENT"),
      fixture = await customer(base, agent),
      transactionId = crypto.randomUUID(),
      checkout = {
        customerId: fixture.customerId,
        transactionId,
        idempotencyKey: crypto.randomUUID(),
        amountMinor: 2500,
        currency: "ETB",
      };

    assert.equal(
      (
        await postJson(
          base,
          agent,
          "/api/demo/payments/arifpay/c2b/checkout",
          checkout,
        )
      ).status,
      200,
    );

    const reconcileBody = { customerId: fixture.customerId, transactionId };
    assert.equal(
      (
        await postJson(
          base,
          agent,
          "/api/demo/payments/arifpay/c2b/reconcile",
          reconcileBody,
        )
      ).status,
      403,
    );

    const supervisor = await startSession(base, "SUPERVISOR");
    assert.equal(
      (
        await postJson(
          base,
          supervisor,
          "/api/demo/payments/arifpay/c2b/reconcile",
          reconcileBody,
          false,
        )
      ).status,
      403,
    );

    const response = await postJson(
      base,
      supervisor,
      "/api/demo/payments/arifpay/c2b/reconcile",
      reconcileBody,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.state, "GATEWAY_CONFIRMED");
    assert.equal(body.code, "GATEWAY_STATUS_SUCCESS");
    assert.equal(body.provider, "ARIFPAY");
    assert.equal(body.environment, "sandbox");
    assert.equal("settled" in body, false);
    assert.equal("partnerSettlement" in body, false);
    assert.equal(reader.calls, 1);

    const retry = await postJson(
      base,
      supervisor,
      "/api/demo/payments/arifpay/c2b/reconcile",
      reconcileBody,
    );
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).state, "GATEWAY_CONFIRMED");
    assert.equal(reader.calls, 1);

    const wrongCustomer = await postJson(
      base,
      supervisor,
      "/api/demo/payments/arifpay/c2b/reconcile",
      { ...reconcileBody, customerId: crypto.randomUUID() },
    );
    assert.equal(wrongCustomer.status, 403);

    const v2 = await postJson(
      base,
      supervisor,
      "/api/demo/v2/payments/arifpay/c2b/reconcile",
      { transactionId },
    );
    assert.equal(v2.status, 200);
    const v2Body = await v2.json();
    assert.equal(v2Body.state, "GATEWAY_CONFIRMED");
    assert.equal(v2Body.provider, "ARIFPAY");
    assert.equal("customerId" in v2Body, false);
    assert.equal(JSON.stringify(v2Body).includes(fixture.customerId), false);
    assert.equal(reader.calls, 1);

    const injected = await postJson(
      base,
      supervisor,
      "/api/demo/v2/payments/arifpay/c2b/reconcile",
      { transactionId, customerId: fixture.customerId },
    );
    assert.equal(injected.status, 400);
  } finally {
    server.close();
  }
});

test("gateway reconciliation is unavailable by default", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const supervisor = await startSession(base, "SUPERVISOR"),
      fixture = await customer(base, supervisor),
      response = await postJson(
        base,
        supervisor,
        "/api/demo/payments/arifpay/c2b/reconcile",
        { customerId: fixture.customerId, transactionId: crypto.randomUUID() },
      );
    assert.equal(response.status, 503);
    assert.equal(
      (await response.json()).error,
      "PAYMENT_GATEWAY_RECONCILIATION_UNAVAILABLE",
    );
    const v2 = await postJson(
      base,
      supervisor,
      "/api/demo/v2/payments/arifpay/c2b/reconcile",
      { transactionId: crypto.randomUUID() },
    );
    assert.equal(v2.status, 503);
    assert.equal(
      (await v2.json()).error,
      "PAYMENT_GATEWAY_RECONCILIATION_UNAVAILABLE",
    );
  } finally {
    server.close();
  }
});
