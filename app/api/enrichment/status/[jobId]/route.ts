/**
 * Enrichment Status Polling API Route
 * GET /api/enrichment/status/[jobId]
 *
 * Returns current status and progress for a batch enrichment job
 * Used for polling-based progress updates (alternative to SSE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { batchJobQueue } from '@/lib/enrichment/batch-queue'
import { formatApiError } from '@/lib/api/helpers'

interface StatusRouteContext {
  params: {
    jobId: string
  }
}

/**
 * GET /api/enrichment/status/[jobId]
 * Get job status and progress
 */
export async function GET(
  req: NextRequest,
  context: StatusRouteContext
) {
  try {
    const { jobId } = context.params

    if (!jobId) {
      return NextResponse.json(
        formatApiError(
          'Missing job ID',
          'Provide job ID in URL path',
          'Example: GET /api/enrichment/status/job_123456'
        ),
        { status: 400 }
      )
    }

    // Get job progress from queue
    const progress = batchJobQueue.getProgress(jobId)

    if (!progress) {
      return NextResponse.json(
        formatApiError(
          'Job not found',
          'Verify job ID is correct or check if job has been cleaned up',
          `Example: Job ${jobId} may have completed and been removed from queue`
        ),
        { status: 404 }
      )
    }

    // Get full job details
    const job = batchJobQueue.getJob(jobId)

    return NextResponse.json({
      jobId: progress.jobId,
      status: progress.status,
      progress: {
        total: progress.totalItems,
        processed: progress.processedItems,
        successful: progress.successfulItems,
        failed: progress.failedItems,
        percentComplete: progress.percentComplete,
        currentItem: progress.currentItem,
      },
      timestamps: {
        createdAt: job?.createdAt,
        startedAt: job?.startedAt,
        completedAt: job?.completedAt,
      },
      error: progress.error,
    })
  } catch (error) {
    console.error('Status polling API error:', error)

    return NextResponse.json(
      formatApiError(
        'Failed to retrieve job status',
        'An unexpected error occurred while fetching job status',
        'Example: Check server logs for detailed error information'
      ),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/enrichment/status/[jobId]
 * Cancel or delete a job
 */
export async function DELETE(
  req: NextRequest,
  context: StatusRouteContext
) {
  try {
    const { jobId } = context.params

    if (!jobId) {
      return NextResponse.json(
        formatApiError(
          'Missing job ID',
          'Provide job ID in URL path',
          'Example: DELETE /api/enrichment/status/job_123456'
        ),
        { status: 400 }
      )
    }

    // Check if job exists
    const job = batchJobQueue.getJob(jobId)
    if (!job) {
      return NextResponse.json(
        formatApiError(
          'Job not found',
          'Verify job ID is correct',
          `Example: Job ${jobId} does not exist`
        ),
        { status: 404 }
      )
    }

    // Note: Cancellation of in-progress jobs is not fully implemented
    // This only removes the job from the queue (does not stop processing)
    const deleted = batchJobQueue.deleteJob(jobId)

    if (deleted) {
      return NextResponse.json({
        jobId,
        message: 'Job deleted from queue',
        note: 'If job was processing, enrichment may continue in background',
      })
    }

    return NextResponse.json(
      formatApiError(
        'Failed to delete job',
        'Job could not be removed from queue',
        `Example: Job ${jobId} deletion failed`
      ),
      { status: 500 }
    )
  } catch (error) {
    console.error('Job deletion API error:', error)

    return NextResponse.json(
      formatApiError(
        'Failed to delete job',
        'An unexpected error occurred while deleting job',
        'Example: Check server logs for detailed error information'
      ),
      { status: 500 }
    )
  }
}
