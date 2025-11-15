/**
 * Company Summary Generator
 * Generates detailed markdown reports for individual companies
 */

import fs from 'fs/promises'
import path from 'path'
import type { BadgeScan, EnrichedCompany, MEDDICScore, PersonaMatch } from '../types'
import type { DeepEnrichmentResult } from '../enrichment/deep-enrichment-pipeline'
import type { EnhancedCompanyTierResult } from '../scoring/tier-calculator'
import type { ContactTierCalculationResult } from '../scoring/contact-tier-calculator'

export interface CompanySummaryData {
  company_name: string
  generated_at: string
  event_name: string
  event_date: string
  win_strategy: string
  opportunity_score: number
  persona_fit_score: number
  meddic_score: number
  engagement_score: number
  persona_fit_weight: number
  meddic_weight: number
  engagement_weight: number
  company_tier: string
  primary_contact_tier: string
  combined_tier: string
  next_steps: Array<{ index: number; step: string; timeline: string }>
  priority_contacts: Array<any>
  attendees: Array<any>
  missing_decision_makers: Array<any>
  industry: string
  employee_count?: number
  employee_range?: string
  annual_revenue?: string
  headquarters?: string
  founded?: number
  funding_stage?: string
  website?: string
  linkedin_url?: string
  tech_stack: string[]
  description?: string
  // MEDDIC fields
  metrics_score: number
  metrics_analysis: string
  economic_buyer_score: number
  economic_buyer_identified: boolean
  economic_buyer_name?: string
  economic_buyer_title?: string
  decision_criteria_score: number
  decision_process_score: number
  identify_pain_score: number
  champion_score: number
  pain_points: Array<any>
  competitors: Array<any>
  products_of_interest: Array<any>
  deal_value: string
  deal_value_methodology: string
  recent_news: Array<any>
  projects: Array<any>
  data_sources: Array<{ field: string; source: string; confidence: number }>
  data_quality_score: number
  report_id: string
}

export async function generateCompanySummaryMarkdown(
  badgeScan: BadgeScan,
  enrichedCompany: EnrichedCompany,
  deepEnrichment: DeepEnrichmentResult,
  companyTier: EnhancedCompanyTierResult,
  contactTiers: Map<string, ContactTierCalculationResult>,
  additionalContacts: BadgeScan[],
  eventName: string,
  eventDate: string
): Promise<string> {
  // Load template
  const templatePath = path.join(process.cwd(), 'lib', 'templates', 'company-summary.md')
  const template = await fs.readFile(templatePath, 'utf-8')

  // Build summary data
  const primaryContactTier = contactTiers.get(badgeScan.id)
  const meddic = deepEnrichment.meddic_score
  const webIntel = deepEnrichment.webIntelligence

  const data: CompanySummaryData = {
    company_name: badgeScan.company,
    generated_at: new Date().toISOString(),
    event_name: eventName,
    event_date: eventDate,
    win_strategy: meddic?.engagementStrategy || 'Not available',
    opportunity_score: companyTier.score,
    persona_fit_score: companyTier.breakdown.persona_fit_score,
    meddic_score: meddic?.overallScore || 0,
    engagement_score: companyTier.breakdown.engagement_score,
    persona_fit_weight: 40,
    meddic_weight: 35,
    engagement_weight: 25,
    company_tier: companyTier.tier,
    primary_contact_tier: primaryContactTier?.tier || 'Unscored',
    combined_tier: companyTier.tier, // Simplified
    next_steps: generateNextSteps(meddic),
    priority_contacts: buildPriorityContacts([badgeScan, ...additionalContacts], contactTiers, meddic),
    attendees: buildAttendeesList([badgeScan, ...additionalContacts], contactTiers),
    missing_decision_makers: meddic?.missingDecisionMakers.map((m, i) => ({
      role: m.role,
      suggested_title: m.title,
      found_name: m.name || 'Not found',
      linkedin_url: m.linkedinUrl || '',
      recommendation: `Research and connect via LinkedIn`
    })) || [],
    industry: enrichedCompany.industry || 'Unknown',
    employee_count: enrichedCompany.employeeCount,
    employee_range: enrichedCompany.employeeRange,
    annual_revenue: enrichedCompany.annualRevenue,
    headquarters: enrichedCompany.headquarters,
    founded: enrichedCompany.founded,
    funding_stage: enrichedCompany.fundingStage,
    website: enrichedCompany.companyName ? `https://www.${enrichedCompany.companyName.toLowerCase().replace(/\s+/g, '')}.com` : undefined,
    linkedin_url: enrichedCompany.linkedinUrl,
    tech_stack: webIntel?.technologies || enrichedCompany.techStack || [],
    description: enrichedCompany.description,
    metrics_score: meddic?.metricsScore || 0,
    metrics_analysis: generateMetricsAnalysis(enrichedCompany, webIntel),
    economic_buyer_score: meddic?.economicBuyerScore || 0,
    economic_buyer_identified: !!meddic?.economicBuyer,
    economic_buyer_name: meddic?.economicBuyer?.name,
    economic_buyer_title: meddic?.economicBuyer?.title,
    decision_criteria_score: meddic?.decisionCriteriaScore || 0,
    decision_process_score: meddic?.decisionProcessScore || 0,
    identify_pain_score: meddic?.identifyPainScore || 0,
    champion_score: meddic?.championScore || 0,
    pain_points: (webIntel?.painPoints || []).map((p, i) => ({
      pain_point: p,
      source: 'Website analysis',
      severity: 'Medium',
      evidence: p
    })),
    competitors: (webIntel?.competitors || []).map(c => ({
      competitor: c,
      context: 'Mentioned on website'
    })),
    products_of_interest: [],
    deal_value: calculateDealValue(enrichedCompany),
    deal_value_methodology: 'Based on company size and industry averages',
    recent_news: (webIntel?.recentNews || []).map((n, i) => ({
      date: 'Recent',
      title: n,
      summary: n,
      relevance: 'Company activity',
      source_url: '#'
    })),
    projects: (webIntel?.projects || []).map(p => ({
      project_name: p,
      description: p,
      timeline: 'Unknown',
      budget_indicator: 'Unknown'
    })),
    data_sources: buildDataSources(deepEnrichment),
    data_quality_score: deepEnrichment.overallConfidence,
    report_id: `comp_${badgeScan.id}_${Date.now()}`
  }

  // Simple template replacement
  return replaceTemplateVariables(template, data)
}

