import assert from "node:assert/strict";
import test from "node:test";

import {
  EvidenceExplorerRecordSchema,
  SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
  projectEvidenceExplorerRecord,
  searchEvidenceExplorer,
} from "../src/domain/evidenceExplorer";
import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";
import { createApp } from "../src/server/app";

const scope = {
  tenantId: "tenant_syn_enawuga_stage4",
  hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
  partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
};

test("D5 evidence semantics remain independent and synthetic evidence cannot self-claim external authority", () => {
  const record = EvidenceExplorerRecordSchema.parse(
    SYNTHETIC_EVIDENCE_EXPLORER_RECORDS[0],
  );
  assert.equal(record.integrityState, "INTEGRITY_VERIFIED");
  assert.equal(record.semanticConfirmationState, "SEMANTICALLY_UNCONFIRMED");
  assert.equal(record.externalAuthorityState, "NOT_EXTERNALLY_AUTHORITATIVE");
  assert.equal(record.synthetic, true);
  assert.equal(record.mutationAuthorityGranted, false);

  assert.throws(() =>
    EvidenceExplorerRecordSchema.parse({
      ...record,
      externalAuthorityState: "EXTERNALLY_AUTHORITATIVE",
    }),
  );
});

test("D5 evidence search scopes before exact filters and cannot leak the other PartnerFI on a shared Hub", () => {
  const allAlpha = searchEvidenceExplorer({
    records: SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
    role: "OPERATIONS",
    ...scope,
  });
  assert.equal(allAlpha.length, 4);
  assert.equal(
    JSON.stringify(allAlpha).includes(SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA),
    false,
  );

  const externalResponse = allAlpha.find(
    (entry) => entry.evidenceId === "evidence_syn_alpha_external_response_001",
  );
  assert.ok(externalResponse);
  assert.equal(externalResponse.evidenceClass, "REPORTED");
  assert.equal(externalResponse.semanticConfirmationState, "SEMANTICALLY_UNCONFIRMED");
  assert.equal(externalResponse.externalAuthorityState, "EXTERNAL_AUTHORITY_UNKNOWN");
  assert.equal(
    externalResponse.limitationCodes.includes("external_response_not_external_fact"),
    true,
  );
  assert.equal(externalResponse.mutationAuthorityGranted, false);

  const betaCorrelation = searchEvidenceExplorer({
    records: SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
    role: "OPERATIONS",
    ...scope,
    query: { correlationId: "corr_syn_e1d_beta_001" },
  });
  assert.deepEqual(betaCorrelation, []);

  const exactConflict = searchEvidenceExplorer({
    records: SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
    role: "PARTNER_ADMIN",
    ...scope,
    query: {
      evidenceId: "evidence_syn_alpha_conflict_001",
      reviewState: "REVIEW_REQUIRED",
    },
  });
  assert.equal(exactConflict.length, 1);
  assert.equal(exactConflict[0]?.evidenceId, "evidence_syn_alpha_conflict_001");
});

test("D5 role projections progressively expose provenance without raw payload, PII or mutation authority", () => {
  const source = SYNTHETIC_EVIDENCE_EXPLORER_RECORDS[1];
  const supervisor = projectEvidenceExplorerRecord(source, "SUPERVISOR");
  const operations = projectEvidenceExplorerRecord(source, "OPERATIONS");
  const admin = projectEvidenceExplorerRecord(source, "PARTNER_ADMIN");

  assert.equal("sourceActorRef" in supervisor, false);
  assert.equal("provenanceRef" in supervisor, false);
  assert.equal("sourceActorRef" in operations, false);
  assert.equal("provenanceRef" in operations, true);
  assert.equal("sourceActorRef" in admin, true);
  assert.equal("provenanceRef" in admin, true);

  for (const projection of [supervisor, operations, admin]) {
    const text = JSON.stringify(projection);
    assert.equal(text.includes("rawPayload"), false);
    assert.equal(text.includes("customerId"), false);
    assert.equal(text.includes("primaryPhone"), false);
    assert.equal(projection.mutationAuthorityGranted, false);
  }
});

test("D5 date filtering is bounded and invalid ranges fail closed", () => {
  const filtered = searchEvidenceExplorer({
    records: SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
    role: "SUPERVISOR",
    ...scope,
    query: {
      occurredFrom: "2026-10-15T06:06:00.000Z",
      occurredTo: "2026-10-15T06:10:00.000Z",
    },
  });
  assert.deepEqual(
    filtered.map((item) => item.evidenceId),
    ["evidence_syn_alpha_reconcile_001"],
  );

  assert.throws(() =>
    searchEvidenceExplorer({
      records: SYNTHETIC_EVIDENCE_EXPLORER_RECORDS,
      role: "SUPERVISOR",
      ...scope,
      query: {
        occurredFrom: "2026-10-16T00:00:00.000Z",
        occurredTo: "2026-10-15T00:00:00.000Z",
      },
    }),
  );
});

type Session = { cookie: string; csrfToken: string };

async function startSession(
  base: string,
  role: "AGENT" | "SUPERVISOR" | "OPERATIONS" | "PARTNER_ADMIN",
  workspaceKey: string,
): Promise<Session> {
  const response = await fetch(base + "/api/demo/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, workspaceKey }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return { cookie, csrfToken: body.csrfToken };
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

function explorerUrl(base: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    ...extra,
  });
  return `${base}/api/demo/evidence-explorer?${params}`;
}

test("D5 Evidence Explorer API is authenticated, role-gated and read-only", async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(explorerUrl(base))).status, 401);

    const agent = await startSession(base, "AGENT", "ALPHA_AGENT_ADAMA");
    assert.equal(
      (await fetch(explorerUrl(base), { headers: { Cookie: agent.cookie } })).status,
      403,
    );

    const admin = await startSession(
      base,
      "PARTNER_ADMIN",
      "ALPHA_PARTNER_ADMIN_ADAMA",
    );
    const post = await fetch(`${base}/api/demo/evidence-explorer`, {
      method: "POST",
      headers: {
        Cookie: admin.cookie,
        "Content-Type": "application/json",
        "x-csrf-token": admin.csrfToken,
      },
      body: JSON.stringify({ action: "FORCE_VERIFY" }),
    });
    assert.equal(post.status, 404);
  });
});

test("D5 Evidence Explorer API exposes bounded semantic distinctions and exact scoped filtering", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const response = await fetch(
      explorerUrl(base, { reviewState: "RECONCILIATION_REQUIRED" }),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.evidence.length, 1);
    assert.equal(body.evidence[0].evidenceId, "evidence_syn_alpha_reconcile_001");
    assert.equal(body.evidence[0].projection, "OPERATIONS_EVIDENCE_DETAIL");
    assert.equal(body.evidence[0].externalAuthorityState, "EXTERNAL_AUTHORITY_UNKNOWN");
    assert.equal(body.semanticLegend.integrityVerifiedIsSemanticTruth, false);
    assert.equal(body.semanticLegend.sourceAuthenticatedIsExternalAuthority, false);
    assert.equal(body.semanticLegend.semanticConfirmationIsAuthorization, false);
    assert.equal(body.semanticLegend.externalAuthorityIsFinancialAuthority, false);
    assert.equal(JSON.stringify(body).includes("org_syn_partnerfi_beta"), false);
  });
});

test("D5 Evidence Explorer API rejects fuzzy or malformed identifiers rather than broadening search", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const malformed = await fetch(
      explorerUrl(base, { correlationId: "alpha" }),
      { headers: { Cookie: operations.cookie } },
    );
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "DEMO_REQUEST_REJECTED" });
  });
});
