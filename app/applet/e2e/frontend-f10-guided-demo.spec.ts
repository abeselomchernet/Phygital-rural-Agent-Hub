import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("F10 guided demo is readable, bounded and screenshot-ready on desktop", async ({ page }, testInfo) => {
  await page.goto("/guided-demo");
  await expect(page.getByTestId("guided-demo-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enawuga Stage-4 guided demo" })).toBeVisible();
  await expect(page.getByText("Stage 4 · Synthetic", { exact: true })).toBeVisible();
  await expect(page.getByText(/Presentation context only/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous scene" })).toBeDisabled();
  await page.getByRole("button", { name: "Next scene" }).click();
  await expect(page.getByText("Scene 2 · Service composition")).toBeVisible();
  await expect(page.getByText(/Catalog visibility is not provider activation/)).toBeVisible();
  await expect(page.getByRole("button", { name: /activate production|settle funds|approve regulated pilot|issue production credential/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await testInfo.attach("f10-guided-demo-desktop.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("F10 guided demo remains readable at 390px without horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guided-demo");
  await expect(page.getByRole("heading", { name: "Enawuga Stage-4 guided demo" })).toBeVisible();
  await expect(page.getByText(/Guided Demo is a presentation surface only/)).toBeVisible();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "Next scene" }).click();
  }
  await expect(page.getByText("Scene 5 · Close")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next scene" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await testInfo.attach("f10-guided-demo-mobile.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
