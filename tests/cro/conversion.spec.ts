// tests/cro/conversion.spec.ts
import { test, expect } from '@playwright/test';

test('Visual Regression of Homepage', async ({ page }) => {
  await page.goto('https://mogi.vn/');
  // Takes a snapshot. If the layout shifts by even 1 pixel in the future, the test fails.
  await expect(page).toHaveScreenshot('homepage-layout.png', { maxDiffPixels: 100 });
});

test('CRO: Validate Zalo Contact Click fires DataLayer Event', async ({ page }) => {
  await page.goto('https://mogi.vn/listing/12345');

  // 1. Click the conversion button
  await page.locator('button:has-text("Chat Zalo")').click();

  // 2. Evaluate the browser's window object to check the Google Tag Manager dataLayer
  const dataLayer = await page.evaluate(() => window.dataLayer || []);
  
  // 3. Find the specific tracking event
  const zaloClickEvent = dataLayer.find((event: any) => event.event === 'contact_agent_zalo');
  
  // 4. Assert the tracking fired perfectly for the Analytics team
  expect(zaloClickEvent).toBeDefined();
  expect(zaloClickEvent.lead_type).toEqual('zalo');
});