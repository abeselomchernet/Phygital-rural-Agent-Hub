import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import type { Pool } from "pg";
import type { z } from "zod";
import { CustomerStoreSnapshotSchema } from "../../domain/customer";
import { PartnerLedgerSnapshotSchema } from "../../domain/financial";
import {
  KycPendingSnapshotSchema,
  MockIdentityProviderSnapshotSchema,
} from "../../domain/identity";
import { PaymentGatewaySnapshotSchema } from "../../domain/paymentGatewayState";
import { PaymentGatewayReconciliationSnapshotSchema } from "../../domain/paymentGatewayReconciliation";
import { SyntheticAuditSnapshotSchema } from "../../domain/audit";
import {
  PostgresD1AsyncSnapshotBoundary,
  d1CanonicalPayloadSha256,
} from "./d1-async-boundary";
import { PostgresD1AppendOnlyBoundary } from "./d1-append-only-boundary";

const snapshotSources: ReadonlyArray<{
  fileName: string;
  storeKey: string;
  schema: z.ZodTypeAny;
}> = [
  {
    fileName: "customers.json",
    storeKey: "shadow/customer-store",
    schema: CustomerStoreSnapshotSchema,
  },
  {
    fileName: "partner-ledger.json",
    storeKey: "shadow/partner-ledger",
    schema: PartnerLedgerSnapshotSchema,
  },
  {
    fileName: "mock-identity-provider.json",
    storeKey: "shadow/mock-identity-provider",
    schema: MockIdentityProviderSnapshotSchema,
  },
  {
    fileName: "kyc-pending.json",
    storeKey: "shadow/kyc-pending",
    schema: KycPendingSnapshotSchema,
  },
  {
    fileName: "payment-gateway.json",
    storeKey: "shadow/payment-gateway",
    schema: PaymentGatewaySnapshotSchema,
  },
  {
    fileName: "payment-gateway-reconciliation.json",
    storeKey: "shadow/payment-gateway-reconciliation",
    schema: PaymentGatewayReconciliationSnapshotSchema,
  },
];

export type D1ShadowSource = {
  fileName: string;
  storeKey: string;
  payload: unknown;
  payloadSha256: string;
};

export type D1ShadowDiscovery = {
  stateDir: string;
  snapshots: D1ShadowSource[];
  auditEvents: unknown[];
};

function readJson(filePath: string) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("D1_SHADOW_SOURCE_JSON_INVALID");
  }
}

export function discoverD1SyntheticFilesystemState(stateDir: string): D1ShadowDiscovery {
  if (!stateDir) throw new Error("D1_SHADOW_STATE_DIR_REQUIRED");
  if (!existsSync(stateDir)) throw new Error("D1_SHADOW_STATE_DIR_NOT_FOUND");
  if (lstatSync(stateDir).isSymbolicLink())
    throw new Error("D1_SHADOW_STATE_DIR_SYMLINK_FORBIDDEN");
  const resolved = realpathSync(stateDir);
  if (!lstatSync(resolved).isDirectory())
    throw new Error("D1_SHADOW_STATE_DIR_INVALID");

  const snapshots: D1ShadowSource[] = [];
  for (const source of snapshotSources) {
    const filePath = path.join(resolved, source.fileName);
    if (!existsSync(filePath)) continue;
    if (lstatSync(filePath).isSymbolicLink())
      throw new Error("D1_SHADOW_SOURCE_SYMLINK_FORBIDDEN");
    const payload = source.schema.parse(readJson(filePath));
    snapshots.push({
      fileName: source.fileName,
      storeKey: source.storeKey,
      payload,
      payloadSha256: d1CanonicalPayloadSha256(payload),
    });
  }

  const auditPath = path.join(resolved, "audit.json");
  let auditEvents: unknown[] = [];
  if (existsSync(auditPath)) {
    if (lstatSync(auditPath).isSymbolicLink())
      throw new Error("D1_SHADOW_SOURCE_SYMLINK_FORBIDDEN");
    auditEvents = SyntheticAuditSnapshotSchema.parse(readJson(auditPath)).events;
  }

  return { stateDir: resolved, snapshots, auditEvents };
}

