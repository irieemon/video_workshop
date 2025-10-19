import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login')

  // Fill in login form
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')

  // Click sign in button
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard')

  // Verify we're logged in
  await expect(page.locator('text=Dashboard')).toBeVisible()

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
