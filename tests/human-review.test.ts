import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import {
  HumanReviewActionSchema,
  HumanReviewCaseSchema,
  SYNTHETIC_HUMAN_REVIEW_CASES,
  evaluateHumanReviewActionPolicy,
  isHumanReviewTransitionAllowed,
  searchHumanReviewCases,
} from "../src/domain/humanReview";
import { SYNTHETIC_PARTNER_IDS } from "../src/domain/syntheticReferencePartners";
import { createApp } from "../src/server/app";

const TENANT_ID = "tenant_syn_enawuga_stage4";
const HUB_ID = SYNTHETIC_HUB_IDS.ADAMA_SHARED;
const ALPHA = SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA;
const BETA = SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA;

function alphaCase(caseId: string) {
  const found = SYNTHETIC_HUMAN_REVIEW_CASES.find((entry) => entry.caseId === caseId);
  assert.ok(found);
  return found;
}

test("D5 Human Review fixtures are strict, synthetic and preserve all authority boundaries", () => {
  for (const reviewCase of SYNTHETIC_HUMAN_REVIEW_CASES) {
    const parsed = HumanReviewCaseSchema.parse(reviewCase);
    assert.equal(parsed.synthetic, true);
    assert.equal(parsed.rawPayloadIncluded, false);
    assert.equal(parsed.piiIncluded, false);
    assert.equal(parsed.automaticResolutionAllowed, false);
    assert.equal(parsed.financialAuthorityGranted, false);
    assert.equal(parsed.creditApprovalAuthorityGranted, false);
    assert.equal(parsed.settlementAuthorityGranted, false);
    assert.equal(parsed.insuranceAdjudicationAuthorityGranted, false);
    assert.equal(parsed.deviceControlAuthorityGranted, false);
  }

  assert.throws(() =>
    HumanReviewCaseSchema.parse({
      ...alphaCase("case_syn_alpha_identity_conflict_001"),
      externalAuthorityRequired: true,
      authorityOwner: "ENAWUGA_OPERATIONS",
    }),
  );
});

test("D5 Human Review queue scopes tenant, Hub, PartnerFI and role before exact filters", () => {
  const operations = searchHumanReviewCases({
    cases: SYNTHETIC_HUMAN_REVIEW_CASES,
    role: "OPERATIONS",
    tenantId: TENANT_ID,
    hubId: HUB_ID,
    partnerOrgId: ALPHA,
  });
  assert.deepEqual(
    operations.map((entry) => entry.caseId),
    [
      "case_syn_alpha_identity_conflict_001",
      "case_syn_alpha_outcome_uncertainty_001",
    ],
  );
  assert.equal(JSON.stringify(operations).includes(BETA), false);

  const betaExact = searchHumanReviewCases({
    cases: SYNTHETIC_HUMAN_REVIEW_CASES,
    role: "OPERATIONS",
    tenantId: TENANT_ID,
    hubId: HUB_ID,
    partnerOrgId: ALPHA,
    query: { caseId: "case_syn_beta_transport_conflict_001" },
  });
  assert.deepEqual(betaExact, []);

  const supervisor = searchHumanReviewCases({
    cases: SYNTHETIC_HUMAN_REVIEW_CASES,
    role: "SUPERVISOR",
    tenantId: TENANT_ID,
    hubId: HUB_ID,
    partnerOrgId: ALPHA,
  });
  assert.deepEqual(
    supervisor.map((entry) => entry.caseId),
    ["case_syn_alpha_evidence_correction_001"],
  );
});

test("D5 Human Review lifecycle is explicit and cannot jump from pending or external wait to closed", () => {
  assert.equal(isHumanReviewTransitionAllowed("PENDING", "IN_REVIEW"), true);
  assert.equal(
    isHumanReviewTransitionAllowed("IN_REVIEW", "EXTERNAL_AUTHORITY_REQUIRED"),
    true,
  );
  assert.equal(
    isHumanReviewTransitionAllowed("EXTERNAL_AUTHORITY_REQUIRED", "IN_REVIEW"),
    true,
  );
  assert.equal(isHumanReviewTransitionAllowed("RESOLVED", "CLOSED"), true);
  assert.equal(isHumanReviewTransitionAllowed("PENDING", "CLOSED"), false);
  assert.equal(
    isHumanReviewTransitionAllowed("EXTERNAL_AUTHORITY_REQUIRED", "CLOSED"),
    false,
  );
});

