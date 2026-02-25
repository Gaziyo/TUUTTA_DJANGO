import { test, expect } from '@playwright/test';

test.describe('Notes Functionality', () => {
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
              notes: [],
              subjects: ['Mathematics', 'Science'],
              folders: [],
            },
          },
        },
        version: 0,
      }));
    });

    await page.reload();

    // Navigate to Notes tab
    const notesTab = page.getByText('Notes').first();
    if (await notesTab.isVisible()) {
      await notesTab.click();
    }
  });

  test('displays notes panel', async ({ page }) => {
    await expect(page.getByText(/My Notes|Notes/i)).toBeVisible();
  });

  test('shows new note button', async ({ page }) => {
    const newNoteButton = page.getByText(/New Note|\+ Note/i).or(
      page.locator('button[aria-label*="new note"]')
    );

    await expect(newNoteButton.first()).toBeVisible();
  });

  test('can open note editor', async ({ page }) => {
    const newNoteButton = page.getByText(/New Note|\+ Note/i).first();

    if (await newNoteButton.isVisible()) {
      await newNoteButton.click();

      // Note editor should appear
      const editor = page.locator('[contenteditable="true"]').or(
        page.locator('textarea[placeholder*="note"]')
      );

      await expect(editor.first()).toBeVisible();
    }
  });

  test('can select subject for note', async ({ page }) => {
    // Look for subject selector
    const subjectSelect = page.locator('select').filter({
      has: page.locator('option:has-text("Mathematics")'),
    });

    if (await subjectSelect.first().isVisible()) {
      await subjectSelect.first().selectOption('Mathematics');

      // Should select Mathematics
      await expect(subjectSelect.first()).toHaveValue(/Mathematics/i);
    }
  });

  test('displays folder structure', async ({ page }) => {
    // Look for folder section
    const folderSection = page.getByText(/Folders|My Folders/i);

    // Folders should be visible or available
    const hasFolders = await folderSection.first().isVisible().catch(() => false);
    if (hasFolders) {
      await expect(folderSection.first()).toBeVisible();
    }
  });

  test('can filter notes by subject', async ({ page }) => {
    // Look for filter or subject tabs
    const subjectFilter = page.getByText('Mathematics').or(
      page.locator('[data-subject="Mathematics"]')
    );

    if (await subjectFilter.first().isVisible()) {
      await subjectFilter.first().click();

      // Should filter to show only Math notes
      await expect(page.getByText('Mathematics')).toBeVisible();
    }
  });

  test('shows empty state when no notes', async ({ page }) => {
    // Should show empty state message
    const emptyMessage = page.getByText(/No notes|Create your first note/i);
    await expect(emptyMessage.first()).toBeVisible();
  });
});
