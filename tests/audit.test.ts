import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SyntheticAuditEventInputSchema,
  SyntheticAuditLog,
} from "../src/server/audit";
import { AtomicJsonSyntheticAuditPersistence } from "../src/server/audit-persistence";

test("audit schema rejects raw phone and identity-like payload fields", () => {
  assert.throws(
    () =>
      SyntheticAuditEventInputSchema.parse({
        category: "CUSTOMER",
        action: "PHONE_ALIAS_CHANGED",
        outcome: "SUCCESS",
        actor: { userId: "synthetic-agent-01", role: "AGENT" },
        phone: "+251900000001",
      }),
  );
  assert.throws(
    () =>
      SyntheticAuditEventInputSchema.parse({
        category: "KYC",
        action: "KYC_VERIFIED",
        outcome: "SUCCESS",
        actor: { userId: "synthetic-agent-01", role: "AGENT" },
        fin: "123456789012",
      }),
  );
});

test("audit retention keeps only the configured newest events", () => {
  const audit = new SyntheticAuditLog(undefined, 2);
  for (const action of ["FIRST", "SECOND", "THIRD"]) {
    audit.record({
      category: "RECOVERY",
      action,
      outcome: "SUCCESS",
      actor: { userId: "system", role: "SYSTEM" },
    });
  }
  assert.deepEqual(
    audit.list().map((event) => event.action),
    ["SECOND", "THIRD"],
  );
});

test("redacted synthetic audit state survives local restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-audit-")),
    persistence = new AtomicJsonSyntheticAuditPersistence(
      join(directory, "audit.json"),
    ),
    customerId = crypto.randomUUID(),
    transactionId = crypto.randomUUID();
  try {
    const first = new SyntheticAuditLog(persistence, 10);
    first.record({
      category: "FINANCIAL",
      action: "PARTNER_TRANSACTION_SUBMITTED",
      outcome: "SUCCESS",
      actor: { userId: "synthetic-agent-01", role: "AGENT" },
      customerId,
      transactionId,
      stateTo: "PARTNER_ACCEPTED",
    });

    const restarted = new SyntheticAuditLog(persistence, 10),
      events = restarted.list();
    assert.equal(events.length, 1);
    assert.equal(events[0].customerId, customerId);
    assert.equal(events[0].transactionId, transactionId);
    const serialized = JSON.stringify(events);
    assert.doesNotMatch(serialized, /phone|FIN|FAN|biometric|csrf|sessionId/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
