export const selectors = {
  // Common
  closeLoginModalButton: 'button._30XB9F', // X button on login modal
  loginModalRoot: 'div._2MlkI1',
  toastError: 'div._2sKwjB',

  // Header / Search
  searchInput: 'input[name="q"]',
  searchSubmit: 'button[type="submit"]',
  searchResultsContainer: 'div._1YokD2._3Mn1Gg',
  sortDropdown: 'div._10UF8M',
  sortPriceLowToHigh: 'div._10UF8M:nth-child(3)',

  // Filters (these classnames can change; we prefer text-based locators in Pages)
  minPriceInput: 'input[placeholder="Min"]',
  maxPriceInput: 'input[placeholder="Max"]',
  brandFilterSection: 'div._213eRC',

  // Product cards and details
  productItem: 'div._1AtVbE div._13oc-S > div',
  productTitleInList: 'div._4rR01T, a.s1Q9rs',
  productPriceInList: 'div._30jeq3',
  productLinkInList: 'a[href*="/p/"]',

  // PDP
  pdpTitle: 'span.B_NuCI',
  pdpPrice: 'div._30jeq3._16Jk6d',
  addToCartBtn: 'button._2KpZ6l._2U9uOA._3v1-ww',
  goToCartBtn: 'a._3SkBxJ',

  // Cart
  cartRoot: 'div._1YokD2._3Mn1Gg',
  cartItem: 'div._1AtVbE > div',
  removeFromCartBtn: 'div._3dsJAO',
  confirmRemoveBtn: 'div._3dsJAO._24d-qY',
  placeOrderBtn: 'button._2KpZ6l._2ObVJD._3AWRsL',

  // Login form (when prompted during checkout)
  loginForm: 'form._1AePg3',
  loginError: 'span._2YULOR',
  usernameInput: 'input[_2IX_2-]',
  passwordInput: 'input[type="password"]',
  loginSubmit: 'button._2KpZ6l._20xBvF._3AWRsL',
};
