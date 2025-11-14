/**
 * Tier Calculation Logic
 * Implements tier assignment based on:
 * 1. Persona fit scores (legacy)
 * 2. Enhanced company tier (persona + MEDDIC + engagement)
 *
 * Tier Thresholds (from data-model.md):
 * - Hot:      fitScore >= 70%
 * - Warm:     40% <= fitScore < 70%
 * - Cold:     fitScore < 40%
 * - Unscored: Insufficient data (< 30% criteria coverage)
 *
 * Enhanced Company Tier Formula:
 * score = persona_fit × 0.40 + meddic_score × 0.35 + engagement_score × 0.25
 */

import type { LeadTier, PersonaMatch, EnrichedCompany, Persona, BadgeScan, MEDDICScore, ProximityGroup } from '@/lib/types'

export interface TierThresholds {
  hot: number      // >= 70
  warm: number     // >= 40
  dataCoverage: number  // >= 30% (minimum data coverage required to score)
}

const DEFAULT_THRESHOLDS: TierThresholds = {
  hot: 70,
  warm: 40,
  dataCoverage: 30,
}

/**
 * Calculate tier based on fit score
 * @param fitScore - Percentage match to persona (0-100)
 * @param thresholds - Optional custom tier thresholds
 * @returns Assigned tier
 */
export function calculateTier(
  fitScore: number,
  thresholds: TierThresholds = DEFAULT_THRESHOLDS
): LeadTier {
  if (fitScore >= thresholds.hot) {
    return 'Hot'
  } else if (fitScore >= thresholds.warm) {
    return 'Warm'
  } else {
    return 'Cold'
  }
}

/**
 * Check if enriched data has sufficient coverage for scoring
 * @param enrichedCompany - Enriched company data
 * @param persona - Persona used for matching
 * @returns True if data coverage meets minimum threshold
 */
export function hasSufficientDataCoverage(
  enrichedCompany: Partial<EnrichedCompany>,
  persona: Persona
): boolean {
  const { criteria, weights } = persona

  let totalWeightAvailable = 0
  let totalWeightPossible = 0

  // Check company size
  if (criteria.companySizeRange) {
    totalWeightPossible += weights.companySize
    if (enrichedCompany.employeeCount !== undefined) {
      totalWeightAvailable += weights.companySize
    }
  }

  // Check industry
  if (criteria.industries && criteria.industries.length > 0) {
    totalWeightPossible += weights.industry
    if (enrichedCompany.industry) {
      totalWeightAvailable += weights.industry
    }
  }

  // Check technology
  if (criteria.technologies && criteria.technologies.length > 0) {
    totalWeightPossible += weights.technology
    if (enrichedCompany.techStack && enrichedCompany.techStack.length > 0) {
      totalWeightAvailable += weights.technology
    }
  }

  // Check revenue
  if (criteria.revenueRange) {
    totalWeightPossible += weights.revenue
    if (enrichedCompany.annualRevenue !== undefined) {
      totalWeightAvailable += weights.revenue
    }
  }

  // Check geography
  if (criteria.geographies && criteria.geographies.length > 0) {
    totalWeightPossible += weights.geography
    if (enrichedCompany.headquarters) {
      totalWeightAvailable += weights.geography
    }
  }

  // Check funding stage
  if (criteria.fundingStages && criteria.fundingStages.length > 0) {
    totalWeightPossible += weights.fundingStage
    if (enrichedCompany.fundingStage) {
      totalWeightAvailable += weights.fundingStage
    }
  }

  // Calculate coverage percentage
  const coveragePercent = totalWeightPossible > 0
    ? (totalWeightAvailable / totalWeightPossible) * 100
    : 0

  return coveragePercent >= DEFAULT_THRESHOLDS.dataCoverage
}

/**
 * Determine tier from multiple persona matches
 * Uses the highest fit score across all personas
 * @param personaMatches - Array of persona matches for a badge scan
 * @param enrichedCompany - Enriched company data
 * @param personas - All personas used for matching
 * @returns Assigned tier
 */
