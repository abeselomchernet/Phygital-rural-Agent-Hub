import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("F5 uses scoped read APIs for neutrality and offline/reconciliation evidence", () => {
  const client = read("src/lib/hub-client.ts");
  assert.match(client, /neutrality-governance/);
  assert.match(client, /hub-operations\/offline-evidence/);
  assert.match(client, /HubNeutralityGovernanceReadModel/);
  assert.match(client, /HubOfflineEvidenceTrace/);
  assert.match(client, /credentials: "same-origin"/);
});

test("Neutrality UX preserves governance review versus route authority", () => {
  const page = read("src/pages/NeutralityGovernance.tsx");
  assert.match(page, /Route interchangeable: no/);
  assert.match(page, /Fallback authorized: no/);
  assert.match(page, /Automatic route selection: no/);
  assert.match(page, /NO_ROUTE_MUTATION_AUTHORITY/);
  assert.match(page, /not production neutrality, independent audit assurance or provider interchangeability/i);
  assert.match(page, /neutralityDigest/);
});

test("Operations Evidence keeps queue and transport separate from settlement authority", () => {
  const page = read("src/pages/OperationsEvidence.tsx");
  assert.match(page, /Local persistence and transport acceptance remain separate from financial authority and settlement/);
  assert.match(page, /Client queue records are untrusted intent/);
  assert.match(page, /Transport is not settlement/);
  assert.match(page, /raw intent facts, raw idempotency keys, credentials and provider payloads are excluded/i);
});

test("role navigation exposes F5 surfaces only to intended management roles", () => {
  const manifest = read("src/domain/workspaceManifest.ts");
  const agentBlock = manifest.slice(manifest.indexOf('if (input.role === "AGENT")'), manifest.indexOf('if (input.role === "SUPERVISOR")'));
  const supervisorBlock = manifest.slice(manifest.indexOf('if (input.role === "SUPERVISOR")'), manifest.indexOf('if (input.role === "OPERATIONS")'));
  const operationsBlock = manifest.slice(manifest.indexOf('if (input.role === "OPERATIONS")'), manifest.indexOf('return [', manifest.indexOf('if (input.role === "OPERATIONS")')));
  assert.equal(agentBlock.includes("/hub/neutrality"), false);
  assert.equal(agentBlock.includes("/operations/evidence"), false);
  assert.ok(supervisorBlock.includes("/hub/neutrality"));
  assert.equal(supervisorBlock.includes("/operations/evidence"), false);
  assert.ok(operationsBlock.includes("/hub/neutrality"));
  assert.ok(operationsBlock.includes("/operations/evidence"));
  assert.match(manifest, /Offline & Reconciliation Evidence/);
});

test("F5 architecture documentation preserves evidence/non-authority boundaries", () => {
  const doc = read("docs/frontend/F5_NEUTRALITY_OPERATIONS_EVIDENCE_IMPLEMENTATION.md");
  assert.match(doc, /governance eligibility comparison only/i);
  assert.match(doc, /transport acceptance does not imply PartnerFI posting/i);
  assert.match(doc, /official Wishland wordmark\/palette token system/i);
});
