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

function getReadiness(base: string, session: Session | null, hubId: string) {
  return fetch(`${base}/api/demo/hubs/${hubId}/operator-device-readiness`, {
    headers: session ? { Cookie: session.cookie } : undefined,
  });
}

test("Operator/device readiness API requires authentication and privileged review role", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await getReadiness(base, null, SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status, 401);
    const agent = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const denied = await getReadiness(base, agent, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "ROLE_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("Alpha Supervisor receives bounded synthetic readiness without device control authority", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const supervisor = await startSession(base, {
      role: "SUPERVISOR",
      workspaceKey: "ALPHA_SUPERVISOR_ADAMA",
    });
    const response = await getReadiness(base, supervisor, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.readiness.length, 1);
    const model = body.readiness[0];
    assert.equal(model.partnerOrgId, "org_syn_partnerfi_alpha");
    assert.equal(model.overallState, "REVIEW_REQUIRED");
    assert.equal(model.readBoundary.syntheticOnly, true);
    assert.equal(model.readBoundary.realOperatorIdentityPresent, false);
    assert.equal(model.readBoundary.realDeviceTelemetryPresent, false);
    assert.equal(model.readBoundary.productionDeviceControlEnabled, false);
    assert.equal(model.readBoundary.remoteCommandsEnabled, false);
    assert.equal(model.readBoundary.regulatedAuthorityGranted, false);
    assert.equal(
      model.deviceReadiness.every(
        (device: any) =>
          device.authority.remoteControlEnabled === false &&
          device.authority.providerCommandEnabled === false &&
          device.authority.firmwareMutationEnabled === false,
      ),
      true,
    );
  } finally {
    server.close();
  }
});

test("Operations readiness projection remains PartnerFI-isolated on shared Hub", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startSession(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    const response = await getReadiness(base, operations, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readiness.length, 1);
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("readiness_plan_syn_adama_beta"), false);
    assert.equal(serialized.includes("hubop_syn_adama_beta_agents"), false);
  } finally {
    server.close();
  }
});

test("Readiness access fails closed when current Hub assignment does not authorize request", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startSession(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    const denied = await getReadiness(base, operations, SYNTHETIC_HUB_IDS.ARISI_ALPHA);
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "HUB_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("readiness endpoint is read-only and mounts no suspend, certify, device-command or return-to-service mutation", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const admin = await startSession(base, {
      role: "PARTNER_ADMIN",
      workspaceKey: "ALPHA_PARTNER_ADMIN_ADAMA",
    });
    for (const action of [
      "CERTIFY_OPERATOR",
      "SUSPEND_OPERATOR",
      "RETURN_TO_SERVICE",
      "SEND_DEVICE_COMMAND",
    ]) {
      const response = await fetch(
        `${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}/operator-device-readiness`,
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
