/**
 * Report Export API Route (FR-027)
 *
 * Handles CSV, PDF, CRO_summary.md, and company reports export formats
 * Supports both synchronous (GET) and asynchronous (POST) export generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import { exportEnrichedLeadsToCSV, generateCSVFilename } from '@/lib/export/csv-exporter'
import { exportReportToPDF, generatePDFFilename } from '@/lib/export/pdf-exporter'
import { generateCROSummary } from '@/lib/export/cro-summary-generator'
import { generateCompanyReport } from '@/lib/export/company-report-generator'
import { reportJobQueue, type ReportExportFormat } from '@/lib/reports/report-queue'
import type { BadgeScan } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Threshold for async processing (number of badge scans)
const ASYNC_THRESHOLD = 50

/**
 * GET /api/reports/[reportId]/export?format=csv|pdf|cro_summary|company_reports
 * Export report in specified format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    if (!reportId) {
      return errorResponse(
        new AppError('Report ID is required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing report ID in request',
          howToFix: 'Provide a valid report ID in the URL path',
          exampleFormat: '/api/reports/[reportId]/export?format=csv',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get report and validate it exists
    const report = await storage.getReport(reportId)
    if (!report) {
      return errorResponse(
        new AppError(`Report not found: ${reportId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Report does not exist',
          howToFix: 'Verify the report ID and ensure the report has been generated',
          exampleFormat: '/api/reports/[valid-report-uuid]/export?format=csv',
        })
      )
    }

    // Get event
    const event = await storage.getEvent(report.eventId)
    if (!event) {
      throw new AppError('Event not found for report', 'NOT_FOUND', 404)
    }

    // Get all badge scans for the report
    const badgeScans = await Promise.all(
      report.badgeScanIds.map((id) => storage.getBadgeScan(id))
    )
    const validScans = badgeScans.filter((s) => s !== null)

    // Get enriched companies and persona matches
    const enrichedCompaniesMap = new Map()
    const personaMatchesMap = new Map()

    for (const scan of validScans) {
      const enriched = await storage.getEnrichedCompany(scan.id)
      if (enriched) {
        enrichedCompaniesMap.set(scan.id, enriched)
      }

      const match = await storage.getBestPersonaMatch(scan.id)
      if (match) {
        personaMatchesMap.set(scan.id, match)
      }
    }

    // Handle different export formats
    switch (format.toLowerCase()) {
      case 'csv': {
        const csvContent = exportEnrichedLeadsToCSV(
          validScans,
          enrichedCompaniesMap,
          personaMatchesMap
        )

        const filename = generateCSVFilename(report.name)

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      case 'pdf': {
        try {
          const pdfBuffer = await exportReportToPDF(
            report,
            validScans,
            enrichedCompaniesMap,
            personaMatchesMap
          )

          const filename = generatePDFFilename(report.name)

          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          })
        } catch (error) {
          if (error instanceof Error && error.message.includes('Cannot find module')) {
            return errorResponse(
              new AppError(
                'PDF export requires Puppeteer to be installed',
                'DEPENDENCY_MISSING',
                500,
                {
                  whatFailed: 'Puppeteer dependency not installed',
                  howToFix: 'Run: npm install puppeteer',
                  details: error.message,
                }
              )
            )
          }
          throw error
        }
      }

      case 'cro_summary': {
        const summaryContent = await generateCROSummary(
          event,
          report,
          validScans,
          enrichedCompaniesMap,
          personaMatchesMap
        )

        const filename = `CRO_Summary_${report.name.replace(/[^a-z0-9]/gi, '_')}.md`

        return new NextResponse(summaryContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        })
      }

      case 'company_reports': {
        // Generate all company reports as a ZIP archive would be ideal
        // For now, return a JSON array of company reports
        const companyReports = await Promise.all(
          validScans.map(async (scan) => {
            const enriched = enrichedCompaniesMap.get(scan.id)
            const match = personaMatchesMap.get(scan.id)
            const reportContent = await generateCompanyReport(event, scan, enriched, match)
            return {
              companyName: scan.company,
              filename: `${scan.company.replace(/[^a-z0-9]/gi, '_')}.md`,
              content: reportContent,
            }
          })
        )

        // Return as JSON for now (client can download individual files)
        return NextResponse.json({
          success: true,
          data: {
            reports: companyReports,
            total: companyReports.length,
          },
        })
      }

      default:
        return errorResponse(
          new AppError(`Unsupported export format: ${format}`, 'VALIDATION_ERROR', 400, {
            whatFailed: `Invalid format parameter: ${format}`,
            howToFix: 'Use one of the supported formats: csv, pdf, cro_summary, company_reports',
            exampleFormat: '/api/reports/[reportId]/export?format=csv',
          })
        )
    }
  } catch (error) {
    console.error('[Report Export API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to export report: ${errorMessage}`,
        'EXPORT_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

/**
 * POST /api/reports/[reportId]/export
 * Start async report export job (for large reports)
 * Body: { format: 'csv' | 'pdf' | 'cro_summary' | 'company_reports' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const body = await request.json()
    const format = (body.format || 'csv') as ReportExportFormat

    if (!reportId) {
      return errorResponse(
        new AppError('Report ID is required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing report ID in request',
          howToFix: 'Provide a valid report ID in the URL path',
          exampleFormat: 'POST /api/reports/[reportId]/export',
        })
      )
    }

    // Validate format
    const validFormats: ReportExportFormat[] = ['csv', 'pdf', 'cro_summary', 'company_reports']
    if (!validFormats.includes(format)) {
      return errorResponse(
        new AppError(`Invalid export format: ${format}`, 'VALIDATION_ERROR', 400, {
          whatFailed: `Unsupported format: ${format}`,
          howToFix: 'Use one of the supported formats: csv, pdf, cro_summary, company_reports',
          exampleFormat: '{ "format": "csv" }',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get report and validate it exists
    const report = await storage.getReport(reportId)
    if (!report) {
      return errorResponse(
        new AppError(`Report not found: ${reportId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Report does not exist',
          howToFix: 'Verify the report ID and ensure the report has been generated',
          exampleFormat: 'POST /api/reports/[valid-report-uuid]/export',
        })
      )
    }

    // Get event
    const event = await storage.getEvent(report.eventId)
    if (!event) {
      throw new AppError('Event not found for report', 'NOT_FOUND', 404)
    }

    // Create async export job
    const job = reportJobQueue.createJob(
      reportId,
      report.eventId,
      format,
      report.badgeScanIds.length
    )

    // Start export in background (don't await)
    processReportExport(job.jobId, reportId).catch((error) => {
      console.error(`Report export job ${job.jobId} failed:`, error)
      reportJobQueue.completeJob(job.jobId, undefined, undefined, error.message)
    })

    // Return job ID for status polling
    return NextResponse.json({
      jobId: job.jobId,
      reportId,
      format,
      totalItems: job.totalItems,
      status: job.status,
      message: 'Report export job started successfully',
      statusEndpoint: `/api/reports/export-status/${job.jobId}`,
      progressEndpoint: `/api/reports/export-progress?jobId=${job.jobId}`,
    })
  } catch (error) {
    console.error('[Report Export API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to start report export: ${errorMessage}`,
        'EXPORT_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

/**
 * Background worker for report export processing
 */
