/**
 * FR-032: Dual-tier calculation
 * Calculates Combined Tier from Company Tier (60%) and Contact Tier (40%)
 */

import { LeadTier, CombinedTierCalculation } from '../types'

// Tier score mappings (for weighted calculation)
const TIER_SCORES: Record<LeadTier, number> = {
  [LeadTier.Hot]: 100,
  [LeadTier.Warm]: 60,
  [LeadTier.Cold]: 30,
  [LeadTier.Unscored]: 0,
}

// Weights for combined tier calculation
const COMPANY_TIER_WEIGHT = 0.6 // 60%
const CONTACT_TIER_WEIGHT = 0.4 // 40%

/**
 * Calculate combined tier from company and contact tiers
 * Formula: (Company Tier Score × 0.6) + (Contact Tier Score × 0.4)
 */
export function calculateCombinedTier(
  badgeScanId: string,
  companyTier: LeadTier,
  contactTier: LeadTier
): CombinedTierCalculation {
  const companyTierScore = TIER_SCORES[companyTier]
  const contactTierScore = TIER_SCORES[contactTier]

  // Calculate weighted score
  const combinedScore =
    companyTierScore * COMPANY_TIER_WEIGHT +
    contactTierScore * CONTACT_TIER_WEIGHT

  // Map combined score back to tier
  const combinedTier = getCombinedTierFromScore(combinedScore)

  return {
    badgeScanId,
    companyTier,
    contactTier,
    combinedTier,
    companyTierScore,
    contactTierScore,
    combinedScore,
    calculatedAt: new Date(),
  }
}

/**
 * Map combined score to tier category
 * Hot: >= 70, Warm: 40-69, Cold: < 40 (but > 0), Unscored: 0
 */
function getCombinedTierFromScore(score: number): LeadTier {
  if (score === 0) {
    return LeadTier.Unscored
  } else if (score >= 70) {
    return LeadTier.Hot
  } else if (score >= 40) {
    return LeadTier.Warm
  } else {
    return LeadTier.Cold
  }
}

/**
 * Calculate tier from percentage match score (0-100)
 * Used for individual company or contact tier calculation
 */
export function getTierFromPercentage(percentage: number, dataCoverage: number): LeadTier {
  // If data coverage < 30%, assign Unscored
  if (dataCoverage < 30) {
    return LeadTier.Unscored
  }

  // Otherwise, use percentage thresholds
  if (percentage >= 70) {
    return LeadTier.Hot
  } else if (percentage >= 40) {
    return LeadTier.Warm
  } else {
    return LeadTier.Cold
  }
}

/**
 * Batch calculate combined tiers for multiple badge scans
 */
export function batchCalculateCombinedTiers(
  items: Array<{
    badgeScanId: string
    companyTier: LeadTier
    contactTier: LeadTier
  }>
): CombinedTierCalculation[] {
  return items.map((item) =>
    calculateCombinedTier(item.badgeScanId, item.companyTier, item.contactTier)
  )
}
