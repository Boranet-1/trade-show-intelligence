/**
 * Markdown Report Download API
 * Handles downloading markdown reports by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/[reportId]/download/markdown
 * Download markdown report by ID
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
          exampleFormat: '/api/reports/[reportId]/download/markdown',
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
          exampleFormat: '/api/reports/[valid-report-uuid]/download/markdown',
        })
      )
    }

    // Generate filename based on report type
    const filename = generateFilename(report)

    return new NextResponse(report.markdownContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[Markdown Download API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to download markdown report: ${errorMessage}`,
        'DOWNLOAD_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

function generateFilename(report: any): string {
  const timestamp = new Date(report.generatedAt).toISOString().split('T')[0]

  switch (report.reportType) {
    case 'CROSummary':
      return `CRO_Summary_${timestamp}.md`
    case 'CompanySummary':
      return `${report.metadata?.companyName?.replace(/[^a-z0-9]/gi, '_') || 'Company'}_Summary_${timestamp}.md`
    case 'ContactSummary':
      return `${report.metadata?.contactName?.replace(/[^a-z0-9]/gi, '_') || 'Contact'}_Summary_${timestamp}.md`
    case 'MergedReport':
      return `${report.metadata?.companyName?.replace(/[^a-z0-9]/gi, '_') || 'Merged'}_Report_${timestamp}.md`
    default:
      return `Report_${timestamp}.md`
  }
}
