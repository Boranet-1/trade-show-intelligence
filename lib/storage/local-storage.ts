/**
 * Local Storage Adapter
 *
 * JSON file-based storage implementation for development and testing.
 * Stores data in the local file system as JSON files.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { BaseStorageAdapter } from './adapter'
import type {
  BadgeScan,
  EnrichedCompany,
  Persona,
  PersonaMatch,
  Report,
  Event,
  StorageAdapterConfiguration,
  ReportFilters,
  ExportedData,
  ExportFormat,
  ReportStatistics,
} from '@/lib/types'
import { StorageAdapterType, EnrichmentStatus, LeadTier } from '@/lib/types'

/**
 * Local storage adapter implementation using JSON files
 */
export class LocalStorageAdapter extends BaseStorageAdapter {
  private dataDir: string

  constructor(config: StorageAdapterConfiguration) {
    super(config)
    this.dataDir = config.localStorageConfig?.dataDirectory || './data'
  }

  // ===== Initialization =====

  /**
   * Initialize data directory structure
   */
  private async initializeDirectories(): Promise<void> {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'scans'),
      path.join(this.dataDir, 'enriched'),
      path.join(this.dataDir, 'personas'),
      path.join(this.dataDir, 'matches'),
      path.join(this.dataDir, 'reports'),
      path.join(this.dataDir, 'events'),
      path.join(this.dataDir, 'configs'),
    ]

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  /**
   * Read JSON file
   */
  private async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data, (key, value) => {
        // Convert ISO date strings back to Date objects
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value)
        }
        return value
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  /**
   * Write JSON file
   */
  private async writeJSON<T>(filePath: string, data: T): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Read all JSON files from directory
   */
  private async readAllJSON<T>(dirPath: string): Promise<T[]> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
      const files = await fs.readdir(dirPath)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))
      const results: T[] = []

      for (const file of jsonFiles) {
        const data = await this.readJSON<T>(path.join(dirPath, file))
        if (data) results.push(data)
      }

      return results
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  // ===== Badge Scan Operations =====

  async saveBadgeScan(scan: BadgeScan): Promise<string> {
    await this.initializeDirectories()
    const filePath = path.join(this.dataDir, 'scans', `${scan.id}.json`)
    await this.writeJSON(filePath, scan)
    return scan.id
  }

  async getBadgeScan(scanId: string): Promise<BadgeScan | null> {
    const filePath = path.join(this.dataDir, 'scans', `${scanId}.json`)
    return this.readJSON<BadgeScan>(filePath)
  }

  async getAllBadgeScans(eventId?: string): Promise<BadgeScan[]> {
    const scans = await this.readAllJSON<BadgeScan>(path.join(this.dataDir, 'scans'))
    if (eventId) {
      return scans.filter((scan) => scan.eventId === eventId)
    }
    return scans
  }

  async updateBadgeScanStatus(scanId: string, status: EnrichmentStatus): Promise<void> {
    const scan = await this.getBadgeScan(scanId)
    if (!scan) {
      throw new Error(`Badge scan not found: ${scanId}`)
    }
    scan.enrichmentStatus = status
    scan.updatedAt = new Date()
    await this.saveBadgeScan(scan)
  }

  async bulkImportBadgeScans(scans: BadgeScan[]): Promise<string[]> {
    await this.initializeDirectories()
    const ids: string[] = []
    for (const scan of scans) {
      await this.saveBadgeScan(scan)
      ids.push(scan.id)
    }
    return ids
  }

  async flagDuplicate(scanId: string, duplicateOfId: string): Promise<void> {
    const scan = await this.getBadgeScan(scanId)
    if (!scan) {
      throw new Error(`Badge scan not found: ${scanId}`)
    }
    scan.enrichmentStatus = EnrichmentStatus.MANUAL_REVIEW
    scan.notes = `${scan.notes || ''}\n[DUPLICATE OF: ${duplicateOfId}]`.trim()
    scan.updatedAt = new Date()
    await this.saveBadgeScan(scan)
  }

  // ===== Enriched Company Operations =====

  async saveEnrichedCompany(enriched: EnrichedCompany): Promise<string> {
    await this.initializeDirectories()
    const filePath = path.join(this.dataDir, 'enriched', `${enriched.badgeScanId}.json`)
    await this.writeJSON(filePath, enriched)
    return enriched.id
  }

  async getEnrichedCompany(badgeScanId: string): Promise<EnrichedCompany | null> {
    const filePath = path.join(this.dataDir, 'enriched', `${badgeScanId}.json`)
    return this.readJSON<EnrichedCompany>(filePath)
  }

  async updateEnrichment(
    badgeScanId: string,
    enrichedData: Partial<EnrichedCompany>
  ): Promise<void> {
    const existing = await this.getEnrichedCompany(badgeScanId)
    if (!existing) {
      throw new Error(`Enriched company not found for badge scan: ${badgeScanId}`)
    }
    const updated = { ...existing, ...enrichedData }
    await this.saveEnrichedCompany(updated)
  }

  // ===== Persona Operations =====

  async savePersona(persona: Persona): Promise<string> {
    await this.initializeDirectories()
    const filePath = path.join(this.dataDir, 'personas', `${persona.id}.json`)
    await this.writeJSON(filePath, persona)
    return persona.id
  }

  async getPersona(personaId: string): Promise<Persona | null> {
    const filePath = path.join(this.dataDir, 'personas', `${personaId}.json`)
    return this.readJSON<Persona>(filePath)
  }

  async getAllPersonas(): Promise<Persona[]> {
    return this.readAllJSON<Persona>(path.join(this.dataDir, 'personas'))
  }

  async getDefaultPersonas(): Promise<Persona[]> {
    const personas = await this.getAllPersonas()
    return personas.filter((p) => p.isDefault)
  }

  async updatePersona(personaId: string, updates: Partial<Persona>): Promise<void> {
    const existing = await this.getPersona(personaId)
    if (!existing) {
      throw new Error(`Persona not found: ${personaId}`)
    }
    const updated = { ...existing, ...updates, updatedAt: new Date() }
    await this.savePersona(updated)
  }

  async deletePersona(personaId: string): Promise<void> {
    // Check if persona is in use by any reports
    const reports = await this.getAllReports()
    const inUse = reports.some((report) =>
      report.filters?.personas?.includes(personaId)
    )
    if (inUse) {
      throw new Error(`Cannot delete persona ${personaId}: it is in use by existing reports`)
    }

    const filePath = path.join(this.dataDir, 'personas', `${personaId}.json`)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  // ===== Persona Match Operations =====

  async savePersonaMatch(match: PersonaMatch): Promise<string> {
    await this.initializeDirectories()
    const filePath = path.join(this.dataDir, 'matches', `${match.id}.json`)
    await this.writeJSON(filePath, match)
    return match.id
  }

  async getPersonaMatchesForScan(badgeScanId: string): Promise<PersonaMatch[]> {
    const matches = await this.readAllJSON<PersonaMatch>(path.join(this.dataDir, 'matches'))
    return matches.filter((m) => m.badgeScanId === badgeScanId)
  }

  async getBestPersonaMatch(badgeScanId: string): Promise<PersonaMatch | null> {
    const matches = await this.getPersonaMatchesForScan(badgeScanId)
    if (matches.length === 0) return null
    return matches.reduce((best, current) =>
      current.fitScore > best.fitScore ? current : best
    )
  }

  // ===== Report Operations =====

  async saveReport(report: Report): Promise<string> {
    await this.initializeDirectories()
    const filePath = path.join(this.dataDir, 'reports', `${report.id}.json`)
    await this.writeJSON(filePath, report)
    return report.id
  }

  async getReport(reportId: string): Promise<Report | null> {
    const filePath = path.join(this.dataDir, 'reports', `${reportId}.json`)
    return this.readJSON<Report>(filePath)
  }

  async getAllReports(eventId?: string): Promise<Report[]> {
    const reports = await this.readAllJSON<Report>(path.join(this.dataDir, 'reports'))
    if (eventId) {
      return reports.filter((report) => report.eventId === eventId)
    }
    return reports
  }

  async deleteReport(reportId: string): Promise<void> {
    const filePath = path.join(this.dataDir, 'reports', `${reportId}.json`)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  async generateReport(eventId: string, filters?: ReportFilters): Promise<Report> {
    const allScans = await this.getAllBadgeScans(eventId)

    // CRITICAL: Filter out duplicates marked as MANUAL_REVIEW to ensure unique outputs
    // This prevents duplicate leads from appearing in reports
    const scans = allScans.filter(scan => scan.enrichmentStatus !== EnrichmentStatus.MANUAL_REVIEW)

    // Remove duplicates by email (additional safeguard)
    const uniqueScans = this.deduplicateByEmail(scans)

    let filteredScans = uniqueScans

    // Apply filters
    if (filters) {
      filteredScans = await this.applyFilters(uniqueScans, filters)
    }

    // Calculate statistics
    const statistics = await this.calculateStatistics(filteredScans)

    const report: Report = {
      id: this.generateId(),
      eventId,
      name: `Report for ${eventId} - ${new Date().toISOString()}`,
      filters,
      generatedAt: new Date(),
      badgeScanIds: filteredScans.map((s) => s.id),
      statistics,
    }

    await this.saveReport(report)
    return report
  }

  /**
   * Deduplicate badge scans by email address
   * Keeps the most recently updated scan when duplicates are found
   */
  private deduplicateByEmail(scans: BadgeScan[]): BadgeScan[] {
    const emailMap = new Map<string, BadgeScan>()
    const noEmailScans: BadgeScan[] = []

    for (const scan of scans) {
      if (!scan.email) {
        noEmailScans.push(scan)
        continue
      }

      const email = scan.email.toLowerCase()
      const existing = emailMap.get(email)

      if (!existing) {
        emailMap.set(email, scan)
      } else {
        // Keep the most recently updated scan
        const existingTime = new Date(existing.updatedAt).getTime()
        const newTime = new Date(scan.updatedAt).getTime()

        if (newTime > existingTime) {
          emailMap.set(email, scan)
        }
      }
    }

    return [...Array.from(emailMap.values()), ...noEmailScans]
  }

  private async applyFilters(scans: BadgeScan[], filters: ReportFilters): Promise<BadgeScan[]> {
    let filtered = scans

    // Get enriched data and persona matches for filtering
    const enrichedMap = new Map<string, EnrichedCompany>()
    const matchesMap = new Map<string, PersonaMatch>()

    for (const scan of scans) {
      const enriched = await this.getEnrichedCompany(scan.id)
      if (enriched) enrichedMap.set(scan.id, enriched)

      const bestMatch = await this.getBestPersonaMatch(scan.id)
      if (bestMatch) matchesMap.set(scan.id, bestMatch)
    }

    // Filter by tier
    if (filters.tiers && filters.tiers.length > 0) {
      filtered = filtered.filter((scan) => {
        const match = matchesMap.get(scan.id)
        return match && filters.tiers!.includes(match.tier)
      })
    }

    // Filter by industry
    if (filters.industries && filters.industries.length > 0) {
      filtered = filtered.filter((scan) => {
        const enriched = enrichedMap.get(scan.id)
        return enriched && enriched.industry && filters.industries!.includes(enriched.industry)
      })
    }

    // Filter by employee range
    if (filters.employeeRanges && filters.employeeRanges.length > 0) {
      filtered = filtered.filter((scan) => {
        const enriched = enrichedMap.get(scan.id)
        return enriched && enriched.employeeRange && filters.employeeRanges!.includes(enriched.employeeRange)
      })
    }

    // Filter by revenue range
    if (filters.revenueRanges && filters.revenueRanges.length > 0) {
      filtered = filtered.filter((scan) => {
        const enriched = enrichedMap.get(scan.id)
        return enriched && enriched.revenueRange && filters.revenueRanges!.includes(enriched.revenueRange)
      })
    }

    // Filter by technology
    if (filters.technologies && filters.technologies.length > 0) {
      filtered = filtered.filter((scan) => {
        const enriched = enrichedMap.get(scan.id)
        return enriched && enriched.techStack && enriched.techStack.some((tech) =>
          filters.technologies!.includes(tech)
        )
      })
    }

    // Filter by persona
    if (filters.personas && filters.personas.length > 0) {
      filtered = filtered.filter((scan) => {
        const match = matchesMap.get(scan.id)
        return match && filters.personas!.includes(match.personaId)
      })
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter((scan) =>
        scan.firstName?.toLowerCase().includes(query) ||
        scan.lastName?.toLowerCase().includes(query) ||
        scan.email?.toLowerCase().includes(query) ||
        scan.company.toLowerCase().includes(query) ||
        scan.jobTitle?.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  private async calculateStatistics(scans: BadgeScan[]): Promise<ReportStatistics> {
    let enrichedCount = 0
    let hotCount = 0
    let warmCount = 0
    let coldCount = 0
    let unscoredCount = 0
    const industryCount = new Map<string, number>()
    let totalFitScore = 0
    let scoredCount = 0

    for (const scan of scans) {
      const enriched = await this.getEnrichedCompany(scan.id)
      if (enriched) {
        enrichedCount++
        if (enriched.industry) {
          industryCount.set(enriched.industry, (industryCount.get(enriched.industry) || 0) + 1)
        }
      }

      const bestMatch = await this.getBestPersonaMatch(scan.id)
      if (bestMatch) {
        totalFitScore += bestMatch.fitScore
        scoredCount++

        switch (bestMatch.tier) {
          case 'Hot':
            hotCount++
            break
          case 'Warm':
            warmCount++
            break
          case 'Cold':
            coldCount++
            break
          case 'Unscored':
            unscoredCount++
            break
        }
      } else {
        unscoredCount++
      }
    }

    const topIndustries = Array.from(industryCount.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalScans: scans.length,
      enrichedCount,
      hotCount,
      warmCount,
      coldCount,
      unscoredCount,
      topIndustries,
      averageFitScore: scoredCount > 0 ? totalFitScore / scoredCount : 0,
      enrichmentSuccessRate: scans.length > 0 ? (enrichedCount / scans.length) * 100 : 0,
    }
  }

  // ===== Event Operations =====

  async saveEvent(event: Event): Promise<string> {
    await this.initializeDirectories()
    const filePath = path.join(this.dataDir, 'events', `${event.id}.json`)
    await this.writeJSON(filePath, event)
    return event.id
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const filePath = path.join(this.dataDir, 'events', `${eventId}.json`)
    return this.readJSON<Event>(filePath)
  }

  async getAllEvents(): Promise<Event[]> {
    return this.readAllJSON<Event>(path.join(this.dataDir, 'events'))
  }

  // ===== Configuration Operations =====

  async saveStorageConfig(config: StorageAdapterConfiguration): Promise<string> {
    await this.initializeDirectories()
    const filePath = path.join(this.dataDir, 'configs', `${config.id}.json`)
    await this.writeJSON(filePath, config)
    return config.id
  }

  async getActiveStorageConfig(): Promise<StorageAdapterConfiguration> {
    const configs = await this.readAllJSON<StorageAdapterConfiguration>(
      path.join(this.dataDir, 'configs')
    )
    const active = configs.find((c) => c.isActive)
    if (!active) {
      throw new Error('No active storage configuration found')
    }
    return active
  }

  async setActiveStorageConfig(configId: string): Promise<void> {
    const configs = await this.readAllJSON<StorageAdapterConfiguration>(
      path.join(this.dataDir, 'configs')
    )

    for (const config of configs) {
      config.isActive = config.id === configId
      config.updatedAt = new Date()
      await this.saveStorageConfig(config)
    }
  }

  // ===== Migration Operations =====

  async exportAll(): Promise<ExportedData> {
    return {
      badgeScans: await this.getAllBadgeScans(),
      enrichedCompanies: await this.readAllJSON<EnrichedCompany>(
        path.join(this.dataDir, 'enriched')
      ),
      personas: await this.getAllPersonas(),
      personaMatches: await this.readAllJSON<PersonaMatch>(
        path.join(this.dataDir, 'matches')
      ),
      reports: await this.getAllReports(),
      events: await this.getAllEvents(),
      exportedAt: new Date(),
      sourceAdapterType: StorageAdapterType.LOCAL,
    }
  }

  async importAll(data: ExportedData): Promise<void> {
    await this.initializeDirectories()

    // Import in order to respect dependencies
    for (const event of data.events) {
      await this.saveEvent(event)
    }

    for (const persona of data.personas) {
      await this.savePersona(persona)
    }

    for (const scan of data.badgeScans) {
      await this.saveBadgeScan(scan)
    }

    for (const enriched of data.enrichedCompanies) {
      await this.saveEnrichedCompany(enriched)
    }

    for (const match of data.personaMatches) {
      await this.savePersonaMatch(match)
    }

    for (const report of data.reports) {
      await this.saveReport(report)
    }
  }

  async exportToFormat(eventId: string, format: ExportFormat): Promise<string> {
    // Dynamic imports to avoid circular dependencies
    const { generateCROSummary, saveCROSummary } = await import('@/lib/export/cro-summary-generator')
    const { generateCompanyReport, saveCompanyReport } = await import('@/lib/export/company-report-generator')

    const event = await this.getEvent(eventId)
    if (!event) {
      throw new Error(`Event not found: ${eventId}`)
    }

    const eventDir = path.join(this.dataDir, 'events', eventId)
    await fs.mkdir(eventDir, { recursive: true })

    if (format === 'CRO_summary') {
      // Get all badge scans for the event
      const badgeScans = await this.getAllBadgeScans(eventId)

      // Get enriched companies and persona matches
      const enrichedCompanies = new Map()
      const personaMatches = new Map()

      for (const scan of badgeScans) {
        const enriched = await this.getEnrichedCompany(scan.id)
        if (enriched) {
          enrichedCompanies.set(scan.id, enriched)
        }

        const match = await this.getBestPersonaMatch(scan.id)
        if (match) {
          personaMatches.set(scan.id, match)
        }
      }

      // Generate report using the existing data
      const reports = await this.getAllReports(eventId)
      const report = reports[0] // Use the first report or create a temporary one
      if (!report) {
        throw new Error('No report found for event. Generate a report first.')
      }

      // Generate CRO summary
      const summaryContent = await generateCROSummary(
        event,
        report,
        badgeScans,
        enrichedCompanies,
        personaMatches
      )

      // Save to file
      const summaryPath = await saveCROSummary(eventId, summaryContent, this.dataDir)
      return summaryPath
    }

    if (format === 'company_reports') {
      const badgeScans = await this.getAllBadgeScans(eventId)
      const companiesDir = path.join(eventDir, 'companies')
      await fs.mkdir(companiesDir, { recursive: true })

      // Generate individual company reports
      for (const scan of badgeScans) {
        const enriched = await this.getEnrichedCompany(scan.id)
        const match = await this.getBestPersonaMatch(scan.id)

        const reportContent = await generateCompanyReport(event, scan, enriched, match)
        await saveCompanyReport(eventId, scan.id, reportContent, this.dataDir)
      }

      return companiesDir
    }

    throw new Error(`Unsupported export format: ${format}`)
  }

  private async generateCROSummary(eventId: string): Promise<string> {
    const scans = await this.getAllBadgeScans(eventId)
    const hotLeads: Array<{ company: string; contact: string; fitScore: number; insights: string[] }> = []

    for (const scan of scans) {
      const match = await this.getBestPersonaMatch(scan.id)
      if (match && match.tier === 'Hot') {
        const enriched = await this.getEnrichedCompany(scan.id)
        hotLeads.push({
          company: enriched?.companyName || scan.company,
          contact: `${scan.firstName || ''} ${scan.lastName || ''}`.trim() || scan.email || 'Unknown',
          fitScore: match.fitScore,
          insights: match.actionableInsights || [],
        })
      }
    }

    hotLeads.sort((a, b) => b.fitScore - a.fitScore)
    const top10 = hotLeads.slice(0, 10)

    let markdown = `# CRO Summary Report\n\n`
    markdown += `**Event**: ${eventId}\n`
    markdown += `**Generated**: ${new Date().toISOString()}\n\n`
    markdown += `## Executive Summary\n\n`
    markdown += `Total Leads: ${scans.length}\n`
    markdown += `Hot Leads: ${hotLeads.length}\n\n`
    markdown += `## Top 10 Hot Leads\n\n`

    for (let i = 0; i < top10.length; i++) {
      const lead = top10[i]
      markdown += `### ${i + 1}. ${lead.company} - ${lead.contact}\n`
      markdown += `**Fit Score**: ${lead.fitScore.toFixed(1)}%\n\n`
      if (lead.insights.length > 0) {
        markdown += `**Key Insights**:\n`
        lead.insights.forEach((insight) => {
          markdown += `- ${insight}\n`
        })
      }
      markdown += `\n`
    }

    markdown += `## Follow-Up Priorities\n\n`
    markdown += `### Hot Tier (${hotLeads.length} leads)\n`
    markdown += `- Immediate follow-up required\n`
    markdown += `- Schedule demos within 48 hours\n\n`

    return markdown
  }

  private async generateCompanyReports(eventId: string, outputDir: string): Promise<void> {
    const scans = await this.getAllBadgeScans(eventId)

    for (const scan of scans) {
      const enriched = await this.getEnrichedCompany(scan.id)
      const match = await this.getBestPersonaMatch(scan.id)

      if (!enriched || !match) continue

      const companyId = enriched.companyName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      const reportPath = path.join(outputDir, `${companyId}.md`)

      let markdown = `# Company Report: ${enriched.companyName}\n\n`
      markdown += `## Company Profile\n\n`
      markdown += `- **Domain**: ${enriched.domain || 'N/A'}\n`
      markdown += `- **Industry**: ${enriched.industry || 'N/A'}\n`
      markdown += `- **Employees**: ${enriched.employeeCount || enriched.employeeRange || 'N/A'}\n`
      markdown += `- **Revenue**: ${enriched.annualRevenue || enriched.revenueRange || 'N/A'}\n`
      markdown += `- **Headquarters**: ${enriched.headquarters || 'N/A'}\n\n`
      markdown += `## Persona Match Analysis\n\n`
      markdown += `- **Fit Score**: ${match.fitScore.toFixed(1)}%\n`
      markdown += `- **Tier**: ${match.tier}\n\n`
      markdown += `## Actionable Insights\n\n`
      if (match.actionableInsights && match.actionableInsights.length > 0) {
        match.actionableInsights.forEach((insight) => {
          markdown += `- ${insight}\n`
        })
      } else {
        markdown += `No insights available.\n`
      }
      markdown += `\n## Tier Justification\n\n`
      markdown += `Based on the fit score of ${match.fitScore.toFixed(1)}%, this lead is categorized as ${match.tier}.\n`

      await fs.writeFile(reportPath, markdown, 'utf-8')
    }
  }

  // ===== Connection Management =====

  async testConnection(): Promise<boolean> {
    try {
      await this.initializeDirectories()
      return true
    } catch (error) {
      throw new Error(`Local storage connection test failed: ${error}`)
    }
  }

  async close(): Promise<void> {
    // No persistent connections to close for local storage
    return Promise.resolve()
  }
}
