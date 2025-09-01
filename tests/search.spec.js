import { test, expect } from './fixtures.js';
import { HomePage } from '../pages/HomePage.js';
import { SearchPage } from '../pages/SearchPage.js';
import { testData } from '../utils/testData.js';

// B3. Search for a product — verify results
// B4. Apply filters — verify effect
// B5. Sort by Price Low to High — verify sorting

test.describe('B. Product Search & Filtering', () => {
  test('B3: Search shows results', async ({ page, searchSetup }) => {
  // Step 1: Perform a search using the fixture
    await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);
  // Step 2: Validate that at least one product card is visible
  await expect(searchPage.productCards.first()).toBeVisible();
  });

  test('B4: Apply price and brand filters affects results', async ({ page, searchSetup }) => {
  // Step 1: Perform a search
  await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);
  // Step 2: Apply price filter
  await searchPage.applyPriceFilter(testData.search.filters.minPrice, testData.search.filters.maxPrice);
  // Step 3: Apply brand filter
  await searchPage.applyBrandFilter(testData.search.filters.brand);
  // Step 4: Validate filtered results are shown
  await expect(searchPage.productCards.first()).toBeVisible();
  });

  test('B5: Sort by Price — Low to High', async ({ page, searchSetup }) => {
  // Step 1: Perform a search
  await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);
  // Step 2: Sort results by Low to High
  await searchPage.sortByLowToHigh();

  // Step 3: Capture first two items' prices to verify order (tile-scoped, text-based)
    const priceAt = async (i) => {
      const tile = searchPage.productCards.nth(i);
      await expect(tile).toBeVisible();
      const text = await tile.innerText();
      const m = text.match(/₹\s*([\d,]+)/);
      return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
    };

    const p0 = await priceAt(0);
    const p1 = await priceAt(1);

    expect(p0).toBeGreaterThan(0);
    expect(p0).toBeLessThanOrEqual(p1);
  });
});
