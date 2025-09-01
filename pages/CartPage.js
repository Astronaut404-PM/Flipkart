import { BasePage } from './BasePage.js';

export class CartPage extends BasePage {
  constructor(page) {
    super(page);
    this._bind(page);
  }

  // (Re)bind all locators to a given page instance
  _bind(page) {
    this.page = page;
    // Root container for cart content (fallback to <main>)
    this.root = page.locator('div._1YokD2._3Mn1Gg').first().or(page.locator('main'));
    // Product link(s) on cart page (per your outerHTML)
    this.productLink = page.locator('a.T2CNXf.QqLTQ-').or(page.locator('a[href*="/p/"]'));
  // Count items by product links only (stable per item)
  this.cartItem = this.productLink;
    // Removal-specific control
    this.removeBtn = page
      .locator('div.sBxzFz')
      .or(page.getByRole('button', { name: /^remove$/i }))
      .or(page.locator('div._3dsJAO'))
      .or(page.getByText(/^Remove$/i));
    this.confirmRemoveBtn = page.getByRole('button', { name: /remove/i }).or(page.locator('div._3dsJAO._24d-qY'));
    this.placeOrderBtn = page.getByRole('button', { name: /place order/i }).or(page.locator('button._2KpZ6l._2ObVJD._3AWRsL'));
  // Resilient cart gate locators
    this.loginLink = page.getByRole('link', { name: /^login$/i });
    this.cartGateText = page.getByText(/Your cart is empty|Missing Cart items/i);
  }

  // Try to switch to an existing open cart page if current page was closed or switched
  _maybeRebindToCartTab() {
    try {
      const ctx = this.page.context();
      const openPages = ctx.pages().filter(p => !p.isClosed());
      const cart = openPages.find(p => /\/viewcart(\?|$)/.test(p.url()));
      if (cart && cart !== this.page) {
        this._bind(cart);
      } else if (this.page.isClosed()) {
        // Fall back to first open page if current is closed
        const first = openPages[0];
        if (first) this._bind(first);
      }
    } catch {}
  }

  async open() {
    // Ensure we are bound to a live page (Flipkart sometimes opens cart in a new tab)
    if (typeof this.page.isClosed === 'function' && this.page.isClosed()) {
      this._maybeRebindToCartTab();
    } else {
      this._maybeRebindToCartTab();
    }

    // If we're already on viewcart (from PDP auto-redirect), just ensure it's stable
    if (!/\/viewcart(\?|$)/.test(this.page.url())) {
      await this.page.goto('/viewcart', { waitUntil: 'domcontentloaded' });
    } else {
      await this.page.waitForLoadState('domcontentloaded');
    }
    await Promise.race([
      this.placeOrderBtn.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.loginLink.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.cartGateText.first().waitFor({ state: 'visible', timeout: 10000 }),
  this.productLink.first().waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {});
    // If not empty, a product link or any item signal should show
    await Promise.race([
  this.productLink.first().waitFor({ state: 'visible', timeout: 15000 }),
  this.cartItem.first().waitFor({ state: 'visible', timeout: 15000 })
    ]).catch(() => {});
  }

  async hasItems() {
    if (typeof this.page.isClosed === 'function' && this.page.isClosed()) {
      await this.open();
    }
    return (await this.cartItem.count()) > 0;
  }

  async removeFirstItem() {
    if (typeof this.page.isClosed === 'function' && this.page.isClosed()) {
      await this.open();
    }
    if (await this.hasItems()) {
      await this.removeBtn.first().click();
      if (await this.confirmRemoveBtn.first().isVisible().catch(() => false)) {
        await this.confirmRemoveBtn.first().click();
      }
      await this.page.waitForLoadState('networkidle');
    }
  }

  

  async proceedToCheckout() {
    await this.placeOrderBtn.first().click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
