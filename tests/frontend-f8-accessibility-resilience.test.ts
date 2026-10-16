import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("F8 provides shared bounded-state semantics without granting authority", () => {
  const source = read("src/components/BoundedState.tsx");
  assert.match(source, /loading.*error.*empty.*denied.*unavailable/s);
  assert.match(source, /aria-busy/);
  assert.doesNotMatch(source, /APPROVED|AUTHORIZED|SETTLED/);
});

test("F8 workspace and evidence interactions expose keyboard and assistive-technology contracts", () => {
  const shell = read("src/components/CapabilityWorkspaceShell.tsx");
  const drawer = read("src/components/EvidenceDrawer.tsx");
  const css = read("src/components/resilience-accessibility.css");
  assert.match(shell, /Skip to main content/);
  assert.match(shell, /aria-busy/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /event\.key === "Escape"/);
  assert.match(drawer, /event\.key !== "Tab"/);
  assert.match(drawer, /previousFocus\?\.focus/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /forced-colors/);
  assert.match(css, /min-height: 44px/);
});

test("F8 localization readiness labels non-English presentation as preview-only", () => {
  const presentation = read("src/components/ProductPresentation.tsx");
  const doc = read("docs/frontend/F8_ACCESSIBILITY_RESILIENCE_IMPLEMENTATION.md");
  assert.match(presentation, /English source language/);
  assert.match(presentation, /Preview only - local-speaker review required/);
  assert.match(doc, /not.*formal WCAG certification/i);
  assert.match(doc, /local-speaker review/i);
  assert.match(doc, /No UI accessibility treatment is authorization/);
});
