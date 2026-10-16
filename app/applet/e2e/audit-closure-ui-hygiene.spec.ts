import { expect, test, type BrowserContext } from "@playwright/test";

type SyntheticRole = "SUPERVISOR" | "OPERATIONS" | "PARTNER_ADMIN";
type WorkspaceKey = "ALPHA_SUPERVISOR_ADAMA" | "ALPHA_OPERATIONS_ADAMA" | "ALPHA_PARTNER_ADMIN_ADAMA";

async function startWorkspace(context: BrowserContext, role: SyntheticRole, workspaceKey: WorkspaceKey) {
  const response = await context.request.post("/api/demo/session/start", { data: { role, workspaceKey } });
  expect(response.status()).toBe(200);
}

test("Hub Overview renders governed 500 failure and recovers through explicit retry", async ({ page }) => {
  let fail = true;
  await page.route("**/api/demo/hubs/*/services", async (route) => {
    if (fail) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "SYNTHETIC_SERVER_FAILURE" }) });
      return;
    }
    await route.continue();
  });

  await page.goto("/hub");
  const errorState = page.locator('.bounded-state[data-kind="error"]');
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Service evidence unavailable");
  await expect(page.getByText(/No service state is inferred/)).toBeVisible();

  fail = false;
  await page.getByRole("button", { name: "Retry Hub evidence" }).click();
  await expect(errorState).toHaveCount(0);
  await expect(page.locator('[data-testid^="hub-service-"]').first()).toBeVisible();
});

test("Hub Overview renders an explicit timeout state instead of fabricated data", async ({ page }) => {
  await page.route("**/api/demo/hubs/*/services", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_500));
    await route.abort("timedout").catch(() => undefined);
  });

  await page.goto("/hub");
  const errorState = page.locator('.bounded-state[data-kind="error"]');
  await expect(errorState).toBeVisible({ timeout: 8_000 });
  await expect(errorState).toContainText("request timed out");
  await expect(page.getByText("UNAVAILABLE", { exact: true }).first()).toBeVisible();
});

test("management dashboards remain contained at tablet width across governed roles", async ({ page, context }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const journeys: Array<{ role: SyntheticRole; key: WorkspaceKey; path: string; testId: string }> = [
    { role: "SUPERVISOR", key: "ALPHA_SUPERVISOR_ADAMA", path: "/hub/economics", testId: "hub-economics-page" },
    { role: "OPERATIONS", key: "ALPHA_OPERATIONS_ADAMA", path: "/operations/evidence", testId: "operations-evidence-page" },
    { role: "PARTNER_ADMIN", key: "ALPHA_PARTNER_ADMIN_ADAMA", path: "/partner-admin", testId: "partner-admin-page" },
  ];

  for (const journey of journeys) {
    await startWorkspace(context, journey.role, journey.key);
    await page.goto(journey.path);
    await expect(page.getByTestId(journey.testId)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.getByTestId("workspace-context")).toContainText("No production authority");
  }
});


test("legacy presentation aliases no longer resolve to active service surfaces", async ({ page }) => {
  for (const path of ["/swaps", "/psnp-plus", "/securitization"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Module not found" })).toBeVisible();
    await expect(page.getByText("Choose a module from the active governed workspace.")).toBeVisible();
  }
});
