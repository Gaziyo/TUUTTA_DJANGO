import { test, expect } from '@playwright/test';

test('smoke @smoke: app loads with mocked auth', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    localStorage.setItem('tuutta-auth', JSON.stringify({
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
  await expect(page.getByText(/Chat|AI Tutor/i).first()).toBeVisible();
});
