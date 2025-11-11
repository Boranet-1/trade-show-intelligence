'use client'

/**
 * Enrichment Progress Indicator Component
 * Real-time progress tracking for batch enrichment operations
 *
 * Features:
 * - Server-Sent Events (SSE) for real-time updates
 * - Progress bar with percentage
 * - Current item being processed
 * - Success/failure counts
 * - Automatic cleanup on completion
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'

interface BatchJobProgress {
  jobId: string
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  currentItem: string | null
  percentComplete: number
  error: string | null
}

interface EnrichmentProgressProps {
  jobId: string
  onComplete?: (jobId: string, success: boolean) => void
  onError?: (error: string) => void
}

export function EnrichmentProgress({ jobId, onComplete, onError }: EnrichmentProgressProps) {
  const [progress, setProgress] = useState<BatchJobProgress | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)

  useEffect(() => {
    if (!jobId) return

    // Connect to SSE endpoint for real-time updates
    const eventSource = new EventSource(`/api/enrichment/batch?jobId=${jobId}`)

    eventSource.onmessage = (event) => {
      setIsConnecting(false)
      const data = JSON.parse(event.data) as BatchJobProgress
      setProgress(data)

      // Check if job completed
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        eventSource.close()
        onComplete?.(jobId, data.status === 'COMPLETED')
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setIsConnecting(false)
      eventSource.close()
      onError?.('Connection to progress updates failed')
    }

    // Cleanup on unmount
    return () => {
      eventSource.close()
    }
  }, [jobId, onComplete, onError])

  if (isConnecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting to enrichment service...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!progress) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load enrichment progress. The job may have expired or does not exist.
        </AlertDescription>
      </Alert>
    )
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'QUEUED':
        return <Clock className="h-5 w-5 text-gray-500" />
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'QUEUED':
        return 'secondary'
      case 'PROCESSING':
        return 'default'
      case 'COMPLETED':
        return 'success' as any
      case 'FAILED':
        return 'destructive'
    }
  }

  const getStatusText = () => {
    switch (progress.status) {
      case 'QUEUED':
        return 'Queued'
      case 'PROCESSING':
        return 'Processing'
      case 'COMPLETED':
        return 'Completed'
      case 'FAILED':
        return 'Failed'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle>Batch Enrichment</CardTitle>
          </div>
          <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
        </div>
        <CardDescription>
          Job ID: {jobId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.processedItems} of {progress.totalItems} companies
            </span>
            <span className="font-medium">{progress.percentComplete}%</span>
          </div>
          <Progress value={progress.percentComplete} className="h-2" />
        </div>

        {/* Current Item */}
        {progress.currentItem && progress.status === 'PROCESSING' && (
          <div className="text-sm">
            <span className="text-muted-foreground">Currently processing:</span>
            <p className="font-medium mt-1">{progress.currentItem}</p>
          </div>
        )}

        {/* Success/Failure Counts */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Successful:</span>
            <span className="font-medium">{progress.successfulItems}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Failed:</span>
            <span className="font-medium">{progress.failedItems}</span>
          </div>
        </div>

        {/* Error Message */}
        {progress.error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {progress.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Completion Message */}
        {progress.status === 'COMPLETED' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Batch enrichment completed successfully! {progress.successfulItems} companies enriched.
              {progress.failedItems > 0 && ` ${progress.failedItems} companies failed to enrich.`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
