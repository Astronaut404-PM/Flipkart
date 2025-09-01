import { BasePage } from './BasePage.js';

export class HomePage extends BasePage {
  constructor(page) {
    super(page);
    this.searchInput = page.getByRole('textbox', { name: 'Search for Products, Brands and More' });
    this.searchSubmit = page.getByRole('button', { name: 'Search for Products, Brands and More' });
    this.closeLoginBtn = page.locator('button._30XB9F');
    this.loginLink = page
      .getByRole('link', { name: /^Login$/i })
      .or(page.getByText(/^Login$/i));
  }

  async open() {
    await this.page.goto('/');
    await this.closeInitialLoginModalIfPresent();
  }

  async search(term) {
    await this.searchInput.fill('');
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await this.waitForResults();
  }

  async openLoginFromHeader() {
    // Close modal if it appears, then click header Login link to open login flow
    await this.closeInitialLoginModalIfPresent();
    if (await this.loginLink.first().isVisible().catch(() => false)) {
      await this.loginLink.first().click();
    }
  }
}