export function determineTierFromMatches(
  personaMatches: PersonaMatch[],
  enrichedCompany: Partial<EnrichedCompany>,
  personas: Persona[]
): LeadTier {
  if (personaMatches.length === 0) {
    return 'Unscored'
  }

  // Find best match (highest fit score)
  const bestMatch = personaMatches.reduce((best, current) => {
    return current.fitScore > best.fitScore ? current : best
  })

  // Get persona for data coverage check
  const persona = personas.find(p => p.id === bestMatch.personaId)
  if (!persona) {
    return 'Unscored'
  }

  // Check data coverage
  if (!hasSufficientDataCoverage(enrichedCompany, persona)) {
    return 'Unscored'
  }

  // Calculate tier from best fit score
  return calculateTier(bestMatch.fitScore)
}

/**
 * Get tier badge color for UI display
 * @param tier - Lead tier
 * @returns Color class name
 */
export function getTierBadgeColor(tier: LeadTier): string {
  switch (tier) {
    case 'Hot':
      return 'destructive'  // Red badge
    case 'Warm':
      return 'warning'      // Orange badge (need to add this variant)
    case 'Cold':
      return 'info'         // Blue badge (need to add this variant)
    case 'Unscored':
      return 'secondary'    // Gray badge
  }
}

/**
 * Get tier display label
 * @param tier - Lead tier
 * @returns Display label
 */
export function getTierLabel(tier: LeadTier): string {
  return tier
}

/**
 * Get tier description
 * @param tier - Lead tier
 * @returns Description of tier
 */
export function getTierDescription(tier: LeadTier): string {
  switch (tier) {
    case 'Hot':
      return 'High-priority leads matching 70%+ of persona criteria'
    case 'Warm':
      return 'Medium-priority leads with moderate fit (40-69%)'
    case 'Cold':
      return 'Low-priority leads with minimal persona alignment (<40%)'
    case 'Unscored':
      return 'Insufficient enrichment data to calculate fit score'
  }
}

/**
 * Get tier sort order (for sorting reports)
 * @param tier - Lead tier
 * @returns Sort order (lower = higher priority)
 */
export function getTierSortOrder(tier: LeadTier): number {
  switch (tier) {
    case 'Hot':
      return 1
    case 'Warm':
      return 2
    case 'Cold':
      return 3
    case 'Unscored':
      return 4
  }
}

/**
 * Filter persona matches by tier
 * @param matches - Array of persona matches
 * @param tiers - Tiers to filter by
 * @returns Filtered matches
 */
export function filterMatchesByTier(
  matches: PersonaMatch[],
  tiers: LeadTier[]
): PersonaMatch[] {
  return matches.filter(match => tiers.includes(match.tier))
}

/**
 * Group persona matches by tier
 * @param matches - Array of persona matches
 * @returns Matches grouped by tier
 */
export function groupMatchesByTier(
  matches: PersonaMatch[]
): Record<LeadTier, PersonaMatch[]> {
  return {
    Hot: matches.filter(m => m.tier === 'Hot'),
    Warm: matches.filter(m => m.tier === 'Warm'),
    Cold: matches.filter(m => m.tier === 'Cold'),
    Unscored: matches.filter(m => m.tier === 'Unscored'),
  }
}

/**
 * Calculate tier distribution statistics
 * @param matches - Array of persona matches
 * @returns Count of matches per tier
 */
export function calculateTierDistribution(matches: PersonaMatch[]): Record<LeadTier, number> {
  const grouped = groupMatchesByTier(matches)
  return {
    Hot: grouped.Hot.length,
    Warm: grouped.Warm.length,
    Cold: grouped.Cold.length,
    Unscored: grouped.Unscored.length,
  }
}

// =============================================================================
// Enhanced Company Tier Calculation (Persona + MEDDIC + Engagement)
// =============================================================================

