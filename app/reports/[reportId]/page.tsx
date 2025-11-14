'use client'

/**
 * Report Detail Page
 *
 * Display detailed enriched leads for a specific report with filtering and search
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TierFilter } from '@/components/reports/tier-filter'
import { LeadTable } from '@/components/reports/lead-table'
import { ExportButton } from '@/components/ui/export-button'
import { RefineDialog } from '@/components/reports/refine-dialog'
import { ArrowLeft, Trash2, RefreshCw } from 'lucide-react'
import type { LeadTier } from '@/lib/types'

interface EnrichedLead {
  badgeScan: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    company: string
    jobTitle?: string
    phone?: string
    eventName: string
    scannedAt: Date
  }
  enrichedCompany?: {
    companyName: string
    employeeCount?: number
    industry?: string
    revenueRange?: string
    techStack?: string[]
    headquarters?: string
  }
  personaMatch?: {
    fitScore: number
    tier: LeadTier
    actionableInsights?: string[]
  }
  tier: LeadTier
}

interface ReportDetail {
  id: string
  eventId: string
  name: string
  generatedAt: string
  statistics: {
    totalScans: number
    enrichedCount: number
    hotCount: number
    warmCount: number
    coldCount: number
    unscoredCount: number
    topIndustries: { industry: string; count: number }[]
    averageFitScore: number
    enrichmentSuccessRate: number
  }
  leads: EnrichedLead[]
  filters?: {
    tiers?: LeadTier[]
    industries?: string[]
    searchQuery?: string
  }
  exportedFormats?: string[]
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params?.reportId as string

  const [report, setReport] = useState<ReportDetail | null>(null)
  const [filteredLeads, setFilteredLeads] = useState<EnrichedLead[]>([])
  const [selectedTiers, setSelectedTiers] = useState<LeadTier[]>([])
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showRefineDialog, setShowRefineDialog] = useState(false)

  useEffect(() => {
    if (reportId) {
      fetchReportDetail()
    }
  }, [reportId])

  useEffect(() => {
    if (report) {
      applyFilters()
    }
  }, [report, selectedTiers, selectedPersonas, searchQuery])

  const fetchReportDetail = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/reports/${reportId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report details')
      }
      const result = await response.json()
      if (result.success) {
        setReport(result.data)
        setFilteredLeads(result.data.leads)
      } else {
        setError(result.error?.whatFailed || 'Failed to load report')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = async () => {
    if (!report) return

    let filtered = report.leads

    // Filter by selected tiers
    if (selectedTiers.length > 0) {
      filtered = filtered.filter((lead) => selectedTiers.includes(lead.tier))
    }

    // Filter by selected personas
    if (selectedPersonas.length > 0) {
      // Fetch persona matches for each lead to filter by persona
      try {
        const leadsWithPersona = await Promise.all(
          filtered.map(async (lead) => {
            const response = await fetch(`/api/badge-scans/${lead.badgeScan.id}/persona-matches`)
            if (response.ok) {
              const data = await response.json()
              const matches = data.success ? data.data : []
              const hasMatchingPersona = matches.some((match: any) =>
                selectedPersonas.includes(match.personaId)
              )
              return hasMatchingPersona ? lead : null
            }
            return null
          })
        )
        filtered = leadsWithPersona.filter((lead) => lead !== null) as EnrichedLead[]
      } catch (error) {
        console.error('Error filtering by persona:', error)
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((lead) => {
        const company = lead.badgeScan.company.toLowerCase()
        const email = lead.badgeScan.email?.toLowerCase() || ''
        const name = `${lead.badgeScan.firstName || ''} ${lead.badgeScan.lastName || ''}`.toLowerCase()
        const jobTitle = lead.badgeScan.jobTitle?.toLowerCase() || ''

        return (
          company.includes(query) ||
          email.includes(query) ||
          name.includes(query) ||
          jobTitle.includes(query)
        )
      })
    }

    setFilteredLeads(filtered)
  }

  const handleTierFilterChange = (tiers: LeadTier[]) => {
    setSelectedTiers(tiers)
  }

  const handlePersonaChange = (personas: string[]) => {
    setSelectedPersonas(personas)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
  }

  const handleDeleteReport = async () => {
    if (!report) return

    if (!confirm(`Are you sure you want to delete "${report.name}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/reports')
      } else {
        const result = await response.json()
        alert(result.error?.whatFailed || 'Failed to delete report')
        setIsDeleting(false)
      }
    } catch (err) {
      console.error('Error deleting report:', err)
      alert('Failed to delete report')
      setIsDeleting(false)
    }
  }

  const handleRefineComplete = () => {
    fetchReportDetail()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading report details...</div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Report</h2>
          <p className="text-slate-600 mb-4">{error || 'Report not found'}</p>
          <Button onClick={() => router.push('/reports')}>Back to Reports</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={() => router.push('/reports')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{report.name}</h1>
            <p className="text-slate-600">
              Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRefineDialog(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refine Results
            </Button>
            <ExportButton
              type="report"
              reportId={report.id}
              label="Export CSV"
              variant="outline"
            />
            <ExportButton
              type="report"
              reportId={report.id}
              format="pdf"
              label="Export PDF"
              variant="outline"
            />
            <Button
              variant="destructive"
              onClick={handleDeleteReport}
              disabled={isDeleting}
            >
              {isDeleting ? (
                'Deleting...'
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Scans</div>
          <div className="text-2xl font-bold">{report.statistics.totalScans}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Enriched</div>
          <div className="text-2xl font-bold">{report.statistics.enrichedCount}</div>
          <div className="text-xs text-slate-500">
            {report.statistics.enrichmentSuccessRate.toFixed(1)}% success rate
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Average Fit Score</div>
          <div className="text-2xl font-bold">
            {report.statistics.averageFitScore.toFixed(1)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Top Industry</div>
          <div className="text-lg font-semibold">
            {report.statistics.topIndustries[0]?.industry || 'N/A'}
          </div>
          <div className="text-xs text-slate-500">
            {report.statistics.topIndustries[0]?.count || 0} companies
          </div>
        </Card>
      </div>

      {/* Tier Filter */}
      <Card className="p-6 mb-6">
        <TierFilter
          statistics={report.statistics}
          selectedTiers={selectedTiers}
          onTierChange={handleTierFilterChange}
          onSearchChange={handleSearchChange}
          searchQuery={searchQuery}
          selectedPersonas={selectedPersonas}
          onPersonaChange={handlePersonaChange}
        />
      </Card>

      {/* Leads Table */}
      <Card className="p-6">
        <LeadTable leads={filteredLeads} />
      </Card>

      {/* Results count */}
      <div className="mt-4 text-center text-sm text-slate-600">
        Showing {filteredLeads.length} of {report.leads.length} leads
      </div>

      {/* Refine Dialog */}
      {showRefineDialog && (
        <RefineDialog
          leads={filteredLeads}
          onClose={() => setShowRefineDialog(false)}
          onRefineComplete={handleRefineComplete}
        />
      )}
    </div>
  )
}
