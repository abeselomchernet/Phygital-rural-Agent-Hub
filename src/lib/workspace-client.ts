import { z } from "zod";

import { WorkspaceManifestSchema, type WorkspaceManifest } from "../domain/workspaceManifest";
import {
  startDemoSession,
  type SyntheticRole as SyntheticWorkspaceRole,
  type SyntheticWorkspaceKey,
} from "./demo-api-client";

export type { SyntheticWorkspaceKey, SyntheticWorkspaceRole };

const WorkspaceApiResponseSchema = WorkspaceManifestSchema.extend({
  simulated: z.literal(true),
  dataMode: z.literal("synthetic"),
  capabilityStatus: z.literal("SYNTHETIC DEMO"),
  notice: z.string().min(1).max(240),
});

async function parseJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json"))
    throw new Error("WORKSPACE_API_UNAVAILABLE");
  return response.json();
}

export async function loadCapabilityWorkspace(): Promise<WorkspaceManifest> {
  const response = await fetch("/api/demo/workspace", {
    credentials: "same-origin",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401) throw new Error("WORKSPACE_SESSION_REQUIRED");
  if (response.status === 403) throw new Error("WORKSPACE_ACCESS_DENIED");
  if (!response.ok) {
    const body = await parseJson(response).catch(() => ({}));
    throw new Error(body.error ?? "WORKSPACE_API_UNAVAILABLE");
  }

  const {
    simulated: _simulated,
    dataMode: _dataMode,
    capabilityStatus: _capabilityStatus,
    notice: _notice,
    ...manifest
  } = WorkspaceApiResponseSchema.parse(await parseJson(response));
  return manifest;
}

export async function startCapabilityWorkspace(input: {
  role: SyntheticWorkspaceRole;
  workspaceKey: SyntheticWorkspaceKey;
}): Promise<WorkspaceManifest> {
  await startDemoSession(input.role, input.workspaceKey);
  return loadCapabilityWorkspace();
}
