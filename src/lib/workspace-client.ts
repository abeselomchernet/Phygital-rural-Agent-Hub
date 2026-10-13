import type { WorkspaceManifest } from "../domain/workspaceManifest";

export type SyntheticWorkspaceRole =
  | "AGENT"
  | "SUPERVISOR"
  | "OPERATIONS"
  | "PARTNER_ADMIN";

export type SyntheticWorkspaceKey =
  | "ALPHA_AGENT_ADAMA"
  | "BETA_AGENT_ADAMA"
  | "ALPHA_SUPERVISOR_ADAMA"
  | "ALPHA_OPERATIONS_ADAMA"
  | "ALPHA_PARTNER_ADMIN_ADAMA";

async function parseJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("WORKSPACE_API_UNAVAILABLE");
  return response.json();
}

export async function loadCapabilityWorkspace(): Promise<WorkspaceManifest> {
  const response = await fetch("/api/demo/workspace", {
    credentials: "same-origin",
  });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (!response.ok) {
    const body = await parseJson(response).catch(() => ({}));
    throw new Error(body.error ?? "WORKSPACE_API_UNAVAILABLE");
  }
  return (await parseJson(response)) as WorkspaceManifest;
}

export async function startCapabilityWorkspace(input: {
  role: SyntheticWorkspaceRole;
  workspaceKey: SyntheticWorkspaceKey;
}): Promise<WorkspaceManifest> {
  const response = await fetch("/api/demo/session/start", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await parseJson(response).catch(() => ({}));
    throw new Error(body.error ?? "WORKSPACE_SESSION_UNAVAILABLE");
  }
  await parseJson(response);
  return loadCapabilityWorkspace();
}
