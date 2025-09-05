import { test, expect } from '../utils/fixtures.js';
import { createLlmTestTrace, attachLangfuseTraceRef } from '../utils/observability/langfuse.js';
import { llmJsonCheck } from '../utils/observability/llm_check.js';
import { HomePage } from '../pages/HomePage.js';
import { SearchPage } from '../pages/SearchPage.js';
import { testData } from '../utils/testData.js';

// B3. Search for a product — verify results
// B4. Apply filters — verify effect
// B5. Sort by Price Low to High — verify sorting

test.describe('B. Product Search & Filtering', () => {
  test('B3: Search shows results', async ({ page, searchSetup }) => {
  const ti = test.info();
  const traceId = createLlmTestTrace({
    sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
    prompt: `Search for: ${testData.search.term}`,
    expectedOutput: 'At least one product card visible',
    testName: ti.title,
    testId: `${ti.file || 'search.spec.js'}::${ti.title}`,
    metadata: { file: ti.file, spec: 'search.spec.js', area: 'search', action: 'search-basic' }
  });
  await attachLangfuseTraceRef(ti, { traceId });
  // Step 1: Perform a search using the fixture
    await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);
  // Step 2: Validate that at least one product card is visible
  await expect(searchPage.productCards.first()).toBeVisible();

  // LLM validation: Are the top results relevant to the query?
  const titles = [];
  for (let i = 0; i < 3; i++) {
    const tile = searchPage.productCards.nth(i);
    const visible = await tile.isVisible().catch(() => false);
    if (!visible) break;
    const text = (await tile.innerText().catch(() => '')).trim();
    if (text) titles.push(text.slice(0, 200));
  }
  const promptRel = `You are validating e-commerce search relevance.\n` +
    `Query: ${testData.search.term}\n` +
    `Here are up to 3 product tiles (snippets).\n` +
    `Answer with JSON: {"relevant": true|false, "reason": "short"}.\n` +
    `Tiles:\n- ${titles.join('\n- ')}`;
  const resRel = await llmJsonCheck(test.info(), {
    prompt: promptRel,
    sessionId: `${test.info().project.name}-w${test.info().workerIndex}-r${test.info().retry}`,
    attachName: 'llm-search-relevance'
  });
  if (resRel) {
    expect(resRel.ok).toBeTruthy();
    expect(resRel.parsed?.relevant === true).toBeTruthy();
  }
  });

  test('B4: Apply price and brand filters affects results', async ({ page, searchSetup }) => {
  const ti = test.info();
  const traceId = createLlmTestTrace({
    sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
    prompt: `Search: ${testData.search.term} -> filter price ${testData.search.filters.minPrice}-${testData.search.filters.maxPrice} and brand ${testData.search.filters.brand}`,
    expectedOutput: 'Filtered results visible',
    testName: ti.title,
    testId: `${ti.file || 'search.spec.js'}::${ti.title}`,
    metadata: { file: ti.file, spec: 'search.spec.js', area: 'search', action: 'filter' }
  });
  await attachLangfuseTraceRef(ti, { traceId });
  // Step 1: Perform a search
  await searchSetup.search(testData.search.term);
    const searchPage = new SearchPage(page);
  // Step 2: Apply price filter
  await searchPage.applyPriceFilter(testData.search.filters.minPrice, testData.search.filters.maxPrice);
  // Step 3: Apply brand filter
  await searchPage.applyBrandFilter(testData.search.filters.brand);
  // Step 4: Validate filtered results are shown
  await expect(searchPage.productCards.first()).toBeVisible();

  // LLM validation: Do tiles appear consistent with brand filter intent?
  const titlesF = [];
  for (let i = 0; i < 3; i++) {
    const tile = searchPage.productCards.nth(i);
    const visible = await tile.isVisible().catch(() => false);
    if (!visible) break;
    const text = (await tile.innerText().catch(() => '')).trim();
    if (text) titlesF.push(text.slice(0, 200));
  }
  const promptFilt = `We applied filters: brand=${testData.search.filters.brand}, price=${testData.search.filters.minPrice}-${testData.search.filters.maxPrice}.\n` +
    `Given these tile texts, does it look consistent with the brand filter intent?\n` +
    `Respond JSON: {"brandConsistent": true|false, "reason": "short"}.\n` +
    `Tiles:\n- ${titlesF.join('\n- ')}`;
  const resFilt = await llmJsonCheck(test.info(), {
    prompt: promptFilt,
    sessionId: `${test.info().project.name}-w${test.info().workerIndex}-r${test.info().retry}`,
    attachName: 'llm-filter-consistency'
  });
  if (resFilt) {
    expect(resFilt.ok).toBeTruthy();
    expect(typeof resFilt.parsed?.brandConsistent === 'boolean').toBeTruthy();
  }
  });

  test('B5: Sort by Price — Low to High', async ({ page, searchSetup }) => {
  const ti = test.info();
  const traceId = createLlmTestTrace({
    sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
    prompt: `Search: ${testData.search.term} -> sort Low to High`,
    expectedOutput: 'First price <= second price',
    testName: ti.title,
    testId: `${ti.file || 'search.spec.js'}::${ti.title}`,
    metadata: { file: ti.file, spec: 'search.spec.js', area: 'search', action: 'sort-low-high' }
  });
  await attachLangfuseTraceRef(ti, { traceId });
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

    // LLM confirmation: Do these prices indicate ascending order?
    const promptSort = `Given two prices p0=${p0} and p1=${p1}, is the order non-decreasing? Respond JSON: {"ascending": true|false}`;
    const resSort = await llmJsonCheck(test.info(), {
      prompt: promptSort,
      sessionId: `${test.info().project.name}-w${test.info().workerIndex}-r${test.info().retry}`,
      attachName: 'llm-sort-check'
    });
    if (resSort) {
      expect(resSort.ok).toBeTruthy();
      expect(resSort.parsed?.ascending === true).toBeTruthy();
    }
  });
});
