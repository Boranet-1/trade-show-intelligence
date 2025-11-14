/**
 * Manual Enrichment API Route
 *
 * POST /api/enrichment/manual
 * Saves manually-entered company data and triggers persona matching
 *
 * Constitution VII compliance: Graceful degradation when external APIs unavailable
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeStorageAdapters, getActiveStorageAdapter } from '@/lib/storage/factory'
import { calculateMultiPersonaFitScores } from '@/lib/scoring/persona-matcher'
import { calculateTier } from '@/lib/scoring/tier-calculator'
import { EnrichmentStatus } from '@/lib/types'
import type { EnrichedCompany, APISuccessResponse, APIErrorResponse } from '@/lib/types'
import { logger } from '@/lib/logger'
import { v4 as uuidv4 } from 'uuid'

interface ManualEnrichmentRequest {
  badgeScanId: string
  enrichedData: Partial<EnrichedCompany>
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<APISuccessResponse<{ enrichedCompany: EnrichedCompany }> | APIErrorResponse>> {
  try {
    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    const body: ManualEnrichmentRequest = await request.json()
    const { badgeScanId, enrichedData } = body

    // Validate required fields
    if (!badgeScanId || !enrichedData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Missing required fields: badgeScanId or enrichedData',
            howToFix: 'Provide both badgeScanId and enrichedData in the request body',
            exampleFormat: JSON.stringify({
              badgeScanId: 'uuid-here',
              enrichedData: { companyName: 'Acme Corp', industry: 'Technology' },
            }),
          },
        },
        { status: 400 }
      )
    }

    // Get the badge scan
    const badgeScan = await adapter.getBadgeScan(badgeScanId)
    if (!badgeScan) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: `Badge scan not found with ID: ${badgeScanId}`,
            howToFix: 'Verify the badge scan ID is correct and the scan exists',
            exampleFormat: 'Use a valid badge scan ID from the upload process',
          },
        },
        { status: 404 }
      )
    }

    // Create enriched company record with manual data
    const enrichedCompany: EnrichedCompany = {
      id: uuidv4(),
      badgeScanId,
      companyName: enrichedData.companyName || badgeScan.company,
      domain: enrichedData.domain,
      employeeCount: enrichedData.employeeCount,
      employeeRange: enrichedData.employeeRange,
      industry: enrichedData.industry,
      industryCodes: enrichedData.industryCodes,
      annualRevenue: enrichedData.annualRevenue,
      revenueRange: enrichedData.revenueRange,
      techStack: enrichedData.techStack,
      fundingStage: enrichedData.fundingStage,
      totalFunding: enrichedData.totalFunding,
      headquarters: enrichedData.headquarters,
      founded: enrichedData.founded,
      description: enrichedData.description,
      linkedinUrl: enrichedData.linkedinUrl,
      twitterHandle: enrichedData.twitterHandle,
      enrichedAt: new Date(),
      dataSource: ['Manual Entry'],
      consensusMetadata: {},
    }

    // Save enriched company
    await adapter.saveEnrichedCompany(enrichedCompany)

    // Update badge scan status to ENRICHED
    await adapter.updateBadgeScanStatus(badgeScanId, EnrichmentStatus.ENRICHED)

    // Get all personas for scoring
    const personas = await adapter.getAllPersonas()

    if (personas.length > 0) {
      // Calculate persona matches
      const personaMatches = calculateMultiPersonaFitScores(badgeScan, enrichedCompany, personas)

      // Save all persona matches
      for (const match of personaMatches) {
        await adapter.savePersonaMatch(match)
      }

      logger.info(
        `Manual enrichment completed for badge scan ${badgeScanId}, calculated ${personaMatches.length} persona matches`
      )
    } else {
      logger.warn(`No personas found for scoring badge scan ${badgeScanId}`)
    }

    return NextResponse.json(
      {
        success: true,
        data: { enrichedCompany },
        message: 'Manual enrichment saved successfully and persona matching triggered',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to save manual enrichment:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to save manual enrichment',
          howToFix: 'Check that the enriched data is valid and storage adapter is configured',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
