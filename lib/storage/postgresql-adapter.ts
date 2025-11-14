/**
 * PostgreSQL Storage Adapter Implementation
 *
 * Production-grade storage backend using PostgreSQL/Neon database
 * with connection pooling, prepared statements, and transaction support.
 *
 * Compatible with:
 * - Self-hosted PostgreSQL
 * - Neon Serverless PostgreSQL
 * - Supabase PostgreSQL
 * - AWS RDS PostgreSQL
 */

import { Pool, PoolClient } from 'pg'
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
  PostgreSQLConfig,
  List,
  Tag,
  MarkdownReport,
  ReportType,
} from '@/lib/types'
import { EnrichmentStatus } from '@/lib/types'
import { BaseStorageAdapter } from './adapter'

export class PostgreSQLAdapter extends BaseStorageAdapter {
  private pool: Pool | null = null

  constructor(config: StorageAdapterConfiguration) {
    super(config)
    if (!config.postgresqlConfig) {
      throw new Error('PostgreSQL configuration is required')
    }
  }

  private getPool(): Pool {
    if (!this.pool) {
      const pgConfig = this.config.postgresqlConfig as PostgreSQLConfig

      this.pool = new Pool({
        host: pgConfig.host,
        port: pgConfig.port,
        database: pgConfig.database,
        user: pgConfig.username,
        password: pgConfig.password,
        max: pgConfig.connectionPoolSize || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        // Neon/serverless compatibility
        ssl: pgConfig.ssl || process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined,
      })
    }
    return this.pool
  }

  // ===== Badge Scan Operations =====

  async saveBadgeScan(scan: BadgeScan): Promise<string> {
    const pool = this.getPool()
    const id = scan.id || this.generateId()

    await pool.query(
      `INSERT INTO badge_scans (
        id, event_id, scanned_at, first_name, last_name, email, company,
        job_title, phone, booth_location, event_name, notes, custom_fields,
        enrichment_status, proximity_group_id, contact_tier, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        company = EXCLUDED.company,
        job_title = EXCLUDED.job_title,
        phone = EXCLUDED.phone,
        enrichment_status = EXCLUDED.enrichment_status,
        contact_tier = EXCLUDED.contact_tier,
        updated_at = EXCLUDED.updated_at`,
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
        scan.enrichmentStatus || EnrichmentStatus.PENDING,
        scan.proximityGroupId || null,
        scan.contactTier || null,
        scan.createdAt || new Date(),
        scan.updatedAt || new Date(),
      ]
    )

