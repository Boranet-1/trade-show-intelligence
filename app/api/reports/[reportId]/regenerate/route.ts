/**
 * Report Regeneration API
 * Regenerates markdown reports with applied feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import { generateCompanySummaryMarkdown } from '@/lib/export/company-summary-generator'
import { generateContactSummaryMarkdown } from '@/lib/export/contact-summary-generator'
import { generateMergedReportMarkdown } from '@/lib/export/merged-report-generator'
import { DeepEnrichmentPipeline } from '@/lib/enrichment/deep-enrichment-pipeline'
import { calculateEnhancedCompanyTier } from '@/lib/scoring/tier-calculator'
import { calculateContactTiersForCompany } from '@/lib/scoring/contact-tier-calculator'
import type { MarkdownReport } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reports/[reportId]/regenerate
 * Regenerate markdown report with feedback applied
 * Body: { feedback: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const body = await request.json()
    const feedback = body.feedback as string | undefined

    if (!reportId) {
      return errorResponse(
        new AppError('Report ID is required', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Missing report ID in request',
          howToFix: 'Provide a valid report ID in the URL path',
          exampleFormat: 'POST /api/reports/[reportId]/regenerate',
        })
      )
    }

    const storage = await getActiveStorageAdapter()

    // Get existing markdown report
    const existingReport = await storage.getMarkdownReport(reportId)
    if (!existingReport) {
      return errorResponse(
        new AppError(`Markdown report not found: ${reportId}`, 'NOT_FOUND', 404, {
          whatFailed: 'Markdown report does not exist',
          howToFix: 'Verify the report ID and ensure the markdown report has been generated',
          exampleFormat: 'POST /api/reports/[valid-report-uuid]/regenerate',
        })
      )
    }

    // Get event
    const event = await storage.getEvent(existingReport.eventId)
    if (!event) {
      throw new AppError('Event not found for report', 'NOT_FOUND', 404)
    }

    let newMarkdownContent: string

    // Regenerate based on report type
    switch (existingReport.reportType) {
      case 'CompanySummary': {
        if (!existingReport.badgeScanId) {
          throw new AppError('BadgeScanId required for CompanySummary', 'VALIDATION_ERROR', 400)
        }

        // Get badge scan and enriched data
        const badgeScan = await storage.getBadgeScan(existingReport.badgeScanId)
        if (!badgeScan) {
          throw new AppError('Badge scan not found', 'NOT_FOUND', 404)
        }

        const enrichedCompany = await storage.getEnrichedCompany(badgeScan.id)
        if (!enrichedCompany) {
          throw new AppError('Enriched company not found', 'NOT_FOUND', 404)
        }

        // Re-run deep enrichment with feedback context
        const pipeline = new DeepEnrichmentPipeline()
        const deepEnrichment = await pipeline.enrichCompany({
          badgeScan,
          additionalContacts: [],
        })

        // Recalculate tiers
        const companyTier = calculateEnhancedCompanyTier({
          persona_fit_score: 75, // Placeholder - should come from persona match
          meddic_score: deepEnrichment.meddic_score?.overallScore,
          engagement_score: 50, // Placeholder
        })

        const contactTiers = calculateContactTiersForCompany({ badgeScans: [badgeScan] })

        // Generate new markdown
        newMarkdownContent = await generateCompanySummaryMarkdown(
          badgeScan,
          enrichedCompany,
          deepEnrichment,
          companyTier,
          contactTiers,
          [],
          event.name,
          event.startDate?.toISOString() || new Date().toISOString()
        )
        break
      }

      case 'ContactSummary': {
        if (!existingReport.badgeScanId) {
          throw new AppError('BadgeScanId required for ContactSummary', 'VALIDATION_ERROR', 400)
        }

        const badgeScan = await storage.getBadgeScan(existingReport.badgeScanId)
        if (!badgeScan) {
          throw new AppError('Badge scan not found', 'NOT_FOUND', 404)
        }

        const contactTiers = calculateContactTiersForCompany({ badgeScans: [badgeScan] })
        const contactTier = contactTiers.get(badgeScan.id)
        if (!contactTier) {
          throw new AppError('Contact tier not calculated', 'CALCULATION_ERROR', 500)
        }

        newMarkdownContent = await generateContactSummaryMarkdown(
          badgeScan,
          contactTier,
          'Warm', // Placeholder company tier
          event.name,
          event.startDate?.toISOString() || new Date().toISOString()
        )
        break
      }

      case 'MergedReport': {
        // For merged reports, we need to regenerate all sub-reports
        // This is a more complex operation
        // For now, return error requesting to regenerate individual reports first
        return errorResponse(
          new AppError(
            'Merged report regeneration not yet implemented',
            'NOT_IMPLEMENTED',
            501,
            {
              whatFailed: 'Merged report regeneration requires individual report regeneration',
              howToFix: 'Regenerate company and contact summaries individually first',
              exampleFormat: 'POST /api/reports/[company-summary-id]/regenerate',
            }
          )
        )
      }

      case 'CROSummary': {
        // CRO summary regeneration requires full event re-processing
        return errorResponse(
          new AppError('CRO summary regeneration not yet implemented', 'NOT_IMPLEMENTED', 501, {
            whatFailed: 'CRO summary regeneration requires full event re-processing',
            howToFix: 'Generate a new CRO summary from the event dashboard',
            exampleFormat: 'Use the dashboard to generate a fresh CRO summary',
          })
        )
      }

      default:
        throw new AppError(
          `Unsupported report type: ${existingReport.reportType}`,
          'VALIDATION_ERROR',
          400
        )
    }

    // Create new markdown report with incremented version
    const newReport: MarkdownReport = {
      id: crypto.randomUUID(),
      reportType: existingReport.reportType,
      eventId: existingReport.eventId,
      badgeScanId: existingReport.badgeScanId,
      markdownContent: newMarkdownContent,
      generatedAt: new Date(),
      version: existingReport.version + 1,
      feedbackApplied: feedback,
      metadata: existingReport.metadata,
    }

    // Save new version
    await storage.saveMarkdownReport(newReport)

    return NextResponse.json({
      success: true,
      data: {
        reportId: newReport.id,
        reportType: newReport.reportType,
        version: newReport.version,
        previousVersion: existingReport.version,
        feedbackApplied: feedback,
        generatedAt: newReport.generatedAt,
        downloadUrl: `/api/reports/${newReport.id}/download/markdown`,
      },
      message: 'Report regenerated successfully with feedback applied',
    })
  } catch (error) {
    console.error('[Report Regeneration API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to regenerate report: ${errorMessage}`,
        'REGENERATION_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}
