import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays login modal on initial load', async ({ page }) => {
    // Should show auth modal when not logged in
    await expect(page.getByText(/Welcome to Tuutta/i)).toBeVisible();
  });

  test('can switch between login and register forms', async ({ page }) => {
    // Click to switch to register
    await page.click('text=Create Account');
    await expect(page.getByText(/Sign up/i)).toBeVisible();

    // Click to switch back to login
    await page.click('text=Sign In');
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
  });

  test('shows validation errors for empty login form', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show validation errors
    await expect(page.locator('input[type="email"]:invalid')).toBeVisible();
  });

  test('shows validation errors for invalid email', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show email validation error
    await expect(page.locator('input[type="email"]:invalid')).toBeVisible();
  });

  test('can fill in registration form', async ({ page }) => {
    await page.click('text=Create Account');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Form should be filled
    await expect(page.locator('input[name="name"]')).toHaveValue('Test User');
    await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
  });

});
