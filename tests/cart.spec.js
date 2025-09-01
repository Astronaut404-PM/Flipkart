import { test, expect } from './fixtures.js';
import { SearchPage } from '../pages/SearchPage.js';
import { ProductPage } from '../pages/ProductPage.js';
import { CartPage } from '../pages/CartPage.js';
import { testData } from '../utils/testData.js';

// C6. Open product details — capture product name and price
// C7. Add product to cart — verify it appears in cart
// C8. Remove product from cart — verify it's removed

test.describe.serial('C. Cart Interactions', () => {
  test('C6: Open product details — capture product name and price', async ({ page, searchSetup }) => {
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
  });

  test('C7: Add product to cart — verify it appears in cart', async ({ page, searchSetup }) => {
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
  });

  test('C8: Remove product from cart — verify it\'s removed', async ({ page, searchSetup }) => {
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
  });
});
