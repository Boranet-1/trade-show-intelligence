'use client'

/**
 * Markdown Downloads Component
 * Displays available markdown reports with download buttons for MD and PDF formats
 * Used in dashboard completion step and reports pages
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  FileText,
  AlertCircle,
  Loader2,
  Package,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

interface MarkdownReport {
  id: string
  reportType: 'CROSummary' | 'CompanySummary' | 'ContactSummary' | 'MergedReport'
  eventId: string
  badgeScanId?: string
  generatedAt: string
  version: number
  metadata?: {
    companyName?: string
    contactName?: string
    totalContacts?: number
  }
}

interface MarkdownDownloadsProps {
  eventId: string
  /** Optional callback when preview is requested */
  onPreview?: (reportId: string, reportType: string) => void
  /** Compact mode for sidebar display */
  compact?: boolean
}

export function MarkdownDownloads({ eventId, onPreview, compact = false }: MarkdownDownloadsProps) {
  const [reports, setReports] = useState<MarkdownReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchMarkdownReports()
  }, [eventId])

  const fetchMarkdownReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/events/${eventId}/markdown`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.whatFailed || 'Failed to fetch markdown reports')
      }

      const result = await response.json()
      if (result.success) {
        setReports(result.data.reports || [])
      } else {
        setError('No markdown reports available yet')
      }
    } catch (err) {
      console.error('Error fetching markdown reports:', err)
      setError(err instanceof Error ? err.message : 'Failed to load markdown reports')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (reportId: string, format: 'markdown' | 'pdf') => {
    setDownloadingId(reportId)

    try {
      const url = format === 'markdown'
        ? `/api/reports/${reportId}/download/markdown`
        : `/api/reports/${reportId}/download/pdf`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.whatFailed || `Failed to download ${format}`)
      }

      // Trigger browser download
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = '' // Browser will use filename from Content-Disposition header
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success(`Downloaded ${format === 'markdown' ? 'Markdown' : 'PDF'} successfully`)
    } catch (err) {
      console.error(`Error downloading ${format}:`, err)
      toast.error(err instanceof Error ? err.message : `Failed to download ${format}`)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleBulkDownload = async (reportType?: string) => {
    toast.info('Preparing bulk download...')

    try {
      const url = reportType
        ? `/api/events/${eventId}/markdown?reportType=${reportType}`
        : `/api/events/${eventId}/markdown`

      const response = await fetch(url, { method: 'POST' })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.whatFailed || 'Failed to create bulk download')
      }

      // Download ZIP file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = '' // Browser will use filename from Content-Disposition header
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('Bulk download started successfully')
    } catch (err) {
      console.error('Error creating bulk download:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create bulk download')
    }
  }

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'CROSummary':
        return <Badge variant="default">CRO Summary</Badge>
      case 'CompanySummary':
        return <Badge variant="secondary">Company Summary</Badge>
      case 'ContactSummary':
        return <Badge variant="outline">Contact Summary</Badge>
      case 'MergedReport':
        return <Badge>Merged Report</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getReportsByType = () => {
    const byType: Record<string, MarkdownReport[]> = {
      CROSummary: [],
      CompanySummary: [],
      ContactSummary: [],
      MergedReport: [],
    }

    reports.forEach(report => {
      if (byType[report.reportType]) {
        byType[report.reportType].push(report)
      }
    })

    return byType
  }

  if (isLoading) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Markdown Reports
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error || reports.length === 0) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Markdown Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'No markdown reports available yet. Reports are generated after enrichment completes.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const reportsByType = getReportsByType()
  const totalReports = reports.length

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Markdown Reports</CardTitle>
            <Badge variant="secondary">{totalReports} available</Badge>
          </div>
          <CardDescription>Download formatted reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Bulk Download */}
          <Button
            variant="default"
            className="w-full"
            onClick={() => handleBulkDownload()}
          >
            <Package className="h-4 w-4 mr-2" />
            Download All ({totalReports} Reports)
          </Button>

          {/* Individual Type Downloads */}
          <div className="space-y-2">
            {Object.entries(reportsByType).map(([type, typeReports]) => {
              if (typeReports.length === 0) return null

              return (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{type}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {typeReports.length}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBulkDownload(type)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Markdown Reports
            </CardTitle>
            <CardDescription className="mt-1">
              {totalReports} report{totalReports > 1 ? 's' : ''} available for download
            </CardDescription>
          </div>
          <Button
            variant="default"
            onClick={() => handleBulkDownload()}
          >
            <Package className="h-4 w-4 mr-2" />
            Download All as ZIP
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(reportsByType).map(([type, typeReports]) => {
            if (typeReports.length === 0) return null

            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">
                    {type === 'CROSummary' && 'CRO Summary'}
                    {type === 'CompanySummary' && 'Company Summaries'}
                    {type === 'ContactSummary' && 'Contact Summaries'}
                    {type === 'MergedReport' && 'Merged Reports'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{typeReports.length}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkDownload(type)}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Download All
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {typeReports.map(report => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getReportTypeBadge(report.reportType)}
                          <span className="text-sm font-medium">
                            {report.metadata?.companyName ||
                              report.metadata?.contactName ||
                              `${report.reportType} Report`}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          v{report.version} • {new Date(report.generatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onPreview && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPreview(report.id, report.reportType)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingId === report.id}
                          onClick={() => handleDownload(report.id, 'markdown')}
                        >
                          {downloadingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="ml-2">MD</span>
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={downloadingId === report.id}
                          onClick={() => handleDownload(report.id, 'pdf')}
                        >
                          {downloadingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="ml-2">PDF</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
