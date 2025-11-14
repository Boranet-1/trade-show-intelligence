/**
 * Report Detail API Route
 *
 * GET /api/reports/[reportId] - Get specific report details
 * DELETE /api/reports/[reportId] - Delete report
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/[reportId]
 * Get detailed information for a specific report including all enriched leads
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
          exampleFormat: '/api/reports/123e4567-e89b-12d3-a456-426614174000',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get the report
    const report = await storage.getReport(reportId)

    if (!report) {
      return errorResponse(
        new AppError(`Report not found: ${reportId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Report does not exist',
          howToFix: 'Verify the report ID and ensure the report has been generated',
          exampleFormat: '/api/reports/[valid-report-uuid]',
        })
      )
    }

    // Get all badge scans for this report
    const badgeScans = await Promise.all(
      report.badgeScanIds.map(async (scanId) => {
        const scan = await storage.getBadgeScan(scanId)
        if (!scan) return null

        // Get enrichment data
        const enrichedCompany = await storage.getEnrichedCompany(scanId)

        // Get persona matches
        const personaMatches = await storage.getPersonaMatchesForScan(scanId)
        const bestMatch = personaMatches.length > 0 ? personaMatches[0] : null

        return {
          badgeScan: scan,
          enrichedCompany,
          personaMatch: bestMatch,
          tier: bestMatch?.tier || 'Unscored',
        }
      })
    )

    // Filter out nulls (scans that don't exist)
    const enrichedLeads = badgeScans.filter((lead) => lead !== null)

    // Return report with enriched leads
    return successResponse({
      id: report.id,
      eventId: report.eventId,
      name: report.name,
      filters: report.filters,
      generatedAt: report.generatedAt.toISOString(),
      statistics: report.statistics,
      leads: enrichedLeads,
      exportedFormats: report.exportedFormats,
    })
  } catch (error) {
    console.error('[Report Detail API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to fetch report details: ${errorMessage}`,
        'REPORT_DETAIL_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

/**
 * DELETE /api/reports/[reportId]
 * Delete a report by ID
 */
export async function DELETE(
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
          exampleFormat: '/api/reports/123e4567-e89b-12d3-a456-426614174000',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Check if report exists before deleting
    const report = await storage.getReport(reportId)
    if (!report) {
      return errorResponse(
        new AppError(`Report not found: ${reportId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Report does not exist',
          howToFix: 'Verify the report ID is correct',
        })
      )
    }

    // Delete the report
    await storage.deleteReport(reportId)

    return successResponse(
      { reportId, name: report.name },
      'Report deleted successfully'
    )
  } catch (error) {
    console.error('[Report Detail API] DELETE Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to delete report: ${errorMessage}`,
        'REPORT_DELETE_ERROR',
        500,
        {
          whatFailed: 'Report deletion failed',
          howToFix: 'Verify storage adapter is properly configured',
          originalError: error,
        }
      )
    )
  }
}
