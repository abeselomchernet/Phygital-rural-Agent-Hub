import { test, expect } from "@playwright/test";

async function startPartnerAdmin(context: any) {
  const response = await context.request.post("/api/demo/session/start", {
    data: { role: "PARTNER_ADMIN", workspaceKey: "ALPHA_PARTNER_ADMIN_ADAMA" },
  });
  expect(response.status()).toBe(200);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("Partner Admin portal presents institution-scoped catalog/provider/scope evidence without activation controls", async ({ page, context }) => {
  await startPartnerAdmin(context);
  await page.goto("/partner-admin");

  await expect(page.getByTestId("partner-admin-page")).toBeVisible();
  await expect(page.getByTestId("partner-admin-page").getByRole("heading", { name: "Partner Administration", exact: true })).toBeVisible();
  await expect(page.getByText("PartnerFI Alpha", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("No activation authority", { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId("partner-admin-service-svc_alpha_cash_in")).toContainText("FIN.CASH_IN_AUTHORIZE");
  await expect(page.getByTestId("partner-admin-provider-TELEBIRR_DIRECT")).toContainText("FOUNDATION ONLY");
  await expect(page.getByTestId("partner-admin-provider-MPESA_ETHIOPIA_DIRECT")).toContainText("NOT MOUNTED");
  await expect(page.getByTestId("partner-admin-page").getByRole("link", { name: "Neutrality & governance" })).toBeVisible();
  await expect(page.getByRole("button", { name: /activate|enable|settle|approve|issue credential/i })).toHaveCount(0);
});

test("Agent direct navigation cannot render Partner Administration or Partner Ecosystem evidence", async ({ page }) => {
  await page.goto("/partner-admin");
  await expect(page.getByTestId("partner-admin-access-denied")).toBeVisible();
  await expect(page.getByTestId("partner-admin-page")).toHaveCount(0);

  await page.goto("/partners");
  await expect(page.getByTestId("partner-ecosystem-access-denied")).toBeVisible();
  await expect(page.getByTestId("partner-ecosystem-console")).toHaveCount(0);
});
