import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("F6 Agent field status separates browser connectivity from provider authority", () => {
  const status = read("src/components/AgentFieldStatus.tsx");
  const ghostsync = read("src/lib/ghostsync.ts");
  assert.match(status, /Browser connectivity signal/);
  assert.match(status, /navigator\.onLine/);
  assert.match(status, /Remote provider delivery/);
  assert.match(status, /does not prove provider reachability, authorization, posting or settlement/);
  assert.match(ghostsync, /remoteSyncEnabled = false/);
});

test("F6 mobile Agent navigation is derived from governed manifest items", () => {
  const shell = read("src/components/CapabilityWorkspaceShell.tsx");
  const css = read("src/components/capability-workspace.css");
  assert.match(shell, /manifest\.navigation\.flatMap/);
  assert.match(shell, /manifest\.role !== "AGENT"/);
  assert.match(shell, /Agent primary mobile navigation/);
  assert.match(css, /data-role="AGENT"/);
  assert.match(css, /min-height:\s*48px/);
});

test("F6 queue has a mobile card alternative without changing settlement semantics", () => {
  const queue = read("src/pages/GhostSyncQueue.tsx");
  const css = read("src/components/agent-field.css");
  assert.match(queue, /agent-queue-cards/);
  assert.match(queue, /Financial state/);
  assert.match(queue, /Retry locally/);
  assert.match(queue, /Delivery success is not financial settlement/);
  assert.match(css, /agent-queue-table/);
});

test("F6 uses canonical Wishland interaction tokens and versions frontend documentation", () => {
  const presentationCss = read("src/components/product-presentation.css");
  const brand = read("docs/frontend/WISHLAND_BRAND_AND_DESIGN_SYSTEM.md");
  const architecture = read("docs/frontend/FRONTEND_ARCHITECTURE.md");
  const implementation = read("docs/frontend/F6_AGENT_FIELD_MOBILE_IMPLEMENTATION.md");
  assert.match(presentationCss, /background:\s*var\(--wl-navy-900\) !important/);
  assert.match(presentationCss, /background:\s*var\(--wl-teal-600\) !important/);
  assert.match(brand, /Agent field\/mobile application of the brand/);
  assert.match(architecture, /F6 Agent field\/mobile experience/);
  assert.match(implementation, /Browser connectivity signal/);
});
