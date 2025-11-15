/**
 * PDF Download API for Markdown Reports
 * Converts markdown reports to PDF and serves them
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import { exportMarkdownToPDF } from '@/lib/export/pdf-exporter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/[reportId]/download/pdf
 * Download markdown report as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params

    if (!reportId) {
      return errorResponse(
        new AppError('Report ID is required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing report ID in request',
          howToFix: 'Provide a valid report ID in the URL path',
          exampleFormat: '/api/reports/[reportId]/download/pdf',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get markdown report
    const report = await storage.getMarkdownReport(reportId)
    if (!report) {
      return errorResponse(
        new AppError(`Markdown report not found: ${reportId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Markdown report does not exist',
          howToFix: 'Verify the report ID and ensure the markdown report has been generated',
          exampleFormat: '/api/reports/[valid-report-uuid]/download/pdf',
        })
      )
    }

    // Convert markdown to PDF
    const pdfBuffer = await exportMarkdownToPDF(
      report.markdownContent,
      report.metadata?.companyName || 'Report'
    )

    // Generate filename
    const filename = generatePDFFilename(report)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[PDF Download API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    // Handle Puppeteer not installed error
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      return errorResponse(
        new AppError('PDF generation requires Puppeteer', 'DEPENDENCY_MISSING', 500, {
          whatFailed: 'Puppeteer dependency not installed',
          howToFix: 'Run: npm install puppeteer',
          exampleFormat: 'Install Puppeteer to enable PDF generation',
        })
      )
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to generate PDF: ${errorMessage}`,
        'PDF_GENERATION_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

function generatePDFFilename(report: any): string {
  const timestamp = new Date(report.generatedAt).toISOString().split('T')[0]

  switch (report.reportType) {
    case 'CROSummary':
      return `CRO_Summary_${timestamp}.pdf`
    case 'CompanySummary':
      return `${report.metadata?.companyName?.replace(/[^a-z0-9]/gi, '_') || 'Company'}_Summary_${timestamp}.pdf`
    case 'ContactSummary':
      return `${report.metadata?.contactName?.replace(/[^a-z0-9]/gi, '_') || 'Contact'}_Summary_${timestamp}.pdf`
    case 'MergedReport':
      return `${report.metadata?.companyName?.replace(/[^a-z0-9]/gi, '_') || 'Merged'}_Report_${timestamp}.pdf`
    default:
      return `Report_${timestamp}.pdf`
  }
}
