/**
 * MEDDIC Scoring Calculator
 *
 * Calculates MEDDIC scores for companies and contacts based on collected data.
 * MEDDIC Framework:
 * - Metrics: Measurable gain or economic benefit
 * - Economic Buyer: Person with final authority to approve purchase
 * - Decision Criteria: Objective criteria for evaluating solutions
 * - Decision Process: Steps to make final purchase decision
 * - Identify Pain: Specific business problems to address
 * - Champion: Internal advocate for your solution
 */

import { MEDDICScore, EnrichedCompany, BadgeScan } from '../types'

/**
 * MEDDIC dimension weights (must sum to 1.0)
 *
 * These weights determine the contribution of each dimension to the overall score.
 * Adjust based on your sales methodology and industry.
 */
export const DEFAULT_MEDDIC_WEIGHTS = {
  metrics: 0.20,        // Quantifiable business impact
  economicBuyer: 0.25,  // Decision authority identified (highest weight)
  decisionCriteria: 0.15, // Evaluation criteria known
  decisionProcess: 0.10,  // Buying process understood
  identifyPain: 0.20,     // Pain points validated
  champion: 0.10          // Internal advocate found
} as const

/**
 * Economic Buyer title patterns (ranked by decision authority)
 */
const ECONOMIC_BUYER_TITLES = {
  CEO: 100,
  CFO: 100,
  President: 100,
  'Chief Executive': 100,
  'Chief Financial': 100,
  Owner: 100,
  Founder: 95,
  'Managing Director': 95,
  'General Manager': 90,
  VP: 80,
  'Vice President': 80,
  Director: 70,
  'Head of': 65,
  Manager: 50,
  Lead: 40,
  Coordinator: 30,
  Analyst: 20,
  Associate: 20
}

/**
 * Champion title patterns (ranked by influence)
 */
const CHAMPION_TITLES = {
  'Product Manager': 85,
  'Product Owner': 85,
  'Technical Lead': 80,
  Architect: 80,
  'Engineering Manager': 75,
  'Project Manager': 70,
  'Senior Engineer': 65,
  'Principal': 70,
  'Team Lead': 60,
  Manager: 55,
  Engineer: 50,
  Developer: 50
}

/**
 * Decision maker role categories for MEDDIC
 */
export const DECISION_MAKER_ROLES = {
  ECONOMIC_BUYER: 'Economic Buyer',
  CHAMPION: 'Champion',
  TECHNICAL_BUYER: 'Technical Buyer',
  INFLUENCER: 'Influencer',
  END_USER: 'End User'
} as const

/**
 * Calculate MEDDIC score for a company based on enriched data
 */
export async function calculateMEDDICScore(params: {
  badgeScan: BadgeScan
  enrichedCompany?: EnrichedCompany
  additionalContacts?: BadgeScan[]
  webIntelligence?: {
    painPoints?: string[]
    competitors?: string[]
    recentNews?: string[]
    techStack?: string[]
    projects?: string[]
  }
  weights?: typeof DEFAULT_MEDDIC_WEIGHTS
}): Promise<MEDDICScore> {
  const {
    badgeScan,
    enrichedCompany,
    additionalContacts = [],
    webIntelligence = {},
    weights = DEFAULT_MEDDIC_WEIGHTS
  } = params

  // Calculate individual dimension scores
  const metricsScore = calculateMetricsScore(enrichedCompany, webIntelligence)
  const economicBuyerScore = calculateEconomicBuyerScore(badgeScan, additionalContacts)
  const decisionCriteriaScore = calculateDecisionCriteriaScore(webIntelligence)
  const decisionProcessScore = calculateDecisionProcessScore(enrichedCompany, webIntelligence)
  const identifyPainScore = calculateIdentifyPainScore(webIntelligence)
  const championScore = calculateChampionScore(badgeScan, additionalContacts)

  // Calculate weighted overall score
  const overallScore = Math.round(
    metricsScore * weights.metrics +
    economicBuyerScore * weights.economicBuyer +
    decisionCriteriaScore * weights.decisionCriteria +
    decisionProcessScore * weights.decisionProcess +
    identifyPainScore * weights.identifyPain +
    championScore * weights.champion
  )

  // Determine qualification status
  let qualificationStatus: 'Qualified' | 'Developing' | 'Unqualified'
  if (overallScore >= 70) {
    qualificationStatus = 'Qualified'
  } else if (overallScore >= 40) {
    qualificationStatus = 'Developing'
  } else {
    qualificationStatus = 'Unqualified'
  }

  // Identify economic buyer and champion
  const allContacts = [badgeScan, ...additionalContacts]
  const economicBuyer = identifyEconomicBuyer(allContacts)
  const champion = identifyChampion(allContacts)

  // Identify missing decision makers
  const missingDecisionMakers = identifyMissingDecisionMakers(
    allContacts,
    enrichedCompany
  )

  // Generate engagement strategy
  const engagementStrategy = generateEngagementStrategy({
    overallScore,
    economicBuyer,
    champion,
    missingDecisionMakers,
    painPoints: webIntelligence.painPoints || []
  })

  return {
    id: `meddic_${badgeScan.id}_${Date.now()}`,
    badgeScanId: badgeScan.id,
    companyId: badgeScan.company,
    metricsScore,
    economicBuyerScore,
    decisionCriteriaScore,
    decisionProcessScore,
    identifyPainScore,
    championScore,
    overallScore,
    qualificationStatus,
    economicBuyer,
    champion,
    missingDecisionMakers,
    engagementStrategy,
    calculatedAt: new Date(),
    calculatedBy: 'meddic-calculator'
  }
}

