import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("Partner Ecosystem console separates registered provider foundations from payment-route activation", async ({
  page,
}) => {
  await page.goto("/");

  const homeCard = page.getByTestId("partner-ecosystem-home-card");
  await expect(homeCard).toContainText("Partner ecosystem");
  await expect(homeCard).toContainText(
    "Code presence never becomes service authorization",
  );

  await page.goto("/partners");
  await expect(page).toHaveURL(/\/partners$/);
  await expect(
    page.getByRole("heading", { name: "Partner Ecosystem Console" }),
  ).toBeVisible();

  const summary = page.getByTestId("partner-ecosystem-summary");
  await expect(summary).toContainText("Partner organizations");
  await expect(summary).toContainText("Sandbox bounded");
  await expect(summary).toContainText("Foundation only");
  await expect(summary).toContainText("Simulation only");
  await expect(summary).toContainText("Disabled capabilities");

  await expect(page.getByTestId("partner-synthetic-partnerfi")).toContainText(
    "No live PartnerFI connectivity is authorized",
  );
  await expect(
    page.getByTestId("partner-synthetic-arifpay-sandbox"),
  ).toContainText("ARIFPAY_C2B");
  await expect(
    page.getByTestId("partner-synthetic-arifpay-sandbox"),
  ).toContainText("Sandbox bounded");

  const telebirr = page.getByTestId("partner-synthetic-telebirr-direct");
  await expect(telebirr).toContainText("TELEBIRR_DIRECT_C2B");
  await expect(telebirr).toContainText("Foundation only · route activation gated");
  await expect(telebirr).toContainText("TestBed adapter foundation is registered");

  const mpesa = page.getByTestId("partner-synthetic-mpesa-ethiopia");
  await expect(mpesa).toContainText("MPESA_ETHIOPIA_DIRECT_C2B");
  await expect(mpesa).toContainText("Foundation only · route activation gated");
  await expect(mpesa).toContainText("token authentication is verified");

  const provenance = page.getByTestId("route-provenance");
  await expect(provenance).toContainText("ARIFPAY_SANDBOX_C2B");
  await expect(provenance).toContainText("TELEBIRR_DIRECT_TESTBED");
  await expect(provenance).toContainText("MPESA_ETHIOPIA_DIRECT_SANDBOX");
  await expect(provenance).toContainText("Enawuga transaction");
  await expect(provenance).toContainText("direct payment route remains unmounted");
  await expect(provenance).toContainText("payment/status/callback routes remain unmounted");

  await expect(
    page.getByRole("button", { name: /enable|activate|dispatch|handover/i }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/No real cash custody, dispatch authority, handover/),
  ).toBeVisible();
});
