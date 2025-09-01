// Simple retry helper and soft assertions
import { expect } from '@playwright/test';

export async function retry(fn, { attempts = 3, delayMs = 500 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export async function softExpectVisible(locator, message) {
  try {
    await expect(locator).toBeVisible();
  } catch (e) {
    console.warn('Soft expect failed:', message || e.message);
  }
}
