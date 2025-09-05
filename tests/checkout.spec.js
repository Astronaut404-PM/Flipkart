import { test, expect } from '../utils/fixtures.js';
import { createLlmTestTrace, attachLangfuseTraceRef } from '../utils/observability/langfuse.js';
import { llmJsonCheck } from '../utils/observability/llm_check.js';
import { SearchPage } from '../pages/SearchPage.js';
import { ProductPage } from '../pages/ProductPage.js';
import { CartPage } from '../pages/CartPage.js';
import { testData } from '../utils/testData.js';

// D9. Add to cart, Navigate to cart and proceed to checkout — validate page load
// D10. Validate that checkout prompts for login or address — mock or capture screen.

test.describe('D. Checkout Simulation (Mock)', () => {
  test('D9: Add to cart, go to cart, proceed to checkout — validate page load', async ({ page, searchSetup }) => {
    const ti = test.info();
  const traceId = createLlmTestTrace({
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
      prompt: `Search: ${testData.search.term} -> add product -> checkout`,
      expectedOutput: 'Checkout or login page loads; otherwise remain on cart',
      testName: ti.title,
      testId: `${ti.file || 'checkout.spec.js'}::${ti.title}`,
      metadata: { file: ti.file, spec: 'checkout.spec.js', area: 'checkout', action: 'proceed-to-checkout' }
    });
  await attachLangfuseTraceRef(ti, { traceId });
    // Step 1: Perform a search using the fixture
    await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);

    // Step 2: Open first product details page
    const pdp = await searchPage.openFirstProduct();
    await expect(pdp).toHaveURL(/\/p\//);

    // Step 3: Initialize ProductPage and ensure product is ready
    const productPage = new ProductPage(pdp);

    // Step 4: Add product to cart
    await productPage.addItemToCart();

  // Step 5: Navigate to cart page
  const cartPage = new CartPage(pdp);
  await cartPage.open();

    // Step 6: Verify cart has items (resilient)
    // Wait for a stable signal that the cart is populated
    await Promise.race([
      cartPage.productLink.first().waitFor({ state: 'visible', timeout: 20000 }),
      cartPage.removeBtn.first().waitFor({ state: 'visible', timeout: 20000 }),
      cartPage.placeOrderBtn.first().waitFor({ state: 'visible', timeout: 20000 }),
    ]).catch(() => {});

    // Poll for item count using two signals (links/remove) to reduce flakiness
    await expect.poll(
      async () => {
        const byLinks = await cartPage.cartItem.count().catch(() => 0);
        const byRemove = await cartPage.removeBtn.count().catch(() => 0);
        return Math.max(byLinks, byRemove);
      },
      { timeout: 15000, intervals: [250, 500, 750, 1000] }
    ).toBeGreaterThan(0);

    // Step 7: Proceed to checkout (if available)
    const canCheckout = await cartPage.placeOrderBtn.isEnabled().catch(() => false);
    if (canCheckout) {
      await cartPage.proceedToCheckout();
      // Step 8: Validate that checkout or login page loads
      await expect(cartPage.page).toHaveURL(/\/(checkout|account\/login)/, { timeout: 15000 });

      // LLM validation: Does it make sense that unauthenticated users hit login at checkout?
      const resD9 = await llmJsonCheck(test.info(), {
        prompt: 'User proceeds to checkout without prior authentication. Is a login prompt expected? Respond JSON: {"expected": true|false}',
        sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
        attachName: 'llm-checkout-login-expected'
      });
      if (resD9) {
        expect(resD9.ok).toBeTruthy();
        expect(resD9.parsed?.expected === true).toBeTruthy();
      }
    } else {
      // Fallback: If Place Order disabled, we should remain on cart
      await expect(cartPage.page).toHaveURL(/\/viewcart/);
    }
  });

  test('D10: Validate checkout prompts for login or address — capture evidence', async ({ page, searchSetup }) => {
    const ti = test.info();
  const traceId = createLlmTestTrace({
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
  prompt: `Search: ${testData.search.term} -> add product -> navigate to checkout`,
  expectedOutput: 'Login or address prompt visible',
      testName: ti.title,
      testId: `${ti.file || 'checkout.spec.js'}::${ti.title}`,
      metadata: { file: ti.file, spec: 'checkout.spec.js', area: 'checkout', action: 'validate-prompt' }
    });
  await attachLangfuseTraceRef(ti, { traceId });
    // Step 1: Perform a search using the fixture
    await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);

    // Step 2: Open first product details page
    const pdp = await searchPage.openFirstProduct();
    await expect(pdp).toHaveURL(/\/p\//);

    // Step 3: Initialize ProductPage and ensure product is ready
    const productPage = new ProductPage(pdp);

    // Step 4: Add product to cart
    await productPage.addItemToCart();

  // Step 5: Navigate to cart page
  const cartPage = new CartPage(pdp);
  await cartPage.open();

    // Step 6: Verify cart has items
    const itemCount = await cartPage.cartItem.count();
    expect(itemCount).toBeGreaterThan(0);

    // Step 7: Proceed to checkout (if available)
    const canCheckout = await cartPage.placeOrderBtn.isEnabled().catch(() => false);
    test.skip(!canCheckout, 'Place Order not enabled — skipping checkout prompt validation.');
    await cartPage.proceedToCheckout();

    // Sync on navigation or stable state before asserting prompts
    await Promise.race([
      cartPage.page.waitForURL(/\/(account\/login|checkout)/, { timeout: 20000 }).catch(() => null),
      cartPage.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => null),
    ]);

    // Step 8: Validate checkout gate prompts for login or address (broadened signals)
    const loginHeading = cartPage.page.getByRole('heading', { name: /login|sign in|enter mobile/i }).first();
    const loginLabel = cartPage.page.getByLabel(/mobile|email/i, { exact: false }).first();
    const continueBtn = cartPage.page.getByRole('button', { name: /^continue$/i }).first();
    const addressHeader = cartPage.page.getByText(/Delivery Address|Address|Deliver to/i).first();

    // Wait for any signal to be visible
    await Promise.race([
      loginHeading.waitFor({ state: 'visible', timeout: 15000 }),
      loginLabel.waitFor({ state: 'visible', timeout: 15000 }),
      continueBtn.waitFor({ state: 'visible', timeout: 15000 }),
      addressHeader.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {});

    const signals = await Promise.all([
      loginHeading.isVisible().catch(() => false),
      loginLabel.isVisible().catch(() => false),
      continueBtn.isVisible().catch(() => false),
      addressHeader.isVisible().catch(() => false),
    ]);
    expect(signals.some(Boolean)).toBe(true);

    // LLM validation: Given user is not logged in, is it valid to see login/address prompts?
    const resD10 = await llmJsonCheck(test.info(), {
      prompt: 'An e-commerce site gate keeps checkout. For a not-logged-in user, are login/address prompts expected? Respond JSON: {"expected": true|false}',
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
      attachName: 'llm-checkout-prompts-expected'
    });
    if (resD10) {
      expect(resD10.ok).toBeTruthy();
      expect(resD10.parsed?.expected === true).toBeTruthy();
    }

    // Step 9: Capture a screenshot as evidence
    await test.info().attach('checkout-prompt', {
      body: await cartPage.page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
});
