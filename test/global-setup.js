// @ts-check
/**
 * Global Playwright setup — logs in once, saves storageState to a temp file.
 * All tests then start already authenticated.
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'http://localhost:8790';
const USERNAME = 'leehg';
const PASSWORD = 'TestPass123!';

const STORAGE_STATE_PATH = path.join(__dirname, '../.auth-state.json');

module.exports = async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');

  const result = await page.evaluate(async ({ username, password }) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });
    const data = await r.json();
    return { ok: data.ok, csrfToken: data.csrfToken };
  }, { username: USERNAME, password: PASSWORD });

  if (!result.ok) {
    throw new Error(`Global setup login failed`);
  }

  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
  console.log('[global-setup] Logged in and saved auth state to', STORAGE_STATE_PATH);
};
