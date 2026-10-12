import assert from "node:assert/strict";

// Match complete normalized keys, never substrings of controlled event names.
const prohibitedKeys = new Set([
  "phone", "primaryphone", "phonenumber", "fin", "fan", "biometric", "biometrics",
  "sessionid", "csrftoken", "csrf", "password", "secret", "token", "credentials",
  "rawpayload", "identitypayload", "providerpayload", "providerreference", "idempotencykey",
]);
export function assertAuditPrivacy(value: unknown, rawValues: readonly string[] = []) {
  function visit(item: unknown) {
    if (Array.isArray(item)) return item.forEach(visit);
    if (item && typeof item === "object") {
      for (const [key, child] of Object.entries(item)) {
        assert.ok(!prohibitedKeys.has(key.replace(/[-_]/g, "").toLowerCase()), `Sensitive audit field: ${key}`);
        visit(child);
      }
    } else if (typeof item === "string") {
      assert.doesNotMatch(item, /(?:\+251|00251)[\s-]?[79](?:[\s-]?\d){8}\b|\b0[79](?:[\s-]?\d){8}\b/);
      for (const raw of rawValues) {
        assert.ok(raw.length > 0, "Supply nonempty privacy test sentinels");
        assert.ok(!item.includes(raw), "Sensitive test value found in audit");
      }
    }
  }
  visit(value);
}