/**
 * Company tier calculation weights (must sum to 1.0)
 */
export const DEFAULT_COMPANY_TIER_WEIGHTS = {
  persona_fit: 0.40,     // Persona matching score
  meddic: 0.35,          // MEDDIC qualification score
  engagement: 0.25       // Event engagement score
} as const

/**
 * Enhanced company tier calculation result
 */
export interface EnhancedCompanyTierResult {
  tier: LeadTier
  score: number
  breakdown: {
    persona_fit_score: number
    meddic_score: number
    engagement_score: number
  }
}

/**
 * Calculate enhanced company tier incorporating MEDDIC and engagement
 */
export function calculateEnhancedCompanyTier(params: {
  persona_fit_score: number           // From persona matching (0-100)
  meddic_score?: number                // From MEDDIC calculation (0-100)
  engagement_score?: number            // From company engagement calculation (0-100)
  weights?: typeof DEFAULT_COMPANY_TIER_WEIGHTS
  thresholds?: TierThresholds
}): EnhancedCompanyTierResult {
  const {
    persona_fit_score,
    meddic_score = 0,
    engagement_score = 0,
    weights = DEFAULT_COMPANY_TIER_WEIGHTS,
    thresholds = DEFAULT_THRESHOLDS
  } = params

  // Calculate weighted overall score
  const score = Math.round(
    persona_fit_score * weights.persona_fit +
    meddic_score * weights.meddic +
    engagement_score * weights.engagement
  )

  // Determine tier
  const tier = calculateTier(score, thresholds)

  return {
    tier,
    score,
    breakdown: {
      persona_fit_score,
      meddic_score,
      engagement_score
    }
  }
}

/**
 * Calculate company engagement score based on event interactions
 */
export function calculateCompanyEngagementScore(params: {
  badgeScans: BadgeScan[]              // All scans from this company
  proximityGroups?: ProximityGroup[]   // Proximity detection groups
  totalEventAttendees?: number         // Total event size (for context)
}): number {
  const { badgeScans, proximityGroups = [], totalEventAttendees } = params

  if (badgeScans.length === 0) {
    return 0
  }

  let score = 0

  // Number of contacts scanned (max 40 points)
  // 5+ contacts = serious delegated visit
  if (badgeScans.length >= 5) {
    score += 40
  } else if (badgeScans.length >= 3) {
    score += 30
  } else if (badgeScans.length >= 2) {
    score += 20
  } else {
    score += 10 // Single contact
  }

  // Proximity groups indicate coordinated meetings (max 30 points)
  const companyProximityGroups = proximityGroups.filter(pg =>
    pg.badgeScanIds.some(id => badgeScans.some(bs => bs.id === id))
  )

  if (companyProximityGroups.length > 0) {
    // High confidence proximity groups = deliberate meetings
    const highConfidenceGroups = companyProximityGroups.filter(pg => pg.confidence === 'HIGH')
    if (highConfidenceGroups.length >= 2) {
      score += 30 // Multiple coordinated meetings
    } else if (highConfidenceGroups.length === 1) {
      score += 20 // One confirmed meeting
    } else {
      score += 10 // Medium/low confidence proximity
    }
  }

  // Notes on any contact indicate sales conversation (max 20 points)
  const scansWithNotes = badgeScans.filter(bs => bs.notes && bs.notes.trim().length > 10)
  if (scansWithNotes.length > 0) {
    score += Math.min(scansWithNotes.length * 10, 20)
  }

  // Booth location recorded indicates intentional visit (10 points)
  const scansWithLocation = badgeScans.filter(bs => bs.boothLocation)
  if (scansWithLocation.length > 0) {
    score += 10
  }

  // Relative engagement vs event size (bonus, max 10 points)
  if (totalEventAttendees && totalEventAttendees > 0) {
    const engagementRatio = badgeScans.length / totalEventAttendees
    if (engagementRatio >= 0.01) {
      score += 10 // >= 1% of attendees from one company = exceptional
    } else if (engagementRatio >= 0.005) {
      score += 5  // >= 0.5% = notable
    }
  }

  return Math.min(score, 100)
}

