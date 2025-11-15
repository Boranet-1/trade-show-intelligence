import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E Test: Dashboard Workflow
 *
 * Tests the complete end-to-end workflow:
 * 1. Event setup
 * 2. CSV upload
 * 3. Column mapping
 * 4. Batch enrichment with progress tracking
 * 5. Completion and report access
 */

test.describe('Dashboard Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveTitle(/Trade Show Intelligence/)
  })

  test('should complete full dashboard workflow', async ({ page }) => {
    // Step 1: Event Setup
    await test.step('Event Setup', async () => {
      // Fill event details
      await page.fill('input[name="eventName"]', 'Test Trade Show 2024')
      await page.fill('input[name="eventId"]', `test-event-${Date.now()}`)
      await page.fill('input[name="eventDate"]', '2024-12-01')
      await page.fill('input[name="eventLocation"]', 'Las Vegas, NV')

      // Click next
      await page.click('button:has-text("Next")')

      // Verify moved to upload step
      await expect(page.locator('text=Upload Badge Scans')).toBeVisible()
    })

    // Step 2: CSV Upload
    await test.step('CSV Upload', async () => {
      // Create test CSV file
      const csvContent = [
        'First Name,Last Name,Email,Company,Job Title,Phone',
        'John,Doe,john@techcorp.com,TechCorp Solutions,CTO,555-1234',
        'Jane,Smith,jane@innovate.com,Innovate Inc,VP Engineering,555-5678',
        'Bob,Johnson,bob@startup.com,StartupX,Founder,555-9012',
      ].join('\n')

      // Create a file input and upload
      const fileInput = await page.locator('input[type="file"]')

      // Create a temporary file
      const testFilePath = path.join(process.cwd(), '__tests__', 'fixtures', 'test-scans.csv')
      await page.setInputFiles('input[type="file"]', {
        name: 'test-scans.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      })

      // Wait for file to be processed
      await expect(page.locator('text=3 rows detected')).toBeVisible({ timeout: 10000 })

      // Click next
      await page.click('button:has-text("Next")')

      // Verify moved to mapping step
      await expect(page.locator('text=Map CSV Columns')).toBeVisible()
    })

    // Step 3: Column Mapping
    await test.step('Column Mapping', async () => {
      // Verify auto-mapping detected
      await expect(page.locator('text=Auto-mapped 6 columns')).toBeVisible()

      // Verify required fields are mapped
      const firstNameSelect = page.locator('select[data-field="firstName"]')
      await expect(firstNameSelect).toHaveValue('First Name')

      const lastNameSelect = page.locator('select[data-field="lastName"]')
      await expect(lastNameSelect).toHaveValue('Last Name')

      const emailSelect = page.locator('select[data-field="email"]')
      await expect(emailSelect).toHaveValue('Email')

      const companySelect = page.locator('select[data-field="company"]')
      await expect(companySelect).toHaveValue('Company')

      // Click next
      await page.click('button:has-text("Start Enrichment")')

      // Verify moved to enrichment step
      await expect(page.locator('text=Batch Enrichment')).toBeVisible()
    })

    // Step 4: Batch Enrichment
    await test.step('Batch Enrichment with Progress', async () => {
      // Verify enrichment started
      await expect(page.locator('text=Enriching badge scans')).toBeVisible()

      // Verify progress bar appears
      await expect(page.locator('[role="progressbar"]')).toBeVisible()

      // Wait for progress updates (should show 0/3, then 1/3, 2/3, 3/3)
      await expect(page.locator('text=/Enriched \\d+\\/3/')).toBeVisible({ timeout: 30000 })

      // Wait for completion (with generous timeout for API calls)
      await expect(page.locator('text=Enrichment Complete!')).toBeVisible({
        timeout: 120000, // 2 minutes for enrichment to complete
      })

      // Verify all scans were processed
      await expect(page.locator('text=3/3 scans enriched')).toBeVisible()
    })

    // Step 5: Completion and Reports
    await test.step('Completion and Reports Access', async () => {
      // Verify completion message
      await expect(page.locator('text=All badge scans have been enriched')).toBeVisible()

      // Verify markdown downloads section appears
      await expect(page.locator('text=Markdown Reports')).toBeVisible()

      // Verify report types are listed
      await expect(page.locator('text=CRO Summary')).toBeVisible()
      await expect(page.locator('text=Company Summary')).toBeVisible()
      await expect(page.locator('text=Contact Summary')).toBeVisible()

      // Verify download buttons exist
      const downloadButtons = page.locator('button:has-text("Download")')
      await expect(downloadButtons.first()).toBeVisible()

      // Verify can navigate to reports
      const viewReportsButton = page.locator('button:has-text("View Reports")')
      if (await viewReportsButton.isVisible()) {
        await viewReportsButton.click()
        await expect(page).toHaveURL(/\/reports/)
      }
    })
  })

  test('should validate required fields in event setup', async ({ page }) => {
    await test.step('Validate Event Name Required', async () => {
      // Try to proceed without filling event name
      await page.fill('input[name="eventId"]', 'test-event')
      await page.click('button:has-text("Next")')

      // Should show validation error
      await expect(page.locator('text=/Event name.*required/i')).toBeVisible()
    })
  })

  test('should show error for invalid CSV format', async ({ page }) => {
    // Navigate to upload step
    await page.fill('input[name="eventName"]', 'Test Event')
    await page.fill('input[name="eventId"]', 'test-event')
    await page.click('button:has-text("Next")')

    await test.step('Invalid CSV Upload', async () => {
      // Upload invalid CSV (missing required columns)
      const invalidCsvContent = 'Name,Email\nJohn,john@test.com'

      await page.setInputFiles('input[type="file"]', {
        name: 'invalid.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(invalidCsvContent),
      })

      // Should show error about missing required columns
      await expect(
        page.locator('text=/Missing required.*company/i')
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test('should allow column remapping if auto-mapping is incorrect', async ({ page }) => {
    // Navigate to mapping step
    await page.fill('input[name="eventName"]', 'Test Event')
    await page.fill('input[name="eventId"]', 'test-event')
    await page.click('button:has-text("Next")')

    // Upload CSV
    const csvContent = 'Name,EmailAddress,Organization\nJohn,john@test.com,TechCorp'
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await page.click('button:has-text("Next")')

    await test.step('Manual Column Mapping', async () => {
      // Map "Name" to firstName
      await page.selectOption('select[data-field="firstName"]', 'Name')

      // Map "EmailAddress" to email
      await page.selectOption('select[data-field="email"]', 'EmailAddress')

      // Map "Organization" to company
      await page.selectOption('select[data-field="company"]', 'Organization')

      // Verify mapping is valid
      await expect(page.locator('button:has-text("Start Enrichment")')).toBeEnabled()
    })
  })
})
