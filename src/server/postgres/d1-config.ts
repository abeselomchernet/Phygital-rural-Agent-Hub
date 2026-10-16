import { z } from "zod";
import { validateDataConfig } from "../../domain/residency";

const D1PostgresModeSchema = z.literal("local-synthetic");

export type D1PostgresFoundationConfig =
  | { enabled: false }
  | {
      enabled: true;
      mode: "local-synthetic";
      connectionString: string;
      applicationName: "enawuga-d1-foundation";
    };

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function loadD1PostgresFoundationConfig(
  env: Record<string, string | undefined>,
): D1PostgresFoundationConfig {
  validateDataConfig(env);

  const enabledRaw = env.D1_POSTGRES_ENABLED;
  if (enabledRaw !== undefined && enabledRaw !== "true" && enabledRaw !== "false")
    throw new Error("D1_POSTGRES_ENABLED_INVALID");

  if (enabledRaw !== "true") return { enabled: false };

  const mode = D1PostgresModeSchema.safeParse(env.D1_POSTGRES_MODE);
  if (!mode.success) throw new Error("D1_POSTGRES_LOCAL_SYNTHETIC_MODE_REQUIRED");

  const rawUrl = env.D1_POSTGRES_URL;
  if (!rawUrl) throw new Error("D1_POSTGRES_URL_REQUIRED");

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("D1_POSTGRES_URL_INVALID");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    throw new Error("D1_POSTGRES_URL_INVALID");

  if (!isLoopbackHostname(parsed.hostname))
    throw new Error("D1_POSTGRES_NONLOCAL_NOT_AUTHORIZED");

  if (!parsed.pathname || parsed.pathname === "/")
    throw new Error("D1_POSTGRES_DATABASE_REQUIRED");

  return {
    enabled: true,
    mode: "local-synthetic",
    connectionString: rawUrl,
    applicationName: "enawuga-d1-foundation",
  };
}
