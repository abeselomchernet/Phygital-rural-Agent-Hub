import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("F2 loads governed Hub services through a typed same-origin client", () => {
  const client = read("src/lib/hub-client.ts");
  assert.match(client, /HubServiceWorkspaceManifest/);
  assert.match(client, /\/api\/demo\/hubs\/\$\{encodeURIComponent\(hubId\)\}\/services/);
  assert.match(client, /credentials: "same-origin"/);
  assert.match(client, /HUB_ACCESS_DENIED/);
});

test("F2 provides shared evidence and governed-status components", () => {
  const drawer = read("src/components/EvidenceDrawer.tsx");
  const status = read("src/components/GovernedStatus.tsx");
  assert.match(drawer, /Classification/);
  assert.match(drawer, /Evidence references/);
  assert.match(drawer, /Limitation/);
  assert.match(drawer, /Authority implication/);
  assert.match(status, /REVIEW/);
  assert.match(status, /UNKNOWN/);
  assert.match(status, /DENIED/);
});

test("Hub overview keeps unavailable evidence explicit and preserves authority boundaries", () => {
  const overview = read("src/pages/HubOverview.tsx");
  assert.match(overview, /UNAVAILABLE/);
  assert.match(overview, /missing data remains unavailable rather than being fabricated/i);
  assert.match(overview, /UI is not authorization/);
  assert.match(overview, /Provider success is not settlement/);
  assert.match(overview, /No live funds, settlement, geographic authorization/);
  assert.match(overview, /View evidence/);
});
