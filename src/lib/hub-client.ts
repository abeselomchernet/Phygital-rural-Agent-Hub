import type { HubServiceWorkspaceManifest } from "../domain/hubServiceComposition";
import type { HubEconomicsReadModel } from "../domain/hubEconomics";
import type { PilotEvidenceReadModel } from "../domain/pilotEvidenceEngine";

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
