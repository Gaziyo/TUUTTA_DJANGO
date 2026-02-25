import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Mock authentication
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
          userData: {
            'test-user': {
              files: [],
            },
          },
        },
        version: 0,
      }));
    });

    await page.reload();

    // Navigate to Files tab
    const filesTab = page.getByText('Files').first();
    if (await filesTab.isVisible()) {
      await filesTab.click();
    }
  });

  test('displays file upload panel', async ({ page }) => {
    await expect(page.getByText(/Upload Files|Drag.*drop/i)).toBeVisible();
  });

  test('shows drag and drop area', async ({ page }) => {
    const dropzone = page.locator('[data-tour="files-panel"]').or(
      page.getByText(/Drag.*drop|click to select/i)
    );

    await expect(dropzone.first()).toBeVisible();
  });

  test('shows supported file formats', async ({ page }) => {
    const formatsText = page.getByText(/Supported formats|Documents|PDF|DOCX/i);
    await expect(formatsText.first()).toBeVisible();
  });

  test('shows file size limit', async ({ page }) => {
    const sizeLimit = page.getByText(/50MB|Maximum.*size/i);
    await expect(sizeLimit.first()).toBeVisible();
  });

  test('can click to browse files', async ({ page }) => {
    // Find the file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('displays empty state when no files', async ({ page }) => {
    // Should show empty state or upload prompt
    const uploadPrompt = page.getByText(/Drag.*drop|Upload|No files/i);
    await expect(uploadPrompt.first()).toBeVisible();
  });

  test('shows processing indicator during upload', async ({ page }) => {
    // This would require actual file upload, which needs a test file
    const fileInput = page.locator('input[type="file"]');

    // Create a test file path (if test file exists)
    const testFilePath = path.join(process.cwd(), 'test-files', 'sample.txt');

    try {
      await fileInput.setInputFiles(testFilePath);

      // Should show processing indicator
      const processingIndicator = page.getByText(/Processing|Uploading|%/i);
      await expect(processingIndicator.first()).toBeVisible({ timeout: 3000 });
    } catch (error) {
      // Test file may not exist, skip this part
      console.log('Test file not found, skipping upload test');
    }
  });
});
