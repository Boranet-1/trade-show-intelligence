/**
 * CSV Export Button Component
 *
 * Reusable button for triggering CSV exports
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportButtonProps {
  type: 'badge-scans' | 'enriched-companies' | 'persona-matches' | 'report' | 'leads-by-tier'
  eventId?: string
  reportId?: string
  tier?: 'Hot' | 'Warm' | 'Cold' | 'Unscored'
  label?: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
  className?: string
}

export function ExportButton({
  type,
  eventId,
  reportId,
  tier,
  label,
  variant = 'outline',
  size = 'sm',
  disabled = false,
  className = '',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams({ type })
      if (eventId) params.append('eventId', eventId)
      if (reportId) params.append('reportId', reportId)
      if (tier) params.append('tier', tier)

      // Fetch CSV file
      const response = await fetch(`/api/export?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `export-${Date.now()}.csv`

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Export error:', err)
      setError(err.message || 'Export failed')
      // Show error to user (could use toast notification)
      alert(`Export failed: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const defaultLabels = {
    'badge-scans': 'Export Scans',
    'enriched-companies': 'Export Companies',
    'persona-matches': 'Export Matches',
    'report': 'Export Report',
    'leads-by-tier': 'Export Leads',
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || isExporting}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? 'Exporting...' : label || defaultLabels[type]}
    </Button>
  )
}