/**
 * Metrics: Calculate score based on company size and potential deal value
 */
function calculateMetricsScore(
  enrichedCompany?: EnrichedCompany,
  webIntelligence?: { projects?: string[] }
): number {
  let score = 0

  // Company size indicates budget capacity (40 points)
  if (enrichedCompany?.employeeCount) {
    if (enrichedCompany.employeeCount >= 10000) score += 40
    else if (enrichedCompany.employeeCount >= 1000) score += 35
    else if (enrichedCompany.employeeCount >= 500) score += 30
    else if (enrichedCompany.employeeCount >= 100) score += 25
    else if (enrichedCompany.employeeCount >= 50) score += 20
    else score += 10
  }

  // Revenue indicates purchasing power (40 points)
  if (enrichedCompany?.annualRevenue) {
    const revenue = parseRevenueString(enrichedCompany.annualRevenue)
    if (revenue >= 1000000000) score += 40 // $1B+
    else if (revenue >= 100000000) score += 35 // $100M+
    else if (revenue >= 50000000) score += 30 // $50M+
    else if (revenue >= 10000000) score += 25 // $10M+
    else if (revenue >= 1000000) score += 20 // $1M+
    else score += 10
  }

  // Active projects indicate buying intent (20 points)
  if (webIntelligence?.projects && webIntelligence.projects.length > 0) {
    score += Math.min(webIntelligence.projects.length * 5, 20)
  }

  return Math.min(score, 100)
}

/**
 * Economic Buyer: Score based on decision authority of contacts
 */
function calculateEconomicBuyerScore(
  badgeScan: BadgeScan,
  additionalContacts: BadgeScan[]
): number {
  const allContacts = [badgeScan, ...additionalContacts]

  // Find highest-ranking contact
  let maxScore = 0
  for (const contact of allContacts) {
    const titleScore = getTitleScore(contact.jobTitle || '', ECONOMIC_BUYER_TITLES)
    if (titleScore > maxScore) {
      maxScore = titleScore
    }
  }

  // Multiple decision-makers boost confidence
  const decisionMakerCount = allContacts.filter(c =>
    getTitleScore(c.jobTitle || '', ECONOMIC_BUYER_TITLES) >= 70
  ).length

  if (decisionMakerCount >= 2) {
    maxScore = Math.min(maxScore + 10, 100)
  }

  return maxScore
}

/**
 * Decision Criteria: Score based on competitive intelligence
 */
function calculateDecisionCriteriaScore(
  webIntelligence?: { competitors?: string[]; techStack?: string[] }
): number {
  let score = 0

  // Competitor awareness indicates defined criteria (50 points)
  if (webIntelligence?.competitors && webIntelligence.competitors.length > 0) {
    score += Math.min(webIntelligence.competitors.length * 15, 50)
  }

  // Tech stack indicates technical requirements (50 points)
  if (webIntelligence?.techStack && webIntelligence.techStack.length > 0) {
    score += Math.min(webIntelligence.techStack.length * 10, 50)
  }

  return Math.min(score, 100)
}

/**
 * Decision Process: Score based on company maturity and news
 */
function calculateDecisionProcessScore(
  enrichedCompany?: EnrichedCompany,
  webIntelligence?: { recentNews?: string[] }
): number {
  let score = 0

  // Established companies have defined processes (50 points)
  if (enrichedCompany?.founded) {
    const age = new Date().getFullYear() - enrichedCompany.founded
    if (age >= 20) score += 50
    else if (age >= 10) score += 40
    else if (age >= 5) score += 30
    else score += 20
  }

  // Funding stage indicates process maturity (30 points)
  if (enrichedCompany?.fundingStage) {
    const stage = enrichedCompany.fundingStage.toLowerCase()
    if (stage.includes('ipo') || stage.includes('public')) score += 30
    else if (stage.includes('series d') || stage.includes('series e')) score += 25
    else if (stage.includes('series c')) score += 20
    else if (stage.includes('series b')) score += 15
    else score += 10
  }

  // Recent news indicates active decision-making (20 points)
  if (webIntelligence?.recentNews && webIntelligence.recentNews.length > 0) {
    score += Math.min(webIntelligence.recentNews.length * 5, 20)
  }

  return Math.min(score, 100)
}

