import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const vercel = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
) as {
  buildCommand?: string;
  rewrites?: Array<{ source: string; destination: string }>;
};

test("F11 Vercel deployment is an explicit static showcase, not backend-unavailable functional mode", () => {
  assert.equal(
    vercel.buildCommand,
    "VITE_RUNTIME_MODE=static-showcase npm run build",
  );
  assert.deepEqual(vercel.rewrites, [
    { source: "/(.*)", destination: "/index.html" },
  ]);
});
