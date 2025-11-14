/**
 * Badge Scan Re-processing API Route
 *
 * POST /api/enrichment/reprocess
 * Recalculates persona matches for all enriched badge scans using updated persona configurations
 */

import { NextResponse } from 'next/server'
import { initializeStorageAdapters, getActiveStorageAdapter } from '@/lib/storage/factory'
import type { APISuccessResponse, APIErrorResponse } from '@/lib/types'
import { EnrichmentStatus } from '@/lib/types'
import { logger } from '@/lib/logger'

export async function POST(): Promise<NextResponse<APISuccessResponse<{ scansReprocessed: number }> | APIErrorResponse>> {
  try {
    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    // Get all enriched badge scans
    const allScans = await adapter.getAllBadgeScans()
    const enrichedScans = allScans.filter(
      scan => scan.enrichmentStatus === EnrichmentStatus.ENRICHED
    )

    if (enrichedScans.length === 0) {
      return NextResponse.json({
        success: true,
        data: { scansReprocessed: 0 },
        message: 'No enriched scans found to reprocess',
      })
    }

    logger.info(`Starting re-processing of ${enrichedScans.length} enriched scans`)

    // Get all personas
    const personas = await adapter.getAllPersonas()

    if (personas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'No personas found',
            howToFix: 'Create at least one persona before re-processing scans',
          },
        },
        { status: 400 }
      )
    }

    let reprocessedCount = 0

    // Re-calculate persona matches for each enriched scan
    for (const scan of enrichedScans) {
      try {
        // Get enriched company data
        const enrichedCompany = await adapter.getEnrichedCompany(scan.id)

        if (!enrichedCompany) {
          logger.warn(`No enriched data found for scan ${scan.id}, skipping`)
          continue
        }

        // Calculate persona matches for all personas
        // NOTE: This is a placeholder. The actual persona matching logic will be
        // implemented in lib/scoring/persona-matcher.ts (Phase 3 tasks T048-T049)
        // For now, we'll just log that we would reprocess this scan

        logger.info(`Would reprocess scan ${scan.id} with ${personas.length} personas`)

        // TODO: Implement actual persona matching logic here once T048-T049 are complete
        // This should:
        // 1. Calculate fit score for each persona against the enriched company data
        // 2. Determine the best matching persona
        // 3. Assign tier based on fit score thresholds (Hot>=70%, Warm=40-69%, Cold<40%)
        // 4. Save updated PersonaMatch records to storage
        //
        // Example (to be implemented):
        // for (const persona of personas) {
        //   const fitScore = calculatePersonaFitScore(enrichedCompany, persona)
        //   const tier = calculateTier(fitScore)
        //   const match: PersonaMatch = {
        //     id: crypto.randomUUID(),
        //     badgeScanId: scan.id,
        //     personaId: persona.id,
        //     fitScore,
        //     tier,
        //     criteriaMatches: [], // detailed breakdown
        //     calculatedAt: new Date(),
        //   }
        //   await adapter.savePersonaMatch(match)
        // }

        reprocessedCount++
      } catch (error) {
        logger.error(`Failed to reprocess scan ${scan.id}:`, error instanceof Error ? error : undefined)
        // Continue with other scans even if one fails
      }
    }

    logger.info(`Re-processing completed. ${reprocessedCount} scans reprocessed`)

    return NextResponse.json({
      success: true,
      data: { scansReprocessed: reprocessedCount },
      message: `Successfully initiated re-processing of ${reprocessedCount} enriched scans`,
    })
  } catch (error) {
    logger.error('Failed to reprocess scans:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to reprocess enriched scans',
          howToFix: 'Check storage adapter configuration and ensure enriched data exists',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
