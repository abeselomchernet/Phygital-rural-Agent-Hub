export const DataClassifications = [
  "RESTRICTED_FINANCIAL",
  "RESTRICTED_IDENTITY",
  "OPERATIONAL_CONFIDENTIAL",
  "AGGREGATED_NON_PII",
  "SYNTHETIC_DEMO",
  "PUBLIC",
] as const;
export const dataFlows = {
  partnerAccounts: "RESTRICTED_FINANCIAL",
  customers: "RESTRICTED_IDENTITY",
  outbox: "RESTRICTED_FINANCIAL",
  regulatedAudit: "RESTRICTED_FINANCIAL",
  infrastructure: "OPERATIONAL_CONFIDENTIAL",
  aggregateMetrics: "AGGREGATED_NON_PII",
  fixtures: "SYNTHETIC_DEMO",
  documentation: "PUBLIC",
} as const;
export function validateDataConfig(env: Record<string, string | undefined>) {
  const mode = env.DATA_MODE ?? "synthetic";
  if (!["synthetic", "regulated"].includes(mode))
    throw new Error("INVALID_DATA_MODE");
  if (env.ALLOW_EXTERNAL_TELEMETRY && env.ALLOW_EXTERNAL_TELEMETRY !== "false")
    throw new Error("EXTERNAL_TELEMETRY_DISABLED");
  if (mode === "regulated") {
    if (env.REGULATED_DATA_RESIDENCY !== "ET")
      throw new Error("REGULATED_RESIDENCY_MUST_BE_ET");
    // No approved infrastructure, key custody or durable/authenticated partner receiver exists.
    // Fail closed even if a hostname or region string claims Ethiopia.
    throw new Error(
      "REGULATED_MODE_UNSUPPORTED_PENDING_APPROVED_ET_INFRASTRUCTURE",
    );
  }
  return { dataMode: "synthetic" as const, externalTelemetry: false };
}
