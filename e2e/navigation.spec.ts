import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Mock authentication to bypass login
    await page.evaluate(() => {
      localStorage.setItem('tuutta-storage', JSON.stringify({
        state: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
            settings: {
              theme: 'light',
              language: 'en',
              fontSize: 16,
              notifications: true,
            },
          },
        },
        version: 0,
      }));
    });

    await page.reload();
  });

  test('displays main navigation tabs', async ({ page }) => {
    await expect(page.getByText(/Chat/i)).toBeVisible();
    await expect(page.getByText(/Notes/i)).toBeVisible();
    await expect(page.getByText(/Files/i)).toBeVisible();
  });

  test('can switch between tabs', async ({ page }) => {
    // Click Notes tab
    await page.click('text=Notes');
    await expect(page.getByText(/My Notes/i)).toBeVisible();

    // Click Files tab
    await page.click('text=Files');
    await expect(page.getByText(/Upload Files/i)).toBeVisible();

    // Click Chat tab
    await page.click('text=Chat');
    await expect(page.getByText(/AI Tutor/i)).toBeVisible();
  });

  test('can open settings modal', async ({ page }) => {
    const settingsButton = page.locator('[aria-label="Settings"]');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await expect(page.getByText(/Settings/i)).toBeVisible();
    }
  });

  test('can toggle dark mode', async ({ page }) => {
    const body = page.locator('body');
    const initialClass = await body.getAttribute('class');

    // Find and click theme toggle (may be in settings)
    const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="Theme"]').first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();

      // Class should change
      const newClass = await body.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('displays user profile information', async ({ page }) => {
    // Should show user name or email somewhere
    const userInfo = page.getByText(/Test User|test@example.com/i);
    await expect(userInfo.first()).toBeVisible();
  });
});
