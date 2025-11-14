/**
 * Company Report Generator
 *
 * Generates individual company reports with profile, persona match analysis,
 * actionable insights, and tier justification per FR-019
 */

import fs from 'fs/promises'
import path from 'path'
import type {
  Event,
  BadgeScan,
  EnrichedCompany,
  PersonaMatch,
  CompanyReport,
  LeadTier,
} from '@/lib/types'

/**
 * Generate individual company report markdown content
 */
export async function generateCompanyReport(
  event: Event,
  badgeScan: BadgeScan,
  enrichedCompany: EnrichedCompany | undefined,
  personaMatch: PersonaMatch | undefined
): Promise<string> {
  const tier = personaMatch?.tier || 'Unscored'

  // Split actionable insights into pain points and conversation starters
  const painPoints = personaMatch?.actionableInsights?.filter((i) =>
    i.toLowerCase().includes('pain')
  ) || []
  const conversationStarters = personaMatch?.actionableInsights?.filter((i) =>
    i.toLowerCase().includes('starter') || i.toLowerCase().includes('ask')
  ) || []

  // Calculate data coverage percentage
  const dataCoverage = enrichedCompany ? calculateDataCoverage(enrichedCompany) : 0

  // Prepare template data
  const templateData = {
    company_name: badgeScan.company,
    domain: enrichedCompany?.domain || 'N/A',
    industry: enrichedCompany?.industry || 'N/A',
    headquarters: enrichedCompany?.headquarters || 'N/A',

    employee_count: enrichedCompany?.employeeCount?.toLocaleString() || 'N/A',
    employee_range: enrichedCompany?.employeeRange || 'N/A',
    annual_revenue: enrichedCompany?.annualRevenue?.toLocaleString() || 'N/A',
    revenue_range: enrichedCompany?.revenueRange || 'N/A',

    funding_stage: enrichedCompany?.fundingStage || 'N/A',
    total_funding: enrichedCompany?.totalFunding
      ? `$${(enrichedCompany.totalFunding / 1000000).toFixed(1)}M`
      : 'N/A',
    founded_year: enrichedCompany?.founded || 'N/A',

    tech_stack: enrichedCompany?.techStack?.map((tech) => ({ technology: tech })) || [],

    social_links:
      enrichedCompany?.linkedinUrl || enrichedCompany?.twitterHandle
        ? {
            linkedin_url: enrichedCompany.linkedinUrl || 'N/A',
            twitter_handle: enrichedCompany.twitterHandle || 'N/A',
          }
        : null,

    contact_first_name: badgeScan.firstName || 'N/A',
    contact_last_name: badgeScan.lastName || 'N/A',
    contact_job_title: badgeScan.jobTitle || 'N/A',
    contact_email: badgeScan.email || 'N/A',
    contact_phone: badgeScan.phone || 'N/A',

    scanned_at: new Date(badgeScan.scannedAt).toLocaleString('en-US'),
    booth_location: badgeScan.boothLocation || 'N/A',
    notes: badgeScan.notes || 'N/A',
    event_name: event.name,

    fit_score: personaMatch?.fitScore?.toFixed(1) || 'N/A',
    tier: tier,

    criteria_matches: personaMatch?.criteriaMatches.map((cm) => ({
      criterion_name: cm.criterionName,
      matched: cm.matched,
      actual_value: formatValue(cm.actualValue),
      target_value: formatValue(cm.targetValue),
      weight: cm.weight.toFixed(2),
      contribution_to_score: cm.contributionToScore.toFixed(1),
    })) || [],

    tier_justification: generateTierJustification(personaMatch, enrichedCompany),

    tier_details: {
      is_hot: tier === 'Hot',
      is_warm: tier === 'Warm',
      is_cold: tier === 'Cold',
      is_unscored: tier === 'Unscored',
      fit_score: personaMatch?.fitScore?.toFixed(1) || 0,
    },

    pain_points: painPoints.map((p) => ({ pain_point: p })),
    conversation_starters: conversationStarters.map((s) => ({ starter: s })),

    value_props: generateValueProps(enrichedCompany, personaMatch),

    immediate_actions: generateImmediateActions(tier, badgeScan, personaMatch),
    follow_up_strategy: generateFollowUpStrategy(tier, badgeScan, enrichedCompany),

    target_response_rate: tier === 'Hot' ? 50 : tier === 'Warm' ? 30 : 15,
    conversion_timeline: tier === 'Hot' ? '2-4 weeks' : tier === 'Warm' ? '1-2 months' : '3-6 months',
    estimated_deal_value: estimateDealValue(enrichedCompany),

    additional_notes: badgeScan.notes
      ? { notes_content: badgeScan.notes }
      : null,

    company_id: enrichedCompany?.id || 'N/A',
    badge_scan_id: badgeScan.id,
    enrichment_source: enrichedCompany?.dataSource?.join(', ') || 'N/A',
    data_coverage: dataCoverage.toFixed(0),
    last_updated: new Date(badgeScan.updatedAt).toLocaleString('en-US'),
    generated_at: new Date().toLocaleString('en-US'),
  }

  // Load template and render
  const templatePath = path.join(process.cwd(), 'lib', 'templates', 'company-report.md')
  const template = await fs.readFile(templatePath, 'utf-8')

  return renderTemplate(template, templateData)
}

