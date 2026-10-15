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

test("guided presenter explicitly labels audited Stage-4 claims as synthetic", () => {
  const presenter = read("src/components/DemoPresenter.tsx");
  for (const forbidden of [
    "live network liquidity, transaction mass",
    "biometric card integrity matching",
    "protecting privacy with Zero-Knowledge principles",
  ]) assert.equal(presenter.includes(forbidden), false, forbidden);
  assert.match(presenter, /synthetic network-liquidity models/);
  assert.match(presenter, /no live institution or provider connection is implied/);
  assert.match(presenter, /No biometric capture or binding/);
  assert.match(presenter, /no Zero-Knowledge proof system is implemented here/);
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
