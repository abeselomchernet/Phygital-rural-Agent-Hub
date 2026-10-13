import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultNetworkObjectIdsForRole,
  isNetworkOperationsActionAuthorized,
  networkOperationsAccessSummary,
  networkOperationsObjects,
} from "../src/domain/networkOperationsAuthorization";
import {
  SyntheticAuthError,
  SyntheticAuthService,
} from "../src/server/auth";

function expectAuthError(fn: () => unknown, code: string, status: number) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof SyntheticAuthError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

test("network-operations catalog is read-only and bounded to synthetic object refs", () => {
  assert.ok(networkOperationsObjects.length >= 5);
  for (const object of networkOperationsObjects) {
    assert.match(object.objectId, /^synthetic-netobj-/);
    assert.equal(object.mutable, false);
    assert.ok(object.authorityBoundary.length > 0);
  }
});

test("agents receive no Stage 3 network-operations scope", () => {
  assert.deepEqual(defaultNetworkObjectIdsForRole("AGENT"), []);
  const summary = networkOperationsAccessSummary("AGENT");
  assert.equal(summary.every((entry) => !entry.canRead), true);
  assert.equal(summary.every((entry) => !entry.canReconcileProvider), true);
});

test("supervisor and partner admin can read bounded objects, but provider reconcile is limited to the provider object", () => {
  const providerObject = networkOperationsObjects.find(
    (entry) => entry.kind === "PROVIDER_RECONCILIATION",
  );
  const liquidityObject = networkOperationsObjects.find(
    (entry) => entry.kind === "NETWORK_LIQUIDITY",
  );
  assert.ok(providerObject);
  assert.ok(liquidityObject);

  for (const role of ["SUPERVISOR", "PARTNER_ADMIN"] as const) {
    assert.equal(
      isNetworkOperationsActionAuthorized(role, liquidityObject.objectId, "READ"),
      true,
    );
    assert.equal(
      isNetworkOperationsActionAuthorized(
        role,
        providerObject.objectId,
        "RECONCILE_PROVIDER",
      ),
      true,
    );
    assert.equal(
      isNetworkOperationsActionAuthorized(
        role,
        liquidityObject.objectId,
        "RECONCILE_PROVIDER",
      ),
      false,
    );
  }
});

test("server auth enforces both role policy and explicit object scope", () => {
  const auth = new SyntheticAuthService();
  const liquidityObject = networkOperationsObjects.find(
    (entry) => entry.kind === "NETWORK_LIQUIDITY",
  );
  const providerObject = networkOperationsObjects.find(
    (entry) => entry.kind === "PROVIDER_RECONCILIATION",
  );
  assert.ok(liquidityObject);
  assert.ok(providerObject);

  const narrowedSupervisor = auth.createSession(
    "SUPERVISOR",
    ["customer-a"],
    [liquidityObject.objectId],
  );
  auth.requireNetworkObject(narrowedSupervisor, liquidityObject.objectId, "READ");
  expectAuthError(
    () => auth.requireNetworkObject(narrowedSupervisor, providerObject.objectId, "READ"),
    "OBJECT_ACCESS_DENIED",
    403,
  );
  expectAuthError(
    () =>
      auth.requireNetworkObject(
        narrowedSupervisor,
        liquidityObject.objectId,
        "RECONCILE_PROVIDER",
      ),
    "OBJECT_ACCESS_DENIED",
    403,
  );

  const agent = auth.createSession("AGENT", ["customer-a"]);
  expectAuthError(
    () => auth.requireNetworkObject(agent, liquidityObject.objectId, "READ"),
    "OBJECT_ACCESS_DENIED",
    403,
  );
});

test("session view exposes only bounded synthetic network object IDs", () => {
  const auth = new SyntheticAuthService();
  const session = auth.createSession("SUPERVISOR", ["customer-a"]);
  const view = auth.view(session);

  assert.ok(view.allowedNetworkObjectIds.length > 0);
  assert.equal(
    view.allowedNetworkObjectIds.every((objectId) =>
      objectId.startsWith("synthetic-netobj-"),
    ),
    true,
  );
});
