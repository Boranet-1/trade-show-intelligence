/**
 * Export Button Component
 *
 * Reusable button for triggering exports in multiple formats:
 * CSV, PDF, CRO_summary.md, company reports
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileSpreadsheet, FileDown } from 'lucide-react'

export type ExportFormat = 'csv' | 'pdf' | 'cro_summary' | 'company_reports'

interface ExportButtonProps {
  type: 'badge-scans' | 'enriched-companies' | 'persona-matches' | 'report' | 'leads-by-tier'
  eventId?: string
  reportId?: string
  tier?: 'Hot' | 'Warm' | 'Cold' | 'Unscored'
  format?: ExportFormat // Specific format or show dropdown
  label?: string
  variant?: 'default' | 'outline' | 'secondary' | 'destructive'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
  className?: string
  showFormatSelector?: boolean // Show dropdown to select format
}

export function ExportButton({
  type,
  eventId,
  reportId,
  tier,
  format,
  label,
  variant = 'outline',
  size = 'sm',
  disabled = false,
  className = '',
  showFormatSelector = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (selectedFormat: ExportFormat = 'csv') => {
    setIsExporting(true)
    setError(null)

    try {
      let url: string

      // Determine API endpoint based on type and format
      if (type === 'report' && reportId) {
        // Use new export route for reports
        url = `/api/reports/${reportId}/export?format=${selectedFormat}`
      } else {
        // Legacy export route for other types
        const params = new URLSearchParams({ type })
        if (eventId) params.append('eventId', eventId)
        if (reportId) params.append('reportId', reportId)
        if (tier) params.append('tier', tier)
        url = `/api/export?${params.toString()}`
      }

      // Fetch file
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.whatFailed || 'Export failed')
      }

      // Handle company_reports special case (returns JSON)
      if (selectedFormat === 'company_reports') {
        const data = await response.json()
        if (data.success && data.data.reports) {
          // Download each company report individually
          for (const report of data.data.reports) {
            const blob = new Blob([report.content], { type: 'text/markdown' })
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = report.filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
            // Small delay between downloads to avoid browser blocking
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
          return
        }
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `export-${Date.now()}.${selectedFormat === 'pdf' ? 'pdf' : selectedFormat === 'cro_summary' ? 'md' : 'csv'}`

      // Download file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Export failed')
      alert(`Export failed: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const defaultLabels = {
    'badge-scans': 'Export Scans',
    'enriched-companies': 'Export Companies',
    'persona-matches': 'Export Matches',
    'report': 'Export',
    'leads-by-tier': 'Export Leads',
  }

  const formatLabels: Record<ExportFormat, string> = {
    csv: 'Export CSV',
    pdf: 'Export PDF',
    cro_summary: 'CRO Summary',
    company_reports: 'Company Reports',
  }

  const formatIcons: Record<ExportFormat, any> = {
    csv: FileSpreadsheet,
    pdf: FileText,
    cro_summary: FileDown,
    company_reports: FileDown,
  }

  // If specific format is provided, render single button
  if (format && !showFormatSelector) {
    const Icon = formatIcons[format]
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport(format)}
        disabled={disabled || isExporting}
        className={className}
      >
        <Icon className="w-4 h-4 mr-2" />
        {isExporting ? 'Exporting...' : label || formatLabels[format]}
      </Button>
    )
  }

  // Show dropdown for format selection
  if (showFormatSelector && type === 'report') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled || isExporting}
            className={className}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : label || 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('cro_summary')}>
            <FileDown className="w-4 h-4 mr-2" />
            CRO Summary
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('company_reports')}>
            <FileDown className="w-4 h-4 mr-2" />
            Company Reports
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Default CSV export button
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => handleExport('csv')}
      disabled={disabled || isExporting}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? 'Exporting...' : label || defaultLabels[type]}
    </Button>
  )
}
