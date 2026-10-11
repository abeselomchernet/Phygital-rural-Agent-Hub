import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());});
test('Agent Kiosk Layout loads properly',async({page})=>{
 await page.goto('/kiosk');await expect(page.getByRole('heading',{name:'Agent Terminal'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Cash In/})).toBeEnabled();await expect(page.getByTestId('kyc-status')).toHaveText('VERIFIED');
 await expect(page.getByText(/Partner Account — simulated balance/)).toBeVisible();
});
test('Ardi Engine dynamically renders LCR visual layout',async({page})=>{
 await page.goto('/ardi-engine');await page.getByRole('button',{name:/Agent Liquidity/i}).click();
 await expect(page.getByText('Liquidity Inputs')).toBeVisible();await expect(page.getByText('Awaiting Computation')).toBeVisible();
 await page.getByRole('button',{name:'Compute Neural Score'}).click();
 await expect(page.getByText('Liquidity Coverage Ratio (LCR)')).toBeVisible();await expect(page.getByText('Node Grade (86 pts)')).toBeVisible();
});
test('Supervisor Portal displays fleet ledger table',async({page})=>{
 await page.goto('/supervisor');await page.getByRole('button',{name:/Fleet Mgmt/}).click();
 await expect(page.getByRole('heading',{name:'Fleet Management'})).toBeVisible();
 for(const name of ['Agent','Last Sync','Status','Txns','Volume (ETB)','Simulated Partner Float','Ardi Score','Remote Actions'])await expect(page.getByRole('columnheader',{name,exact:true})).toBeVisible();
 await expect(page.getByRole('row')).toHaveCount(4);
 await expect(page.getByRole('row').nth(1)).toContainText('AGT-842');
});
test('offline request persists through reload and reconnect without settlement',async({page,context})=>{
 await page.goto('/kiosk');await expect(page.getByTestId('kyc-status')).toHaveText('VERIFIED');
 const balance=await page.getByTestId('partner-balance').textContent();
 await context.setOffline(true);await page.getByRole('button',{name:/Cash In/}).click();
 await expect(page.getByRole('status')).toContainText('No funds moved');await expect(page.getByTestId('partner-balance')).toHaveText(balance!);
 await context.setOffline(false);await page.goto('/queue');await expect(page.getByRole('cell',{name:'QUEUED_FOR_SYNC',exact:true})).toHaveCount(1);
 await page.reload();await expect(page.getByRole('cell',{name:'PARTNER_AUTH_PENDING',exact:true})).toHaveCount(1);
 let syncCalls=0;page.on('request',r=>{if(r.url().includes('/api/ghostsync'))syncCalls++;});
 await page.getByRole('button',{name:'Check sync availability'}).click();await page.getByRole('button',{name:/Retry locally/}).click();
 await expect(page.getByRole('button',{name:'Retry locally (1)'})).toBeVisible();expect(syncCalls).toBe(0);
 await expect(page.getByRole('cell',{name:'PARTNER_AUTH_PENDING',exact:true})).toHaveCount(1);
});
test('phone change retains customer, blocks transactions and requires mock re-verification',async({page})=>{
 await page.goto('/kiosk');await expect(page.getByTestId('kyc-status')).toHaveText('VERIFIED');const id=await page.getByTestId('customer-id').textContent();
 await page.getByLabel('Synthetic phone alias').selectOption('+251900000002');await page.getByRole('button',{name:'Change phone alias'}).click();
 await expect(page.getByTestId('kyc-status')).toHaveText('REVERIFICATION_REQUIRED');await expect(page.getByTestId('customer-id')).toHaveText(id!);await expect(page.getByRole('button',{name:/Cash In/})).toBeDisabled();
 await page.getByRole('button',{name:'Start mock re-verification'}).click();await page.getByRole('button',{name:'Confirm mock verification'}).click();await expect(page.getByTestId('kyc-status')).toHaveText('VERIFIED');
 await page.getByRole('button',{name:'Look up Customer'}).click();await expect(page.getByRole('status')).toContainText('Alias resolved');await expect(page.getByTestId('customer-id')).toHaveText(id!);
});
test('partner authorization retry posts once and leaves transport pending',async({page})=>{
 await page.goto('/kiosk');await expect(page.getByTestId('kyc-status')).toHaveText('VERIFIED');const before=Number((await page.getByTestId('partner-balance').textContent())!.split(' ')[0]);
 await page.getByRole('button',{name:/Cash In/}).click();await page.getByRole('button',{name:'Simulate PartnerFI authorization'}).click();
 await expect(page.getByRole('status')).toContainText('PARTNER_ACCEPTED');await expect(page.getByTestId('partner-balance')).toHaveText(`${(before+10).toFixed(2)} ETB`);
 await page.getByRole('button',{name:'Simulate PartnerFI authorization'}).click();await expect(page.getByTestId('partner-balance')).toHaveText(`${(before+10).toFixed(2)} ETB`);
 await page.goto('/queue');await expect(page.getByRole('cell',{name:'QUEUED_FOR_SYNC',exact:true})).toHaveCount(1);
});
