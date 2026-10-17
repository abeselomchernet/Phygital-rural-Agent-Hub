import assert from "node:assert/strict";
import test from "node:test";
import {
  currentShowcaseRoles,
  initialWorkspaceRuntime,
  showcaseCapabilityGroups,
  targetShowcaseRoles,
  workspaceFailure,
} from "../src/domain/workspaceRuntime";
import { WorkspaceManifestSchema } from "../src/domain/workspaceManifest";
import { clearCachedDemoSession, demoApi } from "../src/lib/demo-api-client";

test("F11 showcase is explicit and presentation descriptors cannot become workspace manifests", () => {
  assert.equal(initialWorkspaceRuntime(undefined).status, "LOADING");
  assert.equal(initialWorkspaceRuntime("static-showcase").status, "STATIC_SHOWCASE");
  assert.equal(initialWorkspaceRuntime("STATIC_SHOWCASE").status, "LOADING");

  assert.deepEqual(
    currentShowcaseRoles.map((role) => role.role),
    ["AGENT", "SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"],
  );
  assert.deepEqual(
    targetShowcaseRoles.map((role) => role.role),
    ["PARTNERFI_REVIEWER", "AUDITOR", "PILOT_REVIEWER"],
  );

  for (const descriptor of [...currentShowcaseRoles, ...targetShowcaseRoles])
    assert.equal(WorkspaceManifestSchema.safeParse(descriptor).success, false);

  assert.equal(workspaceFailure(new Error("WORKSPACE_API_UNAVAILABLE")).status, "BACKEND_UNAVAILABLE");
  assert.equal(workspaceFailure(new Error("WORKSPACE_ACCESS_DENIED")).status, "ACCESS_DENIED");
  assert.equal(workspaceFailure(new Error("WORKSPACE_SESSION_REQUIRED")).status, "SESSION_REQUIRED");
});

test("F11 static capability architecture preserves eKUB credit firewall", () => {
  const target = showcaseCapabilityGroups.find(
    (group) => group.status === "TARGET_STAGE4_INTERNAL",
  );
  assert.ok(target);
  const ekub = target.items.find((item) => item.includes("eKUB"));
  assert.ok(ekub);
  assert.match(ekub, /prohibited from ARDI and credit decision-support/i);
});

for (const role of ["SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]) {
  test(`F11 Agent API client does not replace an existing ${role} session`, async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    clearCachedDemoSession();
    globalThis.fetch = async (input) => {
      calls.push(String(input));
      return Response.json({ role, csrfToken: "existing", localDevelopmentAuth: true });
    };
    try {
      await assert.rejects(() => demoApi("v2/customer"), /DEMO_ROLE_SESSION_REQUIRED/);
      assert.deepEqual(calls, ["/api/demo/session"]);
    } finally {
      globalThis.fetch = originalFetch;
      clearCachedDemoSession();
    }
  });
}
