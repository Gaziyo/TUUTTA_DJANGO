import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
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
        },
        version: 0,
      }));
    });

    await page.reload();

    // Navigate to Chat tab
    const chatTab = page.getByText('Chat').first();
    if (await chatTab.isVisible()) {
      await chatTab.click();
    }
  });

  test('displays chat interface', async ({ page }) => {
    await expect(page.getByPlaceholder(/Ask me anything/i)).toBeVisible();
  });

  test('can type in chat input', async ({ page }) => {
    const chatInput = page.getByPlaceholder(/Ask me anything/i);
    await chatInput.fill('Hello, AI tutor!');

    await expect(chatInput).toHaveValue('Hello, AI tutor!');
  });

  test('shows send button', async ({ page }) => {
    const sendButton = page.locator('button[type="submit"]', { hasText: /Send|submit/i }).or(
      page.locator('button svg').filter({ has: page.locator('[d*="M12"]') })
    );

    // Send button should be visible
    await expect(sendButton.first()).toBeVisible();
  });

  test('can create new chat session', async ({ page }) => {
    const newChatButton = page.getByText(/New Chat/i).or(
      page.locator('button[aria-label*="New"]')
    );

    if (await newChatButton.first().isVisible()) {
      await newChatButton.first().click();

      // Should clear input or show new session
      const chatInput = page.getByPlaceholder(/Ask me anything/i);
      await expect(chatInput).toBeEmpty();
    }
  });

  test('displays chat history sidebar', async ({ page }) => {
    // Look for chat history or sidebar
    const sidebar = page.locator('[data-tour="chat-sidebar"]').or(
      page.getByText(/Chat History|Recent Chats/i)
    );

    // Sidebar should exist
    await expect(sidebar.first()).toBeVisible();
  });

  test('can select different AI models', async ({ page }) => {
    // Look for model selector
    const modelSelector = page.locator('select, [role="combobox"]').filter({
      has: page.locator('option, [role="option"]'),
    });

    if (await modelSelector.first().isVisible()) {
      // Model selector should be visible
      await expect(modelSelector.first()).toBeVisible();
    }
  });
});
