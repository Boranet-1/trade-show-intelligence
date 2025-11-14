/**
 * Storage Adapter Interface Contract
 *
 * All storage implementations (Local, MySQL, HubSpot) MUST implement this interface
 * to ensure pluggable storage architecture (Constitution Principle II).
 *
 * This interface defines the contract for all data persistence operations.
 * Business logic MUST NOT directly access storage implementations - all access
 * must be through this interface to enable adapter switching via configuration.
 */

import type {
  BadgeScan,
  EnrichedCompany,
  Persona,
  PersonaMatch,
  Report,
  Event,
  StorageAdapterConfiguration,
  EnrichmentStatus,
  ReportFilters,
  ExportedData,
  ExportFormat,
  List,
  Tag,
} from '@/lib/types'

/**
 * Core storage adapter interface
 */
export interface StorageAdapter {
  // ===== Badge Scan Operations =====

  /**
   * Save a single badge scan record
   * @param scan - Badge scan data to persist
   * @returns Promise resolving to scanId (UUID)
   */
  saveBadgeScan(scan: BadgeScan): Promise<string>

  /**
   * Retrieve badge scan by ID
   * @param scanId - Badge scan UUID
   * @returns Promise resolving to badge scan or null if not found
   */
  getBadgeScan(scanId: string): Promise<BadgeScan | null>

  /**
   * Retrieve all badge scans, optionally filtered by event
   * @param eventId - Optional event ID to filter by
   * @returns Promise resolving to array of badge scans
   */
  getAllBadgeScans(eventId?: string): Promise<BadgeScan[]>

  /**
   * Update badge scan enrichment status
   * @param scanId - Badge scan UUID
   * @param status - New enrichment status
   * @returns Promise resolving when update complete
   */
  updateBadgeScanStatus(scanId: string, status: EnrichmentStatus): Promise<void>

  /**
   * Bulk import badge scans from CSV upload
   * @param scans - Array of badge scan records
   * @returns Promise resolving to array of created scanIds
   */
  bulkImportBadgeScans(scans: BadgeScan[]): Promise<string[]>

  /**
   * Flag badge scan as duplicate of another scan
   * @param scanId - Badge scan UUID to flag
   * @param duplicateOfId - UUID of original scan
   * @returns Promise resolving when flag set
   */
  flagDuplicate(scanId: string, duplicateOfId: string): Promise<void>

  // ===== Enriched Company Operations =====

  /**
   * Save enriched company data linked to badge scan
   * @param enriched - Enriched company record
   * @returns Promise resolving to enriched company ID (UUID)
   */
  saveEnrichedCompany(enriched: EnrichedCompany): Promise<string>

  /**
   * Retrieve enriched company data for badge scan
   * @param badgeScanId - Badge scan UUID
   * @returns Promise resolving to enriched company or null if not enriched
   */
  getEnrichedCompany(badgeScanId: string): Promise<EnrichedCompany | null>

  /**
   * Update enrichment data for existing badge scan
   * @param badgeScanId - Badge scan UUID
   * @param enrichedData - Partial enriched company data to update
   * @returns Promise resolving when update complete
   */
  updateEnrichment(
    badgeScanId: string,
    enrichedData: Partial<EnrichedCompany>
  ): Promise<void>

  // ===== Persona Operations =====

  /**
   * Save persona template
   * @param persona - Persona definition
   * @returns Promise resolving to persona ID (UUID)
   */
  savePersona(persona: Persona): Promise<string>

  /**
   * Retrieve persona by ID
   * @param personaId - Persona UUID
   * @returns Promise resolving to persona or null if not found
   */
  getPersona(personaId: string): Promise<Persona | null>

  /**
   * Retrieve all persona templates
   * @returns Promise resolving to array of personas
   */
  getAllPersonas(): Promise<Persona[]>

  /**
   * Retrieve default persona templates
   * @returns Promise resolving to array of default personas
   */
  getDefaultPersonas(): Promise<Persona[]>

  /**
   * Update existing persona template
   * @param personaId - Persona UUID
   * @param updates - Partial persona data to update
   * @returns Promise resolving when update complete
   */
  updatePersona(personaId: string, updates: Partial<Persona>): Promise<void>

  /**
   * Delete persona template
   * @param personaId - Persona UUID
   * @returns Promise resolving when deletion complete
   * @throws Error if persona is in use by existing reports
   */
  deletePersona(personaId: string): Promise<void>

  // ===== Persona Match Operations =====

  /**
   * Save persona match (lead scoring result)
   * @param match - Persona match record
   * @returns Promise resolving to match ID (UUID)
   */
  savePersonaMatch(match: PersonaMatch): Promise<string>

  /**
   * Retrieve all persona matches for badge scan
   * @param badgeScanId - Badge scan UUID
   * @returns Promise resolving to array of persona matches
   */
  getPersonaMatchesForScan(badgeScanId: string): Promise<PersonaMatch[]>

