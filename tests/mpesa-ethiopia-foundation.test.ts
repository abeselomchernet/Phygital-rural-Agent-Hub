import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createMpesaEthiopiaSandboxFoundation,
  mpesaEthiopiaSandboxFoundation,
} from "../src/domain/mpesaEthiopiaSandbox";
import {
  DurablePaymentAttemptStore,
  SyntheticPaymentAttemptRequestSchema,
  type PaymentAttemptPersistence,
  type PaymentAttemptSnapshot,
} from "../src/domain/paymentAttempt";
import type { PaymentAttemptRequest } from "../src/domain/paymentOrchestration";
import { createApp } from "../src/server/app";
import { AtomicJsonPaymentAttemptPersistence } from "../src/server/payment-attempt-persistence";

const baseRequest: PaymentAttemptRequest = {
  transactionId: "10000000-0000-4000-8000-000000000001",
  customerId: "00000000-0000-4000-8000-000000000001",
  idempotencyKey: "20000000-0000-4000-8000-000000000001",
  amountMinor: 2500,
  currency: "ETB",
  provider: "MPESA_ETHIOPIA_DIRECT",
  jurisdiction: "ET",
  environment: "sandbox",
  product: "synthetic-c2b",
  merchantConfigRef: "synthetic-merchant-config-v1",
  providerContractRef: "synthetic-contract-unverified",
};

class MemoryPersistence implements PaymentAttemptPersistence {
  snapshot?: PaymentAttemptSnapshot;

  load() {
    return this.snapshot ? structuredClone(this.snapshot) : undefined;
  }

  save(snapshot: PaymentAttemptSnapshot, expectedRevision: number) {
    if ((this.snapshot?.revision ?? 0) !== expectedRevision)
      throw new Error("revision conflict");
    this.snapshot = structuredClone(snapshot);
  }
}

function alternateUuid(seed: number) {
  return `30000000-0000-4000-8000-${String(seed).padStart(12, "0")}`;
}

test("M-PESA Ethiopia foundation is metadata-only, unverified and network-disabled", () => {
  assert.deepEqual(mpesaEthiopiaSandboxFoundation, {
    provider: "MPESA_ETHIOPIA_DIRECT",
    jurisdiction: "ET",
    environment: "sandbox",
    networkEnabled: false,
    contractStatus: "UNVERIFIED",
    initiation: "unavailable",
    status: "unavailable",
    notification: "unavailable",
  });
  assert.equal("endpoint" in mpesaEthiopiaSandboxFoundation, false);
  assert.equal("credential" in mpesaEthiopiaSandboxFoundation, false);
  assert.throws(
    () => createMpesaEthiopiaSandboxFoundation({ networkEnabled: true }),
    /MPESA_ETHIOPIA_CONTRACT_UNVERIFIED/,
  );
  assert.throws(
    () => createMpesaEthiopiaSandboxFoundation({ endpoint: "https://example.invalid" }),
    /MPESA_ETHIOPIA_CONTRACT_UNVERIFIED/,
  );
});

test("neutral attempt reservation is idempotent and changed request fields fail closed", () => {
  const store = new DurablePaymentAttemptStore(new MemoryPersistence());
  const first = store.reserve(baseRequest);
  assert.equal(first.reused, false);
  assert.equal(first.reconciliationRequired, false);

  const replay = store.reserve(baseRequest);
  assert.equal(replay.reused, true);
  assert.equal(replay.reconciliationRequired, true);

  for (const changed of [
    { amountMinor: 2600 },
    { currency: "USD" },
    { product: "synthetic-other-product" },
    { merchantConfigRef: "synthetic-merchant-config-v2" },
    { provider: "ARIFPAY" as const },
  ]) {
    assert.throws(
      () => store.reserve({ ...baseRequest, ...changed }),
      /PAYMENT_ATTEMPT_IDEMPOTENCY_CONFLICT/,
    );
  }
});

test("same internal transaction cannot silently switch from ArifPay or Telebirr to M-PESA", () => {
  for (const provider of ["ARIFPAY", "TELEBIRR_DIRECT"] as const) {
    const store = new DurablePaymentAttemptStore(new MemoryPersistence());
    const original = {
      ...baseRequest,
      provider,
      idempotencyKey: alternateUuid(provider === "ARIFPAY" ? 1 : 2),
    };
    store.reserve(original);
    assert.throws(
      () => store.reserve({
        ...baseRequest,
        transactionId: original.transactionId,
        idempotencyKey: alternateUuid(provider === "ARIFPAY" ? 3 : 4),
      }),
      /PAYMENT_ATTEMPT_TRANSACTION_CONFLICT/,
    );
  }
});

test("provider-specific and secret-like fields cannot enter the neutral attempt schema", () => {
  for (const extra of [
    { prepay_id: "provider-id" },
    { providerSessionId: "provider-session" },
    { oauthToken: "secret" },
    { consumerSecret: "secret" },
    { callbackPayload: { status: "SUCCESS" } },
  ]) {
    assert.equal(
      SyntheticPaymentAttemptRequestSchema.safeParse({ ...baseRequest, ...extra }).success,
      false,
    );
  }
});

test("reserved unresolved attempt survives restart and requires reconciliation without repost", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-payment-attempt-"));
  try {
    const path = join(directory, "attempts.json");
    const persistence = new AtomicJsonPaymentAttemptPersistence(path);
    const first = new DurablePaymentAttemptStore(persistence);
    first.reserve(baseRequest);

    const serialized = readFileSync(path, "utf8");
    for (const forbidden of [
      "oauthToken",
      "consumerSecret",
      "privateKey",
      "signature",
      "authorization",
      "callbackPayload",
      "msisdn",
      "phone",
    ]) {
      assert.equal(serialized.includes(forbidden), false);
    }

    const restarted = new DurablePaymentAttemptStore(persistence);
    const replay = restarted.reserve(baseRequest);
    assert.equal(replay.reused, true);
    assert.equal(replay.reconciliationRequired, true);
    assert.throws(
      () => restarted.recordInitiation(baseRequest, {
        kind: "INITIATION",
        outcome: "ACCEPTED",
        paymentCompletion: "NOT_ESTABLISHED",
      }),
      /PAYMENT_ATTEMPT_RECONCILIATION_REQUIRED/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("M-PESA foundation has no mounted API route", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    for (const path of [
      "/api/demo/payments/mpesa/c2b",
      "/api/demo/payments/mpesa/status",
      "/api/demo/payments/mpesa/callback",
    ]) {
      const response = await fetch(base + path, { method: "POST" });
      assert.equal(response.status, 404);
      assert.equal((await response.json()).error, "API_NOT_FOUND");
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
});

test("M-PESA and neutral attempt modules have no PartnerFI mutation dependency", () => {
  for (const relative of [
    "../src/domain/mpesaEthiopiaSandbox.ts",
    "../src/domain/paymentAttempt.ts",
    "../src/domain/paymentOrchestration.ts",
    "../src/server/payment-attempt-persistence.ts",
  ]) {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /FinancialInstitutionAdapter|partnerLedger|PartnerFI balance|from\s+["'][^"']*financial["']/,
    );
  }
});
