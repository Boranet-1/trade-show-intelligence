'use client'

/**
 * Report Export Progress Component (FR-027)
 * Shows real-time progress for async report export jobs using SSE
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Loader2, AlertCircle, Download, X } from 'lucide-react'

interface ReportExportProgressProps {
  jobId: string
  onComplete?: (jobId: string, downloadUrl: string) => void
  onError?: (jobId: string, error: string) => void
  onDismiss?: () => void
}

interface ExportProgress {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total: number
  currentItem?: string
  error?: string
  downloadUrl?: string
}

export function ReportExportProgress({
  jobId,
  onComplete,
  onError,
  onDismiss,
}: ReportExportProgressProps) {
  const [progress, setProgress] = useState<ExportProgress>({
    jobId,
    status: 'pending',
    progress: 0,
    total: 100,
  })
  const [isPolling, setIsPolling] = useState(true)

  useEffect(() => {
    if (!jobId || !isPolling) return

    const eventSource = new EventSource(`/api/reports/export/status?jobId=${jobId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ExportProgress

        setProgress(data)

        if (data.status === 'completed' && data.downloadUrl) {
          setIsPolling(false)
          eventSource.close()
          onComplete?.(data.jobId, data.downloadUrl)
        } else if (data.status === 'failed') {
          setIsPolling(false)
          eventSource.close()
          onError?.(data.jobId, data.error || 'Export failed')
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      eventSource.close()
      setIsPolling(false)

      // Fall back to polling via GET if SSE fails
      pollStatus()
    }

    return () => {
      eventSource.close()
      setIsPolling(false)
    }
  }, [jobId, isPolling, onComplete, onError])

  const pollStatus = async () => {
    if (!isPolling) return

    try {
      const response = await fetch(`/api/reports/export/status/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setProgress(data.data)

        if (data.data.status === 'completed' && data.data.downloadUrl) {
          setIsPolling(false)
          onComplete?.(data.data.jobId, data.data.downloadUrl)
        } else if (data.data.status === 'failed') {
          setIsPolling(false)
          onError?.(data.data.jobId, data.data.error || 'Export failed')
        } else {
          // Continue polling
          setTimeout(pollStatus, 1000)
        }
      }
    } catch (err) {
      console.error('Error polling export status:', err)
      setIsPolling(false)
    }
  }

  const handleDownload = () => {
    if (progress.downloadUrl) {
      window.open(progress.downloadUrl, '_blank')
    }
  }

  const handleCancel = async () => {
    try {
      await fetch(`/api/reports/export/status/${jobId}`, { method: 'DELETE' })
      setIsPolling(false)
      onDismiss?.()
    } catch (err) {
      console.error('Error canceling export job:', err)
    }
  }

  const progressPercentage = progress.total > 0 ? (progress.progress / progress.total) * 100 : 0

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {progress.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : progress.status === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
            <CardTitle className="text-lg">Export Progress</CardTitle>
          </div>
          <Badge
            variant={
              progress.status === 'completed'
                ? 'default'
                : progress.status === 'failed'
                ? 'destructive'
                : 'outline'
            }
          >
            {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          {progress.status === 'completed'
            ? 'Export completed successfully'
            : progress.status === 'failed'
            ? 'Export failed'
            : `Exporting ${progress.progress} of ${progress.total} items`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.status === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress.currentItem ? `Processing: ${progress.currentItem}` : 'Processing...'}
              </span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {progress.status === 'pending' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Initializing export...</span>
              <span className="font-medium">0%</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>
        )}

        {progress.status === 'completed' && progress.downloadUrl && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your export is ready! Click the button below to download.
            </AlertDescription>
          </Alert>
        )}

        {progress.status === 'failed' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {progress.error || 'An error occurred during export. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 justify-end">
          {progress.status === 'completed' && progress.downloadUrl && (
            <>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download Export
              </Button>
              <Button variant="outline" onClick={onDismiss}>
                Dismiss
              </Button>
            </>
          )}
          {(progress.status === 'processing' || progress.status === 'pending') && (
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
          {progress.status === 'failed' && (
            <Button variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
