import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("operations reconciliation workspace is visible but privileged session is fail-closed by default", async ({
  page,
}) => {
  await page.goto("/operations");
  await expect(
    page.getByRole("heading", { name: "Operations & Reconciliation Center" }),
  ).toBeVisible();
  await expect(page.getByText("ArifPay · Sandbox")).toBeVisible();
  await expect(page.getByText("Webhook authority")).toBeVisible();
  await expect(page.getByText("PartnerFI · Separate")).toBeVisible();

  await page
    .getByRole("button", { name: "Start synthetic supervisor session" })
    .click();
  await expect(page.getByTestId("operations-message")).toContainText(
    "ALLOW_PRIVILEGED_SYNTHETIC_ROLES=true",
  );
  await expect(
    page.getByRole("button", { name: "Check provider status" }),
  ).toBeDisabled();
});
