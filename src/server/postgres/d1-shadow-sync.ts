import type { Pool } from "pg";
import type { D1ShadowDiscovery, D1ShadowSource } from "./d1-shadow-migration";
import { verifyD1SyntheticFilesystemShadow } from "./d1-shadow-migration";
import { PostgresD1AppendOnlyBoundary } from "./d1-append-only-boundary";
import { PostgresD1AsyncSnapshotBoundary, d1CanonicalPayloadSha256 } from "./d1-async-boundary";

export type D1ShadowSyncStatus =
  | "DATABASE_MISSING"
  | "MATCHED"
  | "UPDATE_REQUIRED"
  | "CONFLICT_POSTGRES_OWNED";

export type D1ShadowSyncPlanItem = {
  fileName: string;
  storeKey: string;
  sourceDigest: string;
  databaseDigest: string | null;
  databaseRevision: number | null;
  status: D1ShadowSyncStatus;
};

export type D1ShadowSyncPlan = {
  authority: "SYNTHETIC_FILESYSTEM_PRIMARY";
  runtimeCutover: false;
  items: D1ShadowSyncPlanItem[];
  audit: {
    sourceEvents: number;
    databasePresent: number;
    databaseMissing: number;
  };
  conflicts: number;
  writesRequired: number;
};

async function planSnapshot(
  boundary: PostgresD1AsyncSnapshotBoundary,
  source: D1ShadowSource,
): Promise<D1ShadowSyncPlanItem> {
  const existing = await boundary.load(source.storeKey);
  if (!existing) {
    return {
      fileName: source.fileName,
      storeKey: source.storeKey,
      sourceDigest: source.payloadSha256,
      databaseDigest: null,
      databaseRevision: null,
      status: "DATABASE_MISSING",
    };
  }

  if (existing.sourceKind !== "SYNTHETIC_FILESYSTEM") {
    return {
      fileName: source.fileName,
      storeKey: source.storeKey,
      sourceDigest: source.payloadSha256,
      databaseDigest: existing.payloadSha256,
      databaseRevision: existing.revision,
      status: "CONFLICT_POSTGRES_OWNED",
    };
  }

  return {
    fileName: source.fileName,
    storeKey: source.storeKey,
    sourceDigest: source.payloadSha256,
    databaseDigest: existing.payloadSha256,
    databaseRevision: existing.revision,
    status:
      existing.payloadSha256 === source.payloadSha256 ? "MATCHED" : "UPDATE_REQUIRED",
  };
}

export async function planD1SyntheticFilesystemShadowSync(
  pool: Pool,
  discovery: D1ShadowDiscovery,
): Promise<D1ShadowSyncPlan> {
  const boundary = new PostgresD1AsyncSnapshotBoundary(pool);
  const appendOnly = new PostgresD1AppendOnlyBoundary(pool);
  const items: D1ShadowSyncPlanItem[] = [];

  for (const source of discovery.snapshots) {
    items.push(await planSnapshot(boundary, source));
  }

  let databasePresent = 0;
  let databaseMissing = 0;
  for (const event of discovery.auditEvents) {
    const digest = d1CanonicalPayloadSha256(event);
    if (await appendOnly.loadSyntheticAuditEventByDigest(digest)) databasePresent += 1;
    else databaseMissing += 1;
  }

  return {
    authority: "SYNTHETIC_FILESYSTEM_PRIMARY",
    runtimeCutover: false,
    items,
    audit: {
      sourceEvents: discovery.auditEvents.length,
      databasePresent,
      databaseMissing,
    },
    conflicts: items.filter((item) => item.status === "CONFLICT_POSTGRES_OWNED").length,
    writesRequired:
      items.filter(
        (item) => item.status === "DATABASE_MISSING" || item.status === "UPDATE_REQUIRED",
      ).length + databaseMissing,
  };
}

export async function syncD1SyntheticFilesystemShadow(
  pool: Pool,
  discovery: D1ShadowDiscovery,
) {
  const plan = await planD1SyntheticFilesystemShadowSync(pool, discovery);
  if (plan.conflicts > 0) throw new Error("D1_SHADOW_SYNC_CONFLICT_REVIEW_REQUIRED");

  const boundary = new PostgresD1AsyncSnapshotBoundary(pool);
  const appendOnly = new PostgresD1AppendOnlyBoundary(pool);
  const results: Array<{
    storeKey: string;
    status: "CREATED" | "UPDATED" | "MATCHED";
    revision: number;
    digest: string;
  }> = [];

  for (const source of discovery.snapshots) {
    const item = plan.items.find((candidate) => candidate.storeKey === source.storeKey);
    if (!item) throw new Error("D1_SHADOW_SYNC_PLAN_INCOMPLETE");

    if (item.status === "MATCHED") {
      if (item.databaseRevision === null || item.databaseDigest === null)
        throw new Error("D1_SHADOW_SYNC_PLAN_INVALID");
      results.push({
        storeKey: source.storeKey,
        status: "MATCHED",
        revision: item.databaseRevision,
        digest: item.databaseDigest,
      });
      continue;
    }

    if (item.status === "CONFLICT_POSTGRES_OWNED")
      throw new Error("D1_SHADOW_SYNC_CONFLICT_REVIEW_REQUIRED");

    const written = await boundary.compareAndSwap({
      storeKey: source.storeKey,
      storageClass: "TRANSACTIONAL_STATE",
      expectedRevision: item.databaseRevision ?? 0,
      payload: source.payload,
      sourceKind: "SYNTHETIC_FILESYSTEM",
    });
    results.push({
      storeKey: source.storeKey,
      status: item.status === "DATABASE_MISSING" ? "CREATED" : "UPDATED",
      revision: written.revision,
      digest: written.payloadSha256,
    });
  }

  let auditInserted = 0;
  let auditMatched = 0;
  for (const event of discovery.auditEvents) {
    const result = await appendOnly.appendSyntheticAuditEvent(event);
    if (result.inserted) auditInserted += 1;
    else auditMatched += 1;
  }

  const verification = await verifyD1SyntheticFilesystemShadow(pool, discovery);
  return {
    authority: "SYNTHETIC_FILESYSTEM_PRIMARY" as const,
    runtimeCutover: false as const,
    snapshots: results,
    audit: {
      inserted: auditInserted,
      matchedExisting: auditMatched,
      total: discovery.auditEvents.length,
    },
    verification,
  };
}