/**
 * Calculate data coverage percentage
 */
function calculateDataCoverage(enriched: EnrichedCompany): number {
  const fields = [
    'domain',
    'employeeCount',
    'industry',
    'annualRevenue',
    'headquarters',
    'fundingStage',
    'founded',
    'description',
    'techStack',
    'linkedinUrl',
  ]

  const filledFields = fields.filter((field) => {
    const value = (enriched as any)[field]
    if (Array.isArray(value)) return value.length > 0
    return value !== null && value !== undefined && value !== ''
  })

  return (filledFields.length / fields.length) * 100
}

/**
 * Generate tier justification
 */
function generateTierJustification(
  match: PersonaMatch | undefined,
  enriched: EnrichedCompany | undefined
): string {
  if (!match) return 'Insufficient enrichment data to calculate fit score (< 30% data coverage)'

  const fitScore = match.fitScore
  const matchedCriteria = match.criteriaMatches.filter((c) => c.matched)

  const reasons: string[] = []

  if (matchedCriteria.length > 0) {
    reasons.push(
      `Matches ${matchedCriteria.length} out of ${match.criteriaMatches.length} persona criteria`
    )
    const topMatches = matchedCriteria
      .slice(0, 3)
      .map((c) => c.criterionName)
      .join(', ')
    reasons.push(`Strong alignment on: ${topMatches}`)
  }

  if (enriched) {
    if (enriched.employeeCount) {
      reasons.push(`Company size of ${enriched.employeeCount.toLocaleString()} employees`)
    }
    if (enriched.revenueRange) {
      reasons.push(`Revenue range: ${enriched.revenueRange}`)
    }
    if (enriched.fundingStage && enriched.fundingStage !== 'Unknown') {
      reasons.push(`Funding stage: ${enriched.fundingStage}`)
    }
  }

  return reasons.join('. ') + '.'
}

/**
 * Generate value propositions based on company profile
 */
function generateValueProps(
  enriched: EnrichedCompany | undefined,
  match: PersonaMatch | undefined
): Array<{ title: string; description: string }> {
  const props: Array<{ title: string; description: string }> = []

  if (enriched?.employeeCount && enriched.employeeCount > 500) {
    props.push({
      title: 'Enterprise Scalability',
      description: 'Our solution scales with your organization size and complexity',
    })
  }

  if (enriched?.techStack && enriched.techStack.length > 0) {
    props.push({
      title: 'Technical Integration',
      description: `Seamless integration with your existing tech stack (${enriched.techStack.slice(0, 2).join(', ')})`,
    })
  }

  if (match && match.fitScore >= 70) {
    props.push({
      title: 'Proven Fit',
      description: 'High alignment with successful customers in similar industries',
    })
  }

  return props
}

/**
 * Generate immediate action items
 */
