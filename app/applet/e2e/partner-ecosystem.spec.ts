import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("Partner Ecosystem console exposes governed synthetic capability and route provenance without activation controls", async ({
  page,
}) => {
  await page.goto("/");

  const homeCard = page.getByTestId("partner-ecosystem-home-card");
  await expect(homeCard).toContainText("Partner ecosystem");
  await expect(homeCard).toContainText("Code presence never becomes service authorization");
  await homeCard.getByRole("link", { name: "Open Partner Ecosystem Console" }).click();

  await expect(page).toHaveURL(/\/partners$/);
  await expect(
    page.getByRole("heading", { name: "Partner Ecosystem Console" }),
  ).toBeVisible();

  const summary = page.getByTestId("partner-ecosystem-summary");
  await expect(summary).toContainText("Partner organizations");
  await expect(summary).toContainText("Sandbox bounded");
  await expect(summary).toContainText("Simulation only");
  await expect(summary).toContainText("Disabled switches");

  await expect(page.getByTestId("partner-synthetic-partnerfi")).toContainText(
    "No live PartnerFI connectivity is authorized",
  );
  await expect(page.getByTestId("partner-synthetic-arifpay-sandbox")).toContainText(
    "ARIFPAY_C2B",
  );
  await expect(page.getByTestId("partner-synthetic-arifpay-sandbox")).toContainText(
    "Sandbox bounded",
  );
  await expect(page.getByTestId("partner-synthetic-telebirr-direct")).toContainText(
    "TELEBIRR_DIRECT_C2B",
  );
  await expect(page.getByTestId("partner-synthetic-telebirr-direct")).toContainText(
    "Disabled",
  );
  await expect(page.getByTestId("partner-synthetic-mpesa-ethiopia")).toContainText(
    "MPESA_ETHIOPIA_DIRECT_C2B",
  );
  await expect(page.getByTestId("partner-synthetic-mpesa-ethiopia")).toContainText(
    "Token contract is verified",
  );

  const provenance = page.getByTestId("route-provenance");
  await expect(provenance).toContainText("ARIFPAY_SANDBOX_C2B");
  await expect(provenance).toContainText("TELEBIRR_DIRECT_TESTBED");
  await expect(provenance).toContainText("MPESA_ETHIOPIA_DIRECT_SANDBOX");
  await expect(provenance).toContainText("Enawuga transaction");

  await expect(page.getByRole("button", { name: /enable|activate|dispatch|handover/i })).toHaveCount(0);
  await expect(page.getByText(/No real cash custody, dispatch authority, handover/)).toBeVisible();
});
