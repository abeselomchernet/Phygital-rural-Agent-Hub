import { test } from "node:test";
import assert from "node:assert/strict";
import { CustomerStore } from "../src/domain/customer";
import { KycService, MockFaydaAdapter } from "../src/domain/identity";
import { SyntheticAuditLog } from "../src/server/audit";
import { assertAuditPrivacy } from "./helpers/audit-privacy";

test("administrative recovery audits authority denial and recovery without exposing alias or identity payload", () => {
  const audit = new SyntheticAuditLog(), customers = new CustomerStore(undefined, audit),
    customer = customers.create("+251900000001"), kyc = new KycService(customers, new MockFaydaAdapter());
  kyc.start(customer.customerId); kyc.confirm(customer.customerId);
  customers.transition(customer.customerId, "SUSPENDED", "SUSPICIOUS_ACTIVITY");
  assert.throws(() => customers.transition(customer.customerId, "VERIFIED", "ACCOUNT_RECOVERY"), /PARTNER_ADMIN_REQUIRED/);
  assert.throws(() => customers.transition(customer.customerId, "VERIFIED", "ACCOUNT_RECOVERY", "MOCK_PROVIDER"), /PARTNER_ADMIN_REQUIRED/);
  assert.equal(customers.get(customer.customerId).kycStatus, "SUSPENDED");
  customers.transition(customer.customerId, "VERIFIED", "ACCOUNT_RECOVERY", "PARTNER_ADMIN");
  const events = audit.list();
  assert.deepEqual(events.slice(-2).map(e => [e.action, e.outcome]), [
    ["ADMIN_RECOVERY_DENIED", "DENY"], ["ADMIN_RECOVERY_COMPLETED", "SUCCESS"],
  ]);
  assert.equal(events.at(-1)?.actor.role, "PARTNER_ADMIN");
  assert.equal(events.at(-1)?.stateFrom, "SUSPENDED");
  assert.equal(events.at(-1)?.customerId, customer.customerId);
  assertAuditPrivacy(events, ["+251900000001"]);
});
