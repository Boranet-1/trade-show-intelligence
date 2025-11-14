'use client'

/**
 * Tier Filter Component
 *
 * Filter leads by tier with visual badges (Hot=Red, Warm=Orange, Cold=Blue, Unscored=Gray)
 * Also includes persona filtering for advanced lead segmentation
 */

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import type { LeadTier, Persona } from '@/lib/types'

interface TierFilterProps {
  statistics: {
    hotCount: number
    warmCount: number
    coldCount: number
    unscoredCount: number
  }
  selectedTiers: LeadTier[]
  onTierChange: (tiers: LeadTier[]) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedPersonas?: string[]
  onPersonaChange?: (personas: string[]) => void
}

const tierConfig: Record<LeadTier, { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline'; color: string }> = {
  Hot: {
    label: 'Hot',
    variant: 'destructive',
    color: 'bg-red-500 text-white',
  },
  Warm: {
    label: 'Warm',
    variant: 'default',
    color: 'bg-orange-500 text-white',
  },
  Cold: {
    label: 'Cold',
    variant: 'secondary',
    color: 'bg-blue-500 text-white',
  },
  Unscored: {
    label: 'Unscored',
    variant: 'outline',
    color: 'bg-gray-400 text-white',
  },
}

export function TierFilter({
  statistics,
  selectedTiers,
  onTierChange,
  searchQuery,
  onSearchChange,
  selectedPersonas = [],
  onPersonaChange,
}: TierFilterProps) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false)

  // Load personas on mount
  useEffect(() => {
    const loadPersonas = async () => {
      setIsLoadingPersonas(true)
      try {
        const response = await fetch('/api/personas')
        if (response.ok) {
          const data = await response.json()
          setPersonas(data.success ? data.data : [])
        }
      } catch (error) {
        console.error('Failed to load personas:', error)
      } finally {
        setIsLoadingPersonas(false)
      }
    }

    if (onPersonaChange) {
      loadPersonas()
    }
  }, [onPersonaChange])

  const toggleTier = (tier: LeadTier) => {
    if (selectedTiers.includes(tier)) {
      onTierChange(selectedTiers.filter((t) => t !== tier))
    } else {
      onTierChange([...selectedTiers, tier])
    }
  }

  const togglePersona = (personaId: string) => {
    if (!onPersonaChange) return

    if (selectedPersonas.includes(personaId)) {
      onPersonaChange(selectedPersonas.filter((p) => p !== personaId))
    } else {
      onPersonaChange([...selectedPersonas, personaId])
    }
  }

  const clearFilters = () => {
    onTierChange([])
    onSearchChange('')
    if (onPersonaChange) {
      onPersonaChange([])
    }
  }

  const hasActiveFilters =
    selectedTiers.length > 0 || searchQuery.trim().length > 0 || selectedPersonas.length > 0

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by company, name, email, or job title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-600 hover:text-slate-900 underline whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Tier Badges */}
      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">Filter by Tier:</div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toggleTier('Hot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedTiers.includes('Hot')
                ? 'border-red-500 bg-red-50'
                : 'border-slate-200 hover:border-red-300'
            }`}
          >
            <Badge variant="destructive" className={tierConfig.Hot.color}>
              Hot
            </Badge>
            <span className="text-sm font-semibold">{statistics.hotCount}</span>
          </button>

          <button
            onClick={() => toggleTier('Warm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedTiers.includes('Warm')
                ? 'border-orange-500 bg-orange-50'
                : 'border-slate-200 hover:border-orange-300'
            }`}
          >
            <Badge variant="default" className={tierConfig.Warm.color}>
              Warm
            </Badge>
            <span className="text-sm font-semibold">{statistics.warmCount}</span>
          </button>

          <button
            onClick={() => toggleTier('Cold')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedTiers.includes('Cold')
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <Badge variant="secondary" className={tierConfig.Cold.color}>
              Cold
            </Badge>
            <span className="text-sm font-semibold">{statistics.coldCount}</span>
          </button>

          <button
            onClick={() => toggleTier('Unscored')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
              selectedTiers.includes('Unscored')
                ? 'border-gray-500 bg-gray-50'
                : 'border-slate-200 hover:border-gray-300'
            }`}
          >
            <Badge variant="outline" className={tierConfig.Unscored.color}>
              Unscored
            </Badge>
            <span className="text-sm font-semibold">{statistics.unscoredCount}</span>
          </button>
        </div>
      </div>

      {/* Persona Filter */}
      {onPersonaChange && personas.length > 0 && (
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2">Filter by Persona:</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {personas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => togglePersona(persona.id)}
                className={`px-3 py-1.5 rounded-md text-sm border-2 transition-all ${
                  selectedPersonas.includes(persona.id)
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 hover:border-blue-300 text-slate-600'
                }`}
              >
                {persona.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {(selectedTiers.length > 0 || selectedPersonas.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>Showing:</span>
          {selectedTiers.map((tier) => (
            <Badge key={tier} variant={tierConfig[tier].variant} className={tierConfig[tier].color}>
              {tier}
            </Badge>
          ))}
          {selectedPersonas.length > 0 && (
            <span className="text-xs text-slate-500">
              ({selectedPersonas.length} persona{selectedPersonas.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}
    </div>
  )
}
