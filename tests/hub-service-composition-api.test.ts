import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";
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

function getServices(base: string, session: Session | null, hubId: string) {
  return fetch(`${base}/api/demo/hubs/${hubId}/services`, {
    headers: session ? { Cookie: session.cookie } : undefined,
  });
}

test("Hub service composition API requires authentication and E1A Hub authorization", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal(
      (await getServices(base, null, SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status,
      401,
    );

    const alpha = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    for (const hubId of [
      SYNTHETIC_HUB_IDS.ARISI_ALPHA,
      SYNTHETIC_HUB_IDS.DENIAL,
      "hub_syn_unknown_999",
    ]) {
      const response = await getServices(base, alpha, hubId);
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { error: "HUB_ACCESS_DENIED" });
    }
  } finally {
    server.close();
  }
});

test("shared Hub API projects only the active PartnerFI service composition", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const alpha = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const alphaResponse = await getServices(
      base,
      alpha,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(alphaResponse.status, 200);
    const alphaBody = await alphaResponse.json();
    assert.equal(alphaBody.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA);
    assert.deepEqual(
      alphaBody.offerings.map((entry: any) => entry.serviceId),
      [
        SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
        SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
        SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
      ],
    );
    assert.equal(
      JSON.stringify(alphaBody).includes(SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY),
      false,
    );

    const beta = await startSession(base, {
      role: "AGENT",
      workspaceKey: "BETA_AGENT_ADAMA",
    });
    const betaResponse = await getServices(
      base,
      beta,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(betaResponse.status, 200);
    const betaBody = await betaResponse.json();
    assert.equal(betaBody.partnerOrgId, SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA);
    assert.deepEqual(
      betaBody.offerings.map((entry: any) => entry.serviceId),
      [
        SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
        SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
        SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
      ],
    );
    assert.equal(
      JSON.stringify(betaBody).includes(SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN),
      false,
    );
  } finally {
    server.close();
  }
});

test("Supervisor Hub composition is capability-driven and exposes only NLC for the current scope", async () => {
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
    const response = await getServices(
      base,
      supervisor,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(
      body.offerings.map((entry: any) => entry.serviceId),
      [SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ],
    );
    assert.equal(body.boundaries.uiPresenceIsCapabilityEvidence, false);
    assert.equal(body.boundaries.liveNetworkAllowed, false);
    assert.equal(body.boundaries.productionAuthorityGranted, false);
  } finally {
    server.close();
  }
});

test("Hub composition endpoint is read-only and does not create a mutation surface", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const agent = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const response = await fetch(
      `${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}/services`,
      {
        method: "POST",
        headers: {
          Cookie: agent.cookie,
          "Content-Type": "application/json",
          "x-csrf-token": agent.csrfToken,
        },
        body: JSON.stringify({ serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN }),
      },
    );
    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});
