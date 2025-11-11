/**
 * MySQL Storage Adapter Implementation
 *
 * Production-grade storage backend using MySQL database
 * with connection pooling and transaction support.
 */

import mysql from 'mysql2/promise'
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
  MySQLConfig,
  ReportStatistics,
} from '@/lib/types'
import { StorageAdapterType, EnrichmentStatus, LeadTier } from '@/lib/types'
import { BaseStorageAdapter } from './adapter'

export class MySQLAdapter extends BaseStorageAdapter {
  private pool: mysql.Pool | null = null

  constructor(config: StorageAdapterConfiguration) {
    super(config)
    if (!config.mysqlConfig) {
      throw new Error('MySQL configuration is required')
    }
  }

  private getPool(): mysql.Pool {
    if (!this.pool) {
      const mysqlConfig = this.config.mysqlConfig as MySQLConfig
      this.pool = mysql.createPool({
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        database: mysqlConfig.database,
        user: mysqlConfig.username,
        password: mysqlConfig.password,
        connectionLimit: mysqlConfig.connectionPoolSize || 10,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      })
    }
    return this.pool
  }

  // ===== Badge Scan Operations =====

  async saveBadgeScan(scan: BadgeScan): Promise<string> {
    const pool = this.getPool()
    const id = scan.id || this.generateId()

    await pool.execute(
      `INSERT INTO badge_scans (
        id, event_id, scanned_at, first_name, last_name, email, company,
        job_title, phone, booth_location, event_name, notes, custom_fields,
        enrichment_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        scan.eventId,
        scan.scannedAt,
        scan.firstName || null,
        scan.lastName || null,
        scan.email || null,
        scan.company,
        scan.jobTitle || null,
        scan.phone || null,
        scan.boothLocation || null,
        scan.eventName,
        scan.notes || null,
        scan.customFields ? JSON.stringify(scan.customFields) : null,
        scan.enrichmentStatus,
        scan.createdAt || new Date(),
        scan.updatedAt || new Date(),
      ]
    )

    return id
  }

  async getBadgeScan(scanId: string): Promise<BadgeScan | null> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM badge_scans WHERE id = ?',
      [scanId]
    )

    if (rows.length === 0) return null

    return this.mapBadgeScanFromDB(rows[0])
  }

  async getAllBadgeScans(eventId?: string): Promise<BadgeScan[]> {
    const pool = this.getPool()
    let query = 'SELECT * FROM badge_scans'
    const params: unknown[] = []

    if (eventId) {
      query += ' WHERE event_id = ?'
      params.push(eventId)
    }

    query += ' ORDER BY created_at DESC'

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(query, params)
    return rows.map((row) => this.mapBadgeScanFromDB(row))
  }

  async updateBadgeScanStatus(scanId: string, status: EnrichmentStatus): Promise<void> {
    const pool = this.getPool()
    await pool.execute('UPDATE badge_scans SET enrichment_status = ?, updated_at = ? WHERE id = ?', [
      status,
      new Date(),
      scanId,
    ])
  }

  async bulkImportBadgeScans(scans: BadgeScan[]): Promise<string[]> {
    const pool = this.getPool()
    const connection = await pool.getConnection()
    const ids: string[] = []

    try {
      await connection.beginTransaction()

      for (const scan of scans) {
        const id = scan.id || this.generateId()
        ids.push(id)

        await connection.execute(
          `INSERT INTO badge_scans (
            id, event_id, scanned_at, first_name, last_name, email, company,
            job_title, phone, booth_location, event_name, notes, custom_fields,
            enrichment_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            scan.eventId,
            scan.scannedAt,
            scan.firstName || null,
            scan.lastName || null,
            scan.email || null,
            scan.company,
            scan.jobTitle || null,
            scan.phone || null,
            scan.boothLocation || null,
            scan.eventName,
            scan.notes || null,
            scan.customFields ? JSON.stringify(scan.customFields) : null,
            scan.enrichmentStatus,
            scan.createdAt || new Date(),
            scan.updatedAt || new Date(),
          ]
        )
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

    return ids
  }

