import { expect, test } from "@playwright/test";

test("governed Hub overview loads service composition and evidence details", async ({ page }) => {
  await page.goto("/hub");
  await expect(page.getByTestId("hub-overview-page")).toBeVisible();
  await expect(page.getByText("Services & capabilities")).toBeVisible();
  await expect(page.getByText("No production authority").first()).toBeVisible();

  const serviceCards = page.locator('[data-testid^="hub-service-"]');
  await expect(serviceCards.first()).toBeVisible();
  await serviceCards.first().getByRole("button", { name: "View evidence" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Authority implication", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not grant live provider, posting, settlement or production authority/i)).toBeVisible();
  await page.getByRole("button", { name: "Close evidence details" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
