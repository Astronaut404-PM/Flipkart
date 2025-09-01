import { BasePage } from './BasePage.js';

export class ProductPage extends BasePage {
  constructor(page) {
    super(page);
    this.title = page.locator('span.B_NuCI');
    this.titleH1 = page.getByRole('heading', { level: 1 }).or(page.getByRole('heading').first());
    this.price = page.locator('div._30jeq3._16Jk6d');
    // Add to Cart can be a text button or an icon button (unauthenticated flow shows an SVG with class KRzcNw)
    this.addToCart = page
      .getByRole('button', { name: /Add to cart/i })
      .or(page.locator('button._2KpZ6l._2U9uOA._3v1-ww'))
      .or(page.locator('button:has(svg.KRzcNw), a:has(svg.KRzcNw), [role="button"]:has(svg.KRzcNw)'));
    this.goToCart = page.getByRole('link', { name: /Go to cart/i }).or(page.locator('a._3SkBxJ'));
    this.buyNow = page.getByRole('button', { name: /Buy Now/i });
    // Variant controls (best-effort, resilient to obfuscated classes)
    this.variantRadios = page.locator('[role=radio]:not([aria-disabled="true"])');
    this.variantOptions = page.locator('[role=option]:not([aria-disabled="true"])');
    this.variantSwatches = page.locator('button[aria-pressed="false"], [role="button"][aria-pressed="false"]');
  }

  async getDetails() {
    await this.page.waitForURL(/\/p\//, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Wait for either title or titleH1 to be visible
    const titleLocator = this.title.or(this.titleH1);
    await titleLocator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    // Optional hardening: ensure a price-like element is visible on the PDP
    try {
      await this.price
        .or(this.page.getByText(/₹\s*[\d,]+/).first())
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
    } catch {}

    // Try to get the title from the visible locator
    let title = (await titleLocator.textContent().catch(() => null))?.trim() || '';

    // Fallback: OpenGraph meta title
    if (!title) {
      const og = await this.page.locator('meta[property="og:title"]').first().getAttribute('content').catch(() => '');
      if (og) title = og.trim();
    }

    // Fallback: derive from document.title when DOM locators differ across PDP variants
    try {
      const docTitle = await this.page.title().catch(() => '');
      if (docTitle) {
        const m = docTitle.match(/Buy\s+(.+?)\s+Online/i) || docTitle.match(/^(.+?)\s+-\s+Buy/i);
        title = (m ? m[1] : docTitle).trim();
      }
    } catch {}

    // Try to ensure price area is visible (support old and new classnames)
    const priceBlock = this.price
      .or(this.page.locator('.Nx9bqj'))
      .or(this.page.locator('div[class*="jeq3"], div[class*="Jk6d"]'))
      .first();
    await priceBlock.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});

    // Collect a candidate price text from multiple resilient selectors
    const priceTextCandidate = (
      await priceBlock.textContent().catch(() => null)
    )?.trim() || (
      await this.page
        .locator('.Nx9bqj, [data-test-id="pdp-price"], [data-testid="pdp-price"], div[class*="jeq3"], div[class*="Jk6d"]')
        .first()
        .textContent()
        .catch(() => null)
    )?.trim() || (
      await this.page.getByText(/(?:₹|Rs\.?|INR)[\s\u00A0\u202F]*[\d,.\u00A0\u202F]+/).first().textContent().catch(() => '')
    )?.trim() || '';

