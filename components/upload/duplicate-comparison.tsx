'use client'

/**
 * Duplicate Comparison UI Component
 *
 * Shows side-by-side comparison of duplicate badge scans with enrichment data
 */

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  AlertTriangle,
  User,
  Building,
  Mail,
  Phone,
  Briefcase,
  MapPin,
} from 'lucide-react'

interface DuplicateScan {
  scan: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    company: string
    jobTitle?: string
    phone?: string
    boothLocation?: string
    scannedAt: string
    eventName: string
    enrichmentStatus: string
    notes?: string
  }
  enriched?: {
    companyName: string
    domain?: string
    industry?: string
    employeeCount?: number
    revenueRange?: string
    headquarters?: string
    techStack?: string[]
    dataSource?: string[]
  }
  personaMatch?: {
    tier: string
    fitScore: number
    personaId: string
    actionableInsights?: string[]
  }
}

interface DuplicateComparisonProps {
  scanIds: string[]
  onResolve: (action: 'keep-both' | 'merge' | 'mark-primary', primaryId?: string) => void
  onCancel: () => void
}

export function DuplicateComparison({ scanIds, onResolve, onCancel }: DuplicateComparisonProps) {
  const [scans, setScans] = useState<DuplicateScan[]>([])
  const [differences, setDifferences] = useState<{
    basicInfo: string[]
    enrichment: string[]
    scoring: string[]
  } | null>(null)
  const [recommendedId, setRecommendedId] = useState<string | null>(null)
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComparison()
  }, [scanIds])

  const fetchComparison = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/badge-scans/duplicate-comparison?scanIds=${scanIds.join(',')}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch comparison data')
      }

      const result = await response.json()
      if (result.success) {
        setScans(result.data.scans)
        setDifferences(result.data.differences)
        setRecommendedId(result.data.recommendedScanId)
        setSelectedPrimary(result.data.recommendedScanId)
      } else {
        setError(result.error?.whatFailed || 'Failed to load comparison')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = (action: 'keep-both' | 'merge' | 'mark-primary') => {
    if ((action === 'merge' || action === 'mark-primary') && !selectedPrimary) {
      alert('Please select a primary scan first')
      return
    }
    onResolve(action, selectedPrimary || undefined)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-slate-600">Loading comparison...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={onCancel}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalDifferences =
    (differences?.basicInfo.length || 0) +
    (differences?.enrichment.length || 0) +
    (differences?.scoring.length || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Badge Scans Detected</CardTitle>
          <CardDescription>
            Found {scans.length} scans with matching email addresses. Review the differences and
            choose how to resolve.
          </CardDescription>
        </CardHeader>
        {differences && totalDifferences > 0 && (
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold">Differences Detected:</h4>
              {differences.basicInfo.length > 0 && (
                <div className="text-sm">
                  <strong>Basic Info:</strong> {differences.basicInfo.join(', ')}
                </div>
              )}
              {differences.enrichment.length > 0 && (
                <div className="text-sm">
                  <strong>Enrichment:</strong> {differences.enrichment.join(', ')}
                </div>
              )}
              {differences.scoring.length > 0 && (
                <div className="text-sm">
                  <strong>Scoring:</strong> {differences.scoring.join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scans.map((item) => {
          const isRecommended = item.scan.id === recommendedId
          const isSelected = item.scan.id === selectedPrimary

          return (
            <Card
              key={item.scan.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-slate-50'
              }`}
              onClick={() => setSelectedPrimary(item.scan.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {item.scan.firstName || item.scan.lastName
                        ? `${item.scan.firstName || ''} ${item.scan.lastName || ''}`.trim()
                        : 'No Name'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Scanned: {new Date(item.scan.scannedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {isRecommended && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Recommended
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Contact Info */}
                <div className="space-y-1">
                  {item.scan.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{item.scan.email}</span>
                    </div>
                  )}
                  {item.scan.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{item.scan.phone}</span>
                    </div>
                  )}
                  {item.scan.jobTitle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span>{item.scan.jobTitle}</span>
                    </div>
                  )}
                  {item.scan.boothLocation && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{item.scan.boothLocation}</span>
                    </div>
                  )}
                </div>

                {/* Company */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{item.scan.company}</span>
                  </div>
                  {item.enriched && (
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      {item.enriched.industry && <div>Industry: {item.enriched.industry}</div>}
                      {item.enriched.employeeCount && (
                        <div>Employees: {item.enriched.employeeCount.toLocaleString()}</div>
                      )}
                      {item.enriched.headquarters && <div>HQ: {item.enriched.headquarters}</div>}
                    </div>
                  )}
                </div>

                {/* Persona Match */}
                {item.personaMatch && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          item.personaMatch.tier === 'Hot'
                            ? 'destructive'
                            : item.personaMatch.tier === 'Warm'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {item.personaMatch.tier}
                      </Badge>
                      <span className="text-sm font-semibold">
                        Fit: {item.personaMatch.fitScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {item.scan.notes && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-slate-600">
                      <strong>Notes:</strong> {item.scan.notes}
                    </div>
                  </div>
                )}

                {/* Enrichment Status */}
                <div className="pt-2 border-t">
                  <Badge variant="outline" className="text-xs">
                    {item.scan.enrichmentStatus}
                  </Badge>
                </div>
              </CardContent>

              {isSelected && (
                <CardFooter className="bg-blue-50">
                  <div className="text-xs text-blue-700 font-medium">Selected as Primary</div>
                </CardFooter>
              )}
            </Card>
          )
        })}
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resolution Actions</CardTitle>
          <CardDescription>Choose how to handle these duplicate scans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => handleResolve('keep-both')} className="h-auto py-4 flex-col items-start">
              <div className="font-semibold mb-1">Keep Both</div>
              <div className="text-xs text-slate-600 text-left">
                Keep all scans as separate records
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleResolve('mark-primary')}
              disabled={!selectedPrimary}
              className="h-auto py-4 flex-col items-start"
            >
              <div className="font-semibold mb-1">Mark Primary</div>
              <div className="text-xs text-slate-600 text-left">
                Mark selected scan as primary, flag others as duplicates
              </div>
            </Button>

            <Button
              variant="default"
              onClick={() => handleResolve('merge')}
              disabled={!selectedPrimary}
              className="h-auto py-4 flex-col items-start"
            >
              <div className="font-semibold mb-1">Merge Into Primary</div>
              <div className="text-xs text-slate-600 text-left">
                Combine all data into selected scan, archive others
              </div>
            </Button>
          </div>

          <div className="text-xs text-slate-500 text-center">
            {selectedPrimary ? (
              <span>
                Primary scan selected:{' '}
                {scans.find((s) => s.scan.id === selectedPrimary)?.scan.email || 'Unknown'}
              </span>
            ) : (
              <span>Click a scan to select it as primary (recommended scan is pre-selected)</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
