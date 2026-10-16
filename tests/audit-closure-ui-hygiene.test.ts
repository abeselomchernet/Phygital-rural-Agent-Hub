import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("audit hygiene removes historical active route aliases from the governed app", () => {
  const app = read("src/App.tsx");
  for (const legacy of [
    "swaps", "fmcg-liquidity", "kentiq-payg", "smartcycle", "bank-racing",
    "psnp-plus", "securitization", "agri-connect", "agritrust", "governance", "sandbox", "audit",
  ]) {
    assert.equal(app.includes(`\"${legacy}\"`), false, `legacy active route retained: ${legacy}`);
  }
});

test("Hub reads have a bounded client timeout and Hub Overview exposes governed retry", () => {
  const client = read("src/lib/hub-client.ts");
  const overview = read("src/pages/HubOverview.tsx");
  assert.match(client, /HUB_REQUEST_TIMEOUT_MS = 5_000/);
  assert.match(client, /controller\.abort\(\)/);
  assert.match(client, /HUB_API_TIMEOUT/);
  assert.match(overview, /Retry Hub evidence/);
  assert.match(overview, /kind="error"/);
});
