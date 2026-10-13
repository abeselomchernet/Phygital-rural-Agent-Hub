import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("Supervisor / Regional Operations reflects Stage 3 boundaries", async ({ page }) => {
  await page.goto("/supervisor");

  const workspace = page.getByTestId("supervisor-regional-operations");
  await expect(
    workspace.getByRole("heading", { name: "Supervisor / Regional Operations" }),
  ).toBeVisible();
  await expect(workspace).toContainText("Stage 3 synthetic network-operations workspace");

  const boundary = page.getByTestId("supervisor-authority-boundary");
  await expect(boundary).toContainText("PartnerFI financial authority");
  await expect(boundary).toContainText("Cash movement / dispatch / handover");
  await expect(boundary).toContainText("Provider settlement");
  await expect(boundary).toContainText("does not itself grant a role, capability or object permission");

  await expect(workspace).toContainText("Network liquidity");
  await expect(workspace).toContainText("Cash Fleet planning");
  await expect(workspace).toContainText("FMCG inventory & logistics");
  await expect(workspace).toContainText("Partner ecosystem");

  await expect(page.getByText(/Virtual ATM Swap/i)).toHaveCount(0);
  await expect(page.getByText(/Swap Ledger Target/i)).toHaveCount(0);
  await expect(page.getByText(/BGI Distribution Truck/i)).toHaveCount(0);

  await workspace
    .getByRole("link", { name: "Open Network Liquidity Console" })
    .click();
  await expect(page).toHaveURL(/\/liquidity$/);
});
