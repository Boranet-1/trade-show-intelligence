/**
 * Persona Matcher Sub-Agent
 * Specialized agent for calculating fit scores and assigning lead tiers
 * Part of the hub-and-spoke architecture (Constitution VI)
 */

import type {
  EnrichedCompany,
  Persona,
  PersonaMatch,
  LeadTier,
  CriteriaMatch,
  BadgeScan,
} from '@/lib/types'

export interface PersonaMatchingResult {
  personaMatches: PersonaMatch[]
  bestMatch: PersonaMatch | null
  assignedTier: LeadTier
}

export class PersonaMatcherAgent {
  /**
   * Calculate persona fit scores for an enriched company
   * @param badgeScan Badge scan data
   * @param enrichedCompany Enriched company data
   * @param personas List of personas to match against
   * @returns Persona matching results with fit scores and tier assignment
   */
  async matchPersonas(
    badgeScan: BadgeScan,
    enrichedCompany: Partial<EnrichedCompany>,
    personas: Persona[]
  ): Promise<PersonaMatchingResult> {
    if (personas.length === 0) {
      throw new Error('No personas provided for matching')
    }

    const personaMatches = personas.map(persona =>
      this.calculatePersonaMatch(badgeScan, enrichedCompany, persona)
    )

    const bestMatch = this.getBestPersonaMatch(personaMatches)

    const assignedTier = bestMatch ? bestMatch.tier : 'Unscored'

    return {
      personaMatches,
      bestMatch,
      assignedTier,
    }
  }

  /**
   * Calculate fit score for a single persona
   */
  private calculatePersonaMatch(
    badgeScan: BadgeScan,
    enrichedCompany: Partial<EnrichedCompany>,
    persona: Persona
  ): PersonaMatch {
    const criteriaMatches = this.evaluateCriteria(enrichedCompany, badgeScan, persona)

    const totalWeightAvailable = criteriaMatches.reduce((sum, match) => sum + match.weight, 0)

    const totalScore = criteriaMatches
      .filter(match => match.matched)
      .reduce((sum, match) => sum + match.contributionToScore, 0)

    let fitScore = 0
    if (totalWeightAvailable > 0) {
      fitScore = (totalScore / totalWeightAvailable) * 100
    }

    const dataCoveragePercentage = this.calculateDataCoverage(enrichedCompany, persona)

    const tier = this.assignTier(fitScore, dataCoveragePercentage)

    return {
      id: this.generatePersonaMatchId(),
      badgeScanId: badgeScan.id,
      personaId: persona.id,
      fitScore: Math.round(fitScore * 100) / 100,
      tier,
      criteriaMatches,
      calculatedAt: new Date(),
    }
  }

  /**
   * Evaluate all criteria for a persona
   */
  private evaluateCriteria(
    enrichedCompany: Partial<EnrichedCompany>,
    badgeScan: BadgeScan,
    persona: Persona
  ): CriteriaMatch[] {
    const matches: CriteriaMatch[] = []

    if (persona.criteria.companySizeRange && persona.weights.companySize > 0) {
      matches.push(
        this.evaluateCompanySize(enrichedCompany, persona.criteria.companySizeRange, persona.weights.companySize)
      )
    }

    if (persona.criteria.industries && persona.criteria.industries.length > 0 && persona.weights.industry > 0) {
      matches.push(
        this.evaluateIndustry(enrichedCompany, persona.criteria.industries, persona.weights.industry)
      )
    }

    if (persona.criteria.technologies && persona.criteria.technologies.length > 0 && persona.weights.technology > 0) {
      matches.push(
        this.evaluateTechnology(enrichedCompany, persona.criteria.technologies, persona.weights.technology)
      )
    }

    if (persona.criteria.revenueRange && persona.weights.revenue > 0) {
      matches.push(
        this.evaluateRevenue(enrichedCompany, persona.criteria.revenueRange, persona.weights.revenue)
      )
    }

    if (persona.criteria.geographies && persona.criteria.geographies.length > 0 && persona.weights.geography > 0) {
      matches.push(
        this.evaluateGeography(enrichedCompany, persona.criteria.geographies, persona.weights.geography)
      )
    }

    if (persona.criteria.decisionMakerTitles && persona.criteria.decisionMakerTitles.length > 0 && persona.weights.decisionMaker > 0) {
      matches.push(
        this.evaluateDecisionMaker(badgeScan, persona.criteria.decisionMakerTitles, persona.weights.decisionMaker)
      )
    }

    if (persona.criteria.fundingStages && persona.criteria.fundingStages.length > 0 && persona.weights.fundingStage > 0) {
      matches.push(
        this.evaluateFundingStage(enrichedCompany, persona.criteria.fundingStages, persona.weights.fundingStage)
      )
    }

    return matches
  }

