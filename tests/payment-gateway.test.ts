import assert from "node:assert/strict";
import test from "node:test";
import {
  ARIFPAY_PORTAL_SANDBOX_KEY,
  ARIFPAY_SANDBOX_CHECKOUT_PATH,
  ARIFPAY_SANDBOX_ORIGIN,
  ARIFPAY_SANDBOX_SIMULATOR_EMAIL,
  ARIFPAY_SANDBOX_SIMULATOR_PHONE,
  ArifPaySandboxAdapter,
  type ArifPaySandboxConfig,
  type PaymentGatewayC2BRequest,
} from "../src/domain/paymentGateway";

const request: PaymentGatewayC2BRequest = {
  transactionId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  idempotencyKey: "33333333-3333-4333-8333-333333333333",
  amountMinor: 1234,
  currency: "ETB",
};

function config(
  overrides: Partial<ArifPaySandboxConfig> = {},
): ArifPaySandboxConfig {
  return {
    mode: "sandbox",
    networkEnabled: true,
    baseUrl: ARIFPAY_SANDBOX_ORIGIN,
    apiKey: ARIFPAY_PORTAL_SANDBOX_KEY,
    notifyUrl: "http://localhost:3000/api/sandbox/webhook-inbox",
    successUrl: "https://payment.arifpay.org/success",
    cancelUrl: "https://payment.arifpay.org/Cancel",
    errorUrl: "https://payment.arifpay.org/Error",
    timeoutMs: 1_000,
    ...overrides,
  };
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("ArifPay sandbox adapter rejects production/legacy hosts and non-sandbox keys", () => {
  const noCall = (async () => {
    throw new Error("SHOULD_NOT_CALL");
  }) as typeof fetch;

  assert.throws(
    () =>
      new ArifPaySandboxAdapter(
        config({ baseUrl: "https://gateway.arifpay.net" }),
        noCall,
      ),
    /ARIFPAY_SANDBOX_HOST_REQUIRED/,
  );
  assert.throws(
    () =>
      new ArifPaySandboxAdapter(
        config({ apiKey: "not-the-portal-sandbox-key" }),
        noCall,
      ),
    /ARIFPAY_SANDBOX_KEY_REQUIRED/,
  );
});

test("ArifPay sandbox network is fail-closed until explicitly enabled", async () => {
  const noCall = (async () => {
    throw new Error("SHOULD_NOT_CALL");
  }) as typeof fetch;
  const adapter = new ArifPaySandboxAdapter(
    config({ networkEnabled: false }),
    noCall,
  );
  await assert.rejects(
    adapter.createC2BCheckout(request),
    /ARIFPAY_SANDBOX_NETWORK_DISABLED/,
  );
});

test("C2B checkout matches current sandbox contract using simulator identity only", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input: String(input), init });
    return response({
      error: false,
      msg: "created",
      data: {
        sessionId: "sandbox-session-1",
        paymentUrl: "https://gateway.arifpay.org/pay/sandbox-session-1",
        totalAmount: 12.34,
      },
    });
  }) as typeof fetch;

  const adapter = new ArifPaySandboxAdapter(config(), fetcher);
  const first = await adapter.createC2BCheckout(request);
  const retry = await adapter.createC2BCheckout(request);

  assert.equal(first.state, "CHECKOUT_CREATED");
  assert.equal(first.code, "GATEWAY_ACCEPTED_CHECKOUT");
  assert.equal(first.providerSessionId, "sandbox-session-1");
  assert.equal(first.paymentUrl, "https://gateway.arifpay.org/pay/sandbox-session-1");
  assert.deepEqual(retry, first);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].input,
    `${ARIFPAY_SANDBOX_ORIGIN}${ARIFPAY_SANDBOX_CHECKOUT_PATH}`,
  );

  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers["x-arifpay-key"], ARIFPAY_PORTAL_SANDBOX_KEY);
  assert.equal(headers["x-arifpay-sim-mode"], "SUCCESS");
  assert.equal(headers["x-arifpay-fee-source"], "MERCHANT");

  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.nonce, request.transactionId);
  assert.equal(body.amount, 12.34);
  assert.equal(body.items[0].price, 12.34);
  assert.equal(body.phone, ARIFPAY_SANDBOX_SIMULATOR_PHONE);
  assert.equal(body.email, ARIFPAY_SANDBOX_SIMULATOR_EMAIL);
  assert.equal(body.lang, "EN");
  assert.equal("customerId" in body, false);
  assert.equal("beneficiaries" in body, false);
  assert.equal("paymentMethods" in body, false);
});

