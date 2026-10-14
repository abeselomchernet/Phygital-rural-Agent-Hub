import assert from "node:assert/strict";
import test from "node:test";
import { SYNTHETIC_HUB_IDS } from "../src/domain/hubDomain";
import { createApp } from "../src/server/app";

type Session = { cookie: string; csrfToken: string; allowedHubIds: string[] };

async function startSession(base: string, role: "AGENT" | "SUPERVISOR" | "PARTNER_ADMIN" = "AGENT"): Promise<Session> {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const body = await response.json();
  return { cookie, csrfToken: body.csrfToken, allowedHubIds: body.allowedHubIds };
}

const get = (base: string, session: Session, path: string) =>
  fetch(base + path, { headers: { Cookie: session.cookie } });

test("Hub API is authenticated, read-only and server-scoped", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(base + "/api/demo/hubs")).status, 401);

    const agent = await startSession(base, "AGENT");
    assert.deepEqual(agent.allowedHubIds, [SYNTHETIC_HUB_IDS.ADAMA_A]);

    const listResponse = await get(base, agent, "/api/demo/hubs");
    assert.equal(listResponse.status, 200);
    const list = await listResponse.json();
    assert.deepEqual(list.hubs.map((hub: any) => hub.hubId), [SYNTHETIC_HUB_IDS.ADAMA_A]);
    assert.equal(list.hubs[0].regulatedAuthorityGranted, false);
    assert.equal(list.hubs[0].dataMode, "SYNTHETIC_ONLY");
    assert.match(list.authorityBoundary, /read-only synthetic/i);

    const ownHubResponse = await get(base, agent, `/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_A}`);
    assert.equal(ownHubResponse.status, 200);
    const ownHub = await ownHubResponse.json();
    assert.equal(ownHub.hub.hubId, SYNTHETIC_HUB_IDS.ADAMA_A);
    assert.equal(ownHub.devices.every((device: any) => device.containsRealCustomerData === false), true);
    assert.equal(ownHub.partnerMemberships.every((membership: any) => membership.activationState === "SIMULATION_ONLY"), true);

    assert.equal((await get(base, agent, `/api/demo/hubs/${SYNTHETIC_HUB_IDS.ARISI_A}`)).status, 403);
    assert.equal((await get(base, agent, "/api/demo/hubs/not-a-uuid")).status, 400);

    const supervisor = await startSession(base, "SUPERVISOR");
    assert.deepEqual(supervisor.allowedHubIds, [SYNTHETIC_HUB_IDS.ADAMA_A]);
    assert.equal((await get(base, supervisor, `/api/demo/hubs/${SYNTHETIC_HUB_IDS.ARISI_A}`)).status, 403);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
