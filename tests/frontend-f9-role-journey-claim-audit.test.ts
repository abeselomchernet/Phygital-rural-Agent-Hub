import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const spec = readFileSync(
  new URL("../app/applet/e2e/frontend-f9-role-journeys.spec.ts", import.meta.url),
  "utf8",
);
const plan = readFileSync(
  new URL("../docs/frontend/FRONTEND_DELIVERY_PLAN.md", import.meta.url),
  "utf8",
);
const implementation = readFileSync(
  new URL("../docs/frontend/F9_ROLE_JOURNEY_CLAIM_AUDIT.md", import.meta.url),
  "utf8",
);

test("F9 covers every governed role journey and direct URL denial", () => {
  for (const marker of [
    "ALPHA_AGENT_ADAMA",
    "BETA_AGENT_ADAMA",
    "ALPHA_SUPERVISOR_ADAMA",
    "ALPHA_OPERATIONS_ADAMA",
    "ALPHA_PARTNER_ADMIN_ADAMA",
    "partner-admin-access-denied",
    "partner-ecosystem-access-denied",
  ]) {
    assert.match(spec, new RegExp(marker));
  }
});

test("F9 runtime claim audit persists Stage-4 boundaries into captured screenshots", () => {
  for (const marker of [
    "Synthetic data",
    "No production authority",
    "Stage 4",
    "testInfo.attach",
    "page.screenshot",
    "production approved",
    "regulated pilot approved",
    "settlement complete",
  ]) {
    assert.ok(spec.includes(marker), `missing F9 claim-audit marker: ${marker}`);
  }
  assert.match(implementation, /diagnostic evidence only/i);
  assert.match(implementation, /not.*certification/i);
});

test("F9/F10 completion remains separate from backend E10 and F11 authority", () => {
  assert.match(plan, /F9 - MERGED: end-to-end role journeys and visible claim audit/);
  assert.match(plan, /F10 - MERGED: guided demo and presentation polish/);
  assert.match(plan, /F11 - ACTIVE BOUNDED WORKSTREAM/);
  assert.match(plan, /Backend Epic E10 Inclusion Analytics is not unlocked by frontend work/);
  assert.match(plan, /status does not grant new authority/i);
  assert.match(implementation, /does not unlock backend Epic E10/i);
});
