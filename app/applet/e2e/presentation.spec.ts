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
test("Farmer 360 is a read-only agent-assisted overview without customer transaction controls", async ({
  page,
}) => {
  const businessMutations: string[] = [];
  const localAuthBootstraps: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "POST") return;
    const url = r.url();
    if (url.endsWith("/api/demo/session/start")) localAuthBootstraps.push(url);
    else businessMutations.push(url);
  });
  await page.goto("/farmer-360");
  await expect(
    page.getByRole("heading", {
      name: "Farmer 360 — agent-assisted customer overview",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("farmer-360-overview")).toContainText(
    "not farmer self-service",
  );
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
  await expect(page.getByRole("button", { name: /Cash In|Cash Out|verification/i })).toHaveCount(0);
  await expect(page.getByTestId("partner-balance")).toHaveCount(0);
  await expect(page.getByText(/No real PII, Fayda lookup, bank balance/)).toBeVisible();
  expect(businessMutations).toEqual([]);
  expect(localAuthBootstraps.length).toBeLessThanOrEqual(1);
  for (const url of localAuthBootstraps)
    expect(new URL(url).hostname).toBe("127.0.0.1");
});
test("readiness, transport and conversation concepts never invoke external operations", async ({
  page,
}) => {
  const businessMutations: string[] = [];
  const localAuthBootstraps: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "POST") return;
    const url = r.url();
    if (url.endsWith("/api/demo/session/start")) localAuthBootstraps.push(url);
    else businessMutations.push(url);
  });
  await page.goto("/onboard");
  await expect(page.getByTestId("agent-readiness-boundary")).toContainText(
    "separate from customer KYC and transaction-request workflows",
  );
  await page.getByRole("button", { name: "2. Business review" }).click();
  await expect(page.getByText(/accepts no commercial data/)).toBeVisible();
  await page.getByRole("button", { name: "3. Device readiness" }).click();
  await expect(page.getByText(/No device is registered/)).toBeVisible();
  await page.goto("/data-mule");
  await expect(page.getByTestId("data-mule-boundary")).toContainText(
    "does not discover devices",
  );
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
  await expect(page.getByTestId("conversation-boundary")).toContainText(
    "No microphone capture",
  );
  await page.getByRole("button", { name: "Load sample dialogue" }).click();
  await expect(
    page.getByText("No. PartnerFI authorization is a separate step."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear sample dialogue" }).click();
  await expect(
    page.getByText("No. PartnerFI authorization is a separate step."),
  ).toHaveCount(0);
  expect(businessMutations).toEqual([]);
  expect(localAuthBootstraps.length).toBeLessThanOrEqual(2);
  for (const url of localAuthBootstraps)
    expect(new URL(url).hostname).toBe("127.0.0.1");
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
        page.getByText(/Wishland Networking PLC.*Technology provider/),
      ).toBeVisible();
      await expect(page.getByText("Stage 4 · Synthetic", { exact: true })).toBeVisible();
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

test("legacy browser records remain quarantined even when a receiver appears reachable", async ({ page, context }) => {
  await page.goto("/queue");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("GhostSyncDB", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("legacy");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("legacy", "readwrite");
        tx.objectStore("legacy").put({ marker: "synthetic-legacy-record" }, "demo");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  let uploads = 0;
  await page.route("**/api/ghostsync", route => {
    uploads++;
    return route.fulfill({ json: { enabled: true } });
  });
  await context.setOffline(true);
  await context.setOffline(false);
  await page.reload();
  await page.getByRole("button", { name: "Check sync availability" }).click();
  await expect(page.getByText("Remote delivery disabled. Requests retained; no funds moved.")).toBeVisible();
  const saved = await page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open("GhostSyncDB", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, read = db.transaction("legacy").objectStore("legacy").get("demo");
      read.onsuccess = () => { db.close(); resolve(read.result); };
      read.onerror = () => reject(read.error);
    };
  }));
  expect(saved).toEqual({ marker: "synthetic-legacy-record" });
  expect(uploads).toBe(0);
});

test("unavailable partner account is not displayed as a fabricated zero balance", async ({ page }) => {
  await page.route("**/api/demo/v2/account*", route => route.fulfill({ status: 503, json: { error: "SYNTHETIC_ACCOUNT_UNAVAILABLE" } }));
  await page.goto("/kiosk");
  await expect(page.getByTestId("customer-id")).toBeVisible();
  await expect(page.getByTestId("partner-balance")).toHaveText("Unavailable");
  await expect(page.getByText(/No real cash collection, cash dispense or agent settlement is authorized/)).toBeVisible();
});
