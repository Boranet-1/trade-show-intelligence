/**
 * Batch Enrichment API Route
 * POST /api/enrichment/batch
 *
 * Initiates batch enrichment job and returns job ID for status polling
 * Supports Server-Sent Events (SSE) for real-time progress updates
 *
 * Processing Strategy:
 * - Processes 10 companies at a time in parallel (per task requirements)
 * - Each batch waits for all 10 to complete before starting next batch
 * - Updates job queue with progress after each company
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { createEnrichmentOrchestrator } from '@/lib/enrichment/orchestrator'
import { batchJobQueue, BatchJobStatus } from '@/lib/enrichment/batch-queue'
import { formatApiError } from '@/lib/api/helpers'
import { EnrichmentStatus } from '@/lib/types'
import type { BadgeScan, Persona } from '@/lib/types'

const BATCH_SIZE = 10 // Process 10 companies at a time

interface BatchEnrichmentRequest {
  eventId: string
  badgeScanIds: string[]
  personaIds?: string[]
}

/**
 * POST /api/enrichment/batch
 * Start a new batch enrichment job
 */
export async function POST(req: NextRequest) {
  try {
    const body: BatchEnrichmentRequest = await req.json()

    const { eventId, badgeScanIds, personaIds } = body

    // Validation
    if (!eventId || !badgeScanIds || badgeScanIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Missing required fields',
            howToFix: 'Provide eventId and badgeScanIds in request body',
            exampleFormat: '{ "eventId": "aws-reinvent-2025", "badgeScanIds": ["scan-id-1", "scan-id-2"] }'
          }
        },
        { status: 400 }
      )
    }

    // Get active storage adapter
    const storage = await getActiveStorageAdapter()

    // Fetch badge scans for enrichment
    const badgeScans = await storage.getAllBadgeScans(eventId)
    const scansToEnrich = badgeScans.filter(scan => badgeScanIds.includes(scan.id))

    if (scansToEnrich.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'No badge scans found',
            howToFix: 'Verify badge scan IDs exist for this event',
            exampleFormat: `Check that badge scans exist for event ${eventId}`
          }
        },
        { status: 404 }
      )
    }

    // Fetch personas (use default personas if not specified)
    let personas: Persona[]
    if (personaIds && personaIds.length > 0) {
      personas = (await Promise.all(
        personaIds.map(id => storage.getPersona(id))
      )).filter((p): p is Persona => p !== null)
    } else {
      personas = await storage.getDefaultPersonas()
    }

    if (personas.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'No personas found',
            howToFix: 'Create at least one persona or ensure default personas exist',
            exampleFormat: 'Use /api/personas to create a persona template'
          }
        },
        { status: 400 }
      )
    }

    // Create batch job
    const job = batchJobQueue.createJob(eventId, badgeScanIds)

    // Start batch enrichment in background (don't await)
    processBatchEnrichment(job.jobId, scansToEnrich, personas).catch(error => {
      console.error(`Batch enrichment job ${job.jobId} failed:`, error)
      batchJobQueue.completeJob(job.jobId, error.message)
    })

    // Return job ID for status polling
    return NextResponse.json({
      jobId: job.jobId,
      totalItems: job.totalItems,
      status: job.status,
      message: 'Batch enrichment job started successfully',
      statusEndpoint: `/api/enrichment/status/${job.jobId}`,
    })
  } catch (error) {
    console.error('Batch enrichment API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to start batch enrichment',
          howToFix: 'Check that storage adapter is configured and LLM API keys are set',
          exampleFormat: 'Verify ANTHROPIC_API_KEY, OPENAI_API_KEY environment variables'
        }
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/enrichment/batch?jobId=xxx
 * Server-Sent Events (SSE) endpoint for real-time progress updates
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Missing jobId',
          howToFix: 'Provide jobId as query parameter',
          exampleFormat: 'GET /api/enrichment/batch?jobId=job_123456'
        }
      },
      { status: 400 }
    )
  }

  // Check if job exists
  const job = batchJobQueue.getJob(jobId)
  if (!job) {
    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Job not found',
          howToFix: 'Verify job ID is correct',
          exampleFormat: `Check that job ${jobId} exists`
        }
      },
      { status: 404 }
    )
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial progress
      const sendProgress = () => {
        const progress = batchJobQueue.getProgress(jobId)
        if (!progress) {
          controller.close()
          return false
        }

        const data = `data: ${JSON.stringify(progress)}\n\n`
        controller.enqueue(encoder.encode(data))

        return progress.status === BatchJobStatus.PROCESSING || progress.status === BatchJobStatus.QUEUED
      }

      // Poll for updates every 500ms
      const intervalId = setInterval(() => {
        if (!sendProgress()) {
          clearInterval(intervalId)
          controller.close()
        }
      }, 500)

      // Send initial update
      sendProgress()

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/**
 * Background worker for batch enrichment processing
 * Processes scans in batches of 10 concurrently
 */
