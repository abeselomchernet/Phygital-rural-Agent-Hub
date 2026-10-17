import type { Pool } from "pg";
import { z } from "zod";
import { d1CanonicalPayloadSha256 } from "./d1-async-boundary";
import {
  discoverD1SessionIdempotencyFilesystemState,
  planD1SessionIdempotencyShadow,
  type D1SessionPlanStatus,
} from "./d1-session-idempotency-shadow";

const DigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const IsoTimestampSchema = z.string().datetime({ offset: true });

const SessionStatusCountSchema = z
  .object({
    MATCHED: z.number().int().nonnegative(),
    EXPIRED_SOURCE_NOOP: z.number().int().nonnegative(),
    CREATE_REQUIRED: z.number().int().nonnegative(),
    RESTORE_REQUIRED: z.number().int().nonnegative(),
    EXPIRE_DELETE_REQUIRED: z.number().int().nonnegative(),
    SOURCE_MISSING_MARK_REQUIRED: z.number().int().nonnegative(),
    SOURCE_MISSING_REVIEW_REQUIRED: z.number().int().nonnegative(),
    CONFLICT_IMMUTABLE_SESSION: z.number().int().nonnegative(),
    CONFLICT_POSTGRES_OWNED: z.number().int().nonnegative(),
  })
  .strict();

export const D1SessionCanaryObservationSchema = z
  .object({
    schemaVersion: z.literal(1),
    evidenceType: z.literal("D1_SESSION_CANARY_PARITY_OBSERVATION"),
    observedAt: IsoTimestampSchema,
    sourceFingerprint: DigestSchema,
    authority: z.literal("SYNTHETIC_FILESYSTEM_PRIMARY"),
    readCanaryMode: z.literal("POSTGRES_SHADOW_CANARY"),
    runtimeActivationProvenByThisRecord: z.literal(false),
    sessionCount: z.number().int().nonnegative(),
    sessionStatuses: SessionStatusCountSchema,
    sessionConflicts: z.number().int().nonnegative(),
    sessionReviewRequired: z.number().int().nonnegative(),
    sessionWritesRequired: z.number().int().nonnegative(),
    recordedSampleClean: z.boolean(),
    cutoverAuthorized: z.literal(false),
    limitations: z.tuple([
      z.literal("POINT_IN_TIME_SAMPLE_ONLY"),
      z.literal("DOES_NOT_PROVE_CONTINUOUS_CANARY_UPTIME"),
      z.literal("DOES_NOT_AUTHORIZE_POSTGRES_PRIMARY"),
    ]),
  })
  .strict();

export type D1SessionCanaryObservation = z.infer<
  typeof D1SessionCanaryObservationSchema
>;

const ALL_SESSION_STATUSES: readonly D1SessionPlanStatus[] = [
  "CREATE_REQUIRED",
  "MATCHED",
  "RESTORE_REQUIRED",
  "EXPIRED_SOURCE_NOOP",
  "EXPIRE_DELETE_REQUIRED",
  "SOURCE_MISSING_MARK_REQUIRED",
  "SOURCE_MISSING_REVIEW_REQUIRED",
  "CONFLICT_IMMUTABLE_SESSION",
  "CONFLICT_POSTGRES_OWNED",
];

const WRITE_STATUSES = new Set<D1SessionPlanStatus>([
  "CREATE_REQUIRED",
  "RESTORE_REQUIRED",
  "EXPIRE_DELETE_REQUIRED",
  "SOURCE_MISSING_MARK_REQUIRED",
]);

function countSessionStatuses(statuses: readonly D1SessionPlanStatus[]) {
  const result = Object.fromEntries(
    ALL_SESSION_STATUSES.map((status) => [
      status,
      statuses.filter((candidate) => candidate === status).length,
    ]),
  );
  return SessionStatusCountSchema.parse(result);
}

