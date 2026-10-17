import assert from "node:assert/strict";
import test from "node:test";

import {
  EvidenceCorrectionRecordSchema,
  EvidenceDependencySchema,
  SYNTHETIC_EVIDENCE_CORRECTIONS,
  SYNTHETIC_EVIDENCE_DEPENDENCIES,
  SYNTHETIC_EVIDENCE_LINEAGE_RECORDS,
  buildEvidenceLineage,
} from "../src/domain/evidenceCorrection";
import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";
import { createApp } from "../src/server/app";

const alphaScope = {
  tenantId: "tenant_syn_enawuga_stage4",
  hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
};

test("D5 correction lineage preserves original evidence and exposes append-only supersession", () => {
  const lineage = buildEvidenceLineage({
    records: SYNTHETIC_EVIDENCE_LINEAGE_RECORDS,
    corrections: SYNTHETIC_EVIDENCE_CORRECTIONS,
    dependencies: SYNTHETIC_EVIDENCE_DEPENDENCIES,
    role: "OPERATIONS",
    evidenceId: "evidence_syn_alpha_capture_001",
    ...alphaScope,
  });
  assert.ok(lineage);
  assert.equal(lineage.chain.length, 2);
  assert.equal(lineage.chain[0]?.superseded, true);
  assert.equal(
    lineage.chain[0]?.supersededByEvidenceId,
    "evidence_syn_alpha_capture_corrected_001",
  );
  assert.equal(lineage.chain[1]?.superseded, false);
  assert.equal(lineage.originalEvidenceDeleted, false);
  assert.equal(lineage.automaticRecomputePerformed, false);
  assert.equal(lineage.decisionAuthorityGranted, false);
});

test("D5 correction invalidates dependent evidence and marks Farmer360/ARDI projections for recompute without doing it", () => {
  const lineage = buildEvidenceLineage({
    records: SYNTHETIC_EVIDENCE_LINEAGE_RECORDS,
    corrections: SYNTHETIC_EVIDENCE_CORRECTIONS,
    dependencies: SYNTHETIC_EVIDENCE_DEPENDENCIES,
    role: "PARTNER_ADMIN",
    evidenceId: "evidence_syn_alpha_capture_corrected_001",
    ...alphaScope,
  });
  assert.ok(lineage);
  assert.deepEqual(lineage.invalidatedDerivedEvidenceIds, [
    "evidence_syn_alpha_conflict_001",
  ]);
  assert.deepEqual(lineage.projectionRecomputeRequired, [
    "ARDI_DECISION_SUPPORT",
    "EVIDENCE_EXPLORER",
    "FARMER360",
  ]);
  assert.equal(lineage.automaticRecomputePerformed, false);
});

test("D5 correction and dependency contracts reject self-reference and duplicate source semantics", () => {
  assert.throws(() =>
    EvidenceCorrectionRecordSchema.parse({
      ...SYNTHETIC_EVIDENCE_CORRECTIONS[0],
      replacementEvidenceId: "evidence_syn_alpha_capture_001",
    }),
  );
  assert.throws(() =>
    EvidenceDependencySchema.parse({
      ...SYNTHETIC_EVIDENCE_DEPENDENCIES[0],
      sourceEvidenceIds: [
        "evidence_syn_alpha_capture_001",
        "evidence_syn_alpha_capture_001",
      ],
    }),
  );
  assert.throws(() =>
    EvidenceDependencySchema.parse({
      ...SYNTHETIC_EVIDENCE_DEPENDENCIES[0],
      sourceEvidenceIds: ["evidence_syn_alpha_conflict_001"],
    }),
  );
});

test("D5 lineage fails closed when a scoped correction references another PartnerFI", () => {
  const badCorrection = {
    ...SYNTHETIC_EVIDENCE_CORRECTIONS[0],
    correctionId: "correction_syn_alpha_cross_partner_001",
    replacementEvidenceId: "evidence_syn_beta_capture_001",
  };
  assert.throws(
    () =>
      buildEvidenceLineage({
        records: SYNTHETIC_EVIDENCE_LINEAGE_RECORDS,
        corrections: [badCorrection],
        dependencies: [],
        role: "OPERATIONS",
        evidenceId: "evidence_syn_alpha_capture_001",
        ...alphaScope,
      }),
    /EVIDENCE_CORRECTION_REFERENCE_OUT_OF_SCOPE/,
  );
});

test("D5 lineage does not reveal another PartnerFI evidence ID through the shared Hub", () => {
  const result = buildEvidenceLineage({
    records: SYNTHETIC_EVIDENCE_LINEAGE_RECORDS,
    corrections: SYNTHETIC_EVIDENCE_CORRECTIONS,
    dependencies: SYNTHETIC_EVIDENCE_DEPENDENCIES,
    role: "OPERATIONS",
    evidenceId: "evidence_syn_beta_capture_001",
    ...alphaScope,
  });
  assert.equal(result, undefined);
});

type Session = { cookie: string };

async function startSession(
  base: string,
  role: "AGENT" | "OPERATIONS" | "PARTNER_ADMIN",
  workspaceKey: string,
): Promise<Session> {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, workspaceKey }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return { cookie };
}

async function withServer(run: (base: string) => Promise<void>) {
  const server = createApp({ allowPrivilegedSyntheticRoles: true }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    await run(base);
  } finally {
    server.close();
  }
}

function lineageUrl(base: string, evidenceId: string) {
  return `${base}/api/demo/evidence-explorer/lineage?${new URLSearchParams({
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    evidenceId,
  })}`;
}

test("D5 lineage API is read-only, role-gated and carries no correction mutation authority", async () => {
  await withServer(async (base) => {
    const agent = await startSession(base, "AGENT", "ALPHA_AGENT_ADAMA");
    assert.equal(
      (
        await fetch(lineageUrl(base, "evidence_syn_alpha_capture_001"), {
          headers: { Cookie: agent.cookie },
        })
      ).status,
      403,
    );

    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const response = await fetch(
      lineageUrl(base, "evidence_syn_alpha_capture_001"),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.lineage.chain.length, 2);
    assert.equal(body.lineage.originalEvidenceDeleted, false);
    assert.equal(body.lineage.automaticRecomputePerformed, false);
    assert.equal(body.lineage.decisionAuthorityGranted, false);
    assert.equal(JSON.stringify(body).includes("org_syn_partnerfi_beta"), false);
  });
});

test("D5 lineage API returns no cross-partner lineage instead of leaking existence", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const response = await fetch(
      lineageUrl(base, "evidence_syn_beta_capture_001"),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).lineage, undefined);
  });
});
