import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const atRepo = (path: string) => new URL("../" + path, import.meta.url);
const read = (path: string) => readFileSync(atRepo(path), "utf8");

const quarantinedLegacyArtifacts = [
  "src/components/DemoPresenter.tsx",
  "src/pages/AgentLms.tsx",
  "src/pages/GovernanceCouncil.tsx",
  "src/pages/AuditCompliance.tsx",
  "src/pages/SmartCycle.tsx",
  "src/pages/AgriTrustInsurance.tsx",
] as const;

const quarantinedLegacyPaths = [
  "/smartcycle",
  "/agritrust",
  "/governance",
  "/audit",
] as const;

test("ARCH-16 keeps legacy anti-pattern artifacts out of the governed source tree", () => {
  for (const path of quarantinedLegacyArtifacts) {
    assert.equal(existsSync(atRepo(path)), false, path + " must remain quarantined");
  }
});

test("ARCH-16 keeps removed legacy routes out of governed app and navigation surfaces", () => {
  const app = read("src/App.tsx");
  const legacyLayout = read("src/components/layout/AppLayout.tsx");

  for (const path of quarantinedLegacyPaths) {
    assert.equal(app.includes("path=\"" + path + "\""), false, path + " must not be mounted in App.tsx");
    assert.equal(legacyLayout.includes("path: '" + path + "'"), false, path + " must not be exposed by legacy navigation");
  }

  assert.match(app, /path="\/academy"/);
});
