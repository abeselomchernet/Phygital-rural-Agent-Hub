import assert from "node:assert/strict";
import test from "node:test";
import {
  SYNTHETIC_HUB_IDS,
} from "../src/domain/hub";
import {
  SYNTHETIC_PARTNER_IDS,
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

async function getHub(
  base: string,
  session: Session,
  hubId: string,
  purpose?: string,
) {
  const query = purpose ? `?purpose=${encodeURIComponent(purpose)}` : "";
  return fetch(`${base}/api/demo/hubs/${hubId}${query}`, {
    headers: { Cookie: session.cookie },
  });
}

test("Hub API requires a session and returns role-safe shared-Hub projections", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal(
      (await fetch(`${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}`))
        .status,
      401,
    );

    const alpha = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    assert.deepEqual(alpha.body.workspaceContext.hubAssignments, [
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    ]);
    const alphaResponse = await getHub(
      base,
      alpha,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(alphaResponse.status, 200);
    const alphaHub = await alphaResponse.json();
    assert.equal(alphaHub.hubId, SYNTHETIC_HUB_IDS.ADAMA_SHARED);
    assert.equal(alphaHub.syntheticOnly, true);
    assert.equal(
      alphaHub.partnerMembership.partnerOrgId,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    );
    assert.equal(
      alphaHub.devices.every(
        (device: any) =>
          device.controlEnabled === false &&
          device.providerCommandEnabled === false,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(alphaHub),
      new RegExp(SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA),
    );

    const beta = await startSession(base, {
      role: "AGENT",
      workspaceKey: "BETA_AGENT_ADAMA",
    });
    const betaResponse = await getHub(
      base,
      beta,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(betaResponse.status, 200);
    const betaHub = await betaResponse.json();
    assert.equal(
      betaHub.partnerMembership.partnerOrgId,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
    );
    assert.doesNotMatch(
      JSON.stringify(betaHub),
      new RegExp(SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA),
    );
  } finally {
    server.close();
  }
});

test("Hub API uses one denial response for inaccessible, cross-tenant and unknown Hub IDs", async () => {
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

    for (const hubId of [
      SYNTHETIC_HUB_IDS.ARISI_ALPHA,
      SYNTHETIC_HUB_IDS.DENIAL,
      "hub_syn_unknown_999",
      "not-a-hub-id",
    ]) {
      const response = await getHub(base, alpha, hubId);
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { error: "HUB_ACCESS_DENIED" });
    }
  } finally {
    server.close();
  }
});

test("Hub API enforces purpose and role assignment rather than UI visibility", async () => {
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
    const deniedAdmin = await getHub(
      base,
      agent,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      "HUB_ADMINISTER",
    );
    assert.equal(deniedAdmin.status, 403);
    assert.deepEqual(await deniedAdmin.json(), { error: "HUB_ACCESS_DENIED" });

    const operations = await startSession(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    const review = await getHub(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      "HUB_PARTNER_REVIEW",
    );
    assert.equal(review.status, 200);
    const projection = await review.json();
    assert.equal(projection.purpose, "HUB_PARTNER_REVIEW");
    assert.equal(projection.operatorAssignment.role, "OPERATIONS");

    const invalidPurpose = await getHub(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      "LIVE_SETTLEMENT",
    );
    assert.equal(invalidPurpose.status, 400);
    assert.deepEqual(await invalidPurpose.json(), {
      error: "DEMO_REQUEST_REJECTED",
    });
  } finally {
    server.close();
  }
});
