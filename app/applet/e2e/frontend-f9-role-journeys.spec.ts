import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";

type SyntheticRole = "AGENT" | "SUPERVISOR" | "OPERATIONS" | "PARTNER_ADMIN";
type SyntheticWorkspaceKey =
  | "ALPHA_AGENT_ADAMA"
  | "BETA_AGENT_ADAMA"
  | "ALPHA_SUPERVISOR_ADAMA"
  | "ALPHA_OPERATIONS_ADAMA"
  | "ALPHA_PARTNER_ADMIN_ADAMA";

async function startWorkspace(
  context: BrowserContext,
  role: SyntheticRole,
  workspaceKey: SyntheticWorkspaceKey,
) {
  const response = await context.request.post("/api/demo/session/start", {
    data: { role, workspaceKey },
  });
  expect(response.status()).toBe(200);
}

async function assertStage4ClaimBoundary(
  page: Page,
  testInfo: TestInfo,
  screenshotName: string,
) {
  const workspaceContext = page.getByTestId("workspace-context");
  await expect(workspaceContext).toBeVisible();
  await expect(workspaceContext).toContainText("Synthetic data");
  await expect(workspaceContext).toContainText("No production authority");
  await expect(page.locator(".wl-environment-chip")).toContainText("Stage 4");
  await expect(page.locator(".wl-environment-chip")).toContainText("Synthetic");

  const body = page.locator("body");
  for (const forbidden of [
    /production ready/i,
    /production approved/i,
    /fully authorized for production/i,
    /regulated pilot approved/i,
    /settlement complete/i,
    /live funds moved/i,
  ]) {
    await expect(body).not.toContainText(forbidden);
  }

  await expect(
    page.getByRole("button", {
      name: /activate production|settle funds|approve regulated pilot|issue production credential/i,
    }),
  ).toHaveCount(0);

  await testInfo.attach(screenshotName, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("F9 keeps Alpha and Beta Agent capabilities isolated through one role journey", async ({
  page,
  context,
}, testInfo) => {
  await startWorkspace(context, "AGENT", "ALPHA_AGENT_ADAMA");
  await page.goto("/");

  const services = page.getByTestId("workspace-services");
  await expect(page.locator(".capability-workspace-runtime")).toHaveAttribute("data-role", "AGENT");
  await expect(page.getByTestId("workspace-context")).toContainText("PartnerFI Alpha");
  await expect(services).toContainText("Cash In");
  await expect(services).toContainText("Cash Out");
  await expect(services).not.toContainText("Savings Service Request");
  await assertStage4ClaimBoundary(page, testInfo, "f9-alpha-agent.png");

  await page.getByLabel("Synthetic reference workspace").selectOption("BETA_AGENT_ADAMA");
  await expect(page.getByTestId("workspace-context")).toContainText("PartnerFI Beta");
  await expect(page.locator(".capability-workspace-runtime")).toHaveAttribute("data-role", "AGENT");
  await expect(services).toContainText("Savings Inquiry");
  await expect(services).toContainText("Savings Service Request");
  await expect(services).not.toContainText("Cash In");
  await expect(services).not.toContainText("Cash Out");
  await assertStage4ClaimBoundary(page, testInfo, "f9-beta-agent.png");
});

test("F9 Supervisor journey preserves decision-support boundaries across Hub routes", async ({
  page,
  context,
}, testInfo) => {
  await startWorkspace(context, "SUPERVISOR", "ALPHA_SUPERVISOR_ADAMA");

  await page.goto("/hub/economics");
  await expect(page.getByTestId("hub-economics-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Modeled Hub economics" })).toBeVisible();
  await expect(page.getByText("Observed performance is unavailable")).toBeVisible();
  await assertStage4ClaimBoundary(page, testInfo, "f9-supervisor-economics.png");

  await page.goto("/hub/pilot-evidence");
  await expect(page.getByTestId("pilot-evidence-page")).toBeVisible();
  await expect(page.locator('[data-testid^="pilot-gate-"]')).toHaveCount(11);
  await expect(page.getByText("Pilot decision: No authorization issued")).toBeVisible();
  await assertStage4ClaimBoundary(page, testInfo, "f9-supervisor-pilot-evidence.png");
});

test("F9 Operations journey keeps reconciliation evidence read-only and non-settling", async ({
  page,
  context,
}, testInfo) => {
  await startWorkspace(context, "OPERATIONS", "ALPHA_OPERATIONS_ADAMA");

  await page.goto("/operations/evidence");
  await expect(page.getByTestId("operations-evidence-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Offline & reconciliation evidence" })).toBeVisible();
  await expect(page.getByText("Transport is not settlement.")).toBeVisible();
  await expect(page.getByText("NO SETTLEMENT AUTHORITY", { exact: true })).toBeVisible();
  await assertStage4ClaimBoundary(page, testInfo, "f9-operations-evidence.png");

  await page.goto("/partners");
  await expect(page.getByTestId("partner-ecosystem-console")).toBeVisible();
  await expect(page.getByText("Provider foundation is not provider activation.")).toBeVisible();
  await assertStage4ClaimBoundary(page, testInfo, "f9-operations-partners.png");
});

test("F9 Partner Admin journey exposes governance evidence without activation authority", async ({
  page,
  context,
}, testInfo) => {
  await startWorkspace(context, "PARTNER_ADMIN", "ALPHA_PARTNER_ADMIN_ADAMA");

  await page.goto("/partner-admin");
  const admin = page.getByTestId("partner-admin-page");
  await expect(admin).toBeVisible();
  await expect(admin).toContainText("NO ACTIVATION AUTHORITY");
  await expect(admin).toContainText("Configuration visibility is not activation authority.");
  await expect(page.getByRole("button", { name: /activate|enable|settle|approve|issue credential/i })).toHaveCount(0);
  await assertStage4ClaimBoundary(page, testInfo, "f9-partner-admin.png");

  await page.goto("/hub/neutrality");
  await expect(page.getByTestId("neutrality-governance-page")).toBeVisible();
  await assertStage4ClaimBoundary(page, testInfo, "f9-partner-admin-neutrality.png");
});

test("F9 direct-URL denial never upgrades an Agent workspace", async ({
  page,
  context,
}, testInfo) => {
  await startWorkspace(context, "AGENT", "ALPHA_AGENT_ADAMA");

  await page.goto("/partner-admin");
  await expect(page.getByTestId("partner-admin-access-denied")).toBeVisible();
  await expect(page.getByTestId("partner-admin-page")).toHaveCount(0);
  await expect(page.locator(".capability-workspace-runtime")).toHaveAttribute("data-role", "AGENT");
  await assertStage4ClaimBoundary(page, testInfo, "f9-agent-admin-denied.png");

  await page.goto("/partners");
  await expect(page.getByTestId("partner-ecosystem-access-denied")).toBeVisible();
  await expect(page.getByTestId("partner-ecosystem-console")).toHaveCount(0);
  await expect(page.locator(".capability-workspace-runtime")).toHaveAttribute("data-role", "AGENT");
  await assertStage4ClaimBoundary(page, testInfo, "f9-agent-partners-denied.png");
});
