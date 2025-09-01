// BasePage provides common helpers: waits, soft actions, dynamic locators
export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async closeInitialLoginModalIfPresent() {
    const closeBtn = this.page.locator('button._30XB9F');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ timeout: 5000 }).catch(() => {});
    }
  }

  async waitForResults() {
  // Default no-op; specific pages (e.g., SearchPage) provide durable waits
  await this.page.waitForLoadState('domcontentloaded');
  }

  async softClick(locatorOrSelector, options = {}) {
    const loc = typeof locatorOrSelector === 'string' ? this.page.locator(locatorOrSelector) : locatorOrSelector;
    await loc.first().click({ trial: true }).catch(() => {});
    await loc.first().click(options);
  }

  async getNumber(text) {
    const num = text.replace(/[^0-9]/g, '');
    return parseInt(num || '0', 10);
  }
}