function generateImmediateActions(
  tier: LeadTier,
  scan: BadgeScan,
  match: PersonaMatch | undefined
): Array<{ action: string }> {
  const actions: Array<{ action: string }> = []

  if (tier === 'Hot') {
    actions.push({ action: 'Schedule personalized demo call within 24-48 hours' })
    actions.push({
      action: `Send personalized email referencing ${scan.eventName} conversation`,
    })
    if (match?.actionableInsights && match.actionableInsights.length > 0) {
      actions.push({
        action: `Prepare demo focusing on: ${match.actionableInsights[0]}`,
      })
    }
  } else if (tier === 'Warm') {
    actions.push({ action: 'Add to targeted email nurture sequence' })
    actions.push({ action: 'Follow up within 1-2 weeks with relevant case study' })
  } else if (tier === 'Cold') {
    actions.push({ action: 'Add to quarterly newsletter distribution list' })
    actions.push({ action: 'Monitor for trigger events (funding, expansion, job postings)' })
  } else {
    actions.push({ action: 'Conduct manual research to fill data gaps' })
    actions.push({ action: 'Reassess tier assignment after additional enrichment' })
  }

  return actions
}

/**
 * Generate follow-up strategy
 */
function generateFollowUpStrategy(
  tier: LeadTier,
  scan: BadgeScan,
  enriched: EnrichedCompany | undefined
): Array<{
  timing: string
  channel: string
  message: string
  objective: string
}> {
  const strategies: Array<{
    timing: string
    channel: string
    message: string
    objective: string
  }> = []

  if (tier === 'Hot') {
    strategies.push({
      timing: 'Within 24 hours',
      channel: 'Phone call + Email',
      message: `Hi ${scan.firstName || 'there'}, great meeting you at ${scan.eventName}. Let's discuss how we can help with [pain point]`,
      objective: 'Schedule discovery call',
    })
    strategies.push({
      timing: 'Day 3',
      channel: 'Personalized demo',
      message: 'Tailored demonstration addressing specific needs discussed',
      objective: 'Move to proposal stage',
    })
  } else if (tier === 'Warm') {
    strategies.push({
      timing: 'Within 1 week',
      channel: 'Email',
      message: 'Share relevant case study in similar industry',
      objective: 'Build credibility and interest',
    })
    strategies.push({
      timing: 'Week 2-3',
      channel: 'LinkedIn + Email',
      message: 'Invite to upcoming webinar or product demo',
      objective: 'Engage with educational content',
    })
  } else {
    strategies.push({
      timing: 'Monthly',
      channel: 'Email newsletter',
      message: 'Share industry insights and company updates',
      objective: 'Stay top-of-mind for future needs',
    })
  }

  return strategies
}

/**
 * Estimate deal value based on company size
 */
function estimateDealValue(enriched: EnrichedCompany | undefined): string {
  if (!enriched?.employeeCount) return 'TBD'

  if (enriched.employeeCount > 1000) return '$100K-$500K'
  if (enriched.employeeCount > 500) return '$50K-$150K'
  if (enriched.employeeCount > 200) return '$25K-$75K'
  if (enriched.employeeCount > 50) return '$10K-$30K'
  return '$5K-$15K'
}

/**
 * Format value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'N/A'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Simple template rendering
 */
function renderTemplate(template: string, data: any): string {
  let result = template

  // Handle single variables {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match
  })

  // Handle sections {{#array}}...{{/array}}
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const value = data[key]
    if (!value) return ''
    if (Array.isArray(value)) {
      return value.map((item) => renderTemplate(content, item)).join('')
    }
    if (typeof value === 'object') {
      return renderTemplate(content, value)
    }
    return value ? content : ''
  })

  // Handle inverted sections {{^array}}...{{/array}}
  result = result.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const value = data[key]
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return content
    }
    return ''
  })

  return result
}

/**
 * Save company report to file
 */
export async function saveCompanyReport(
  eventId: string,
  companyId: string,
  content: string,
  dataDir = './data'
): Promise<string> {
  const filePath = path.join(dataDir, 'events', eventId, 'companies', `${companyId}.md`)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
  return filePath
}
