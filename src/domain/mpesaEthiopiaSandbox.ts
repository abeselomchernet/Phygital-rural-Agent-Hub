import { z } from "zod";

const InactiveConfigSchema = z.object({
  networkEnabled: z.literal(false).default(false),
  contractStatus: z.literal("EVIDENCE_RETRIEVED").default("EVIDENCE_RETRIEVED"),
  environment: z.literal("sandbox").default("sandbox"),
}).strict();

/**
 * Readiness metadata only. Ethiopia sandbox contract evidence is now pinned,
 * but runtime networking and provider operations remain deliberately unmounted.
 */
export function createMpesaEthiopiaSandboxFoundation(input: unknown = {}) {
  const parsed = InactiveConfigSchema.safeParse(input);
  if (!parsed.success) throw new Error("MPESA_ETHIOPIA_FOUNDATION_INACTIVE");
  return Object.freeze({
    provider: "MPESA_ETHIOPIA_DIRECT" as const,
    jurisdiction: "ET" as const,
    environment: parsed.data.environment,
    networkEnabled: parsed.data.networkEnabled,
    contractStatus: parsed.data.contractStatus,
    tokenContract: "documented" as const,
    initiation: "unavailable" as const,
    statusRead: "unavailable" as const,
    notifications: "unavailable" as const,
  });
}

export const mpesaEthiopiaSandboxFoundation = createMpesaEthiopiaSandboxFoundation();