/**
 * Identify Pain: Score based on pain points discovered
 */
function calculateIdentifyPainScore(
  webIntelligence?: { painPoints?: string[] }
): number {
  if (!webIntelligence?.painPoints || webIntelligence.painPoints.length === 0) {
    return 0
  }

  // Each validated pain point adds to score
  const baseScore = Math.min(webIntelligence.painPoints.length * 25, 100)

  return baseScore
}

/**
 * Champion: Score based on technical/product contacts
 */
function calculateChampionScore(
  badgeScan: BadgeScan,
  additionalContacts: BadgeScan[]
): number {
  const allContacts = [badgeScan, ...additionalContacts]

  // Find highest-ranking potential champion
  let maxScore = 0
  for (const contact of allContacts) {
    const titleScore = getTitleScore(contact.jobTitle || '', CHAMPION_TITLES)
    if (titleScore > maxScore) {
      maxScore = titleScore
    }
  }

  // Multiple potential champions boost score
  const championCount = allContacts.filter(c =>
    getTitleScore(c.jobTitle || '', CHAMPION_TITLES) >= 60
  ).length

  if (championCount >= 2) {
    maxScore = Math.min(maxScore + 15, 100)
  }

  return maxScore
}

/**
 * Identify the economic buyer from contacts
 */
function identifyEconomicBuyer(
  contacts: BadgeScan[]
): MEDDICScore['economicBuyer'] | undefined {
  let bestMatch: BadgeScan | null = null
  let bestScore = 0

  for (const contact of contacts) {
    const score = getTitleScore(contact.jobTitle || '', ECONOMIC_BUYER_TITLES)
    if (score > bestScore) {
      bestScore = score
      bestMatch = contact
    }
  }

  if (!bestMatch || bestScore < 50) {
    return undefined
  }

  return {
    name: `${bestMatch.firstName} ${bestMatch.lastName}`.trim(),
    title: bestMatch.jobTitle,
    linkedinUrl: undefined, // Will be populated by LinkedIn scraper
    confidence: bestScore / 100
  }
}

/**
 * Identify the champion from contacts
 */
function identifyChampion(
  contacts: BadgeScan[]
): MEDDICScore['champion'] | undefined {
  let bestMatch: BadgeScan | null = null
  let bestScore = 0

  for (const contact of contacts) {
    const score = getTitleScore(contact.jobTitle || '', CHAMPION_TITLES)
    if (score > bestScore) {
      bestScore = score
      bestMatch = contact
    }
  }

  if (!bestMatch || bestScore < 40) {
    return undefined
  }

  return {
    name: `${bestMatch.firstName} ${bestMatch.lastName}`.trim(),
    title: bestMatch.jobTitle,
    linkedinUrl: undefined, // Will be populated by LinkedIn scraper
    confidence: bestScore / 100
  }
}

/**
 * Identify missing decision makers based on org structure
 */
function identifyMissingDecisionMakers(
  contacts: BadgeScan[],
  enrichedCompany?: EnrichedCompany
): MEDDICScore['missingDecisionMakers'] {
  const missing: MEDDICScore['missingDecisionMakers'] = []

  // Required roles for complete MEDDIC
  const requiredRoles = [
    { role: DECISION_MAKER_ROLES.ECONOMIC_BUYER, title: 'CEO / CFO / President' },
    { role: DECISION_MAKER_ROLES.CHAMPION, title: 'Product Manager / Technical Lead' },
    { role: DECISION_MAKER_ROLES.TECHNICAL_BUYER, title: 'CTO / VP Engineering / Architect' }
  ]

  const contactTitles = contacts.map(c => (c.jobTitle || '').toLowerCase())

  for (const required of requiredRoles) {
    const foundMatch = contactTitles.some(title => {
      const requiredTitlePatterns = required.title.toLowerCase().split(' / ')
      return requiredTitlePatterns.some(pattern => title.includes(pattern))
    })

    if (!foundMatch) {
      missing.push({
        role: required.role,
        title: required.title,
        foundViaResearch: false
      })
    }
  }

  return missing
}

/**
 * Generate engagement strategy based on MEDDIC analysis
 */