  async flagDuplicate(scanId: string, duplicateOfId: string): Promise<void> {
    const pool = this.getPool()
    await pool.execute(
      'UPDATE badge_scans SET notes = CONCAT(COALESCE(notes, ""), "\nDuplicate of: ", ?), updated_at = ? WHERE id = ?',
      [duplicateOfId, new Date(), scanId]
    )
  }

  // ===== Enriched Company Operations =====

  async saveEnrichedCompany(enriched: EnrichedCompany): Promise<string> {
    const pool = this.getPool()
    const id = enriched.id || this.generateId()

    await pool.execute(
      `INSERT INTO enriched_companies (
        id, badge_scan_id, company_name, domain, employee_count, employee_range,
        industry, industry_codes, annual_revenue, revenue_range, tech_stack,
        funding_stage, total_funding, headquarters, founded, description,
        linkedin_url, twitter_handle, consensus_metadata, enriched_at, data_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name),
        domain = VALUES(domain),
        employee_count = VALUES(employee_count),
        employee_range = VALUES(employee_range),
        industry = VALUES(industry),
        industry_codes = VALUES(industry_codes),
        annual_revenue = VALUES(annual_revenue),
        revenue_range = VALUES(revenue_range),
        tech_stack = VALUES(tech_stack),
        funding_stage = VALUES(funding_stage),
        total_funding = VALUES(total_funding),
        headquarters = VALUES(headquarters),
        founded = VALUES(founded),
        description = VALUES(description),
        linkedin_url = VALUES(linkedin_url),
        twitter_handle = VALUES(twitter_handle),
        consensus_metadata = VALUES(consensus_metadata),
        enriched_at = VALUES(enriched_at),
        data_source = VALUES(data_source)`,
      [
        id,
        enriched.badgeScanId,
        enriched.companyName,
        enriched.domain || null,
        enriched.employeeCount || null,
        enriched.employeeRange || null,
        enriched.industry || null,
        enriched.industryCodes ? JSON.stringify(enriched.industryCodes) : null,
        enriched.annualRevenue || null,
        enriched.revenueRange || null,
        enriched.techStack ? JSON.stringify(enriched.techStack) : null,
        enriched.fundingStage || null,
        enriched.totalFunding || null,
        enriched.headquarters || null,
        enriched.founded || null,
        enriched.description || null,
        enriched.linkedinUrl || null,
        enriched.twitterHandle || null,
        JSON.stringify(enriched.consensusMetadata),
        enriched.enrichedAt,
        JSON.stringify(enriched.dataSource),
      ]
    )

    return id
  }

