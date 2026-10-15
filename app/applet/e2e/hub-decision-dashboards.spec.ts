import { expect, test } from "@playwright/test";
import { SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS } from "../../../src/domain/hubEconomics";
import { SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS } from "../../../src/domain/pilotEvidenceEngine";

async function mockDecisionReadModels(page: import("@playwright/test").Page) {
  await page.route("**/api/demo/hubs/*/economics", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ readOnly: true, economics: [SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS[0]] }) });
  });
  await page.route("**/api/demo/hubs/*/pilot-evidence", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ readOnly: true, programs: [SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS[0]] }) });
  });
}

test("Hub Economics UX keeps model output separate from observed performance", async ({ page }) => {
  await mockDecisionReadModels(page);
  await page.goto("/hub/economics");
  await expect(page.getByTestId("hub-economics-page")).toBeVisible();
  await expect(page.getByText("Modeled Hub economics")).toBeVisible();
  await expect(page.getByText("Observed performance is unavailable")).toBeVisible();
  await expect(page.getByText("UNAVAILABLE", { exact: true })).toBeVisible();
  await expect(page.getByText(/not accounting truth or pilot performance/i)).toBeVisible();
  await page.getByRole("button", { name: "View model evidence" }).click();
  await expect(page.getByText("Integrity reference", { exact: true })).toBeVisible();
  await expect(page.getByText(/grants no funds, posting, settlement, accounting or production authority/i)).toBeVisible();
});

test("Pilot Evidence UX shows P1-P11 without issuing authorization", async ({ page }) => {
  await mockDecisionReadModels(page);
  await page.goto("/hub/pilot-evidence");
  await expect(page.getByTestId("pilot-evidence-page")).toBeVisible();
  await expect(page.getByText("P1-P11 evidence state")).toBeVisible();
  await expect(page.locator('[data-testid^="pilot-gate-"]')).toHaveCount(11);
  await expect(page.getByText("Pilot decision: No authorization issued")).toBeVisible();
  await expect(page.getByText(/Evidence is not approval/)).toBeVisible();
  await page.getByTestId("pilot-gate-P1").getByRole("button", { name: "View evidence" }).click();
  await expect(page.getByText(/selfAuthorizedScale is false/)).toBeVisible();
});