async function processBatchEnrichment(
  jobId: string,
  badgeScans: BadgeScan[],
  personas: Persona[]
): Promise<void> {
  // Get API keys from environment
  const claudeKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY

  // Create orchestrator
  const orchestrator = createEnrichmentOrchestrator(
    { enableLogging: true },
    claudeKey,
    openaiKey,
    geminiKey
  )

  // Get storage adapter
  const storage = await getActiveStorageAdapter()

  // Mark job as started
  batchJobQueue.startJob(jobId)

  // Process badge scans in batches of 10
  for (let i = 0; i < badgeScans.length; i += BATCH_SIZE) {
    const batch = badgeScans.slice(i, i + BATCH_SIZE)

    // Process batch in parallel
    const batchPromises = batch.map(async scan => {
      try {
        // Update current item
        batchJobQueue.updateProgress(jobId, scan.company)

        // Update badge scan status to PROCESSING
        await storage.updateBadgeScanStatus(scan.id, EnrichmentStatus.PROCESSING)

        // Enrich badge scan
        const result = await orchestrator.enrichBadgeScan(scan, personas)

        // Save enrichment results to storage
        if (result.enrichedCompany && Object.keys(result.enrichedCompany).length > 1) {
          await storage.saveEnrichedCompany({
            ...result.enrichedCompany,
            id: result.enrichedCompany.id ?? `enr_${scan.id}`,
            badgeScanId: scan.id,
            companyName: result.enrichedCompany.companyName ?? scan.company,
            consensusMetadata: result.enrichedCompany.consensusMetadata ?? {},
            enrichedAt: result.enrichedCompany.enrichedAt ?? new Date(),
            dataSource: result.enrichedCompany.dataSource ?? [],
            // FR-032: Save company tier
            companyTier: result.companyTier,
          } as any)
        }

        // FR-032: Save contact tier to badge scan
        if (result.contactTier) {
          await storage.updateBadgeScan(scan.id, { contactTier: result.contactTier })
        }

        // FR-032: Save combined tier calculation if available
        if (result.combinedTierCalculation) {
          // Save to storage (this would require adding a new storage method)
          // For now, we'll store it as part of the persona match or create a new storage method
        }

        // Save persona matches
        if (result.personaMatches && result.personaMatches.length > 0) {
          await Promise.all(
            result.personaMatches.map(match => storage.savePersonaMatch(match))
          )
        }

        // Update badge scan status to ENRICHED or FAILED
        await storage.updateBadgeScanStatus(scan.id, result.status)

        // Update job progress with result
        batchJobQueue.updateProgress(jobId, scan.company, result)

        return result
      } catch (error) {
        console.error(`Failed to enrich badge scan ${scan.id}:`, error)

        // Mark scan as failed
        await storage.updateBadgeScanStatus(scan.id, EnrichmentStatus.FAILED)

        // Update job progress with failed result
        const failedResult = {
          badgeScanId: scan.id,
          enrichedCompany: { badgeScanId: scan.id },
          personaMatches: [],
          bestPersonaMatch: null,
          assignedTier: 'Unscored',
          actionableInsights: null,
          status: EnrichmentStatus.FAILED,
          error: error instanceof Error ? error.message : String(error),
          processedAt: new Date(),
        }

        batchJobQueue.updateProgress(jobId, scan.company, failedResult)

        return failedResult
      }
    })

    // Wait for all scans in this batch to complete
    await Promise.all(batchPromises)
  }

  // Mark job as complete
  batchJobQueue.completeJob(jobId)

  // Auto-generate report after enrichment completes
  try {
    const job = batchJobQueue.getJob(jobId)
    if (job && job.eventId) {
      console.log(`[Batch Enrichment] Auto-generating report for event ${job.eventId}`)

      // Generate report with all enriched badge scans
      const report = await storage.generateReport(job.eventId)

      console.log(`[Batch Enrichment] Report generated: ${report.id} with ${report.badgeScanIds.length} badge scans`)
    }
  } catch (error) {
    console.error('[Batch Enrichment] Failed to auto-generate report:', error)
    // Don't fail the job if report generation fails
  }
}
