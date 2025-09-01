import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    // Form that contains the Request OTP button (avoid global header context)
    this.form = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: /request otp/i }) })
      .or(
        page
          .locator('div')
          .filter({ has: page.getByRole('button', { name: /request otp/i }) })
      );

    // Email / Mobile input — strictly scoped to the login form to avoid header search
    this.emailInput = this.form
      .getByLabel(/(Enter )?(Email|Mobile)( number)?/i)
      .or(this.form.getByPlaceholder(/(Enter )?(Email|Mobile)/i))
      .or(this.form.locator('input._2IX_2-'))
      .or(this.form.locator('input[type="email"], input[type="tel"], input[type="text"]'))
      .or(this.form.getByRole('textbox'));
    // Buttons
    this.requestOtpBtn = page.getByRole('button', { name: /request otp/i }).or(
      page.getByText(/Request OTP/i)
    );
    this.verifyBtn = page.getByRole('button', { name: /verify/i }).or(
      page.getByText(/Verify/i)
    );
    // OTP inputs: handle single or multiple box layouts (scoped to form)
    this.otpInputs = this.form.locator(
      'input[autocomplete="one-time-code"], input[name*="otp" i], input[aria-label*="otp" i], input[type="tel"]'
    );
    // Error message container (best-effort) including validation text
    this.errorMessage = page
      .getByText(/Please enter valid Email ID\/Mobile number|invalid otp|wrong otp|unable to verify|try again|incorrect/i)
      .or(page.locator('span._2YULOR, div._2sKwjB, div[role="alert"]'));

  // cache for resolved input
  this._emailInputResolved = null;
  }

  async open() {
    // Prefer direct navigation; safer and less flaky than header menu.
    await this.page.goto('/account/login?ret=/');
    await this.page.waitForLoadState('domcontentloaded');
    // Ensure we're on login route
    await this.page.waitForURL(/account\/login/i, { timeout: 15000 }).catch(() => {});

    // Resolve the input inside the OTP form only
    const input = await this._resolveEmailInput();
    await input.waitFor({ state: 'visible', timeout: 15000 });
    this._emailInputResolved = input;
  }

  async _resolveEmailInput() {
    // Wait for the form that has the Request OTP button
    await this.form.first().waitFor({ state: 'visible', timeout: 15000 });
    const candidate = this.form
      .getByLabel(/(Enter )?(Email|Mobile)( number)?/i)
      .or(this.form.getByPlaceholder(/Enter Email\/Mobile number/i))
      .or(this.form.locator('input._2IX_2-'))
      .or(this.form.locator('input[type="tel"], input[type="email"], input[type="text"]'))
      .or(this.form.getByRole('textbox'))
      .first();
    if (await candidate.isVisible().catch(() => false)) return candidate;
    throw new Error('Login input not found within OTP form.');
  }

  async requestOtp(emailOrMobile) {
    const input = this._emailInputResolved ?? (await this._resolveEmailInput());
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.waitFor({ state: 'visible', timeout: 15000 });
    // Ensure interactable
    try { await input.focus({ timeout: 3000 }); } catch {}
    await input.fill(emailOrMobile, { timeout: 20000 });
    const validationError = this.page.getByText(/Please enter valid Email ID\/Mobile number/i);
    await this.requestOtpBtn.first().click();

    // Wait for either OTP inputs or validation error; whichever comes first
    await Promise.race([
      this.otpInputs.first().waitFor({ state: 'visible', timeout: 15000 }),
      validationError.waitFor({ state: 'visible', timeout: 15000 })
    ]).catch(() => {});

    if (await validationError.isVisible().catch(() => false)) {
      // Expected negative flow; let the test assert the validation error
      return;
    }
  }

  async enterOtp(otp) {
    // If no OTP input is visible (e.g., validation blocked), safely return
    const firstOtp = this.otpInputs.first();
    if (!(await firstOtp.isVisible().catch(() => false))) return;

    const count = await this.otpInputs.count();
    if (count > 1 && otp && otp.length) {
      // Fill across multiple boxes
      for (let i = 0; i < Math.min(count, otp.length); i++) {
        await this.otpInputs.nth(i).fill(otp[i]);
      }
    } else {
      // Single field
      await firstOtp.fill(otp);
    }
  }

  async clickVerify() {
    if (await this.verifyBtn.first().isVisible().catch(() => false)) {
      await this.verifyBtn.first().click();
    } else {
      // Some flows auto-verify on last digit; add a small wait
      await this.page.waitForTimeout(1500);
    }
  }

  async getErrorText() {
    if (await this.errorMessage.isVisible().catch(() => false)) {
      return (await this.errorMessage.first().textContent())?.trim() || '';
    }
    return '';
  }
}
