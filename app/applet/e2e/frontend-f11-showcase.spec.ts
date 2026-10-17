import { expect, test } from "@playwright/test";

test.skip(process.env.VITE_RUNTIME_MODE !== "static-showcase", "Explicit showcase runtime only");

test("F11 explicit showcase separates current roles, target roles and capability architecture without a functional session", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/demo/")) calls.push(request.url());
  });

  await page.goto("/kiosk");

  const showcase = page.getByTestId("static-showcase");
  await expect(showcase).toBeVisible();

  const hero = page.locator(".product-hero");
  await expect(hero).toBeVisible();
  const heroPresentation = await hero.evaluate((node) => ({
    backgroundImage: getComputedStyle(node).backgroundImage,
    color: getComputedStyle(node).color,
  }));
  expect(heroPresentation.backgroundImage).toContain("radial-gradient");
  expect(heroPresentation.backgroundImage).toContain("linear-gradient");
  expect(heroPresentation.color).toBe("rgb(255, 255, 255)");

  await expect(page.getByText("No active server workspace", { exact: true })).toBeVisible();
  await expect(page.getByTestId("current-showcase-roles").locator("article")).toHaveCount(4);
  await expect(page.getByTestId("target-showcase-roles").locator("article")).toHaveCount(3);
  await expect(page.getByTestId("target-showcase-roles").getByText(/TARGET .* NOT ACTIVE/)).toHaveCount(3);
  await expect(page.getByTestId("showcase-capability-groups").locator("article")).toHaveCount(4);
  await expect(showcase.getByText(/eKUB evidence seam .* prohibited from ARDI and credit decision-support/i)).toBeVisible();

  await expect(page.locator(".capability-workspace-runtime")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByTestId("workspace-context")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Transaction Request|activate|settle|post funds/i })).toHaveCount(0);
  expect(calls).toEqual([]);
});
