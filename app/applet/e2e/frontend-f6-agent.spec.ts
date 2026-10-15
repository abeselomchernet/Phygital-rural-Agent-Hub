import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
});

test("Agent phone shell keeps Wishland branding, Stage-4 context and local-only connectivity truth", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("agent-field-status")).toBeVisible();
  await expect(page.getByText("Browser connectivity signal")).toBeVisible();
  await expect(page.getByText("Disabled in Stage 4")).toBeVisible();
  await expect(page.getByText(/Wishland Networking PLC.*Technology provider/)).toBeVisible();
  await expect(page.getByText("Stage 4 · Synthetic", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Agent primary mobile navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terminal", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await context.setOffline(true);
  await expect(page.getByText("Offline signal")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("Online signal")).toBeVisible();
});

test("Agent queued request remains visibly local and pending on mobile", async ({ page }) => {
  await page.goto("/kiosk");
  await expect(page.getByTestId("customer-id")).toBeVisible();
  const cashIn = page.getByRole("button", { name: /Cash In.*Transaction Request/ });
  await expect(cashIn).toBeEnabled();
  await cashIn.click();
  await expect(page.getByRole("status")).toContainText("Queued for sync");
  await expect(page.getByRole("status")).toContainText("No funds moved");

  await page.goto("/queue");
  await expect(page.getByText("Delivery success is not financial settlement")).toBeVisible();
  await expect(page.getByTestId("queue-event-card")).toHaveCount(1);
  await expect(page.getByTestId("queue-event-card").getByText("PARTNER_AUTH_PENDING")).toBeVisible();
  await expect(page.getByText("Remote deliveries enabled").locator("..")).toContainText("0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