  /**
   * Evaluate company size criterion
   */
  private evaluateCompanySize(
    enrichedCompany: Partial<EnrichedCompany>,
    sizeRange: { min: number; max: number },
    weight: number
  ): CriteriaMatch {
    const employeeCount = enrichedCompany.employeeCount

    if (employeeCount === undefined || employeeCount === null) {
      return {
        criterionName: 'companySize',
        matched: false,
        actualValue: null,
        targetValue: sizeRange,
        weight,
        contributionToScore: 0,
      }
    }

    const matched = employeeCount >= sizeRange.min && employeeCount <= sizeRange.max

    return {
      criterionName: 'companySize',
      matched,
      actualValue: employeeCount,
      targetValue: sizeRange,
      weight,
      contributionToScore: matched ? weight : 0,
    }
  }

  /**
   * Evaluate industry criterion
   */
  private evaluateIndustry(
    enrichedCompany: Partial<EnrichedCompany>,
    targetIndustries: string[],
    weight: number
  ): CriteriaMatch {
    const industry = enrichedCompany.industry

    if (!industry) {
      return {
        criterionName: 'industry',
        matched: false,
        actualValue: null,
        targetValue: targetIndustries,
        weight,
        contributionToScore: 0,
      }
    }

    const normalizedIndustry = industry.toLowerCase()
    const matched = targetIndustries.some(target => normalizedIndustry.includes(target.toLowerCase()))

    return {
      criterionName: 'industry',
      matched,
      actualValue: industry,
      targetValue: targetIndustries,
      weight,
      contributionToScore: matched ? weight : 0,
    }
  }

  /**
   * Evaluate technology criterion
   */
  private evaluateTechnology(
    enrichedCompany: Partial<EnrichedCompany>,
    targetTechnologies: string[],
    weight: number
  ): CriteriaMatch {
    const techStack = enrichedCompany.techStack || []

    if (techStack.length === 0) {
      return {
        criterionName: 'technology',
        matched: false,
        actualValue: null,
        targetValue: targetTechnologies,
        weight,
        contributionToScore: 0,
      }
    }

    const normalizedTechStack = techStack.map(t => t.toLowerCase())
    const matchCount = targetTechnologies.filter(target =>
      normalizedTechStack.some(tech => tech.includes(target.toLowerCase()))
    ).length

    const matched = matchCount > 0
    const matchPercentage = matchCount / targetTechnologies.length
    const contribution = matched ? weight * matchPercentage : 0

    return {
      criterionName: 'technology',
      matched,
      actualValue: techStack,
      targetValue: targetTechnologies,
      weight,
      contributionToScore: contribution,
    }
  }

  /**
   * Evaluate revenue criterion
   */
  private evaluateRevenue(
    enrichedCompany: Partial<EnrichedCompany>,
    revenueRange: { min: number; max: number },
    weight: number
  ): CriteriaMatch {
    const annualRevenue = enrichedCompany.annualRevenue

    if (annualRevenue === undefined || annualRevenue === null) {
      return {
        criterionName: 'revenue',
        matched: false,
        actualValue: null,
        targetValue: revenueRange,
        weight,
        contributionToScore: 0,
      }
    }

    const matched = annualRevenue >= revenueRange.min && annualRevenue <= revenueRange.max

    return {
      criterionName: 'revenue',
      matched,
      actualValue: annualRevenue,
      targetValue: revenueRange,
      weight,
      contributionToScore: matched ? weight : 0,
    }
  }

  /**
   * Evaluate geography criterion
   */
  private evaluateGeography(
    enrichedCompany: Partial<EnrichedCompany>,
    targetGeographies: string[],
    weight: number
  ): CriteriaMatch {
    const headquarters = enrichedCompany.headquarters

    if (!headquarters) {
      return {
        criterionName: 'geography',
        matched: false,
        actualValue: null,
        targetValue: targetGeographies,
        weight,
        contributionToScore: 0,
      }
    }

    const normalizedHQ = headquarters.toLowerCase()
    const matched = targetGeographies.some(geo => normalizedHQ.includes(geo.toLowerCase()))

    return {
      criterionName: 'geography',
      matched,
      actualValue: headquarters,
      targetValue: targetGeographies,
      weight,
      contributionToScore: matched ? weight : 0,
    }
  }

