/**
 * Markdown Report Service
 * Orchestrates generation and storage of all 4 markdown report types
 */

import { getActiveStorageAdapter } from '@/lib/storage'
import { generateCompanySummaryMarkdown } from '@/lib/export/company-summary-generator'
import { generateContactSummaryMarkdown } from '@/lib/export/contact-summary-generator'
import { generateMergedReportMarkdown } from '@/lib/export/merged-report-generator'
import type {
  BadgeScan,
  EnrichedCompany,
  MarkdownReport,
  ReportType,
  Event,
} from '@/lib/types'
import type { DeepEnrichmentResult } from '@/lib/enrichment/deep-enrichment-pipeline'
import type { EnhancedCompanyTierResult } from '@/lib/scoring/tier-calculator'
import type { ContactTierCalculationResult } from '@/lib/scoring/contact-tier-calculator'

/**
 * Generate and save company summary markdown report
 */
export async function generateAndSaveCompanySummary(params: {
  badgeScan: BadgeScan
  enrichedCompany: EnrichedCompany
  deepEnrichment: DeepEnrichmentResult
  companyTier: EnhancedCompanyTierResult
  contactTiers: Map<string, ContactTierCalculationResult>
  additionalContacts: BadgeScan[]
  event: Event
}): Promise<MarkdownReport> {
  const storage = await getActiveStorageAdapter()

  // Generate markdown content
  const markdownContent = await generateCompanySummaryMarkdown(
    params.badgeScan,
    params.enrichedCompany,
    params.deepEnrichment,
    params.companyTier,
    params.contactTiers,
    params.additionalContacts,
    params.event.name,
    params.event.startDate?.toISOString() || new Date().toISOString()
  )

  // Create markdown report record
  const report: MarkdownReport = {
    id: crypto.randomUUID(),
    reportType: 'CompanySummary',
    eventId: params.event.id,
    badgeScanId: params.badgeScan.id,
    markdownContent,
    generatedAt: new Date(),
    version: 1,
    metadata: {
      companyName: params.badgeScan.company,
      totalContacts: params.additionalContacts.length + 1,
      tierCounts: {
        hot: Array.from(params.contactTiers.values()).filter((t) => t.tier === 'Hot').length,
        warm: Array.from(params.contactTiers.values()).filter((t) => t.tier === 'Warm').length,
        cold: Array.from(params.contactTiers.values()).filter((t) => t.tier === 'Cold').length,
      },
    },
  }

  // Save to storage
  await storage.saveMarkdownReport(report)

  return report
}

/**
 * Generate and save contact summary markdown report
 */
export async function generateAndSaveContactSummary(params: {
  badgeScan: BadgeScan
  contactTier: ContactTierCalculationResult
  companyTier: string
  event: Event
}): Promise<MarkdownReport> {
  const storage = await getActiveStorageAdapter()

  // Generate markdown content
  const markdownContent = await generateContactSummaryMarkdown(
    params.badgeScan,
    params.contactTier,
    params.companyTier,
    params.event.name,
    params.event.startDate?.toISOString() || new Date().toISOString()
  )

  // Create markdown report record
  const report: MarkdownReport = {
    id: crypto.randomUUID(),
    reportType: 'ContactSummary',
    eventId: params.event.id,
    badgeScanId: params.badgeScan.id,
    markdownContent,
    generatedAt: new Date(),
    version: 1,
    metadata: {
      contactName: `${params.badgeScan.firstName} ${params.badgeScan.lastName}`.trim(),
      companyName: params.badgeScan.company,
    },
  }

  // Save to storage
  await storage.saveMarkdownReport(report)

  return report
}

/**
 * Generate and save merged report (company + all contacts)
 */
export async function generateAndSaveMergedReport(params: {
  companySummaryMarkdown: string
  contactSummaryMarkdowns: string[]
  companyName: string
  eventName: string
  totalContacts: number
  tierCounts: { hot: number; warm: number; cold: number }
  event: Event
  badgeScanId: string
}): Promise<MarkdownReport> {
  const storage = await getActiveStorageAdapter()

  // Generate markdown content
  const markdownContent = await generateMergedReportMarkdown(
    params.companySummaryMarkdown,
    params.contactSummaryMarkdowns,
    params.companyName,
    params.eventName,
    params.totalContacts,
    params.tierCounts
  )

  // Create markdown report record
  const report: MarkdownReport = {
    id: crypto.randomUUID(),
    reportType: 'MergedReport',
    eventId: params.event.id,
    badgeScanId: params.badgeScanId,
    markdownContent,
    generatedAt: new Date(),
    version: 1,
    metadata: {
      companyName: params.companyName,
      totalContacts: params.totalContacts,
      tierCounts: params.tierCounts,
    },
  }

  // Save to storage
  await storage.saveMarkdownReport(report)

  return report
}

