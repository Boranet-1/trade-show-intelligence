/**
 * Report Export API Route
 *
 * Handles CSV, PDF, CRO_summary.md, and company reports export formats
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import { exportEnrichedLeadsToCSV, generateCSVFilename } from '@/lib/export/csv-exporter'
import { exportReportToPDF, generatePDFFilename } from '@/lib/export/pdf-exporter'
import { generateCROSummary } from '@/lib/export/cro-summary-generator'
import { generateCompanyReport } from '@/lib/export/company-report-generator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/[reportId]/export?format=csv|pdf|cro_summary|company_reports
 * Export report in specified format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    if (!reportId) {
      return errorResponse(
        new AppError('Report ID is required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing report ID in request',
          howToFix: 'Provide a valid report ID in the URL path',
          exampleFormat: '/api/reports/[reportId]/export?format=csv',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get report and validate it exists
    const report = await storage.getReport(reportId)
    if (!report) {
      return errorResponse(
        new AppError(`Report not found: ${reportId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Report does not exist',
          howToFix: 'Verify the report ID and ensure the report has been generated',
          exampleFormat: '/api/reports/[valid-report-uuid]/export?format=csv',
        })
      )
    }

    // Get event
    const event = await storage.getEvent(report.eventId)
    if (!event) {
      throw new AppError('Event not found for report', 'NOT_FOUND', 404)
    }

    // Get all badge scans for the report
    const badgeScans = await Promise.all(
      report.badgeScanIds.map((id) => storage.getBadgeScan(id))
    )
    const validScans = badgeScans.filter((s) => s !== null)

    // Get enriched companies and persona matches
    const enrichedCompaniesMap = new Map()
    const personaMatchesMap = new Map()

    for (const scan of validScans) {
      const enriched = await storage.getEnrichedCompany(scan.id)
      if (enriched) {
        enrichedCompaniesMap.set(scan.id, enriched)
      }

      const match = await storage.getBestPersonaMatch(scan.id)
      if (match) {
        personaMatchesMap.set(scan.id, match)
      }
    }

    // Handle different export formats
    switch (format.toLowerCase()) {
      case 'csv': {
        const csvContent = exportEnrichedLeadsToCSV(
          validScans,
          enrichedCompaniesMap,
          personaMatchesMap
        )

        const filename = generateCSVFilename(report.name)

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      case 'pdf': {
        try {
          const pdfBuffer = await exportReportToPDF(
            report,
            validScans,
            enrichedCompaniesMap,
            personaMatchesMap
          )

          const filename = generatePDFFilename(report.name)

          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          })
        } catch (error) {
          if (error instanceof Error && error.message.includes('Cannot find module')) {
            return errorResponse(
              new AppError(
                'PDF export requires Puppeteer to be installed',
                'DEPENDENCY_MISSING',
                500,
                {
                  whatFailed: 'Puppeteer dependency not installed',
                  howToFix: 'Run: npm install puppeteer',
                  details: error.message,
                }
              )
            )
          }
          throw error
        }
      }

      case 'cro_summary': {
        const summaryContent = await generateCROSummary(
          event,
          report,
          validScans,
          enrichedCompaniesMap,
          personaMatchesMap
        )

        const filename = `CRO_Summary_${report.name.replace(/[^a-z0-9]/gi, '_')}.md`

        return new NextResponse(summaryContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      case 'company_reports': {
        // Generate all company reports as a ZIP archive would be ideal
        // For now, return a JSON array of company reports
        const companyReports = await Promise.all(
          validScans.map(async (scan) => {
            const enriched = enrichedCompaniesMap.get(scan.id)
            const match = personaMatchesMap.get(scan.id)
            const reportContent = await generateCompanyReport(event, scan, enriched, match)
            return {
              companyName: scan.company,
              filename: `${scan.company.replace(/[^a-z0-9]/gi, '_')}.md`,
              content: reportContent,
            }
          })
        )

        // Return as JSON for now (client can download individual files)
        return NextResponse.json({
          success: true,
          data: {
            reports: companyReports,
            total: companyReports.length,
          },
        })
      }

      default:
        return errorResponse(
          new AppError(`Unsupported export format: ${format}`, 'VALIDATION_ERROR', 400, {
            whatFailed: `Invalid format parameter: ${format}`,
            howToFix: 'Use one of the supported formats: csv, pdf, cro_summary, company_reports',
            exampleFormat: '/api/reports/[reportId]/export?format=csv',
          })
        )
    }
  } catch (error) {
    console.error('[Report Export API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to export report: ${errorMessage}`,
        'EXPORT_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}
