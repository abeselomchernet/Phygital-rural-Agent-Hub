import assert from "node:assert/strict";
import test from "node:test";
import {
  DurableTelebirrPreorderState,
  TelebirrPreorderSnapshotSchema,
  type TelebirrPreorderPersistence,
  type TelebirrPreorderSnapshot,
} from "../src/domain/telebirrPreorderState";

class MemoryPersistence implements TelebirrPreorderPersistence {
  snapshot?: TelebirrPreorderSnapshot;
  load() {
    return this.snapshot ? structuredClone(this.snapshot) : undefined;
  }
  save(snapshot: TelebirrPreorderSnapshot) {
    this.snapshot = TelebirrPreorderSnapshotSchema.parse(structuredClone(snapshot));
  }
}

function intent(overrides: Record<string, unknown> = {}) {
  return {
    transactionId: "11111111-1111-4111-8111-111111111111",
    customerId: "22222222-2222-4222-8222-222222222222",
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    request: {
      merchantOrderId: "ORDER123456",
      nonce: "NONCE123456",
      timestamp: "1755866911",
      title: "Synthetic item",
      amountMinor: 150,
    },
    ...overrides,
  } as const;
}

test("submission intent is persisted before any future provider mutation", () => {
  const persistence = new MemoryPersistence();
  const state = new DurableTelebirrPreorderState(persistence);
  const record = state.recordSubmissionIntent(intent());
  assert.equal(record.status, "SUBMISSION_INTENT_RECORDED");
  assert.equal(record.classification, null);
  assert.equal(persistence.snapshot?.records.length, 1);
});

test("restart with unresolved intent requires reconciliation instead of repost", () => {
  const persistence = new MemoryPersistence();
  new DurableTelebirrPreorderState(persistence).recordSubmissionIntent(intent());
  const restarted = new DurableTelebirrPreorderState(persistence);
  assert.throws(
    () => restarted.recordSubmissionIntent(intent()),
    /TELEBIRR_RECOVERY_RECONCILIATION_REQUIRED/,
  );
});

test("idempotency key cannot be reused with a changed request", () => {
  const persistence = new MemoryPersistence();
  const state = new DurableTelebirrPreorderState(persistence);
  state.recordSubmissionIntent(intent());
  assert.throws(
    () =>
      state.recordSubmissionIntent(
        intent({
          request: {
            merchantOrderId: "ORDER123456",
            nonce: "NONCE123456",
            timestamp: "1755866911",
            title: "Different item",
            amountMinor: 150,
          },
        }),
      ),
    /TELEBIRR_IDEMPOTENCY_CONFLICT/,
  );
});

test("transaction and merchant order replay fail closed across different idempotency keys", () => {
  const state = new DurableTelebirrPreorderState(new MemoryPersistence());
  state.recordSubmissionIntent(intent());
  assert.throws(
    () =>
      state.recordSubmissionIntent(
        intent({ idempotencyKey: "44444444-4444-4444-8444-444444444444" }),
      ),
    /TELEBIRR_TRANSACTION_REPLAY/,
  );
  assert.throws(
    () =>
      state.recordSubmissionIntent(
        intent({
          transactionId: "55555555-5555-4555-8555-555555555555",
          idempotencyKey: "66666666-6666-4666-8666-666666666666",
        }),
      ),
    /TELEBIRR_MERCHANT_ORDER_REPLAY/,
  );
});

test("provider classification requires a recorded intent and remains non-settlement", () => {
  const state = new DurableTelebirrPreorderState(new MemoryPersistence());
  assert.throws(
    () =>
      state.recordProviderClassification(
        "33333333-3333-4333-8333-333333333333",
        {
          state: "ORDER_CREATED",
          merchantOrderId: "ORDER123456",
          prepayId: "PREPAY123",
          paymentConfirmed: false,
          settlementConfirmed: false,
        },
      ),
    /TELEBIRR_SUBMISSION_INTENT_REQUIRED/,
  );

  state.recordSubmissionIntent(intent());
  const recorded = state.recordProviderClassification(
    "33333333-3333-4333-8333-333333333333",
    {
      state: "ORDER_CREATED",
      merchantOrderId: "ORDER123456",
      prepayId: "PREPAY123",
      paymentConfirmed: false,
      settlementConfirmed: false,
    },
  );
  assert.equal(recorded.status, "RESULT_RECORDED");
  assert.equal(recorded.classification?.state, "ORDER_CREATED");
  assert.equal(recorded.classification?.paymentConfirmed, false);
  assert.equal(recorded.classification?.settlementConfirmed, false);
});

test("recorded provider order must bind to the persisted merchant order", () => {
  const state = new DurableTelebirrPreorderState(new MemoryPersistence());
  state.recordSubmissionIntent(intent());
  assert.throws(
    () =>
      state.recordProviderClassification(
        "33333333-3333-4333-8333-333333333333",
        {
          state: "ORDER_CREATED",
          merchantOrderId: "OTHERORDER",
          prepayId: "PREPAY123",
          paymentConfirmed: false,
          settlementConfirmed: false,
        },
      ),
    /provider order does not bind to recorded merchant order/,
  );
});

test("recorded result survives restart without allowing duplicate intent mutation", () => {
  const persistence = new MemoryPersistence();
  const first = new DurableTelebirrPreorderState(persistence);
  first.recordSubmissionIntent(intent());
  first.recordProviderClassification(
    "33333333-3333-4333-8333-333333333333",
    {
      state: "PROVIDER_REJECTED",
      providerCode: "60200098",
      paymentConfirmed: false,
      settlementConfirmed: false,
    },
  );
  const restarted = new DurableTelebirrPreorderState(persistence);
  const existing = restarted.recordSubmissionIntent(intent());
  assert.equal(existing.status, "RESULT_RECORDED");
  assert.equal(existing.classification?.state, "PROVIDER_REJECTED");
});
