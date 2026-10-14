import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("Cash Fleet planning stays synthetic, read-only and separate from custody or posting", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("cash-fleet-home-card")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Role and partner workspace" }),
  ).not.toContainText("Cash Fleet");

  await page.goto("/cash-fleet");
  await expect(page).toHaveURL(/\/cash-fleet$/);
  await expect(
    page.getByRole("heading", { name: "Cash Fleet & liquidity-match planning" }),
  ).toBeVisible();

  const boundary = page.getByTestId("cash-fleet-boundary");
  await expect(boundary).toContainText("Planning only");
  await expect(boundary).toContainText("Cash custody / movement");
  await expect(boundary).toContainText("Dispatch / handover");
  await expect(boundary).toContainText("PartnerFI posting");
  await expect(boundary).toContainText("Disabled");

  const sourcePanel = page.getByTestId("cash-fleet-sources");
  await expect(sourcePanel).toContainText("Synthetic Cash Fleet · East route");
  await expect(sourcePanel).toContainText(
    "Synthetic FMCG route · South corridor",
  );
  await expect(sourcePanel).toContainText("SIMULATION_ONLY");
  await expect(sourcePanel).toContainText(
    "do not assert physical cash availability",
  );

  const horizon = page.getByLabel("NLC/LCI horizon");
  await horizon.selectOption("2H");

  const recommendations = page.getByTestId("liquidity-match-recommendations");
  await expect(recommendations).toContainText("Agent Charlie");
  await expect(recommendations).toContainText(
    "Synthetic Cash Fleet · Central route",
  );
  await expect(recommendations).toContainText("PLANNING_MATCH_ONLY");
  await expect(recommendations).toContainText(
    "No custody, dispatch, handover, cash movement or PartnerFI posting",
  );

  await horizon.selectOption("EOD");
  const summary = page.getByTestId("cash-fleet-plan-summary");
  await expect(summary).toContainText("Priority shortfall");
  await expect(summary).toContainText("Planned match");
  await expect(summary).toContainText("Unmatched shortfall");

  await expect(
    page.getByRole("button", {
      name: /dispatch|handover|transfer|move cash|post|settle|rebalance/i,
    }),
  ).toHaveCount(0);
});
