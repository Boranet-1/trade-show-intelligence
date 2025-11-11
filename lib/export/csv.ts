/**
 * CSV Export Utility
 *
 * Exports data to CSV format for manual import to Google Sheets
 */

import type { BadgeScan, EnrichedCompany, PersonaMatch, Report } from '@/lib/types'

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) {
    return headers.map((h) => escapeCSV(h.label)).join(',')
  }

  // Header row
  const headerRow = headers.map((h) => escapeCSV(h.label)).join(',')

  // Data rows
  const dataRows = data.map((row) => {
    return headers
      .map((h) => {
        const value = row[h.key]
        return escapeCSV(formatValue(value))
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return ''
  }

  const str = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Format value for CSV export
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.join('; ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

/**
 * Export badge scans to CSV
 */
export function exportBadgeScansToCSV(scans: BadgeScan[]): string {
  const headers = [
    { key: 'id' as const, label: 'ID' },
    { key: 'eventId' as const, label: 'Event ID' },
    { key: 'name' as const, label: 'Name' },
    { key: 'email' as const, label: 'Email' },
    { key: 'company' as const, label: 'Company' },
    { key: 'title' as const, label: 'Title' },
    { key: 'phone' as const, label: 'Phone' },
    { key: 'notes' as const, label: 'Notes' },
    { key: 'status' as const, label: 'Status' },
    { key: 'scannedAt' as const, label: 'Scanned At' },
    { key: 'createdAt' as const, label: 'Created At' },
  ]

  return arrayToCSV(scans, headers)
}

/**
 * Export enriched companies to CSV
 */
export function exportEnrichedCompaniesToCSV(companies: EnrichedCompany[]): string {
  const headers = [
    { key: 'id' as const, label: 'ID' },
    { key: 'badgeScanId' as const, label: 'Badge Scan ID' },
    { key: 'eventId' as const, label: 'Event ID' },
    { key: 'companyName' as const, label: 'Company Name' },
    { key: 'domain' as const, label: 'Domain' },
    { key: 'industry' as const, label: 'Industry' },
    { key: 'companySize' as const, label: 'Company Size' },
    { key: 'employeeCount' as const, label: 'Employee Count' },
    { key: 'revenue' as const, label: 'Revenue' },
    { key: 'headquarters' as const, label: 'Headquarters' },
    { key: 'description' as const, label: 'Description' },
    { key: 'technologies' as const, label: 'Technologies' },
    { key: 'businessModel' as const, label: 'Business Model' },
    { key: 'keyProducts' as const, label: 'Key Products' },
    { key: 'targetMarket' as const, label: 'Target Market' },
    { key: 'fundingStage' as const, label: 'Funding Stage' },
    { key: 'enrichmentDate' as const, label: 'Enrichment Date' },
    { key: 'enrichmentSource' as const, label: 'Enrichment Source' },
    { key: 'confidence' as const, label: 'Confidence %' },
  ]

  return arrayToCSV(companies, headers)
}

/**
 * Export persona matches to CSV
 */
export function exportPersonaMatchesToCSV(matches: PersonaMatch[]): string {
  const headers = [
    { key: 'id' as const, label: 'ID' },
    { key: 'enrichedCompanyId' as const, label: 'Enriched Company ID' },
    { key: 'personaId' as const, label: 'Persona ID' },
    { key: 'eventId' as const, label: 'Event ID' },
    { key: 'companyName' as const, label: 'Company Name' },
    { key: 'tier' as const, label: 'Tier' },
    { key: 'fitScore' as const, label: 'Fit Score' },
    { key: 'industryMatch' as const, label: 'Industry Match' },
    { key: 'sizeMatch' as const, label: 'Size Match' },
    { key: 'technologyMatch' as const, label: 'Technology Match' },
    { key: 'insights' as const, label: 'Insights' },
    { key: 'matchedAt' as const, label: 'Matched At' },
  ]

  return arrayToCSV(matches, headers)
}

/**
 * Export full report to CSV (combined view)
 */
export function exportReportToCSV(report: Report, matches: PersonaMatch[]): string {
  // Create flattened view combining report metadata with match details
  const headers = [
    { key: 'companyName' as const, label: 'Company Name' },
    { key: 'tier' as const, label: 'Tier' },
    { key: 'fitScore' as const, label: 'Fit Score' },
    { key: 'industry' as const, label: 'Industry' },
    { key: 'companySize' as const, label: 'Company Size' },
    { key: 'technologies' as const, label: 'Technologies' },
    { key: 'businessModel' as const, label: 'Business Model' },
    { key: 'insights' as const, label: 'Key Insights' },
    { key: 'reportName' as const, label: 'Report Name' },
    { key: 'reportDate' as const, label: 'Report Date' },
  ]

  const flatData = matches.map((match) => ({
    companyName: match.companyName,
    tier: match.tier,
    fitScore: match.fitScore,
    industry: match.industryMatch ? 'Match' : 'No Match',
    companySize: match.sizeMatch ? 'Match' : 'No Match',
    technologies: match.technologyMatch ? 'Match' : 'No Match',
    businessModel: '',
    insights: match.insights || '',
    reportName: report.name,
    reportDate: report.generatedAt,
  }))

  return arrayToCSV(flatData, headers)
}

/**
 * Export leads by tier to CSV (for CRO summary)
 */
export function exportLeadsByTierToCSV(
  matches: PersonaMatch[],
  tier: 'Hot' | 'Warm' | 'Cold' | 'Unscored'
): string {
  const filtered = matches.filter((m) => m.tier === tier)

  const headers = [
    { key: 'companyName' as const, label: 'Company Name' },
    { key: 'fitScore' as const, label: 'Fit Score' },
    { key: 'industryMatch' as const, label: 'Industry Match' },
    { key: 'sizeMatch' as const, label: 'Size Match' },
    { key: 'technologyMatch' as const, label: 'Technology Match' },
    { key: 'insights' as const, label: 'Key Insights' },
  ]

  return arrayToCSV(filtered, headers)
}

/**
 * Create download blob for CSV
 */
export function createCSVBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

/**
 * Generate filename with timestamp
 */
export function generateCSVFilename(prefix: string, extension = 'csv'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  return `${prefix}_${timestamp}.${extension}`
}

/**
 * Helper to trigger CSV download in browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = createCSVBlob(csvContent)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
