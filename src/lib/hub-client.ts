import type { HubServiceWorkspaceManifest } from "../domain/hubServiceComposition";
import type { HubEconomicsReadModel } from "../domain/hubEconomics";
import type { PilotEvidenceReadModel } from "../domain/pilotEvidenceEngine";
import type { CorridorPlanningReadModel } from "../domain/corridorPlanning";
import type { HubOperatorDeviceReadinessReadModel } from "../domain/hubOperatorDeviceReadiness";
import type { HubNeutralityGovernanceReadModel } from "../domain/hubNeutralityGovernance";
import type { HubOfflineEvidenceTrace } from "../domain/hubOfflineOperationsEvidence";

async function parseHubJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("HUB_API_UNAVAILABLE");
  return response.json();
}

export async function loadHubServices(hubId: string): Promise<HubServiceWorkspaceManifest> {
  const response = await fetch(`/api/demo/hubs/${encodeURIComponent(hubId)}/services`, { credentials: "same-origin" });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("HUB_ACCESS_DENIED");
  if (!response.ok) {
    const body = await parseHubJson(response).catch(() => ({}));
    throw new Error(body.error ?? "HUB_API_UNAVAILABLE");
  }
  return (await parseHubJson(response)) as HubServiceWorkspaceManifest;
}

export async function loadHubEconomics(hubId: string): Promise<readonly HubEconomicsReadModel[]> {
  const response = await fetch(`/api/demo/hubs/${encodeURIComponent(hubId)}/economics`, { credentials: "same-origin" });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("HUB_ACCESS_DENIED");
  if (!response.ok) { const body = await parseHubJson(response).catch(() => ({})); throw new Error(body.error ?? "HUB_API_UNAVAILABLE"); }
  const body = (await parseHubJson(response)) as { readOnly: true; economics: HubEconomicsReadModel[] };
  return body.economics;
}

export async function loadHubPilotEvidence(hubId: string): Promise<readonly PilotEvidenceReadModel[]> {
  const response = await fetch(`/api/demo/hubs/${encodeURIComponent(hubId)}/pilot-evidence`, { credentials: "same-origin" });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("HUB_ACCESS_DENIED");
  if (!response.ok) { const body = await parseHubJson(response).catch(() => ({})); throw new Error(body.error ?? "HUB_API_UNAVAILABLE"); }
  const body = (await parseHubJson(response)) as { readOnly: true; programs: PilotEvidenceReadModel[] };
  return body.programs;
}

export async function loadHubCorridorPlanning(hubId: string): Promise<readonly CorridorPlanningReadModel[]> {
  const response = await fetch(`/api/demo/hubs/${encodeURIComponent(hubId)}/corridor-planning`, { credentials: "same-origin" });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("HUB_ACCESS_DENIED");
  if (!response.ok) { const body = await parseHubJson(response).catch(() => ({})); throw new Error(body.error ?? "HUB_API_UNAVAILABLE"); }
  const body = (await parseHubJson(response)) as { readOnly: true; plans: CorridorPlanningReadModel[] };
  return body.plans;
}

export async function loadHubOperatorDeviceReadiness(hubId: string): Promise<readonly HubOperatorDeviceReadinessReadModel[]> {
  const response = await fetch(`/api/demo/hubs/${encodeURIComponent(hubId)}/operator-device-readiness`, { credentials: "same-origin" });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("HUB_ACCESS_DENIED");
  if (!response.ok) { const body = await parseHubJson(response).catch(() => ({})); throw new Error(body.error ?? "HUB_API_UNAVAILABLE"); }
  const body = (await parseHubJson(response)) as { readOnly: true; readiness: HubOperatorDeviceReadinessReadModel[] };
  return body.readiness;
}
export async function loadHubNeutralityGovernance(hubId: string): Promise<readonly HubNeutralityGovernanceReadModel[]> {
  const response = await fetch(`/api/demo/hubs/${encodeURIComponent(hubId)}/neutrality-governance`, { credentials: "same-origin" });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("HUB_ACCESS_DENIED");
  if (!response.ok) { const body = await parseHubJson(response).catch(() => ({})); throw new Error(body.error ?? "HUB_API_UNAVAILABLE"); }
  const body = (await parseHubJson(response)) as { readOnly: true; neutrality: HubNeutralityGovernanceReadModel[] };
  return body.neutrality;
}

export async function loadHubOfflineEvidence(hubId: string, correlationId?: string): Promise<readonly HubOfflineEvidenceTrace[]> {
  const params = new URLSearchParams({ hubId });
  if (correlationId) params.set("correlationId", correlationId);
  const response = await fetch(`/api/demo/hub-operations/offline-evidence?${params.toString()}`, { credentials: "same-origin" });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("HUB_ACCESS_DENIED");
  if (!response.ok) { const body = await parseHubJson(response).catch(() => ({})); throw new Error(body.error ?? "HUB_API_UNAVAILABLE"); }
  const body = (await parseHubJson(response)) as { readOnly: true; traces: HubOfflineEvidenceTrace[] };
  return body.traces;
}
