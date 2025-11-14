import { test, expect } from '@playwright/test'

/**
 * E2E Test: Manual Input Page
 *
 * Tests the manual data entry functionality:
 * 1. Adding new rows
 * 2. Field validation
 * 3. Required field enforcement
 * 4. Email format validation
 * 5. Processing valid rows
 * 6. Error handling for invalid data
 */

test.describe('Manual Input Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/input')
    await expect(page).toHaveTitle(/Trade Show Intelligence/)
    await expect(page.locator('h1')).toContainText('Manual Data Entry')
  })

  test('should display empty state initially', async ({ page }) => {
    await test.step('Verify Empty State', async () => {
      // Should show "No rows added yet" message
      await expect(page.locator('text=No rows added yet')).toBeVisible()

      // Should show "Add Your First Row" button
      await expect(page.locator('button:has-text("Add Your First Row")')).toBeVisible()

      // Summary stats should show zeros
      await expect(page.locator('text=/Total Rows.*0/i')).toBeVisible()
      await expect(page.locator('text=/Valid.*0/i')).toBeVisible()
      await expect(page.locator('text=/Needs Review.*0/i')).toBeVisible()
    })
  })

  test('should add a new row with validation errors', async ({ page }) => {
    await test.step('Add Empty Row', async () => {
      // Click "Add Row" button
      const addButton = page.locator('button:has-text("Add Row")').first()
      await addButton.click()

      // Table should appear
      await expect(page.locator('table')).toBeVisible()

      // Should show 1 row with validation status
      await expect(page.locator('tbody tr')).toHaveCount(1)

      // Row should have validation error icon
      const errorIcon = page.locator('tbody tr').first().locator('[class*="text-red-600"]').first()
      await expect(errorIcon).toBeVisible()

      // Summary should show 1 invalid row
      await expect(page.locator('text=/Total Rows.*1/i')).toBeVisible()
      await expect(page.locator('text=/Needs Review.*1/i')).toBeVisible()

      // Validation error message should be displayed
      await expect(page.locator('text=/Validation Issues/i')).toBeVisible()
    })
  })

  test('should validate required fields', async ({ page }) => {
    await test.step('Add Row and Check Validation', async () => {
      // Add a row
      await page.locator('button:has-text("Add Row")').first().click()

      // Get the first row
      const firstRow = page.locator('tbody tr').first()

      // Fill only name (missing email and company)
      await firstRow.locator('input[placeholder="Full Name"]').fill('John Doe')

      // Should still show validation errors
      await expect(page.locator('text=/Email is required/i')).toBeVisible()
      await expect(page.locator('text=/Company is required/i')).toBeVisible()

      // Fill email with invalid format
      await firstRow.locator('input[placeholder*="email"]').fill('invalid-email')
      await expect(page.locator('text=/Email format is invalid/i')).toBeVisible()

      // Fill valid email
      await firstRow.locator('input[placeholder*="email"]').fill('john@techcorp.com')

      // Should still need company
      await expect(page.locator('text=/Company is required/i')).toBeVisible()

      // Fill company
      await firstRow.locator('input[placeholder="Company Name"]').fill('TechCorp Solutions')

      // Now validation should pass
      const validCount = page.locator('text=/Valid.*1/i')
      await expect(validCount).toBeVisible({ timeout: 2000 })

      // Validation issues section should disappear or show 0
      const invalidCount = await page.locator('text=/Needs Review.*0/i').count()
      expect(invalidCount).toBeGreaterThan(0)
    })
  })

  test('should fill all fields including optional ones', async ({ page }) => {
    await test.step('Complete Row Entry', async () => {
      // Add a row
      await page.locator('button:has-text("Add Row")').first().click()

      const firstRow = page.locator('tbody tr').first()

      // Fill all fields
      await firstRow.locator('input[placeholder="Full Name"]').fill('Jane Smith')
      await firstRow.locator('input[placeholder*="email"]').fill('jane@innovate.com')
      await firstRow.locator('input[placeholder="Company Name"]').fill('Innovate Inc')
      await firstRow.locator('input[placeholder="Job Title"]').fill('VP Engineering')
      await firstRow.locator('input[placeholder="Phone"]').fill('555-1234')
      await firstRow.locator('input[placeholder="Notes"]').fill('Met at booth #42')

      // Should show as valid
      const checkIcon = firstRow.locator('[class*="text-green-600"]').first()
      await expect(checkIcon).toBeVisible({ timeout: 2000 })

      // Summary should show 1 valid row
      await expect(page.locator('text=/Valid.*1/i')).toBeVisible()
      await expect(page.locator('text=/Needs Review.*0/i')).toBeVisible()

      // Process button should be enabled
      const processButton = page.locator('button:has-text("Process")')
      await expect(processButton).toBeEnabled()
    })
  })

  test('should add multiple rows', async ({ page }) => {
    await test.step('Add Multiple Rows', async () => {
      const testData = [
        {
          name: 'Alice Johnson',
          email: 'alice@startup.com',
          company: 'StartupX',
          title: 'Founder',
          phone: '555-9012',
          notes: 'Interested in partnership',
        },
        {
          name: 'Bob Williams',
          email: 'bob@enterprise.com',
          company: 'Enterprise Corp',
          title: 'CTO',
          phone: '555-3456',
          notes: 'Follow up next week',
        },
        {
          name: 'Carol Davis',
          email: 'carol@techgiant.com',
          company: 'TechGiant Inc',
          title: 'Product Manager',
          phone: '555-7890',
          notes: 'Demo scheduled',
        },
      ]

      // Add rows and fill data
      for (let i = 0; i < testData.length; i++) {
        await page.locator('button:has-text("Add Row")').first().click()

        const row = page.locator('tbody tr').nth(i)
        const data = testData[i]

        await row.locator('input[placeholder="Full Name"]').fill(data.name)
        await row.locator('input[placeholder*="email"]').fill(data.email)
        await row.locator('input[placeholder="Company Name"]').fill(data.company)
        await row.locator('input[placeholder="Job Title"]').fill(data.title)
        await row.locator('input[placeholder="Phone"]').fill(data.phone)
        await row.locator('input[placeholder="Notes"]').fill(data.notes)

        // Wait a bit for validation
        await page.waitForTimeout(300)
      }

      // Should show 3 total rows
      await expect(page.locator('text=/Total Rows.*3/i')).toBeVisible()

      // All should be valid
      await expect(page.locator('text=/Valid.*3/i')).toBeVisible()
      await expect(page.locator('text=/Needs Review.*0/i')).toBeVisible()

      // Process button should show correct count
      await expect(page.locator('button:has-text("Process 3 Valid Rows")')).toBeVisible()
    })
  })

  test('should delete a row', async ({ page }) => {
    await test.step('Delete Row', async () => {
      // Add two rows
      await page.locator('button:has-text("Add Row")').first().click()
      await page.locator('button:has-text("Add Row")').first().click()

      // Fill first row
      const firstRow = page.locator('tbody tr').first()
      await firstRow.locator('input[placeholder="Full Name"]').fill('Delete Me')
      await firstRow.locator('input[placeholder*="email"]').fill('delete@test.com')
      await firstRow.locator('input[placeholder="Company Name"]').fill('Test Co')

      // Fill second row
      const secondRow = page.locator('tbody tr').nth(1)
      await secondRow.locator('input[placeholder="Full Name"]').fill('Keep Me')
      await secondRow.locator('input[placeholder*="email"]').fill('keep@test.com')
      await secondRow.locator('input[placeholder="Company Name"]').fill('Keep Co')

      await page.waitForTimeout(500)

      // Should have 2 rows
      await expect(page.locator('text=/Total Rows.*2/i')).toBeVisible()

      // Click delete on first row
      await firstRow.locator('button').filter({ hasText: '' }).click()

      // Should now have 1 row
      await expect(page.locator('text=/Total Rows.*1/i')).toBeVisible()

      // Remaining row should be the "Keep Me" one
      await expect(page.locator('input[value="Keep Me"]')).toBeVisible()
      await expect(page.locator('input[value="Delete Me"]')).not.toBeVisible()
    })
  })

  test('should process valid rows successfully', async ({ page }) => {
    await test.step('Process Badge Scans', async () => {
      // Add and fill a valid row
      await page.locator('button:has-text("Add Row")').first().click()

      const firstRow = page.locator('tbody tr').first()
      await firstRow.locator('input[placeholder="Full Name"]').fill('Test User')
      await firstRow.locator('input[placeholder*="email"]').fill('test@example.com')
      await firstRow.locator('input[placeholder="Company Name"]').fill('Example Inc')
      await firstRow.locator('input[placeholder="Job Title"]').fill('Engineer')

      await page.waitForTimeout(500)

      // Click process button
      const processButton = page.locator('button:has-text("Process 1 Valid Row")')
      await expect(processButton).toBeEnabled()
      await processButton.click()

      // Should show success message
      await expect(page.locator('text=/Successfully processed.*badge scan/i')).toBeVisible({
        timeout: 10000,
      })

      // Table should be cleared
      await expect(page.locator('text=No rows added yet')).toBeVisible({ timeout: 5000 })

      // Stats should reset to zeros
      await expect(page.locator('text=/Total Rows.*0/i')).toBeVisible()
    })
  })

  test('should not process if no valid rows', async ({ page }) => {
    await test.step('Validate Cannot Process Invalid Rows', async () => {
      // Add a row but don't fill required fields
      await page.locator('button:has-text("Add Row")').first().click()

      // Only fill name (missing email and company)
      const firstRow = page.locator('tbody tr').first()
      await firstRow.locator('input[placeholder="Full Name"]').fill('Incomplete')

      await page.waitForTimeout(300)

      // Process button should be disabled
      const processButton = page.locator('button:has-text("Process")')
      await expect(processButton).toBeDisabled()
    })
  })

  test('should handle mixed valid and invalid rows', async ({ page }) => {
    await test.step('Process Only Valid Rows', async () => {
      // Add 3 rows
      await page.locator('button:has-text("Add Row")').first().click()
      await page.locator('button:has-text("Add Row")').first().click()
      await page.locator('button:has-text("Add Row")').first().click()

      // Fill first row (valid)
      const firstRow = page.locator('tbody tr').nth(0)
      await firstRow.locator('input[placeholder="Full Name"]').fill('Valid One')
      await firstRow.locator('input[placeholder*="email"]').fill('valid1@test.com')
      await firstRow.locator('input[placeholder="Company Name"]').fill('Valid Co 1')

      // Fill second row (invalid - no email)
      const secondRow = page.locator('tbody tr').nth(1)
      await secondRow.locator('input[placeholder="Full Name"]').fill('Invalid One')
      await secondRow.locator('input[placeholder="Company Name"]').fill('Invalid Co')

      // Fill third row (valid)
      const thirdRow = page.locator('tbody tr').nth(2)
      await thirdRow.locator('input[placeholder="Full Name"]').fill('Valid Two')
      await thirdRow.locator('input[placeholder*="email"]').fill('valid2@test.com')
      await thirdRow.locator('input[placeholder="Company Name"]').fill('Valid Co 2')

      await page.waitForTimeout(500)

      // Should show 3 total, 2 valid, 1 invalid
      await expect(page.locator('text=/Total Rows.*3/i')).toBeVisible()
      await expect(page.locator('text=/Valid.*2/i')).toBeVisible()
      await expect(page.locator('text=/Needs Review.*1/i')).toBeVisible()

      // Process button should show "Process 2 Valid Rows"
      const processButton = page.locator('button:has-text("Process 2 Valid Rows")')
      await expect(processButton).toBeVisible()
      await expect(processButton).toBeEnabled()

      // Validation issues section should show the invalid row
      await expect(page.locator('text=/Validation Issues.*1 rows/i')).toBeVisible()
      await expect(page.locator('text=/Email is required/i')).toBeVisible()
    })
  })

  test('should display help section', async ({ page }) => {
    await test.step('Verify Help Section', async () => {
      // Help section should always be visible
      await expect(page.locator('text=Tips for Manual Entry')).toBeVisible()

      // Check for key help items
      await expect(page.locator('text=/Fields marked with.*required/i')).toBeVisible()
      await expect(page.locator('text=/Email addresses must be in valid format/i')).toBeVisible()
      await expect(page.locator('text=/All rows must pass validation/i')).toBeVisible()
    })
  })

  test('should validate email format correctly', async ({ page }) => {
    await test.step('Test Email Validation', async () => {
      await page.locator('button:has-text("Add Row")').first().click()

      const firstRow = page.locator('tbody tr').first()
      await firstRow.locator('input[placeholder="Full Name"]').fill('Email Test')
      await firstRow.locator('input[placeholder="Company Name"]').fill('Test Co')

      const emailInput = firstRow.locator('input[placeholder*="email"]')

      // Test invalid formats
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test @example.com',
        'test@example',
      ]

      for (const email of invalidEmails) {
        await emailInput.fill(email)
        await page.waitForTimeout(300)
        await expect(page.locator('text=/Email format is invalid/i')).toBeVisible()
      }

      // Test valid format
      await emailInput.fill('valid@example.com')
      await page.waitForTimeout(300)

      // Should now be valid
      await expect(page.locator('text=/Valid.*1/i')).toBeVisible({ timeout: 2000 })
    })
  })

  test('should handle rapid row additions', async ({ page }) => {
    await test.step('Add Multiple Rows Quickly', async () => {
      const addButton = page.locator('button:has-text("Add Row")').first()

      // Add 5 rows rapidly
      for (let i = 0; i < 5; i++) {
        await addButton.click()
        await page.waitForTimeout(100)
      }

      // Should have 5 rows
      await expect(page.locator('tbody tr')).toHaveCount(5)
      await expect(page.locator('text=/Total Rows.*5/i')).toBeVisible()

      // All should be invalid initially
      await expect(page.locator('text=/Needs Review.*5/i')).toBeVisible()
    })
  })
})
