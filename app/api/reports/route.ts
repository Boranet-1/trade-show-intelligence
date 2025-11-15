/**
 * Reports API Route
 *
 * GET /api/reports - Get all reports
 * POST /api/reports - Generate a new report
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import type { ReportFilters } from '@/lib/types'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Request validation schema
const generateReportSchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  name: z.string().min(1, 'Report name is required'),
  filters: z
    .object({
      tiers: z.array(z.enum(['Hot', 'Warm', 'Cold', 'Unscored'])).optional(),
      industries: z.array(z.string()).optional(),
      employeeRanges: z.array(z.string()).optional(),
      revenueRanges: z.array(z.string()).optional(),
      technologies: z.array(z.string()).optional(),
      personas: z.array(z.string()).optional(),
      searchQuery: z.string().optional(),
    })
    .optional(),
})

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

/**
 * POST /api/reports
 * Generate a new report with optional filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = generateReportSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        new AppError(
          'Invalid request body',
          'VALIDATION_ERROR',
          400,
          {
            whatFailed: 'Request validation failed',
            howToFix: 'Ensure eventId is a valid UUID and name is provided',
            exampleFormat: JSON.stringify({
              eventId: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Trade Show 2024 Report',
              filters: { tiers: ['Hot', 'Warm'] },
            }),
            validationErrors: validationResult.error.issues,
          }
        )
      )
    }

    const { eventId, name, filters } = validationResult.data

    const storage = await getActiveStorageAdapter()

    // Generate the report
    const report = await storage.generateReport(eventId, filters as any)

    // Update report name
    const updatedReport = {
      ...report,
      name,
    }

    // Save the report
    const reportId = await storage.saveReport(updatedReport)

    // Return the generated report with ID
    return successResponse(
      {
        ...updatedReport,
        id: reportId,
        generatedAt: updatedReport.generatedAt.toISOString(),
      },
      'Report generated successfully'
    )
  } catch (error) {
    console.error('[Reports API] POST Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to generate report: ${errorMessage}`,
        'REPORT_GENERATION_ERROR',
        500,
        {
          whatFailed: 'Report generation failed',
          howToFix: 'Verify that the event exists and contains enriched badge scans',
          originalError: error,
        }
      )
    )
  }
}
