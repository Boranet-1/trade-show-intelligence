/**
 * Company Detail API Route
 *
 * GET /api/companies/[companyId]
 * Returns enriched company data with all associated badge scans (contacts)
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeStorageAdapters, getActiveStorageAdapter } from '@/lib/storage/factory'
import type {
  EnrichedCompany,
  BadgeScan,
  PersonaMatch,
  APISuccessResponse,
  APIErrorResponse,
} from '@/lib/types'
import { logger } from '@/lib/logger'

interface CompanyDetailResponse {
  company: EnrichedCompany
  contacts: BadgeScan[]
  personaMatches: Record<string, PersonaMatch[]> // keyed by badgeScanId
  markdownReports: Array<{
    id: string
    reportType: string
    generatedAt: Date
    badgeScanId?: string
  }>
}

/**
 * GET /api/companies/[companyId]
 * Get full company details with all contacts and metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
): Promise<NextResponse<APISuccessResponse<CompanyDetailResponse> | APIErrorResponse>> {
  try {
    const { companyId } = await params

    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    // Get enriched company
    const company = await adapter.getEnrichedCompany(companyId)
    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: `Company not found: ${companyId}`,
            howToFix: 'Verify the company ID exists by checking the dashboard or reports',
          },
        },
        { status: 404 }
      )
    }

    // Get the badge scan that this company is enriched from
    const primaryScan = await adapter.getBadgeScan(company.badgeScanId)
    if (!primaryScan) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: `Primary badge scan not found for company: ${companyId}`,
            howToFix: 'Data integrity issue. Contact support.',
          },
        },
        { status: 500 }
      )
    }

    // Get all badge scans for this company (same company name)
    const allScans = await adapter.getAllBadgeScans()
    const companyScans = allScans.filter(
      (scan) =>
        scan.company.toLowerCase().trim() === primaryScan.company.toLowerCase().trim() &&
        scan.eventId === primaryScan.eventId
    )

    // Get persona matches for all contacts
    const personaMatches: Record<string, PersonaMatch[]> = {}
    for (const scan of companyScans) {
      const matches = await adapter.getPersonaMatchesForScan(scan.id)
      personaMatches[scan.id] = matches
    }

    // Get markdown reports for this company
    const allMarkdownReports = await adapter.getAllMarkdownReports()
    const companyMarkdownReports = allMarkdownReports.filter((report) => {
      // Include CRO summaries for the event
      if (
        report.reportType === 'CROSummary' &&
        report.eventId === primaryScan.eventId
      ) {
        return true
      }

      // Include company summary for this exact company
      if (
        report.reportType === 'CompanySummary' &&
        report.badgeScanId &&
        companyScans.some((scan) => scan.id === report.badgeScanId)
      ) {
        return true
      }

      // Include contact summaries for any contact in this company
      if (
        report.reportType === 'ContactSummary' &&
        report.badgeScanId &&
        companyScans.some((scan) => scan.id === report.badgeScanId)
      ) {
        return true
      }

      // Include merged reports for this company
      if (
        report.reportType === 'MergedReport' &&
        report.badgeScanId &&
        companyScans.some((scan) => scan.id === report.badgeScanId)
      ) {
        return true
      }

      return false
    })

    logger.info(`Retrieved company details: ${companyId}`, {
      companyName: company.companyName,
      contactCount: companyScans.length,
      reportsCount: companyMarkdownReports.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        company,
        contacts: companyScans,
        personaMatches,
        markdownReports: companyMarkdownReports.map((report) => ({
          id: report.id,
          reportType: report.reportType,
          generatedAt: report.generatedAt,
          badgeScanId: report.badgeScanId,
        })),
      },
    })
  } catch (error) {
    logger.error('Failed to retrieve company details:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to retrieve company details',
          howToFix: 'Check storage adapter configuration and ensure the company ID is valid',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