test("sandbox checkout accepts provider uuid fallback without fabricating settlement", async () => {
  const fetcher = (async () =>
    response({
      error: false,
      data: { uuid: "sandbox-uuid-2" },
    })) as typeof fetch;
  const adapter = new ArifPaySandboxAdapter(config(), fetcher);
  const result = await adapter.createC2BCheckout(request);
  assert.equal(result.state, "CHECKOUT_CREATED");
  assert.equal(result.providerSessionId, "sandbox-uuid-2");
});

test("same idempotency key with changed C2B payload fails closed", async () => {
  const fetcher = (async () =>
    response({
      error: false,
      data: {
        sessionId: "sandbox-session-2",
        totalAmount: 12.34,
      },
    })) as typeof fetch;
  const adapter = new ArifPaySandboxAdapter(config(), fetcher);
  await adapter.createC2BCheckout(request);

  await assert.rejects(
    adapter.createC2BCheckout({ ...request, amountMinor: 1300 }),
    /IDEMPOTENCY_CONFLICT/,
  );
});

test("network uncertainty is recorded and identical retries do not auto-post again", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls += 1;
    throw new Error("synthetic network failure");
  }) as typeof fetch;
  const adapter = new ArifPaySandboxAdapter(config(), fetcher);

  const first = await adapter.createC2BCheckout(request);
  const retry = await adapter.createC2BCheckout(request);
  assert.equal(first.state, "OUTCOME_UNCERTAIN");
  assert.equal(first.code, "GATEWAY_NETWORK_UNCERTAIN");
  assert.deepEqual(retry, first);
  assert.equal(calls, 1);
});

test("gateway 5xx remains uncertain and lifecycle duplicate requires reconciliation", async () => {
  const uncertain = new ArifPaySandboxAdapter(
    config(),
    (async () => response({ error: true, msg: "server error", data: null }, 503)) as typeof fetch,
  );
  const uncertainResult = await uncertain.createC2BCheckout(request);
  assert.equal(uncertainResult.state, "OUTCOME_UNCERTAIN");
  assert.equal(uncertainResult.code, "GATEWAY_SERVER_UNCERTAIN");

  const reconcile = new ArifPaySandboxAdapter(
    config(),
    (async () => response({ error: true, msg: "session already exist", data: null }, 400)) as typeof fetch,
  );
  const reconcileResult = await reconcile.createC2BCheckout(request);
  assert.equal(reconcileResult.state, "RECONCILIATION_REQUIRED");
  assert.equal(reconcileResult.code, "GATEWAY_SESSION_ALREADY_EXISTS");
});

test("gateway validation rejection and amount mismatch never become checkout success", async () => {
  const rejected = new ArifPaySandboxAdapter(
    config(),
    (async () => response({ error: true, msg: "Validation Error", data: null }, 400)) as typeof fetch,
  );
  const rejectedResult = await rejected.createC2BCheckout(request);
  assert.equal(rejectedResult.state, "GATEWAY_REJECTED");
  assert.equal(rejectedResult.code, "GATEWAY_VALIDATION_REJECTED");

  const mismatch = new ArifPaySandboxAdapter(
    config(),
    (async () =>
      response({
        error: false,
        msg: "created",
        data: {
          sessionId: "sandbox-session-3",
          totalAmount: 99.99,
        },
      })) as typeof fetch,
  );
  const mismatchResult = await mismatch.createC2BCheckout(request);
  assert.equal(mismatchResult.state, "OUTCOME_UNCERTAIN");
  assert.equal(mismatchResult.code, "GATEWAY_AMOUNT_MISMATCH");
});
