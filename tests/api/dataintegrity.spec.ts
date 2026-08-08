// tests/api/data-integrity.spec.ts
import { test, expect } from '@playwright/test';
import * as cheerio from 'cheerio';

test('Validate Static HTML against API payload', async ({ request, page }) => {
  // 1. Hit the backend API directly
  const apiResponse = await request.get('https://api.mogi.vn/v1/properties/trending');
  const apiData = await apiResponse.json();
  if (!apiData || !apiData.items || apiData.items.length === 0) {
    throw new Error('API returned no trending items');
  }
  const top = apiData.items[0];

  // 2. Fetch the Static HTML page
  const htmlResponse = await request.get('https://mogi.vn/trending');
  const htmlBody = await htmlResponse.text();
  
  // 3. Parse with Cheerio
  const $ = cheerio.load(htmlBody);
  const firstEl = $('.trending-item').first();
  const renderedTitle = firstEl.find('h2').first().text().trim();
  const renderedPriceText = firstEl.find('.price, .gia, .listing-price').first().text().trim();
  const renderedLocation = firstEl.find('.location, .address').first().text().trim();

  // 4. Helper to normalize prices (strip non-digits)
  const normalizeNumber = (s = '') => (s + '').replace(/[^0-9]/g, '').replace(/^0+/, '') || null;
  const apiPrice = normalizeNumber(String(top.price ?? top.price_value ?? top.price_text ?? ''));
  const pagePrice = normalizeNumber(renderedPriceText);

  // 5. Assert Data Integrity for key fields
  expect(renderedTitle).toEqual(top.title);
  if (apiPrice && pagePrice) {
    expect(pagePrice).toEqual(apiPrice);
  }
  // If API provides location-ish fields, compare when possible
  if (top.location || top.address) {
    const apiLoc = (top.location || top.address || '').trim();
    if (apiLoc) expect(renderedLocation).toContain(apiLoc.split(',')[0]);
  }
});