import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  outputDir: "../../test-results",
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    url: "http://127.0.0.1:3010/api/health",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      HOST: "127.0.0.1",
      PORT: "3010",
      DATA_MODE: "synthetic",
      ALLOW_EXTERNAL_TELEMETRY: "false",
      ALLOW_PRIVILEGED_SYNTHETIC_ROLES: "true",
    },
  },
});