export async function buildD1SessionCanaryObservation(input: {
  pool: Pool;
  stateDir: string;
  observedAt?: Date;
}) {
  const observedAt = input.observedAt ?? new Date();
  if (Number.isNaN(observedAt.getTime()))
    throw new Error("D1_SESSION_CANARY_OBSERVATION_TIME_INVALID");
  const discovery = discoverD1SessionIdempotencyFilesystemState(
    input.stateDir,
    observedAt.getTime(),
  );
  const plan = await planD1SessionIdempotencyShadow(input.pool, discovery);
  const statuses = plan.sessions.map((item) => item.status);
  const sessionStatuses = countSessionStatuses(statuses);
  const sessionConflicts = statuses.filter((status) =>
    status.startsWith("CONFLICT_"),
  ).length;
  const sessionReviewRequired = statuses.filter(
    (status) => status.includes("SOURCE_MISSING") || status.startsWith("CONFLICT_"),
  ).length;
  const sessionWritesRequired = statuses.filter((status) =>
    WRITE_STATUSES.has(status),
  ).length;
  const recordedSampleClean = statuses.every((status) =>
    ["MATCHED", "EXPIRED_SOURCE_NOOP"].includes(status),
  );

  return D1SessionCanaryObservationSchema.parse({
    schemaVersion: 1,
    evidenceType: "D1_SESSION_CANARY_PARITY_OBSERVATION",
    observedAt: observedAt.toISOString(),
    sourceFingerprint: discovery.fingerprint,
    authority: "SYNTHETIC_FILESYSTEM_PRIMARY",
    readCanaryMode: "POSTGRES_SHADOW_CANARY",
    runtimeActivationProvenByThisRecord: false,
    sessionCount: plan.sessions.length,
    sessionStatuses,
    sessionConflicts,
    sessionReviewRequired,
    sessionWritesRequired,
    recordedSampleClean,
    cutoverAuthorized: false,
    limitations: [
      "POINT_IN_TIME_SAMPLE_ONLY",
      "DOES_NOT_PROVE_CONTINUOUS_CANARY_UPTIME",
      "DOES_NOT_AUTHORIZE_POSTGRES_PRIMARY",
    ],
  });
}

export async function appendD1SessionCanaryObservation(
  pool: Pool,
  observationInput: D1SessionCanaryObservation,
) {
  const observation = D1SessionCanaryObservationSchema.parse(observationInput);
  const digest = d1CanonicalPayloadSha256(observation);
  const result = await pool.query(
    "INSERT INTO enawuga.evidence_record (evidence_digest, payload) " +
      "VALUES ($1, $2::jsonb) ON CONFLICT (evidence_digest) DO NOTHING RETURNING sequence",
    [digest, JSON.stringify(observation)],
  );
  return { inserted: result.rowCount === 1, digest };
}

export async function loadD1SessionCanaryObservations(pool: Pool) {
  const result = await pool.query(
    "SELECT evidence_digest, payload FROM enawuga.evidence_record ORDER BY sequence",
  );
  const observations: D1SessionCanaryObservation[] = [];
  for (const row of result.rows) {
    if (row?.payload?.evidenceType !== "D1_SESSION_CANARY_PARITY_OBSERVATION")
      continue;
    const observation = D1SessionCanaryObservationSchema.parse(row.payload);
    const digest = DigestSchema.parse(row.evidence_digest);
    if (d1CanonicalPayloadSha256(observation) !== digest)
      throw new Error("D1_SESSION_CANARY_EVIDENCE_DIGEST_MISMATCH");
    observations.push(observation);
  }
  return observations.sort(
    (left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt),
  );
}

export function summarizeD1SessionCanaryObservationHistory(
  observationsInput: readonly D1SessionCanaryObservation[],
) {
  const observations = observationsInput
    .map((item) => D1SessionCanaryObservationSchema.parse(item))
    .sort((left, right) => Date.parse(left.observedAt) - Date.parse(right.observedAt));
  const firstObservedAt = observations[0]?.observedAt ?? null;
  const lastObservedAt = observations.at(-1)?.observedAt ?? null;
  const observedSpanMs =
    firstObservedAt && lastObservedAt
      ? Math.max(0, Date.parse(lastObservedAt) - Date.parse(firstObservedAt))
      : 0;
  const minimumArchitectureSpanMs = 14 * 24 * 60 * 60 * 1000;
  const cleanSampleCount = observations.filter(
    (observation) => observation.recordedSampleClean,
  ).length;
  const uncleanSampleCount = observations.length - cleanSampleCount;

  return {
    evidenceType: "D1_SESSION_CANARY_PARITY_OBSERVATION" as const,
    observationCount: observations.length,
    cleanSampleCount,
    uncleanSampleCount,
    firstObservedAt,
    lastObservedAt,
    observedSpanMs,
    observedSpanDays: observedSpanMs / (24 * 60 * 60 * 1000),
    architectureMinimumSpanDays: 14,
    architectureMinimumSpanObserved:
      observations.length >= 2 && observedSpanMs >= minimumArchitectureSpanMs,
    allRecordedSamplesClean:
      observations.length > 0 && uncleanSampleCount === 0,
    continuousCanaryUptimeProven: false as const,
    postgresPrimaryCutoverAuthorized: false as const,
    nextGate: "MANUAL_STAGING_EVIDENCE_REVIEW_REQUIRED" as const,
    limitations: [
      "RECORDED_SAMPLES_ARE_POINT_IN_TIME_ONLY",
      "TIME_SPAN_ALONE_DOES_NOT_PROVE_CONTINUOUS_RUNTIME",
      "ARCHITECTURE_REQUIRES_MINIMUM_TWO_WEEK_DUAL_WRITE_PERIOD",
      "POSTGRES_PRIMARY_REQUIRES_SEPARATE_REVIEW_AND_AUTHORIZATION",
    ] as const,
  };
}
