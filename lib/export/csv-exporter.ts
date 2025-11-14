/**
 * CSV Export Utility with CRM-Compatible Headers
 *
 * Uses papaparse for reliable CSV generation with headers compatible with
 * Salesforce, HubSpot, Zoho, and other major CRM systems.
 */

import Papa from 'papaparse'
import type { BadgeScan, EnrichedCompany, PersonaMatch, LeadTier } from '@/lib/types'

/**
 * Interface for enriched lead data (combination of badge scan + enrichment + persona match)
 */
export interface EnrichedLeadRow {
  // CRM Standard Fields (compatible with Salesforce, HubSpot, Zoho)
  'First Name'?: string
  'Last Name'?: string
  'Email': string
  'Company': string
  'Job Title'?: string
  'Phone'?: string

  // Additional Contact Info
  'Event Name': string
  'Scanned At': string
  'Booth Location'?: string

  // Company Intelligence
  'Industry'?: string
  'Employee Count'?: number
  'Revenue Range'?: string
  'Headquarters'?: string
  'Company Domain'?: string
  'Tech Stack'?: string

  // Lead Scoring
  'Lead Tier': LeadTier
  'Fit Score': number
  'Persona Match'?: string

  // Actionable Insights
  'Pain Points'?: string
  'Conversation Starters'?: string

  // Internal IDs
  'Badge Scan ID': string
  'Enrichment Status': string
}

/**
 * Convert enriched leads to CSV with CRM-compatible headers
 */
export function exportEnrichedLeadsToCSV(
  badgeScans: BadgeScan[],
  enrichedCompanies: Map<string, EnrichedCompany>,
  personaMatches: Map<string, PersonaMatch>
): string {
  const rows: EnrichedLeadRow[] = badgeScans.map((scan) => {
    const enriched = enrichedCompanies.get(scan.id)
    const match = personaMatches.get(scan.id)

    return {
      'First Name': scan.firstName || '',
      'Last Name': scan.lastName || '',
      'Email': scan.email || '',
      'Company': scan.company,
      'Job Title': scan.jobTitle || '',
      'Phone': scan.phone || '',

      'Event Name': scan.eventName,
      'Scanned At': scan.scannedAt.toISOString(),
      'Booth Location': scan.boothLocation || '',

      'Industry': enriched?.industry || '',
      'Employee Count': enriched?.employeeCount,
      'Revenue Range': enriched?.revenueRange || '',
      'Headquarters': enriched?.headquarters || '',
      'Company Domain': enriched?.domain || '',
      'Tech Stack': enriched?.techStack?.join(', ') || '',

      'Lead Tier': match?.tier || 'Unscored',
      'Fit Score': match?.fitScore || 0,
      'Persona Match': match?.personaId || '',

      'Pain Points': match?.actionableInsights?.filter(i => i.startsWith('Pain:')).join('; ') || '',
      'Conversation Starters': match?.actionableInsights?.filter(i => i.startsWith('Starter:')).join('; ') || '',

      'Badge Scan ID': scan.id,
      'Enrichment Status': scan.enrichmentStatus,
    }
  })

  return Papa.unparse(rows, {
    header: true,
    skipEmptyLines: true,
  })
}

/**
 * Export leads filtered by tier
 */
export function exportLeadsByTier(
  badgeScans: BadgeScan[],
  enrichedCompanies: Map<string, EnrichedCompany>,
  personaMatches: Map<string, PersonaMatch>,
  tier: LeadTier
): string {
  const filteredScans = badgeScans.filter((scan) => {
    const match = personaMatches.get(scan.id)
    return match?.tier === tier
  })

  return exportEnrichedLeadsToCSV(filteredScans, enrichedCompanies, personaMatches)
}

/**
 * Export minimal CRM import format (essential fields only)
 */
export function exportForCRMImport(
  badgeScans: BadgeScan[],
  enrichedCompanies: Map<string, EnrichedCompany>,
  personaMatches: Map<string, PersonaMatch>
): string {
  const rows = badgeScans.map((scan) => {
    const enriched = enrichedCompanies.get(scan.id)
    const match = personaMatches.get(scan.id)

    return {
      'First Name': scan.firstName || '',
      'Last Name': scan.lastName || '',
      'Email': scan.email || '',
      'Company': scan.company,
      'Job Title': scan.jobTitle || '',
      'Phone': scan.phone || '',
      'Lead Source': 'Trade Show',
      'Lead Status': match?.tier === 'Hot' ? 'Hot Lead' : match?.tier === 'Warm' ? 'Warm Lead' : 'Cold Lead',
      'Rating': match?.tier || 'Unscored',
      'Description': `Event: ${scan.eventName}. Fit Score: ${match?.fitScore || 0}`,
    }
  })

  return Papa.unparse(rows, {
    header: true,
    skipEmptyLines: true,
  })
}

/**
 * Export to CSV file blob (for download)
 */
export function createCSVBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

/**
 * Generate filename with timestamp
 */
export function generateCSVFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${prefix}_${timestamp}.csv`
}

/**
 * Trigger browser download of CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = createCSVBlob(csvContent)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
