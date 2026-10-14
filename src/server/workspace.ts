import { z } from "zod";

import type { PartnerAdapterRegistry } from "../domain/adapterRegistry";
import { PartnerCapabilityPrincipalSchema } from "../domain/partnerCapabilityContract";
import {
  SYNTHETIC_PARTNERFI_SERVICE_CATALOGS,
  SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS,
  generatePartnerServiceManifest,
} from "../domain/partnerServiceCatalog";
import {
  buildWorkspaceProviderStates,
  generateWorkspaceManifest,
} from "../domain/workspaceManifest";
import {
  SyntheticAuthError,
  defaultSyntheticWorkspaceContextForRole,
  syntheticWorkspaceContextForReference,
  type SyntheticPrincipal,
  type SyntheticRole,
  type SyntheticWorkspaceContext,
} from "./auth";

export const SyntheticWorkspaceKeySchema = z.enum([
  "ALPHA_AGENT_ADAMA",
  "BETA_AGENT_ADAMA",
  "ALPHA_SUPERVISOR_ADAMA",
  "ALPHA_OPERATIONS_ADAMA",
  "ALPHA_PARTNER_ADMIN_ADAMA",
]);
export type SyntheticWorkspaceKey = z.infer<typeof SyntheticWorkspaceKeySchema>;

const workspaceRole: Record<SyntheticWorkspaceKey, SyntheticRole> = {
  ALPHA_AGENT_ADAMA: "AGENT",
  BETA_AGENT_ADAMA: "AGENT",
  ALPHA_SUPERVISOR_ADAMA: "SUPERVISOR",
  ALPHA_OPERATIONS_ADAMA: "OPERATIONS",
  ALPHA_PARTNER_ADMIN_ADAMA: "PARTNER_ADMIN",
};

export function resolveSyntheticWorkspaceContext(input: {
  role: SyntheticRole;
  workspaceKey?: SyntheticWorkspaceKey;
}): SyntheticWorkspaceContext {
  if (!input.workspaceKey) return defaultSyntheticWorkspaceContextForRole(input.role);
  if (workspaceRole[input.workspaceKey] !== input.role)
    throw new SyntheticAuthError("ROLE_ACCESS_DENIED", 403);

  if (input.workspaceKey === "ALPHA_AGENT_ADAMA")
    return syntheticWorkspaceContextForReference("ALPHA_AGENT_ADAMA");
  if (input.workspaceKey === "BETA_AGENT_ADAMA")
    return syntheticWorkspaceContextForReference("BETA_AGENT_ADAMA");
  if (input.workspaceKey === "ALPHA_SUPERVISOR_ADAMA")
    return syntheticWorkspaceContextForReference("ALPHA_SUPERVISOR_ADAMA");

  return defaultSyntheticWorkspaceContextForRole(input.role);
}

export function generateSyntheticWorkspaceForSession(input: {
  session: SyntheticPrincipal;
  registry: PartnerAdapterRegistry;
  evaluatedAt: string;
}) {
  const context = input.session.workspaceContext;
  const partnerOrgId = context.activePartnerOrgId;
  const catalogs = SYNTHETIC_PARTNERFI_SERVICE_CATALOGS as Record<string, unknown>;
  const contracts = SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS as Record<string, any>;
  const catalog = catalogs[partnerOrgId];
  const contract = contracts[partnerOrgId];
  if (!catalog || !contract)
    throw new SyntheticAuthError("PARTNER_WORKSPACE_UNAVAILABLE", 403);

  const principal = PartnerCapabilityPrincipalSchema.parse({
    userId: input.session.userId,
    partnerOrgMemberships: context.partnerOrgMemberships,
    roleAssignments: [{ partnerOrgId, role: input.session.role }],
    regionIds: [context.regionId],
    agentGroupIds: context.agentGroupIds,
    serviceScopes: context.serviceScopes,
    objectScopes: context.objectScopes,
  });

  const serviceManifest = generatePartnerServiceManifest({
    catalog,
    contract,
    principal,
    role: input.session.role,
    regionId: context.regionId,
    routesById: input.registry.resolvedRoutesById(),
    evaluatedAt: input.evaluatedAt,
  });

  const providerStates = buildWorkspaceProviderStates({
    role: input.session.role,
    adapters: input.registry.adapterMetadata(),
    routes: input.registry.routeMetadata(),
  });

  return generateWorkspaceManifest({
    partnerOrgId,
    partnerDisplayName: contract.displayName,
    role: input.session.role,
    environment: contract.environment,
    regionId: context.regionId,
    serviceManifest,
    providerStates,
  });
}
