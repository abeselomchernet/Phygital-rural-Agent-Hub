import { expect, test } from "@playwright/test";

test.skip(process.env.VITE_RUNTIME_MODE === "static-showcase", "Functional runtime suite");

for (const status of [200, 403, 500]) {
  test(`F11 unavailable workspace (${status}) never renders an active Agent or fabricated service count`, async ({ page }) => {
    let sessionStarts = 0;
    page.on("request", (request) => { if (request.url().endsWith("/session/start")) sessionStarts++; });
    await page.route("**/api/demo/workspace", (route) => route.fulfill({ status, contentType: "text/html", body: "<html>unavailable</html>" }));
    await page.goto("/kiosk");
    const runtime = page.locator(".capability-workspace-runtime");
    await expect(runtime).toHaveAttribute("data-runtime-state", status === 403 ? "ACCESS_DENIED" : "BACKEND_UNAVAILABLE");
    await expect(runtime).toHaveAttribute("aria-busy", "false");
    await expect(page.getByTestId("workspace-context")).toHaveCount(0);
    await expect(page.getByTestId("agent-services-home-card")).toHaveCount(0);
    await expect(page.getByTestId("static-showcase")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Transaction Request/ })).toHaveCount(0);
    await page.goto("/");
    await expect(runtime).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".portal-summary-card")).toHaveCount(0);
    expect(sessionStarts).toBe(0);
  });
}

for (const role of ["SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"] as const) {
  test(`F11 ${role} direct terminal entry preserves the server session`, async ({ page, context }) => {
    const response = await context.request.post("/api/demo/session/start", { data: { role, workspaceKey: `ALPHA_${role}_ADAMA` } });
    expect(response.status()).toBe(200);
    let starts = 0;
    page.on("request", (request) => { if (request.url().endsWith("/session/start")) starts++; });
    await page.goto("/kiosk");
    await expect(page.getByText("Agent Terminal unavailable for this role")).toBeVisible();
    await expect(page.getByTestId("customer-id")).toHaveCount(0);
    expect((await (await context.request.get("/api/demo/session")).json()).role).toBe(role);
    expect(starts).toBe(0);
  });
}

test("F11 customer lookup clears pending request, verification and balance; late account response is ignored", async ({ page }) => {
  const oldRef = `custref_v1_${"A".repeat(43)}`;
  const nextRef = `custref_v1_${"B".repeat(43)}`;
  const customer = (ref: string) => ({ customerRef: ref, referenceBoundary: "SESSION_SCOPED_SYNTHETIC", customer: { projection: "AGENT_CUSTOMER", assignmentRef: "assignment", phoneStatus: "VERIFIED", kycStatus: "VERIFIED", riskState: "NORMAL" } });
  let releaseOld: () => void = () => {};
  const held = new Promise<void>((resolve) => { releaseOld = resolve; });
  await page.route("**/api/demo/v2/customer", (route) => route.fulfill({ json: customer(oldRef) }));
  await page.route("**/api/demo/v2/reverify/start", (route) => route.fulfill({ json: customer(oldRef) }));
  await page.route("**/api/demo/v2/lookup?*", (route) => route.fulfill({ json: customer(nextRef) }));
  await page.route("**/api/demo/v2/account?*", async (route) => {
    if (route.request().url().includes(oldRef)) { await held; await route.fulfill({ json: { balanceMinor: 99900 } }); }
    else await route.fulfill({ json: { balanceMinor: 2200 } });
  });
  await page.goto("/kiosk");
  await expect(page.getByTestId("customer-id")).toHaveText(oldRef);
  await page.getByRole("button", { name: "Start mock re-verification" }).click();
  await expect(page.getByRole("button", { name: "Confirm mock verification" })).toBeEnabled();
  await page.getByRole("button", { name: "Cash In — Transaction Request", exact: true }).click();
  await expect(page.getByRole("button", { name: "Simulate PartnerFI authorization" })).toBeVisible();
  await page.getByRole("button", { name: "Look up Customer" }).click();
  await expect(page.getByTestId("customer-id")).toHaveText(nextRef);
  await expect(page.getByTestId("partner-balance")).toHaveText("22.00 ETB");
  await expect(page.getByRole("button", { name: "Confirm mock verification" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Simulate PartnerFI authorization" })).toHaveCount(0);
  const oldResponse = page.waitForResponse((response) => response.url().includes(`v2/account?customerRef=${oldRef}`));
  releaseOld();
  await oldResponse;
  await expect(page.getByTestId("partner-balance")).toHaveText("22.00 ETB");
});

test("F11 Beta service presentation does not offer Alpha cash requests", async ({ page, context }) => {
  await context.request.post("/api/demo/session/start", { data: { role: "AGENT", workspaceKey: "BETA_AGENT_ADAMA" } });
  await page.goto("/kiosk");
  await expect(page.getByTestId("customer-id")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cash In — Transaction Request", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cash Out — Transaction Request", exact: true })).toBeDisabled();
});
