import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("operations reconciliation workspace preserves registered foundation and activation boundaries", async ({
  page,
}) => {
  await page.goto("/operations");
  await expect(page).toHaveURL(/\/operations$/);
  await expect(
    page.getByRole("heading", { name: "Operations & Reconciliation Center" }),
  ).toBeVisible();
  await expect(page.getByText("ArifPay · Sandbox").first()).toBeVisible();
  await expect(page.getByText("Webhook authority")).toBeVisible();
  await expect(page.getByText("PartnerFI · Separate")).toBeVisible();

  const readiness = page.getByTestId("payment-provider-readiness");
  await expect(readiness).toContainText("Payment provider readiness");
  await expect(readiness).toContainText(
    "Environment registration, runtime executability and route activation are separate states",
  );

  const telebirr = page.getByTestId("telebirr-readiness");
  await expect(telebirr).toContainText("Direct Telebirr · TestBed foundation");
  await expect(telebirr).toContainText("REGISTERED_TESTBED · FOUNDATION_ONLY");
  await expect(telebirr).toContainText("T1–T10");
  await expect(telebirr).toContainText("Direct payment route not mounted");
  await expect(telebirr).toContainText("remaining TestBed TLS/provider-contract gates");
  await expect(page.getByRole("button", { name: /telebirr/i })).toHaveCount(0);

  const mpesa = page.getByTestId("mpesa-ethiopia-readiness");
  await expect(mpesa).toContainText("Safaricom Ethiopia M-PESA");
  await expect(mpesa).toContainText("REGISTERED_SANDBOX · FOUNDATION_ONLY");
  await expect(mpesa).toContainText("token contract verified");
  await expect(mpesa).toContainText("Payment initiation route not mounted");
  await expect(mpesa).toContainText("Status route not mounted");
  await expect(mpesa).toContainText("Callback authority not activated");
  await expect(mpesa).toContainText("PartnerFI settlement/posting unavailable");
  await expect(page.getByRole("button", { name: /m-pesa|mpesa/i })).toHaveCount(0);

  await expect(page.getByText("Controlled provider check")).toBeVisible();
  await expect(
    page.getByText(/ArifPay only\. Operations\/Supervisor\/Partner Admin only\./),
  ).toBeVisible();
  await expect(
    page.getByText(/registered foundations with no interactive payment route here/),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Start synthetic operations session" })
    .click();
  await expect(page.getByTestId("operations-message")).toContainText(
    "Synthetic OPERATIONS session active",
  );
  await expect(
    page.getByRole("button", { name: "Check provider status" }),
  ).toBeDisabled();
});