async function processReportExport(jobId: string, reportId: string): Promise<void> {
  const storage = await getActiveStorageAdapter()

  // Mark job as started
  reportJobQueue.startJob(jobId)

  // Get job details
  const job = reportJobQueue.getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  // Get report
  const report = await storage.getReport(reportId)
  if (!report) {
    throw new Error(`Report ${reportId} not found`)
  }

  // Get event
  const event = await storage.getEvent(report.eventId)
  if (!event) {
    throw new Error('Event not found for report')
  }

  // Get all badge scans for the report
  reportJobQueue.updateProgress(jobId, 0, 'Loading badge scans...')
  const badgeScans = await Promise.all(report.badgeScanIds.map((id) => storage.getBadgeScan(id)))
  const validScans = badgeScans.filter((s): s is BadgeScan => s !== null)

  // Get enriched companies and persona matches
  reportJobQueue.updateProgress(jobId, validScans.length * 0.2, 'Loading enrichment data...')
  const enrichedCompaniesMap = new Map()
  const personaMatchesMap = new Map()

  for (let i = 0; i < validScans.length; i++) {
    const scan = validScans[i]
    const enriched = await storage.getEnrichedCompany(scan.id)
    if (enriched) {
      enrichedCompaniesMap.set(scan.id, enriched)
    }

    const match = await storage.getBestPersonaMatch(scan.id)
    if (match) {
      personaMatchesMap.set(scan.id, match)
    }

    // Update progress every 10 scans
    if (i % 10 === 0) {
      const progress = validScans.length * 0.2 + (i / validScans.length) * 0.3
      reportJobQueue.updateProgress(
        jobId,
        progress,
        `Loading enrichment data (${i}/${validScans.length})...`
      )
    }
  }

  // Generate export based on format
  reportJobQueue.updateProgress(jobId, validScans.length * 0.5, `Generating ${job.format} export...`)

  let fileContent: string | Buffer
  let filename: string
  let contentType: string

  switch (job.format) {
    case 'csv': {
      fileContent = exportEnrichedLeadsToCSV(validScans, enrichedCompaniesMap, personaMatchesMap)
      filename = generateCSVFilename(report.name)
      contentType = 'text/csv'
      break
    }

    case 'pdf': {
      fileContent = await exportReportToPDF(
        report,
        validScans,
        enrichedCompaniesMap,
        personaMatchesMap
      )
      filename = generatePDFFilename(report.name)
      contentType = 'application/pdf'
      break
    }

    case 'cro_summary': {
      fileContent = await generateCROSummary(
        event,
        report,
        validScans,
        enrichedCompaniesMap,
        personaMatchesMap
      )
      filename = `CRO_Summary_${report.name.replace(/[^a-z0-9]/gi, '_')}.md`
      contentType = 'text/markdown'
      break
    }

    case 'company_reports': {
      const companyReports = []
      for (let i = 0; i < validScans.length; i++) {
        const scan = validScans[i]
        const enriched = enrichedCompaniesMap.get(scan.id)
        const match = personaMatchesMap.get(scan.id)
        const reportContent = await generateCompanyReport(event, scan, enriched, match)
        companyReports.push({
          companyName: scan.company,
          filename: `${scan.company.replace(/[^a-z0-9]/gi, '_')}.md`,
          content: reportContent,
        })

        // Update progress
        const progress = validScans.length * 0.5 + (i / validScans.length) * 0.5
        reportJobQueue.updateProgress(
          jobId,
          progress,
          `Generating company reports (${i + 1}/${validScans.length})...`
        )
      }

      fileContent = JSON.stringify({ reports: companyReports, total: companyReports.length })
      filename = `Company_Reports_${report.name.replace(/[^a-z0-9]/gi, '_')}.json`
      contentType = 'application/json'
      break
    }

    default:
      throw new Error(`Unsupported export format: ${job.format}`)
  }

  // For now, we'll store the file as a data URL
  // In production, upload to cloud storage (S3, GCS, etc.) and get URL
  const fileSize = typeof fileContent === 'string' ? fileContent.length : fileContent.length
  const base64Content =
    typeof fileContent === 'string'
      ? Buffer.from(fileContent).toString('base64')
      : fileContent.toString('base64')
  const fileUrl = `data:${contentType};base64,${base64Content}`

  // Mark job as completed with file URL
  reportJobQueue.completeJob(jobId, fileUrl, fileSize)
}
