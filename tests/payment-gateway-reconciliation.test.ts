import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ARIFPAY_PORTAL_SANDBOX_KEY,
  ARIFPAY_SANDBOX_ORIGIN,
  type ArifPaySandboxConfig,
  type PaymentGatewayResult,
} from "../src/domain/paymentGateway";
import {
  ARIFPAY_SANDBOX_SESSION_STATUS_PATH,
  ArifPaySandboxStatusReader,
  PaymentGatewayReconciliationService,
  type PaymentGatewayRecordedResultLookup,
  type PaymentGatewayStatusReader,
  type PaymentGatewayStatusResult,
} from "../src/domain/paymentGatewayReconciliation";
import { AtomicJsonPaymentGatewayReconciliationPersistence } from "../src/server/payment-gateway-reconciliation-persistence";

const transactionId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const providerSessionId = "sandbox-session-status-1";

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

function checkoutResult(): PaymentGatewayResult {
  return {
    transactionId,
    customerId,
    state: "CHECKOUT_CREATED",
    code: "GATEWAY_ACCEPTED_CHECKOUT",
    provider: "ARIFPAY",
    environment: "sandbox",
    providerSessionId,
  };
}

class Lookup implements PaymentGatewayRecordedResultLookup {
  constructor(private readonly result: PaymentGatewayResult | undefined) {}
  getRecordedResultByTransactionId(id: string) {
    return id === transactionId && this.result
      ? structuredClone(this.result)
      : undefined;
  }
}

function status(
  state: PaymentGatewayStatusResult["state"],
  code: PaymentGatewayStatusResult["code"],
): PaymentGatewayStatusResult {
  return {
    transactionId,
    customerId,
    state,
    code,
    provider: "ARIFPAY",
    environment: "sandbox",
    checkedAt: new Date().toISOString(),
  };
}

class SequenceReader implements PaymentGatewayStatusReader {
  calls = 0;
  constructor(private readonly values: PaymentGatewayStatusResult[]) {}
  async getC2BStatus() {
    const value = this.values[Math.min(this.calls, this.values.length - 1)];
    this.calls += 1;
    return structuredClone(value);
  }
}

test("ArifPay sandbox status reader uses verified session endpoint and maps lifecycle states", async () => {
  const cases = [
    ["PENDING", "PAYMENT_PENDING", "GATEWAY_STATUS_PENDING"],
    ["SUCCESS", "GATEWAY_CONFIRMED", "GATEWAY_STATUS_SUCCESS"],
    ["FAILED", "GATEWAY_FAILED", "GATEWAY_STATUS_FAILED"],
    ["CANCELED", "GATEWAY_CANCELED", "GATEWAY_STATUS_CANCELED"],
    ["EXPIRED", "GATEWAY_EXPIRED", "GATEWAY_STATUS_EXPIRED"],
  ] as const;

  for (const [providerState, expectedState, expectedCode] of cases) {
    let called = "";
    const reader = new ArifPaySandboxStatusReader(
      config(),
      (async (input) => {
        called = String(input);
        return response({
          error: false,
          msg: "No Errors",
          data: { status: providerState },
        });
      }) as typeof fetch,
    );
    const result = await reader.getC2BStatus({
      transactionId,
      customerId,
      providerSessionId,
    });
    assert.equal(
      called,
      `${ARIFPAY_SANDBOX_ORIGIN}${ARIFPAY_SANDBOX_SESSION_STATUS_PATH}/${providerSessionId}`,
    );
    assert.equal(result.state, expectedState);
    assert.equal(result.code, expectedCode);
  }
});

