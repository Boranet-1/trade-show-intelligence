/**
 * Duplicate Comparison API Route
 *
 * Returns side-by-side comparison data for duplicate badge scans
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/badge-scans/duplicate-comparison?scanIds=id1,id2,id3
 * Get side-by-side comparison of duplicate badge scans
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scanIdsParam = searchParams.get('scanIds')

    if (!scanIdsParam) {
      return errorResponse(
        new AppError('Scan IDs are required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing scanIds query parameter',
          howToFix: 'Provide comma-separated scan IDs in the scanIds parameter',
          exampleFormat: '/api/badge-scans/duplicate-comparison?scanIds=id1,id2',
        })
      )
    }

    const scanIds = scanIdsParam.split(',')
    if (scanIds.length < 2) {
      return errorResponse(
        new AppError('At least 2 scan IDs required for comparison', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Insufficient scan IDs provided',
          howToFix: 'Provide at least 2 comma-separated scan IDs',
          exampleFormat: '/api/badge-scans/duplicate-comparison?scanIds=id1,id2',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Fetch all scans
    const scans = await Promise.all(scanIds.map((id) => storage.getBadgeScan(id)))

    // Filter out nulls
    const validScans = scans.filter((s) => s !== null)

    if (validScans.length === 0) {
      return errorResponse(
        new AppError('No valid scans found', 'NOT_FOUND', 404, {
          whatFailed: 'None of the provided scan IDs exist',
          howToFix: 'Verify the scan IDs are correct',
        })
      )
    }

    // Get enrichment data for each scan
    const comparisons = await Promise.all(
      validScans.map(async (scan) => {
        const enriched = await storage.getEnrichedCompany(scan.id)
        const match = await storage.getBestPersonaMatch(scan.id)

        return {
          scan: {
            id: scan.id,
            firstName: scan.firstName,
            lastName: scan.lastName,
            email: scan.email,
            company: scan.company,
            jobTitle: scan.jobTitle,
            phone: scan.phone,
            boothLocation: scan.boothLocation,
            scannedAt: scan.scannedAt.toISOString(),
            eventName: scan.eventName,
            enrichmentStatus: scan.enrichmentStatus,
            notes: scan.notes,
          },
          enriched: enriched
            ? {
                companyName: enriched.companyName,
                domain: enriched.domain,
                industry: enriched.industry,
                employeeCount: enriched.employeeCount,
                revenueRange: enriched.revenueRange,
                headquarters: enriched.headquarters,
                techStack: enriched.techStack,
                dataSource: enriched.dataSource,
              }
            : null,
          personaMatch: match
            ? {
                tier: match.tier,
                fitScore: match.fitScore,
                personaId: match.personaId,
                actionableInsights: match.actionableInsights,
              }
            : null,
        }
      })
    )

    // Identify differences
    const differences = {
      basicInfo: [] as string[],
      enrichment: [] as string[],
      scoring: [] as string[],
    }

    // Compare basic info
    const emails = new Set(comparisons.map((c) => c.scan.email))
    const companies = new Set(comparisons.map((c) => c.scan.company))
    const names = new Set(
      comparisons.map((c) => `${c.scan.firstName || ''} ${c.scan.lastName || ''}`.trim())
    )
    const jobTitles = new Set(comparisons.map((c) => c.scan.jobTitle))

    if (emails.size > 1) differences.basicInfo.push('Different email addresses')
    if (companies.size > 1) differences.basicInfo.push('Different company names')
    if (names.size > 1) differences.basicInfo.push('Different contact names')
    if (jobTitles.size > 1) differences.basicInfo.push('Different job titles')

    // Compare enrichment
    const industries = new Set(comparisons.map((c) => c.enriched?.industry).filter(Boolean))
    const employeeCounts = new Set(comparisons.map((c) => c.enriched?.employeeCount).filter(Boolean))

    if (industries.size > 1) differences.enrichment.push('Different industries identified')
    if (employeeCounts.size > 1) differences.enrichment.push('Different employee counts')

    // Compare scoring
    const tiers = new Set(comparisons.map((c) => c.personaMatch?.tier).filter(Boolean))
    const fitScores = new Set(comparisons.map((c) => c.personaMatch?.fitScore).filter(Boolean))

    if (tiers.size > 1) differences.scoring.push('Different tier assignments')
    if (fitScores.size > 1) differences.scoring.push('Different fit scores')

    // Recommend which scan to keep (most recent with most complete data)
    const recommendedScanId = comparisons.reduce((best, current) => {
      const currentCompleteness =
        (current.scan.firstName ? 1 : 0) +
        (current.scan.lastName ? 1 : 0) +
        (current.scan.email ? 1 : 0) +
        (current.scan.phone ? 1 : 0) +
        (current.enriched ? 5 : 0) +
        (current.personaMatch ? 3 : 0)

      const bestCompleteness =
        (best.scan.firstName ? 1 : 0) +
        (best.scan.lastName ? 1 : 0) +
        (best.scan.email ? 1 : 0) +
        (best.scan.phone ? 1 : 0) +
        (best.enriched ? 5 : 0) +
        (best.personaMatch ? 3 : 0)

      if (currentCompleteness > bestCompleteness) {
        return current
      }
      if (currentCompleteness === bestCompleteness) {
        // Prefer most recent scan
        return new Date(current.scan.scannedAt) > new Date(best.scan.scannedAt) ? current : best
      }
      return best
    }).scan.id

    return successResponse({
      scans: comparisons,
      differences,
      recommendedScanId,
      totalDuplicates: comparisons.length,
    })
  } catch (error) {
    console.error('[Duplicate Comparison API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to fetch duplicate comparison: ${errorMessage}`,
        'COMPARISON_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}
