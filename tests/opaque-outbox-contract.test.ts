import assert from "node:assert/strict";
import test from "node:test";

import {
  OpaqueEnvelopeSchema,
  OpaqueTransactionIntentSchema,
  queueSubjectLabel,
  type QueuedEvent,
} from "../src/lib/ghostsync";

const customerRef = `custref_v1_${"a".repeat(43)}`;

function opaqueEnvelope() {
  return {
    eventId: "7c66b275-1076-44b0-958d-d425c6776f2b",
    schemaVersion: 2 as const,
    createdAt: "2026-10-17T06:00:00.000Z",
    sequence: 1,
    payload: {
      transactionId: "31a2b849-da6e-45ff-882d-a8590c832d2c",
      idempotencyKey: "71817946-af57-4a61-b7ab-b94f45487b1a",
      customerRef,
      amountMinor: 1000,
      direction: "CASH_IN" as const,
      currency: "ETB" as const,
    },
  };
}

test("D4 browser outbox v2 carries opaque customer reference and rejects canonical customerId", () => {
  const parsed = OpaqueEnvelopeSchema.parse(opaqueEnvelope());
  assert.equal(parsed.payload.customerRef, customerRef);
  assert.equal(JSON.stringify(parsed).includes("customerId"), false);

  assert.equal(
    OpaqueTransactionIntentSchema.safeParse({
      ...opaqueEnvelope().payload,
      customerId: "2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b",
    }).success,
    false,
  );
});

test("D4 queue display never renders legacy v1 canonical customer identifier", () => {
  const modern: QueuedEvent = {
    row_key: opaqueEnvelope().eventId,
    type: "transaction",
    payload: opaqueEnvelope(),
    created_at: opaqueEnvelope().createdAt,
    status: "pending",
    retry_count: 0,
    transportState: "QUEUED_FOR_SYNC",
    financialState: "PARTNER_AUTH_PENDING",
  };
  assert.equal(queueSubjectLabel(modern), customerRef);

  const legacy: QueuedEvent = {
    ...modern,
    payload: {
      eventId: "f01c5bf7-1afe-4bcf-84b0-67b8308690ca",
      schemaVersion: 1,
      createdAt: "2026-10-17T05:00:00.000Z",
      sequence: 1,
      payload: {
        transactionId: "7475134f-d512-4cb4-8956-2866a3c891bf",
        idempotencyKey: "d338ca08-ec91-4ded-982d-f4f3bea283cf",
        customerId: "2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b",
        amountMinor: 1000,
        direction: "CASH_IN",
        currency: "ETB",
      },
    },
  };
  assert.equal(queueSubjectLabel(legacy), "Legacy v1 reference quarantined");
  assert.equal(
    queueSubjectLabel(legacy).includes("2cb0c0d7-5567-4f04-a37f-59d8c8af5e4b"),
    false,
  );
});
