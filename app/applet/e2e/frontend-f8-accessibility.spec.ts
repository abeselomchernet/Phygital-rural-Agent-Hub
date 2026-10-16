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

test("F8 localized presentation catalogs remain review-gated and overflow-safe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const language = page.locator("#presentation-language");

  await language.selectOption("am");
  await expect(page.locator(".product-shell")).toHaveAttribute("lang", "am");
  await expect(page.locator(".product-shell")).toHaveAttribute("data-local-speaker-review", "required");
  await expect(page.locator(".product-shell")).toHaveAttribute("data-regulated-wording-approved", "false");
  await expect(page.locator("#presentation-language-status")).toHaveAttribute("data-review-status", "required");
  await expect(page.locator(".product-hero h1")).toHaveText("የገጠር ወኪል የሥራ ቦታ");
  await expect(page.getByText("Stage 4 · Synthetic", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await language.selectOption("or");
  await expect(page.locator(".product-shell")).toHaveAttribute("lang", "om");
  await expect(page.locator(".product-hero h1")).toHaveText("Iddoo hojii bakka bu’aa baadiyyaa");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("localized governed workspace chrome follows language without translating canonical authority identifiers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/hub");
  await expect(page.locator('[data-testid="workspace-context"]')).toBeVisible();
  const language = page.locator("#presentation-language");

  await language.selectOption("am");
  await expect(page.locator('[data-testid="workspace-context"] h2')).toHaveText("የወኪል የሥራ ቦታ");
  await expect(page.locator(".workspace-nav-label").first()).toHaveText("የመስክ የሥራ ፍሰቶች");
  await expect(page.locator(".workspace-context-facts")).toContainText("AGENT");
  await expect(page.locator(".workspace-context-facts")).toContainText("PartnerFI Alpha");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await language.selectOption("or");
  await expect(page.locator('[data-testid="workspace-context"] h2')).toHaveText("Iddoo Hojii Bakka Bu'aa");
  await expect(page.locator(".workspace-nav-label").first()).toHaveText("Adeemsa hojii dirree");
  await expect(page.locator(".workspace-context-facts")).toContainText("AGENT");
  await expect(page.locator(".workspace-context-facts")).toContainText("PartnerFI Alpha");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
