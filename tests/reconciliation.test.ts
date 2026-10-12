import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MockPartnerCallbackVerifier,
  PartnerReconciliationService,
} from "../src/domain/reconciliation";
import { AtomicJsonPartnerReconciliationPersistence } from "../src/server/reconciliation-persistence";
import type { PartnerResult } from "../src/domain/financial";

function partnerResult(
  state: PartnerResult["state"] = "PARTNER_ACCEPTED",
): PartnerResult {
  return {
    transactionId: crypto.randomUUID(),
    customerId: crypto.randomUUID(),
    state,
    accountOwner: "PartnerFI",
    simulated: true,
  };
}

function callback(
  transactionId: string,
  sequence: number,
  eventType:
    | "AUTHORIZATION_ACCEPTED"
    | "AUTHORIZATION_REJECTED"
    | "OUTCOME_UNCERTAIN"
    | "RECONCILIATION_REQUIRED"
    | "SETTLED",
) {
  return {
    callbackId: crypto.randomUUID(),
    transactionId,
    sequence,
    eventType,
    providerReference: `mock-provider-ref-${sequence}`,
    occurredAt: new Date(1791763200000 + sequence * 1000).toISOString(),
  };
}

function signed(
  verifier: MockPartnerCallbackVerifier,
  value: ReturnType<typeof callback>,
) {
  const raw = JSON.stringify(value);
  return { raw, signature: verifier.sign(raw) };
}

test("partner acceptance is explicitly not settlement until authenticated settlement event", () => {
  const verifier = new MockPartnerCallbackVerifier(
      "synthetic-test-secret-only-1234567890",
    ),
    service = new PartnerReconciliationService(verifier),
    result = partnerResult("PARTNER_ACCEPTED"),
    initial = service.registerPartnerResult(result);
  assert.equal(initial.state, "AUTHORIZED_NOT_SETTLED");
  assert.equal(initial.lastProviderSequence, 0);

  const settlement = callback(result.transactionId, 1, "SETTLED"),
    { raw, signature } = signed(verifier, settlement),
    settled = service.handleAuthenticatedCallback(raw, signature);
  assert.equal(settled.state, "SETTLED_BY_PARTNER");
  assert.equal(settled.providerReference, settlement.providerReference);
});

test("invalid signature fails before callback state is applied", () => {
  const verifier = new MockPartnerCallbackVerifier(
      "synthetic-test-secret-only-1234567890",
    ),
    service = new PartnerReconciliationService(verifier),
    result = partnerResult("PARTNER_ACCEPTED"),
    event = callback(result.transactionId, 1, "SETTLED");
  service.registerPartnerResult(result);
  assert.throws(
    () => service.handleAuthenticatedCallback(JSON.stringify(event), "bad"),
    /PARTNER_CALLBACK_AUTH_FAILED/,
  );
  assert.equal(
    service.statusQuery(result.transactionId).state,
    "AUTHORIZED_NOT_SETTLED",
  );
});

test("duplicate callback is idempotent, changed replay conflicts, stale sequence fails", () => {
  const verifier = new MockPartnerCallbackVerifier(
      "synthetic-test-secret-only-1234567890",
    ),
    service = new PartnerReconciliationService(verifier),
    result = partnerResult("RECONCILIATION_REQUIRED"),
    acceptedEvent = callback(
      result.transactionId,
      1,
      "AUTHORIZATION_ACCEPTED",
    ),
    signedAccepted = signed(verifier, acceptedEvent);
  service.registerPartnerResult(result);
  assert.equal(
    service.statusQuery(result.transactionId).state,
    "OUTCOME_UNCERTAIN",
  );
  const accepted = service.handleAuthenticatedCallback(
    signedAccepted.raw,
    signedAccepted.signature,
  );
  assert.equal(accepted.state, "AUTHORIZED_NOT_SETTLED");
  assert.deepEqual(
    service.handleAuthenticatedCallback(
      signedAccepted.raw,
      signedAccepted.signature,
    ),
    accepted,
  );

  const changedReplay = {
      ...acceptedEvent,
      eventType: "AUTHORIZATION_REJECTED" as const,
    },
    changedSigned = signed(verifier, changedReplay);
  assert.throws(
    () =>
      service.handleAuthenticatedCallback(
        changedSigned.raw,
        changedSigned.signature,
      ),
    /PARTNER_CALLBACK_REPLAY_CONFLICT/,
  );

  const stale = callback(result.transactionId, 1, "RECONCILIATION_REQUIRED"),
    staleSigned = signed(verifier, stale);
  assert.throws(
    () => service.handleAuthenticatedCallback(staleSigned.raw, staleSigned.signature),
    /STALE_PARTNER_CALLBACK/,
  );
});

