import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("primary navigation exposes governed field, network-operations and evidence surfaces", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Prototype modules" });
  await expect(navigation).toContainText("Field workflows");
  await expect(navigation).toContainText("Network operations");
  await expect(navigation).toContainText("Evidence & concepts");

  for (const link of [
    "Agent Terminal",
    "Farmer 360",
    "Agent readiness",
    "Agent learning",
    "GhostSync",
    "Data Mule",
    "Conversation",
    "Supervisor",
    "Operations",
    "Access",
    "Partner Ecosystem",
    "Network Liquidity",
    "Cash Fleet",
    "FMCG",
    "Demo architecture",
    "Ardi calculator",
  ]) {
    await expect(navigation.getByRole("link", { name: link, exact: true })).toBeVisible();
  }
});

test("Ardi uses bounded scenario arithmetic and removes legacy grade, swap and vault claims", async ({ page }) => {
  await page.goto("/ardi-engine");
  await expect(page.getByRole("heading", { name: "Ardi planning calculator" })).toBeVisible();
  await expect(page.getByTestId("ardi-boundary")).toContainText(
    "not an AI provider, credit bureau, underwriting engine",
  );
  await expect(page.getByText(/not prudential regulatory LCR/)).toBeVisible();
  await expect(page.getByTestId("farmer-scenario-index")).toBeVisible();
  await expect(page.getByTestId("ardi-lci")).toBeVisible();

  for (const stale of [
    "Agent LCR & Grade",
    "Vault Physical Fiat",
    "Digital Float",
    "Successful Swaps",
    "Total Swap Requests",
    "Farmer Ardi Score (300-900)",
    "ETB 200,000",
  ]) {
    await expect(page.getByText(stale, { exact: true })).toHaveCount(0);
  }
});

test("Farmer 360, readiness and learning surfaces preserve separate responsibilities", async ({ page }) => {
  await page.goto("/farmer-360");
  await expect(page.getByTestId("farmer-360-overview")).toContainText(
    "Read-only service context for an authorized agent or supervisor",
  );
  await expect(page.getByRole("button", { name: /Cash In|Cash Out|Simulate PartnerFI/i })).toHaveCount(0);

  await page.goto("/onboard");
  await expect(page.getByTestId("agent-readiness-boundary")).toContainText(
    "PartnerFI agent approval",
  );
  await expect(page.getByTestId("customer-id")).toHaveCount(0);

  await page.goto("/academy");
  await expect(page.getByTestId("agent-learning-boundary")).toContainText(
    "not certification, employment, appointment",
  );
  await expect(page.getByText(/Formal curriculum, assessment records/)).toBeVisible();
});
