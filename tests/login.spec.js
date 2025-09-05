import { test, expect } from '../utils/fixtures.js';
import { createLlmTestTrace, attachLangfuseTraceRef } from '../utils/observability/langfuse.js';
import { llmJsonCheck } from '../utils/observability/llm_check.js';
import { HomePage } from '../pages/HomePage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { testData } from '../utils/testData.js';

// A1. Handle initial login modal/pop-up (close or bypass)
// A2. Attempt login with invalid credentials — verify error message (we trigger login via checkout)

test.describe('A. Login & Access Control', () => {
  test('A1: Close login modal if present on home', async ({ page }) => {
    const ti = test.info();
  const traceId = createLlmTestTrace({
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
      prompt: 'Open home page and close login modal if visible',
      expectedOutput: 'Login modal hidden',
      testName: ti.title,
      testId: `${ti.file || 'login.spec.js'}::${ti.title}`,
      metadata: { file: ti.file, spec: 'login.spec.js', area: 'login', action: 'dismiss-modal' }
    });
  await attachLangfuseTraceRef(ti, { traceId });
    const home = new HomePage(page);
    await home.open();
    await home.closeInitialLoginModalIfPresent();
    await expect(page.locator('div._2MlkI1')).toBeHidden({ timeout: 5000 });
  });

  test('A2: Attempt login with invalid credentials and verify error message', async ({ page }) => {
    const ti = test.info();
  const traceId = createLlmTestTrace({
      sessionId: `${ti.project.name}-w${ti.workerIndex}-r${ti.retry}`,
      prompt: `Attempt invalid login with email ${testData.invalidOtpLogin.email}`,
      expectedOutput: 'Validation error or login rejection state visible',
      testName: ti.title,
      testId: `${ti.file || 'login.spec.js'}::${ti.title}`,
      metadata: { file: ti.file, spec: 'login.spec.js', area: 'login', action: 'invalid-login' }
    });
  await attachLangfuseTraceRef(ti, { traceId });
    const home = new HomePage(page);
    const login = new LoginPage(page);

    // Step 1: Click on login button on home page
    await home.open();
    await home.openLoginFromHeader();

    // Step 2: Enter the dummy email in "Email/Mobile number" field
    await login.open(); // ensure we are on login route if header click didn't navigate
    await login.requestOtp(testData.invalidOtpLogin.email);

    // Step 3: If validation blocks, assert error and end; otherwise continue to OTP
    const validationVisible = await page
      .getByText(/Please enter valid Email ID\/Mobile number/i)
      .isVisible()
      .catch(() => false);

    if (validationVisible) {
      // Step 3a: Validate error message (negative flow)
      await expect(login.errorMessage.first()).toBeVisible();
      // LLM validation: Is it expected to see an error for invalid email/mobile?
      const resA2 = await llmJsonCheck(test.info(), {
        prompt: 'User attempts login with invalid email/mobile. Is an error message expected? Respond JSON: {"expected": true|false}',
        sessionId: `${test.info().project.name}-w${test.info().workerIndex}-r${test.info().retry}`,
        attachName: 'llm-invalid-login-expected'
      });
      if (resA2) {
        expect(resA2.ok).toBeTruthy();
        expect(resA2.parsed?.expected === true).toBeTruthy();
      }
      return;
    }

    // Step 4: Enter the OTP from testData (OTP inputs must be visible)
    await expect(login.otpInputs.first()).toBeVisible({ timeout: 5000 });
    await login.enterOtp(testData.invalidOtpLogin.otp);

    // Step 5: Click "Verify"
    await login.clickVerify();

    // Step 6: Validate the error message or rejection state
    const errText = (await login.getErrorText()) || '';
    const errVisible = await login.errorMessage.first().isVisible().catch(() => false);
    const stillOnLogin = /account\/login/i.test(page.url());
    const otpVisible = await login.otpInputs.first().isVisible().catch(() => false);
    expect(errText.length > 0 || errVisible || (stillOnLogin && otpVisible)).toBeTruthy();
  });
});