/**
 * Generate and save CRO summary for entire event
 */
export async function generateAndSaveCROSummary(params: {
  event: Event
  allBadgeScans: BadgeScan[]
  enrichedCompaniesMap: Map<string, EnrichedCompany>
  personaMatchesMap: Map<string, any>
  meddICScoresMap: Map<string, any>
}): Promise<MarkdownReport> {
  const storage = await getActiveStorageAdapter()

  // Calculate event-level statistics
  const hotLeads = Array.from(params.personaMatchesMap.values()).filter((m) => m.tier === 'Hot')
  const totalMEDDICScore =
    Array.from(params.meddICScoresMap.values()).reduce((sum, m) => sum + m.overallScore, 0) /
    params.meddICScoresMap.size

  // Build CRO summary markdown
  let markdown = `# CRO Summary: ${params.event.name}\n\n`
  markdown += `**Generated**: ${new Date().toISOString()}\n\n`
  markdown += `## Event Overview\n\n`
  markdown += `- **Total Leads**: ${params.allBadgeScans.length}\n`
  markdown += `- **Enriched Companies**: ${params.enrichedCompaniesMap.size}\n`
  markdown += `- **Hot Leads**: ${hotLeads.length}\n`
  markdown += `- **Average MEDDIC Score**: ${totalMEDDICScore.toFixed(1)}/100\n\n`
  markdown += `## Top 10 Hot Leads\n\n`

  // Sort hot leads by fit score
  const top10 = hotLeads.sort((a, b) => b.fitScore - a.fitScore).slice(0, 10)

  top10.forEach((lead, index) => {
    const scan = params.allBadgeScans.find((s) => s.id === lead.badgeScanId)
    const meddic = params.meddICScoresMap.get(lead.badgeScanId)

    markdown += `### ${index + 1}. ${scan?.company || 'Unknown'}\n\n`
    markdown += `**Contact**: ${scan?.firstName} ${scan?.lastName}\n`
    markdown += `**Fit Score**: ${lead.fitScore}/100\n`
    markdown += `**MEDDIC Score**: ${meddic?.overallScore || 0}/100\n\n`

    if (meddic?.engagementStrategy) {
      markdown += `**Win Strategy**:\n${meddic.engagementStrategy}\n\n`
    }
  })

  // Create markdown report record
  const report: MarkdownReport = {
    id: crypto.randomUUID(),
    reportType: 'CROSummary',
    eventId: params.event.id,
    markdownContent: markdown,
    generatedAt: new Date(),
    version: 1,
    metadata: {
      totalContacts: params.allBadgeScans.length,
      tierCounts: {
        hot: Array.from(params.personaMatchesMap.values()).filter((m) => m.tier === 'Hot').length,
        warm: Array.from(params.personaMatchesMap.values()).filter((m) => m.tier === 'Warm')
          .length,
        cold: Array.from(params.personaMatchesMap.values()).filter((m) => m.tier === 'Cold')
          .length,
      },
    },
  }

  // Save to storage
  await storage.saveMarkdownReport(report)

  return report
}

/**
 * Get all markdown reports for a badge scan
 */
export async function getMarkdownReportsForScan(badgeScanId: string): Promise<{
  companySummary?: MarkdownReport
  contactSummary?: MarkdownReport
  mergedReport?: MarkdownReport
}> {
  const storage = await getActiveStorageAdapter()

  const companySummary = await storage.getLatestMarkdownReportForScan(
    badgeScanId,
    'CompanySummary'
  )
  const contactSummary = await storage.getLatestMarkdownReportForScan(
    badgeScanId,
    'ContactSummary'
  )
  const mergedReport = await storage.getLatestMarkdownReportForScan(badgeScanId, 'MergedReport')

  return {
    companySummary: companySummary || undefined,
    contactSummary: contactSummary || undefined,
    mergedReport: mergedReport || undefined,
  }
}
