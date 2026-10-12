import { test } from "node:test";
import assert from "node:assert/strict";
import { UnavailableEncryptedEdgeStorage, type SealedEdgeRecord } from "../src/security/edge-storage";

test("edge contract refuses all unsupported encryption and key operations", async () => {
  const storage = new UnavailableEncryptedEdgeStorage({ DATA_MODE: "synthetic" }),
    bytes = new TextEncoder().encode("synthetic fixture only"),
    binding = { deviceId: "demo-device", customerId: crypto.randomUUID(), schemaVersion: 1, sequence: 1 };
  assert.equal(storage.capability, "DISABLED_PENDING_APPROVED_KEY_CUSTODY");
  await assert.rejects(storage.seal("demo-record", bytes, binding), /ENCRYPTED_EDGE_STORAGE_UNAVAILABLE/);
  await assert.rejects(storage.open({} as SealedEdgeRecord), /ENCRYPTED_EDGE_STORAGE_UNAVAILABLE/);
  await assert.rejects(storage.rotateKey(), /ENCRYPTED_EDGE_STORAGE_UNAVAILABLE/);
  await assert.rejects(storage.retireKey("demo-v1"), /ENCRYPTED_EDGE_STORAGE_UNAVAILABLE/);
  assert.equal(new TextDecoder().decode(bytes), "synthetic fixture only");
});

test("edge contract fails closed for regulated mode even when ET is configured", () => {
  for (const residency of [undefined, "ET"])
    assert.throws(() => new UnavailableEncryptedEdgeStorage({ DATA_MODE: "regulated", REGULATED_DATA_RESIDENCY: residency }), /REGULATED/);
});
