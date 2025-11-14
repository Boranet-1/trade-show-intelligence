'use client'

/**
 * Enriched Leads Data Table Component
 *
 * Display enriched leads with sorting and search capabilities
 */

import { useState, useMemo, Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Phone,
  Building,
  Briefcase,
} from 'lucide-react'
import type { LeadTier } from '@/lib/types'

interface LeadTableProps {
  leads: {
    badgeScan: {
      id: string
      firstName?: string
      lastName?: string
      email?: string
      company: string
      jobTitle?: string
      phone?: string
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
  }[]
}

type SortField = 'name' | 'company' | 'tier' | 'fitScore' | 'jobTitle'
type SortDirection = 'asc' | 'desc'

const tierConfig: Record<LeadTier, { variant: 'destructive' | 'default' | 'secondary' | 'outline'; color: string; order: number }> = {
  Hot: {
    variant: 'destructive',
    color: 'bg-red-500 text-white',
    order: 1,
  },
  Warm: {
    variant: 'default',
    color: 'bg-orange-500 text-white',
    order: 2,
  },
  Cold: {
    variant: 'secondary',
    color: 'bg-blue-500 text-white',
    order: 3,
  },
  Unscored: {
    variant: 'outline',
    color: 'bg-gray-400 text-white',
    order: 4,
  },
}

export function LeadTable({ leads }: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField>('tier')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedLeads = useMemo(() => {
    const sorted = [...leads].sort((a, b) => {
      let compareValue = 0

      switch (sortField) {
        case 'name':
          const nameA = `${a.badgeScan.firstName || ''} ${a.badgeScan.lastName || ''}`.trim()
          const nameB = `${b.badgeScan.firstName || ''} ${b.badgeScan.lastName || ''}`.trim()
          compareValue = nameA.localeCompare(nameB)
          break
        case 'company':
          compareValue = a.badgeScan.company.localeCompare(b.badgeScan.company)
          break
        case 'tier':
          compareValue = tierConfig[a.tier].order - tierConfig[b.tier].order
          break
        case 'fitScore':
          const scoreA = a.personaMatch?.fitScore || 0
          const scoreB = b.personaMatch?.fitScore || 0
          compareValue = scoreA - scoreB
          break
        case 'jobTitle':
          const titleA = a.badgeScan.jobTitle || ''
          const titleB = b.badgeScan.jobTitle || ''
          compareValue = titleA.localeCompare(titleB)
          break
      }

      return sortDirection === 'asc' ? compareValue : -compareValue
    })

    return sorted
  }, [leads, sortField, sortDirection])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    )
  }

  const toggleRowExpansion = (leadId: string) => {
    setExpandedRow(expandedRow === leadId ? null : leadId)
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p>No leads match the current filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('tier')}
                className="font-semibold hover:bg-slate-100 flex items-center"
              >
                Tier
                <SortIcon field="tier" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('name')}
                className="font-semibold hover:bg-slate-100 flex items-center"
              >
                Contact
                <SortIcon field="name" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('company')}
                className="font-semibold hover:bg-slate-100 flex items-center"
              >
                Company
                <SortIcon field="company" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('jobTitle')}
                className="font-semibold hover:bg-slate-100 flex items-center"
              >
                Job Title
                <SortIcon field="jobTitle" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('fitScore')}
                className="font-semibold hover:bg-slate-100 flex items-center"
              >
                Fit Score
                <SortIcon field="fitScore" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.map((lead) => {
            const fullName = `${lead.badgeScan.firstName || ''} ${lead.badgeScan.lastName || ''}`.trim()
            const isExpanded = expandedRow === lead.badgeScan.id

            return (
              <Fragment key={lead.badgeScan.id}>
                <TableRow className="cursor-pointer hover:bg-slate-50">
                  <TableCell>
                    <Badge
                      variant={tierConfig[lead.tier].variant}
                      className={tierConfig[lead.tier].color}
                    >
                      {lead.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{fullName || 'N/A'}</div>
                      {lead.badgeScan.email && (
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.badgeScan.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lead.badgeScan.company}</div>
                      {lead.enrichedCompany?.industry && (
                        <div className="text-sm text-slate-600">{lead.enrichedCompany.industry}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {lead.badgeScan.jobTitle || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.personaMatch ? (
                      <div className="text-sm font-semibold">
                        {lead.personaMatch.fitScore.toFixed(1)}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">N/A</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(lead.badgeScan.id)}
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </Button>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-slate-50">
                      <div className="p-4 space-y-4">
                        {/* Contact Details */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Contact Details
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {lead.badgeScan.email && (
                              <div>
                                <span className="text-slate-600">Email:</span>{' '}
                                <a
                                  href={`mailto:${lead.badgeScan.email}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {lead.badgeScan.email}
                                </a>
                              </div>
                            )}
                            {lead.badgeScan.phone && (
                              <div>
                                <span className="text-slate-600">Phone:</span>{' '}
                                <a
                                  href={`tel:${lead.badgeScan.phone}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {lead.badgeScan.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Company Details */}
                        {lead.enrichedCompany && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Company Intelligence
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {lead.enrichedCompany.employeeCount && (
                                <div>
                                  <span className="text-slate-600">Employees:</span>{' '}
                                  {lead.enrichedCompany.employeeCount.toLocaleString()}
                                </div>
                              )}
                              {lead.enrichedCompany.revenueRange && (
                                <div>
                                  <span className="text-slate-600">Revenue:</span>{' '}
                                  {lead.enrichedCompany.revenueRange}
                                </div>
                              )}
                              {lead.enrichedCompany.headquarters && (
                                <div>
                                  <span className="text-slate-600">Location:</span>{' '}
                                  {lead.enrichedCompany.headquarters}
                                </div>
                              )}
                              {lead.enrichedCompany.techStack && lead.enrichedCompany.techStack.length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-slate-600">Tech Stack:</span>{' '}
                                  {lead.enrichedCompany.techStack.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Actionable Insights */}
                        {lead.personaMatch?.actionableInsights && lead.personaMatch.actionableInsights.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              Actionable Insights
                            </h4>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {lead.personaMatch.actionableInsights.map((insight, idx) => (
                                <li key={idx} className="text-slate-700">
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
