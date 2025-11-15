/**
 * MEDDIC Analysis API (FR-026)
 * Analyzes badge scan and generates MEDDIC qualification scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { MEDDICScore, APIResponse } from '@/lib/types'
import { getActiveStorageAdapter } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'

/**
 * GET /api/meddic/[badgeScanId]
 * Retrieve MEDDIC score for a badge scan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ badgeScanId: string }> }
) {
  try {
    const { badgeScanId } = await params
    const storage = await getActiveStorageAdapter()

    // Get badge scan
    const badgeScan = await storage.getBadgeScan(badgeScanId)
    if (!badgeScan) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Badge scan not found',
            howToFix: 'Verify the badge scan ID and try again',
            details: `No badge scan found with ID ${badgeScanId}`,
          },
        },
        { status: 404 }
      )
    }

    // Get enriched company data
    const enrichedCompany = await storage.getEnrichedCompany(badgeScanId)
    if (!enrichedCompany) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Company not enriched',
            howToFix: 'Enrich the company first before calculating MEDDIC score',
            details: `Badge scan ${badgeScanId} has not been enriched yet`,
          },
        },
        { status: 400 }
      )
    }

    // Get persona matches to determine fit
    const personaMatches = await storage.getPersonaMatchesByBadgeScan(badgeScanId)
    const bestMatch = personaMatches.length > 0
      ? personaMatches.reduce((best, current) =>
          current.fitScore > best.fitScore ? current : best
        )
      : null

    // Calculate MEDDIC scores
    const meddicScore = await calculateMEDDICScore(badgeScan.id, enrichedCompany, bestMatch)

    // Save MEDDIC score
    await storage.saveMEDDICScore(meddicScore)

    return NextResponse.json<APIResponse<MEDDICScore>>({
      success: true,
      data: meddicScore,
      message: 'MEDDIC score calculated successfully',
    })
  } catch (error) {
    console.error('Failed to calculate MEDDIC score:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to calculate MEDDIC score',
          howToFix: 'Check badge scan ID and ensure enrichment is complete',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate MEDDIC scores based on enriched company data
 * This is a simplified scoring algorithm - in production, this would use LLM analysis
 */
async function calculateMEDDICScore(
  badgeScanId: string,
  enrichedCompany: any,
  bestMatch: any | null
): Promise<MEDDICScore> {
  // Simplified scoring - in production, use LLM to analyze company data
  const metricsScore = enrichedCompany.annualRevenue ? 70 : 30
  const economicBuyerScore = bestMatch?.criteriaMatches?.find((m: any) => m.criterionName === 'decisionMaker')?.matched ? 80 : 20
  const decisionCriteriaScore = enrichedCompany.industry ? 60 : 20
  const decisionProcessScore = enrichedCompany.employeeCount && enrichedCompany.employeeCount > 100 ? 50 : 30
  const identifyPainScore = bestMatch?.fitScore || 40
  const championScore = bestMatch?.tier === 'Hot' ? 70 : 30

  const overallScore = (
    metricsScore +
    economicBuyerScore +
    decisionCriteriaScore +
    decisionProcessScore +
    identifyPainScore +
    championScore
  ) / 6

  const qualificationStatus = overallScore >= 70 ? 'Qualified' : overallScore >= 50 ? 'Developing' : 'Unqualified'

  // Identify decision makers (simplified)
  const economicBuyer = bestMatch?.criteriaMatches?.find((m: any) => m.criterionName === 'decisionMaker')?.matched
    ? {
        title: bestMatch.criteriaMatches.find((m: any) => m.criterionName === 'decisionMaker').actualValue,
        confidence: 70,
      }
    : undefined

  const missingDecisionMakers = []
  if (!economicBuyer) {
    missingDecisionMakers.push({
      role: 'Economic Buyer',
      title: 'VP or C-Level Executive',
      foundViaResearch: false,
    })
  }

  if (!enrichedCompany.techStack || enrichedCompany.techStack.length === 0) {
    missingDecisionMakers.push({
      role: 'Technical Champion',
      title: 'CTO or Engineering Lead',
      foundViaResearch: false,
    })
  }

  // Generate engagement strategy
  let engagementStrategy = 'Start with discovery call to understand business metrics and pain points.'
  if (qualificationStatus === 'Qualified') {
    engagementStrategy = 'Engage economic buyer directly with ROI-focused proposal. Schedule executive briefing.'
  } else if (qualificationStatus === 'Developing') {
    engagementStrategy = 'Build champion relationship and gather intel on decision process. Focus on pain point validation.'
  }

  return {
    id: uuidv4(),
    badgeScanId,
    companyId: enrichedCompany.id,
    metricsScore,
    economicBuyerScore,
    decisionCriteriaScore,
    decisionProcessScore,
    identifyPainScore,
    championScore,
    overallScore,
    qualificationStatus,
    economicBuyer,
    missingDecisionMakers,
    engagementStrategy,
    calculatedAt: new Date(),
  }
}
