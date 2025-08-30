import { test, expect } from '@playwright/test';

test.describe('Mobile iPhone12 smoke', () => {
  test('loads and shows app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('open add item modal and verify a11y labels', async ({ page }) => {
    await page.goto('/');
    // Bottom footer add button
    await page.getByRole('button', { name: /add new activity|add/i }).first().click();
    const dialog = page.getByRole('dialog', { name: /add new activity/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Title')).toBeVisible();
    await expect(dialog.getByLabel('Description')).toBeVisible();
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).toBeHidden();
  });
});



