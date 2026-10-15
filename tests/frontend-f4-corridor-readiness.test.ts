import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(path, "utf8");

test("F4 uses scoped Hub APIs for corridor planning and readiness", () => {
  const client = read("src/lib/hub-client.ts");
  assert.match(client, /corridor-planning/);
  assert.match(client, /operator-device-readiness/);
  assert.match(client, /CorridorPlanningReadModel/);
  assert.match(client, /HubOperatorDeviceReadinessReadModel/);
  assert.match(client, /credentials: "same-origin"/);
});

test("Corridor UI preserves recommendation versus geographic authority", () => {
  const page = read("src/pages/CorridorPlanning.tsx");
  assert.match(page, /GEOGRAPHIC_AUTHORIZATION_NOT_GRANTED/);
  assert.match(page, /Geographic authorization: NOT GRANTED/);
  assert.match(page, /No exact coordinates or real partner commitments/);
  assert.match(page, /recommendationOnly is true/);
  assert.match(page, /planningDigest/);
});

test("Readiness UI exposes evidence without device or financial authority", () => {
  const page = read("src/pages/OperatorDeviceReadiness.tsx");
  assert.match(page, /NO_DEVICE_CONTROL_AUTHORITY/);
  assert.match(page, /no remote-control, provider-command or firmware-mutation controls/i);
  assert.match(page, /readinessCreatesFinancialAuthority/);
  assert.match(page, /remoteControlEnabled/);
  assert.match(page, /readinessDigest/);
});

test("management navigation exposes F4 surfaces while Agent navigation remains bounded", () => {
  const manifest = read("src/domain/workspaceManifest.ts");
  const agent = manifest.slice(manifest.indexOf('if (input.role === "AGENT")'), manifest.indexOf('if (input.role === "SUPERVISOR")'));
  assert.equal(agent.includes("/hub/corridor-planning"), false);
  assert.equal(agent.includes("/hub/readiness"), false);
  assert.match(manifest, /Corridor Planning/);
  assert.match(manifest, /Operator & Device Readiness/);
});

test("F4 documents frontend architecture and keeps the Wishland design system", () => {
  const architecture = read("docs/frontend/FRONTEND_ARCHITECTURE.md");
  const brand = read("docs/frontend/WISHLAND_BRAND_AND_DESIGN_SYSTEM.md");
  const implementation = read("docs/frontend/F4_CORRIDOR_READINESS_IMPLEMENTATION.md");
  assert.match(architecture, /F4 extends/);
  assert.match(brand, /--wl-forest-900/);
  assert.match(implementation, /Wishland \/ Enawuga/);
  assert.match(implementation, /not authorization/i);
});