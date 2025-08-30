import { test, expect } from '@playwright/test';

test('focus-visible outlines appear on buttons', async ({ page }) => {
  await page.goto('/');
  const firstButton = page.getByRole('button').first();
  await firstButton.focus();
  const outline = await firstButton.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline === 'auto' || outline === 'solid').toBeTruthy();
});



