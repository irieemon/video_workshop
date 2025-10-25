import { test, expect } from '@playwright/test'

test.describe('Video Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from dashboard
    await page.goto('/dashboard')
  })

  test('creates a new project and generates video prompt', async ({ page }) => {
    // Click "Create Project" button
    await page.click('text=Create Project')

    // Fill in project details
    await page.fill('input[name="name"]', 'E2E Test Project')
    await page.fill('textarea[name="description"]', 'This is a test project for E2E testing')

    // Submit project creation form
    await page.click('button:has-text("Create Project")')

    // Wait for redirect to project page
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+$/)

    // Click "Create Video" button
    await page.click('text=Create Video')

    // Wait for video creation page
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+\/videos\/new/)

    // Fill in video brief
    await page.fill(
      'textarea#brief',
      'Create a product demo video for a new smartphone showcasing its camera features'
    )

    // Select platform (TikTok should be default)
    await expect(page.locator('button:has-text("TikTok")')).toHaveClass(/bg-scenra-amber/)

    // Start roundtable
    await page.click('button:has-text("Start Roundtable")')

    // Wait for AI processing
    await expect(page.locator('text=AI Film Crew Collaborating')).toBeVisible()

    // Wait for roundtable completion (timeout after 2 minutes)
    await expect(page.locator('text=Roundtable complete')).toBeVisible({
      timeout: 120000,
    })

    // Verify agent discussion is visible
    await expect(page.locator('text=director')).toBeVisible()
    await expect(page.locator('text=cinematographer')).toBeVisible()

    // Verify optimized prompt is displayed
    await expect(page.locator('text=Optimized Sora Prompt')).toBeVisible()

    // Save video
    await page.click('button:has-text("Save Video")')

    // Verify redirect back to project page
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+$/)

    // Verify video appears in project
    await expect(page.locator('text=Create a product demo video')).toBeVisible()
  })

  test('enables Advanced Mode and edits prompt', async ({ page }) => {
    // Navigate to existing project
    await page.click('text=E2E Test Project')

    // Create new video
    await page.click('text=Create Video')
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+\/videos\/new/)

    // Fill brief and start roundtable
    await page.fill('textarea#brief', 'Unboxing video for luxury watch')
    await page.click('button:has-text("Start Roundtable")')

    // Wait for completion
    await expect(page.locator('text=Roundtable complete')).toBeVisible({
      timeout: 120000,
    })

    // Enable Advanced Mode
    const advancedModeToggle = page.locator('role=switch[name="Advanced Mode"]')
    await advancedModeToggle.click()

    // Verify Advanced Mode controls are visible
    await expect(page.locator('text=Edit Sora Prompt')).toBeVisible()
    await expect(page.locator('text=Shot List Builder')).toBeVisible()
    await expect(page.locator('text=Additional Creative Guidance')).toBeVisible()

    // Edit the prompt
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.clear()
    await promptTextarea.fill('A luxury watch unboxing with dramatic lighting and slow motion reveals')

    // Verify character count updates
    await expect(page.locator('text=/\\d+ characters/')).toBeVisible()

    // Add additional guidance
    await page.fill(
      'textarea[placeholder*="Focus more on emotional journey"]',
      'Emphasize the premium feel and craftsmanship'
    )

    // Add a shot to the shot list
    await page.click('button:has-text("Add Shot")')

    // Fill in shot details
    await page.fill('input[placeholder*="0-4s"]', '0-5s')
    await page.fill('textarea[placeholder*="Describe this shot"]', 'Extreme close-up of watch face')
    await page.fill('input[placeholder*="Wide angle"]', 'Macro lens')

    // Regenerate with edits
    await page.click('button:has-text("Regenerate with Edits")')

    // Wait for regeneration
    await expect(page.locator('text=Regenerating with your guidance')).toBeVisible()
    await expect(page.locator('text=Roundtable complete')).toBeVisible({
      timeout: 120000,
    })

    // Save video with edits
    await page.click('button:has-text("Save Video")')

    // Verify redirect
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+$/)
  })

  test('validates copyright warnings in Advanced Mode', async ({ page }) => {
    // Navigate to existing project
    await page.click('text=E2E Test Project')

    // Create new video
    await page.click('text=Create Video')
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+\/videos\/new/)

    // Fill brief and start roundtable
    await page.fill('textarea#brief', 'Product showcase video')
    await page.click('button:has-text("Start Roundtable")')

    // Wait for completion
    await expect(page.locator('text=Roundtable complete')).toBeVisible({
      timeout: 120000,
    })

    // Enable Advanced Mode
    const advancedModeToggle = page.locator('role=switch[name="Advanced Mode"]')
    await advancedModeToggle.click()

    // Enter copyrighted content
    const promptTextarea = page.locator('textarea').first()
    await promptTextarea.clear()
    await promptTextarea.fill('A video featuring Nike shoes and playing Taylor Swift music')

    // Verify copyright warning appears
    await expect(page.locator('text=/Copyright Warning/i')).toBeVisible()
  })

  test('uses AI to suggest shots', async ({ page }) => {
    // Navigate to existing project
    await page.click('text=E2E Test Project')

    // Create new video
    await page.click('text=Create Video')
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+\/videos\/new/)

    // Fill brief and start roundtable
    await page.fill('textarea#brief', 'Tutorial video for smartphone camera features')
    await page.click('button:has-text("Start Roundtable")')

    // Wait for completion
    await expect(page.locator('text=Roundtable complete')).toBeVisible({
      timeout: 120000,
    })

    // Enable Advanced Mode
    const advancedModeToggle = page.locator('role=switch[name="Advanced Mode"]')
    await advancedModeToggle.click()

    // Verify AI-suggested shots are auto-populated
    await expect(page.locator('text=/Shot \\d+/')).toBeVisible()

    // Click AI Suggest Shots to regenerate
    await page.click('button:has-text("AI Suggest Shots")')

    // Wait for new suggestions
    await expect(page.locator('text=Regenerating')).toBeVisible()
    await expect(page.locator('text=Roundtable complete')).toBeVisible({
      timeout: 120000,
    })
  })
})

