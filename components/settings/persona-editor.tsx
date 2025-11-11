'use client'

/**
 * Persona Editor Component
 *
 * Form for editing persona criteria (company size, industries, technologies, etc.)
 */

import { useState } from 'react'
import type { Persona, PersonaCriteria, FundingStage } from '@/lib/types'
import { FundingStage as FundingStageEnum } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface PersonaEditorProps {
  persona?: Persona
  onSave: (criteria: PersonaCriteria) => void
  onCancel: () => void
}

export function PersonaEditor({ persona, onSave, onCancel }: PersonaEditorProps) {
  const [criteria, setCriteria] = useState<PersonaCriteria>(
    persona?.criteria || {
      companySizeRange: undefined,
      industries: [],
      technologies: [],
      revenueRange: undefined,
      geographies: [],
      decisionMakerTitles: [],
      fundingStages: [],
    }
  )

  // Input states for adding new items to arrays
  const [newIndustry, setNewIndustry] = useState('')
  const [newTechnology, setNewTechnology] = useState('')
  const [newGeography, setNewGeography] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const handleSave = () => {
    onSave(criteria)
  }

  const addToArray = (field: keyof PersonaCriteria, value: string) => {
    if (!value.trim()) return

    const currentArray = (criteria[field] as string[] | undefined) || []
    setCriteria({
      ...criteria,
      [field]: [...currentArray, value.trim()],
    })
  }

  const removeFromArray = (field: keyof PersonaCriteria, index: number) => {
    const currentArray = (criteria[field] as string[] | undefined) || []
    setCriteria({
      ...criteria,
      [field]: currentArray.filter((_, i) => i !== index),
    })
  }

  const toggleFundingStage = (stage: FundingStage) => {
    const currentStages = criteria.fundingStages || []
    const hasStage = currentStages.includes(stage)

    setCriteria({
      ...criteria,
      fundingStages: hasStage
        ? currentStages.filter(s => s !== stage)
        : [...currentStages, stage],
    })
  }

  return (
    <div className="space-y-6">
      {/* Company Size Range */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Company Size Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companySize-min">Minimum Employees</Label>
            <Input
              id="companySize-min"
              type="number"
              min="0"
              placeholder="e.g., 50"
              value={criteria.companySizeRange?.min || ''}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  companySizeRange: {
                    min: parseInt(e.target.value) || 0,
                    max: criteria.companySizeRange?.max || 0,
                  },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="companySize-max">Maximum Employees</Label>
            <Input
              id="companySize-max"
              type="number"
              min="0"
              placeholder="e.g., 500"
              value={criteria.companySizeRange?.max || ''}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  companySizeRange: {
                    min: criteria.companySizeRange?.min || 0,
                    max: parseInt(e.target.value) || 0,
                  },
                })
              }
            />
          </div>
        </div>
      </Card>

      {/* Industries */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Industries</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add industry (e.g., Software, Healthcare)"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToArray('industries', newIndustry)
                  setNewIndustry('')
                }
              }}
            />
            <Button
              type="button"
              onClick={() => {
                addToArray('industries', newIndustry)
                setNewIndustry('')
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {criteria.industries?.map((industry, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm"
              >
                {industry}
                <button
                  onClick={() => removeFromArray('industries', index)}
                  className="text-red-600 hover:text-red-800"
                  aria-label={`Remove ${industry}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Technologies */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Technologies</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add technology (e.g., Salesforce, AWS)"
              value={newTechnology}
              onChange={(e) => setNewTechnology(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToArray('technologies', newTechnology)
                  setNewTechnology('')
                }
              }}
            />
            <Button
              type="button"
              onClick={() => {
                addToArray('technologies', newTechnology)
                setNewTechnology('')
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {criteria.technologies?.map((tech, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm"
              >
                {tech}
                <button
                  onClick={() => removeFromArray('technologies', index)}
                  className="text-red-600 hover:text-red-800"
                  aria-label={`Remove ${tech}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Revenue Range */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Revenue Range (USD)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="revenue-min">Minimum Revenue</Label>
            <Input
              id="revenue-min"
              type="number"
              min="0"
              placeholder="e.g., 1000000"
              value={criteria.revenueRange?.min || ''}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  revenueRange: {
                    min: parseInt(e.target.value) || 0,
                    max: criteria.revenueRange?.max || 0,
                  },
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="revenue-max">Maximum Revenue</Label>
            <Input
              id="revenue-max"
              type="number"
              min="0"
              placeholder="e.g., 50000000"
              value={criteria.revenueRange?.max || ''}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  revenueRange: {
                    min: criteria.revenueRange?.min || 0,
                    max: parseInt(e.target.value) || 0,
                  },
                })
              }
            />
          </div>
        </div>
      </Card>

      {/* Geographies */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Geographies</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add geography (e.g., North America, Europe)"
              value={newGeography}
              onChange={(e) => setNewGeography(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToArray('geographies', newGeography)
                  setNewGeography('')
                }
              }}
            />
            <Button
              type="button"
              onClick={() => {
                addToArray('geographies', newGeography)
                setNewGeography('')
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {criteria.geographies?.map((geo, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm"
              >
                {geo}
                <button
                  onClick={() => removeFromArray('geographies', index)}
                  className="text-red-600 hover:text-red-800"
                  aria-label={`Remove ${geo}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Decision Maker Titles */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Decision Maker Titles</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add title (e.g., CTO, VP Engineering)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToArray('decisionMakerTitles', newTitle)
                  setNewTitle('')
                }
              }}
            />
            <Button
              type="button"
              onClick={() => {
                addToArray('decisionMakerTitles', newTitle)
                setNewTitle('')
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {criteria.decisionMakerTitles?.map((title, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm"
              >
                {title}
                <button
                  onClick={() => removeFromArray('decisionMakerTitles', index)}
                  className="text-red-600 hover:text-red-800"
                  aria-label={`Remove ${title}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Funding Stages */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Funding Stages</h3>
        <div className="flex flex-wrap gap-2">
          {Object.values(FundingStageEnum).map((stage) => {
            const isSelected = criteria.fundingStages?.includes(stage)
            return (
              <button
                key={stage}
                type="button"
                onClick={() => toggleFundingStage(stage)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {stage}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave}>
          Save Criteria
        </Button>
      </div>
    </div>
  )
}
