import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("F8 keyboard flow exposes skip navigation and traps/restores evidence focus", async ({ page }) => {
  await page.goto("/hub");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-workspace-content")).toBeFocused();

  const trigger = page.locator('[data-testid^="hub-service-"]').first().getByRole("button", { name: "View evidence" });
  await trigger.click();
  const close = page.getByRole("button", { name: "Close evidence details" });
  await expect(close).toBeFocused();
  await expect(page.getByRole("dialog")).toContainText("Evidence visibility does not grant approval, execution, settlement or production authority.");
  await close.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("F8 language preview and narrow layout keep review and authority context explicit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const language = page.getByLabel("Presentation language");
  await language.selectOption("am");
  await expect(page.locator("#presentation-language-status")).toHaveText("Preview only - local-speaker review required");
  await expect(page.getByText("Stage 4 · Synthetic", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