function generateEngagementStrategy(params: {
  overallScore: number
  economicBuyer?: MEDDICScore['economicBuyer']
  champion?: MEDDICScore['champion']
  missingDecisionMakers: MEDDICScore['missingDecisionMakers']
  painPoints: string[]
}): string {
  const { overallScore, economicBuyer, champion, missingDecisionMakers, painPoints } = params
  const strategies: string[] = []

  // Primary contact strategy
  if (economicBuyer) {
    strategies.push(`**Primary Contact**: Engage ${economicBuyer.name} (${economicBuyer.title}) as the Economic Buyer. Focus on ROI, business metrics, and executive-level value proposition.`)
  } else {
    strategies.push(`**Find Economic Buyer**: None identified at event. Research and connect with C-level decision maker (CEO, CFO, or President).`)
  }

  // Champion development
  if (champion) {
    strategies.push(`**Champion**: Build relationship with ${champion.name} (${champion.title}). Share technical resources, case studies, and enable them to advocate internally.`)
  } else {
    strategies.push(`**Develop Champion**: Identify technical or product stakeholder who can champion your solution internally.`)
  }

  // Address missing decision makers
  if (missingDecisionMakers.length > 0) {
    const missingRoles = missingDecisionMakers.map(m => m.role).join(', ')
    strategies.push(`**Expand Network**: Missing key decision makers (${missingRoles}). Use LinkedIn and mutual connections to gain introductions.`)
  }

  // Pain point alignment
  if (painPoints.length > 0) {
    strategies.push(`**Value Proposition**: Lead with solutions to identified pain points: ${painPoints.slice(0, 2).join(', ')}.`)
  } else {
    strategies.push(`**Discovery**: Schedule discovery call to uncover pain points and business challenges.`)
  }

  // Timeline strategy
  if (overallScore >= 70) {
    strategies.push(`**Next Steps**: High qualification score. Move quickly to proposal stage within 2-3 weeks.`)
  } else if (overallScore >= 40) {
    strategies.push(`**Next Steps**: Developing opportunity. Nurture with value-add content, case studies, and regular touchpoints over 4-8 weeks.`)
  } else {
    strategies.push(`**Next Steps**: Low qualification. Focus on education and relationship-building. Revisit in 3-6 months.`)
  }

  return strategies.join('\n\n')
}

/**
 * Get score for a job title based on pattern matching
 */
function getTitleScore(jobTitle: string, patterns: Record<string, number>): number {
  const lowerTitle = jobTitle.toLowerCase()

  for (const [pattern, score] of Object.entries(patterns)) {
    if (lowerTitle.includes(pattern.toLowerCase())) {
      return score
    }
  }

  return 0
}

/**
 * Parse revenue string to number (handles $10M, $1.5B formats)
 */
function parseRevenueString(revenue: string): number {
  const cleanRevenue = revenue.replace(/[^0-9.KMB]/gi, '').toUpperCase()

  let multiplier = 1
  if (cleanRevenue.includes('K')) multiplier = 1000
  else if (cleanRevenue.includes('M')) multiplier = 1000000
  else if (cleanRevenue.includes('B')) multiplier = 1000000000

  const numericValue = parseFloat(cleanRevenue.replace(/[KMB]/g, ''))
  return isNaN(numericValue) ? 0 : numericValue * multiplier
}

/**
 * Recalculate MEDDIC score with custom weights
 */
export async function recalculateMEDDICWithWeights(
  existingScore: MEDDICScore,
  customWeights: typeof DEFAULT_MEDDIC_WEIGHTS
): Promise<MEDDICScore> {
  // Validate weights sum to 1.0
  const weightSum = Object.values(customWeights).reduce((sum, w) => sum + w, 0)
  if (Math.abs(weightSum - 1.0) > 0.01) {
    throw new Error(`MEDDIC weights must sum to 1.0, got ${weightSum}`)
  }

  // Recalculate overall score with new weights
  const newOverallScore = Math.round(
    existingScore.metricsScore * customWeights.metrics +
    existingScore.economicBuyerScore * customWeights.economicBuyer +
    existingScore.decisionCriteriaScore * customWeights.decisionCriteria +
    existingScore.decisionProcessScore * customWeights.decisionProcess +
    existingScore.identifyPainScore * customWeights.identifyPain +
    existingScore.championScore * customWeights.champion
  )

  // Determine new qualification status
  let qualificationStatus: 'Qualified' | 'Developing' | 'Unqualified'
  if (newOverallScore >= 70) {
    qualificationStatus = 'Qualified'
  } else if (newOverallScore >= 40) {
    qualificationStatus = 'Developing'
  } else {
    qualificationStatus = 'Unqualified'
  }

  return {
    ...existingScore,
    overallScore: newOverallScore,
    qualificationStatus,
    calculatedAt: new Date()
  }
}
