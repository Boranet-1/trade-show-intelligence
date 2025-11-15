import { test, expect } from '@playwright/test'

/**
 * E2E Test: Persona Management
 *
 * Tests persona CRUD operations, weight slider adjustments,
 * and scoring preview functionality.
 */

test.describe('Persona Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/personas')
  })

  test('should display persona list page', async ({ page }) => {
    await test.step('Verify Persona List', async () => {
      // Verify page title
      await expect(page.locator('h1')).toContainText('Persona Management')

      // Verify description
      await expect(
        page.locator('text=Customize lead scoring')
      ).toBeVisible()

      // Verify create button exists
      await expect(
        page.locator('button:has-text("Create New Persona")')
      ).toBeVisible()

      // Verify re-process button exists
      await expect(
        page.locator('button:has-text("Re-process All Scans")')
      ).toBeVisible()
    })
  })

  test('should display default personas', async ({ page }) => {
    await test.step('Verify Default Personas', async () => {
      // Look for persona cards
      const personaCards = page.locator('[data-testid="persona-card"], .persona-card, h3')

      // Should have at least some personas
      const count = await personaCards.count()
      expect(count).toBeGreaterThan(0)

      // Check for default badge
      const defaultBadges = page.locator('text=Default')
      if (await defaultBadges.count() > 0) {
        await expect(defaultBadges.first()).toBeVisible()
      }
    })
  })

  test('should create new persona', async ({ page }) => {
    await test.step('Open Create Dialog', async () => {
      await page.click('button:has-text("Create New Persona")')

      // Verify dialog opened
      await expect(page.locator('h2:has-text("Create New Persona")')).toBeVisible()
    })

    await test.step('Fill Persona Details', async () => {
      // Fill name
      await page.fill('input[id="persona-name"]', 'Test Persona')

      // Fill description
      await page.fill('input[id="persona-description"]', 'A test persona for E2E testing')
    })

    await test.step('Configure Criteria', async () => {
      // Set company size range
      await page.fill('input[id="companySize-min"]', '100')
      await page.fill('input[id="companySize-max"]', '1000')

      // Add industry
      await page.fill('input[placeholder*="Add industry"]', 'Software')
      await page.click('button:has-text("Add")')

      // Verify industry added
      await expect(page.locator('text=Software').filter({ has: page.locator('button') })).toBeVisible()

      // Add technology
      await page.fill('input[placeholder*="Add technology"]', 'Salesforce')
      await page.keyboard.press('Enter') // Test keyboard shortcut

      // Verify technology added
      await expect(page.locator('text=Salesforce').filter({ has: page.locator('button') })).toBeVisible()
    })

    await test.step('Adjust Weights', async () => {
      // Verify weight sliders exist
      await expect(page.locator('text=Criteria Weights')).toBeVisible()

      // Verify all 7 weight sliders
      const weightLabels = [
        'Company Size',
        'Industry',
        'Technology',
        'Revenue',
        'Geography',
        'Decision Maker',
        'Funding Stage',
      ]

      for (const label of weightLabels) {
        await expect(page.locator(`label:has-text("${label}")`)).toBeVisible()
      }

      // Adjust company size weight
      const companySizeSlider = page.locator('input[id="weight-companySize"]')
      await companySizeSlider.fill('0.30')

      // Verify total weight updates
      const totalWeight = page.locator('text=/Total Weight:/')
      await expect(totalWeight).toBeVisible()

      // If weight doesn't sum to 1.0, normalize button should be enabled
      const normalizeButton = page.locator('button:has-text("Normalize")')
      if (await normalizeButton.isEnabled()) {
        await normalizeButton.click()

        // After normalization, total should be 1.0
        await expect(page.locator('text=/Total Weight:.*1\\.000/')).toBeVisible()
      }
    })

    await test.step('Preview Scoring', async () => {
      // Verify preview section
      await expect(page.locator('text=Persona Preview')).toBeVisible()

      // Should show sample companies
      await expect(page.locator('text=Sample Scoring')).toBeVisible()

      // Should show at least one sample company with tier badge
      const tierBadges = page.locator('text=/Hot|Warm|Cold|Unscored/')
      await expect(tierBadges.first()).toBeVisible()
    })

    await test.step('Save Persona', async () => {
      // Click create button
      await page.click('button:has-text("Create Persona")')

      // Verify success message
      await expect(page.locator('text=Persona created successfully')).toBeVisible({
        timeout: 10000,
      })

      // Dialog should close
      await expect(page.locator('h2:has-text("Create New Persona")')).not.toBeVisible()

      // New persona should appear in list
      await expect(page.locator('text=Test Persona')).toBeVisible()
    })
  })

  test('should edit existing persona', async ({ page }) => {
    // First create a test persona
    await page.click('button:has-text("Create New Persona")')
    await page.fill('input[id="persona-name"]', 'Editable Persona')
    await page.fill('input[id="companySize-min"]', '50')
    await page.fill('input[id="companySize-max"]', '500')
    await page.click('button:has-text("Create Persona")')
    await expect(page.locator('text=Persona created successfully')).toBeVisible()

    await test.step('Open Edit Dialog', async () => {
      // Find the persona card
      const personaCard = page.locator('text=Editable Persona').locator('..')

      // Click edit button
      await personaCard.locator('button:has-text("Edit")').click()

      // Verify edit dialog opened
      await expect(page.locator('h2:has-text("Edit Persona")')).toBeVisible()
    })

    await test.step('Update Persona', async () => {
      // Change name
      await page.fill('input[id="edit-persona-name"]', 'Updated Persona Name')

      // Change company size
      await page.fill('input[id="companySize-min"]', '200')

      // Click update
      await page.click('button:has-text("Update Persona")')

      // Verify success
      await expect(page.locator('text=Persona updated successfully')).toBeVisible({
        timeout: 10000,
      })

      // Updated name should appear in list
      await expect(page.locator('text=Updated Persona Name')).toBeVisible()
    })
  })

  test('should delete custom persona', async ({ page }) => {
    // First create a test persona
    await page.click('button:has-text("Create New Persona")')
    await page.fill('input[id="persona-name"]', 'Deletable Persona')
    await page.fill('input[id="companySize-min"]', '50')
    await page.fill('input[id="companySize-max"]', '500')
    await page.click('button:has-text("Create Persona")')
    await expect(page.locator('text=Persona created successfully')).toBeVisible()

    await test.step('Delete Persona', async () => {
      // Set up dialog listener
      page.on('dialog', (dialog) => {
        expect(dialog.type()).toBe('confirm')
        expect(dialog.message()).toContain('delete')
        dialog.accept()
      })

      // Find the persona card
      const personaCard = page.locator('text=Deletable Persona').locator('..')

      // Click delete button
      await personaCard.locator('button:has-text("Delete")').click()

      // Verify success
      await expect(page.locator('text=Persona deleted successfully')).toBeVisible({
        timeout: 10000,
      })

      // Persona should no longer appear in list
      await expect(page.locator('text=Deletable Persona')).not.toBeVisible()
    })
  })

  test('should prevent deleting default personas', async ({ page }) => {
    await test.step('Default Persona Protection', async () => {
      // Find a default persona
      const defaultPersona = page.locator('text=Default').locator('..').first()

      if (await defaultPersona.isVisible()) {
        // Delete button should be disabled
        const deleteButton = defaultPersona.locator('button:has-text("Delete")')
        await expect(deleteButton).toBeDisabled()

        // Edit button should also be disabled
        const editButton = defaultPersona.locator('button:has-text("Edit")')
        await expect(editButton).toBeDisabled()
      }
    })
  })

  test('should validate weight sum equals 1.0', async ({ page }) => {
    await page.click('button:has-text("Create New Persona")')

    await test.step('Weight Validation', async () => {
      // Fill required fields
      await page.fill('input[id="persona-name"]', 'Weight Test Persona')
      await page.fill('input[id="companySize-min"]', '50')
      await page.fill('input[id="companySize-max"]', '500')

      // Set weights that don't sum to 1.0
      await page.locator('input[id="weight-companySize"]').fill('0.50')
      await page.locator('input[id="weight-industry"]').fill('0.30')
      // Leave others at default, which won't sum to 1.0

      // Should show validation warning
      await expect(
        page.locator('text=/Weights must sum to 1\\.0/')
      ).toBeVisible()

      // Should show current total
      await expect(
        page.locator('text=/Total Weight:.*[0-9]\\./')
      ).toBeVisible()

      // Normalize button should be enabled
      await expect(page.locator('button:has-text("Normalize")')).toBeEnabled()
    })
  })

  test('should reset weights to equal distribution', async ({ page }) => {
    await page.click('button:has-text("Create New Persona")')

    await test.step('Reset to Equal', async () => {
      // Set some custom weights
      await page.locator('input[id="weight-companySize"]').fill('0.50')
      await page.locator('input[id="weight-industry"]').fill('0.30')

      // Click reset to equal
      await page.click('button:has-text("Reset to Equal")')

      // All weights should be equal (1/7 ≈ 0.143)
      const weightInputs = page.locator('input[type="number"][id^="weight-"]')
      const count = await weightInputs.count()

      for (let i = 0; i < count; i++) {
        const value = await weightInputs.nth(i).inputValue()
        const numValue = parseFloat(value)
        expect(numValue).toBeCloseTo(1 / 7, 2)
      }

      // Total should be 1.0
      await expect(page.locator('text=/Total Weight:.*1\\.000/')).toBeVisible()
    })
  })

  test('should show scoring preview with sample companies', async ({ page }) => {
    await page.click('button:has-text("Create New Persona")')

    await test.step('Scoring Preview', async () => {
      // Fill minimal criteria
      await page.fill('input[id="persona-name"]', 'Preview Test')
      await page.fill('input[id="companySize-min"]', '100')
      await page.fill('input[id="companySize-max"]', '500')

      // Scroll to preview section
      await page.locator('text=Persona Preview').scrollIntoViewIfNeeded()

      // Verify sample companies are shown
      const sampleCompanies = page.locator('text=/TechCorp|Healthcare|StartupX/i')
      await expect(sampleCompanies.first()).toBeVisible()

      // Verify fit scores are displayed
      const fitScores = page.locator('text=/%/')
      await expect(fitScores.first()).toBeVisible()

      // Verify tier badges
      const tierBadges = page.locator('text=/Hot|Warm|Cold|Unscored/')
      await expect(tierBadges.first()).toBeVisible()

      // Verify score breakdown details
      const detailsToggle = page.locator('summary:has-text("View score breakdown")')
      if (await detailsToggle.first().isVisible()) {
        await detailsToggle.first().click()

        // Should show criteria matches
        await expect(page.locator('text=/Company Size:|Industry:|Technolog/i')).toBeVisible()
      }
    })
  })

  test('should trigger re-processing of scans', async ({ page }) => {
    await test.step('Re-process Scans', async () => {
      // Click re-process button
      await page.click('button:has-text("Re-process All Scans")')

      // Should show processing indicator
      await expect(page.locator('button:has-text("Re-processing")')).toBeVisible({
        timeout: 5000,
      })

      // Should show success message after completion
      await expect(
        page.locator('text=/Re-processing started|scans will be recalculated/i')
      ).toBeVisible({ timeout: 30000 })
    })
  })
})
