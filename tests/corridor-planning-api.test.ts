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

function getCorridorPlanning(
  base: string,
  session: Session | null,
  hubId: string,
) {
  return fetch(`${base}/api/demo/hubs/${hubId}/corridor-planning`, {
    headers: session ? { Cookie: session.cookie } : undefined,
  });
}

test("Corridor Planning API requires authentication and a governed review/supervision role", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal(
      (await getCorridorPlanning(base, null, SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status,
      401,
    );
    const agent = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const denied = await getCorridorPlanning(
      base,
      agent,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "ROLE_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("Alpha Supervisor receives only bounded Stage-4 corridor planning evidence", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const supervisor = await startSession(base, {
      role: "SUPERVISOR",
      workspaceKey: "ALPHA_SUPERVISOR_ADAMA",
    });
    const response = await getCorridorPlanning(
      base,
      supervisor,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.plans.length, 1);
    const plan = body.plans[0];
    assert.equal(plan.partnerOrgId, "org_syn_partnerfi_alpha");
    assert.equal(plan.boundedExpansionRecommendation.recommendationOnly, true);
    assert.equal(
      plan.boundedExpansionRecommendation.geographicAuthorizationGranted,
      false,
    );
    assert.equal(plan.boundedExpansionRecommendation.expansionAuthorized, false);
    assert.equal(plan.readBoundary.syntheticOnly, true);
    assert.equal(plan.readBoundary.realDemandDataPresent, false);
    assert.equal(plan.readBoundary.realLiquidityDataPresent, false);
    assert.equal(plan.readBoundary.externalEvidenceAccepted, false);
    assert.equal(plan.readBoundary.regulatedPilotAuthorityGranted, false);
    assert.equal(JSON.stringify(body).includes("corridor_plan_syn_beta_adama"), false);
  } finally {
    server.close();
  }
});

test("Operations corridor projection stays PartnerFI-isolated on the shared Hub", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startSession(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    const response = await getCorridorPlanning(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.plans.length, 1);
    assert.equal(body.plans[0].partnerOrgId, "org_syn_partnerfi_alpha");
    assert.equal(JSON.stringify(body).includes("org_syn_partnerfi_beta"), false);
  } finally {
    server.close();
  }
});

test("Corridor Planning access fails closed for a Hub outside the current assignment", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startSession(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    const denied = await getCorridorPlanning(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ARISI_ALPHA,
    );
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "HUB_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("Corridor Planning endpoint is read-only and mounts no geographic approval mutation surface", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const admin = await startSession(base, {
      role: "PARTNER_ADMIN",
      workspaceKey: "ALPHA_PARTNER_ADMIN_ADAMA",
    });
    const response = await fetch(
      `${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}/corridor-planning`,
      {
        method: "POST",
        headers: {
          Cookie: admin.cookie,
          "Content-Type": "application/json",
          "x-csrf-token": admin.csrfToken,
        },
        body: JSON.stringify({ action: "APPROVE_GEOGRAPHIC_EXPANSION" }),
      },
    );
    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});
