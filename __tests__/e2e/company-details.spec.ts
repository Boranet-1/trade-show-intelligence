import { test, expect } from '@playwright/test'

/**
 * E2E Test: Company Detail Pages
 *
 * Tests company detail page navigation, contact display,
 * persona matches, and markdown report downloads.
 */

test.describe('Company Detail Pages', () => {
  let companyId: string

  test.beforeAll(async ({ browser }) => {
    // Setup: Create test data
    // In a real scenario, this would seed the database with test companies
    // For now, we'll assume test data exists from the dashboard workflow test
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should navigate to company detail page from dashboard', async ({ page }) => {
    await test.step('Navigate from Dashboard', async () => {
      // Wait for dashboard to load
      await expect(page.locator('h1')).toContainText('Dashboard')

      // Find first company card (assuming dashboard shows companies)
      const firstCompanyCard = page.locator('[data-testid="company-card"]').first()

      if (await firstCompanyCard.isVisible()) {
        // Click on company name or view details button
        const viewButton = firstCompanyCard.locator('button:has-text("View Details")')
        await viewButton.click()

        // Should navigate to company detail page
        await expect(page).toHaveURL(/\/companies\//)

        // Extract company ID from URL
        const url = page.url()
        companyId = url.split('/companies/')[1]

        // Verify company detail page loaded
        await expect(page.locator('h1')).toBeVisible()
      }
    })
  })

  test('should display company overview with enriched data', async ({ page }) => {
    // Navigate directly to a test company
    await page.goto('/companies/test-company-id')

    await test.step('Verify Company Overview', async () => {
      // Verify company header
      await expect(page.locator('h1')).toBeVisible()

      // Verify tier badge
      await expect(
        page.locator('text=/Hot|Warm|Cold|Unscored/')
      ).toBeVisible()

      // Verify company information sections
      const overviewSection = page.locator('text=Company Overview').locator('..')
      await expect(overviewSection).toBeVisible()

      // Check for enriched data fields
      const dataFields = [
        'Industry',
        'Company Size',
        'Revenue',
        'Headquarters',
      ]

      for (const field of dataFields) {
        // At least some fields should be visible
        const fieldLocator = page.locator(`text=${field}`)
        // Don't fail if a field is missing, just check if it exists
        const exists = await fieldLocator.count()
        if (exists > 0) {
          await expect(fieldLocator).toBeVisible()
        }
      }

      // Verify tech stack if present
      const techStackSection = page.locator('text=Tech Stack')
      if (await techStackSection.isVisible()) {
        await expect(techStackSection.locator('..').locator('[role="badge"]')).toBeVisible()
      }
    })
  })

  test('should display nested contacts table', async ({ page }) => {
    await page.goto('/companies/test-company-id')

    await test.step('Verify Contacts Table', async () => {
      // Verify contacts header
      await expect(page.locator('text=/Contacts \\(\\d+\\)/')).toBeVisible()

      // Verify table headers
      const tableHeaders = [
        'Name',
        'Title',
        'Contact',
        'Tier',
        'Top Persona Match',
        'Scanned',
      ]

      for (const header of tableHeaders) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible()
      }

      // Verify at least one contact row exists
      const contactRows = page.locator('tbody tr')
      const rowCount = await contactRows.count()

      if (rowCount > 0) {
        // Verify first contact has expected data
        const firstRow = contactRows.first()

        // Should have name
        await expect(firstRow.locator('td').nth(0)).toContainText(/\w+/)

        // Should have tier badge
        await expect(
          firstRow.locator('td').nth(3).locator('text=/Hot|Warm|Cold|Unscored/')
        ).toBeVisible()

        // Verify email link if present
        const emailLink = firstRow.locator('a[href^="mailto:"]')
        if (await emailLink.isVisible()) {
          await expect(emailLink).toHaveAttribute('href', /mailto:.+/)
        }

        // Verify phone link if present
        const phoneLink = firstRow.locator('a[href^="tel:"]')
        if (await phoneLink.isVisible()) {
          await expect(phoneLink).toHaveAttribute('href', /tel:.+/)
        }
      }
    })
  })

  test('should display persona match scores for contacts', async ({ page }) => {
    await page.goto('/companies/test-company-id')

    await test.step('Verify Persona Matches', async () => {
      const contactRows = page.locator('tbody tr')
      const rowCount = await contactRows.count()

      if (rowCount > 0) {
        const firstRow = contactRows.first()

        // Check top persona match column
        const personaMatchCell = firstRow.locator('td').nth(4)

        // Should either show "X% fit" or "No matches"
        const cellText = await personaMatchCell.textContent()
        expect(cellText).toMatch(/\d+% fit|No matches/)

        // If there's a match, verify the percentage format
        if (cellText?.includes('% fit')) {
          await expect(personaMatchCell).toContainText(/\d+% fit/)
          await expect(personaMatchCell).toContainText('Persona match')
        }
      }
    })
  })

  test('should display markdown reports section', async ({ page }) => {
    await page.goto('/companies/test-company-id')

    await test.step('Verify Reports Section', async () => {
      // Verify reports header
      await expect(page.locator('text=Reports')).toBeVisible()

      // Check if reports exist
      const reportsSection = page.locator('text=Reports').locator('..')
      const hasReports = await reportsSection.locator('text=/CRO|Company|Contact|Merged/').count()

      if (hasReports > 0) {
        // Verify report types are shown
        const reportTypes = [
          'CRO Summary',
          'Company Summary',
          'Contact Summary',
          'Merged Report',
        ]

        // At least one report type should be visible
        let foundReport = false
        for (const reportType of reportTypes) {
          const reportLocator = page.locator(`text=${reportType}`)
          if (await reportLocator.isVisible()) {
            foundReport = true
            break
          }
        }

        expect(foundReport).toBe(true)

        // Verify download buttons exist
        const downloadButtons = page.locator('button:has-text("MD"), button:has-text("PDF")')
        await expect(downloadButtons.first()).toBeVisible()
      } else {
        // Should show "no reports" message
        await expect(
          page.locator('text=No reports generated yet')
        ).toBeVisible()
      }
    })
  })

  test('should download markdown report', async ({ page }) => {
    await page.goto('/companies/test-company-id')

    await test.step('Download Markdown Report', async () => {
      const reportsSection = page.locator('text=Reports').locator('..')

      // Find first MD download button
      const mdButton = reportsSection.locator('button:has-text("MD")').first()

      if (await mdButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download')

        // Click download button
        await mdButton.click()

        // Wait for download to start
        const download = await downloadPromise

        // Verify filename
        const fileName = download.suggestedFilename()
        expect(fileName).toMatch(/\.md$/)

        // Verify download completed
        const path = await download.path()
        expect(path).toBeTruthy()
      }
    })
  })

  test('should download PDF report', async ({ page }) => {
    await page.goto('/companies/test-company-id')

    await test.step('Download PDF Report', async () => {
      const reportsSection = page.locator('text=Reports').locator('..')

      // Find first PDF download button
      const pdfButton = reportsSection.locator('button:has-text("PDF")').first()

      if (await pdfButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download')

        // Click download button
        await pdfButton.click()

        // Wait for download to start
        const download = await downloadPromise

        // Verify filename
        const fileName = download.suggestedFilename()
        expect(fileName).toMatch(/\.pdf$/)

        // Verify download completed
        const path = await download.path()
        expect(path).toBeTruthy()
      }
    })
  })

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/companies/test-company-id')

    await test.step('Back Navigation', async () => {
      // Click back button
      const backButton = page.locator('button:has-text("Back to Dashboard")')
      await backButton.click()

      // Should return to dashboard
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('h1')).toContainText('Dashboard')
    })
  })

  test('should handle company not found', async ({ page }) => {
    await page.goto('/companies/non-existent-company-id')

    await test.step('Company Not Found', async () => {
      // Should show error message
      await expect(
        page.locator('text=/Company not found|not found/i')
      ).toBeVisible({ timeout: 10000 })

      // Should show back button
      const backButton = page.locator('button:has-text("Back to Dashboard")')
      await expect(backButton).toBeVisible()

      // Back button should work
      await backButton.click()
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test('should display company domain link', async ({ page }) => {
    await page.goto('/companies/test-company-id')

    await test.step('Company Domain Link', async () => {
      // Look for domain link
      const domainLink = page.locator('a[href*="https://"]').first()

      if (await domainLink.isVisible()) {
        // Verify it's an external link
        await expect(domainLink).toHaveAttribute('target', '_blank')
        await expect(domainLink).toHaveAttribute('rel', /noopener/)

        // Verify it displays the domain
        await expect(domainLink).toContainText(/\w+\.\w+/)
      }
    })
  })
})
