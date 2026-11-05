import { test, expect } from '@playwright/test';

test.describe('HearMeRead Developer Testing Dashboard', () => {
  test('loads developer testing dashboard with isolated environment indicators', async ({ page }) => {
    await page.goto('/testing-dashboard');
    await expect(page.locator('h2')).toContainText('Developer Testing Dashboard');
    await expect(page.locator('text=TESTING BRANCH')).toBeVisible();
    await expect(page.locator('text=DEV DB SHARED')).toBeVisible();
  });

  test('displays predefined accounts and supports quick role switching', async ({ page }) => {
    await page.goto('/testing-dashboard');

    // Admin login card
    await expect(page.locator('text=test.admin@hearmeread.test')).toBeVisible();
    await expect(page.locator('text=test.teacher@hearmeread.test')).toBeVisible();

    // Verify reset modal triggers on button click
    const resetTrigger = page.locator('button:has-text("Reset Test Data...")');
    await expect(resetTrigger).toBeVisible();
    await resetTrigger.click();

    await expect(page.locator('text=Confirm Test Data Reset')).toBeVisible();
    await expect(page.locator('input[placeholder="RESET"]')).toBeVisible();
  });

  test('displays direct navigation links to application sections', async ({ page }) => {
    await page.goto('/testing-dashboard');

    await expect(page.locator('a:has-text("Teacher Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Admin Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Passage Library")')).toBeVisible();
    await expect(page.locator('a:has-text("Class Records & Students")')).toBeVisible();
  });
});
