import { test as base, expect } from '@playwright/test';

// Reusable fixture: ensures we start at home, close login modal, and provide search helper
export const test = base.extend({
  searchSetup: async ({ page }, use) => {
    await page.goto('/');
    const closeBtn = page.locator('button._30XB9F, button:has-text("✕")');
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
    await use({
      async search(term) {
        const input = page.getByRole('textbox', { name: /Search for products, brands and more/i });
        const surgeGate = page.getByText(/Lot of rush|finding the best way/i).first();

        const inputVisible = await input.isVisible().catch(() => false);
        const surgeVisible = await surgeGate.isVisible().catch(() => false);

        if (surgeVisible || !inputVisible) {
          // Queue/surge gate or no search box: go directly to results
          await page.goto(`/search?q=${encodeURIComponent(term)}`, { waitUntil: 'domcontentloaded' });
        } else {
          await expect(input).toBeVisible({ timeout: 3000 });
          await input.fill(term);
          await Promise.all([
            page.waitForURL(/\/search(\?|$)/, { waitUntil: 'domcontentloaded' }),
            input.press('Enter'),
          ]);
        }

        // Overlays can pop again after navigation
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});

        // Assert a stable signal that results loaded (avoid brittle class names)
        const sortStrip = page.getByText('Sort By', { exact: true });
        await expect(sortStrip).toBeVisible({ timeout: 30000 });
      },
    });
  },
});

export { expect };
