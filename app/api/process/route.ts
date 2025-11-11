/**
 * Process API Route
 *
 * Processes badge scans with mock enrichment and generates reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage'
import { enrichCompany } from '@/agents/enrichment'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { EnrichmentStatus } from '@/lib/types'
import { AppError, ValidationError } from '@/lib/errors'

/**
 * POST /api/process
 * Process all badge scans and generate report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const storageType = (body.storageType as string) || 'local'

    // Get storage adapter
    const storage = await getStorageAdapter(storageType as 'local' | 'sheets')

    // Get all unprocessed badge scans
    const scans = await storage.getAllBadgeScans()

    if (scans.length === 0) {
      return errorResponse(
        new ValidationError('No badge scans found to process. Please upload badge scan CSV files first.')
      )
    }

    let enrichedCount = 0

    // Process each scan
    for (const scan of scans) {
      // Skip already enriched scans
      const existing = await storage.getEnrichedCompany(scan.id)
      if (existing) {
        enrichedCount++
        continue
      }

      try {
        // Enrich company data (mock enrichment)
        const enrichedData = await enrichCompany({
          name: `${scan.firstName || ''} ${scan.lastName || ''}`.trim() || 'Unknown',
          email: scan.email,
          company: scan.company,
          title: scan.jobTitle,
        })

        // Save enriched company
        await storage.saveEnrichedCompany({
          id: `enriched-${scan.id}`,
          badgeScanId: scan.id,
          companyName: scan.company,
          domain: enrichedData.domain,
          industry: enrichedData.industry,
          employeeRange: enrichedData.size,
          tier: enrichedData.tier,
          enrichedAt: new Date(),
        })

        // Update scan status
        await storage.updateBadgeScanStatus(scan.id, EnrichmentStatus.COMPLETED)
        enrichedCount++
      } catch (error) {
        console.error(`Failed to enrich scan ${scan.id}:`, error)
        await storage.updateBadgeScanStatus(scan.id, EnrichmentStatus.FAILED)
      }
    }

    // Generate CRO summary report
    const eventId = scans[0]?.eventId || 'default-event'
    let reportPath = 'No report generated'

    try {
      reportPath = await storage.exportToFormat(eventId, 'CRO_summary')
    } catch (error) {
      console.warn('Failed to generate report:', error)
    }

    return successResponse({
      enrichedCount,
      totalScans: scans.length,
      reportPath,
      message: `Successfully enriched ${enrichedCount} of ${scans.length} scans`,
    })
  } catch (error) {
    console.error('Process error:', error)

    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return errorResponse(error)
    }

    // Otherwise wrap it in a new AppError
    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to process badge scans: ${errorMessage}`,
        'PROCESS_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to process badge scans' }, { status: 405 })
}
