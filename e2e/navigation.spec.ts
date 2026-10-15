import { expect, test } from '@playwright/test';

test('home, direct 404 navigation, and return home', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Good repairs start',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'This page is not here',
  );
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Good repairs start',
  );
  expect(errors).toEqual([]);
});
