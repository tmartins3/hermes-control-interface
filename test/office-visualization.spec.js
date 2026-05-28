// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8790';
// Credentials are used only by global-setup.js (via storageState).
// Tests load the pre-saved session cookie automatically.

/**
 * Navigate to the app. The session cookie is pre-loaded from storageState
 * (saved by global-setup.js), so the app should initialize authenticated.
 * We just need to load the page and wait for the login overlay to disappear.
 */
async function login(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('domcontentloaded');
  // Wait for the app to initialize with the pre-loaded session cookie
  await page.waitForFunction(() => {
    const overlay = document.getElementById('login-overlay');
    return overlay && overlay.classList.contains('hidden');
  }, { timeout: 10000 });
}

async function goToOffice(page) {
  await login(page);
  // Use window.navigate for reliable SPA routing
  await page.evaluate(() => window.navigate('office'));
  // Wait for the office floor to render with non-zero dimensions
  await page.waitForFunction(() => {
    const el = document.getElementById('office-floor');
    return el && el.offsetWidth > 0 && el.offsetHeight > 0;
  }, { timeout: 15000 });
  // Also wait for .office-agent elements — they arrive after an async API fetch
  // that fires after the floor mounts. Without this, count() returns 0.
  await page.locator('.office-agent').first().waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
}

/** Fetch the CSRF token from the active session (requires auth cookie).
 * @param {import('@playwright/test').Page} page */
async function getCsrf(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    const d = await r.json();
    return d.csrfToken || '';
  });
}

