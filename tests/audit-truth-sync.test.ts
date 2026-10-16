import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("package identity no longer exposes scaffold metadata", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.name, "enawuga-hub");
  assert.equal(pkg.version, "0.1.0");
  assert.equal(pkg.private, true);
  assert.equal(lock.name, pkg.name);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].name, pkg.name);
  assert.equal(lock.packages[""].version, pkg.version);
});

test("guided demo preserves audited Stage-4 claim boundaries without voice automation", () => {
  const demo = read("src/pages/GuidedDemo.tsx");
  for (const forbidden of [
    "live network liquidity, transaction mass",
    "biometric card integrity matching",
    "protecting privacy with Zero-Knowledge principles",
    "automatically issues dynamic credit lines",
    "settle everything here",
  ]) assert.equal(demo.includes(forbidden), false, forbidden);
  assert.match(demo, /Stage-4 guided demo/);
  assert.match(demo, /No live funds move/);
  assert.match(demo, /Presentation polish does not change system authority/);
});

test("audit-compliance presentation does not present synthetic fixtures as live biometric or audit proof", () => {
  const page = read("src/pages/AuditCompliance.tsx");
  for (const forbidden of [
    "Compiling live ledger report into official regulatory PDF",
    "Fayda ZKP Biometric Binding Constraint",
    "Biometric Binding (Fayda ZKP)",
    "Verifies local device-level biometrics with hash masking",
    "Successfully exported live report",
    "PEERS LIVE",
    "Real-time cryptographically secured system audit trails",
  ]) assert.equal(page.includes(forbidden), false, forbidden);
  assert.match(page, /Synthetic Readiness Checklist/);
  assert.match(page, /not regulatory proof, external verification, or production assurance/);
  assert.match(page, /no biometric binding, biometric capture, or ZKP is performed/);
  assert.match(page, /not live telemetry or external audit evidence/);
});
