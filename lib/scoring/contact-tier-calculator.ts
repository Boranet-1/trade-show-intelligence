/**
 * Contact Tier Calculator
 *
 * Calculates individual contact tier scores based on:
 * - MEDDIC role (Economic Buyer, Champion, Influencer)
 * - Seniority level (C-level, VP, Director, Manager)
 * - Engagement score (scan time, booth duration, proximity groups)
 *
 * Contact Tier Thresholds:
 * - Hot: >= 70
 * - Warm: 40-69
 * - Cold: < 40
 */

import { BadgeScan, LeadTier, ProximityGroup } from '../types'
import { DECISION_MAKER_ROLES } from './meddic-calculator'

/**
 * Contact tier calculation weights (must sum to 1.0)
 */
export const DEFAULT_CONTACT_TIER_WEIGHTS = {
  meddic_role: 0.40,    // Role in decision-making unit
  seniority: 0.30,      // Job title seniority
  engagement: 0.30      // Event engagement level
} as const

/**
 * MEDDIC role scores (0-100)
 */
export const MEDDIC_ROLE_SCORES = {
  [DECISION_MAKER_ROLES.ECONOMIC_BUYER]: 100,  // Final authority
  [DECISION_MAKER_ROLES.CHAMPION]: 80,          // Internal advocate
  [DECISION_MAKER_ROLES.TECHNICAL_BUYER]: 70,   // Technical evaluation
  [DECISION_MAKER_ROLES.INFLUENCER]: 60,        // Provides input
  [DECISION_MAKER_ROLES.END_USER]: 40,          // Uses product
  UNKNOWN: 20                                    // Role unclear
} as const

/**
 * Seniority level scores (0-100)
 */
const SENIORITY_SCORES = {
  'C-LEVEL': 100,      // CEO, CFO, CTO, CMO, etc.
  'VP': 80,            // Vice President
  'DIRECTOR': 60,      // Director, Head of
  'MANAGER': 40,       // Manager, Lead
  'INDIVIDUAL': 20,    // Individual contributor
  'UNKNOWN': 10        // Cannot determine
} as const

/**
 * C-level title patterns
 */
const C_LEVEL_PATTERNS = [
  'ceo', 'cfo', 'cto', 'cmo', 'coo', 'cio', 'chief',
  'president', 'owner', 'founder', 'managing director'
]

/**
 * VP level patterns
 */
const VP_PATTERNS = [
  'vp', 'vice president', 'senior vice president', 'svp', 'evp'
]

/**
 * Director level patterns
 */
const DIRECTOR_PATTERNS = [
  'director', 'head of', 'general manager', 'gm'
]

/**
 * Manager level patterns
 */
const MANAGER_PATTERNS = [
  'manager', 'lead', 'team lead', 'supervisor', 'principal'
]

/**
 * Contact tier thresholds (configurable per persona)
 */
export const DEFAULT_CONTACT_TIER_THRESHOLDS = {
  hot: 70,
  warm: 40,
  cold: 0
} as const

/**
 * Calculate contact tier score
 */
export interface ContactTierCalculationResult {
  tier: LeadTier
  score: number
  breakdown: {
    meddic_role_score: number
    seniority_score: number
    engagement_score: number
  }
  meddic_role: string
  seniority_level: string
}

/**
 * Calculate contact tier for a badge scan
 */
export function calculateContactTier(params: {
  badgeScan: BadgeScan
  meddic_role?: string
  proximityGroup?: ProximityGroup
  allContactsFromCompany?: BadgeScan[]
  weights?: typeof DEFAULT_CONTACT_TIER_WEIGHTS
  thresholds?: typeof DEFAULT_CONTACT_TIER_THRESHOLDS
}): ContactTierCalculationResult {
  const {
    badgeScan,
    meddic_role,
    proximityGroup,
    allContactsFromCompany = [],
    weights = DEFAULT_CONTACT_TIER_WEIGHTS,
    thresholds = DEFAULT_CONTACT_TIER_THRESHOLDS
  } = params

  // Calculate individual component scores
  const meddic_role_score = calculateMEDDICRoleScore(badgeScan, meddic_role)
  const seniority_score = calculateSeniorityScore(badgeScan.jobTitle || '')
  const engagement_score = calculateEngagementScore(
    badgeScan,
    proximityGroup,
    allContactsFromCompany
  )

  // Calculate weighted overall score
  const score = Math.round(
    meddic_role_score * weights.meddic_role +
    seniority_score * weights.seniority +
    engagement_score * weights.engagement
  )

  // Determine tier based on thresholds
  let tier: LeadTier
  if (score >= thresholds.hot) {
    tier = 'Hot'
  } else if (score >= thresholds.warm) {
    tier = 'Warm'
  } else {
    tier = 'Cold'
  }

  // Get seniority level for display
  const seniority_level = determineSeniorityLevel(badgeScan.jobTitle || '')

  return {
    tier,
    score,
    breakdown: {
      meddic_role_score,
      seniority_score,
      engagement_score
    },
    meddic_role: meddic_role || 'UNKNOWN',
    seniority_level
  }
}

