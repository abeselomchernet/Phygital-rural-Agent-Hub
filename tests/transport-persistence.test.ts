import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CustomerStore } from "../src/domain/customer";
import { KycService, MockFaydaAdapter } from "../src/domain/identity";
import { MockPartnerFI, TransactionService } from "../src/domain/financial";
import { MockTransportReceiver } from "../src/domain/transport";
import { AtomicJsonTransportPersistence } from "../src/server/transport-persistence";

function fixture() {
  const customers = new CustomerStore(),
    kyc = new KycService(customers, new MockFaydaAdapter()),
    customer = customers.create("+251900000001"),
    partner = new MockPartnerFI();
  kyc.start(customer.customerId);
  kyc.confirm(customer.customerId);
  customers.recordMockPhoneVerification(customer.customerId);
  customers.linkPartnerCustomer(
    customer.customerId,
    partner.lookupPartnerCustomer(customer.customerId),
  );
  return {
    customerId: customer.customerId,
    transactions: new TransactionService(customers, partner),
  };
}

function envelope(customerId: string, sequence = 1) {
  return {
    eventId: crypto.randomUUID(),
    schemaVersion: 1 as const,
    createdAt: new Date("2026-10-12T00:00:00.000Z").toISOString(),
    sequence,
    payload: {
      transactionId: crypto.randomUUID(),
      customerId,
      idempotencyKey: crypto.randomUUID(),
      amountMinor: 1000,
      direction: "CASH_IN" as const,
      currency: "ETB" as const,
    },
  };
}

test("transport duplicate receipt and sequence survive receiver restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-transport-")),
    file = join(directory, "transport.json"),
    persistence = new AtomicJsonTransportPersistence(file),
    now = () => Date.parse("2026-10-12T00:01:00.000Z"),
    { customerId, transactions } = fixture(),
    firstEvent = envelope(customerId, 1);
  try {
    const first = new MockTransportReceiver(transactions, { now, persistence }),
      receipt = first.receive(firstEvent);
    assert.equal(receipt.transportState, "RECEIVED_BY_PLATFORM");
    assert.notEqual(receipt.financialState, "PARTNER_AUTH_PENDING");

    const restarted = new MockTransportReceiver(transactions, {
      now,
      persistence,
    });
    assert.deepEqual(restarted.receive(firstEvent), receipt);
    assert.throws(
      () =>
        restarted.receive({
          ...firstEvent,
          payload: { ...firstEvent.payload, amountMinor: 1001 },
        }),
      /EVENT_REPLAY_CONFLICT/,
    );

    const third = envelope(customerId, 3);
    assert.throws(
      () => restarted.receive(third),
      /OUT_OF_ORDER_RETRY_REQUIRED/,
    );
    const second = envelope(customerId, 2);
    assert.equal(
      restarted.receive(second).transportState,
      "RECEIVED_BY_PLATFORM",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("expired retained receipt becomes replay tombstone instead of reposting", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-transport-")),
    file = join(directory, "transport.json"),
    persistence = new AtomicJsonTransportPersistence(file),
    clock = { value: Date.parse("2026-10-12T00:01:00.000Z") },
    now = () => clock.value,
    { customerId, transactions } = fixture(),
    event = envelope(customerId, 1),
    receiptRetentionMs = 1_000,
    tombstoneRetentionMs = 60_000;
  try {
    const first = new MockTransportReceiver(transactions, {
      now,
      persistence,
      receiptRetentionMs,
      tombstoneRetentionMs,
    });
    first.receive(event);
    clock.value += 2_000;

    const restarted = new MockTransportReceiver(transactions, {
      now,
      persistence,
      receiptRetentionMs,
      tombstoneRetentionMs,
    });
    assert.throws(() => restarted.receive(event), /EVENT_REPLAY_TOMBSTONED/);
    assert.equal(restarted.snapshot().tombstones.length, 1);
    assert.equal(restarted.snapshot().sequence[0]?.lastSequence, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("malformed durable transport state fails closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-transport-")),
    file = join(directory, "transport.json"),
    { transactions } = fixture();
  try {
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        receipts: [],
        sequence: [{ customerId: "not-a-uuid", lastSequence: 1 }],
        tombstones: [],
      }),
    );
    assert.throws(
      () =>
        new MockTransportReceiver(transactions, {
          persistence: new AtomicJsonTransportPersistence(file),
        }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
