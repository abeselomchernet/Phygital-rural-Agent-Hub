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
  await expect(readiness).toContainText("T1–T10");
  await expect(readiness).toContainText("merged as an inactive TestBed foundation");
  await expect(readiness).toContainText("TLS trust gate unresolved");
  await expect(readiness).toContainText(
    "no direct payment or reconciliation control is exposed",
  );
  await expect(page.getByRole("button", { name: /telebirr/i })).toHaveCount(0);

  const mpesa = page.getByTestId("mpesa-ethiopia-readiness");
  await expect(mpesa).toContainText("Safaricom Ethiopia M-PESA");
  await expect(mpesa).toContainText("Token contract verified");
  await expect(mpesa).toContainText("Inactive sandbox foundation");
  await expect(mpesa).toContainText("application payment networking disabled");
  await expect(mpesa).toContainText("Controlled external token smoke");
  await expect(mpesa).toContainText("Initiation unavailable");
  await expect(mpesa).toContainText("Status reading unavailable");
  await expect(mpesa).toContainText("Callback authority unavailable");
  await expect(mpesa).toContainText("PartnerFI settlement/posting unavailable");
  await expect(page.getByRole("button", { name: /m-pesa|mpesa/i })).toHaveCount(0);

  await expect(page.getByText("Controlled provider check")).toBeVisible();
  await expect(page.getByText(/ArifPay only\. Supervisor\/Partner Admin only\./)).toBeVisible();
  await expect(page.getByText(/Direct Telebirr and M-PESA remain inactive and non-interactive here\./)).toBeVisible();

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
