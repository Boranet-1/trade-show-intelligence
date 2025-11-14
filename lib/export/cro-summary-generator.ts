/**
 * CRO Summary Generator
 *
 * Generates executive summary with top 10 Hot leads and recommended follow-up priorities
 * per FR-018
 */

import fs from 'fs/promises'
import path from 'path'
import type {
  Event,
  Report,
  BadgeScan,
  EnrichedCompany,
  PersonaMatch,
  CROSummary,
} from '@/lib/types'

/**
 * Generate CRO Summary markdown content
 */
export async function generateCROSummary(
  event: Event,
  report: Report,
  badgeScans: BadgeScan[],
  enrichedCompanies: Map<string, EnrichedCompany>,
  personaMatches: Map<string, PersonaMatch>
): Promise<string> {
  // Get top 10 Hot leads sorted by fit score
  const hotLeads = badgeScans
    .map((scan) => ({
      scan,
      enriched: enrichedCompanies.get(scan.id),
      match: personaMatches.get(scan.id),
    }))
    .filter(({ match }) => match?.tier === 'Hot')
    .sort((a, b) => (b.match?.fitScore || 0) - (a.match?.fitScore || 0))
    .slice(0, 10)

  // Prepare data for template
  const templateData = {
    event_name: event.name,
    generated_at: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    event_date: event.startDate
      ? new Date(event.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A',
    total_scans: report.statistics.totalScans,
    enriched_count: report.statistics.enrichedCount,
    enrichment_success_rate: report.statistics.enrichmentSuccessRate.toFixed(1),
    average_fit_score: report.statistics.averageFitScore.toFixed(1),

    hot_count: report.statistics.hotCount,
    warm_count: report.statistics.warmCount,
    cold_count: report.statistics.coldCount,
    unscored_count: report.statistics.unscoredCount,
    hot_percentage: ((report.statistics.hotCount / report.statistics.totalScans) * 100).toFixed(1),

    top_industries: report.statistics.topIndustries.map((item) => ({
      industry: item.industry,
      count: item.count,
    })),
    top_industry: report.statistics.topIndustries[0]?.industry || 'N/A',
    top_industry_count: report.statistics.topIndustries[0]?.count || 0,

    hot_leads: hotLeads.map(({ scan, enriched, match }, index) => ({
      rank: index + 1,
      company_name: scan.company,
      contact_name: [scan.firstName, scan.lastName].filter(Boolean).join(' ') || 'N/A',
      job_title: scan.jobTitle || 'N/A',
      email: scan.email || 'N/A',
      phone: scan.phone || 'N/A',
      fit_score: match?.fitScore?.toFixed(1) || 'N/A',

      industry: enriched?.industry || 'N/A',
      employee_count: enriched?.employeeCount?.toLocaleString() || 'N/A',
      revenue_range: enriched?.revenueRange || 'N/A',
      headquarters: enriched?.headquarters || 'N/A',
      tech_stack: enriched?.techStack?.join(', ') || 'N/A',

      key_insights: match?.actionableInsights?.map((insight) => ({ insight })) || [],

      tier_justification: generateTierJustification(match, enriched),
    })),

    hot_priorities: generatePriorities(hotLeads, 'Hot'),
    warm_priorities: generatePriorities(
      badgeScans
        .map((scan) => ({
          scan,
          enriched: enrichedCompanies.get(scan.id),
          match: personaMatches.get(scan.id),
        }))
        .filter(({ match }) => match?.tier === 'Warm')
        .sort((a, b) => (b.match?.fitScore || 0) - (a.match?.fitScore || 0))
        .slice(0, 5),
      'Warm'
    ),
    cold_priorities: generatePriorities(
      badgeScans
        .map((scan) => ({
          scan,
          enriched: enrichedCompanies.get(scan.id),
          match: personaMatches.get(scan.id),
        }))
        .filter(({ match }) => match?.tier === 'Cold')
        .sort((a, b) => (b.match?.fitScore || 0) - (a.match?.fitScore || 0))
        .slice(0, 3),
      'Cold'
    ),

    report_id: report.id,
    export_date: new Date().toISOString(),
  }

  // Load template and render
  const templatePath = path.join(process.cwd(), 'lib', 'templates', 'cro-summary.md')
  const template = await fs.readFile(templatePath, 'utf-8')

  return renderTemplate(template, templateData)
}

/**
 * Generate tier justification text
 */
function generateTierJustification(
  match: PersonaMatch | undefined,
  enriched: EnrichedCompany | undefined
): string {
  if (!match) return 'Insufficient data for tier assignment'

  const fitScore = match.fitScore || 0
  const reasons: string[] = []

  // Analyze criteria matches
  const matchedCriteria = match.criteriaMatches.filter((c) => c.matched)
  const criteriaSummary = matchedCriteria.map((c) => c.criterionName).join(', ')

  reasons.push(`Strong fit score of ${fitScore.toFixed(1)}% indicates excellent alignment with ideal customer profile`)

  if (matchedCriteria.length > 0) {
    reasons.push(`Matches ${matchedCriteria.length} key criteria: ${criteriaSummary}`)
  }

  if (enriched?.employeeCount && enriched.employeeCount > 500) {
    reasons.push(`Enterprise-scale company with ${enriched.employeeCount.toLocaleString()} employees`)
  }

  if (enriched?.techStack && enriched.techStack.length > 0) {
    reasons.push(`Uses modern tech stack including ${enriched.techStack.slice(0, 3).join(', ')}`)
  }

  return reasons.join('. ')
}

/**
 * Generate follow-up priorities
 */
function generatePriorities(
  leads: Array<{
    scan: BadgeScan
    enriched?: EnrichedCompany
    match?: PersonaMatch
  }>,
  tier: 'Hot' | 'Warm' | 'Cold'
): Array<{ company: string; action: string }> {
  const actionTemplates = {
    Hot: 'Schedule personalized demo call within 48 hours. Emphasize ',
    Warm: 'Send targeted email nurture sequence. Highlight ',
    Cold: 'Add to quarterly newsletter. Focus on ',
  }

  return leads.map(({ scan, enriched, match }) => {
    const painPoints = match?.actionableInsights?.filter((i) => i.includes('pain')) || []
    const focus = painPoints[0] || enriched?.industry || 'relevant use cases'

    return {
      company: scan.company,
      action: actionTemplates[tier] + focus,
    }
  })
}

/**
 * Simple template rendering (Mustache-style)
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
 * Save CRO summary to file
 */
export async function saveCROSummary(
  eventId: string,
  content: string,
  dataDir = './data'
): Promise<string> {
  const filePath = path.join(dataDir, 'events', eventId, 'CRO_summary.md')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
  return filePath
}
