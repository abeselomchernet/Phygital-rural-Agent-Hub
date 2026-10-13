import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("operations reconciliation workspace is first-class navigation but privileged session is fail-closed by default", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Prototype modules" }))
    .toContainText("Operations");
  await page.getByRole("link", { name: "Operations", exact: true }).click();
  await expect(page).toHaveURL(/\/operations$/);
  await expect(
    page.getByRole("heading", { name: "Operations & Reconciliation Center" }),
  ).toBeVisible();
  await expect(page.getByText("ArifPay · Sandbox").first()).toBeVisible();
  await expect(page.getByText("Webhook authority")).toBeVisible();
  await expect(page.getByText("PartnerFI · Separate")).toBeVisible();

  const readiness = page.getByTestId("payment-provider-readiness");
  await expect(readiness).toContainText("Payment provider readiness");
  await expect(readiness).toContainText("Direct Telebirr · TestBed foundation");
  await expect(readiness).toContainText("Networking disabled");
  await expect(readiness).toContainText("TLS trust gate unresolved");
  await expect(readiness).toContainText(
    "no direct payment or reconciliation control is exposed",
  );
  await expect(page.getByRole("button", { name: /telebirr/i })).toHaveCount(0);

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
