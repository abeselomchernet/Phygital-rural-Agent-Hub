import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CustomerStore } from "../src/domain/customer";
import { KycService, MockFaydaAdapter } from "../src/domain/identity";
import { MockPartnerFI, TransactionService } from "../src/domain/financial";
import { AtomicJsonPartnerLedgerPersistence } from "../src/server/partner-ledger-persistence";

function verifiedCustomer() {
  const store = new CustomerStore(),
    kyc = new KycService(store, new MockFaydaAdapter()),
    customer = store.create("+251900000001");
  kyc.start(customer.customerId);
  kyc.confirm(customer.customerId);
  store.recordMockPhoneVerification(customer.customerId);
  return { store, customer };
}

test("synthetic PartnerFI state survives adapter restart and identical retry", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-ledger-")),
    file = join(directory, "partner-ledger.json");
  try {
    const persistence = new AtomicJsonPartnerLedgerPersistence(file),
      { store, customer } = verifiedCustomer(),
      firstPartner = new MockPartnerFI("accept", persistence);
    store.linkPartnerCustomer(
      customer.customerId,
      firstPartner.lookupPartnerCustomer(customer.customerId),
    );
    const firstService = new TransactionService(store, firstPartner),
      request = {
        transactionId: crypto.randomUUID(),
        customerId: customer.customerId,
        idempotencyKey: crypto.randomUUID(),
        amountMinor: 2500,
        direction: "CASH_IN" as const,
        currency: "ETB" as const,
      };
    const accepted = firstService.submit(request);
    assert.equal(accepted.state, "PARTNER_ACCEPTED");
    assert.equal(
      firstPartner.getAccountSummary(customer.customerId).balanceMinor,
      102500,
    );

    const secondPartner = new MockPartnerFI("accept", persistence),
      secondService = new TransactionService(store, secondPartner);
    assert.equal(
      secondPartner.getAccountSummary(customer.customerId).balanceMinor,
      102500,
    );
    assert.deepEqual(secondService.submit(request), accepted);
    assert.equal(
      secondPartner.getAccountSummary(customer.customerId).balanceMinor,
      102500,
    );
    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(onDisk.version, 1);
    assert.equal(onDisk.results.length, 1);
    assert.equal(onDisk.transactionKeys.length, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("recorded retry is recoverable after later KYC suspension but changed payload conflicts", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-ledger-")),
    file = join(directory, "partner-ledger.json");
  try {
    const persistence = new AtomicJsonPartnerLedgerPersistence(file),
      { store, customer } = verifiedCustomer(),
      partner = new MockPartnerFI("accept", persistence);
    store.linkPartnerCustomer(
      customer.customerId,
      partner.lookupPartnerCustomer(customer.customerId),
    );
    const service = new TransactionService(store, partner),
      request = {
        transactionId: crypto.randomUUID(),
        customerId: customer.customerId,
        idempotencyKey: crypto.randomUUID(),
        amountMinor: 1000,
        direction: "CASH_IN" as const,
        currency: "ETB" as const,
      },
      accepted = service.submit(request);
    store.transition(customer.customerId, "SUSPENDED", "SUSPICIOUS_ACTIVITY");

    const restarted = new TransactionService(
      store,
      new MockPartnerFI("accept", persistence),
    );
    assert.deepEqual(restarted.submit(request), accepted);
    assert.throws(
      () => restarted.submit({ ...request, amountMinor: 1001 }),
      /IDEMPOTENCY_CONFLICT/,
    );
    assert.throws(
      () =>
        restarted.submit({
          ...request,
          transactionId: crypto.randomUUID(),
          idempotencyKey: crypto.randomUUID(),
        }),
      /KYC_OR_RISK_BLOCKED/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("malformed persisted synthetic ledger fails closed", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-ledger-")),
    file = join(directory, "partner-ledger.json");
  try {
    writeFileSync(
      file,
      JSON.stringify({ version: 1, balances: { not-a-uuid: 100 }, results: [], transactionKeys: [] }),
    );
    const persistence = new AtomicJsonPartnerLedgerPersistence(file);
    assert.throws(() => new MockPartnerFI("accept", persistence));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
