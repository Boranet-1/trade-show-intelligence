/**
 * Tier Calculation Logic
 * Implements tier assignment based on persona fit scores
 *
 * Tier Thresholds (from data-model.md):
 * - Hot:      fitScore >= 70%
 * - Warm:     40% <= fitScore < 70%
 * - Cold:     fitScore < 40%
 * - Unscored: Insufficient data (< 30% criteria coverage)
 */

import type { LeadTier, PersonaMatch, EnrichedCompany, Persona } from '@/lib/types'

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
