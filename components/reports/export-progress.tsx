'use client'

/**
 * Report Export Progress Component (FR-027)
 * Displays real-time progress for async report export jobs using SSE
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Download, Loader2 } from 'lucide-react'

interface ReportExportProgressProps {
  jobId: string
  onComplete?: (fileUrl: string) => void
  onError?: (error: string) => void
}

type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface ExportProgress {
  jobId: string
  reportId: string
  format: string
  totalItems: number
  processedItems: number
  status: JobStatus
  currentItem: string | null
  percentComplete: number
  fileUrl: string | null
  fileSize: number | null
  error: string | null
}

export function ReportExportProgress({
  jobId,
  onComplete,
  onError,
}: ReportExportProgressProps) {
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!jobId) return

    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/reports/export-progress?jobId=${jobId}`)

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as ExportProgress
      setProgress(data)

      // Handle completion
      if (data.status === 'COMPLETED' && data.fileUrl) {
        onComplete?.(data.fileUrl)
        eventSource.close()
        setIsConnected(false)
      }

      // Handle error
      if (data.status === 'FAILED' && data.error) {
        onError?.(data.error)
        eventSource.close()
        setIsConnected(false)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [jobId, onComplete, onError])

  if (!progress) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <p className="text-sm text-muted-foreground">Connecting to export job...</p>
        </div>
      </Card>
    )
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      case 'QUEUED':
        return <Loader2 className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = () => {
    switch (progress.status) {
      case 'COMPLETED':
        return <Badge variant="default">Completed</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      case 'PROCESSING':
        return <Badge variant="secondary">Processing</Badge>
      case 'QUEUED':
        return <Badge variant="outline">Queued</Badge>
    }
  }

  const handleDownload = () => {
    if (!progress.fileUrl) return

    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = progress.fileUrl
    link.download = `export_${progress.reportId}.${progress.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold">
                Export {progress.format.toUpperCase()} Report
              </h3>
              <p className="text-xs text-muted-foreground">Job ID: {progress.jobId}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Progress Bar */}
        {progress.status === 'PROCESSING' || progress.status === 'QUEUED' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress.percentComplete)}%</span>
            </div>
            <Progress value={progress.percentComplete} className="h-2" />
            {progress.currentItem && (
              <p className="text-xs text-muted-foreground">{progress.currentItem}</p>
            )}
          </div>
        ) : null}

        {/* Completed State */}
        {progress.status === 'COMPLETED' && progress.fileUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Export Complete</p>
                  <p className="text-xs text-green-700">
                    {progress.fileSize
                      ? `File size: ${(progress.fileSize / 1024).toFixed(2)} KB`
                      : ''}
                  </p>
                </div>
              </div>
              <Button onClick={handleDownload} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Failed State */}
        {progress.status === 'FAILED' && progress.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Export Failed</p>
                <p className="text-xs text-red-700 mt-1">{progress.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && progress.status !== 'COMPLETED' && progress.status !== 'FAILED' && (
          <div className="text-xs text-yellow-600">
            Reconnecting to export job...
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Compact export progress indicator for tables/lists
 */
export function ReportExportProgressCompact({ jobId }: { jobId: string }) {
  const [progress, setProgress] = useState<ExportProgress | null>(null)

  useEffect(() => {
    // Poll for status instead of SSE for compact version
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/reports/export-status/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          setProgress(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch export status:', error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)

    return () => clearInterval(interval)
  }, [jobId])

  if (!progress) {
    return <span className="text-xs text-muted-foreground">Loading...</span>
  }

  return (
    <div className="flex items-center gap-2">
      {progress.status === 'PROCESSING' && (
        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
      )}
      {progress.status === 'COMPLETED' && (
        <CheckCircle className="h-3 w-3 text-green-600" />
      )}
      {progress.status === 'FAILED' && <XCircle className="h-3 w-3 text-red-600" />}
      <span className="text-xs font-medium">{Math.round(progress.percentComplete)}%</span>
    </div>
  )
}
