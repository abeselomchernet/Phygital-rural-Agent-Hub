import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type {
  PaymentGatewayAdapter,
  PaymentGatewayC2BRequest,
  PaymentGatewayResult,
} from "../src/domain/paymentGateway";
import {
  DurablePaymentGatewayAdapter,
  type PaymentGatewayPersistence,
  type PaymentGatewaySnapshot,
} from "../src/domain/paymentGatewayState";
import { AtomicJsonPaymentGatewayPersistence } from "../src/server/payment-gateway-persistence";

const request: PaymentGatewayC2BRequest = {
  transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  customerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  idempotencyKey: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  amountMinor: 2500,
  currency: "ETB",
};

const result: PaymentGatewayResult = {
  transactionId: request.transactionId,
  customerId: request.customerId,
  state: "CHECKOUT_CREATED",
  code: "GATEWAY_ACCEPTED_CHECKOUT",
  provider: "ARIFPAY",
  environment: "sandbox",
  providerSessionId: "sandbox-session-durable",
};

class StubAdapter implements PaymentGatewayAdapter {
  calls = 0;
  constructor(private readonly value = result) {}
  getRecordedResult() {
    return undefined;
  }
  async createC2BCheckout() {
    this.calls += 1;
    return structuredClone(this.value);
  }
}

class FailSecondSavePersistence implements PaymentGatewayPersistence {
  snapshot?: PaymentGatewaySnapshot;
  saves = 0;
  load() {
    return this.snapshot ? structuredClone(this.snapshot) : undefined;
  }
  save(snapshot: PaymentGatewaySnapshot) {
    this.saves += 1;
    if (this.saves === 2) throw new Error("SYNTHETIC_RESULT_SAVE_FAILURE");
    this.snapshot = structuredClone(snapshot);
  }
}

test("durable gateway result survives restart and prevents provider repost", async () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-gateway-"));
  try {
    const persistence = new AtomicJsonPaymentGatewayPersistence(
        join(directory, "gateway.json"),
      ),
      firstInner = new StubAdapter(),
      first = new DurablePaymentGatewayAdapter(firstInner, persistence);

    assert.deepEqual(await first.createC2BCheckout(request), result);
    assert.equal(firstInner.calls, 1);

    const secondInner = new StubAdapter(),
      restarted = new DurablePaymentGatewayAdapter(secondInner, persistence);
    assert.deepEqual(await restarted.createC2BCheckout(request), result);
    assert.equal(secondInner.calls, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("crash window after submission intent fails closed to reconciliation after restart", async () => {
  const persistence = new FailSecondSavePersistence(),
    firstInner = new StubAdapter(),
    first = new DurablePaymentGatewayAdapter(firstInner, persistence);

  await assert.rejects(
    first.createC2BCheckout(request),
    /SYNTHETIC_RESULT_SAVE_FAILURE/,
  );
  assert.equal(firstInner.calls, 1);
  assert.equal(persistence.snapshot?.records[0].status, "SUBMISSION_INTENT_RECORDED");

  const secondInner = new StubAdapter(),
    restarted = new DurablePaymentGatewayAdapter(secondInner, persistence);
  await assert.rejects(
    restarted.createC2BCheckout(request),
    /GATEWAY_RECOVERY_RECONCILIATION_REQUIRED/,
  );
  assert.equal(secondInner.calls, 0);
});

test("durable gateway persistence rejects malformed or conflicting state", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-gateway-bad-"));
  try {
    const path = join(directory, "gateway.json"),
      persistence = new AtomicJsonPaymentGatewayPersistence(path),
      inner = new StubAdapter();
    writeFileSync(path, JSON.stringify({ version: 1, records: [{ nope: true }] }));
    assert.throws(
      () => new DurablePaymentGatewayAdapter(inner, persistence),
      /invalid_type|Invalid input/i,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("durable gateway wrapper preserves idempotency conflicts across restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-gateway-conflict-"));
  try {
    const persistence = new AtomicJsonPaymentGatewayPersistence(
        join(directory, "gateway.json"),
      ),
      first = new DurablePaymentGatewayAdapter(new StubAdapter(), persistence);
    await first.createC2BCheckout(request);

    const restarted = new DurablePaymentGatewayAdapter(
      new StubAdapter(),
      persistence,
    );
    await assert.rejects(
      restarted.createC2BCheckout({ ...request, amountMinor: 2600 }),
      /IDEMPOTENCY_CONFLICT/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