/**
 * Calculate company tier from persona match and MEDDIC score
 */
export function calculateCompanyTierFromComponents(params: {
  personaMatch: PersonaMatch
  meddic_score?: MEDDICScore
  badgeScans: BadgeScan[]
  proximityGroups?: ProximityGroup[]
  totalEventAttendees?: number
  weights?: typeof DEFAULT_COMPANY_TIER_WEIGHTS
  thresholds?: TierThresholds
}): EnhancedCompanyTierResult {
  const {
    personaMatch,
    meddic_score,
    badgeScans,
    proximityGroups,
    totalEventAttendees,
    weights,
    thresholds
  } = params

  // Calculate engagement score
  const engagement_score = calculateCompanyEngagementScore({
    badgeScans,
    proximityGroups,
    totalEventAttendees
  })

  // Use existing persona fit score
  const persona_fit_score = personaMatch.fitScore

  // Get MEDDIC overall score (if available)
  const meddic_overall_score = meddic_score?.overallScore || 0

  return calculateEnhancedCompanyTier({
    persona_fit_score,
    meddic_score: meddic_overall_score,
    engagement_score,
    weights,
    thresholds
  })
}

/**
 * Recalculate company tier with custom weights
 */
export function recalculateCompanyTier(
  existingResult: EnhancedCompanyTierResult,
  customWeights?: typeof DEFAULT_COMPANY_TIER_WEIGHTS,
  customThresholds?: TierThresholds
): EnhancedCompanyTierResult {
  const weights = customWeights || DEFAULT_COMPANY_TIER_WEIGHTS
  const thresholds = customThresholds || DEFAULT_THRESHOLDS

  // Validate weights sum to 1.0
  const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0)
  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(`Company tier weights must sum to 1.0, got ${weightSum}`)
  }

  return calculateEnhancedCompanyTier({
    persona_fit_score: existingResult.breakdown.persona_fit_score,
    meddic_score: existingResult.breakdown.meddic_score,
    engagement_score: existingResult.breakdown.engagement_score,
    weights,
    thresholds
  })
}

/**
 * Company tier statistics for reporting
 */
export interface CompanyTierStatistics {
  total: number
  hot: number
  warm: number
  cold: number
  unscored: number
  averageScore: number
  averagePersonaFit: number
  averageMEDDIC: number
  averageEngagement: number
}

/**
 * Calculate company tier statistics for a set of results
 */
export function calculateCompanyTierStatistics(
  results: EnhancedCompanyTierResult[]
): CompanyTierStatistics {
  const stats: CompanyTierStatistics = {
    total: results.length,
    hot: 0,
    warm: 0,
    cold: 0,
    unscored: 0,
    averageScore: 0,
    averagePersonaFit: 0,
    averageMEDDIC: 0,
    averageEngagement: 0
  }

  if (results.length === 0) {
    return stats
  }

  let scoreSum = 0
  let personaFitSum = 0
  let meddicSum = 0
  let engagementSum = 0

  for (const result of results) {
    // Count by tier
    switch (result.tier) {
      case 'Hot':
        stats.hot++
        break
      case 'Warm':
        stats.warm++
        break
      case 'Cold':
        stats.cold++
        break
      case 'Unscored':
        stats.unscored++
        break
    }

    // Sum scores
    scoreSum += result.score
    personaFitSum += result.breakdown.persona_fit_score
    meddicSum += result.breakdown.meddic_score
    engagementSum += result.breakdown.engagement_score
  }

  stats.averageScore = Math.round(scoreSum / results.length)
  stats.averagePersonaFit = Math.round(personaFitSum / results.length)
  stats.averageMEDDIC = Math.round(meddicSum / results.length)
  stats.averageEngagement = Math.round(engagementSum / results.length)

  return stats
}
