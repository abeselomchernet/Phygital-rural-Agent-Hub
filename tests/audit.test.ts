import { assertAuditPrivacy } from "./helpers/audit-privacy";
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
  for (const action of ["SESSION_CREATED", "SESSION_EXPIRED", "SESSION_REVOKED"] as const) {
    audit.record({
      category: "RECOVERY",
      action,
      outcome: "SUCCESS",
      actor: { userId: "system", role: "SYSTEM" },
    });
  }
  assert.deepEqual(
    audit.list().map((event) => event.action),
    ["SESSION_EXPIRED", "SESSION_REVOKED"],
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
    assertAuditPrivacy(events, ["+251900000001", "123456789012", "9876543210987654"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});


test("privacy assertions allow controlled vocabulary and reject nested fields and raw values", () => {
  assertAuditPrivacy({ category: "FINANCIAL", action: "PHONE_ALIAS_CHANGED" });
  for (const key of ["phone", "FIN", "fan", "csrfToken", "sessionId", "biometrics", "providerPayload"])
    assert.throws(() => assertAuditPrivacy({ events: [{ nested: { [key]: "fixture" } }] }));
  for (const raw of ["+251900000001", "0900000001"])
    assert.throws(() => assertAuditPrivacy({ note: raw }));
  for (const raw of ["123456789012", "9876543210987654", "synthetic-csrf-sentinel"])
    assert.throws(() => assertAuditPrivacy({ note: raw }, [raw]));
});

test("audit schema allows controlled terms but rejects all sensitive fields including nested actors", () => {
  const allowed = { category: "FINANCIAL", action: "PHONE_ALIAS_CHANGED", outcome: "SUCCESS",
    actor: { userId: "synthetic-agent-01", role: "AGENT" } };
  assert.doesNotThrow(() => SyntheticAuditEventInputSchema.parse(allowed));
  for (const key of ["phone", "fin", "fan", "csrfToken", "sessionId", "biometrics", "providerPayload"]) {
    assert.throws(() => SyntheticAuditEventInputSchema.parse({ ...allowed, [key]: "synthetic-sensitive-value" }));
    assert.throws(() => SyntheticAuditEventInputSchema.parse({ ...allowed, actor: { ...allowed.actor, [key]: "synthetic-sensitive-value" } }));
  }
});

test("audit rejects raw values disguised as actor or controlled code", () => {
  const valid = { category: "FINANCIAL", action: "PARTNER_TRANSACTION_SUBMITTED", outcome: "SUCCESS",
    actor: { userId: "synthetic-agent-01", role: "AGENT" } };
  for (const raw of ["+251900000001", "123456789012", "9876543210987654", "RAW_SECRET_VALUE"]) {
    assert.throws(() => SyntheticAuditEventInputSchema.parse({ ...valid, actor: { ...valid.actor, userId: raw } }));
    assert.throws(() => SyntheticAuditEventInputSchema.parse({ ...valid, code: raw }));
  }
});