/**
 * Calculate MEDDIC role score
 */
function calculateMEDDICRoleScore(
  badgeScan: BadgeScan,
  meddic_role?: string
): number {
  if (meddic_role && meddic_role in MEDDIC_ROLE_SCORES) {
    return MEDDIC_ROLE_SCORES[meddic_role as keyof typeof MEDDIC_ROLE_SCORES]
  }

  // Infer MEDDIC role from job title if not explicitly provided
  const jobTitle = (badgeScan.jobTitle || '').toLowerCase()

  // Economic Buyer patterns
  if (C_LEVEL_PATTERNS.some(pattern => jobTitle.includes(pattern))) {
    if (jobTitle.includes('cfo') || jobTitle.includes('chief financial') ||
        jobTitle.includes('ceo') || jobTitle.includes('president')) {
      return MEDDIC_ROLE_SCORES[DECISION_MAKER_ROLES.ECONOMIC_BUYER]
    }
  }

  // Champion patterns
  if (jobTitle.includes('product manager') || jobTitle.includes('product owner') ||
      jobTitle.includes('program manager') || jobTitle.includes('technical lead')) {
    return MEDDIC_ROLE_SCORES[DECISION_MAKER_ROLES.CHAMPION]
  }

  // Technical Buyer patterns
  if (jobTitle.includes('cto') || jobTitle.includes('architect') ||
      jobTitle.includes('engineering director') || jobTitle.includes('vp engineering')) {
    return MEDDIC_ROLE_SCORES[DECISION_MAKER_ROLES.TECHNICAL_BUYER]
  }

  // Influencer patterns
  if (MANAGER_PATTERNS.some(pattern => jobTitle.includes(pattern))) {
    return MEDDIC_ROLE_SCORES[DECISION_MAKER_ROLES.INFLUENCER]
  }

  // Default to unknown
  return MEDDIC_ROLE_SCORES.UNKNOWN
}

/**
 * Calculate seniority score from job title
 */
function calculateSeniorityScore(jobTitle: string): number {
  const seniority = determineSeniorityLevel(jobTitle)
  return SENIORITY_SCORES[seniority as keyof typeof SENIORITY_SCORES]
}

/**
 * Determine seniority level from job title
 */
function determineSeniorityLevel(jobTitle: string): string {
  const lowerTitle = jobTitle.toLowerCase()

  if (C_LEVEL_PATTERNS.some(pattern => lowerTitle.includes(pattern))) {
    return 'C-LEVEL'
  }

  if (VP_PATTERNS.some(pattern => lowerTitle.includes(pattern))) {
    return 'VP'
  }

  if (DIRECTOR_PATTERNS.some(pattern => lowerTitle.includes(pattern))) {
    return 'DIRECTOR'
  }

  if (MANAGER_PATTERNS.some(pattern => lowerTitle.includes(pattern))) {
    return 'MANAGER'
  }

  if (lowerTitle.trim().length > 0) {
    return 'INDIVIDUAL'
  }

  return 'UNKNOWN'
}

/**
 * Calculate engagement score based on event behaviour
 */
function calculateEngagementScore(
  badgeScan: BadgeScan,
  proximityGroup?: ProximityGroup,
  allContactsFromCompany?: BadgeScan[]
): number {
  let score = 0

  // Base engagement: Badge scanned at event (20 points)
  score += 20

  // Proximity group indicates meeting/discussion (30 points)
  if (proximityGroup) {
    // High confidence proximity = likely meaningful conversation
    if (proximityGroup.confidence === 'HIGH') {
      score += 30
    } else if (proximityGroup.confidence === 'MEDIUM') {
      score += 20
    } else {
      score += 10
    }
  }

  // Multiple contacts from same company = coordinated visit (30 points)
  if (allContactsFromCompany && allContactsFromCompany.length > 1) {
    if (allContactsFromCompany.length >= 5) {
      score += 30 // Large delegation = serious interest
    } else if (allContactsFromCompany.length >= 3) {
      score += 20 // Medium delegation
    } else {
      score += 10 // Small delegation
    }
  }

  // Booth location indicates intentional visit (20 points)
  if (badgeScan.boothLocation) {
    // If specific booth location recorded = deliberate visit
    score += 20
  }

  // Notes indicate sales conversation (20 points bonus, can exceed 100)
  if (badgeScan.notes && badgeScan.notes.trim().length > 10) {
    score += 20
  }

  return Math.min(score, 120) // Allow slight overflow for exceptional engagement
}

