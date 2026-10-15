import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("F3 uses scoped Hub APIs for economics and pilot evidence", () => {
  const client = read("src/lib/hub-client.ts");
  assert.match(client, /\/economics/);
  assert.match(client, /\/pilot-evidence/);
  assert.match(client, /HubEconomicsReadModel/);
  assert.match(client, /PilotEvidenceReadModel/);
  assert.match(client, /credentials: "same-origin"/);
});

test("Hub Economics keeps model assumptions, outputs and observed variance distinct", () => {
  const page = read("src/pages/HubEconomics.tsx");
  assert.match(page, /MODEL_ASSUMPTION/);
  assert.match(page, /MODEL_OUTPUT/);
  assert.match(page, /Observed variance/);
  assert.match(page, /UNAVAILABLE/);
  assert.match(page, /not accounting records, observed pilot performance or forecast validation/i);
  assert.match(page, /economicsDigest/);
});

test("Pilot Evidence renders P1-P11 states without approval or scale authority", () => {
  const page = read("src/pages/PilotEvidence.tsx");
  assert.match(page, /P1-P11/);
  assert.match(page, /MEETS_TARGET_UNREVIEWED/);
  assert.match(page, /No authorization issued/);
  assert.match(page, /NO_AUTHORIZED_SCALE_DECISION_STAGE4/);
  assert.match(page, /selfAuthorizedScale is false/);
  assert.match(page, /Missing evidence remains UNKNOWN rather than PASS/);
});

test("management navigation exposes economics and pilot evidence while Agent navigation remains bounded", () => {
  const manifest = read("src/domain/workspaceManifest.ts");
  const agentBlock = manifest.slice(manifest.indexOf('if (input.role === "AGENT")'), manifest.indexOf('if (input.role === "SUPERVISOR")'));
  assert.equal(agentBlock.includes("/hub/economics"), false);
  assert.equal(agentBlock.includes("/hub/pilot-evidence"), false);
  assert.match(manifest, /Hub Economics/);
  assert.match(manifest, /Pilot Evidence/);
});

test("F3 extends evidence details with integrity reference without claiming evidence truth", () => {
  const drawer = read("src/components/EvidenceDrawer.tsx");
  const doc = read("docs/frontend/F3_ECONOMICS_PILOT_IMPLEMENTATION.md");
  assert.match(drawer, /Integrity reference/);
  assert.match(doc, /integrity reference/i);
  assert.match(doc, /does not prove evidence truth/i);
});
