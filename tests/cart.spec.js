import { test, expect } from '../utils/fixtures.js';
import { createLlmTestTrace, attachLangfuseTraceRef } from '../utils/observability/langfuse.js';
import { llmJsonCheck } from '../utils/observability/llm_check.js';
import { SearchPage } from '../pages/SearchPage.js';
import { ProductPage } from '../pages/ProductPage.js';
import { CartPage } from '../pages/CartPage.js';
import { testData } from '../utils/testData.js';

// C6. Open product details — capture product name and price
// C7. Add product to cart — verify it appears in cart
// C8. Remove product from cart — verify it's removed

test.describe.serial('C. Cart Interactions', () => {
  test('C6: Open product details — capture product name and price', async ({ page, searchSetup }) => {
    const ti = test.info();
  const traceId = createLlmTestTrace({
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
  prompt: `Search term: ${testData.search.term} -> open first product details`,
  expectedOutput: 'PDP opens; title and price captured (> 0)',
      testName: ti.title,
      testId: `${ti.file || 'cart.spec.js'}::${ti.title}`,
      metadata: { file: ti.file, spec: 'cart.spec.js', area: 'cart', action: 'open-pdp' }
    });
  await attachLangfuseTraceRef(ti, { traceId });
    // Step 1: Perform a search using the fixture
    await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);

    // Step 2: Open first product details page
    const pdp = await searchPage.openFirstProduct();
    await expect(pdp).toHaveURL(/\/p\//);

    // Step 3: Initialize ProductPage and wait for product info to be visible
    const productPage = new ProductPage(pdp);
    await expect(productPage.title.or(productPage.titleH1)).toBeVisible();

    // Step 4: Capture product details (name and price)
    const details = await productPage.getDetails();

    // Step 5: Validate captured details
    expect(details.title).toBeTruthy();
    expect(details.title.length).toBeGreaterThan(0);
    expect(Number.isFinite(details.numericPrice)).toBeTruthy();
    expect(details.numericPrice).toBeGreaterThan(0);

    // Step 6: Attach details for debugging
    test.info().attach('C6-product-details', { 
      body: Buffer.from(JSON.stringify(details, null, 2)), 
      contentType: 'application/json' 
    });

    // LLM validation: Is the captured price a valid positive number for a typical product?
    const resC6 = await llmJsonCheck(test.info(), {
      prompt: `Is ${details.numericPrice} a sensible positive price for a consumer product? Answer JSON: {"sensible": true|false, "reason": "short"}`,
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
      attachName: 'llm-price-sanity'
    });
    if (resC6) {
      expect(resC6.ok).toBeTruthy();
      expect(resC6.parsed?.sensible === true).toBeTruthy();
    }
  });

  test('C7: Add product to cart — verify it appears in cart', async ({ page, searchSetup }) => {
    const ti = test.info();
  const traceId = createLlmTestTrace({
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
  prompt: `Search term: ${testData.search.term} -> add first product to cart`,
  expectedOutput: 'Cart shows at least one item; product title snippet visible',
      testName: ti.title,
      testId: `${ti.file || 'cart.spec.js'}::${ti.title}`,
      metadata: { file: ti.file, spec: 'cart.spec.js', area: 'cart', action: 'add-to-cart' }
    });
  await attachLangfuseTraceRef(ti, { traceId });
    // Step 1: Perform a search using the fixture
    await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);

    // Step 2: Open first product details page
    const pdp = await searchPage.openFirstProduct();
    await expect(pdp).toHaveURL(/\/p\//);

    // Step 3: Initialize ProductPage and capture product details
    const productPage = new ProductPage(pdp);
    const details = await productPage.getDetails();
    expect(details.title).toBeTruthy(); // Ensure we have a valid product

    // Step 4: Add product to cart
    await productPage.addItemToCart();

    // Step 5: Navigate to cart page
    const cartPage = new CartPage(pdp);
    await cartPage.open();

    // Step 6: Verify cart has items
    const itemCount = await cartPage.cartItem.count();
    expect(itemCount).toBeGreaterThan(0);

    // Step 7: Verify the added product appears in cart by checking for product name
    const titleSnippet = details.title.slice(0, 15).trim(); // First 15 chars for matching
    if (titleSnippet) {
      const escapedSnippet = titleSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await expect(cartPage.page.getByText(new RegExp(escapedSnippet, 'i')).first()).toBeVisible();
    }

    // LLM validation: Does the product title snippet plausibly match the search intent?
    const resC7 = await llmJsonCheck(test.info(), {
      prompt: `Query: ${testData.search.term}. Product title snippet: ${titleSnippet}. Respond JSON: {"matchesIntent": true|false}`,
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
      attachName: 'llm-cart-match'
    });
    if (resC7) {
      expect(resC7.ok).toBeTruthy();
      expect(typeof resC7.parsed?.matchesIntent === 'boolean').toBeTruthy();
    }
  });

  test('C8: Remove product from cart — verify it\'s removed', async ({ page, searchSetup }) => {
    const ti = test.info();
  const traceId = createLlmTestTrace({
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
  prompt: `Search term: ${testData.search.term} -> add first product and then remove from cart`,
  expectedOutput: 'Cart item count decreases; empty-state shown if only one item',
      testName: ti.title,
      testId: `${ti.file || 'cart.spec.js'}::${ti.title}`,
      metadata: { file: ti.file, spec: 'cart.spec.js', area: 'cart', action: 'remove-from-cart' }
    });
  await attachLangfuseTraceRef(ti, { traceId });
    // Step 1: Perform a search using the fixture
    await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);

    // Step 2: Open first product details page
    const pdp = await searchPage.openFirstProduct();
    await expect(pdp).toHaveURL(/\/p\//);

    // Step 3: Add product to cart first
    const productPage = new ProductPage(pdp);
    await productPage.addItemToCart();

    // Step 4: Navigate to cart page
    const cartPage = new CartPage(pdp);
    await cartPage.open();

  // Step 5: Record initial cart item count
  const initialCount = await cartPage.cartItem.count();
    expect(initialCount).toBeGreaterThan(0); // Ensure cart has items to remove

    // Step 6: Remove first item from cart
    await cartPage.removeFirstItem();

    // Step 8: If cart had only one item, assert explicit empty-state marker on viewcart
    if (initialCount === 1) {
      await expect(cartPage.page).toHaveURL(/\/viewcart(\?|$)/);
      const emptyMissingItems = cartPage.page.locator('div.s2gOFd', { hasText: 'Missing Cart items?' }).first();
      await expect(emptyMissingItems).toBeVisible();
    }

    // LLM validation: After removal, does an empty-state check make sense if initial count was 1?
    const resC8 = await llmJsonCheck(test.info(), {
      prompt: `Initial cart count was ${initialCount}. After removing one item, should an empty state be expected? Respond JSON: {"empty": true|false}`,
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
      attachName: 'llm-cart-empty-check'
    });
    if (resC8) {
      expect(resC8.ok).toBeTruthy();
      expect(typeof resC8.parsed?.empty === 'boolean').toBeTruthy();
    }
  });
});
