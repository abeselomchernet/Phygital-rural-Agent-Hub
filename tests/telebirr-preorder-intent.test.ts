import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  DurableTelebirrPreorderIntentStore,
  type TelebirrPreorderIntentPersistence,
  type TelebirrPreorderIntentRequest,
  type TelebirrPreorderIntentSnapshot,
} from "../src/domain/telebirrPreorderIntent";
import { AtomicJsonTelebirrPreorderIntentPersistence } from "../src/server/telebirr-preorder-intent-persistence";

function request(
  overrides: Partial<TelebirrPreorderIntentRequest> = {},
): TelebirrPreorderIntentRequest {
  return {
    transactionId: randomUUID(),
    customerId: randomUUID(),
    idempotencyKey: randomUUID(),
    merchantOrderId: `ORDER${Date.now()}${Math.floor(Math.random() * 100000)}`,
    nonce: `NONCE${Date.now()}${Math.floor(Math.random() * 100000)}`,
    timestamp: "1791819000",
    title: "Synthetic item",
    amountMinor: 150,
    currency: "ETB",
    ...overrides,
  };
}

function withStore(run: (args: { path: string; store: DurableTelebirrPreorderIntentStore }) => void) {
  const directory = mkdtempSync(join(tmpdir(), "telebirr-intent-"));
  const path = join(directory, "telebirr-preorder-intents.json");
  try {
    const store = new DurableTelebirrPreorderIntentStore(
      new AtomicJsonTelebirrPreorderIntentPersistence(path),
    );
    run({ path, store });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("preorder correlation intent survives restart before any provider mutation", () => {
  withStore(({ path, store }) => {
    const input = request();
    const first = store.reserve(input);
    assert.equal(first.status, "PREORDER_INTENT_RECORDED");
    assert.equal(first.request.transactionId, input.transactionId);

    const restarted = new DurableTelebirrPreorderIntentStore(
      new AtomicJsonTelebirrPreorderIntentPersistence(path),
    );
    assert.deepEqual(restarted.reserve(input), first);
    assert.deepEqual(restarted.getByTransactionId(input.transactionId), first);
    assert.deepEqual(restarted.getByMerchantOrderId(input.merchantOrderId), first);
  });
});

test("failed durable save does not expose a phantom in-memory reservation", () => {
  let snapshot: TelebirrPreorderIntentSnapshot | undefined;
  let failSave = true;
  const persistence: TelebirrPreorderIntentPersistence = {
    load: () => snapshot,
    save: (candidate) => {
      if (failSave) throw new Error("SYNTHETIC_PERSISTENCE_FAILURE");
      snapshot = structuredClone(candidate);
    },
  };
  const store = new DurableTelebirrPreorderIntentStore(persistence);
  const input = request();

  assert.throws(
    () => store.reserve(input),
    /SYNTHETIC_PERSISTENCE_FAILURE/,
  );
  assert.equal(store.getByTransactionId(input.transactionId), undefined);
  assert.equal(store.getByMerchantOrderId(input.merchantOrderId), undefined);
  assert.equal(snapshot, undefined);

  failSave = false;
  const persisted = store.reserve(input);
  assert.equal(persisted.status, "PREORDER_INTENT_RECORDED");
  assert.equal(snapshot?.records.length, 1);
  assert.equal(snapshot?.records[0]?.request.transactionId, input.transactionId);
});

test("same idempotency key with changed preorder intent fails closed", () => {
  withStore(({ store }) => {
    const input = request();
    store.reserve(input);
    assert.throws(
      () => store.reserve({ ...input, amountMinor: input.amountMinor + 1 }),
      /IDEMPOTENCY_CONFLICT/,
    );
  });
});

test("same Enawuga transaction cannot reserve a second Telebirr intent", () => {
  withStore(({ store }) => {
    const input = request();
    store.reserve(input);
    assert.throws(
      () =>
        store.reserve(
          request({ transactionId: input.transactionId, customerId: input.customerId }),
        ),
      /TRANSACTION_REPLAY/,
    );
  });
});

test("merchant-order ID and nonce are globally replay protected", () => {
  withStore(({ store }) => {
    const first = request();
    store.reserve(first);
    assert.throws(
      () => store.reserve(request({ merchantOrderId: first.merchantOrderId })),
      /TELEBIRR_MERCHANT_ORDER_REPLAY/,
    );
    assert.throws(
      () => store.reserve(request({ nonce: first.nonce })),
      /TELEBIRR_NONCE_REPLAY/,
    );
  });
});

test("durable snapshot stores correlation intent but no Telebirr secrets or signatures", () => {
  withStore(({ path, store }) => {
    const input = request();
    store.reserve(input);
    const raw = readFileSync(path, "utf8");
    assert.match(raw, new RegExp(input.merchantOrderId));
    assert.match(raw, new RegExp(input.transactionId));
    for (const forbidden of [
      "appSecret",
      "privateKey",
      "accessToken",
      '"sign"',
      "providerPaymentState",
      "callbackPayload",
    ])
      assert.equal(raw.includes(forbidden), false);
  });
});

test("malformed or duplicated persisted correlation state fails closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "telebirr-intent-malformed-"));
  const path = join(directory, "telebirr-preorder-intents.json");
  try {
    writeFileSync(path, JSON.stringify({ version: 1, records: [{ bad: true }] }));
    assert.throws(
      () =>
        new DurableTelebirrPreorderIntentStore(
          new AtomicJsonTelebirrPreorderIntentPersistence(path),
        ),
    );

    const first = request();
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        records: [
          { status: "PREORDER_INTENT_RECORDED", request: first },
          { status: "PREORDER_INTENT_RECORDED", request: first },
        ],
      }),
    );
    assert.throws(
      () =>
        new DurableTelebirrPreorderIntentStore(
          new AtomicJsonTelebirrPreorderIntentPersistence(path),
        ),
      /TELEBIRR_PERSISTED_DUPLICATE_IDEMPOTENCY_KEY/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("unsafe provider correlation identifiers are rejected before persistence", () => {
  withStore(({ store }) => {
    assert.throws(() => store.reserve(request({ merchantOrderId: "ORDER-UNSAFE" })));
    assert.throws(() => store.reserve(request({ nonce: "nonce with spaces" })));
  });
});
