import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DurablePaymentAttemptStore,
} from "../src/domain/paymentAttempt";
import type { PaymentAttemptRequest } from "../src/domain/paymentOrchestration";
import {
  DurableTelebirrPreorderIntentStore,
  type TelebirrPreorderIntentRequest,
} from "../src/domain/telebirrPreorderIntent";
import {
  HubWorkflowIntentCertificationStore,
  HubWorkflowIntentRequestSchema,
  type HubWorkflowIntentRequest,
} from "../src/domain/hubWorkflowIdempotencyCertification";
import {
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  type HubAccessContext,
} from "../src/domain/hub";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_AGENT_GROUP_IDS,
  SYNTHETIC_OBJECT_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REGION_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../src/domain/syntheticReferencePartners";
import { AtomicJsonPaymentAttemptPersistence } from "../src/server/payment-attempt-persistence";
import { AtomicJsonTelebirrPreorderIntentPersistence } from "../src/server/telebirr-preorder-intent-persistence";
import { AtomicDirectoryHubWorkflowIntentPersistence } from "../src/server/hub-idempotency-persistence";

function ageLock(lockPath: string) {
  const old = new Date(Date.now() - 2_000);
  utimesSync(lockPath, old, old);
}

const paymentRequest: PaymentAttemptRequest = {
  transactionId: "10000000-0000-4000-8000-000000000901",
  customerId: "00000000-0000-4000-8000-000000000901",
  idempotencyKey: "20000000-0000-4000-8000-000000000901",
  amountMinor: 2500,
  currency: "ETB",
  provider: "MPESA_ETHIOPIA_DIRECT",
  jurisdiction: "ET",
  environment: "sandbox",
  product: "synthetic-c2b",
  merchantConfigRef: "synthetic-merchant-config-v1",
  providerContractRef: "synthetic-et-sandbox-contract-evidence-v1",
};

function telebirrRequest(): TelebirrPreorderIntentRequest {
  return {
    transactionId: randomUUID(),
    customerId: randomUUID(),
    idempotencyKey: randomUUID(),
    merchantOrderId: `ORDER${Date.now()}${Math.floor(Math.random() * 100000)}`,
    nonce: `NONCE${Date.now()}${Math.floor(Math.random() * 100000)}`,
    timestamp: "1791819000",
    title: "Synthetic item",
    amountMinor: 150,
    currency: "ETB",
  };
}

function alphaContext(): HubAccessContext {
  return {
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    role: "AGENT",
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [SYNTHETIC_AGENT_GROUP_IDS.ALPHA_AGENTS],
    assignedHubIds: [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    allowedPurposes: ["HUB_VIEW", "HUB_OPERATE"],
  };
}

function hubRequest(): HubWorkflowIntentRequest {
  return HubWorkflowIntentRequestSchema.parse({
    schemaVersion: 1,
    capturedAt: "2026-10-16T10:00:00+03:00",
    expiresAt: "2026-10-16T11:00:00+03:00",
    correlationId: "corr_syn_stale_lock_001",
    runId: "run_syn_stale_lock_001",
    idempotencyKey: "idem_syn_stale_lock_001",
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    hubId: SYNTHETIC_HUB_IDS.ADAMA_SHARED,
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
    capabilityId: "FIN.CASH_IN_AUTHORIZE",
    routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
    adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
    purpose: "HUB_OPERATE",
    facts: {
      intentClass: "SYNTHETIC_FINANCIAL_INTENT",
      objectRef: SYNTHETIC_OBJECT_IDS.ALPHA_CUSTOMER,
      amountMinor: 1250,
      currency: "ETB",
      variant: "BASELINE",
    },
  });
}

test("payment-attempt persistence recovers a crash-stale legacy lock after TTL", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-payment-lock-recovery-"));
  const path = join(directory, "attempts.json");
  const lockPath = `${path}.lock`;
  try {
    writeFileSync(lockPath, "legacy-crash-lock", "utf8");
    ageLock(lockPath);
    const store = new DurablePaymentAttemptStore(
      new AtomicJsonPaymentAttemptPersistence(path, { leaseMs: 100 }),
    );
    const reserved = store.reserve(paymentRequest);
    assert.equal(reserved.reused, false);
    assert.equal(existsSync(lockPath), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Telebirr persistence recovers a crash-stale legacy lock after TTL", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-telebirr-lock-recovery-"));
  const path = join(directory, "intents.json");
  const lockPath = `${path}.lock`;
  try {
    writeFileSync(lockPath, "legacy-crash-lock", "utf8");
    ageLock(lockPath);
    const store = new DurableTelebirrPreorderIntentStore(
      new AtomicJsonTelebirrPreorderIntentPersistence(path, { leaseMs: 100 }),
    );
    const reserved = store.reserve(telebirrRequest());
    assert.equal(reserved.status, "PREORDER_INTENT_RECORDED");
    assert.equal(existsSync(lockPath), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Hub idempotency persistence recovers a crash-stale scoped lock after TTL", () => {
  const directory = mkdtempSync(join(tmpdir(), "enawuga-hub-idem-lock-recovery-"));
  try {
    const request = hubRequest();
    const scope = `${request.tenantId}|${request.hubId}|${request.partnerOrgId}|${request.idempotencyKey}`;
    const digest = createHash("sha256").update(scope, "utf8").digest("hex");
    const lockPath = join(directory, `${digest}.json.lock`);
    writeFileSync(lockPath, "legacy-crash-lock", "utf8");
    ageLock(lockPath);

    const persistence = new AtomicDirectoryHubWorkflowIntentPersistence(
      directory,
      0,
      100,
    );
    const store = new HubWorkflowIntentCertificationStore(undefined, persistence);
    const decision = store.reserve(request, alphaContext());
    assert.equal(decision.decision, "RESERVED_NEW");
    assert.equal(existsSync(lockPath), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
