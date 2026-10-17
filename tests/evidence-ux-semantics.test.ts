import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
} from "../src/domain/evidenceExplorer";
import {
  describeEvidenceUxState,
  describeEvidenceUxStates,
  evidenceExplorerUxStates,
  offlineEvidenceUxStates,
} from "../src/domain/evidenceUxSemantics";

test("D5.9 evidence UX descriptors keep integrity, external authority and settlement semantics separate", () => {
  const integrity = describeEvidenceUxState("DIGEST_VALID");
  const external = describeEvidenceUxState("EXTERNALLY_VERIFIED");
  const synthetic = describeEvidenceUxState("SYNTHETIC");

  assert.equal(integrity.label, "Integrity verified");
  assert.match(integrity.tooltip, /does not verify semantic truth/i);
  assert.equal(integrity.semanticTruthEstablished, false);
  assert.equal(integrity.financialAuthorityGranted, false);
  assert.equal(integrity.settlementAuthorityGranted, false);

  assert.equal(external.label, "Externally confirmed");
  assert.equal(external.financialAuthorityGranted, false);
  assert.equal(external.settlementAuthorityGranted, false);

  assert.equal(synthetic.label, "Synthetic fixture");
  assert.equal(synthetic.tone, "synthetic");
});

test("D5.9 contradictory semantic badges fail closed instead of producing a generic verified state", () => {
  assert.throws(
    () => describeEvidenceUxStates(["DIGEST_VALID", "DIGEST_MISMATCH"]),
    /EVIDENCE_UX_INTEGRITY_STATE_CONFLICT/,
  );
  assert.throws(
    () =>
      describeEvidenceUxStates([
        "EXTERNALLY_VERIFIED",
        "NOT_EXTERNALLY_VERIFIED",
      ]),
    /EVIDENCE_UX_EXTERNAL_STATE_CONFLICT/,
  );
  assert.throws(
    () => describeEvidenceUxStates(["SYNTHETIC", "EXTERNALLY_VERIFIED"]),
    /SYNTHETIC_EVIDENCE_CANNOT_SHOW_EXTERNAL_CONFIRMATION/,
  );
});

test("D5.9 Evidence Explorer projection derives synthetic, digest and external-confirmation states independently", () => {
  const record = SYNTHETIC_EVIDENCE_EXPLORER_RECORDS[0];
  const states = evidenceExplorerUxStates(record);
  assert.deepEqual(states, [
    "DIGEST_VALID",
    "SYNTHETIC",
    "NOT_EXTERNALLY_VERIFIED",
  ]);

  const descriptors = describeEvidenceUxStates(states);
  assert.deepEqual(
    descriptors.map((entry) => entry.label),
    ["Synthetic fixture", "Not externally verified", "Integrity verified"],
  );
  assert.equal(
    descriptors.every(
      (entry) =>
        entry.semanticTruthEstablished === false &&
        entry.financialAuthorityGranted === false &&
        entry.settlementAuthorityGranted === false,
    ),
    true,
  );
});

test("D5.9 offline evidence keeps capture, uncertainty, reconciliation and settlement boundaries visible", () => {
  const states = offlineEvidenceUxStates({
    digestVerified: true,
    reconciliationRequired: true,
    outcomeUncertain: true,
  });
  assert.equal(states.includes("DIGEST_VALID"), true);
  assert.equal(states.includes("SYNTHETIC"), true);
  assert.equal(states.includes("NOT_EXTERNALLY_VERIFIED"), true);
  assert.equal(states.includes("OFFLINE_CAPTURED"), true);
  assert.equal(states.includes("OUTCOME_UNCERTAIN"), true);
  assert.equal(states.includes("RECONCILIATION_REQUIRED"), true);
  assert.equal(states.includes("EXTERNALLY_VERIFIED"), false);
});

test("D5.9 governed evidence UI renders multi-state semantics and avoids a single generic Verified badge", () => {
  const drawer = readFileSync("src/components/EvidenceDrawer.tsx", "utf8");
  const semanticComponent = readFileSync(
    "src/components/EvidenceSemanticStates.tsx",
    "utf8",
  );
  const operations = readFileSync("src/pages/OperationsEvidence.tsx", "utf8");

  assert.match(drawer, /EvidenceSemanticStates/);
  assert.match(drawer, /semanticStates/);
  assert.match(semanticComponent, /descriptor\.label/);
  assert.doesNotMatch(semanticComponent, />\s*Verified\s*</);
  assert.match(operations, /offlineEvidenceUxStates/);
});