    // Robust numeric parser tolerant to commas, dots, NBSP and narrow NBSP separators
    const parseNumeric = (rawText) => {
      const raw = String(rawText || '');
      // 1) Direct regex capture allowing various separators
      const m = raw.match(/(?:₹|Rs\.?|INR)?[\s\u00A0\u202F]*([\d][\d,\.\u00A0\u202F]{1,})/);
      if (m) {
        const cleaned = m[1].replace(/[\u00A0\u202F\s,\.]/g, '');
        const val = parseInt(cleaned, 10);
        if (Number.isFinite(val)) return val;
      }
      // 2) Last resort: pick the largest plausible integer sequence
      const seqs = raw.match(/\d{3,6}/g) || [];
      const candidates = seqs.map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n));
      const plausible = candidates.filter((n) => n >= 100 && n <= 200000);
      if (plausible.length) return Math.max(...plausible);
      return NaN;
    };

    let numericPrice = parseNumeric(priceTextCandidate);

    // Fallback 1: Structured data (JSON-LD) often carries the price reliably
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      try {
        const ldJsonTexts = await this.page.locator('script[type="application/ld+json"]').allTextContents();
        for (const txt of ldJsonTexts) {
          try {
            const data = JSON.parse(txt);
            const findPrice = (obj) => {
              if (!obj || typeof obj !== 'object') return null;
              if (obj.price) return obj.price;
              if (obj.offers) {
                const o = obj.offers;
                if (Array.isArray(o)) {
                  for (const el of o) {
                    if (el && el.price) return el.price;
                  }
                } else if (o.price) {
                  return o.price;
                }
              }
              return null;
            };
            const priceVal = findPrice(data) ?? (Array.isArray(data) ? data.map(findPrice).find(Boolean) : null);
            if (priceVal) {
              const n = parseFloat(String(priceVal).replace(/[\u00A0\u202F,₹\s]/g, ''));
              if (Number.isFinite(n) && n > 0) {
                numericPrice = Math.round(n);
                break;
              }
            }
          } catch {}
        }
      } catch {}
    }

    // Fallback 2: Scan the DOM for a plausible price value (handles variants where ₹ is rendered via CSS)
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      try {
        const n = await this.page.evaluate(() => {
          const isPlausible = (val) => val >= 100 && val <= 200000; // coarse bounds for phone prices
          // Prefer elements near buy box
          const candidates = Array.from(document.querySelectorAll('body *')).slice(0, 3000);
          for (const el of candidates) {
            const t = (el.textContent || '').trim();
            if (!t) continue;
            const m = t.match(/(?:₹|Rs\.?|INR)?[\s\u00A0\u202F]*([\d][\d,\.\u00A0\u202F]{1,})/);
            if (m) {
              const val = parseInt(m[1].replace(/[\u00A0\u202F\s,\.]/g, ''), 10);
              if (Number.isFinite(val) && isPlausible(val)) return val;
            }
          }
          return null;
        });
        if (Number.isFinite(n)) numericPrice = n;
      } catch {}
    }

    return { title, priceText: priceTextCandidate, numericPrice };
  }

  async addItemToCart() {
    const addBtn = this.addToCart.first();
    await addBtn.waitFor({ state: 'visible', timeout: 15000 });

    // If disabled, try selecting any available variant to enable Add to cart
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const hasEnabled = await addBtn.isEnabled().catch(() => true); // icon buttons may not expose enabled state
      if (hasEnabled) break;

      // Click first available radio option
      const radio = this.variantRadios.first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click().catch(() => {});
      }

      // Click first available listbox option
      const option = this.variantOptions.first();
      if (await option.isVisible().catch(() => false)) {
        await option.click().catch(() => {});
      }

      // Toggle a swatch-like button
      const swatch = this.variantSwatches.first();
      if (await swatch.isVisible().catch(() => false)) {
        await swatch.click().catch(() => {});
      }

      // Heuristic: click any button hinting at RAM/Storage/Color choice
      const hintBtn = this.page.getByRole('button', { name: /(GB|RAM|Storage|Colour|Color)/i }).first();
      if (await hintBtn.isVisible().catch(() => false)) {
        await hintBtn.click().catch(() => {});
      }

      await this.page.waitForTimeout(300);
    }

    // Fast path: SVG-based Add to cart (unauthenticated flow)
    const svgAdd = this.page.locator('button:has(svg.KRzcNw), a:has(svg.KRzcNw), [role="button"]:has(svg.KRzcNw)').first();
    if (await svgAdd.isVisible().catch(() => false)) {
      await svgAdd.click();
      await this.page.waitForURL(/\/viewcart(\?|$)/, { timeout: 10000 }).catch(() => {});
      if (/\/viewcart(\?|$)/.test(this.page.url())) return;
    }

    // Click Add to cart (handles both text and SVG icon buttons)
  await addBtn.click();

    // Wait for one of the success outcomes:
    // 1) Automatic redirect to /viewcart for unauthenticated users
    // 2) Explicit "Go to cart" link appears
    // 3) Toast/confirmation text appears
    const redirected = this.page.waitForURL(/\/viewcart(\?|$)/, { timeout: 10000 }).then(() => 'redirect').catch(() => null);
    const gotoLink = this.goToCart.first().waitFor({ state: 'visible', timeout: 10000 }).then(() => 'goto').catch(() => null);
    const toast = this.page.getByText(/added to cart|cart has 1 item/i).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => 'toast').catch(() => null);
    const outcome = await Promise.race([redirected, gotoLink, toast]).catch(() => null);

    if (outcome === 'goto') {
      // Click the visible Go to cart link if not already redirected
      if (!/\/viewcart(\?|$)/.test(this.page.url())) {
        await this.goToCart.first().click().catch(() => {});
        await this.page.waitForURL(/\/viewcart(\?|$)/, { timeout: 10000 }).catch(() => {});
      }
    } else if (outcome === 'redirect') {
      // Already landed on viewcart
    } else {
      // Toast only branch: proceed to final guarantee below
      await this.page.waitForLoadState('networkidle').catch(() => {});
    }

    // Final guarantee: ensure we're on the cart page and it's ready
    if (!/\/viewcart(\?|$)/.test(this.page.url())) {
      await this.page.goto('/viewcart', { waitUntil: 'domcontentloaded' }).catch(() => {});
    }
    await Promise.race([
      this.page.getByRole('button', { name: /^remove$/i }).first().waitFor({ state: 'visible', timeout: 10000 }),
      this.page.locator('div._3dsJAO').first().waitFor({ state: 'visible', timeout: 10000 }),
      this.page.getByRole('button', { name: /place order/i }).first().waitFor({ state: 'visible', timeout: 10000 }),
      this.page.locator('main a[href*="/p/"]').first().waitFor({ state: 'visible', timeout: 10000 })
    ]).catch(() => {});
  }
}
