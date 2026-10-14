import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("Network Liquidity console exposes synthetic NLC LCI horizons without live cash authority", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("network-liquidity-home-card")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Role and partner workspace" }),
  ).not.toContainText("Network Liquidity");

  await page.goto("/liquidity");
  await expect(page).toHaveURL(/\/liquidity$/);
  await expect(
    page.getByRole("heading", { name: "Network Liquidity Coverage" }),
  ).toBeVisible();

  const boundary = page.getByTestId("nlc-calibration-boundary");
  await expect(boundary).toContainText("Synthetic thresholds only");
  await expect(boundary).toContainText("PartnerFI/partner calibration");
  await expect(boundary).toContainText(
    "No cash movement, dispatch or PartnerFI posting",
  );

  const summary = page.getByTestId("nlc-horizon-summary");
  await expect(summary).toContainText("2H");
  await expect(summary).toContainText("4H");
  await expect(summary).toContainText("8H");
  await expect(summary).toContainText("End of day");
  await expect(summary).toContainText("120.5%");
  await expect(summary).toContainText("Healthy");
  await expect(summary).toContainText("Watch");
  await expect(summary).toContainText("Rebalance");
  await expect(summary).toContainText("Critical");

  const agentTable = page.getByTestId("nlc-agent-table");
  await expect(agentTable).toContainText("Agent Alpha");
  await expect(agentTable).toContainText("Agent Bravo");
  await expect(agentTable).toContainText("Agent Charlie");
  await expect(page.getByTestId("nlc-synthetic-agent-charlie")).toContainText(
    "75%",
  );
  await expect(page.getByTestId("nlc-synthetic-agent-charlie")).toContainText(
    "Critical",
  );

  const priorities = page.getByTestId("nlc-priority-replenishments");
  await expect(priorities).toContainText("2-hour planning priorities");
  await expect(priorities).toContainText("Agent Charlie");
  await expect(priorities).toContainText("15,000 ETB");
  await expect(priorities).toContainText(
    "No fleet dispatch, handover, cash custody or value transfer occurs",
  );

  await expect(
    page.getByRole("button", {
      name: /dispatch|handover|transfer|post|rebalance/i,
    }),
  ).toHaveCount(0);
});