  /**
   * Evaluate decision maker criterion
   */
  private evaluateDecisionMaker(
    badgeScan: BadgeScan,
    targetTitles: string[],
    weight: number
  ): CriteriaMatch {
    const jobTitle = badgeScan.jobTitle

    if (!jobTitle) {
      return {
        criterionName: 'decisionMaker',
        matched: false,
        actualValue: null,
        targetValue: targetTitles,
        weight,
        contributionToScore: 0,
      }
    }

    const normalizedTitle = jobTitle.toLowerCase()
    const matched = targetTitles.some(target => normalizedTitle.includes(target.toLowerCase()))

    return {
      criterionName: 'decisionMaker',
      matched,
      actualValue: jobTitle,
      targetValue: targetTitles,
      weight,
      contributionToScore: matched ? weight : 0,
    }
  }

  /**
   * Evaluate funding stage criterion
   */
  private evaluateFundingStage(
    enrichedCompany: Partial<EnrichedCompany>,
    targetStages: string[],
    weight: number
  ): CriteriaMatch {
    const fundingStage = enrichedCompany.fundingStage

    if (!fundingStage) {
      return {
        criterionName: 'fundingStage',
        matched: false,
        actualValue: null,
        targetValue: targetStages,
        weight,
        contributionToScore: 0,
      }
    }

    const matched = targetStages.includes(fundingStage)

    return {
      criterionName: 'fundingStage',
      matched,
      actualValue: fundingStage,
      targetValue: targetStages,
      weight,
      contributionToScore: matched ? weight : 0,
    }
  }

  /**
   * Calculate data coverage percentage (% of weighted criteria with data)
   */
  private calculateDataCoverage(enrichedCompany: Partial<EnrichedCompany>, persona: Persona): number {
    const totalWeight = Object.values(persona.weights).reduce((sum, w) => sum + w, 0)

    let weightWithData = 0

    if (persona.criteria.companySizeRange && enrichedCompany.employeeCount !== undefined) {
      weightWithData += persona.weights.companySize
    }

    if (persona.criteria.industries && enrichedCompany.industry) {
      weightWithData += persona.weights.industry
    }

    if (persona.criteria.technologies && enrichedCompany.techStack && enrichedCompany.techStack.length > 0) {
      weightWithData += persona.weights.technology
    }

    if (persona.criteria.revenueRange && enrichedCompany.annualRevenue !== undefined) {
      weightWithData += persona.weights.revenue
    }

    if (persona.criteria.geographies && enrichedCompany.headquarters) {
      weightWithData += persona.weights.geography
    }

    if (persona.criteria.fundingStages && enrichedCompany.fundingStage) {
      weightWithData += persona.weights.fundingStage
    }

    return totalWeight > 0 ? (weightWithData / totalWeight) * 100 : 0
  }

  /**
   * Assign tier based on fit score and data coverage (FR-004)
   * - Hot: >=70% criteria met
   * - Warm: 40-69% criteria met
   * - Cold: <40% criteria met
   * - Unscored: <30% data coverage
   */
  private assignTier(fitScore: number, dataCoveragePercentage: number): LeadTier {
    if (dataCoveragePercentage < 30) {
      return 'Unscored'
    }

    if (fitScore >= 70) {
      return 'Hot'
    } else if (fitScore >= 40) {
      return 'Warm'
    } else {
      return 'Cold'
    }
  }

  /**
   * Get the best persona match (highest fit score)
   */
  private getBestPersonaMatch(personaMatches: PersonaMatch[]): PersonaMatch | null {
    if (personaMatches.length === 0) {
      return null
    }

    return personaMatches.reduce((best, current) => {
      return current.fitScore > best.fitScore ? current : best
    })
  }

  /**
   * Generate unique ID for persona match record
   */
  private generatePersonaMatchId(): string {
    return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Create a Persona Matcher Agent instance
 */
export function createPersonaMatcherAgent(): PersonaMatcherAgent {
  return new PersonaMatcherAgent()
}
