'use client'

/**
 * Persona Weight Editor Component
 *
 * Provides slider controls for adjusting persona criteria weights.
 * Ensures weights sum to 1.0 with real-time validation.
 */

import { useState, useEffect } from 'react'
import type { PersonaWeights } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'

interface PersonaWeightEditorProps {
  weights: PersonaWeights
  onChange: (weights: PersonaWeights) => void
}

interface WeightItem {
  key: keyof PersonaWeights
  label: string
  description: string
}

const WEIGHT_ITEMS: WeightItem[] = [
  {
    key: 'companySize',
    label: 'Company Size',
    description: 'Weight for company employee count matching',
  },
  {
    key: 'industry',
    label: 'Industry',
    description: 'Weight for industry category matching',
  },
  {
    key: 'technology',
    label: 'Technology',
    description: 'Weight for tech stack matching',
  },
  {
    key: 'revenue',
    label: 'Revenue',
    description: 'Weight for annual revenue matching',
  },
  {
    key: 'geography',
    label: 'Geography',
    description: 'Weight for geographic location matching',
  },
  {
    key: 'decisionMaker',
    label: 'Decision Maker',
    description: 'Weight for decision maker title matching',
  },
  {
    key: 'fundingStage',
    label: 'Funding Stage',
    description: 'Weight for funding stage matching',
  },
]

export function PersonaWeightEditor({ weights, onChange }: PersonaWeightEditorProps) {
  const [localWeights, setLocalWeights] = useState<PersonaWeights>(weights)
  const [totalWeight, setTotalWeight] = useState(1.0)
  const [isValid, setIsValid] = useState(true)

  // Calculate total weight whenever weights change
  useEffect(() => {
    const total = Object.values(localWeights).reduce((sum, w) => sum + w, 0)
    setTotalWeight(total)
    setIsValid(Math.abs(total - 1.0) <= 0.01)
  }, [localWeights])

  const handleWeightChange = (key: keyof PersonaWeights, value: number) => {
    const newWeights = {
      ...localWeights,
      [key]: value,
    }
    setLocalWeights(newWeights)
    onChange(newWeights)
  }

  const normalizeWeights = () => {
    const total = Object.values(localWeights).reduce((sum, w) => sum + w, 0)
    if (total === 0) return

    const normalized = Object.keys(localWeights).reduce((acc, key) => {
      acc[key as keyof PersonaWeights] = localWeights[key as keyof PersonaWeights] / total
      return acc
    }, {} as PersonaWeights)

    setLocalWeights(normalized)
    onChange(normalized)
  }

  const resetToEqual = () => {
    const equalWeight = 1.0 / 7
    const equalWeights: PersonaWeights = {
      companySize: equalWeight,
      industry: equalWeight,
      technology: equalWeight,
      revenue: equalWeight,
      geography: equalWeight,
      decisionMaker: equalWeight,
      fundingStage: equalWeight,
    }
    setLocalWeights(equalWeights)
    onChange(equalWeights)
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Criteria Weights</h3>
            <p className="text-sm text-slate-600">
              Adjust the importance of each criterion. Weights must sum to 1.0.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetToEqual}
              className="px-3 py-1 text-sm border rounded hover:bg-slate-50"
            >
              Reset to Equal
            </button>
            <button
              type="button"
              onClick={normalizeWeights}
              className="px-3 py-1 text-sm border rounded hover:bg-slate-50"
              disabled={isValid}
            >
              Normalize
            </button>
          </div>
        </div>

        {/* Total Weight Display */}
        <div className={`p-4 rounded-lg ${isValid ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Weight:</span>
            <span className={`text-lg font-bold ${isValid ? 'text-green-700' : 'text-yellow-700'}`}>
              {totalWeight.toFixed(3)}
            </span>
          </div>
          {!isValid && (
            <p className="text-sm text-yellow-700 mt-1">
              Weights must sum to 1.0. Click "Normalize" to automatically adjust.
            </p>
          )}
        </div>

        {/* Weight Sliders */}
        <div className="space-y-6">
          {WEIGHT_ITEMS.map((item) => {
            const currentWeight = localWeights[item.key]
            const percentage = (currentWeight * 100).toFixed(1)

            return (
              <div key={item.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <Label htmlFor={`weight-${item.key}`} className="font-medium">
                      {item.label}
                    </Label>
                    <p className="text-xs text-slate-600">{item.description}</p>
                  </div>
                  <span className="text-sm font-semibold w-16 text-right">
                    {percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id={`weight-${item.key}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentWeight}
                    onChange={(e) => handleWeightChange(item.key, parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #0f172a 0%, #0f172a ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
                    }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentWeight.toFixed(2)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        handleWeightChange(item.key, value)
                      }
                    }}
                    className="w-20 px-2 py-1 text-sm border rounded text-center"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Validation Alert */}
        {!isValid && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <div className="text-sm">
              <strong>Weights must sum to 1.0</strong>
              <p className="mt-1">
                Current total: {totalWeight.toFixed(3)}. Click "Normalize" to automatically adjust all weights proportionally.
              </p>
            </div>
          </Alert>
        )}
      </div>
    </Card>
  )
}
