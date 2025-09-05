import { BasePage } from './BasePage.js';
import { expect } from '@playwright/test';

export class SearchPage extends BasePage {
  constructor(page) {
    super(page);
    // Stable readiness signal on results pages
  this.resultsReady = page.getByText('Sort By', { exact: true });
  // Scope to the visible Sort By strip container
  this.sortContainer = page.locator('div', { hasText: 'Sort By' }).first();
    // All PDP links contain "/p/"; prefer priced and available items
    this.allProductCards = page.locator('a[href*="/p/"]');
    this.productCards = this.allProductCards
      .filter({ hasText: /₹\s*[\d,]+/ })
      .filter({ hasNotText: /Currently unavailable|Price:\s*Not Available/i });
  // Unique Low-to-High option within the Sort By strip
  this.sortLowToHigh = this.sortContainer.getByText('Price -- Low to High', { exact: true });
  }

  async applyPriceFilter(min, max) {
    // Use text-based dropdown approach to avoid brittle selectors
    await this.page.getByText('Price', { exact: false }).first().click();
    const minBox = this.page.getByText('Min').locator('..').locator('select');
    const maxBox = this.page.getByText('Max').locator('..').locator('select');

    if (await minBox.isVisible().catch(() => false)) {
      await minBox.selectOption(min.toString()).catch(() => {});
    }
    if (await maxBox.isVisible().catch(() => false)) {
      await maxBox.selectOption(max.toString()).catch(() => {});
    }
    await this.waitForResults();
  }

  async applyBrandFilter(brandText) {
    const brand = this.page.getByRole('checkbox', { name: new RegExp(brandText, 'i') });
    if (await brand.isVisible().catch(() => false)) {
      await brand.check().catch(() => {});
      await this.waitForResults();
    }
  }

  async sortByLowToHigh() {
    // Click sort and prefer URL confirmation if present, but don't hang if it's an in-page update
  const lowToHigh = this.sortLowToHigh.first();
  // Avoid manual scroll to prevent stale handles; Playwright will auto-scroll on click
  await expect(this.resultsReady).toBeVisible({ timeout: 30000 });
  await expect(lowToHigh).toBeVisible({ timeout: 10000 });
  await Promise.allSettled([
      this.page.waitForURL(/[?&]sort=price_asc\b/, { timeout: 5000 }),
      lowToHigh.click().catch(() => {}),
    ]);

    // Ensure results strip is present
    await this.resultsReady.waitFor({ state: 'visible', timeout: 30000 });

    // Fallback verification: ensure top tiles look ascending by price using locator polling
    await expect.poll(
      async () => {
        const first = this.productCards.nth(0);
        const second = this.productCards.nth(1);
        const v0 = await first.isVisible().catch(() => false);
        const v1 = await second.isVisible().catch(() => false);
        if (!v0 || !v1) return 'waiting-visible';
        const t0 = await first.innerText().catch(() => '');
        const t1 = await second.innerText().catch(() => '');
        const toNum = (t) => {
          const m = (t || '').match(/₹\s*([\d,]+)/);
          return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
        };
        const p0 = toNum(t0);
        const p1 = toNum(t1);
        if (p0 === 0 || p1 === 0) return 'waiting-prices';
        return p0 <= p1 ? 'ok' : `bad:${p0}>${p1}`;
      },
      { timeout: 25000, intervals: [250, 500, 750, 1000] }
    ).toBe('ok');
  }

  // Override to avoid brittle, obfuscated class names
  async waitForResults() {
    await this.page.waitForURL(/\/search(\?|$)/, { waitUntil: 'domcontentloaded' });
    await this.resultsReady.waitFor({ state: 'visible', timeout: 30000 });
  }

  async openFirstProduct() {
    // Prefer a priced, available product; fall back to first PDP link
    const count = await this.productCards.count();
    const target = (count > 0 ? this.productCards : this.allProductCards).first();
    await expect(target).toBeVisible({ timeout: 15000 });

    const [popup] = await Promise.all([
      this.page.waitForEvent('popup').catch(() => null),
      target.click(),
    ]);

    const pdp = popup ?? this.page;
    await pdp.waitForLoadState('domcontentloaded');
    await expect(pdp).toHaveURL(/\/p\//);
    return pdp;
  }
}
