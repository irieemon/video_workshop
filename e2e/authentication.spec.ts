import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays landing page for unauthenticated users', async ({ page }) => {
    await expect(page.locator('text=Sora Video Generator')).toBeVisible()
    await expect(page.locator('a[href="/login"]')).toBeVisible()
    await expect(page.locator('a[href="/signup"]')).toBeVisible()
  })

  test('navigates to login page', async ({ page }) => {
    await page.click('a[href="/login"]')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('text=Sign In')).toBeVisible()
  })

  test('navigates to signup page', async ({ page }) => {
    await page.click('a[href="/signup"]')
    await expect(page).toHaveURL('/signup')
    await expect(page.locator('text=Create Account')).toBeVisible()
  })

  test('shows validation errors for invalid email', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Check for validation error
    await expect(page.locator('text=/Invalid email/i')).toBeVisible()
  })

  test('shows validation errors for short password', async ({ page }) => {
    await page.goto('/signup')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', '123')
    await page.click('button[type="submit"]')

    // Check for validation error
    await expect(page.locator('text=/password/i')).toBeVisible()
  })

  test('allows password reset flow', async ({ page }) => {
    await page.goto('/login')

    await page.click('a[href="/forgot-password"]')
    await expect(page).toHaveURL('/forgot-password')

    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // Check for success message
    await expect(page.locator('text=/Check your email/i')).toBeVisible()
  })

  test('redirects to dashboard after successful login', async ({ page }) => {
    // Note: This test requires valid test credentials
    await page.goto('/login')

    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('allows user to sign out', async ({ page }) => {
    // Assuming user is already logged in
    await page.goto('/dashboard')

    // Click user menu
    await page.click('[aria-label="User menu"]')

    // Click sign out
    await page.click('text=Sign Out')

    // Should redirect to home page
    await expect(page).toHaveURL('/')
  })
})

test.describe('Protected Routes', () => {
  test('redirects to login when accessing dashboard unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('redirects to login when accessing project pages unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/projects/123')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('redirects to login when accessing settings unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/settings')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})
