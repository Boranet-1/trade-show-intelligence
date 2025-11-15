/**
 * Report Export Job Status API (FR-027)
 * Get status and progress of async report export jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { reportJobQueue, ReportJobStatus } from '@/lib/reports/report-queue'
import { APIResponse } from '@/lib/types'

/**
 * GET /api/reports/export-status/[jobId]
 * Get status of a report export job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const progress = reportJobQueue.getProgress(jobId)

    if (!progress) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Report export job not found',
            howToFix: 'Verify the job ID and ensure the export job was created',
            details: `No export job found with ID ${jobId}`,
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: progress,
    })
  } catch (error) {
    console.error('Failed to get report export job status:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to retrieve export job status',
          howToFix: 'Check job ID format and try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reports/export-status/[jobId]
 * Delete a completed or failed export job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const job = reportJobQueue.getJob(jobId)

    if (!job) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Report export job not found',
            howToFix: 'Verify the job ID exists',
            details: `No export job found with ID ${jobId}`,
          },
        },
        { status: 404 }
      )
    }

    // Only allow deletion of completed or failed jobs
    if (job.status === ReportJobStatus.PROCESSING || job.status === ReportJobStatus.QUEUED) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Cannot delete active export job',
            howToFix: 'Wait for the job to complete or fail before deleting',
            details: `Job ${jobId} is still ${job.status.toLowerCase()}`,
          },
        },
        { status: 400 }
      )
    }

    const deleted = reportJobQueue.deleteJob(jobId)

    if (!deleted) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Failed to delete export job',
            howToFix: 'Try again or contact support',
            details: `Could not delete job ${jobId}`,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json<APIResponse<null>>({
      success: true,
      data: null,
      message: 'Export job deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete report export job:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to delete export job',
          howToFix: 'Check job ID and try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
