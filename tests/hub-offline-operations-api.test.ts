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

function getOfflineEvidence(
  base: string,
  session: Session | null,
  hubId: string,
  correlationId?: string,
) {
  const query = new URLSearchParams({ hubId });
  if (correlationId) query.set("correlationId", correlationId);
  return fetch(`${base}/api/demo/hub-operations/offline-evidence?${query}`, {
    headers: session ? { Cookie: session.cookie } : undefined,
  });
}

test("offline Operations evidence API requires authentication plus Operations or Partner Admin role", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal(
      (await getOfflineEvidence(base, null, SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status,
      401,
    );

    const agent = await startSession(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    const denied = await getOfflineEvidence(
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

test("authorized Alpha Operations sees only Alpha offline evidence with role-safe projections", async () => {
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
    const response = await getOfflineEvidence(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.ok(body.traces.length >= 7);
    assert.equal(
      body.traces.every((entry: any) => entry.partnerOrgId === "org_syn_partnerfi_alpha"),
      true,
    );
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes("corr_syn_e4_beta_001"), false);
    assert.equal(serialized.includes("idempotencyKey"), false);
    assert.equal(serialized.includes('"facts"'), false);
    assert.equal(serialized.includes("rawProviderPayload"), false);
    assert.equal(
      body.traces.every(
        (entry: any) =>
          entry.readBoundary.readOnly === true &&
          entry.readBoundary.rawIntentFactsExposed === false &&
          entry.readBoundary.rawIdempotencyKeyExposed === false &&
          entry.readBoundary.mutationAuthorityGranted === false &&
          entry.readBoundary.settlementAuthorityGranted === false,
      ),
      true,
    );
  } finally {
    server.close();
  }
});

test("exact correlation lookup exposes duplicate/conflict/reconciliation evidence without fuzzy matching", async () => {
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
    const conflictResponse = await getOfflineEvidence(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      "corr_syn_e4_conflict_001",
    );
    assert.equal(conflictResponse.status, 200);
    const conflict = await conflictResponse.json();
    assert.equal(conflict.traces.length, 1);
    assert.equal(conflict.traces[0].conflictObserved, true);
    assert.equal(conflict.traces[0].latestOutcome, "CONFLICT_REVIEW_REQUIRED");

    const malformed = await getOfflineEvidence(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      "conflict",
    );
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "DEMO_REQUEST_REJECTED" });
  } finally {
    server.close();
  }
});

test("shared-Hub cross-partner correlation lookup returns no result after Alpha scope is established", async () => {
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
    const response = await getOfflineEvidence(
      base,
      operations,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      "corr_syn_e4_beta_001",
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.traces, []);
  } finally {
    server.close();
  }
});

test("Partner Admin may read the same bounded evidence but still receives no mutation authority", async () => {
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
    const response = await getOfflineEvidence(
      base,
      admin,
      SYNTHETIC_HUB_IDS.ADAMA_SHARED,
      "corr_syn_e4_ambiguous_001",
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.traces.length, 1);
    assert.equal(body.traces[0].reconciliationRequired, true);
    assert.equal(body.traces[0].readBoundary.mutationAuthorityGranted, false);
    assert.equal(body.traces[0].readBoundary.settlementAuthorityGranted, false);
  } finally {
    server.close();
  }
});

test("offline Operations evidence endpoint is read-only with no replay/sync mutation route", async () => {
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
    const response = await fetch(
      `${base}/api/demo/hub-operations/offline-evidence?hubId=${SYNTHETIC_HUB_IDS.ADAMA_SHARED}`,
      {
        method: "POST",
        headers: {
          Cookie: operations.cookie,
          "Content-Type": "application/json",
          "x-csrf-token": operations.csrfToken,
        },
        body: JSON.stringify({ action: "REPLAY" }),
      },
    );
    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});
