import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});
test("three-language kiosk presentation retains safe local demonstrations", async ({
  page,
}) => {
  await page.goto("/kiosk");
  await expect(
    page.getByRole("heading", { name: "Agent Terminal", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Presentation language").selectOption("am");
  await expect(
    page.getByRole("heading", { name: "የወኪል ተርሚናል", exact: true }),
  ).toBeVisible();
  await page.locator("#presentation-language").selectOption("or");
  await expect(
    page.getByRole("heading", { name: "Terminalii Bakka Bu’aa", exact: true }),
  ).toBeVisible();
  await page.locator("#presentation-language").selectOption("en");
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.getByLabel("Sample restock quantity").fill("4");
  await page.getByRole("button", { name: "Preview restock draft" }).click();
  await expect(
    page.getByText(
      "Sample draft: 4 receipt rolls. No order sent; stock unchanged.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preview sample slip" }).click();
  await expect(
    page.getByText("Request preview · Not a payment receipt"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reveal learning note" }).click();
  await expect(page.getByText(/This exercise does not certify/)).toBeVisible();
  await page.getByLabel("Scenario coverage").fill("30");
  await expect(
    page.getByText(/Scenario: review replenishment needs/),
  ).toBeVisible();
  expect(posts).toEqual([]);
});
test("static preview keeps portfolio visible without fabricating customer or partner state", async ({
  page,
}) => {
  await page.route("**/api/demo/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html>SPA-only preview</html>",
    }),
  );
  await page.goto("/farmer-360");
  for (const name of [
    "Savings groups & Equb",
    "Agricultural input vouchers",
    "Climate relief & insurance",
    "Solar & irrigation PAYG",
    "Carbon & regenerative farming",
    "Diaspora-matched savings",
    "School feeding & market access",
    "Partner accounts & messaging",
  ])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByText(
      "Synthetic authenticated demo API unavailable. Existing outbox records are retained.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Cash In/ })).toHaveCount(0);
  await expect(page.getByTestId("partner-balance")).toHaveCount(0);
  await expect(
    page.getByText("DISABLED PENDING PARTNER AUTHORIZATION", { exact: true }),
  ).toHaveCount(9);
});
test("readiness, transport and conversation concepts never invoke external operations", async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") mutations.push(r.url());
  });
  await page.goto("/onboard");
  await page.getByRole("button", { name: "2. Business review" }).click();
  await expect(page.getByText(/accepts no commercial data/)).toBeVisible();
  await page.getByRole("button", { name: "3. Device readiness" }).click();
  await expect(page.getByText(/No device is registered/)).toBeVisible();
  await page.goto("/data-mule");
  await page
    .getByRole("button", { name: "Advance illustrative handoff" })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Illustration: QUEUED_FOR_SYNC. No actual delivery or settlement.",
  );
  await expect(
    page.getByRole("button", { name: "Financial resolution disabled" }),
  ).toBeDisabled();
  await page.goto("/transcription");
  await page.getByRole("button", { name: "Load sample dialogue" }).click();
  await expect(
    page.getByText("No. PartnerFI authorization is a separate step."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear sample dialogue" }).click();
  await expect(
    page.getByText("No. PartnerFI authorization is a separate step."),
  ).toHaveCount(0);
  expect(mutations).toEqual([]);
});
test("presentation fits desktop and mobile with explicitly synthetic architecture", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/kiosk",
      "/farmer-360",
      "/queue",
      "/onboard",
      "/data-mule",
      "/supervisor",
      "/node-status",
    ]) {
      await page.goto(route);
      await expect(
        page.getByText("Wishland technology provider · Synthetic Demo"),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
    }
  }
  await expect(
    page.getByRole("heading", { name: "Enawuga demo architecture" }),
  ).toBeVisible();
  await expect(page.getByText("35%", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Deterministic illustrative values, not operational telemetry/,
    ),
  ).toBeVisible();
});