test.describe('Shot List Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=E2E Test Project')
    await page.click('text=Create Video')
    await page.waitForURL(/\/dashboard\/projects\/[^\/]+\/videos\/new/)

    // Complete roundtable
    await page.fill('textarea#brief', 'Test video')
    await page.click('button:has-text("Start Roundtable")')
    await expect(page.locator('text=Roundtable complete')).toBeVisible({
      timeout: 120000,
    })

    // Enable Advanced Mode
    await page.locator('role=switch[name="Advanced Mode"]').click()
  })

  test('reorders shots using up/down buttons', async ({ page }) => {
    // Add two shots
    await page.click('button:has-text("Add Shot")')
    await page.click('button:has-text("Add Shot")')

    // Fill first shot
    const firstShotDesc = page.locator('textarea[placeholder*="Describe this shot"]').first()
    await firstShotDesc.fill('First shot')

    // Fill second shot
    const secondShotDesc = page.locator('textarea[placeholder*="Describe this shot"]').nth(1)
    await secondShotDesc.fill('Second shot')

    // Move second shot up
    const upButtons = page.locator('button[aria-label*="Move up"]')
    await upButtons.nth(1).click()

    // Verify order changed
    const descriptions = page.locator('textarea[placeholder*="Describe this shot"]')
    await expect(descriptions.first()).toHaveValue('Second shot')
    await expect(descriptions.nth(1)).toHaveValue('First shot')
  })

  test('deletes shots', async ({ page }) => {
    // Add a shot
    await page.click('button:has-text("Add Shot")')

    // Fill shot
    await page.fill('textarea[placeholder*="Describe this shot"]', 'Shot to delete')

    // Delete the shot
    await page.click('button[aria-label*="Delete shot"]')

    // Verify shot is removed
    await expect(page.locator('text=Shot to delete')).not.toBeVisible()
  })
})
