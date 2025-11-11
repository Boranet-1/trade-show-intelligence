'use client'

/**
 * Persona Preview Component
 *
 * Shows sample scoring examples based on current persona configuration
 */

import type { Persona, PersonaCriteria, PersonaWeights } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PersonaPreviewProps {
  criteria: PersonaCriteria
  weights: PersonaWeights
}

interface SampleCompany {
  name: string
  employeeCount: number
  industry: string
  technologies: string[]
  revenue: number
  geography: string
  title: string
  fundingStage: string
}

const SAMPLE_COMPANIES: SampleCompany[] = [
  {
    name: 'TechCorp Solutions',
    employeeCount: 350,
    industry: 'Software',
    technologies: ['Salesforce', 'AWS', 'React'],
    revenue: 25000000,
    geography: 'North America',
    title: 'CTO',
    fundingStage: 'Series B',
  },
  {
    name: 'Healthcare Innovation Inc',
    employeeCount: 120,
    industry: 'Healthcare',
    technologies: ['Azure', 'Python'],
    revenue: 8000000,
    geography: 'Europe',
    title: 'VP Engineering',
    fundingStage: 'Series A',
  },
  {
    name: 'StartupX',
    employeeCount: 25,
    industry: 'FinTech',
    technologies: ['Kubernetes', 'Go'],
    revenue: 2000000,
    geography: 'Asia',
    title: 'Founder',
    fundingStage: 'Seed',
  },
]

export function PersonaPreview({ criteria, weights }: PersonaPreviewProps) {
  const calculateFitScore = (company: SampleCompany): number => {
    let score = 0
    let totalWeight = 0

    // Company Size
    if (criteria.companySizeRange) {
      const { min, max } = criteria.companySizeRange
      if (min > 0 || max > 0) {
        const inRange = company.employeeCount >= min && company.employeeCount <= max
        score += inRange ? weights.companySize : 0
        totalWeight += weights.companySize
      }
    }

    // Industry
    if (criteria.industries && criteria.industries.length > 0) {
      const matches = criteria.industries.some(
        ind => ind.toLowerCase() === company.industry.toLowerCase()
      )
      score += matches ? weights.industry : 0
      totalWeight += weights.industry
    }

    // Technology
    if (criteria.technologies && criteria.technologies.length > 0) {
      const matchCount = criteria.technologies.filter(tech =>
        company.technologies.some(ct => ct.toLowerCase().includes(tech.toLowerCase()))
      ).length
      const techScore = matchCount / criteria.technologies.length
      score += techScore * weights.technology
      totalWeight += weights.technology
    }

    // Revenue
    if (criteria.revenueRange) {
      const { min, max } = criteria.revenueRange
      if (min > 0 || max > 0) {
        const inRange = company.revenue >= min && company.revenue <= max
        score += inRange ? weights.revenue : 0
        totalWeight += weights.revenue
      }
    }

    // Geography
    if (criteria.geographies && criteria.geographies.length > 0) {
      const matches = criteria.geographies.some(
        geo => geo.toLowerCase() === company.geography.toLowerCase()
      )
      score += matches ? weights.geography : 0
      totalWeight += weights.geography
    }

    // Decision Maker
    if (criteria.decisionMakerTitles && criteria.decisionMakerTitles.length > 0) {
      const matches = criteria.decisionMakerTitles.some(
        title => title.toLowerCase() === company.title.toLowerCase()
      )
      score += matches ? weights.decisionMaker : 0
      totalWeight += weights.decisionMaker
    }

    // Funding Stage
    if (criteria.fundingStages && criteria.fundingStages.length > 0) {
      const matches = criteria.fundingStages.some(
        stage => stage.toLowerCase() === company.fundingStage.toLowerCase()
      )
      score += matches ? weights.fundingStage : 0
      totalWeight += weights.fundingStage
    }

    // Normalize score to 0-100 range
    return totalWeight > 0 ? (score / totalWeight) * 100 : 0
  }

  const getTierBadge = (score: number) => {
    if (score >= 70) {
      return <Badge className="bg-red-600 text-white">Hot</Badge>
    } else if (score >= 40) {
      return <Badge className="bg-orange-500 text-white">Warm</Badge>
    } else if (score >= 30) {
      return <Badge className="bg-blue-500 text-white">Cold</Badge>
    } else {
      return <Badge className="bg-gray-500 text-white">Unscored</Badge>
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Persona Preview - Sample Scoring</h3>
      <p className="text-sm text-slate-600 mb-6">
        See how sample companies would score against this persona configuration.
      </p>

      <div className="space-y-4">
        {SAMPLE_COMPANIES.map((company) => {
          const fitScore = calculateFitScore(company)

          return (
            <div
              key={company.name}
              className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{company.name}</h4>
                  <p className="text-sm text-slate-600">
                    {company.industry} • {company.employeeCount} employees • {company.title}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold mb-1">{fitScore.toFixed(0)}%</div>
                  {getTierBadge(fitScore)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-600">Revenue:</span>{' '}
                  ${(company.revenue / 1000000).toFixed(1)}M
                </div>
                <div>
                  <span className="text-slate-600">Geography:</span> {company.geography}
                </div>
                <div className="col-span-2">
                  <span className="text-slate-600">Tech Stack:</span>{' '}
                  {company.technologies.join(', ')}
                </div>
                <div>
                  <span className="text-slate-600">Funding:</span> {company.fundingStage}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="mt-3 pt-3 border-t">
                <details className="text-sm">
                  <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                    View score breakdown
                  </summary>
                  <div className="mt-2 space-y-1 pl-4">
                    {criteria.companySizeRange && (criteria.companySizeRange.min > 0 || criteria.companySizeRange.max > 0) && (
                      <div className="flex justify-between">
                        <span>Company Size:</span>
                        <span className="font-medium">
                          {company.employeeCount >= criteria.companySizeRange.min &&
                           company.employeeCount <= criteria.companySizeRange.max
                            ? '✓ Match'
                            : '✗ No match'}
                        </span>
                      </div>
                    )}
                    {criteria.industries && criteria.industries.length > 0 && (
                      <div className="flex justify-between">
                        <span>Industry:</span>
                        <span className="font-medium">
                          {criteria.industries.some(
                            ind => ind.toLowerCase() === company.industry.toLowerCase()
                          )
                            ? '✓ Match'
                            : '✗ No match'}
                        </span>
                      </div>
                    )}
                    {criteria.technologies && criteria.technologies.length > 0 && (
                      <div className="flex justify-between">
                        <span>Technologies:</span>
                        <span className="font-medium">
                          {criteria.technologies.filter(tech =>
                            company.technologies.some(ct => ct.toLowerCase().includes(tech.toLowerCase()))
                          ).length} / {criteria.technologies.length} match
                        </span>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm">
        <h4 className="font-semibold mb-2">Tier Thresholds:</h4>
        <ul className="space-y-1 text-slate-700">
          <li>• Hot: 70% or higher fit score</li>
          <li>• Warm: 40-69% fit score</li>
          <li>• Cold: 30-39% fit score (some match, below data coverage threshold)</li>
          <li>• Unscored: Below 30% data coverage</li>
        </ul>
      </div>
    </Card>
  )
}
