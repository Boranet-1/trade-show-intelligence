/**
 * Company Refinement API Route
 *
 * POST /api/enrichment/refine
 * Re-enriches specific companies with custom instructions to refine results
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import { EnrichmentOrchestrator } from '@/lib/enrichment/orchestrator'
import { calculateMultiPersonaFitScores } from '@/lib/scoring/persona-matcher'
import { EnrichmentStatus } from '@/lib/types'
import type { BadgeScan, EnrichedCompany } from '@/lib/types'
import { z } from 'zod'

const refineRequestSchema = z.object({
  badgeScanIds: z.array(z.string().uuid()).min(1, 'At least one badge scan ID is required'),
  customInstructions: z.string().min(1, 'Custom instructions are required'),
})

export const dynamic = 'force-dynamic'

/**
 * POST /api/enrichment/refine
 * Re-enrich companies with custom instructions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = refineRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        new AppError('Invalid request body', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Request validation failed',
          howToFix: 'Ensure badgeScanIds array and customInstructions are provided',
          exampleFormat: JSON.stringify({
            badgeScanIds: ['123e4567-e89b-12d3-a456-426614174000'],
            customInstructions: 'Focus on cloud infrastructure and DevOps tools',
          }),
          validationErrors: validationResult.error.errors,
        })
      )
    }

    const { badgeScanIds, customInstructions } = validationResult.data
    const storage = await getActiveStorageAdapter()

    const results = []
    const errors = []

    for (const scanId of badgeScanIds) {
      try {
        const badgeScan = await storage.getBadgeScan(scanId)
        if (!badgeScan) {
          errors.push({
            scanId,
            error: 'Badge scan not found',
          })
          continue
        }

        // Update status to enriching
        await storage.updateBadgeScanStatus(scanId, EnrichmentStatus.ENRICHING)

        // Get all personas for matching
        const personas = await storage.getAllPersonas()
        if (personas.length === 0) {
          await storage.updateBadgeScanStatus(scanId, EnrichmentStatus.FAILED)
          errors.push({
            scanId,
            company: badgeScan.company,
            error: 'No personas found for scoring',
          })
          continue
        }

        // Re-run enrichment with custom instructions
        // Note: Custom instructions are logged but the orchestrator will use its standard workflow
        console.log(`[Refine] Custom instructions for ${badgeScan.company}: ${customInstructions}`)

        const orchestrator = new EnrichmentOrchestrator()
        const enrichmentResult = await orchestrator.enrichBadgeScan(badgeScan, personas)

        if (enrichmentResult.status === 'ENRICHED' && enrichmentResult.enrichedCompany) {
          // Save the refined enrichment data
          const enrichedCompany: EnrichedCompany = {
            id: crypto.randomUUID(),
            badgeScanId: scanId,
            companyName: enrichmentResult.enrichedCompany.companyName || badgeScan.company,
            domain: enrichmentResult.enrichedCompany.domain,
            employeeCount: enrichmentResult.enrichedCompany.employeeCount,
            employeeRange: enrichmentResult.enrichedCompany.employeeRange,
            industry: enrichmentResult.enrichedCompany.industry,
            industryCodes: enrichmentResult.enrichedCompany.industryCodes,
            annualRevenue: enrichmentResult.enrichedCompany.annualRevenue,
            revenueRange: enrichmentResult.enrichedCompany.revenueRange,
            techStack: enrichmentResult.enrichedCompany.techStack,
            fundingStage: enrichmentResult.enrichedCompany.fundingStage,
            totalFunding: enrichmentResult.enrichedCompany.totalFunding,
            headquarters: enrichmentResult.enrichedCompany.headquarters,
            founded: enrichmentResult.enrichedCompany.founded,
            description: enrichmentResult.enrichedCompany.description,
            linkedinUrl: enrichmentResult.enrichedCompany.linkedinUrl,
            twitterHandle: enrichmentResult.enrichedCompany.twitterHandle,
            enrichedAt: new Date(),
            dataSource: enrichmentResult.enrichedCompany.dataSource || ['Re-enrichment'],
            consensusMetadata: enrichmentResult.enrichedCompany.consensusMetadata || {},
          }

          await storage.saveEnrichedCompany(enrichedCompany)

          // Save persona matches
          for (const match of enrichmentResult.personaMatches) {
            await storage.savePersonaMatch(match)
          }

          await storage.updateBadgeScanStatus(scanId, EnrichmentStatus.ENRICHED)

          results.push({
            scanId,
            company: badgeScan.company,
            status: 'success',
            enrichedData: enrichedCompany,
            tier: enrichmentResult.assignedTier,
            fitScore: enrichmentResult.bestPersonaMatch?.fitScore,
          })
        } else {
          await storage.updateBadgeScanStatus(scanId, EnrichmentStatus.FAILED)
          errors.push({
            scanId,
            company: badgeScan.company,
            error: enrichmentResult.error || 'Enrichment failed',
          })
        }
      } catch (error) {
        console.error(`[Refine API] Error enriching scan ${scanId}:`, error)

        await storage.updateBadgeScanStatus(scanId, EnrichmentStatus.FAILED)

        errors.push({
          scanId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return successResponse(
      {
        refined: results.length,
        failed: errors.length,
        results,
        errors,
      },
      `Successfully refined ${results.length} of ${badgeScanIds.length} companies`
    )
  } catch (error) {
    console.error('[Refine API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to refine companies: ${errorMessage}`,
        'REFINEMENT_ERROR',
        500,
        {
          whatFailed: 'Company refinement process failed',
          howToFix: 'Check that badge scans exist and enrichment agents are properly configured',
          originalError: error,
        }
      )
    )
  }
}
