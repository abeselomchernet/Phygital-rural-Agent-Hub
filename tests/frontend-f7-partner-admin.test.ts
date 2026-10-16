import assert from "node:assert/strict";
import test from "node:test";

import { syntheticPartnerOrganizations, syntheticRouteProvenance } from "../src/domain/partnerEcosystem";
import { networkOperationsAccessSummary } from "../src/domain/networkOperationsAuthorization";
import { createApp } from "../src/server/app";

async function startAdmin(base: string) {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "PARTNER_ADMIN", workspaceKey: "ALPHA_PARTNER_ADMIN_ADAMA" }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

test("F7 Partner Admin workspace exposes administration/governance navigation without Agent actions", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const cookie = await startAdmin(base);
    const response = await fetch(base + "/api/demo/workspace", { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    const manifest = await response.json();
    const paths = manifest.navigation.flatMap((group: any) => group.items.map((item: any) => item.path));
    assert.equal(manifest.role, "PARTNER_ADMIN");
    assert.ok(paths.includes("/partner-admin"));
    assert.ok(paths.includes("/hub/neutrality"));
    assert.ok(paths.includes("/partners"));
    assert.ok(paths.includes("/network-operations"));
    assert.equal(paths.includes("/kiosk"), false);
    assert.equal(manifest.boundaries.productionAuthorityGranted, false);
    assert.equal(manifest.boundaries.uiIsAuthorization, false);
  } finally {
    server.close();
  }
});

test("F7 Partner Admin ecosystem visibility follows explicit role evidence and route declarations", () => {
  const visible = syntheticPartnerOrganizations.filter((partner) => partner.authorizedRoles.includes("PARTNER_ADMIN"));
  const ids = visible.map((partner) => partner.partnerOrgId);
  assert.ok(ids.includes("synthetic-partnerfi"));
  assert.ok(ids.includes("synthetic-arifpay-sandbox"));
  assert.ok(ids.includes("synthetic-identity"));
  assert.equal(ids.includes("synthetic-telebirr-direct"), false);
  assert.equal(ids.includes("synthetic-mpesa-ethiopia"), false);
  const permittedRoutes = new Set(visible.flatMap((partner) => partner.permittedRoutes));
  const visibleRoutes = syntheticRouteProvenance.filter((route) => permittedRoutes.has(route.integrationRoute));
  assert.deepEqual(visibleRoutes.map((route) => route.integrationRoute), ["ARIFPAY_SANDBOX_C2B"]);
});

test("F7 Partner Admin network scope remains read-only/non-mutable", () => {
  const access = networkOperationsAccessSummary("PARTNER_ADMIN");
  assert.ok(access.some((entry) => entry.canRead));
  assert.ok(access.every((entry) => entry.mutable === false));
  assert.equal(access.some((entry) => /cash movement|posting authority|dispatch/i.test(entry.authorityBoundary)), true);
});
