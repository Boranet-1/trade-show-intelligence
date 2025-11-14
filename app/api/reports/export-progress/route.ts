/**
 * Report Export Progress API (FR-027)
 * Server-Sent Events (SSE) endpoint for real-time export progress updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { reportJobQueue, ReportJobStatus } from '@/lib/reports/report-queue'
import { APIResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/export-progress?jobId=xxx
 * Server-Sent Events (SSE) endpoint for real-time progress updates
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Missing jobId parameter',
          howToFix: 'Provide jobId as query parameter',
          exampleFormat: 'GET /api/reports/export-progress?jobId=report_job_123456',
        },
      },
      { status: 400 }
    )
  }

  // Check if job exists
  const job = reportJobQueue.getJob(jobId)
  if (!job) {
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Export job not found',
          howToFix: 'Verify job ID is correct and the job was created',
          exampleFormat: `Check that job ${jobId} exists via /api/reports/export-status/${jobId}`,
        },
      },
      { status: 404 }
    )
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send progress updates
      const sendProgress = () => {
        const progress = reportJobQueue.getProgress(jobId)
        if (!progress) {
          controller.close()
          return false
        }

        const data = `data: ${JSON.stringify(progress)}\n\n`
        controller.enqueue(encoder.encode(data))

        // Continue streaming while job is active
        return (
          progress.status === ReportJobStatus.PROCESSING ||
          progress.status === ReportJobStatus.QUEUED
        )
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
