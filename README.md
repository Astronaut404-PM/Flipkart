# Flipkart-E2E — Playwright E2E Automation (JavaScript)

Vipul Thawait - Design and implementation of an end-to-end test automation framework using Playwright to automate core e-commerce workflows on Flipkart.com. Built with a modular Page Object Model and CI via GitHub Actions.

## Features
- Playwright Test runner (JavaScript)
- Page Object Model (Home, Search, Product, Cart)
- Dynamic locators and resilient waits
- External test data in `utils/testData.js`
- Reusable fixtures in `tests/fixtures.js`
- HTML report and traces on failure; retries configurable (CI uses 2 by default)
- Environment variables via `.env`
- GitHub Actions to run tests on every push

## Project Structure
- `pages/`: POM classes
- `tests/`: Spec files organized by area (login, search, cart, checkout)
- `utils/`: Env, selectors, test data
- `playwright.config.js`: Global config

## Setup
1. Install Node.js 18+ (Node 20 recommended).
2. Install dependencies and browsers:

```powershell
npm i
npx playwright install
```

3. Optional: Create a `.env` file to override defaults
```
BASE_URL=https://www.flipkart.com
HEADLESS=true
USER_EMAIL=
USER_PASSWORD=
```

Quick start (Windows PowerShell):

```powershell
# install deps and browsers, then run the full suite headless
npm i ; npx playwright install ; npx playwright test
```

## Run Tests
- All tests (headless):
```powershell
npx playwright test
```

- Headed:
```powershell
npx playwright test --headed
```

- Single file (e.g., cart tests):
```powershell
npx playwright test .\tests\cart.spec.js
```

- Single test by title (grep):
```powershell
npx playwright test -g "C7: Add product to cart"
```

- Run the entire suite serially (one worker):
```powershell
npx playwright test --workers=1
```

- Add retries for a run (e.g., retry failed tests up to 3 times):
```powershell
npx playwright test --retries=3
```

- Debug with Inspector (Windows PowerShell):
```powershell
$env:PWDEBUG=1 ; npx playwright test -g "C7: Add product to cart"
```

- Override base URL for a run (Windows PowerShell):
```powershell
$env:BASE_URL="https://www.flipkart.com" ; npx playwright test
```

- View HTML report:
```powershell
npx playwright show-report
```

- Open a saved trace:
```powershell
npx playwright show-trace .\traces\trace.zip
```

## Scenarios Covered
A. Login & Access Control
1. Close initial login modal
2. Invalid login shows error

B. Product Search & Filtering
3. Search results load for query
4. Apply price and brand filters
5. Sort by Price — Low to High

C. Cart Interactions
6. Open first product, capture name/price
7. Add to cart and verify in cart
8. Remove from cart and verify removal

D. Checkout Simulation (Mock)
9. Proceed to checkout page
10. Verify login/address prompt (mocked by presence of elements)

## Notes
- Flipkart’s DOM can change; tests use a combination of text/role locators with fallbacks.
- Some actions open new tabs (PDP). We capture them with `context().waitForEvent('page')`.
- For stability in CI, we enable retries and reduce parallelism.

### Troubleshooting
- If a test appears to run on the wrong page, assert the URL early (e.g., `/viewcart`) before making cart assertions.
- Increase resiliency with `expect.poll` and role/text-based locators instead of brittle class names.
- When debugging flakiness locally, prefer `--workers=1` and `--headed` to reduce timing issues.

## GitHub Actions
A workflow is included at `.github/workflows/ci.yml` that installs dependencies, Playwright browsers, runs tests, and uploads the HTML report.