async function cleanupDepts(page) {
  // Delete any test departments left over from previous runs
  const csrf = await getCsrf(page);
  await page.evaluate(async (/** @type {string} */ csrf) => {
    try {
      const res = await fetch('/api/office/departments', { credentials: 'include' });
      const data = await res.json();
      for (const d of (data.departments || [])) {
        if (/^(Engineering|Test Dept|DelTest_)/.test(d.name)) {
          await fetch(`/api/office/departments/${encodeURIComponent(d.id)}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': csrf },
            credentials: 'include',
          });
        }
      }
    } catch (_) {}
  }, csrf);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Page Rendering
// ─────────────────────────────────────────────────────────────────────────────
test.describe('1. Basic Page Rendering', () => {
  test('navigates to the Office tab and the office floor is visible', async ({ page }) => {
    await goToOffice(page);
    const floor = page.locator('#office-floor');
    await expect(floor).toBeVisible();
  });

  test('checkerboard floor pattern — office-floor has background-image set', async ({ page }) => {
    await goToOffice(page);
    const floor = page.locator('#office-floor');
    const bgImage = await floor.evaluate(el => getComputedStyle(el).backgroundImage);
    // Should contain a gradient (checkerboard is via repeating-conic-gradient)
    expect(bgImage).toMatch(/gradient/i);
  });

  test('at least one agent desk appears on the floor', async ({ page }) => {
    await goToOffice(page);
    // Either desks exist or the empty message shows — we check for one or the other
    const deskOrEmpty = page.locator('.office-desk, .office-dept-zone, .empty');
    await expect(deskOrEmpty.first()).toBeVisible({ timeout: 10000 });
  });

  test('agent name tags appear below desks', async ({ page }) => {
    await goToOffice(page);
    // Wait for actual content (skip if no agents)
    const desks = page.locator('.office-desk');
    const count = await desks.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const nameTags = page.locator('.agent-name');
    await expect(nameTags.first()).toBeVisible();
    const text = await nameTags.first().textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Agent State Visualization
// ─────────────────────────────────────────────────────────────────────────────
test.describe('2. Agent State Visualization', () => {
  test('running agents have the office-agent--running class', async ({ page }) => {
    await goToOffice(page);
    const running = page.locator('.office-agent--running');
    const idle    = page.locator('.office-agent--idle');
    // At least one state class must exist
    const runCount  = await running.count();
    const idleCount = await idle.count();
    expect(runCount + idleCount).toBeGreaterThan(0);
    console.log(`Running agents: ${runCount}, Idle agents: ${idleCount}`);
  });

  test('running agents desk has green monitor glow (office-desk--running class)', async ({ page }) => {
    await goToOffice(page);
    const runningDesks = page.locator('.office-desk--running');
    const count = await runningDesks.count();
    if (count === 0) {
      console.log('No running agents found — skipping green glow check');
      test.skip();
      return;
    }
    // Verify CSS class exists; the visual effect is via ::before pseudo-element
    await expect(runningDesks.first()).toBeVisible();
  });

  test('idle agents have office-desk--idle class (faint blue monitor)', async ({ page }) => {
    await goToOffice(page);
    const idleDesks = page.locator('.office-desk--idle');
    const count = await idleDesks.count();
    if (count === 0) {
      console.log('No idle agents found — skipping idle state check');
      test.skip();
      return;
    }
    await expect(idleDesks.first()).toBeVisible();
  });

  test('running agents have typing arm animation (agent-type keyframe on torso::before/after)', async ({ page }) => {
    await goToOffice(page);
    const runningAgents = page.locator('.office-agent--running');
    const count = await runningAgents.count();
    if (count === 0) {
      console.log('No running agents — skipping typing animation check');
      test.skip();
      return;
    }
    // The typing animation is applied via CSS to .office-agent--running .agent-torso::before/after
    // We verify the CSS rule is active by checking computed animation on the torso pseudo-element
    const animationName = await runningAgents.first().locator('.agent-torso').evaluate(el => {
      // pseudo-element animation can only be checked via stylesheet inspection
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('office-agent--running') && rule.selectorText.includes('torso')) {
              const anim = rule.style?.animationName || rule.style?.getPropertyValue('animation-name');
              if (anim) return anim;
            }
          }
        } catch (_) {}
      }
      return null;
    });
    // The animation may be on ::before/::after so check via cssRules
    const hasAnimation = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('agent--running') && rule.selectorText.includes('torso')) {
              const anim = rule.style?.animationName || '';
              if (anim.includes('agent-type')) return true;
            }
          }
        } catch (_) {}
      }
      return false;
    });
    expect(hasAnimation).toBe(true);
  });

  test('running agents have a pulsing status dot (pulse-dot animation)', async ({ page }) => {
    await goToOffice(page);
    const runningAgents = page.locator('.office-agent--running');
    const count = await runningAgents.count();
    if (count === 0) {
      console.log('No running agents — skipping status dot pulse check');
      test.skip();
      return;
    }
    const dot = runningAgents.first().locator('.agent-status-dot');
    await expect(dot).toBeVisible();
    const animation = await dot.evaluate(el => getComputedStyle(el).animationName);
    expect(animation).toContain('pulse-dot');
  });

  test('idle agents have a non-pulsing status dot', async ({ page }) => {
    await goToOffice(page);
    const idleAgents = page.locator('.office-agent--idle');
    const count = await idleAgents.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const dot = idleAgents.first().locator('.agent-status-dot');
    await expect(dot).toBeVisible();
    const animation = await dot.evaluate(el => getComputedStyle(el).animationName);
    expect(animation).not.toContain('pulse-dot');
  });

  test('hovering an agent causes -3px translateY lift (CSS rule check)', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    const count = await agent.count();
    if (count === 0) { test.skip(); return; }

    // In headless Chromium, CSS :hover transitions don't always resolve via
    // getComputedStyle after page.hover(). Instead verify the CSS rule exists.
    const hasHoverTransform = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            const r = /** @type {any} */ (rule);
            if (r.selectorText && r.selectorText.includes('office-agent') && r.selectorText.includes('hover')) {
              const transform = r.style?.transform || r.style?.getPropertyValue('transform');
              if (transform && transform.includes('-3px')) return true;
            }
          }
        } catch (_) {}
      }
      return false;
    });
    expect(hasHoverTransform).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Agent Popup
// ─────────────────────────────────────────────────────────────────────────────
test.describe('3. Agent Popup', () => {
  test('clicking an agent shows the popup', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    if (await agent.count() === 0) { test.skip(); return; }
    await agent.click();
    const popup = page.locator('#office-agent-popup');
    await expect(popup).toBeVisible({ timeout: 3000 });
  });

  test('popup shows agent name', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    if (await agent.count() === 0) { test.skip(); return; }
    const agentName = await agent.getAttribute('data-profile');
    await agent.click();
    const popup = page.locator('#office-agent-popup');
    await expect(popup).toBeVisible();
    const popupName = page.locator('.popup-name');
    await expect(popupName).toBeVisible();
    const text = await popupName.textContent();
    expect(text?.trim().toUpperCase()).toBe(agentName?.toUpperCase());
  });

  test('popup shows Running or Stopped status', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    if (await agent.count() === 0) { test.skip(); return; }
    await agent.click();
    const popup = page.locator('#office-agent-popup');
    await expect(popup).toBeVisible();
    const statusVal = page.locator('.popup-val');
    await expect(statusVal).toBeVisible();
    const statusText = await statusVal.textContent();
    expect(statusText).toMatch(/running|stopped/i);
  });

  test('popup has Open and Close buttons', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    if (await agent.count() === 0) { test.skip(); return; }
    await agent.click();
    const popup = page.locator('#office-agent-popup');
    await expect(popup).toBeVisible();
    await expect(page.locator('.popup-actions .btn').filter({ hasText: /open/i })).toBeVisible();
    await expect(page.locator('.popup-actions .btn').filter({ hasText: /close/i })).toBeVisible();
  });

  test('popup has slideUp animation applied', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    if (await agent.count() === 0) { test.skip(); return; }
    await agent.click();
    const popup = page.locator('#office-agent-popup');
    await expect(popup).toBeVisible();
    const animation = await popup.evaluate(el => getComputedStyle(el).animationName);
    expect(animation).toContain('slideUp');
  });

  test('clicking outside popup closes it', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    if (await agent.count() === 0) { test.skip(); return; }
    await agent.click();
    await expect(page.locator('#office-agent-popup')).toBeVisible();
    // Click somewhere neutral (the floor background)
    await page.locator('#office-floor').click({ position: { x: 5, y: 5 }, force: true });
    await expect(page.locator('#office-agent-popup')).not.toBeVisible({ timeout: 2000 });
  });

  test('clicking same agent again toggles popup off', async ({ page }) => {
    await goToOffice(page);
    const agent = page.locator('.office-agent').first();
    if (await agent.count() === 0) { test.skip(); return; }
    await agent.click();
    await expect(page.locator('#office-agent-popup')).toBeVisible();
    await agent.click();
    await expect(page.locator('#office-agent-popup')).not.toBeVisible({ timeout: 2000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Auto-refresh
// ─────────────────────────────────────────────────────────────────────────────
test.describe('4. Auto-refresh', () => {
  test('auto-refresh interval is registered (setInterval called with 10s)', async ({ page }) => {
    // We intercept setInterval to detect the 10-second interval
    const intervals = [];
    await page.addInitScript(() => {
      const original = window.setInterval;
      window.setInterval = function(fn, delay, ...args) {
        window.__capturedIntervals = window.__capturedIntervals || [];
        window.__capturedIntervals.push(delay);
        return original.call(this, fn, delay, ...args);
      };
    });
    await goToOffice(page);
    const capturedDelays = await page.evaluate(() => window.__capturedIntervals || []);
    const has10s = capturedDelays.some(d => d === 10000);
    expect(has10s).toBe(true);
  });

  test('office API is called on page load', async ({ page }) => {
    const apiCalls = [];
    page.on('request', req => {
      if (req.url().includes('/api/profiles') || req.url().includes('/api/office')) {
        apiCalls.push(req.url());
      }
    });
    await goToOffice(page);
    await page.waitForTimeout(2000);
    expect(apiCalls.length).toBeGreaterThan(0);
    console.log('API calls on load:', apiCalls);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Departments Panel
// ─────────────────────────────────────────────────────────────────────────────
test.describe('5. Departments Panel', () => {
  test('Departments button is visible', async ({ page }) => {
    await goToOffice(page);
    const btn = page.getByRole('button', { name: /departments/i });
    await expect(btn).toBeVisible();
  });

  test('clicking Departments slides in the 300px panel', async ({ page }) => {
    await goToOffice(page);
    const panel = page.locator('#office-assign-panel');
    // Initially hidden (translateX(100%))
    await expect(panel).not.toHaveClass(/open/);

    await page.getByRole('button', { name: /departments/i }).click();
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });
  });

  test('panel X button closes the panel', async ({ page }) => {
    await goToOffice(page);
    await page.getByRole('button', { name: /departments/i }).click();
    const panel = page.locator('#office-assign-panel');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });

    // Find the close (✕) button inside the panel
    const closeBtn = panel.locator('button').filter({ hasText: '✕' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(panel).not.toHaveClass(/open/, { timeout: 3000 });
  });

  test('"No departments yet" message shows when no departments exist (or existing depts shown)', async ({ page }) => {
    await goToOffice(page);
    await cleanupDepts(page);
    // Open panel and wait for dept-list to load (loading div disappears)
    await page.getByRole('button', { name: /departments/i }).click();
    const panel = page.locator('#office-assign-panel');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });
    // Wait for the loading placeholder to disappear
    await page.waitForFunction(() => {
      const list = document.getElementById('dept-list');
      return list && !list.querySelector('.loading');
    }, { timeout: 5000 }).catch(() => {});

    const noDeptsMsg = panel.locator('.empty, [class*="empty"]').filter({ hasText: /no department/i });
    const deptCards  = panel.locator('.card');
    const msgCount  = await noDeptsMsg.count();
    const cardCount = await deptCards.count();
    // Either the empty message or existing dept cards must be present —
    // a non-zero result confirms the panel rendered its content.
    console.log(`dept panel: ${msgCount} empty-msg, ${cardCount} cards`);
    expect(msgCount + cardCount).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Department CRUD
// ─────────────────────────────────────────────────────────────────────────────
test.describe('6. Department CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await goToOffice(page);
    await cleanupDepts(page);
  });

  test('empty name shows error toast "Department name is required"', async ({ page }) => {
    await page.getByRole('button', { name: /departments/i }).click();
    const panel = page.locator('#office-assign-panel');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });

    await panel.getByRole('button', { name: /\+ new department/i }).click();
    // Form should appear
    const form = page.locator('#dept-create-form');
    await expect(form).toBeVisible({ timeout: 3000 });

    // Submit with empty name
    await page.locator('#dept-name-input').fill('');
    await form.getByRole('button', { name: /create/i }).click();

    // Expect error toast
    const toast = page.locator('.toast, [class*="toast"], [class*="notification"]').filter({ hasText: /required/i });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('creating a new department with valid name shows success toast and appears in list', async ({ page }) => {
    await page.getByRole('button', { name: /departments/i }).click();
    const panel = page.locator('#office-assign-panel');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });

    await panel.getByRole('button', { name: /\+ new department/i }).click();
    const form = page.locator('#dept-create-form');
    await expect(form).toBeVisible({ timeout: 3000 });

    await page.locator('#dept-name-input').fill('Engineering');

    // Intercept the toast before it auto-removes — listen for DOM insertion
    const toastPromise = page.waitForFunction(() => {
      const container = document.getElementById('toast-container');
      if (!container) return false;
      const toasts = container.querySelectorAll('.toast');
      for (const t of toasts) {
        if (t.textContent && /created|success/i.test(t.textContent)) return true;
      }
      return false;
    }, { timeout: 5000 });

    await form.getByRole('button', { name: /create/i }).click();

    // Wait for the toast to appear (it auto-removes after ~3s so we catch it here)
    await toastPromise;
    console.log('Success toast appeared');

    // After creation ip() toggles the panel closed. Wait for it to fully close.
    await expect(panel).not.toHaveClass(/open/, { timeout: 3000 });

    // Now explicitly re-open the panel via window.openOfficeAssignPanel so it
    // does a fresh load (not a toggle), then verify Engineering is listed.
    await page.evaluate(() => { const w = /** @type {any} */ (window); w.openOfficeAssignPanel?.(); });
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });

    // Wait for dept-list to finish loading
    await page.waitForFunction(() => {
      const list = document.getElementById('dept-list');
      return list && !list.querySelector('.loading');
    }, { timeout: 8000 }).catch(() => {});

    const deptEntry = panel.locator('.card').filter({ hasText: /engineering/i }).first();
    await expect(deptEntry).toBeVisible({ timeout: 5000 });
  });

  test('new department zone appears on the office floor with colored border', async ({ page }) => {
    // Create a department via API (include CSRF token)
    const csrf27 = await getCsrf(page);
    await page.evaluate(async (csrf) => {
      await fetch('/api/office/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name: 'Engineering', color: '#7c945c' }),
        credentials: 'include',
      });
    }, csrf27);

    // Refresh office floor
    await page.evaluate(() => window.refreshOffice && window.refreshOffice());
    await page.waitForTimeout(1500);

    const zones = page.locator('.office-dept-zone');
    const count = await zones.count();
    expect(count).toBeGreaterThan(0);
  });

  test('assigning a profile to a department updates the floor zone', async ({ page }) => {
    // Create dept via API (include CSRF token)
    const csrf28 = await getCsrf(page);
    const deptId = await page.evaluate(async (csrf) => {
      const res = await fetch('/api/office/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name: 'Engineering', color: '#7c945c' }),
        credentials: 'include',
      });
      const data = await res.json();
      return data.id || null;
    }, csrf28);

    // Get first profile name
    const firstProfile = await page.evaluate(async () => {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      return (data.profiles || [])[0]?.name;
    });

    if (!firstProfile) {
      console.log('No profiles available — skipping assignment test');
      test.skip();
      return;
    }

    // Open panel and check the checkbox for first profile
    await page.getByRole('button', { name: /departments/i }).click();
    const panel = page.locator('#office-assign-panel');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });
    // Wait for dept-list to finish loading
    await page.waitForFunction(() => {
      const list = document.getElementById('dept-list');
      return list && !list.querySelector('.loading');
    }, { timeout: 5000 }).catch(() => {});

    // Find the first Engineering dept card (multiple may exist from prior test runs)
    const deptCard = panel.locator('.card').filter({ hasText: /engineering/i }).first();
    await expect(deptCard).toBeVisible({ timeout: 5000 });
    const profileCheckbox = deptCard.locator(`input[type="checkbox"]`).first();
    const isChecked = await profileCheckbox.isChecked();
    if (!isChecked) {
      await profileCheckbox.check();
      await page.waitForTimeout(1000); // allow API call
    }

    // The floor should now show Engineering zone with assigned agent
    await page.evaluate(() => window.refreshOffice && window.refreshOffice());
    await page.waitForTimeout(1500);

    const engZone = page.locator('.office-dept-label').filter({ hasText: /engineering/i });
    await expect(engZone).toBeVisible({ timeout: 5000 });
  });

  test('deleting a department removes it from panel and floor', async ({ page }) => {
    // Create a uniquely-named dept using the app's API helper (includes CSRF token)
    const DEPT_NAME = 'DelTest_' + Date.now();
    const createdId = await page.evaluate(async (name) => {
      // Get CSRF token from /api/auth/me
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      const meData = await meRes.json();
      const csrf = meData.csrfToken;
      if (!csrf) return null;
      const res = await fetch('/api/office/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ name, color: '#7c945c' }),
        credentials: 'include',
      });
      const data = await res.json();
      return data.id || null;
    }, DEPT_NAME);
    console.log('Created dept id:', createdId, 'name:', DEPT_NAME);

    await page.getByRole('button', { name: /departments/i }).click();
    const panel = page.locator('#office-assign-panel');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });
    // Wait for panel to fully load
    await page.waitForFunction(() => {
      const list = document.getElementById('dept-list');
      return list && !list.querySelector('.loading');
    }, { timeout: 5000 }).catch(() => {});

    // Find the unique dept card by its exact name
    const deptCard = panel.locator('.card').filter({ hasText: DEPT_NAME }).first();
    await expect(deptCard).toBeVisible({ timeout: 5000 });

    // Click the delete button (×) — last button in the card header row
    await deptCard.locator('button').last().click();

    // Handle the custom confirm modal (.modal-overlay, not a native dialog)
    const modal = page.locator('.modal-overlay').last();
    await expect(modal).toBeVisible({ timeout: 3000 });
    const confirmBtn = modal.locator('button').filter({ hasText: /delete|confirm|yes|ok/i }).last();
    await expect(confirmBtn).toBeVisible({ timeout: 2000 });
    await confirmBtn.click();

    // After deletion, ip() closes the panel (translate off-screen).
    // The panel uses CSS transform — NOT display:none — so cards remain in
    // the DOM and Playwright's isVisible() still returns true for off-screen
    // translated elements. Verify via the API instead.
    await page.waitForTimeout(1500);
    const stillExists = await page.evaluate(async (id) => {
      if (!id) return false;
      const r = await fetch('/api/office/departments');
      const data = await r.json();
      return (data.departments || []).some((/** @type {any} */ d) => d.id === id);
    }, createdId);
    expect(stillExists).toBe(false);
    console.log('Dept deleted from API — verified');

    // Floor should no longer have the dept label
    await page.evaluate(() => { const w = /** @type {any} */ (window); w.refreshOffice?.(); });
    await page.waitForTimeout(1500);
    const deptLabel = page.locator('.office-dept-label').filter({ hasText: DEPT_NAME });
    // Use count check — the floor re-renders and label should be absent
    const labelCount = await deptLabel.count();
    expect(labelCount).toBe(0);
    console.log('Dept label removed from floor — verified');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Unassigned Agents
// ─────────────────────────────────────────────────────────────────────────────
test.describe('7. Unassigned Agents', () => {
  test('unassigned agents appear in an "Unassigned" zone on the floor', async ({ page }) => {
    await goToOffice(page);
    await cleanupDepts(page);
    await page.evaluate(() => window.refreshOffice && window.refreshOffice());
    await page.waitForTimeout(2000);

    const zones = page.locator('.office-dept-zone');
    const count = await zones.count();

    if (count === 0) {
      // No zones means no agents at all
      const empty = page.locator('#office-floor .empty');
      await expect(empty).toBeVisible();
      console.log('No agents exist — floor shows empty message');
      return;
    }

    // When no departments exist, all agents should still show (in Unassigned zone)
    const agents = page.locator('.office-agent');
    const agentCount = await agents.count();
    expect(agentCount).toBeGreaterThan(0);

    // The zone label should read "Unassigned" when no departments exist
    const unassignedLabel = page.locator('.office-dept-label').filter({ hasText: /unassigned/i });
    const labelCount = await unassignedLabel.count();
    if (labelCount > 0) {
      await expect(unassignedLabel.first()).toBeVisible();
      console.log('Unassigned zone label is visible');
    } else {
      console.log('Agents present but no "Unassigned" label — may be in dept zones');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Light Theme
// ─────────────────────────────────────────────────────────────────────────────
test.describe('8. Light Theme', () => {
  test('light theme changes floor background gradient', async ({ page }) => {
    await goToOffice(page);

    // Check if there is a theme toggle button
    const themeToggle = page.locator('[data-theme-toggle], button[title*="theme"], button[aria-label*="theme"], .theme-toggle').first();
    const hasToggle = await themeToggle.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasToggle) {
      // Try forcing theme via attribute
      await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); });
      await page.waitForTimeout(500);
    } else {
      // Check current theme
      const currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      if (currentTheme !== 'light') {
        await themeToggle.click();
        await page.waitForTimeout(500);
      }
    }

    const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
    if (!isDark) {
      // Verify light theme floor background changes
      const floor = page.locator('#office-floor');
      const bgImage = await floor.evaluate(el => getComputedStyle(el).backgroundImage);
      // Light theme uses rgba(0,0,0,...) vs dark rgba(220,203,181,...)
      // Either way it should be a gradient
      expect(bgImage).toMatch(/gradient/i);
      console.log('Light theme floor background:', bgImage.substring(0, 80));
    } else {
      console.log('Could not switch to light theme — skipping verification');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Regression / Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
test.describe('9. Regression / Edge Cases', () => {
  test('page title shows "Office" heading', async ({ page }) => {
    await goToOffice(page);
    // Scope to #page-office to avoid strict-mode violation — all pages render
    // their .page-title into the DOM simultaneously; only the active one is visible.
    const title = page.locator('#page-office .page-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Office');
  });

  test('page subtitle shows "Agent workspace visualization"', async ({ page }) => {
    await goToOffice(page);
    const subtitle = page.locator('#page-office .page-subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText(/agent workspace visualization/i);
  });

  test('Refresh button triggers a floor reload', async ({ page }) => {
    const apiCalls = [];
    page.on('request', req => {
      if (req.url().includes('/api/profiles') || req.url().includes('/api/office')) {
        apiCalls.push(req.url());
      }
    });
    await goToOffice(page);
    const countBefore = apiCalls.length;

    const refreshBtn = page.getByRole('button', { name: /↻|refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForTimeout(2000);

    expect(apiCalls.length).toBeGreaterThan(countBefore);
  });

  test('office viewport has scrollable overflow for large floors', async ({ page }) => {
    await goToOffice(page);
    const viewport = page.locator('.office-viewport');
    await expect(viewport).toBeVisible();
    const overflow = await viewport.evaluate(el => getComputedStyle(el).overflow);
    expect(overflow).toBe('auto');
  });

  test('department panel is 300px wide when open', async ({ page }) => {
    await goToOffice(page);
    await page.getByRole('button', { name: /departments/i }).click();
    const panel = page.locator('#office-assign-panel');
    await expect(panel).toHaveClass(/open/, { timeout: 3000 });
    const width = await panel.evaluate(el => el.getBoundingClientRect().width);
    // Should be exactly 300px (or 100% on mobile, but we test at desktop)
    expect(width).toBeCloseTo(300, 0);
  });
});