test("status reader accepts nested transaction state and never converts transport errors into payment failure", async () => {
  const nested = new ArifPaySandboxStatusReader(
    config(),
    (async () =>
      response({
        error: false,
        data: { transaction: { transactionStatus: "SUCCESS" } },
      })) as typeof fetch,
  );
  assert.equal(
    (await nested.getC2BStatus({ transactionId, customerId, providerSessionId }))
      .state,
    "GATEWAY_CONFIRMED",
  );

  const missing = new ArifPaySandboxStatusReader(
    config(),
    (async () => response({ error: true, msg: "No Session found" }, 404)) as typeof fetch,
  );
  assert.equal(
    (await missing.getC2BStatus({ transactionId, customerId, providerSessionId }))
      .code,
    "GATEWAY_STATUS_SESSION_NOT_FOUND",
  );

  const server = new ArifPaySandboxStatusReader(
    config(),
    (async () => response({ error: true }, 503)) as typeof fetch,
  );
  assert.equal(
    (await server.getC2BStatus({ transactionId, customerId, providerSessionId }))
      .state,
    "OUTCOME_UNCERTAIN",
  );

  const network = new ArifPaySandboxStatusReader(
    config(),
    (async () => {
      throw new Error("synthetic network failure");
    }) as typeof fetch,
  );
  assert.equal(
    (await network.getC2BStatus({ transactionId, customerId, providerSessionId }))
      .code,
    "GATEWAY_STATUS_NETWORK_UNCERTAIN",
  );
});

test("reconciliation persists across restart and terminal gateway confirmation is sticky", async () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-gateway-reconcile-"));
  try {
    const persistence = new AtomicJsonPaymentGatewayReconciliationPersistence(
        join(directory, "reconciliation.json"),
      ),
      reader = new SequenceReader([
        status("PAYMENT_PENDING", "GATEWAY_STATUS_PENDING"),
        status("GATEWAY_CONFIRMED", "GATEWAY_STATUS_SUCCESS"),
        status("PAYMENT_PENDING", "GATEWAY_STATUS_PENDING"),
      ]),
      first = new PaymentGatewayReconciliationService(
        new Lookup(checkoutResult()),
        reader,
        persistence,
      );

    assert.equal(
      (await first.reconcile({ transactionId, customerId })).state,
      "PAYMENT_PENDING",
    );
    assert.equal(
      (await first.reconcile({ transactionId, customerId })).state,
      "GATEWAY_CONFIRMED",
    );
    assert.equal(reader.calls, 2);

    const restartedReader = new SequenceReader([
      status("PAYMENT_PENDING", "GATEWAY_STATUS_PENDING"),
    ]);
    const restarted = new PaymentGatewayReconciliationService(
      new Lookup(checkoutResult()),
      restartedReader,
      persistence,
    );
    assert.equal(
      (await restarted.reconcile({ transactionId, customerId })).state,
      "GATEWAY_CONFIRMED",
    );
    assert.equal(restartedReader.calls, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("reconciliation binds provider status to the recorded checkout customer and session", async () => {
  const reader = new SequenceReader([
    status("GATEWAY_CONFIRMED", "GATEWAY_STATUS_SUCCESS"),
  ]);
  const service = new PaymentGatewayReconciliationService(
    new Lookup(checkoutResult()),
    reader,
  );

  await assert.rejects(
    service.reconcile({
      transactionId,
      customerId: "33333333-3333-4333-8333-333333333333",
    }),
    /GATEWAY_CHECKOUT_CUSTOMER_MISMATCH/,
  );
  assert.equal(reader.calls, 0);

  const noSession = new PaymentGatewayReconciliationService(
    new Lookup({ ...checkoutResult(), providerSessionId: undefined }),
    reader,
  );
  await assert.rejects(
    noSession.reconcile({ transactionId, customerId }),
    /GATEWAY_SESSION_REFERENCE_REQUIRED/,
  );
});

test("status reader rejects production host/key and remains fail-closed when network is disabled", async () => {
  const noCall = (async () => {
    throw new Error("SHOULD_NOT_CALL");
  }) as typeof fetch;
  assert.throws(
    () =>
      new ArifPaySandboxStatusReader(
        config({ baseUrl: "https://gateway.arifpay.net" }),
        noCall,
      ),
    /ARIFPAY_SANDBOX_HOST_REQUIRED/,
  );
  assert.throws(
    () =>
      new ArifPaySandboxStatusReader(config({ apiKey: "wrong-key" }), noCall),
    /ARIFPAY_SANDBOX_KEY_REQUIRED/,
  );
  const disabled = new ArifPaySandboxStatusReader(
    config({ networkEnabled: false }),
    noCall,
  );
  await assert.rejects(
    disabled.getC2BStatus({ transactionId, customerId, providerSessionId }),
    /ARIFPAY_SANDBOX_NETWORK_DISABLED/,
  );
});
