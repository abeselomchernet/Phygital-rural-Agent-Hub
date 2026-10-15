import type { HubServiceWorkspaceManifest } from "../domain/hubServiceComposition";

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