export async function migrateD1SyntheticFilesystemShadow(
  pool: Pool,
  discovery: D1ShadowDiscovery,
) {
  const snapshots = new PostgresD1AsyncSnapshotBoundary(pool);
  const appendOnly = new PostgresD1AppendOnlyBoundary(pool);
  const snapshotResults: Array<{
    storeKey: string;
    revision: number;
    digest: string;
    status: "IMPORTED" | "MATCHED_EXISTING";
  }> = [];

  for (const source of discovery.snapshots) {
    const existing = await snapshots.load(source.storeKey);
    if (existing) {
      if (
        existing.sourceKind !== "SYNTHETIC_FILESYSTEM" ||
        existing.payloadSha256 !== source.payloadSha256
      )
        throw new Error("D1_SHADOW_EXISTING_STATE_MISMATCH");
      snapshotResults.push({
        storeKey: source.storeKey,
        revision: existing.revision,
        digest: existing.payloadSha256,
        status: "MATCHED_EXISTING",
      });
      continue;
    }

    const inserted = await snapshots.compareAndSwap({
      storeKey: source.storeKey,
      storageClass: "TRANSACTIONAL_STATE",
      expectedRevision: 0,
      payload: source.payload,
      sourceKind: "SYNTHETIC_FILESYSTEM",
    });
    snapshotResults.push({
      storeKey: source.storeKey,
      revision: inserted.revision,
      digest: inserted.payloadSha256,
      status: "IMPORTED",
    });
  }

  let auditInserted = 0;
  let auditMatched = 0;
  for (const event of discovery.auditEvents) {
    const result = await appendOnly.appendSyntheticAuditEvent(event);
    if (result.inserted) auditInserted += 1;
    else {
      const loaded = await appendOnly.loadSyntheticAuditEventByDigest(result.digest);
      if (!loaded) throw new Error("D1_SHADOW_AUDIT_READBACK_MISSING");
      auditMatched += 1;
    }
  }

  return {
    snapshots: snapshotResults,
    audit: {
      inserted: auditInserted,
      matchedExisting: auditMatched,
      total: discovery.auditEvents.length,
    },
  };
}

export async function verifyD1SyntheticFilesystemShadow(
  pool: Pool,
  discovery: D1ShadowDiscovery,
) {
  const snapshots = new PostgresD1AsyncSnapshotBoundary(pool);
  const appendOnly = new PostgresD1AppendOnlyBoundary(pool);

  for (const source of discovery.snapshots) {
    const record = await snapshots.load(source.storeKey);
    if (!record) throw new Error("D1_SHADOW_READBACK_MISSING");
    if (
      record.sourceKind !== "SYNTHETIC_FILESYSTEM" ||
      record.payloadSha256 !== source.payloadSha256
    )
      throw new Error("D1_SHADOW_READBACK_MISMATCH");
  }

  for (const event of discovery.auditEvents) {
    const digest = d1CanonicalPayloadSha256(event);
    const loaded = await appendOnly.loadSyntheticAuditEventByDigest(digest);
    if (!loaded) throw new Error("D1_SHADOW_AUDIT_READBACK_MISSING");
  }

  return {
    snapshotCount: discovery.snapshots.length,
    auditEventCount: discovery.auditEvents.length,
    verified: true as const,
  };
}

export async function rollbackD1SyntheticFilesystemShadow(
  pool: Pool,
  discovery: D1ShadowDiscovery,
) {
  const snapshots = new PostgresD1AsyncSnapshotBoundary(pool);
  let removedSnapshots = 0;
  for (const source of discovery.snapshots) {
    const record = await snapshots.load(source.storeKey);
    if (!record) continue;
    if (record.payloadSha256 !== source.payloadSha256)
      throw new Error("D1_SHADOW_ROLLBACK_DIGEST_MISMATCH");
    if (await snapshots.removeSyntheticFilesystemShadow(source.storeKey, record.revision))
      removedSnapshots += 1;
  }

  // Audit rows are append-only by design and are not deleted during rollback.
  // A shadow rollback only removes mutable shadow snapshots. Imported audit
  // evidence remains as synthetic migration evidence and cannot be rewritten.
  return {
    removedSnapshots,
    retainedAppendOnlyAuditEvents: discovery.auditEvents.length,
  };
}
