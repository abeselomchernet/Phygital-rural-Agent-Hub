import { z } from "zod";

const InactiveConfigSchema = z.object({
  networkEnabled: z.literal(false).default(false),
  contractStatus: z.literal("UNVERIFIED").default("UNVERIFIED"),
  environment: z.literal("sandbox").default("sandbox"),
}).strict();

/** Metadata only. No endpoint, credentials, transport or provider operations. */
export function createMpesaEthiopiaSandboxFoundation(input: unknown = {}) {
  const parsed = InactiveConfigSchema.safeParse(input);
  if (!parsed.success) throw new Error("MPESA_ETHIOPIA_CONTRACT_UNVERIFIED");
  return Object.freeze({
    provider: "MPESA_ETHIOPIA_DIRECT" as const,
    jurisdiction: "ET" as const,
    environment: parsed.data.environment,
    networkEnabled: parsed.data.networkEnabled,
    contractStatus: parsed.data.contractStatus,
    initiation: "unavailable" as const,
    status: "unavailable" as const,
    notification: "unavailable" as const,
  });
}

export const mpesaEthiopiaSandboxFoundation = createMpesaEthiopiaSandboxFoundation();