/**
 * Batch calculate contact tiers for multiple badge scans
 */
export function calculateContactTiersForCompany(params: {
  badgeScans: BadgeScan[]
  meddic_roles?: Map<string, string> // badgeScanId -> MEDDIC role
  proximityGroups?: ProximityGroup[]
  weights?: typeof DEFAULT_CONTACT_TIER_WEIGHTS
  thresholds?: typeof DEFAULT_CONTACT_TIER_THRESHOLDS
}): Map<string, ContactTierCalculationResult> {
  const {
    badgeScans,
    meddic_roles = new Map(),
    proximityGroups = [],
    weights,
    thresholds
  } = params

  const results = new Map<string, ContactTierCalculationResult>()

  for (const badgeScan of badgeScans) {
    // Find proximity group for this scan
    const proximityGroup = proximityGroups.find(pg =>
      pg.badgeScanIds.includes(badgeScan.id)
    )

    // Get MEDDIC role if identified
    const meddic_role = meddic_roles.get(badgeScan.id)

    // Calculate tier
    const result = calculateContactTier({
      badgeScan,
      meddic_role,
      proximityGroup,
      allContactsFromCompany: badgeScans,
      weights,
      thresholds
    })

    results.set(badgeScan.id, result)
  }

  return results
}

/**
 * Recalculate contact tier with custom weights/thresholds
 */
export function recalculateContactTier(
  existingResult: ContactTierCalculationResult,
  customWeights?: typeof DEFAULT_CONTACT_TIER_WEIGHTS,
  customThresholds?: typeof DEFAULT_CONTACT_TIER_THRESHOLDS
): ContactTierCalculationResult {
  const weights = customWeights || DEFAULT_CONTACT_TIER_WEIGHTS
  const thresholds = customThresholds || DEFAULT_CONTACT_TIER_THRESHOLDS

  // Validate weights sum to 1.0
  const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0)
  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(`Contact tier weights must sum to 1.0, got ${weightSum}`)
  }

  // Recalculate score with new weights
  const score = Math.round(
    existingResult.breakdown.meddic_role_score * weights.meddic_role +
    existingResult.breakdown.seniority_score * weights.seniority +
    existingResult.breakdown.engagement_score * weights.engagement
  )

  // Determine tier based on new thresholds
  let tier: LeadTier
  if (score >= thresholds.hot) {
    tier = 'Hot'
  } else if (score >= thresholds.warm) {
    tier = 'Warm'
  } else {
    tier = 'Cold'
  }

  return {
    ...existingResult,
    score,
    tier
  }
}

/**
 * Get contact tier statistics for a company
 */
export interface ContactTierStatistics {
  total: number
  hot: number
  warm: number
  cold: number
  averageScore: number
  highestScore: number
  lowestScore: number
  decisionMakerCount: number // Economic Buyers + Champions
}

export function getContactTierStatistics(
  results: Map<string, ContactTierCalculationResult>
): ContactTierStatistics {
  const values = Array.from(results.values())

  const stats: ContactTierStatistics = {
    total: values.length,
    hot: values.filter(r => r.tier === 'Hot').length,
    warm: values.filter(r => r.tier === 'Warm').length,
    cold: values.filter(r => r.tier === 'Cold').length,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 100,
    decisionMakerCount: 0
  }

  if (values.length === 0) {
    return stats
  }

  let scoreSum = 0
  for (const result of values) {
    scoreSum += result.score
    stats.highestScore = Math.max(stats.highestScore, result.score)
    stats.lowestScore = Math.min(stats.lowestScore, result.score)

    // Count decision makers (Economic Buyers and Champions)
    if (result.meddic_role === DECISION_MAKER_ROLES.ECONOMIC_BUYER ||
        result.meddic_role === DECISION_MAKER_ROLES.CHAMPION) {
      stats.decisionMakerCount++
    }
  }

  stats.averageScore = Math.round(scoreSum / values.length)

  return stats
}
