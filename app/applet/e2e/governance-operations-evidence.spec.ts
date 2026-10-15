import { expect, test } from "@playwright/test";
import { SYNTHETIC_E9_NEUTRALITY_READ_MODELS } from "../../../src/domain/hubNeutralityGovernance";
import { SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL } from "../../../src/domain/hubOfflineOperationsEvidence";

async function mockF5ReadModels(page: import("@playwright/test").Page) {
  await page.route("**/api/demo/hubs/*/neutrality-governance", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ readOnly: true, neutrality: SYNTHETIC_E9_NEUTRALITY_READ_MODELS }) });
  });
  await page.route("**/api/demo/hub-operations/offline-evidence**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ readOnly: true, traces: SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL }) });
  });
}

test("Neutrality Governance shows synthetic review without route interchangeability", async ({ page }) => {
  await mockF5ReadModels(page);
  await page.goto("/hub/neutrality");
  await expect(page.getByTestId("neutrality-governance-page")).toBeVisible();
  await expect(page.getByText("Partner-neutral governance evidence")).toBeVisible();
  await expect(page.getByText(/Route mutation and fallback remain disabled/)).toBeVisible();
  const checks = page.locator('[data-testid^="neutrality-check-"]');
  await expect(checks.first()).toBeVisible();
  await checks.first().getByRole("button", { name: "View evidence" }).click();
  await expect(page.getByText(/cannot authorize route interchangeability, fallback, automatic route selection/i)).toBeVisible();
});

test("Operations Evidence shows trace timeline without settlement semantics", async ({ page }) => {
  await mockF5ReadModels(page);
  await page.goto("/operations/evidence");
  await expect(page.getByTestId("operations-evidence-page")).toBeVisible();
  await expect(page.getByText("Offline & reconciliation evidence")).toBeVisible();
  const traces = page.locator('[data-testid^="operations-trace-"]');
  await expect(traces.first()).toBeVisible();
  await expect(page.getByText(/Transport is not settlement/)).toBeVisible();
  await traces.first().getByRole("button", { name: "View evidence" }).first().click();
  await expect(page.getByText(/Client queue records are untrusted intent/)).toBeVisible();
});