    return id
  }

  async getBadgeScan(scanId: string): Promise<BadgeScan | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM badge_scans WHERE id = $1',
      [scanId]
    )

    if (result.rows.length === 0) return null

    return this.mapBadgeScanFromDB(result.rows[0])
  }

  async getAllBadgeScans(eventId?: string): Promise<BadgeScan[]> {
    const pool = this.getPool()

    const query = eventId
      ? 'SELECT * FROM badge_scans WHERE event_id = $1 ORDER BY scanned_at DESC'
      : 'SELECT * FROM badge_scans ORDER BY scanned_at DESC'

    const result = eventId
      ? await pool.query(query, [eventId])
      : await pool.query(query)

    return result.rows.map(row => this.mapBadgeScanFromDB(row))
  }

  async updateBadgeScanStatus(scanId: string, status: EnrichmentStatus): Promise<void> {
    const pool = this.getPool()
    await pool.query(
      'UPDATE badge_scans SET enrichment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, scanId]
    )
  }

  async updateBadgeScan(scanId: string, updates: Partial<BadgeScan>): Promise<void> {
    const pool = this.getPool()

    // Build dynamic UPDATE query
    const fields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue // Don't update ID

      const snakeKey = this.camelToSnake(key)
      fields.push(`${snakeKey} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }

    if (fields.length === 0) return

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(scanId)

    await pool.query(
      `UPDATE badge_scans SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }

  async bulkImportBadgeScans(scans: BadgeScan[]): Promise<string[]> {
    const pool = this.getPool()
    const client = await pool.connect()
    const ids: string[] = []

    try {
      await client.query('BEGIN')

      for (const scan of scans) {
        const id = await this.saveBadgeScan(scan)
        ids.push(id)
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    return ids
  }

  async flagDuplicate(scanId: string, duplicateOfId: string): Promise<void> {
    const pool = this.getPool()
    await pool.query(
      'UPDATE badge_scans SET is_duplicate = TRUE, duplicate_of_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [duplicateOfId, scanId]
    )
  }

  // ===== Enriched Company Operations =====

  async saveEnrichedCompany(enriched: EnrichedCompany): Promise<string> {
    const pool = this.getPool()
    const id = enriched.id || this.generateId()

    await pool.query(
      `INSERT INTO enriched_companies (
        id, badge_scan_id, company_name, website, industry, employee_count,
        annual_revenue, headquarters_location, description, technologies,
        funding_info, consensus_metadata, data_source, company_tier, enriched_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        website = EXCLUDED.website,
        industry = EXCLUDED.industry,
        employee_count = EXCLUDED.employee_count,
        annual_revenue = EXCLUDED.annual_revenue,
        headquarters_location = EXCLUDED.headquarters_location,
        description = EXCLUDED.description,
        technologies = EXCLUDED.technologies,
        funding_info = EXCLUDED.funding_info,
        consensus_metadata = EXCLUDED.consensus_metadata,
        data_source = EXCLUDED.data_source,
        company_tier = EXCLUDED.company_tier`,
      [
        id,
        enriched.badgeScanId,
        enriched.companyName,
        enriched.website || null,
        enriched.industry || null,
        enriched.employeeCount || null,
        enriched.annualRevenue || null,
        enriched.headquartersLocation || null,
        enriched.description || null,
        enriched.technologies ? JSON.stringify(enriched.technologies) : null,
        enriched.fundingInfo ? JSON.stringify(enriched.fundingInfo) : null,
        JSON.stringify(enriched.consensusMetadata || {}),
        enriched.dataSource || [],
        enriched.companyTier || null,
        enriched.enrichedAt,
      ]
    )

    return id
  }

  async getEnrichedCompany(badgeScanId: string): Promise<EnrichedCompany | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM enriched_companies WHERE badge_scan_id = $1 LIMIT 1',
      [badgeScanId]
    )

    if (result.rows.length === 0) return null

    return this.mapEnrichedCompanyFromDB(result.rows[0])
  }

  async updateEnrichment(
    badgeScanId: string,
    enrichedData: Partial<EnrichedCompany>
  ): Promise<void> {
    const existing = await this.getEnrichedCompany(badgeScanId)

    if (!existing) {
      throw new Error(`No enrichment data found for badge scan: ${badgeScanId}`)
    }

    const updated: EnrichedCompany = {
      ...existing,
      ...enrichedData,
    }

    await this.saveEnrichedCompany(updated)
  }

  // ===== Persona Operations =====

  async savePersona(persona: Persona): Promise<string> {
    const pool = this.getPool()
    const id = persona.id || this.generateId()

    await pool.query(
      `INSERT INTO personas (id, name, description, is_default, criteria)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_default = EXCLUDED.is_default,
        criteria = EXCLUDED.criteria,
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        persona.name,
        persona.description || null,
        persona.isDefault || false,
        JSON.stringify(persona.criteria),
      ]
    )

    return id
  }

  async getPersona(personaId: string): Promise<Persona | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM personas WHERE id = $1',
      [personaId]
    )

    if (result.rows.length === 0) return null

    return this.mapPersonaFromDB(result.rows[0])
  }

  async getAllPersonas(): Promise<Persona[]> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM personas ORDER BY is_default DESC, name ASC'
    )

    return result.rows.map(row => this.mapPersonaFromDB(row))
  }

  async getDefaultPersonas(): Promise<Persona[]> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM personas WHERE is_default = TRUE ORDER BY name ASC'
    )

    return result.rows.map(row => this.mapPersonaFromDB(row))
  }

  async updatePersona(personaId: string, updates: Partial<Persona>): Promise<void> {
    const existing = await this.getPersona(personaId)

    if (!existing) {
      throw new Error(`Persona not found: ${personaId}`)
    }

    const updated: Persona = {
      ...existing,
      ...updates,
    }

    await this.savePersona(updated)
  }

  async deletePersona(personaId: string): Promise<void> {
    const pool = this.getPool()

    // Check if persona is used in any matches
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM persona_matches WHERE persona_id = $1',
      [personaId]
    )

    if (parseInt(usageCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete persona that is referenced in persona matches')
    }

    await pool.query('DELETE FROM personas WHERE id = $1', [personaId])
  }

  // ===== Persona Match Operations =====

  async savePersonaMatch(match: PersonaMatch): Promise<string> {
    const pool = this.getPool()
    const id = match.id || this.generateId()

    await pool.query(
      `INSERT INTO persona_matches (
        id, badge_scan_id, persona_id, fit_score, assigned_tier, score_breakdown, matched_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        match.badgeScanId,
        match.personaId,
        match.fitScore,
        match.assignedTier,
        JSON.stringify(match.scoreBreakdown || {}),
        match.matchedAt || new Date(),
      ]
    )

    return id
  }

  async getPersonaMatchesForScan(badgeScanId: string): Promise<PersonaMatch[]> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM persona_matches WHERE badge_scan_id = $1 ORDER BY fit_score DESC',
      [badgeScanId]
    )

    return result.rows.map(row => this.mapPersonaMatchFromDB(row))
  }

  async getBestPersonaMatch(badgeScanId: string): Promise<PersonaMatch | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM persona_matches WHERE badge_scan_id = $1 ORDER BY fit_score DESC LIMIT 1',
      [badgeScanId]
    )

    if (result.rows.length === 0) return null

    return this.mapPersonaMatchFromDB(result.rows[0])
  }

  // ===== Report Operations =====

  async saveReport(report: Report): Promise<string> {
    const pool = this.getPool()
    const id = report.id || this.generateId()

    await pool.query(
      `INSERT INTO reports (
        id, event_id, name, generated_at, badge_scan_ids, total_scans,
        hot_count, warm_count, cold_count, unscored_count,
        company_tier_breakdown, contact_tier_breakdown, combined_tier_breakdown,
        filters, statistics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        report.eventId,
        report.name,
        report.generatedAt,
        report.badgeScanIds || [],
        report.totalScans,
        report.hotCount,
        report.warmCount,
        report.coldCount,
        report.unscoredCount,
        report.companyTierBreakdown ? JSON.stringify(report.companyTierBreakdown) : null,
        report.contactTierBreakdown ? JSON.stringify(report.contactTierBreakdown) : null,
        report.combinedTierBreakdown ? JSON.stringify(report.combinedTierBreakdown) : null,
        report.filters ? JSON.stringify(report.filters) : null,
        report.statistics ? JSON.stringify(report.statistics) : null,
      ]
    )

    return id
  }

  async getReport(reportId: string): Promise<Report | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    )

    if (result.rows.length === 0) return null

    return this.mapReportFromDB(result.rows[0])
  }

  async getAllReports(eventId?: string): Promise<Report[]> {
    const pool = this.getPool()

    const query = eventId
      ? 'SELECT * FROM reports WHERE event_id = $1 ORDER BY generated_at DESC'
      : 'SELECT * FROM reports ORDER BY generated_at DESC'

    const result = eventId
      ? await pool.query(query, [eventId])
      : await pool.query(query)

    return result.rows.map(row => this.mapReportFromDB(row))
  }

  async deleteReport(reportId: string): Promise<void> {
    const pool = this.getPool()
    await pool.query('DELETE FROM reports WHERE id = $1', [reportId])
  }

  async generateReport(eventId: string, filters?: ReportFilters): Promise<Report> {
    // Implementation would aggregate badge scans and calculate statistics
    throw new Error('generateReport not yet implemented for PostgreSQL adapter')
  }

  // ===== Event Operations =====

  async saveEvent(event: Event): Promise<string> {
    const pool = this.getPool()
    const id = event.id || this.generateId()

    await pool.query(
      `INSERT INTO events (id, name, start_date, end_date, location, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        location = EXCLUDED.location,
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        event.name,
        event.startDate || null,
        event.endDate || null,
        event.location || null,
        event.description || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    )

    return id
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM events WHERE id = $1',
      [eventId]
    )

    if (result.rows.length === 0) return null

    return this.mapEventFromDB(result.rows[0])
  }

  async getAllEvents(): Promise<Event[]> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM events ORDER BY start_date DESC NULLS LAST, created_at DESC'
    )

    return result.rows.map(row => this.mapEventFromDB(row))
  }

  // ===== List Operations (FR-030) =====

  async saveList(list: List): Promise<string> {
    const pool = this.getPool()
    const id = list.id || this.generateId()

    await pool.query(
      `INSERT INTO lists (id, name, description, badge_scan_ids)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        badge_scan_ids = EXCLUDED.badge_scan_ids,
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        list.name,
        list.description || null,
        list.badgeScanIds || [],
      ]
    )

    return id
  }

  async getList(listId: string): Promise<List | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM lists WHERE id = $1',
      [listId]
    )

    if (result.rows.length === 0) return null

    return this.mapListFromDB(result.rows[0])
  }

  async getAllLists(): Promise<List[]> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM lists ORDER BY name ASC'
    )

    return result.rows.map(row => this.mapListFromDB(row))
  }

  async updateList(listId: string, updates: Partial<List>): Promise<void> {
    const existing = await this.getList(listId)

    if (!existing) {
      throw new Error(`List not found: ${listId}`)
    }

    const updated: List = {
      ...existing,
      ...updates,
    }

    await this.saveList(updated)
  }

  async deleteList(listId: string): Promise<void> {
    const pool = this.getPool()
    await pool.query('DELETE FROM lists WHERE id = $1', [listId])
  }

  // ===== Tag Operations (FR-029) =====

  async saveTag(tag: Tag): Promise<string> {
    const pool = this.getPool()
    const id = tag.id || this.generateId()

    await pool.query(
      `INSERT INTO tags (id, name, color, description)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        color = EXCLUDED.color,
        description = EXCLUDED.description`,
      [
        id,
        tag.name,
        tag.color || null,
        tag.description || null,
      ]
    )

    return id
  }

  async getTag(tagId: string): Promise<Tag | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM tags WHERE id = $1',
      [tagId]
    )

    if (result.rows.length === 0) return null

    return this.mapTagFromDB(result.rows[0])
  }

  async getAllTags(): Promise<Tag[]> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM tags ORDER BY name ASC'
    )

    return result.rows.map(row => this.mapTagFromDB(row))
  }

  async updateTag(tagId: string, updates: Partial<Tag>): Promise<void> {
    const existing = await this.getTag(tagId)

    if (!existing) {
      throw new Error(`Tag not found: ${tagId}`)
    }

    const updated: Tag = {
      ...existing,
      ...updates,
    }

    await this.saveTag(updated)
  }

  async deleteTag(tagId: string): Promise<void> {
    const pool = this.getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Delete tag associations
      await client.query('DELETE FROM badge_scan_tags WHERE tag_id = $1', [tagId])

      // Delete tag
      await client.query('DELETE FROM tags WHERE id = $1', [tagId])

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // ===== Markdown Report Operations =====

  async saveMarkdownReport(report: MarkdownReport): Promise<string> {
    const pool = this.getPool()
    const id = report.id || this.generateId()

    await pool.query(
      `INSERT INTO markdown_reports (
        id, report_type, event_id, badge_scan_id, markdown_content,
        generated_at, version, feedback_applied, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        report.reportType,
        report.eventId,
        report.badgeScanId || null,
        report.markdownContent,
        report.generatedAt,
        report.version || 1,
        report.feedbackApplied || null,
        report.metadata ? JSON.stringify(report.metadata) : null,
      ]
    )

    return id
  }

  async getMarkdownReport(reportId: string): Promise<MarkdownReport | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM markdown_reports WHERE id = $1',
      [reportId]
    )

    if (result.rows.length === 0) return null

    return this.mapMarkdownReportFromDB(result.rows[0])
  }

  async getAllMarkdownReports(eventId: string, reportType?: ReportType): Promise<MarkdownReport[]> {
    const pool = this.getPool()

    const query = reportType
      ? 'SELECT * FROM markdown_reports WHERE event_id = $1 AND report_type = $2 ORDER BY generated_at DESC'
      : 'SELECT * FROM markdown_reports WHERE event_id = $1 ORDER BY generated_at DESC'

    const result = reportType
      ? await pool.query(query, [eventId, reportType])
      : await pool.query(query, [eventId])

    return result.rows.map(row => this.mapMarkdownReportFromDB(row))
  }

  async getLatestMarkdownReportForScan(
    badgeScanId: string,
    reportType: ReportType
  ): Promise<MarkdownReport | null> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM markdown_reports WHERE badge_scan_id = $1 AND report_type = $2 ORDER BY version DESC, generated_at DESC LIMIT 1',
      [badgeScanId, reportType]
    )

    if (result.rows.length === 0) return null

    return this.mapMarkdownReportFromDB(result.rows[0])
  }

  async deleteMarkdownReport(reportId: string): Promise<void> {
    const pool = this.getPool()
    await pool.query('DELETE FROM markdown_reports WHERE id = $1', [reportId])
  }

  // ===== Configuration Operations =====

  async saveStorageConfig(config: StorageAdapterConfiguration): Promise<string> {
    const pool = this.getPool()
    const id = config.id || this.generateId()

    await pool.query(
      `INSERT INTO storage_configurations (id, adapter_type, is_active, config)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        adapter_type = EXCLUDED.adapter_type,
        is_active = EXCLUDED.is_active,
        config = EXCLUDED.config,
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        config.adapterType,
        config.isActive || false,
        JSON.stringify(config),
      ]
    )

    return id
  }

  async getActiveStorageConfig(): Promise<StorageAdapterConfiguration> {
    const pool = this.getPool()
    const result = await pool.query(
      'SELECT * FROM storage_configurations WHERE is_active = TRUE LIMIT 1'
    )

    if (result.rows.length === 0) {
      throw new Error('No active storage configuration found')
    }

    return JSON.parse(result.rows[0].config)
  }

  async setActiveStorageConfig(configId: string): Promise<void> {
    const pool = this.getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Deactivate all configs
      await client.query('UPDATE storage_configurations SET is_active = FALSE')

      // Activate specified config
      await client.query(
        'UPDATE storage_configurations SET is_active = TRUE WHERE id = $1',
        [configId]
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // ===== Migration Operations =====

  async exportAll(): Promise<ExportedData> {
    throw new Error('exportAll not yet implemented for PostgreSQL adapter')
  }

  async importAll(data: ExportedData): Promise<void> {
    throw new Error('importAll not yet implemented for PostgreSQL adapter')
  }

  async exportToFormat(eventId: string, format: ExportFormat): Promise<string> {
    throw new Error('exportToFormat not yet implemented for PostgreSQL adapter')
  }

  // ===== Connection Management =====

  async testConnection(): Promise<boolean> {
    try {
      const pool = this.getPool()
      await pool.query('SELECT 1')
      return true
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }

  // ===== Helper Methods =====

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }

  private mapBadgeScanFromDB(row: any): BadgeScan {
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
      customFields: row.custom_fields,
      enrichmentStatus: row.enrichment_status,
      isDuplicate: row.is_duplicate,
      duplicateOfId: row.duplicate_of_id,
      proximityGroupId: row.proximity_group_id,
      contactTier: row.contact_tier,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapEnrichedCompanyFromDB(row: any): EnrichedCompany {
    return {
      id: row.id,
      badgeScanId: row.badge_scan_id,
      companyName: row.company_name,
      website: row.website,
      industry: row.industry,
      employeeCount: row.employee_count,
      annualRevenue: row.annual_revenue,
      headquartersLocation: row.headquarters_location,
      description: row.description,
      technologies: row.technologies,
      fundingInfo: row.funding_info,
      consensusMetadata: row.consensus_metadata,
      dataSource: row.data_source,
      companyTier: row.company_tier,
      enrichedAt: new Date(row.enriched_at),
    }
  }

  private mapPersonaFromDB(row: any): Persona {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isDefault: row.is_default,
      criteria: row.criteria,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapPersonaMatchFromDB(row: any): PersonaMatch {
    return {
      id: row.id,
      badgeScanId: row.badge_scan_id,
      personaId: row.persona_id,
      fitScore: parseFloat(row.fit_score),
      assignedTier: row.assigned_tier,
      scoreBreakdown: row.score_breakdown,
      matchedAt: new Date(row.matched_at),
    }
  }

  private mapReportFromDB(row: any): Report {
    return {
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      generatedAt: new Date(row.generated_at),
      badgeScanIds: row.badge_scan_ids,
      totalScans: row.total_scans,
      hotCount: row.hot_count,
      warmCount: row.warm_count,
      coldCount: row.cold_count,
      unscoredCount: row.unscored_count,
      companyTierBreakdown: row.company_tier_breakdown,
      contactTierBreakdown: row.contact_tier_breakdown,
      combinedTierBreakdown: row.combined_tier_breakdown,
      filters: row.filters,
      statistics: row.statistics,
    }
  }

  private mapEventFromDB(row: any): Event {
    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      location: row.location,
      description: row.description,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapListFromDB(row: any): List {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      badgeScanIds: row.badge_scan_ids,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  private mapTagFromDB(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
      createdAt: new Date(row.created_at),
    }
  }

  private mapMarkdownReportFromDB(row: any): MarkdownReport {
    return {
      id: row.id,
      reportType: row.report_type,
      eventId: row.event_id,
      badgeScanId: row.badge_scan_id,
      markdownContent: row.markdown_content,
      generatedAt: new Date(row.generated_at),
      version: row.version,
      feedbackApplied: row.feedback_applied,
      metadata: row.metadata,
    }
  }
}
