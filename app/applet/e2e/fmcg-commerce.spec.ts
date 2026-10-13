import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("FMCG inventory and logistics stays synthetic, minimized and read-only", async ({ page }) => {
  await page.goto("/");

  const homeCard = page.getByTestId("fmcg-home-card");
  await expect(homeCard).toContainText("FMCG inventory & logistics");
  await expect(homeCard).toContainText("No live order, dispatch or settlement");
  await homeCard
    .getByRole("link", { name: "Open FMCG Inventory & Logistics Console" })
    .click();

  await expect(page).toHaveURL(/\/fmcg$/);
  await expect(
    page.getByRole("heading", { name: "FMCG Inventory & Logistics Console" }),
  ).toBeVisible();

  const minimized = page.getByTestId("fmcg-data-minimization");
  await expect(minimized).toContainText("SYNTHETIC_INVENTORY_AGGREGATE");
  await expect(minimized).toContainText("Customer KYC access: Disabled");
  await expect(minimized).toContainText("Customer bank-balance access: Disabled");

  const drafts = page.getByTestId("fmcg-restock-drafts");
  await expect(drafts).toContainText("Seed packs");
  await expect(drafts).toContainText("Solar lanterns");
  await expect(drafts).toContainText("Receipt rolls");
  await expect(drafts).toContainText(/PLANNING_MATCH_ONLY|UNMATCHED_PLANNING_SHORTFALL/);

  const boundary = page.getByTestId("fmcg-no-action-boundary");
  await expect(boundary).toContainText("No live order submission");
  await expect(boundary).toContainText("No dispatch");
  await expect(boundary).toContainText("No commercial settlement");
  await expect(boundary).toContainText("No PartnerFI account mutation");

  await expect(
    page.getByTestId("fmcg-console").getByRole("button", {
      name: /submit|order|dispatch|deliver|settle|post|transfer/i,
    }),
  ).toHaveCount(0);
});
