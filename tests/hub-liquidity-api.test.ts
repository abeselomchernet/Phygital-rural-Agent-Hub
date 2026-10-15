import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";
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

function getLiquidity(base: string, session: Session | null, hubId: string) {
  return fetch(`${base}/api/demo/hubs/${hubId}/liquidity`, {
    headers: session ? { Cookie: session.cookie } : undefined,
  });
}

test("Hub liquidity API requires authentication, Supervisor role and E1A Hub authorization", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal(
      (await getLiquidity(base, null, SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status,
      401,
    );

    const agent = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const roleDenied = await getLiquidity(
      base,
      agent,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(roleDenied.status, 403);
    assert.deepEqual(await roleDenied.json(), { error: "ROLE_ACCESS_DENIED" });

    const supervisor = await startSession(base, {
      role: "SUPERVISOR",
      workspaceKey: "ALPHA_SUPERVISOR_ADAMA",
    });
    const hubDenied = await getLiquidity(
      base,
      supervisor,
      SYNTHETIC_HUB_IDS.ARISI_ALPHA,
    );
    assert.equal(hubDenied.status, 403);
    assert.deepEqual(await hubDenied.json(), { error: "HUB_ACCESS_DENIED" });
  } finally {
    server.close();
  }
});

test("authorized Supervisor receives read-only time-series liquidity intelligence scoped to the active PartnerFI", async () => {
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
    const response = await getLiquidity(
      base,
      supervisor,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.readOnly, true);
    assert.equal(body.timeSeries.hubId, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(
      body.timeSeries.partnerOrgId,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    );
    assert.equal(body.timeSeries.snapshots.length, 3);
    assert.equal(
      body.latestSnapshot.snapshotId,
      body.timeSeries.latestSnapshotId,
    );
    assert.deepEqual(
      body.latestSnapshot.horizons.map((entry: any) => entry.horizon),
      ["2H", "4H", "8H", "EOD"],
    );
    assert.equal(body.latestSnapshot.boundaries.metricIsPrudentialLcr, false);
    assert.equal(body.latestSnapshot.boundaries.liveNetworkAllowed, false);
    assert.equal(body.latestSnapshot.boundaries.cashMovementAuthorized, false);
    assert.equal(body.latestSnapshot.boundaries.fleetDispatchAuthorized, false);
    assert.equal(
      body.latestSnapshot.boundaries.partnerFiPostingAuthorized,
      false,
    );
    assert.equal(
      body.latestSnapshot.boundaries.recommendationExecutesAction,
      false,
    );
  } finally {
    server.close();
  }
});

test("Hub liquidity API remains read-only with no POST action surface", async () => {
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
    const response = await fetch(
      `${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}/liquidity`,
      {
        method: "POST",
        headers: {
          Cookie: supervisor.cookie,
          "Content-Type": "application/json",
          "x-csrf-token": supervisor.csrfToken,
        },
        body: JSON.stringify({ action: "DISPATCH" }),
      },
    );
    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});