  async getEnrichedCompany(badgeScanId: string): Promise<EnrichedCompany | null> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM enriched_companies WHERE badge_scan_id = ?',
      [badgeScanId]
    )

    if (rows.length === 0) return null

    return this.mapEnrichedCompanyFromDB(rows[0])
  }

  async updateEnrichment(badgeScanId: string, enrichedData: Partial<EnrichedCompany>): Promise<void> {
    const pool = this.getPool()
    const updates: string[] = []
    const params: unknown[] = []

    if (enrichedData.companyName !== undefined) {
      updates.push('company_name = ?')
      params.push(enrichedData.companyName)
    }
    if (enrichedData.domain !== undefined) {
      updates.push('domain = ?')
      params.push(enrichedData.domain)
    }
    if (enrichedData.employeeCount !== undefined) {
      updates.push('employee_count = ?')
      params.push(enrichedData.employeeCount)
    }
    if (enrichedData.employeeRange !== undefined) {
      updates.push('employee_range = ?')
      params.push(enrichedData.employeeRange)
    }
    if (enrichedData.industry !== undefined) {
      updates.push('industry = ?')
      params.push(enrichedData.industry)
    }
    if (enrichedData.industryCodes !== undefined) {
      updates.push('industry_codes = ?')
      params.push(JSON.stringify(enrichedData.industryCodes))
    }
    if (enrichedData.annualRevenue !== undefined) {
      updates.push('annual_revenue = ?')
      params.push(enrichedData.annualRevenue)
    }
    if (enrichedData.revenueRange !== undefined) {
      updates.push('revenue_range = ?')
      params.push(enrichedData.revenueRange)
    }
    if (enrichedData.techStack !== undefined) {
      updates.push('tech_stack = ?')
      params.push(JSON.stringify(enrichedData.techStack))
    }
    if (enrichedData.fundingStage !== undefined) {
      updates.push('funding_stage = ?')
      params.push(enrichedData.fundingStage)
    }
    if (enrichedData.totalFunding !== undefined) {
      updates.push('total_funding = ?')
      params.push(enrichedData.totalFunding)
    }
    if (enrichedData.headquarters !== undefined) {
      updates.push('headquarters = ?')
      params.push(enrichedData.headquarters)
    }
    if (enrichedData.founded !== undefined) {
      updates.push('founded = ?')
      params.push(enrichedData.founded)
    }
    if (enrichedData.description !== undefined) {
      updates.push('description = ?')
      params.push(enrichedData.description)
    }
    if (enrichedData.linkedinUrl !== undefined) {
      updates.push('linkedin_url = ?')
      params.push(enrichedData.linkedinUrl)
    }
    if (enrichedData.twitterHandle !== undefined) {
      updates.push('twitter_handle = ?')
      params.push(enrichedData.twitterHandle)
    }
    if (enrichedData.consensusMetadata !== undefined) {
      updates.push('consensus_metadata = ?')
      params.push(JSON.stringify(enrichedData.consensusMetadata))
    }
    if (enrichedData.dataSource !== undefined) {
      updates.push('data_source = ?')
      params.push(JSON.stringify(enrichedData.dataSource))
    }

    if (updates.length === 0) return

    params.push(badgeScanId)
    await pool.execute(`UPDATE enriched_companies SET ${updates.join(', ')} WHERE badge_scan_id = ?`, params)
  }

  // ===== Persona Operations =====

  async savePersona(persona: Persona): Promise<string> {
    const pool = this.getPool()
    const id = persona.id || this.generateId()

    await pool.execute(
      `INSERT INTO personas (
        id, name, description, is_default, criteria, weights, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        persona.name,
        persona.description || null,
        persona.isDefault,
        JSON.stringify(persona.criteria),
        JSON.stringify(persona.weights),
        persona.createdAt || new Date(),
        persona.updatedAt || new Date(),
        persona.createdBy || null,
      ]
    )

    return id
  }

  async getPersona(personaId: string): Promise<Persona | null> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM personas WHERE id = ?', [personaId])

    if (rows.length === 0) return null

    return this.mapPersonaFromDB(rows[0])
  }

  async getAllPersonas(): Promise<Persona[]> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM personas ORDER BY is_default DESC, name ASC')
    return rows.map((row) => this.mapPersonaFromDB(row))
  }

  async getDefaultPersonas(): Promise<Persona[]> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM personas WHERE is_default = TRUE ORDER BY name ASC')
    return rows.map((row) => this.mapPersonaFromDB(row))
  }

  async updatePersona(personaId: string, updates: Partial<Persona>): Promise<void> {
    const pool = this.getPool()
    const updateFields: string[] = []
    const params: unknown[] = []

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      params.push(updates.name)
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?')
      params.push(updates.description)
    }
    if (updates.isDefault !== undefined) {
      updateFields.push('is_default = ?')
      params.push(updates.isDefault)
    }
    if (updates.criteria !== undefined) {
      updateFields.push('criteria = ?')
      params.push(JSON.stringify(updates.criteria))
    }
    if (updates.weights !== undefined) {
      updateFields.push('weights = ?')
      params.push(JSON.stringify(updates.weights))
    }

    if (updateFields.length === 0) return

    updateFields.push('updated_at = ?')
    params.push(new Date())
    params.push(personaId)

    await pool.execute(`UPDATE personas SET ${updateFields.join(', ')} WHERE id = ?`, params)
  }

  async deletePersona(personaId: string): Promise<void> {
    const pool = this.getPool()

    const [matches] = await pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM persona_matches WHERE persona_id = ?', [
      personaId,
    ])

    if (matches[0].count > 0) {
      throw new Error('Cannot delete persona that is in use by existing reports')
    }

    await pool.execute('DELETE FROM personas WHERE id = ?', [personaId])
  }

  // ===== Persona Match Operations =====

  async savePersonaMatch(match: PersonaMatch): Promise<string> {
    const pool = this.getPool()
    const id = match.id || this.generateId()

    await pool.execute(
      `INSERT INTO persona_matches (
        id, badge_scan_id, persona_id, fit_score, tier, criteria_matches, actionable_insights, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        match.badgeScanId,
        match.personaId,
        match.fitScore,
        match.tier,
        JSON.stringify(match.criteriaMatches),
        match.actionableInsights ? JSON.stringify(match.actionableInsights) : null,
        match.calculatedAt,
      ]
    )

    return id
  }

  async getPersonaMatchesForScan(badgeScanId: string): Promise<PersonaMatch[]> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM persona_matches WHERE badge_scan_id = ? ORDER BY fit_score DESC',
      [badgeScanId]
    )
    return rows.map((row) => this.mapPersonaMatchFromDB(row))
  }

  async getBestPersonaMatch(badgeScanId: string): Promise<PersonaMatch | null> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT * FROM persona_matches WHERE badge_scan_id = ? ORDER BY fit_score DESC LIMIT 1',
      [badgeScanId]
    )

    if (rows.length === 0) return null

    return this.mapPersonaMatchFromDB(rows[0])
  }

  // ===== Report Operations =====

  async saveReport(report: Report): Promise<string> {
    const pool = this.getPool()
    const id = report.id || this.generateId()

    await pool.execute(
      `INSERT INTO reports (
        id, event_id, name, filters, generated_at, badge_scan_ids, statistics, exported_formats
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        report.eventId,
        report.name,
        report.filters ? JSON.stringify(report.filters) : null,
        report.generatedAt,
        JSON.stringify(report.badgeScanIds),
        JSON.stringify(report.statistics),
        report.exportedFormats ? JSON.stringify(report.exportedFormats) : null,
      ]
    )

    return id
  }

  async getReport(reportId: string): Promise<Report | null> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM reports WHERE id = ?', [reportId])

    if (rows.length === 0) return null

    return this.mapReportFromDB(rows[0])
  }

  async getAllReports(eventId?: string): Promise<Report[]> {
    const pool = this.getPool()
    let query = 'SELECT * FROM reports'
    const params: unknown[] = []

    if (eventId) {
      query += ' WHERE event_id = ?'
      params.push(eventId)
    }

    query += ' ORDER BY generated_at DESC'

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(query, params)
    return rows.map((row) => this.mapReportFromDB(row))
  }

  async deleteReport(reportId: string): Promise<void> {
    const pool = this.getPool()
    await pool.execute('DELETE FROM reports WHERE id = ?', [reportId])
  }

  async generateReport(eventId: string, filters?: ReportFilters): Promise<Report> {
    const pool = this.getPool()

    let query = `
      SELECT
        bs.id,
        bs.enrichment_status,
        pm.tier,
        pm.fit_score,
        ec.industry,
        ec.employee_range,
        ec.revenue_range,
        ec.tech_stack
      FROM badge_scans bs
      LEFT JOIN enriched_companies ec ON bs.id = ec.badge_scan_id
      LEFT JOIN persona_matches pm ON bs.id = pm.badge_scan_id
      WHERE bs.event_id = ?
    `
    const params: unknown[] = [eventId]

    if (filters?.tiers && filters.tiers.length > 0) {
      query += ` AND pm.tier IN (${filters.tiers.map(() => '?').join(', ')})`
      params.push(...filters.tiers)
    }

    if (filters?.industries && filters.industries.length > 0) {
      query += ` AND ec.industry IN (${filters.industries.map(() => '?').join(', ')})`
      params.push(...filters.industries)
    }

    if (filters?.employeeRanges && filters.employeeRanges.length > 0) {
      query += ` AND ec.employee_range IN (${filters.employeeRanges.map(() => '?').join(', ')})`
      params.push(...filters.employeeRanges)
    }

    if (filters?.revenueRanges && filters.revenueRanges.length > 0) {
      query += ` AND ec.revenue_range IN (${filters.revenueRanges.map(() => '?').join(', ')})`
      params.push(...filters.revenueRanges)
    }

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(query, params)

    const badgeScanIds: string[] = []
    let enrichedCount = 0
    let hotCount = 0
    let warmCount = 0
    let coldCount = 0
    let unscoredCount = 0
    const industryMap: Record<string, number> = {}
    let totalFitScore = 0
    let fitScoreCount = 0

    for (const row of rows) {
      badgeScanIds.push(row.id)

      if (row.enrichment_status === 'ENRICHED') {
        enrichedCount++
      }

      if (row.tier === 'Hot') hotCount++
      else if (row.tier === 'Warm') warmCount++
      else if (row.tier === 'Cold') coldCount++
      else unscoredCount++

      if (row.industry) {
        industryMap[row.industry] = (industryMap[row.industry] || 0) + 1
      }

      if (row.fit_score !== null) {
        totalFitScore += row.fit_score
        fitScoreCount++
      }
    }

    const topIndustries = Object.entries(industryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([industry, count]) => ({ industry, count }))

    const statistics: ReportStatistics = {
      totalScans: badgeScanIds.length,
      enrichedCount,
      hotCount,
      warmCount,
      coldCount,
      unscoredCount,
      topIndustries,
      averageFitScore: fitScoreCount > 0 ? totalFitScore / fitScoreCount : 0,
      enrichmentSuccessRate: badgeScanIds.length > 0 ? (enrichedCount / badgeScanIds.length) * 100 : 0,
    }

    const report: Report = {
      id: this.generateId(),
      eventId,
      name: `Report ${new Date().toISOString()}`,
      filters,
      generatedAt: new Date(),
      badgeScanIds,
      statistics,
    }

    await this.saveReport(report)
    return report
  }

  // ===== Event Operations =====

  async saveEvent(event: Event): Promise<string> {
    const pool = this.getPool()
    const id = event.id || this.generateId()

    await pool.execute(
      'INSERT INTO events (id, name, start_date, end_date, location, booth_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, event.name, event.startDate || null, event.endDate || null, event.location || null, event.boothNumber || null, event.createdAt || new Date()]
    )

    return id
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM events WHERE id = ?', [eventId])

    if (rows.length === 0) return null

    return this.mapEventFromDB(rows[0])
  }

  async getAllEvents(): Promise<Event[]> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM events ORDER BY created_at DESC')
    return rows.map((row) => this.mapEventFromDB(row))
  }

  // ===== Configuration Operations =====

  async saveStorageConfig(config: StorageAdapterConfiguration): Promise<string> {
    const pool = this.getPool()
    const id = config.id || this.generateId()

    await pool.execute(
      `INSERT INTO storage_adapter_configurations (
        id, adapter_type, local_storage_config, mysql_config, hubspot_config, is_active, last_tested_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        config.adapterType,
        config.localStorageConfig ? JSON.stringify(config.localStorageConfig) : null,
        config.mysqlConfig ? JSON.stringify(config.mysqlConfig) : null,
        config.hubspotConfig ? JSON.stringify(config.hubspotConfig) : null,
        config.isActive,
        config.lastTestedAt || null,
        config.createdAt || new Date(),
        config.updatedAt || new Date(),
      ]
    )

    return id
  }

  async getActiveStorageConfig(): Promise<StorageAdapterConfiguration> {
    const pool = this.getPool()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM storage_adapter_configurations WHERE is_active = TRUE LIMIT 1')

    if (rows.length === 0) {
      throw new Error('No active storage configuration found')
    }

    return this.mapStorageConfigFromDB(rows[0])
  }

  async setActiveStorageConfig(configId: string): Promise<void> {
    const pool = this.getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      await connection.execute('UPDATE storage_adapter_configurations SET is_active = FALSE WHERE is_active = TRUE')

      await connection.execute('UPDATE storage_adapter_configurations SET is_active = TRUE, updated_at = ? WHERE id = ?', [new Date(), configId])

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ===== Migration Operations =====

  async exportAll(): Promise<ExportedData> {
    const pool = this.getPool()

    const [badgeScanRows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM badge_scans')
    const [enrichedCompanyRows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM enriched_companies')
    const [personaRows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM personas')
    const [personaMatchRows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM persona_matches')
    const [reportRows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM reports')
    const [eventRows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM events')

    return {
      badgeScans: badgeScanRows.map((row) => this.mapBadgeScanFromDB(row)),
      enrichedCompanies: enrichedCompanyRows.map((row) => this.mapEnrichedCompanyFromDB(row)),
      personas: personaRows.map((row) => this.mapPersonaFromDB(row)),
      personaMatches: personaMatchRows.map((row) => this.mapPersonaMatchFromDB(row)),
      reports: reportRows.map((row) => this.mapReportFromDB(row)),
      events: eventRows.map((row) => this.mapEventFromDB(row)),
      exportedAt: new Date(),
      sourceAdapterType: StorageAdapterType.MYSQL,
    }
  }

  async importAll(data: ExportedData): Promise<void> {
    const pool = this.getPool()
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      for (const event of data.events) {
        await connection.execute(
          'INSERT INTO events (id, name, start_date, end_date, location, booth_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [event.id, event.name, event.startDate || null, event.endDate || null, event.location || null, event.boothNumber || null, event.createdAt]
        )
      }

      for (const scan of data.badgeScans) {
        await connection.execute(
          `INSERT INTO badge_scans (
            id, event_id, scanned_at, first_name, last_name, email, company,
            job_title, phone, booth_location, event_name, notes, custom_fields,
            enrichment_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            scan.id,
            scan.eventId,
            scan.scannedAt,
            scan.firstName || null,
            scan.lastName || null,
            scan.email || null,
            scan.company,
            scan.jobTitle || null,
            scan.phone || null,
            scan.boothLocation || null,
            scan.eventName,
            scan.notes || null,
            scan.customFields ? JSON.stringify(scan.customFields) : null,
            scan.enrichmentStatus,
            scan.createdAt,
            scan.updatedAt,
          ]
        )
      }

      for (const enriched of data.enrichedCompanies) {
        await connection.execute(
          `INSERT INTO enriched_companies (
            id, badge_scan_id, company_name, domain, employee_count, employee_range,
            industry, industry_codes, annual_revenue, revenue_range, tech_stack,
            funding_stage, total_funding, headquarters, founded, description,
            linkedin_url, twitter_handle, consensus_metadata, enriched_at, data_source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            enriched.id,
            enriched.badgeScanId,
            enriched.companyName,
            enriched.domain || null,
            enriched.employeeCount || null,
            enriched.employeeRange || null,
            enriched.industry || null,
            enriched.industryCodes ? JSON.stringify(enriched.industryCodes) : null,
            enriched.annualRevenue || null,
            enriched.revenueRange || null,
            enriched.techStack ? JSON.stringify(enriched.techStack) : null,
            enriched.fundingStage || null,
            enriched.totalFunding || null,
            enriched.headquarters || null,
            enriched.founded || null,
            enriched.description || null,
            enriched.linkedinUrl || null,
            enriched.twitterHandle || null,
            JSON.stringify(enriched.consensusMetadata),
            enriched.enrichedAt,
            JSON.stringify(enriched.dataSource),
          ]
        )
      }

      for (const persona of data.personas) {
        await connection.execute(
          `INSERT INTO personas (
            id, name, description, is_default, criteria, weights, created_at, updated_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            persona.id,
            persona.name,
            persona.description || null,
            persona.isDefault,
            JSON.stringify(persona.criteria),
            JSON.stringify(persona.weights),
            persona.createdAt,
            persona.updatedAt,
            persona.createdBy || null,
          ]
        )
      }

      for (const match of data.personaMatches) {
        await connection.execute(
          `INSERT INTO persona_matches (
            id, badge_scan_id, persona_id, fit_score, tier, criteria_matches, actionable_insights, calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            match.id,
            match.badgeScanId,
            match.personaId,
            match.fitScore,
            match.tier,
            JSON.stringify(match.criteriaMatches),
            match.actionableInsights ? JSON.stringify(match.actionableInsights) : null,
            match.calculatedAt,
          ]
        )
      }

      for (const report of data.reports) {
        await connection.execute(
          `INSERT INTO reports (
            id, event_id, name, filters, generated_at, badge_scan_ids, statistics, exported_formats
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            report.id,
            report.eventId,
            report.name,
            report.filters ? JSON.stringify(report.filters) : null,
            report.generatedAt,
            JSON.stringify(report.badgeScanIds),
            JSON.stringify(report.statistics),
            report.exportedFormats ? JSON.stringify(report.exportedFormats) : null,
          ]
        )
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async exportToFormat(eventId: string, format: ExportFormat): Promise<string> {
    throw new Error('exportToFormat for MySQL adapter requires external generator utilities (lib/export/*). This will be implemented when export generators are available.')
  }

  // ===== Connection Management =====

  async testConnection(): Promise<boolean> {
    try {
      const pool = this.getPool()
      await pool.execute('SELECT 1')
      return true
    } catch (error) {
      throw new Error(`MySQL connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  // ===== Private Mapper Methods =====

  private mapBadgeScanFromDB(row: mysql.RowDataPacket): BadgeScan {
    return {
      id: row.id,
      eventId: row.event_id,
      scannedAt: new Date(row.scanned_at),
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      company: row.company,
      jobTitle: row.job_title,
      phone: row.phone,
      boothLocation: row.booth_location,
      eventName: row.event_name,
      notes: row.notes,
      customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined,
      enrichmentStatus: row.enrichment_status as EnrichmentStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapEnrichedCompanyFromDB(row: mysql.RowDataPacket): EnrichedCompany {
    return {
      id: row.id,
      badgeScanId: row.badge_scan_id,
      companyName: row.company_name,
      domain: row.domain,
      employeeCount: row.employee_count,
      employeeRange: row.employee_range,
      industry: row.industry,
      industryCodes: row.industry_codes ? JSON.parse(row.industry_codes) : undefined,
      annualRevenue: row.annual_revenue,
      revenueRange: row.revenue_range,
      techStack: row.tech_stack ? JSON.parse(row.tech_stack) : undefined,
      fundingStage: row.funding_stage,
      totalFunding: row.total_funding,
      headquarters: row.headquarters,
      founded: row.founded,
      description: row.description,
      linkedinUrl: row.linkedin_url,
      twitterHandle: row.twitter_handle,
      consensusMetadata: JSON.parse(row.consensus_metadata),
      enrichedAt: new Date(row.enriched_at),
      dataSource: JSON.parse(row.data_source),
    }
  }

  private mapPersonaFromDB(row: mysql.RowDataPacket): Persona {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: Boolean(row.is_default),
      criteria: JSON.parse(row.criteria),
      weights: JSON.parse(row.weights),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
    }
  }

  private mapPersonaMatchFromDB(row: mysql.RowDataPacket): PersonaMatch {
    return {
      id: row.id,
      badgeScanId: row.badge_scan_id,
      personaId: row.persona_id,
      fitScore: parseFloat(row.fit_score),
      tier: row.tier as LeadTier,
      criteriaMatches: JSON.parse(row.criteria_matches),
      actionableInsights: row.actionable_insights ? JSON.parse(row.actionable_insights) : undefined,
      calculatedAt: new Date(row.calculated_at),
    }
  }

  private mapReportFromDB(row: mysql.RowDataPacket): Report {
    return {
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      filters: row.filters ? JSON.parse(row.filters) : undefined,
      generatedAt: new Date(row.generated_at),
      badgeScanIds: JSON.parse(row.badge_scan_ids),
      statistics: JSON.parse(row.statistics),
      exportedFormats: row.exported_formats ? JSON.parse(row.exported_formats) : undefined,
    }
  }

  private mapEventFromDB(row: mysql.RowDataPacket): Event {
    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      location: row.location,
      boothNumber: row.booth_number,
      createdAt: new Date(row.created_at),
    }
  }

  private mapStorageConfigFromDB(row: mysql.RowDataPacket): StorageAdapterConfiguration {
    return {
      id: row.id,
      adapterType: row.adapter_type,
      localStorageConfig: row.local_storage_config ? JSON.parse(row.local_storage_config) : undefined,
      mysqlConfig: row.mysql_config ? JSON.parse(row.mysql_config) : undefined,
      hubspotConfig: row.hubspot_config ? JSON.parse(row.hubspot_config) : undefined,
      isActive: Boolean(row.is_active),
      lastTestedAt: row.last_tested_at ? new Date(row.last_tested_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
