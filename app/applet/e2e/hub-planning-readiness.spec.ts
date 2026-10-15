import { expect, test } from "@playwright/test";
import { SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS } from "../../../src/domain/corridorPlanning";
import { SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS } from "../../../src/domain/hubOperatorDeviceReadiness";

async function mockF4ReadModels(page: import("@playwright/test").Page) {
  await page.route("**/api/demo/hubs/*/corridor-planning", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ readOnly: true, plans: [SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS[0]] }) });
  });
  await page.route("**/api/demo/hubs/*/operator-device-readiness", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ readOnly: true, readiness: [SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS[0]] }) });
  });
}

test("Corridor Planning compares synthetic candidates without geographic authorization", async ({ page }) => {
  await mockF4ReadModels(page);
  await page.goto("/hub/corridor-planning");
  await expect(page.getByTestId("corridor-planning-page")).toBeVisible();
  await expect(page.getByText("Bounded corridor comparison")).toBeVisible();
  await expect(page.getByText("Geographic authorization: NOT GRANTED.")).toBeVisible();
  await expect(page.getByText(/Planning recommendation is not authorization/)).toBeVisible();
  await page.getByRole("button", { name: "View plan evidence" }).click();
  await expect(page.getByText(/Recommendation creates no geographic, pilot, expansion or live-site authority/)).toBeVisible();
});

test("Operator and Device Readiness exposes evidence without control authority", async ({ page }) => {
  await mockF4ReadModels(page);
  await page.goto("/hub/readiness");
  await expect(page.getByTestId("operator-device-readiness-page")).toBeVisible();
  await expect(page.getByText("Readiness evidence", { exact: true })).toBeVisible();
  await expect(page.getByText(/There are no remote-control, provider-command or firmware-mutation controls/)).toBeVisible();
  await expect(page.getByText(/Readiness evidence is not operational authority/)).toBeVisible();
  await page.getByRole("button", { name: "View plan evidence" }).click();
  await expect(page.getByText(/creates no financial, provider, regulated or device-control authority/)).toBeVisible();
});