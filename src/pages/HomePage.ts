import { Page } from '@playwright/test';
import BasePage from './BasePage';

export default class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Keep routes and selectors inside the page object (no hardcoded values in specs)
  readonly createListingPath = '/dang-tin';

  get createButton() { return this.page.locator('text=Đăng tin'); }

  async goToCreateListing() {
    await this.goto(this.createListingPath);
    await this.waitForVisible('form');
  }

  async fillTitle(value: string) {
    const sel = 'input[name="title"], input[placeholder*="Tiêu đề"]';
    await this.fill(sel, value);
  }

  async fillPrice(value: string) {
    const sel = 'input[name="price"], input[placeholder*="Giá"]';
    await this.fill(sel, value);
  }

  async fillDescription(value: string) {
    const sel = 'textarea[name="description"], textarea[placeholder*="Mô tả"]';
    await this.fill(sel, value);
  }

  async submitAsVIP() {
    const sel = 'text=Lưu & Đăng tin VIP, text=Đăng tin VIP, text=Đăng tin';
    await this.click(sel);
    await this.page.waitForLoadState('networkidle');
  }

  async getSuccessText() {
    const sel = '.success-message, text=Đăng tin thành công, .alert-success';
    await this.waitForVisible(sel, 10000);
    return this.getText(sel);
  }
}
