// tests/seo/metadata.spec.ts
import { test, expect } from '@playwright/test';

test('Validate SEO Metadata for Real Estate Listing', async ({ page }) => {
  await page.goto('https://mogi.vn/listing/12345');

  // Check critical SEO markers injected by the CMS
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Bán nhà/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /mogi.vn/);
  
  // Ensure the H1 contains the keyword (e.g., from the Data team)
  const h1Text = await page.locator('h1').innerText();
  expect(h1Text.toLowerCase()).toContain('bán nhà mặt phố');
});