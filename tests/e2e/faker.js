// tests/e2e/create-listing.spec.ts
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker/locale/vi'; // Vietnamese locale

test('Automated Data Input: Create VIP Property Listing', async ({ page }) => {
  // 1. Generate fake real estate data
  const propertyTitle = `Bán nhà mặt phố ${faker.location.street()}`;
  const price = faker.number.int({ min: 1000000000, max: 10000000000 });
  const description = faker.lorem.paragraphs(2);
  const phone = faker.phone.number('09########');

  // 2. Navigate and wait for the real form to load
  await page.goto('https://staging.mogi.vn/dang-tin', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form', { timeout: 15000 });

  // 3. Fill inputs using resilient selectors
  if (await page.locator('input[name="title"]').count()) {
    await page.fill('input[name="title"]', propertyTitle);
  } else if (await page.locator('input[placeholder*="Tiêu đề"]').count()) {
    await page.fill('input[placeholder*="Tiêu đề"]', propertyTitle);
  }

  if (await page.locator('input[name="price"]').count()) {
    await page.fill('input[name="price"]', price.toString());
  } else if (await page.locator('input[placeholder*="Giá"]').count()) {
    await page.locator('input[placeholder*="Giá"]').first().fill(price.toString());
  }

  // description textarea (try common variants)
  const descSelectors = ['textarea[name="description"]', 'textarea[name="content"]', 'textarea#description', 'textarea[placeholder*="Mô tả"]'];
  for (const sel of descSelectors) {
    if (await page.locator(sel).count()) {
      await page.fill(sel, description);
      break;
    }
  }

  // phone input
  const phoneSelector = 'input[name="phone"], input[name="phone_number"], input#phone, input[placeholder*="SĐT"]';
  if (await page.locator(phoneSelector).count()) {
    await page.fill(phoneSelector, phone);
  }

  // Wait for submit to be visible and click with navigation/networkidle strategy
  const submit = page.locator('text=Lưu & Đăng tin VIP, text=Đăng tin VIP, text=Đăng tin').first();
  await submit.waitFor({ state: 'visible', timeout: 10000 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
    submit.click()
  ]);

  // 4. Assert success using multiple possible success indicators
  const successLocators = ['.success-message', 'text=Đăng tin thành công', '.alert-success', 'text=Gửi thành công'];
  let found = false;
  for (const s of successLocators) {
    const loc = page.locator(s).first();
    if (await loc.count()) {
      await expect(loc).toBeVisible({ timeout: 10000 });
      found = true;
      break;
    }
  }

  expect(found).toBeTruthy();
});