test("terminal settled or rejected state cannot regress", () => {
  const verifier = new MockPartnerCallbackVerifier(
      "synthetic-test-secret-only-1234567890",
    ),
    settledService = new PartnerReconciliationService(verifier),
    acceptedResult = partnerResult("PARTNER_ACCEPTED");
  settledService.registerPartnerResult(acceptedResult);
  const settlement = signed(
    verifier,
    callback(acceptedResult.transactionId, 1, "SETTLED"),
  );
  settledService.handleAuthenticatedCallback(settlement.raw, settlement.signature);
  const regression = signed(
    verifier,
    callback(acceptedResult.transactionId, 2, "OUTCOME_UNCERTAIN"),
  );
  assert.throws(
    () =>
      settledService.handleAuthenticatedCallback(
        regression.raw,
        regression.signature,
      ),
    /TERMINAL_PARTNER_STATE_REGRESSION/,
  );

  const rejectedService = new PartnerReconciliationService(verifier),
    rejectedResult = partnerResult("PARTNER_REJECTED");
  rejectedService.registerPartnerResult(rejectedResult);
  const illegalSettlement = signed(
    verifier,
    callback(rejectedResult.transactionId, 1, "SETTLED"),
  );
  assert.throws(
    () =>
      rejectedService.handleAuthenticatedCallback(
        illegalSettlement.raw,
        illegalSettlement.signature,
      ),
    /TERMINAL_PARTNER_STATE_REGRESSION/,
  );
});

test("reconciliation operation and callback replay state survive restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-reconciliation-")),
    persistence = new AtomicJsonPartnerReconciliationPersistence(
      join(directory, "reconciliation.json"),
    ),
    verifier = new MockPartnerCallbackVerifier(
      "synthetic-test-secret-only-1234567890",
    ),
    result = partnerResult("RECONCILIATION_REQUIRED");
  try {
    const first = new PartnerReconciliationService(verifier, persistence);
    first.registerPartnerResult(result);
    const acceptedEvent = callback(
        result.transactionId,
        1,
        "AUTHORIZATION_ACCEPTED",
      ),
      acceptedSigned = signed(verifier, acceptedEvent);
    first.handleAuthenticatedCallback(
      acceptedSigned.raw,
      acceptedSigned.signature,
    );

    const restarted = new PartnerReconciliationService(verifier, persistence);
    assert.equal(
      restarted.statusQuery(result.transactionId).state,
      "AUTHORIZED_NOT_SETTLED",
    );
    assert.equal(
      restarted.handleAuthenticatedCallback(
        acceptedSigned.raw,
        acceptedSigned.signature,
      ).state,
      "AUTHORIZED_NOT_SETTLED",
    );
    const settledEvent = signed(
      verifier,
      callback(result.transactionId, 2, "SETTLED"),
    );
    assert.equal(
      restarted.handleAuthenticatedCallback(
        settledEvent.raw,
        settledEvent.signature,
      ).state,
      "SETTLED_BY_PARTNER",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("reconciliation audit records outcomes and duplicates without raw callbacks or credentials", async () => {
  const { SyntheticAuditLog } = await import("../src/server/audit"),
    { assertAuditPrivacy } = await import("./helpers/audit-privacy"),
    secret = crypto.randomUUID(), verifier = new MockPartnerCallbackVerifier(secret), audit = new SyntheticAuditLog(),
    service = new PartnerReconciliationService(verifier, undefined, audit), result = partnerResult("RECONCILIATION_REQUIRED");
  service.registerPartnerResult(result);
  const event = callback(result.transactionId, 1, "SETTLED"), message = signed(verifier, event);
  assert.throws(() => service.handleAuthenticatedCallback(message.raw, "wrong"), /AUTH_FAILED/);
  service.handleAuthenticatedCallback(message.raw, message.signature);
  service.handleAuthenticatedCallback(message.raw, message.signature);
  service.statusQuery(result.transactionId);
  const events = audit.list();
  assert.deepEqual(events.map(e => e.action), ["PARTNER_OPERATION_REGISTERED", "PARTNER_CALLBACK_REJECTED", "PARTNER_CALLBACK_APPLIED", "PARTNER_CALLBACK_DUPLICATE", "PARTNER_STATUS_QUERIED"]);
  assert.equal(events[2].stateFrom, "OUTCOME_UNCERTAIN");
  assert.equal(events[2].stateTo, "SETTLED_BY_PARTNER");
  assertAuditPrivacy(events, [secret, message.signature, event.providerReference, message.raw]);
});