function generateNextSteps(meddic?: MEDDICScore): Array<{ index: number; step: string; timeline: string }> {
  if (!meddic) return []

  const steps = meddic.engagementStrategy.split('\n\n').map((s, i) => ({
    index: i + 1,
    step: s.replace(/^\*\*.*?\*\*:\s*/, ''),
    timeline: i === 0 ? 'This week' : i === 1 ? 'Next 2 weeks' : 'Next month'
  }))

  return steps.slice(0, 5)
}

function buildPriorityContacts(
  contacts: BadgeScan[],
  tiers: Map<string, ContactTierCalculationResult>,
  meddic?: MEDDICScore
): Array<any> {
  return contacts.slice(0, 3).map(c => {
    const tier = tiers.get(c.id)
    return {
      name: `${c.firstName} ${c.lastName}`.trim(),
      title: c.jobTitle || 'Unknown',
      meddic_role: tier?.meddic_role || 'UNKNOWN',
      linkedin_url: '',
      email: c.email,
      phone: c.phone,
      contact_reason: tier?.tier === 'Hot' ? 'High-priority decision maker' : 'Key contact'
    }
  })
}

function buildAttendeesList(
  contacts: BadgeScan[],
  tiers: Map<string, ContactTierCalculationResult>
): Array<any> {
  return contacts.map(c => {
    const tier = tiers.get(c.id)
    return {
      name: `${c.firstName} ${c.lastName}`.trim(),
      title: c.jobTitle || 'Unknown',
      meddic_role: tier?.meddic_role || 'UNKNOWN',
      contact_tier: tier?.tier || 'Unscored',
      scan_time: new Date(c.scannedAt).toLocaleString(),
      booth_location: c.boothLocation || 'Not recorded',
      sales_notes: c.notes || 'None'
    }
  })
}

function generateMetricsAnalysis(company: EnrichedCompany, webIntel?: any): string {
  const parts = []

  if (company.employeeCount) {
    parts.push(`Company has ${company.employeeCount} employees`)
  }
  if (company.annualRevenue) {
    parts.push(`Annual revenue of ${company.annualRevenue}`)
  }
  if (webIntel?.projects?.length) {
    parts.push(`${webIntel.projects.length} active projects identified`)
  }

  return parts.join('. ') || 'Limited metrics data available'
}

function calculateDealValue(company: EnrichedCompany): string {
  if (!company.employeeCount) return 'Not estimated'

  // Simple estimation: $1k per employee
  const estimate = company.employeeCount * 1000

  if (estimate >= 1000000) {
    return `${(estimate / 1000000).toFixed(1)}M`
  } else if (estimate >= 1000) {
    return `${(estimate / 1000).toFixed(0)}K`
  }
  return `${estimate}`
}

function buildDataSources(enrichment: DeepEnrichmentResult): Array<{ field: string; source: string; confidence: number }> {
  const sources: Array<{ field: string; source: string; confidence: number }> = []

  for (const [field, source] of Object.entries(enrichment.sourceAttribution)) {
    sources.push({
      field,
      source,
      confidence: 85
    })
  }

  return sources
}

function replaceTemplateVariables(template: string, data: any): string {
  let result = template

  // Replace simple variables
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, String(value))
    }
  }

  // Replace arrays with loops
  result = result.replace(/{{#each\s+(\w+)}}(.*?){{\/each}}/gs, (match, arrayName, content) => {
    const array = data[arrayName]
    if (!Array.isArray(array)) return ''

    return array.map((item, index) => {
      let itemContent = content
      // Replace {{index}}
      itemContent = itemContent.replace(/{{index}}/g, String(index + 1))
      // Replace item properties
      for (const [key, value] of Object.entries(item)) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        itemContent = itemContent.replace(regex, String(value))
      }
      return itemContent
    }).join('\n')
  })

  // Replace conditionals
  result = result.replace(/{{#if\s+(\w+)}}(.*?)(?:{{else}}(.*?))?{{\/if}}/gs, (match, condition, ifContent, elseContent = '') => {
    return data[condition] ? ifContent : elseContent
  })

  // Clean up remaining unmatched variables
  result = result.replace(/{{.*?}}/g, 'Not available')

  return result
}
