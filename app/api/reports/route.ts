/**
 * Reports API Route
 *
 * GET /api/reports - Get all reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports
 * Get all generated reports with tier statistics
 */
export async function GET(request: NextRequest) {
  try {
    const storage = await getActiveStorageAdapter()

    // Get all reports
    const reports = await storage.getAllReports()

    // Transform to ReportSummary format expected by frontend
    const reportSummaries = reports.map((report) => ({
      id: report.id,
      eventId: report.eventId,
      name: report.name,
      generatedAt: report.generatedAt.toISOString(),
      totalScans: report.statistics.totalScans,
      hotCount: report.statistics.hotCount,
      warmCount: report.statistics.warmCount,
      coldCount: report.statistics.coldCount,
      unscoredCount: report.statistics.unscoredCount,
    }))

    return successResponse(reportSummaries)
  } catch (error) {
    console.error('[Reports API] Error:', error)

    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return errorResponse(error)
    }

    // Otherwise wrap it in a new AppError
    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to fetch reports: ${errorMessage}`,
        'REPORTS_FETCH_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}
