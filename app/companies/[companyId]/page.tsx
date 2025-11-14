'use client'

/**
 * Company Detail Page
 *
 * Shows enriched company information with nested contacts table,
 * persona match scores, and markdown reports.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type {
  EnrichedCompany,
  BadgeScan,
  PersonaMatch,
  LeadTier,
} from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  Building2,
  Users,
  MapPin,
  DollarSign,
  Calendar,
  Globe,
  TrendingUp,
  Download,
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface CompanyDetailData {
  company: EnrichedCompany
  contacts: BadgeScan[]
  personaMatches: Record<string, PersonaMatch[]>
  markdownReports: Array<{
    id: string
    reportType: string
    generatedAt: Date
    badgeScanId?: string
  }>
}

export default function CompanyDetailPage() {
  const params = useParams()
  const companyId = params?.companyId as string

  const [data, setData] = useState<CompanyDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails()
    }
  }, [companyId])

  const fetchCompanyDetails = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${companyId}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error.whatFailed)
      }
    } catch (err) {
      setError('Failed to load company details')
    } finally {
      setIsLoading(false)
    }
  }

  const getTierBadge = (tier?: LeadTier) => {
    switch (tier) {
      case 'Hot':
        return <Badge className="bg-red-600 text-white">Hot</Badge>
      case 'Warm':
        return <Badge className="bg-orange-500 text-white">Warm</Badge>
      case 'Cold':
        return <Badge className="bg-blue-500 text-white">Cold</Badge>
      default:
        return <Badge className="bg-gray-500 text-white">Unscored</Badge>
    }
  }

  const handleDownloadMarkdown = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download/markdown`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${reportId}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download markdown report')
    }
  }

  const handleDownloadPDF = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download/pdf`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `report-${reportId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download PDF report')
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading company details...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="mb-4">
          {error || 'Company not found'}
        </Alert>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const { company, contacts, personaMatches, markdownReports } = data

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-8 w-8 text-slate-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{company.companyName}</h1>
              <div className="flex items-center gap-3">
                {getTierBadge(company.companyTier)}
                {company.domain && (
                  <a
                    href={`https://${company.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-4 w-4" />
                    {company.domain}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-600">Contacts</div>
            <div className="text-3xl font-bold">{contacts.length}</div>
          </div>
        </div>
      </div>

      {/* Company Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Company Information */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Company Overview</h2>

          {company.description && (
            <p className="text-slate-700 mb-6">{company.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {company.industry && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-600">Industry</div>
                  <div className="font-medium">{company.industry}</div>
                </div>
              </div>
            )}

            {company.employeeRange && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-600">Company Size</div>
                  <div className="font-medium">
                    {company.employeeCount
                      ? `${company.employeeCount.toLocaleString()} employees`
                      : company.employeeRange}
                  </div>
                </div>
              </div>
            )}

            {company.revenueRange && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-600">Revenue</div>
                  <div className="font-medium">
                    {company.annualRevenue
                      ? `$${(company.annualRevenue / 1000000).toFixed(1)}M`
                      : company.revenueRange}
                  </div>
                </div>
              </div>
            )}

            {company.headquarters && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-600">Headquarters</div>
                  <div className="font-medium">{company.headquarters}</div>
                </div>
              </div>
            )}

            {company.founded && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-600">Founded</div>
                  <div className="font-medium">{company.founded}</div>
                </div>
              </div>
            )}

            {company.fundingStage && (
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <div className="text-sm text-slate-600">Funding Stage</div>
                  <div className="font-medium">{company.fundingStage}</div>
                  {company.totalFunding && (
                    <div className="text-sm text-slate-600">
                      ${(company.totalFunding / 1000000).toFixed(1)}M raised
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tech Stack */}
          {company.techStack && company.techStack.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm text-slate-600 mb-2">Tech Stack</div>
              <div className="flex flex-wrap gap-2">
                {company.techStack.map((tech, index) => (
                  <Badge key={index} variant="outline">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Markdown Reports */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reports
          </h2>

          {markdownReports.length === 0 ? (
            <p className="text-sm text-slate-600">
              No reports generated yet for this company.
            </p>
          ) : (
            <div className="space-y-3">
              {markdownReports.map((report) => {
                const reportTypeLabels: Record<string, string> = {
                  CROSummary: 'CRO Summary',
                  CompanySummary: 'Company Summary',
                  ContactSummary: 'Contact Summary',
                  MergedReport: 'Merged Report',
                }

                return (
                  <div
                    key={report.id}
                    className="border rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">
                        {reportTypeLabels[report.reportType] || report.reportType}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadMarkdown(report.id)}
                        className="flex-1 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        MD
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownloadPDF(report.id)}
                        className="flex-1 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Contacts Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          Contacts ({contacts.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-sm text-slate-600">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-sm text-slate-600">
                  Title
                </th>
                <th className="text-left py-3 px-4 font-medium text-sm text-slate-600">
                  Contact
                </th>
                <th className="text-left py-3 px-4 font-medium text-sm text-slate-600">
                  Tier
                </th>
                <th className="text-left py-3 px-4 font-medium text-sm text-slate-600">
                  Top Persona Match
                </th>
                <th className="text-left py-3 px-4 font-medium text-sm text-slate-600">
                  Scanned
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const matches = personaMatches[contact.id] || []
                const topMatch = matches.sort((a, b) => b.fitScore - a.fitScore)[0]

                return (
                  <tr
                    key={contact.id}
                    className="border-b hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-slate-700">
                        {contact.jobTitle || '-'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-slate-600" />
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-slate-600" />
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-blue-600 hover:underline"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">{getTierBadge(contact.contactTier)}</td>
                    <td className="py-4 px-4">
                      {topMatch ? (
                        <div>
                          <div className="text-sm font-medium">
                            {topMatch.fitScore.toFixed(0)}% fit
                          </div>
                          <div className="text-xs text-slate-600">
                            Persona match
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">No matches</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-slate-700">
                        {new Date(contact.scannedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-600">
                        {new Date(contact.scannedAt).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {contacts.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            No contacts found for this company.
          </div>
        )}
      </Card>
    </div>
  )
}
