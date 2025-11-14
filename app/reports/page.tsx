'use client'

/**
 * Reports Page
 *
 * Display all generated reports with filtering and tier badges
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExportButton } from '@/components/ui/export-button'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'

interface ReportSummary {
  id: string
  eventId: string
  name: string
  generatedAt: string
  totalScans: number
  hotCount: number
  warmCount: number
  coldCount: number
  unscoredCount: number
  // FR-032: Triple tier breakdowns
  companyTierBreakdown?: {
    hot: number
    warm: number
    cold: number
    unscored: number
  }
  contactTierBreakdown?: {
    hot: number
    warm: number
    cold: number
    unscored: number
  }
  combinedTierBreakdown?: {
    hot: number
    warm: number
    cold: number
    unscored: number
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/reports')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setReports(result.data || [])
        } else {
          setError(result.error?.whatFailed || 'Failed to load reports')
        }
      } else {
        setError('Failed to fetch reports from server')
      }
    } catch (err) {
      console.error('Error fetching reports:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDeleteReport = async (reportId: string, reportName: string) => {
    if (!confirm(`Are you sure you want to delete "${reportName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(reportId)
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setReports(reports.filter((r) => r.id !== reportId))
      } else {
        const result = await response.json()
        alert(result.error?.whatFailed || 'Failed to delete report')
      }
    } catch (err) {
      console.error('Error deleting report:', err)
      alert('Failed to delete report')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading reports...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error Loading Reports</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => fetchReports()}>Try Again</Button>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reports</h1>
            <p className="text-slate-600">View all generated trade show intelligence reports</p>
          </div>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-slate-600 mb-4">No reports generated yet</p>
          <Link href="/dashboard">
            <Button>Upload Badge Scans</Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Total Scans</TableHead>
                <TableHead>Hot</TableHead>
                <TableHead>Warm</TableHead>
                <TableHead>Cold</TableHead>
                <TableHead>Unscored</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>{formatDate(report.generatedAt)}</TableCell>
                  <TableCell>{report.totalScans}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{report.hotCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{report.warmCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{report.coldCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.unscoredCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/reports/${report.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <ExportButton
                        type="report"
                        reportId={report.id}
                        size="sm"
                        label="Export CSV"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteReport(report.id, report.name)}
                        disabled={deletingId === report.id}
                      >
                        {deletingId === report.id ? (
                          'Deleting...'
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Export by Tier */}
      {reports.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="font-semibold mb-2">Export Leads by Tier</h3>
          <p className="text-sm text-slate-600 mb-4">
            Download CSV files filtered by lead tier for targeted outreach
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <ExportButton
              type="leads-by-tier"
              eventId={reports[0].eventId}
              tier="Hot"
              label="Export Hot Leads"
              variant="destructive"
              size="default"
              className="w-full"
            />
            <ExportButton
              type="leads-by-tier"
              eventId={reports[0].eventId}
              tier="Warm"
              label="Export Warm Leads"
              variant="default"
              size="default"
              className="w-full"
            />
            <ExportButton
              type="leads-by-tier"
              eventId={reports[0].eventId}
              tier="Cold"
              label="Export Cold Leads"
              variant="secondary"
              size="default"
              className="w-full"
            />
            <ExportButton
              type="leads-by-tier"
              eventId={reports[0].eventId}
              tier="Unscored"
              label="Export Unscored"
              variant="outline"
              size="default"
              className="w-full"
            />
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Import these CSV files into Google Sheets to share with your sales team
          </p>
        </Card>
      )}

      {/* Triple Tier Breakdown (FR-032) */}
      {reports.length > 0 && reports[0].companyTierBreakdown && (
        <Card className="p-6 mt-6">
          <h3 className="font-semibold mb-4">Dual-Tier Breakdown (FR-032)</h3>
          <p className="text-sm text-slate-600 mb-4">
            Combined tier = 60% Company Tier + 40% Contact Tier
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Company Tier */}
            <div>
              <h4 className="font-medium mb-3 text-center">Company Tier (60%)</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-red-50">
                  <span className="text-sm">Hot</span>
                  <Badge variant="destructive">
                    {reports[0].companyTierBreakdown.hot}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                  <span className="text-sm">Warm</span>
                  <Badge variant="default">
                    {reports[0].companyTierBreakdown.warm}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-blue-50">
                  <span className="text-sm">Cold</span>
                  <Badge variant="secondary">
                    {reports[0].companyTierBreakdown.cold}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                  <span className="text-sm">Unscored</span>
                  <Badge variant="outline">
                    {reports[0].companyTierBreakdown.unscored}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contact Tier */}
            <div>
              <h4 className="font-medium mb-3 text-center">Contact Tier (40%)</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-red-50">
                  <span className="text-sm">Hot</span>
                  <Badge variant="destructive">
                    {reports[0].contactTierBreakdown?.hot || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                  <span className="text-sm">Warm</span>
                  <Badge variant="default">
                    {reports[0].contactTierBreakdown?.warm || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-blue-50">
                  <span className="text-sm">Cold</span>
                  <Badge variant="secondary">
                    {reports[0].contactTierBreakdown?.cold || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50">
                  <span className="text-sm">Unscored</span>
                  <Badge variant="outline">
                    {reports[0].contactTierBreakdown?.unscored || 0}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Combined Tier */}
            <div>
              <h4 className="font-medium mb-3 text-center">Combined Tier (Final)</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-red-50 border-2 border-red-200">
                  <span className="text-sm font-semibold">Hot</span>
                  <Badge variant="destructive" className="font-bold">
                    {reports[0].combinedTierBreakdown?.hot || reports[0].hotCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-orange-50 border-2 border-orange-200">
                  <span className="text-sm font-semibold">Warm</span>
                  <Badge variant="default" className="font-bold">
                    {reports[0].combinedTierBreakdown?.warm || reports[0].warmCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-blue-50 border-2 border-blue-200">
                  <span className="text-sm font-semibold">Cold</span>
                  <Badge variant="secondary" className="font-bold">
                    {reports[0].combinedTierBreakdown?.cold || reports[0].coldCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 border-2 border-gray-200">
                  <span className="text-sm font-semibold">Unscored</span>
                  <Badge variant="outline" className="font-bold">
                    {reports[0].combinedTierBreakdown?.unscored || reports[0].unscoredCount}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      <Card className="p-4 mt-6">
        <h3 className="font-semibold mb-3">Tier Legend</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Hot</Badge>
            <span className="text-sm text-slate-600">Tier 1 - High priority leads</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">Warm</Badge>
            <span className="text-sm text-slate-600">Tier 2 - Medium priority leads</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Cold</Badge>
            <span className="text-sm text-slate-600">Tier 3 - Low priority leads</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Unscored</Badge>
            <span className="text-sm text-slate-600">Tier 4 - Not yet scored</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
