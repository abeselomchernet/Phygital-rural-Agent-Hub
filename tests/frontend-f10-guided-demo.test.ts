import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("F10 mounts a bounded read-only guided demo in the governed app", () => {
  const app = read("src/App.tsx");
  const demo = read("src/pages/GuidedDemo.tsx");
  assert.match(app, /path="\/guided-demo"/);
  assert.match(demo, /Guided presentation · read-only/);
  assert.match(demo, /No live funds move/);
  assert.match(demo, /Presentation polish does not change system authority/);
  assert.doesNotMatch(demo, /SpeechSynthesis|speechSynthesis|fetch\(|sendDemoApi|activate production/i);
});

test("F10 exposes the same guided presentation through every governed role manifest", () => {
  const manifest = read("src/domain/workspaceManifest.ts");
  assert.equal((manifest.match(/id: "guided-demo"/g) ?? []).length, 4);
  assert.equal((manifest.match(/path: "\/guided-demo"/g) ?? []).length, 4);
});

test("F10 removes the obsolete voice presenter and zero-byte narrated-tour assets", () => {
  assert.equal(existsSync(new URL("../src/components/DemoPresenter.tsx", import.meta.url)), false);
  for (let scene = 1; scene <= 8; scene += 1) {
    assert.equal(existsSync(new URL(`../public/audio/scene_${scene}.mp3`, import.meta.url)), false);
  }
});
