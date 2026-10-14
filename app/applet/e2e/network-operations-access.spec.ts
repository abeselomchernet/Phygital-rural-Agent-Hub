import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
});

test("network-operations access matrix exposes bounded read/reconcile scopes only", async ({
  page,
}) => {
  await page.goto("/network-operations");

  const workspace = page.getByTestId("network-operations-access");
  await expect(
    workspace.getByRole("heading", { name: "Network Operations Access" }),
  ).toBeVisible();

  const boundary = page.getByTestId("network-ops-policy-boundary");
  await expect(boundary).toContainText("READ access");
  await expect(boundary).toContainText("provider-reconciliation access");
  await expect(boundary).toContainText(
    "no network-operations action for cash movement",
  );

  const agent = page.getByTestId("role-agent");
  await expect(agent).toContainText(
    "No Stage 3 network-operations object access",
  );

  const supervisor = page.getByTestId("role-supervisor");
  await expect(supervisor).toContainText(
    "Network Liquidity Coverage / LCI planning",
  );
  await expect(supervisor).toContainText("Bounded provider reconciliation");

  const operations = page.getByTestId("role-operations");
  await expect(operations).toContainText(
    "Partner ecosystem capability/evidence view",
  );
  await expect(operations).toContainText("Bounded provider reconciliation");
  await expect(operations).not.toContainText(
    "Network Liquidity Coverage / LCI planning",
  );
  await expect(operations).not.toContainText("Cash Fleet planning · East");

  await expect(
    page.getByRole("button", {
      name: /dispatch|handover|move cash|post|settle|place order/i,
    }),
  ).toHaveCount(0);
});

test("Supervisor and Operations surfaces both expose the network-access boundary", async ({
  page,
}) => {
  await page.goto("/supervisor");
  const supervisorAccess = page.getByTestId("supervisor-network-access");
  await expect(supervisorAccess).toContainText("Role & object access");
  await supervisorAccess
    .getByRole("link", { name: "Review Network Operations Access" })
    .click();
  await expect(page).toHaveURL(/\/network-operations$/);

  await page.goto("/operations");
  const operations = page.getByTestId("operations-network-operations");
  await expect(operations).toContainText("Network-operations access boundary");
  await expect(operations).toContainText("PartnerFI posting or settlement");
});
