/**
 * Event Markdown Reports API
 * Lists and bulk downloads markdown reports for an event
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import { ReportType } from '@/lib/types'
import archiver from 'archiver'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

/**
 * GET /api/events/[eventId]/markdown?type=CROSummary|CompanySummary|ContactSummary|MergedReport
 * List all markdown reports for an event (optionally filtered by type)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { searchParams } = new URL(request.url)
    const reportTypeParam = searchParams.get('type') as ReportType | null

    if (!eventId) {
      return errorResponse(
        new AppError('Event ID is required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing event ID in request',
          howToFix: 'Provide a valid event ID in the URL path',
          exampleFormat: '/api/events/[eventId]/markdown',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get event
    const event = await storage.getEvent(eventId)
    if (!event) {
      return errorResponse(
        new AppError(`Event not found: ${eventId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Event does not exist',
          howToFix: 'Verify the event ID',
          exampleFormat: '/api/events/[valid-event-id]/markdown',
        })
      )
    }

    // Get markdown reports
    const reports = await storage.getAllMarkdownReports(eventId, reportTypeParam || undefined)

    return NextResponse.json({
      success: true,
      data: {
        eventId,
        eventName: event.name,
        totalReports: reports.length,
        reportsByType: {
          CROSummary: reports.filter((r) => r.reportType === 'CROSummary').length,
          CompanySummary: reports.filter((r) => r.reportType === 'CompanySummary').length,
          ContactSummary: reports.filter((r) => r.reportType === 'ContactSummary').length,
          MergedReport: reports.filter((r) => r.reportType === 'MergedReport').length,
        },
        reports: reports.map((r) => ({
          id: r.id,
          reportType: r.reportType,
          badgeScanId: r.badgeScanId,
          generatedAt: r.generatedAt,
          version: r.version,
          metadata: r.metadata,
          downloadUrl: `/api/reports/${r.id}/download/markdown`,
        })),
      },
    })
  } catch (error) {
    console.error('[Event Markdown API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to list markdown reports: ${errorMessage}`,
        'LIST_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

/**
 * POST /api/events/[eventId]/markdown
 * Bulk download all markdown reports as ZIP archive
 * Body: { type?: 'CROSummary' | 'CompanySummary' | 'ContactSummary' | 'MergedReport' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json().catch(() => ({}))
    const reportType = body.type as ReportType | undefined

    if (!eventId) {
      return errorResponse(
        new AppError('Event ID is required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing event ID in request',
          howToFix: 'Provide a valid event ID in the URL path',
          exampleFormat: 'POST /api/events/[eventId]/markdown',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get event
    const event = await storage.getEvent(eventId)
    if (!event) {
      return errorResponse(
        new AppError(`Event not found: ${eventId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Event does not exist',
          howToFix: 'Verify the event ID',
          exampleFormat: 'POST /api/events/[valid-event-id]/markdown',
        })
      )
    }

    // Get markdown reports
    const reports = await storage.getAllMarkdownReports(eventId, reportType)

    if (reports.length === 0) {
      return errorResponse(
        new AppError('No markdown reports found for this event', 'NOT_FOUND', 404, {
          whatFailed: 'No markdown reports available',
          howToFix: 'Generate reports first before attempting to download them',
          exampleFormat: 'Ensure reports have been generated for this event',
        })
      )
    }

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    })

    // Convert archive to readable stream
    const stream = Readable.from(archive)

    // Add files to archive
    for (const report of reports) {
      const filename = generateFilename(report)
      archive.append(report.markdownContent, { name: filename })
    }

    // Finalize archive
    archive.finalize()

    const zipFilename = `${event.name.replace(/[^a-z0-9]/gi, '_')}_Markdown_Reports.zip`

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
      },
    })
  } catch (error) {
    console.error('[Event Markdown Bulk Download API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to download markdown reports: ${errorMessage}`,
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
