/**
 * CSV Export API Endpoint
 *
 * GET /api/export?type={type}&eventId={id}&reportId={id}&tier={tier}
 *
 * Exports various data types to CSV format for manual Google Sheets import
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import {
  exportBadgeScansToCSV,
  exportEnrichedCompaniesToCSV,
  exportPersonaMatchesToCSV,
  exportReportToCSV,
  exportLeadsByTierToCSV,
  generateCSVFilename,
} from '@/lib/export/csv'
import { LeadTier } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const eventId = searchParams.get('eventId')
    const reportId = searchParams.get('reportId')
    const tier = searchParams.get('tier') as LeadTier | null

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required parameter: type' },
        { status: 400 }
      )
    }

    const storage = await getActiveStorageAdapter()
    let csvContent = ''
    let filename = ''

    switch (type) {
      case 'badge-scans': {
        if (!eventId) {
          return NextResponse.json(
            { error: 'Missing required parameter: eventId for badge-scans export' },
            { status: 400 }
          )
        }

        const scans = await storage.getAllBadgeScans(eventId)
        csvContent = exportBadgeScansToCSV(scans)
        filename = generateCSVFilename(`badge-scans-${eventId}`)
        break
      }

      case 'enriched-companies': {
        if (!eventId) {
          return NextResponse.json(
            { error: 'Missing required parameter: eventId for enriched-companies export' },
            { status: 400 }
          )
        }

        const scans = await storage.getAllBadgeScans(eventId)
        const companies = (await Promise.all(
          scans.map(scan => storage.getEnrichedCompany(scan.id))
        )).filter((c): c is NonNullable<typeof c> => c !== null)
        csvContent = exportEnrichedCompaniesToCSV(companies)
        filename = generateCSVFilename(`enriched-companies-${eventId}`)
        break
      }

      case 'persona-matches': {
        if (!eventId) {
          return NextResponse.json(
            { error: 'Missing required parameter: eventId for persona-matches export' },
            { status: 400 }
          )
        }

        const scans = await storage.getAllBadgeScans(eventId)
        const matches = (await Promise.all(
          scans.map(scan => storage.getPersonaMatchesForScan(scan.id))
        )).flat()
        csvContent = exportPersonaMatchesToCSV(matches)
        filename = generateCSVFilename(`persona-matches-${eventId}`)
        break
      }

      case 'report': {
        if (!reportId) {
          return NextResponse.json(
            { error: 'Missing required parameter: reportId for report export' },
            { status: 400 }
          )
        }

        const report = await storage.getReport(reportId)
        if (!report) {
          return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        const scans = await storage.getAllBadgeScans(report.eventId)
        const matches = (await Promise.all(
          scans.map(scan => storage.getPersonaMatchesForScan(scan.id))
        )).flat()
        csvContent = exportReportToCSV(report, matches)
        filename = generateCSVFilename(`report-${reportId}`)
        break
      }

      case 'leads-by-tier': {
        if (!eventId) {
          return NextResponse.json(
            { error: 'Missing required parameter: eventId for leads-by-tier export' },
            { status: 400 }
          )
        }

        if (!tier) {
          return NextResponse.json(
            { error: 'Missing required parameter: tier for leads-by-tier export' },
            { status: 400 }
          )
        }

        const validTiers: LeadTier[] = [LeadTier.Hot, LeadTier.Warm, LeadTier.Cold, LeadTier.Unscored]
        if (!validTiers.includes(tier)) {
          return NextResponse.json(
            { error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` },
            { status: 400 }
          )
        }

        const scans = await storage.getAllBadgeScans(eventId)
        const matches = (await Promise.all(
          scans.map(scan => storage.getPersonaMatchesForScan(scan.id))
        )).flat()
        csvContent = exportLeadsByTierToCSV(matches, tier)
        filename = generateCSVFilename(`${tier.toLowerCase()}-leads-${eventId}`)
        break
      }

      default:
        return NextResponse.json(
          {
            error: `Invalid export type: ${type}. Valid types: badge-scans, enriched-companies, persona-matches, report, leads-by-tier`,
          },
          { status: 400 }
        )
    }

    // Return CSV file as download
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('[Export API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export data', details: error.message },
      { status: 500 }
    )
  }
}