test("D5 Human Review action policy is non-mounted and cannot override external or regulated authority", () => {
  const eligible = evaluateHumanReviewActionPolicy({
    reviewCase: alphaCase("case_syn_alpha_identity_conflict_001"),
    role: "OPERATIONS",
    action: "REQUEST_MORE_EVIDENCE",
  });
  assert.equal(eligible.decision, "ALLOW_POLICY_ONLY");
  assert.equal(eligible.mutationMounted, false);
  assert.equal(eligible.financialAuthorityGranted, false);
  assert.equal(eligible.settlementAuthorityGranted, false);

  const externalClose = evaluateHumanReviewActionPolicy({
    reviewCase: alphaCase("case_syn_alpha_outcome_uncertainty_001"),
    role: "OPERATIONS",
    action: "CLOSE_OPERATIONAL_CASE",
  });
  assert.equal(externalClose.decision, "DENY");
  assert.equal(externalClose.reason, "EXTERNAL_AUTHORITY_REQUIRED");

  const partnerAdmin = evaluateHumanReviewActionPolicy({
    reviewCase: alphaCase("case_syn_alpha_identity_conflict_001"),
    role: "PARTNER_ADMIN",
    action: "ACKNOWLEDGE",
  });
  assert.equal(partnerAdmin.decision, "DENY");
  assert.equal(partnerAdmin.reason, "ROLE_ACTION_DENIED");

  for (const prohibited of [
    "FORCE_SUCCESS",
    "FORCE_SETTLEMENT",
    "APPROVE_CREDIT",
    "APPROVE_CLAIM",
    "UNLOCK_ASSET",
  ]) {
    assert.throws(() => HumanReviewActionSchema.parse(prohibited));
  }
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

function reviewUrl(base: string, query: Record<string, string> = {}) {
  const params = new URLSearchParams({ hubId: HUB_ID, ...query });
  return `${base}/api/demo/human-review/cases?${params}`;
}

test("D5 Human Review API requires an authenticated governed review role", async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(reviewUrl(base))).status, 401);

    const agent = await startSession(base, "AGENT", "ALPHA_AGENT_ADAMA");
    const denied = await fetch(reviewUrl(base), {
      headers: { Cookie: agent.cookie },
    });
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "ROLE_ACCESS_DENIED" });
  });
});

test("D5 Human Review API returns role-safe PartnerFI-isolated cases and no mounted action authority", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const response = await fetch(reviewUrl(base), {
      headers: { Cookie: operations.cookie },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.readOnly, true);
    assert.equal(body.actionsMounted, false);
    assert.equal(body.cases.length, 2);
    assert.equal(
      body.cases.every(
        (entry: any) =>
          entry.projection === "OPERATIONS_REVIEW_CASE" &&
          entry.mutationMounted === false &&
          entry.financialAuthorityGranted === false,
      ),
      true,
    );
    assert.doesNotMatch(JSON.stringify(body), /org_syn_partnerfi_beta/);
  });
});

test("D5 Human Review API preserves Supervisor responsibility and exact scoped search", async () => {
  await withServer(async (base) => {
    const supervisor = await startSession(
      base,
      "SUPERVISOR",
      "ALPHA_SUPERVISOR_ADAMA",
    );
    const all = await fetch(reviewUrl(base), {
      headers: { Cookie: supervisor.cookie },
    });
    assert.equal(all.status, 200);
    const allBody = await all.json();
    assert.deepEqual(
      allBody.cases.map((entry: any) => entry.caseId),
      ["case_syn_alpha_evidence_correction_001"],
    );

    const exact = await fetch(
      reviewUrl(base, { caseId: "case_syn_alpha_evidence_correction_001" }),
      { headers: { Cookie: supervisor.cookie } },
    );
    assert.equal(exact.status, 200);
    assert.equal((await exact.json()).cases.length, 1);
  });
});

test("D5 Human Review API rejects fuzzy identifiers and mounts no mutation endpoint", async () => {
  await withServer(async (base) => {
    const operations = await startSession(
      base,
      "OPERATIONS",
      "ALPHA_OPERATIONS_ADAMA",
    );
    const malformed = await fetch(reviewUrl(base, { caseId: "alpha" }), {
      headers: { Cookie: operations.cookie },
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: "DEMO_REQUEST_REJECTED" });

    const post = await fetch(`${base}/api/demo/human-review/cases`, {
      method: "POST",
      headers: {
        Cookie: operations.cookie,
        "Content-Type": "application/json",
        "x-csrf-token": operations.csrfToken,
      },
      body: JSON.stringify({ action: "FORCE_SUCCESS" }),
    });
    assert.equal(post.status, 404);
    assert.deepEqual(await post.json(), { error: "API_NOT_FOUND" });
  });
});
