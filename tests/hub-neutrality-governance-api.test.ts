import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import { createApp } from "../src/server/app";

type Session = { cookie: string; csrfToken: string; body: any };

async function startSession(
  base: string,
  input: { role: string; workspaceKey: string },
): Promise<Session> {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return { cookie, csrfToken: body.csrfToken, body };
}

function getNeutrality(base: string, session: Session | null, hubId: string) {
  return fetch(`${base}/api/demo/hubs/${hubId}/neutrality-governance`, {
    headers: session ? { Cookie: session.cookie } : undefined,
  });
}

test("Neutrality governance API requires authentication and a privileged governance-review role", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await getNeutrality(base, null, SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status, 401);
    const agent = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const denied = await getNeutrality(base, agent, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "ROLE_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("Supervisor receives bounded scheme-level synthetic neutrality evidence only", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const supervisor = await startSession(base, {
      role: "SUPERVISOR",
      workspaceKey: "ALPHA_SUPERVISOR_ADAMA",
    });
    const response = await getNeutrality(base, supervisor, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.neutrality.length, 1);
    const model = body.neutrality[0];
    assert.equal(model.neutralityState, "NO_SYNTHETIC_EXCEPTION_IDENTIFIED");
    assert.equal(model.routeEquivalenceChecks.length, 2);
    assert.equal(
      model.routeEquivalenceChecks.every(
        (check: any) =>
          check.routeInterchangeable === false &&
          check.fallbackAuthorized === false &&
          check.automaticRouteSelectionAuthorized === false,
      ),
      true,
    );
    assert.equal(model.readBoundary.customerLevelRestrictedDataPresent, false);
    assert.equal(model.readBoundary.crossPartnerCustomerDataExposed, false);
    assert.equal(model.readBoundary.externalAuditEvidencePresent, false);
    assert.equal(model.readBoundary.liveRouteMutationEnabled, false);
    assert.equal(model.readBoundary.productionRoutingAuthorityGranted, false);
    assert.equal(model.readBoundary.regulatedAuthorityGranted, false);
  } finally {
    server.close();
  }
});

test("scheme metadata can compare PartnerFI routes without exposing customer-level objects", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startSession(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    const response = await getNeutrality(base, operations, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(response.status, 200);
    const body = await response.json();
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("org_syn_partnerfi_alpha"), true);
    assert.equal(serialized.includes("org_syn_partnerfi_beta"), true);
    assert.equal(serialized.includes("obj_syn_alpha_customer_001"), false);
    assert.equal(serialized.includes("obj_syn_beta_customer_001"), false);
    assert.equal(body.neutrality[0].readBoundary.crossPartnerCustomerDataExposed, false);
  } finally {
    server.close();
  }
});

test("neutrality access fails closed for a Hub outside the current assignment", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startSession(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    const denied = await getNeutrality(base, operations, SYNTHETIC_HUB_IDS.ARISI_ALPHA);
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "HUB_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("neutrality endpoint is read-only and mounts no policy, routing, conflict or commercial mutation", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const admin = await startSession(base, {
      role: "PARTNER_ADMIN",
      workspaceKey: "ALPHA_PARTNER_ADMIN_ADAMA",
    });
    for (const action of [
      "APPROVE_POLICY_CHANGE",
      "SELECT_ROUTE",
      "ENABLE_FALLBACK",
      "CLEAR_CONFLICT",
      "APPROVE_COMMERCIAL_INCENTIVE",
    ]) {
      const response = await fetch(
        `${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}/neutrality-governance`,
        {
          method: "POST",
          headers: {
            Cookie: admin.cookie,
            "Content-Type": "application/json",
            "x-csrf-token": admin.csrfToken,
          },
          body: JSON.stringify({ action }),
        },
      );
      assert.equal(response.status, 404);
    }
  } finally {
    server.close();
  }
});
