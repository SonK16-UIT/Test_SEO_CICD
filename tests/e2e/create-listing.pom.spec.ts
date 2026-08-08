import { test, expect } from '@playwright/test';
import HomePage from '../../src/pages/HomePage';
import { faker } from '@faker-js/faker/locale/vi';

test('POM: Create Property Listing (UI & Data Input)', async ({ page }) => {
  const home = new HomePage(page);

  // ensure clean state
  await home.clearStorage();

  // navigate using the POM (no hardcoded base URL or selectors in the spec)
  await home.goToCreateListing();

  const title = `Bán nhà ${faker.location.street()}`;
  const price = faker.number.int({ min: 1000000000, max: 10000000000 }).toString();
  const description = faker.lorem.paragraph();

  await home.fillTitle(title);
  await home.fillPrice(price);
  await home.fillDescription(description);

  await home.submitAsVIP();

  const success = await home.getSuccessText();
  expect(success).toBeTruthy();
});
