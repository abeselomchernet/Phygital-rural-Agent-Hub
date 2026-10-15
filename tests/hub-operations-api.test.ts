import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";
import { createApp } from "../src/server/app";

type Session = { cookie: string; csrfToken: string };

async function startSession(
  base: string,
  role: "AGENT" | "OPERATIONS" | "PARTNER_ADMIN",
  workspaceKey: string,
): Promise<Session> {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, workspaceKey }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return { cookie, csrfToken: body.csrfToken };
}

function traceUrl(
  base: string,
  input: { hubId: string; correlationId?: string },
) {
  const params = new URLSearchParams({ hubId: input.hubId });
  if (input.correlationId) params.set("correlationId", input.correlationId);
  return `${base}/api/demo/hub-operations/traces?${params}`;
}

async function withServer(
  run: (base: string) => Promise<void>,
) {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    await run(base);
  } finally {
    server.close();
  }
}

test("Hub Operations trace API requires authenticated Operations or Partner Admin scope", async () => {
  await withServer(async (base) => {
    const url = traceUrl(base, { hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED });
    assert.equal((await fetch(url)).status, 401);

    const agent = await startSession(base, "AGENT", "ALPHA_AGENT_ADAMA");
    const denied = await fetch(url, { headers: { Cookie: agent.cookie } });
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "ROLE_ACCESS_DENIED" });
  });
});

test("Operations trace API returns only the authorized Hub and PartnerFI projection", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const response = await fetch(
      traceUrl(base, { hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED }),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.traces.length, 4);
    assert.equal(
      body.traces.every(
        (trace: any) =>
          trace.hubId === SYNTHETIC_HUB_IDS.ADAMA_SHARED &&
          trace.partnerOrgId === SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      ),
      true,
    );
    assert.doesNotMatch(
      JSON.stringify(body),
      new RegExp(SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA),
    );
    assert.doesNotMatch(JSON.stringify(body), /idempotencyKey/i);
  });
});

test("exact correlation search does not reveal a cross-partner trace", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const response = await fetch(
      traceUrl(base, {
        hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
        correlationId: "corr_syn_e1d_beta_001",
      }),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).traces, []);
  });
});

test("Partner Admin receives extra review placeholders, but every placeholder remains non-mutating", async () => {
  await withServer(async (base) => {
    const admin = await startSession(
      base,
      "PARTNER_ADMIN",
      "ALPHA_PARTNER_ADMIN_ADAMA",
    );
    const response = await fetch(
      traceUrl(base, {
        hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
        correlationId: "corr_syn_e1d_alpha_conflict_001",
      }),
      { headers: { Cookie: admin.cookie } },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.traces.length, 1);
    assert.deepEqual(
      body.traces[0].actionPlaceholders.map((entry: any) => entry.action),
      [
        "RECONCILIATION_REVIEW_PLACEHOLDER",
        "CONFLICT_REVIEW_PLACEHOLDER",
        "RESOLUTION_REVIEW_PLACEHOLDER",
      ],
    );
    assert.equal(
      body.traces[0].actionPlaceholders.every(
        (entry: any) =>
          entry.mutationEnabled === false &&
          entry.requiresFutureAuthorization === true,
      ),
      true,
    );
  });
});

test("Operations trace API fails closed for inaccessible Hubs and malformed correlation IDs", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const inaccessible = await fetch(
      traceUrl(base, { hubId: SYNTHETIC_HUB_IDS.ARISI_ALPHA }),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(inaccessible.status, 403);
    assert.deepEqual(await inaccessible.json(), { error: "HUB_ACCESS_DENIED" });

    const malformed = await fetch(
      traceUrl(base, {
        hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
        correlationId: "alpha",
      }),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "DEMO_REQUEST_REJECTED" });
  });
});

test("E1D mounts no mutation action endpoint", async () => {
  await withServer(async (base) => {
    const admin = await startSession(
      base,
      "PARTNER_ADMIN",
      "ALPHA_PARTNER_ADMIN_ADAMA",
    );
    const response = await fetch(`${base}/api/demo/hub-operations/traces`, {
      method: "POST",
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
        "x-csrf-token": admin.csrfToken,
      },
      body: JSON.stringify({ action: "REPROCESS" }),
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "API_NOT_FOUND" });
  });
});