  /**
   * Retrieve best persona match for badge scan (highest fitScore)
   * @param badgeScanId - Badge scan UUID
   * @returns Promise resolving to best persona match or null if no matches
   */
  getBestPersonaMatch(badgeScanId: string): Promise<PersonaMatch | null>

  // ===== Report Operations =====

  /**
   * Save generated report
   * @param report - Report record
   * @returns Promise resolving to report ID (UUID)
   */
  saveReport(report: Report): Promise<string>

  /**
   * Retrieve report by ID
   * @param reportId - Report UUID
   * @returns Promise resolving to report or null if not found
   */
  getReport(reportId: string): Promise<Report | null>

  /**
   * Retrieve all reports, optionally filtered by event
   * @param eventId - Optional event ID to filter by
   * @returns Promise resolving to array of reports
   */
  getAllReports(eventId?: string): Promise<Report[]>

  /**
   * Delete report
   * @param reportId - Report UUID
   * @returns Promise resolving when deletion complete
   */
  deleteReport(reportId: string): Promise<void>

  /**
   * Generate report from enriched badge scans with filters
   * @param eventId - Event ID to generate report for
   * @param filters - Optional report filters
   * @returns Promise resolving to generated report
   */
  generateReport(eventId: string, filters?: ReportFilters): Promise<Report>

  // ===== Event Operations =====

  /**
   * Save trade show event
   * @param event - Event record
   * @returns Promise resolving to event ID
   */
  saveEvent(event: Event): Promise<string>

  /**
   * Retrieve event by ID
   * @param eventId - Event ID
   * @returns Promise resolving to event or null if not found
   */
  getEvent(eventId: string): Promise<Event | null>

  /**
   * Retrieve all events
   * @returns Promise resolving to array of events
   */
  getAllEvents(): Promise<Event[]>

  // ===== List Operations (FR-030) =====

  /**
   * Save list
   * @param list - List record
   * @returns Promise resolving to list ID (UUID)
   */
  saveList(list: List): Promise<string>

  /**
   * Retrieve list by ID
   * @param listId - List UUID
   * @returns Promise resolving to list or null if not found
   */
  getList(listId: string): Promise<List | null>

  /**
   * Retrieve all lists
   * @returns Promise resolving to array of lists
   */
  getAllLists(): Promise<List[]>

  /**
   * Update existing list
   * @param listId - List UUID
   * @param updates - Partial list data to update
   * @returns Promise resolving when update complete
   */
  updateList(listId: string, updates: Partial<List>): Promise<void>

  /**
   * Delete list
   * @param listId - List UUID
   * @returns Promise resolving when deletion complete
   */
  deleteList(listId: string): Promise<void>

  // ===== Tag Operations (FR-029) =====

  /**
   * Save tag
   * @param tag - Tag record
   * @returns Promise resolving to tag ID (UUID)
   */
  saveTag(tag: Tag): Promise<string>

  /**
   * Retrieve tag by ID
   * @param tagId - Tag UUID
   * @returns Promise resolving to tag or null if not found
   */
  getTag(tagId: string): Promise<Tag | null>

  /**
   * Retrieve all tags
   * @returns Promise resolving to array of tags
   */
  getAllTags(): Promise<Tag[]>

  /**
   * Update existing tag
   * @param tagId - Tag UUID
   * @param updates - Partial tag data to update
   * @returns Promise resolving when update complete
   */
  updateTag(tagId: string, updates: Partial<Tag>): Promise<void>

  /**
   * Delete tag
   * @param tagId - Tag UUID
   * @returns Promise resolving when deletion complete
   */
  deleteTag(tagId: string): Promise<void>

  // ===== Configuration Operations =====

  /**
   * Save storage adapter configuration
   * @param config - Storage configuration
   * @returns Promise resolving to configuration ID (UUID)
   */
  saveStorageConfig(config: StorageAdapterConfiguration): Promise<string>

  /**
   * Retrieve active storage configuration
   * @returns Promise resolving to active configuration
   * @throws Error if no active configuration exists
   */
  getActiveStorageConfig(): Promise<StorageAdapterConfiguration>

  /**
   * Set storage configuration as active
   * @param configId - Configuration UUID to activate
   * @returns Promise resolving when activation complete
   */
  setActiveStorageConfig(configId: string): Promise<void>

  // ===== Migration Operations =====

  /**
   * Export all data from this storage adapter (for migration)
   * @returns Promise resolving to complete data export
   */
  exportAll(): Promise<ExportedData>

  /**
   * Import all data into this storage adapter (for migration)
   * @param data - Data to import from previous adapter
   * @returns Promise resolving when import complete
   */
  importAll(data: ExportedData): Promise<void>

  /**
   * Export report to specific format (CRO_summary.md, company reports)
   * @param eventId - Event ID to export
   * @param format - Export format
   * @returns Promise resolving to file path or data
   */
  exportToFormat(eventId: string, format: ExportFormat): Promise<string>

  // ===== Connection Management =====

