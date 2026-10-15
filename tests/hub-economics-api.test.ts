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

function getEconomics(base: string, session: Session | null, hubId: string) {
  return fetch(`${base}/api/demo/hubs/${hubId}/economics`, {
    headers: session ? { Cookie: session.cookie } : undefined,
  });
}

test("Hub economics API requires authentication and a governed review/supervision role", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal(
      (await getEconomics(base, null, SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status,
      401,
    );
    const agent = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const denied = await getEconomics(
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

test("Alpha Supervisor receives only bounded synthetic model economics", async () => {
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
    const response = await getEconomics(
      base,
      supervisor,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.economics.length, 1);
    const model = body.economics[0];
    assert.equal(model.partnerOrgId, "org_syn_partnerfi_alpha");
    assert.equal(model.evidenceClassAvailability.MODEL_ASSUMPTION, true);
    assert.equal(model.evidenceClassAvailability.MODEL_OUTPUT, true);
    assert.equal(model.evidenceClassAvailability.OBSERVED, false);
    assert.equal(model.evidenceClassAvailability.EXTERNALLY_VERIFIED, false);
    assert.equal(model.modelVsObservedVariance.status, "NOT_AVAILABLE_STAGE4");
    assert.equal(model.readBoundary.modelIsObservedPerformance, false);
    assert.equal(model.readBoundary.forecastAccuracyClaimed, false);
    assert.equal(model.readBoundary.settlementAuthorityGranted, false);
  } finally {
    server.close();
  }
});

test("Operations economics projection stays PartnerFI-isolated on the shared Hub", async () => {
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
    const response = await getEconomics(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.economics.length, 1);
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("hubecon_syn_adama_beta_baseline"), false);
    assert.equal(serialized.includes("svc_beta_"), false);
    assert.equal(
      body.economics[0].revenueAttribution.every((item: any) =>
        item.serviceId.startsWith("svc_alpha_"),
      ),
      true,
    );
  } finally {
    server.close();
  }
});

test("Hub economics access fails closed when current Hub assignment does not authorize the request", async () => {
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
    const denied = await getEconomics(base, operations, SYNTHETIC_HUB_IDS.ARISI_ALPHA);
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "HUB_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("Hub economics endpoint is read-only and mounts no mutation surface", async () => {
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
      `${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}/economics`,
      {
        method: "POST",
        headers: {
          Cookie: admin.cookie,
          "Content-Type": "application/json",
          "x-csrf-token": admin.csrfToken,
        },
        body: JSON.stringify({ action: "ACCEPT_MODEL" }),
      },
    );
    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});
