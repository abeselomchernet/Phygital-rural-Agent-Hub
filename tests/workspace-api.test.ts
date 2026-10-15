import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/server/app";

type Session = { cookie: string; csrfToken: string };

async function startWorkspace(
  base: string,
  input: { role: string; workspaceKey: string },
): Promise<{ response: Response; session?: Session }> {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return { response };
  const body = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return {
    response,
    session: { cookie, csrfToken: body.csrfToken },
  };
}

async function workspace(base: string, session: Session) {
  const response = await fetch(base + "/api/demo/workspace", {
    headers: { Cookie: session.cookie },
  });
  assert.equal(response.status, 200);
  return response.json();
}

test("workspace API is authenticated and Alpha/Beta Agent manifests differ without UI forks", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.equal((await fetch(base + "/api/demo/workspace")).status, 401);

    const alpha = await startWorkspace(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_AGENT_ADAMA",
    });
    assert.ok(alpha.session);
    const alphaWorkspace = await workspace(base, alpha.session);
    assert.equal(alphaWorkspace.role, "AGENT");
    assert.equal(alphaWorkspace.hubId, "hub_syn_adama_001");
    assert.match(alphaWorkspace.partnerDisplayName, /Alpha/);
    assert.deepEqual(
      alphaWorkspace.services.map((service: any) => service.name),
      ["Account Lookup", "Cash In", "Cash Out"],
    );

    const beta = await startWorkspace(base, {
      role: "AGENT",
      workspaceKey: "BETA_AGENT_ADAMA",
    });
    assert.ok(beta.session);
    const betaWorkspace = await workspace(base, beta.session);
    assert.match(betaWorkspace.partnerDisplayName, /Beta/);
    assert.equal(betaWorkspace.hubId, "hub_syn_adama_001");
    assert.deepEqual(
      betaWorkspace.services.map((service: any) => service.name),
      ["Account Lookup", "Savings Inquiry", "Savings Service Request"],
    );
    assert.equal(
      betaWorkspace.services.some((service: any) => service.name === "Cash In"),
      false,
    );
  } finally {
    server.close();
  }
});

test("workspace key cannot be used to self-assert another role", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const result = await startWorkspace(base, {
      role: "AGENT",
      workspaceKey: "ALPHA_PARTNER_ADMIN_ADAMA",
    });
    assert.equal(result.response.status, 403);
    assert.equal((await result.response.json()).error, "ROLE_ACCESS_DENIED");
  } finally {
    server.close();
  }
});

test("Operations workspace exposes provider readiness but no Agent cash services", async () => {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startWorkspace(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    assert.ok(operations.session);
    const manifest = await workspace(base, operations.session);
    assert.equal(manifest.role, "OPERATIONS");
    assert.equal(manifest.hubId, "hub_syn_adama_001");
    assert.deepEqual(manifest.services, []);
    const providers = Object.fromEntries(
      manifest.providerStates.map((provider: any) => [provider.providerKey, provider]),
    );
    assert.equal(providers.TELEBIRR_DIRECT.environment, "testbed");
    assert.equal(providers.TELEBIRR_DIRECT.runtimeMode, "FOUNDATION_ONLY");
    assert.equal(providers.TELEBIRR_DIRECT.routeState, "NOT_MOUNTED");
    assert.equal(providers.MPESA_ETHIOPIA_DIRECT.environment, "sandbox");
    assert.equal(providers.MPESA_ETHIOPIA_DIRECT.runtimeMode, "FOUNDATION_ONLY");
    assert.equal(providers.MPESA_ETHIOPIA_DIRECT.routeState, "NOT_MOUNTED");
  } finally {
    server.close();
  }
});

test("privileged workspace roles remain disabled by default", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const operations = await startWorkspace(base, {
      role: "OPERATIONS",
      workspaceKey: "ALPHA_OPERATIONS_ADAMA",
    });
    assert.equal(operations.response.status, 403);
    assert.equal(
      (await operations.response.json()).error,
      "PRIVILEGED_SYNTHETIC_ROLE_DISABLED",
    );
  } finally {
    server.close();
  }
});
