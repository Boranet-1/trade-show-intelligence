/**
 * Persona Fit Score Calculation
 * Implements weighted criteria matching for persona-based lead scoring
 *
 * Scoring Algorithm:
 * 1. For each persona criterion, calculate match percentage (0-100%)
 * 2. Multiply match percentage by criterion weight
 * 3. Sum all weighted scores to get final fit score (0-100%)
 */

import type { Persona, EnrichedCompany, PersonaMatch, CriteriaMatch, BadgeScan, LeadTier } from '@/lib/types'
import { calculateTier, hasSufficientDataCoverage } from './tier-calculator'

/**
 * Calculate persona fit score for a badge scan
 * @param badgeScan - Badge scan with contact data
 * @param enrichedCompany - Enriched company data
 * @param persona - Persona to match against
 * @returns Persona match with fit score and tier
 */
export function calculatePersonaFitScore(
  badgeScan: BadgeScan,
  enrichedCompany: Partial<EnrichedCompany>,
  persona: Persona
): PersonaMatch {
  const { criteria, weights } = persona
  const criteriaMatches: CriteriaMatch[] = []

  let totalScore = 0

  // 1. Company Size Match
  if (criteria.companySizeRange && enrichedCompany.employeeCount !== undefined) {
    const { min, max } = criteria.companySizeRange
    const employeeCount = enrichedCompany.employeeCount
    const matched = employeeCount >= min && employeeCount <= max
    const matchPercent = matched ? 100 : 0

    criteriaMatches.push({
      criterionName: 'companySize',
      matched,
      actualValue: employeeCount,
      targetValue: criteria.companySizeRange,
      weight: weights.companySize,
      contributionToScore: (matchPercent / 100) * weights.companySize * 100,
    })

    totalScore += (matchPercent / 100) * weights.companySize
  }

  // 2. Industry Match
  if (criteria.industries && criteria.industries.length > 0 && enrichedCompany.industry) {
    const matched = criteria.industries.some(targetIndustry =>
      enrichedCompany.industry?.toLowerCase().includes(targetIndustry.toLowerCase()) ||
      targetIndustry.toLowerCase().includes(enrichedCompany.industry!.toLowerCase())
    )
    const matchPercent = matched ? 100 : 0

    criteriaMatches.push({
      criterionName: 'industry',
      matched,
      actualValue: enrichedCompany.industry,
      targetValue: criteria.industries,
      weight: weights.industry,
      contributionToScore: (matchPercent / 100) * weights.industry * 100,
    })

    totalScore += (matchPercent / 100) * weights.industry
  }

  // 3. Technology Stack Match
  if (criteria.technologies && criteria.technologies.length > 0 && enrichedCompany.techStack) {
    const matchingTechs = criteria.technologies.filter(targetTech =>
      enrichedCompany.techStack?.some(actualTech =>
        actualTech.toLowerCase().includes(targetTech.toLowerCase()) ||
        targetTech.toLowerCase().includes(actualTech.toLowerCase())
      )
    )

    const matchPercent = criteria.technologies.length > 0
      ? (matchingTechs.length / criteria.technologies.length) * 100
      : 0

    criteriaMatches.push({
      criterionName: 'technology',
      matched: matchingTechs.length > 0,
      actualValue: enrichedCompany.techStack,
      targetValue: criteria.technologies,
      weight: weights.technology,
      contributionToScore: (matchPercent / 100) * weights.technology * 100,
    })

    totalScore += (matchPercent / 100) * weights.technology
  }

  // 4. Revenue Range Match
  if (criteria.revenueRange && enrichedCompany.annualRevenue !== undefined) {
    const { min, max } = criteria.revenueRange
    const revenue = enrichedCompany.annualRevenue
    const matched = revenue >= min && revenue <= max
    const matchPercent = matched ? 100 : 0

    criteriaMatches.push({
      criterionName: 'revenue',
      matched,
      actualValue: revenue,
      targetValue: criteria.revenueRange,
      weight: weights.revenue,
      contributionToScore: (matchPercent / 100) * weights.revenue * 100,
    })

    totalScore += (matchPercent / 100) * weights.revenue
  }

  // 5. Geography Match
  if (criteria.geographies && criteria.geographies.length > 0 && enrichedCompany.headquarters) {
    const matched = criteria.geographies.some(targetGeo =>
      enrichedCompany.headquarters?.toLowerCase().includes(targetGeo.toLowerCase())
    )
    const matchPercent = matched ? 100 : 0

    criteriaMatches.push({
      criterionName: 'geography',
      matched,
      actualValue: enrichedCompany.headquarters,
      targetValue: criteria.geographies,
      weight: weights.geography,
      contributionToScore: (matchPercent / 100) * weights.geography * 100,
    })

    totalScore += (matchPercent / 100) * weights.geography
  }

  // 6. Decision Maker Title Match
  if (criteria.decisionMakerTitles && criteria.decisionMakerTitles.length > 0 && badgeScan.jobTitle) {
    const matched = criteria.decisionMakerTitles.some(targetTitle =>
      badgeScan.jobTitle?.toLowerCase().includes(targetTitle.toLowerCase()) ||
      targetTitle.toLowerCase().includes(badgeScan.jobTitle!.toLowerCase())
    )
    const matchPercent = matched ? 100 : 0

    criteriaMatches.push({
      criterionName: 'decisionMaker',
      matched,
      actualValue: badgeScan.jobTitle,
      targetValue: criteria.decisionMakerTitles,
      weight: weights.decisionMaker,
      contributionToScore: (matchPercent / 100) * weights.decisionMaker * 100,
    })

    totalScore += (matchPercent / 100) * weights.decisionMaker
  }

  // 7. Funding Stage Match
  if (criteria.fundingStages && criteria.fundingStages.length > 0 && enrichedCompany.fundingStage) {
    const matched = criteria.fundingStages.includes(enrichedCompany.fundingStage)
    const matchPercent = matched ? 100 : 0

    criteriaMatches.push({
      criterionName: 'fundingStage',
      matched,
      actualValue: enrichedCompany.fundingStage,
      targetValue: criteria.fundingStages,
      weight: weights.fundingStage,
      contributionToScore: (matchPercent / 100) * weights.fundingStage * 100,
    })

    totalScore += (matchPercent / 100) * weights.fundingStage
  }

  // Calculate final fit score (0-100%)
  const fitScore = Math.round(totalScore * 100)

  // Determine tier
  let tier: LeadTier
  if (!hasSufficientDataCoverage(enrichedCompany, persona)) {
    tier = 'Unscored'
  } else {
    tier = calculateTier(fitScore)
  }

  // Create persona match
  const personaMatch: PersonaMatch = {
    id: `match_${badgeScan.id}_${persona.id}_${Date.now()}`,
    badgeScanId: badgeScan.id,
    personaId: persona.id,
    fitScore,
    tier,
    criteriaMatches,
    calculatedAt: new Date(),
  }

  return personaMatch
}

