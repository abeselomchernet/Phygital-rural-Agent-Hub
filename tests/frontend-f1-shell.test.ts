import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("F1/F4 governed Wishland/Enawuga palette and attribution remain explicit", () => {
  const tokens = read("src/components/wishland-brand.css");
  const presentation = read("src/components/ProductPresentation.tsx");
  assert.match(tokens, /--wl-navy-900:\s*#0a2a52/i);
  assert.match(tokens, /--wl-teal-600:\s*#007dba/i);
  assert.match(tokens, /--wl-gold-500:\s*#d4af37/i);
  assert.match(presentation, /wishland-wordmark\.png/);
  assert.match(presentation, /Wishland Networking PLC/);
  assert.match(presentation, /Technology provider/);
  assert.match(presentation, /Stage 4/);
  assert.match(presentation, /Synthetic/);
});

test("F1 exposes a governed Hub overview without adding Agent navigation authority", () => {
  const app = read("src/App.tsx");
  const manifest = read("src/domain/workspaceManifest.ts");
  const overview = read("src/pages/HubOverview.tsx");
  assert.match(app, /path="\/hub"/);
  assert.match(manifest, /hubId:\s*HubIdSchema/);
  assert.match(manifest, /label:\s*"Hub Overview",\s*path:\s*"\/hub"/);
  assert.match(overview, /No production authority/);
  assert.match(overview, /No live funds, settlement, geographic authorization/);
});

test("frontend architecture and Wishland design governance are versioned with the implementation", () => {
  const architecture = read("docs/frontend/FRONTEND_ARCHITECTURE.md");
  const brand = read("docs/frontend/WISHLAND_BRAND_AND_DESIGN_SYSTEM.md");
  const plan = read("docs/frontend/FRONTEND_DELIVERY_PLAN.md");
  assert.match(architecture, /one governed application with role-specific portals/i);
  assert.match(brand, /Wishland Networking PLC/);
  assert.match(brand, /official Wishland wordmark asset/i);
  assert.match(plan, /Backend E10 remains gated/);
});