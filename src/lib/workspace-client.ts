import type { WorkspaceManifest } from "../domain/workspaceManifest";
import {
  startDemoSession,
  type SyntheticRole as SyntheticWorkspaceRole,
  type SyntheticWorkspaceKey,
} from "./demo-api-client";

export type { SyntheticWorkspaceKey, SyntheticWorkspaceRole };

async function parseJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json"))
    throw new Error("WORKSPACE_API_UNAVAILABLE");
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
  await startDemoSession(input.role, input.workspaceKey);
  return loadCapabilityWorkspace();
}
