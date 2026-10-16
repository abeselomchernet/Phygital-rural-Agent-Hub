import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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
import {
  AtomicDirectoryHubWorkflowIntentPersistence,
  createConfiguredHubWorkflowIntentPersistence,
} from "../src/server/hub-idempotency-persistence";

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

function request(overrides: Partial<HubWorkflowIntentRequest> = {}) {
  return HubWorkflowIntentRequestSchema.parse({
    schemaVersion: 1,
    capturedAt: "2026-10-16T10:00:00+03:00",
    expiresAt: "2026-10-16T11:00:00+03:00",
    correlationId: "corr_syn_durable_idem_001",
    runId: "run_syn_durable_idem_001",
    idempotencyKey: "idem_syn_durable_shared_001",
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
    ...overrides,
  });
}

function scopeFor(input: HubWorkflowIntentRequest) {
  return `${input.tenantId}|${input.hubId}|${input.partnerOrgId}|${input.idempotencyKey}`;
}

function withTempDirectory(run: (directory: string) => void) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "enawuga-idem-"));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("configured idempotency persistence fails closed when durability is required without state directory", () => {
  assert.throws(
    () =>
      createConfiguredHubWorkflowIntentPersistence({
        syntheticStateDir: undefined,
        requireDurable: true,
      }),
    /DURABLE_HUB_IDEMPOTENCY_STORE_REQUIRED/,
  );
  assert.equal(
    createConfiguredHubWorkflowIntentPersistence({
      syntheticStateDir: undefined,
      requireDurable: false,
    }),
    undefined,
  );
});

test("restart-durable idempotency returns duplicate no-op after a fresh store instance", () => {
  withTempDirectory((directory) => {
    const first = new HubWorkflowIntentCertificationStore(
      undefined,
      new AtomicDirectoryHubWorkflowIntentPersistence(directory),
    );
    assert.equal(first.persistenceMode().durable, true);
    assert.equal(first.reserve(request(), alphaContext()).decision, "RESERVED_NEW");

    const restarted = new HubWorkflowIntentCertificationStore(
      undefined,
      new AtomicDirectoryHubWorkflowIntentPersistence(directory),
    );
    const duplicate = restarted.reserve(
      request({
        correlationId: "corr_syn_durable_idem_retry_002",
        runId: "run_syn_durable_idem_retry_002",
        capturedAt: "2026-10-16T10:01:00+03:00",
        expiresAt: "2026-10-16T11:01:00+03:00",
      }),
      alphaContext(),
    );

    assert.equal(duplicate.decision, "DUPLICATE_NOOP");
    assert.equal(duplicate.logicalWorkflowCreated, false);
  });
});

test("changed idempotency reuse remains a conflict after restart", () => {
  withTempDirectory((directory) => {
    const first = new HubWorkflowIntentCertificationStore(
      undefined,
      new AtomicDirectoryHubWorkflowIntentPersistence(directory),
    );
    assert.equal(first.reserve(request(), alphaContext()).decision, "RESERVED_NEW");

    const restarted = new HubWorkflowIntentCertificationStore(
      undefined,
      new AtomicDirectoryHubWorkflowIntentPersistence(directory),
    );
    const changed = request({ facts: { ...request().facts, amountMinor: 1300 } });
    const decision = restarted.reserve(changed, alphaContext());
    assert.equal(decision.decision, "CONFLICT_REVIEW_REQUIRED");
    assert.equal(restarted.snapshot().reservations.length, 1);
  });
});

test("filesystem CAS rejects a stale revision across independent persistence instances", () => {
  withTempDirectory((directory) => {
    const persistenceA = new AtomicDirectoryHubWorkflowIntentPersistence(directory);
    const store = new HubWorkflowIntentCertificationStore(undefined, persistenceA);
    const baseRequest = request();
    store.reserve(baseRequest, alphaContext());

    const persistenceB = new AtomicDirectoryHubWorkflowIntentPersistence(directory);
    const [before] = persistenceA.list();
    assert.ok(before);
    const reservation = structuredClone(before.reservation);
    reservation.lastUpdatedAt = "2026-10-16T10:05:00+03:00";
    const scope = scopeFor(baseRequest);
    assert.equal(
      persistenceB.compareAndSet(scope, before.revision, reservation),
      true,
    );
    assert.equal(
      persistenceA.compareAndSet(scope, before.revision, reservation),
      false,
    );
  });
});

test("corrupt persisted idempotency record fails closed", () => {
  withTempDirectory((directory) => {
    const persistence = new AtomicDirectoryHubWorkflowIntentPersistence(directory);
    const store = new HubWorkflowIntentCertificationStore(undefined, persistence);
    const baseRequest = request();
    store.reserve(baseRequest, alphaContext());
    const record = path.join(
      directory,
      `${createHash("sha256").update(scopeFor(baseRequest), "utf8").digest("hex")}.json`,
    );
    writeFileSync(record, "{not-json", "utf8");
    assert.throws(
      () => store.get(baseRequest),
      /HUB_IDEMPOTENCY_PERSISTENCE_CORRUPT/,
    );
  });
});