  /**
   * Test connection to storage backend
   * @returns Promise resolving to true if connection successful
   * @throws Error with descriptive message if connection fails
   */
  testConnection(): Promise<boolean>

  /**
   * Close all connections and cleanup resources
   * @returns Promise resolving when cleanup complete
   */
  close(): Promise<void>
}

/**
 * Factory function type for creating storage adapters
 */
export type StorageAdapterFactory = (
  config: StorageAdapterConfiguration
) => Promise<StorageAdapter>

/**
 * Storage adapter implementation registry
 */
export interface StorageAdapterRegistry {
  LOCAL: StorageAdapterFactory
  MYSQL: StorageAdapterFactory
  HUBSPOT: StorageAdapterFactory
}

/**
 * Base storage adapter implementation with common utilities
 * Concrete adapters can extend this class for shared functionality
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  constructor(protected config: StorageAdapterConfiguration) {}

  // Abstract methods that must be implemented by concrete adapters
  abstract saveBadgeScan(scan: BadgeScan): Promise<string>
  abstract getBadgeScan(scanId: string): Promise<BadgeScan | null>
  abstract getAllBadgeScans(eventId?: string): Promise<BadgeScan[]>
  abstract updateBadgeScanStatus(scanId: string, status: EnrichmentStatus): Promise<void>
  abstract bulkImportBadgeScans(scans: BadgeScan[]): Promise<string[]>
  abstract flagDuplicate(scanId: string, duplicateOfId: string): Promise<void>

  abstract saveEnrichedCompany(enriched: EnrichedCompany): Promise<string>
  abstract getEnrichedCompany(badgeScanId: string): Promise<EnrichedCompany | null>
  abstract updateEnrichment(badgeScanId: string, enrichedData: Partial<EnrichedCompany>): Promise<void>

  abstract savePersona(persona: Persona): Promise<string>
  abstract getPersona(personaId: string): Promise<Persona | null>
  abstract getAllPersonas(): Promise<Persona[]>
  abstract getDefaultPersonas(): Promise<Persona[]>
  abstract updatePersona(personaId: string, updates: Partial<Persona>): Promise<void>
  abstract deletePersona(personaId: string): Promise<void>

  abstract savePersonaMatch(match: PersonaMatch): Promise<string>
  abstract getPersonaMatchesForScan(badgeScanId: string): Promise<PersonaMatch[]>
  abstract getBestPersonaMatch(badgeScanId: string): Promise<PersonaMatch | null>

  abstract saveReport(report: Report): Promise<string>
  abstract getReport(reportId: string): Promise<Report | null>
  abstract getAllReports(eventId?: string): Promise<Report[]>
  abstract deleteReport(reportId: string): Promise<void>
  abstract generateReport(eventId: string, filters?: ReportFilters): Promise<Report>

  abstract saveEvent(event: Event): Promise<string>
  abstract getEvent(eventId: string): Promise<Event | null>
  abstract getAllEvents(): Promise<Event[]>

  abstract saveList(list: List): Promise<string>
  abstract getList(listId: string): Promise<List | null>
  abstract getAllLists(): Promise<List[]>
  abstract updateList(listId: string, updates: Partial<List>): Promise<void>
  abstract deleteList(listId: string): Promise<void>

  abstract saveTag(tag: Tag): Promise<string>
  abstract getTag(tagId: string): Promise<Tag | null>
  abstract getAllTags(): Promise<Tag[]>
  abstract updateTag(tagId: string, updates: Partial<Tag>): Promise<void>
  abstract deleteTag(tagId: string): Promise<void>

  abstract saveStorageConfig(config: StorageAdapterConfiguration): Promise<string>
  abstract getActiveStorageConfig(): Promise<StorageAdapterConfiguration>
  abstract setActiveStorageConfig(configId: string): Promise<void>

  abstract exportAll(): Promise<ExportedData>
  abstract importAll(data: ExportedData): Promise<void>
  abstract exportToFormat(eventId: string, format: ExportFormat): Promise<string>

  abstract testConnection(): Promise<boolean>
  abstract close(): Promise<void>

  // Shared utility methods available to all adapters

  /**
   * Generate UUID v4
   */
  protected generateId(): string {
    return crypto.randomUUID()
  }

  /**
   * Validate email format
   */
  protected isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  /**
   * Normalize domain (lowercase, no protocol, no path)
   */
  protected normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
  }

  /**
   * Calculate tier from fit score
   */
  protected calculateTier(fitScore: number, hasEnoughData: boolean): 'Hot' | 'Warm' | 'Cold' | 'Unscored' {
    if (!hasEnoughData) return 'Unscored'
    if (fitScore >= 70) return 'Hot'
    if (fitScore >= 40) return 'Warm'
    return 'Cold'
  }

  /**
   * Validate persona weights sum to 1.0
   */
  protected validatePersonaWeights(weights: Record<string, number>): boolean {
    const sum = Object.values(weights).reduce((acc, w) => acc + w, 0)
    return Math.abs(sum - 1.0) < 0.001
  }
}
