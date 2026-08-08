import { Page } from '@playwright/test';

export default class BasePage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = '/') {
    // use relative paths so tests never hardcode the base URL
    await this.page.goto(path);
  }

  async click(selector: string) {
    await this.page.locator(selector).click();
  }

  async fill(selector: string, value: string) {
    await this.page.locator(selector).fill(value);
  }

  async getText(selector: string) {
    return this.page.locator(selector).innerText();
  }

  async waitForVisible(selector: string, timeout = 10000) {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout });
  }

  async setDarkMode(enable: boolean) {
    const script = enable
      ? `document.documentElement.classList.add('dark')`
      : `document.documentElement.classList.remove('dark')`;
    await this.page.addInitScript(script);
  }

  async clearStorage() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  }
}
