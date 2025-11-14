'use client'

/**
 * MEDDIC Score Display Card Component (FR-026)
 * Displays MEDDIC qualification scores and details
 */

import type { MEDDICScore } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  GitBranch,
  AlertCircle,
  Users
} from 'lucide-react'

interface MEDDICScoreCardProps {
  score: MEDDICScore
  compact?: boolean
}

export function MEDDICScoreCard({ score, compact = false }: MEDDICScoreCardProps) {
  const dimensions = [
    {
      name: 'Metrics',
      score: score.metricsScore,
      icon: TrendingUp,
      description: 'Quantifiable impact and business metrics'
    },
    {
      name: 'Economic Buyer',
      score: score.economicBuyerScore,
      icon: DollarSign,
      description: 'Access to budget holder'
    },
    {
      name: 'Decision Criteria',
      score: score.decisionCriteriaScore,
      icon: CheckCircle,
      description: 'Understanding of evaluation criteria'
    },
    {
      name: 'Decision Process',
      score: score.decisionProcessScore,
      icon: GitBranch,
      description: 'Knowledge of buying process'
    },
    {
      name: 'Identify Pain',
      score: score.identifyPainScore,
      icon: AlertCircle,
      description: 'Clear pain points identified'
    },
    {
      name: 'Champion',
      score: score.championScore,
      icon: Users,
      description: 'Internal advocate identified'
    },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 75) return 'bg-green-600'
    if (score >= 50) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  const getQualificationBadgeVariant = (status: string) => {
    switch (status) {
      case 'Qualified':
        return 'default'
      case 'Developing':
        return 'secondary'
      case 'Unqualified':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">MEDDIC Qualification</h3>
          <Badge variant={getQualificationBadgeVariant(score.qualificationStatus)}>
            {score.qualificationStatus}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Score</span>
            <span className={`font-bold ${getScoreColor(score.overallScore)}`}>
              {Math.round(score.overallScore)}%
            </span>
          </div>
          <Progress value={score.overallScore} className={getProgressColor(score.overallScore)} />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">MEDDIC Qualification</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Calculated on {new Date(score.calculatedAt).toLocaleDateString()}
          </p>
        </div>
        <Badge
          variant={getQualificationBadgeVariant(score.qualificationStatus)}
          className="text-lg px-4 py-2"
        >
          {score.qualificationStatus}
        </Badge>
      </div>

      {/* Overall Score */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-semibold">Overall Score</span>
          <span className={`text-2xl font-bold ${getScoreColor(score.overallScore)}`}>
            {Math.round(score.overallScore)}%
          </span>
        </div>
        <Progress value={score.overallScore} className={`h-3 ${getProgressColor(score.overallScore)}`} />
      </div>

      {/* MEDDIC Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {dimensions.map(({ name, score: dimScore, icon: Icon, description }) => (
          <div key={name} className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 rounded">
                <Icon className="h-5 w-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{name}</span>
                  <span className={`text-sm font-bold ${getScoreColor(dimScore)}`}>
                    {Math.round(dimScore)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{description}</p>
                <Progress value={dimScore} className={`h-2 ${getProgressColor(dimScore)}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Economic Buyer & Champion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {score.economicBuyer && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Economic Buyer
            </h3>
            {score.economicBuyer.name && (
              <p className="text-sm font-medium">{score.economicBuyer.name}</p>
            )}
            {score.economicBuyer.title && (
              <p className="text-sm text-muted-foreground">{score.economicBuyer.title}</p>
            )}
            <Badge variant="outline" className="mt-2">
              {Math.round(score.economicBuyer.confidence)}% confidence
            </Badge>
          </div>
        )}

        {score.champion && (
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Champion
            </h3>
            {score.champion.name && (
              <p className="text-sm font-medium">{score.champion.name}</p>
            )}
            {score.champion.title && (
              <p className="text-sm text-muted-foreground">{score.champion.title}</p>
            )}
            <Badge variant="outline" className="mt-2">
              {Math.round(score.champion.confidence)}% confidence
            </Badge>
          </div>
        )}
      </div>

      {/* Missing Decision Makers */}
      {score.missingDecisionMakers && score.missingDecisionMakers.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            Missing Decision Makers
          </h3>
          <div className="space-y-2">
            {score.missingDecisionMakers.map((dm, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{dm.role}</span>
                {dm.name && (
                  <span className="text-muted-foreground"> - {dm.name}</span>
                )}
                {dm.foundViaResearch && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Found via research
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Strategy */}
      {score.engagementStrategy && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-800">
            Recommended Engagement Strategy
          </h3>
          <p className="text-sm text-blue-900">{score.engagementStrategy}</p>
        </div>
      )}
    </Card>
  )
}

/**
 * MEDDIC Score Summary Component
 * Compact version for tables and lists
 */
export function MEDDICScoreSummary({ score }: MEDDICScoreCardProps) {
  const getQualificationColor = (status: string) => {
    switch (status) {
      case 'Qualified':
        return 'bg-green-100 text-green-800'
      case 'Developing':
        return 'bg-yellow-100 text-yellow-800'
      case 'Unqualified':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{Math.round(score.overallScore)}%</span>
      <Badge className={getQualificationColor(score.qualificationStatus)}>
        {score.qualificationStatus}
      </Badge>
    </div>
  )
}
