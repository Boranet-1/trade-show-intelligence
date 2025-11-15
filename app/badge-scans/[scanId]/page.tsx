'use client'

/**
 * Badge Scan Detail Page
 * Shows full details including enrichment data, dual-tier scoring, and MEDDIC analysis
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MEDDICScoreCard } from '@/components/reports/meddic-score-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  TrendingUp,
  Target,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import type { BadgeScan, EnrichedCompany, PersonaMatch, MEDDICScore } from '@/lib/types'

export default function BadgeScanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.scanId as string

  const [badgeScan, setBadgeScan] = useState<BadgeScan | null>(null)
  const [enrichedCompany, setEnrichedCompany] = useState<EnrichedCompany | null>(null)
  const [personaMatch, setPersonaMatch] = useState<PersonaMatch | null>(null)
  const [meddicScore, setMeddicScore] = useState<MEDDICScore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingMEDDIC, setIsCalculatingMEDDIC] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (scanId) {
      fetchBadgeScanDetails()
    }
  }, [scanId])

  const fetchBadgeScanDetails = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch badge scan
      const scanResponse = await fetch(`/api/badge-scans/${scanId}`)
      if (!scanResponse.ok) {
        throw new Error('Badge scan not found')
      }
      const scanData = await scanResponse.json()
      setBadgeScan(scanData.data)

      // Fetch enriched company
      const enrichedResponse = await fetch(`/api/enriched-companies?badgeScanId=${scanId}`)
      if (enrichedResponse.ok) {
        const enrichedData = await enrichedResponse.json()
        if (enrichedData.data) {
          setEnrichedCompany(enrichedData.data)
        }
      }

      // Fetch persona match
      const matchResponse = await fetch(`/api/persona-matches?badgeScanId=${scanId}`)
      if (matchResponse.ok) {
        const matchData = await matchResponse.json()
        if (matchData.data && matchData.data.length > 0) {
          setPersonaMatch(matchData.data[0])
        }
      }

      // Try to fetch existing MEDDIC score
      const meddicResponse = await fetch(`/api/meddic/${scanId}`)
      if (meddicResponse.ok) {
        const meddicData = await meddicResponse.json()
        if (meddicData.data) {
          setMeddicScore(meddicData.data)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badge scan details')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMEDDIC = async () => {
    setIsCalculatingMEDDIC(true)
    try {
      const response = await fetch(`/api/meddic/${scanId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.whatFailed || 'Failed to calculate MEDDIC score')
      }
      const data = await response.json()
      setMeddicScore(data.data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to calculate MEDDIC score')
    } finally {
      setIsCalculatingMEDDIC(false)
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'Hot':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'Warm':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'Cold':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    )
  }

  if (error || !badgeScan) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Badge scan not found'}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Contact Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {badgeScan.firstName} {badgeScan.lastName}
              </CardTitle>
              <CardDescription>{badgeScan.company}</CardDescription>
            </div>
            {personaMatch && (
              <div className="flex flex-col gap-2">
                {personaMatch.companyTier && (
                  <Badge className={getTierBadgeColor(personaMatch.companyTier)}>
                    Company: {personaMatch.companyTier}
                  </Badge>
                )}
                {badgeScan.contactTier && (
                  <Badge className={getTierBadgeColor(badgeScan.contactTier)}>
                    Contact: {badgeScan.contactTier}
                  </Badge>
                )}
                {personaMatch.tier && (
                  <Badge className={getTierBadgeColor(personaMatch.tier)}>
                    Combined: {personaMatch.tier}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{badgeScan.email}</div>
              </div>
            </div>
            {badgeScan.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{badgeScan.phone}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm text-muted-foreground">Job Title</div>
                <div className="font-medium">{badgeScan.jobTitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm text-muted-foreground">Scanned At</div>
                <div className="font-medium">
                  {new Date(badgeScan.scannedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="enrichment" className="space-y-6">
        <TabsList>
          <TabsTrigger value="enrichment">Company Intelligence</TabsTrigger>
          <TabsTrigger value="persona">Persona Fit</TabsTrigger>
          <TabsTrigger value="meddic">MEDDIC Qualification</TabsTrigger>
        </TabsList>

        {/* Enrichment Tab */}
        <TabsContent value="enrichment">
          {enrichedCompany ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Industry</div>
                      <div className="font-medium">{enrichedCompany.industry || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Employee Count</div>
                      <div className="font-medium">
                        {enrichedCompany.employeeCount?.toLocaleString() || 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Annual Revenue</div>
                      <div className="font-medium">
                        {enrichedCompany.annualRevenue || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  {enrichedCompany.description && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Description</div>
                      <p className="text-sm">{enrichedCompany.description}</p>
                    </div>
                  )}

                  {enrichedCompany.techStack && enrichedCompany.techStack.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Technology Stack</div>
                      <div className="flex flex-wrap gap-2">
                        {enrichedCompany.techStack.map((tech, idx) => (
                          <Badge key={idx} variant="outline">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {enrichedCompany.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{enrichedCompany.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground mb-4">
                This badge scan has not been enriched yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Run enrichment from the dashboard to get company intelligence data.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Persona Fit Tab */}
        <TabsContent value="persona">
          {personaMatch ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Persona Match Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Fit Score</span>
                      <span className="text-2xl font-bold">{Math.round(personaMatch.fitScore)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${personaMatch.fitScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Dual-Tier Breakdown */}
                  {personaMatch.combinedTierCalculation && (
                    <Card className="p-4 bg-gray-50 mb-6">
                      <h3 className="font-semibold mb-3">Dual-Tier Calculation (FR-032)</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Company Tier Score:</span>
                          <span className="font-medium">
                            {personaMatch.combinedTierCalculation.companyTierScore}
                            {' '}(Weight: 60%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contact Tier Score:</span>
                          <span className="font-medium">
                            {personaMatch.combinedTierCalculation.contactTierScore}
                            {' '}(Weight: 40%)
                          </span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between">
                          <span className="font-semibold">Combined Score:</span>
                          <span className="font-bold">
                            {personaMatch.combinedTierCalculation.combinedScore}
                            {' '}→ {personaMatch.combinedTierCalculation.combinedTier}
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}

                  {personaMatch.criteriaMatches && personaMatch.criteriaMatches.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Matching Criteria</h3>
                      <div className="space-y-2">
                        {personaMatch.criteriaMatches.map((criteria, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              criteria.matched ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            <span className="text-sm">{criteria.criterionName}</span>
                            <div className="flex items-center gap-2">
                              {criteria.matched ? (
                                <Badge className="bg-green-100 text-green-800">Match</Badge>
                              ) : (
                                <Badge variant="outline">No Match</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground mb-4">No persona match available.</p>
              <p className="text-sm text-muted-foreground">
                Enrich this badge scan to calculate persona fit scores.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* MEDDIC Tab */}
        <TabsContent value="meddic">
          {meddicScore ? (
            <MEDDICScoreCard score={meddicScore} />
          ) : (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-muted-foreground mb-4">
                No MEDDIC score calculated yet.
              </p>
              <Button
                onClick={calculateMEDDIC}
                disabled={!enrichedCompany || isCalculatingMEDDIC}
              >
                {isCalculatingMEDDIC ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate MEDDIC Score'
                )}
              </Button>
              {!enrichedCompany && (
                <p className="text-sm text-muted-foreground mt-4">
                  Badge scan must be enriched before calculating MEDDIC scores.
                </p>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
