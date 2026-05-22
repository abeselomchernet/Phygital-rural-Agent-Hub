import { test, expect } from '@playwright/test';

test.describe('System Integration E2E Smoke Test', () => {

  test('Agent Kiosk Layout loads properly', async ({ page }) => {
    await page.goto('/kiosk');
    // Ensure the main Kiosk title or elements are visible
    const title = page.getByText(/NAGA-NODE /i).first();
    await expect(title).toBeVisible();
    
    // Verify cash-in/out modal trigger availability
    await expect(page.getByRole('button', { name: /Cash In/i })).toBeVisible();
  });

  test('Ardi Engine dynamically renders LCR visual layout', async ({ page }) => {
    await page.goto('/ardi-engine');
    
    // Click Agent tab
    await page.getByRole('button', { name: /AGENT/i }).click();

    // Verify the inputs load
    await expect(page.getByText(/Liquidity Inputs/i)).toBeVisible();
    await expect(page.getByText(/Liquidity Coverage Ratio/i)).toBeVisible();

    // Trigger calculation
    const calcButton = page.getByRole('button', { name: /Algeerizimii Shallagi|Calculate/i });
    await expect(calcButton).toBeVisible();
    await calcButton.click();

    // Specifically verify the dynamic Node Grade calculation block renders
    await expect(page.getByText('Node Grade')).toBeVisible();
  });

  test('Supervisor Portal displays fleet ledger table', async ({ page }) => {
    await page.goto('/supervisor');
    
    // Ensure table structure exists
    const txHeader = page.getByText(/TX HASH/i).first();
    await expect(txHeader).toBeVisible();
  });

});