/**
 * Calculate fit scores for multiple personas
 * @param badgeScan - Badge scan with contact data
 * @param enrichedCompany - Enriched company data
 * @param personas - Array of personas to match against
 * @returns Array of persona matches
 */
export function calculateMultiPersonaFitScores(
  badgeScan: BadgeScan,
  enrichedCompany: Partial<EnrichedCompany>,
  personas: Persona[]
): PersonaMatch[] {
  return personas.map(persona =>
    calculatePersonaFitScore(badgeScan, enrichedCompany, persona)
  )
}

/**
 * Get best persona match (highest fit score)
 * @param personaMatches - Array of persona matches
 * @returns Best persona match or null if no matches
 */
export function getBestPersonaMatch(personaMatches: PersonaMatch[]): PersonaMatch | null {
  if (personaMatches.length === 0) {
    return null
  }

  return personaMatches.reduce((best, current) => {
    return current.fitScore > best.fitScore ? current : best
  })
}

/**
 * Calculate criteria match summary
 * @param personaMatch - Persona match result
 * @returns Summary statistics
 */
export function calculateCriteriaMatchSummary(personaMatch: PersonaMatch): {
  totalCriteria: number
  matchedCriteria: number
  matchRate: number
  topMatches: CriteriaMatch[]
  topMisses: CriteriaMatch[]
} {
  const { criteriaMatches } = personaMatch

  const matchedCriteria = criteriaMatches.filter(c => c.matched).length
  const totalCriteria = criteriaMatches.length
  const matchRate = totalCriteria > 0 ? (matchedCriteria / totalCriteria) * 100 : 0

  // Top matches (sorted by contribution to score)
  const topMatches = [...criteriaMatches]
    .filter(c => c.matched)
    .sort((a, b) => b.contributionToScore - a.contributionToScore)
    .slice(0, 3)

  // Top misses (sorted by weight)
  const topMisses = [...criteriaMatches]
    .filter(c => !c.matched)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)

  return {
    totalCriteria,
    matchedCriteria,
    matchRate,
    topMatches,
    topMisses,
  }
}

/**
 * Format criteria match for display
 * @param criteriaMatch - Criteria match result
 * @returns Formatted string
 */
export function formatCriteriaMatch(criteriaMatch: CriteriaMatch): string {
  const { criterionName, matched, actualValue, targetValue, contributionToScore } = criteriaMatch

  const status = matched ? '✓' : '✗'
  const score = contributionToScore.toFixed(1)

  return `${status} ${criterionName}: ${actualValue} (target: ${JSON.stringify(targetValue)}) - ${score} points`
}
