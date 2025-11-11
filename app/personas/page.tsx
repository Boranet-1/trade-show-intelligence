'use client'

/**
 * Personas Management Page
 *
 * Allows marketing operations managers to customize lead scoring by defining business personas
 * with specific criteria (company size, industry, tech stack, etc.)
 */

import { useState, useEffect } from 'react'
import type { Persona, PersonaCriteria, PersonaWeights } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { PersonaEditor } from '@/components/settings/persona-editor'
import { PersonaWeightEditor } from '@/components/settings/persona-weight-editor'
import { PersonaPreview } from '@/components/settings/persona-preview'

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)

  // Form states
  const [personaName, setPersonaName] = useState('')
  const [personaDescription, setPersonaDescription] = useState('')
  const [personaCriteria, setPersonaCriteria] = useState<PersonaCriteria>({
    companySizeRange: undefined,
    industries: [],
    technologies: [],
    revenueRange: undefined,
    geographies: [],
    decisionMakerTitles: [],
    fundingStages: [],
  })
  const [personaWeights, setPersonaWeights] = useState<PersonaWeights>({
    companySize: 0.25,
    industry: 0.25,
    technology: 0.20,
    revenue: 0.15,
    geography: 0.05,
    decisionMaker: 0.05,
    fundingStage: 0.05,
  })
  const [isReprocessing, setIsReprocessing] = useState(false)

  useEffect(() => {
    fetchPersonas()
  }, [])

  const fetchPersonas = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/personas')
      const result = await response.json()

      if (result.success) {
        setPersonas(result.data)
      } else {
        setError(result.error.whatFailed)
      }
    } catch (_err) {
      setError('Failed to load personas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePersona = async () => {
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personaName,
          description: personaDescription,
          criteria: personaCriteria,
          weights: personaWeights,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Persona created successfully')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchPersonas()
      } else {
        setError(result.error.whatFailed + ': ' + result.error.howToFix)
      }
    } catch (_err) {
      setError('Failed to create persona')
    }
  }

  const handleUpdatePersona = async () => {
    if (!selectedPersona) return

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPersona.id,
          name: personaName,
          description: personaDescription,
          criteria: personaCriteria,
          weights: personaWeights,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Persona updated successfully')
        setIsEditDialogOpen(false)
        resetForm()
        fetchPersonas()
      } else {
        setError(result.error.whatFailed + ': ' + result.error.howToFix)
      }
    } catch (_err) {
      setError('Failed to update persona')
    }
  }

  const handleDeletePersona = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) return

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Persona deleted successfully')
        fetchPersonas()
      } else {
        setError(result.error.whatFailed + (result.error.howToFix ? ': ' + result.error.howToFix : ''))
      }
    } catch (_err) {
      setError('Failed to delete persona')
    }
  }

  const handleReprocessScans = async () => {
    setIsReprocessing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/enrichment/reprocess', {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(
          `Re-processing started: ${result.data.scansReprocessed} scans will be recalculated with updated persona configurations`
        )
      } else {
        setError(result.error.whatFailed)
      }
    } catch (_err) {
      setError('Failed to start re-processing')
    } finally {
      setIsReprocessing(false)
    }
  }

  const openEditDialog = (persona: Persona) => {
    setSelectedPersona(persona)
    setPersonaName(persona.name)
    setPersonaDescription(persona.description || '')
    setPersonaCriteria(persona.criteria)
    setPersonaWeights(persona.weights)
    setIsEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const resetForm = () => {
    setPersonaName('')
    setPersonaDescription('')
    setPersonaCriteria({
      companySizeRange: undefined,
      industries: [],
      technologies: [],
      revenueRange: undefined,
      geographies: [],
      decisionMakerTitles: [],
      fundingStages: [],
    })
    setPersonaWeights({
      companySize: 0.25,
      industry: 0.25,
      technology: 0.20,
      revenue: 0.15,
      geography: 0.05,
      decisionMaker: 0.05,
      fundingStage: 0.05,
    })
    setSelectedPersona(null)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading personas...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">Persona Management</h1>
            <p className="text-slate-600 mt-2">
              Customize lead scoring by defining business personas with specific criteria
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleReprocessScans}
              disabled={isReprocessing}
              variant="outline"
            >
              {isReprocessing ? 'Re-processing...' : 'Re-process All Scans'}
            </Button>
            <Button onClick={openCreateDialog}>Create New Persona</Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
            {success}
          </Alert>
        )}
      </div>

      {/* Personas List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona) => (
          <Card key={persona.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{persona.name}</h3>
                {persona.isDefault && (
                  <Badge variant="outline" className="mt-1">Default</Badge>
                )}
              </div>
            </div>

            {persona.description && (
              <p className="text-sm text-slate-600 mb-4">{persona.description}</p>
            )}

            <div className="space-y-2 mb-4 text-sm">
              <div>
                <span className="font-medium">Criteria:</span>
                <ul className="ml-4 mt-1 space-y-1 text-slate-700">
                  {persona.criteria.companySizeRange && (
                    <li>
                      • Company Size: {persona.criteria.companySizeRange.min}-
                      {persona.criteria.companySizeRange.max} employees
                    </li>
                  )}
                  {persona.criteria.industries && persona.criteria.industries.length > 0 && (
                    <li>• Industries: {persona.criteria.industries.length}</li>
                  )}
                  {persona.criteria.technologies && persona.criteria.technologies.length > 0 && (
                    <li>• Technologies: {persona.criteria.technologies.length}</li>
                  )}
                  {persona.criteria.revenueRange && (
                    <li>
                      • Revenue: ${(persona.criteria.revenueRange.min / 1000000).toFixed(1)}M-$
                      {(persona.criteria.revenueRange.max / 1000000).toFixed(1)}M
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(persona)}
                disabled={persona.isDefault}
                className="flex-1"
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeletePersona(persona.id)}
                disabled={persona.isDefault}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {personas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600 mb-4">No personas found</p>
          <Button onClick={openCreateDialog}>Create Your First Persona</Button>
        </div>
      )}

      {/* Create Persona Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Create New Persona</h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="persona-name">Persona Name *</Label>
                <Input
                  id="persona-name"
                  placeholder="e.g., Enterprise SaaS"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="persona-description">Description</Label>
                <Input
                  id="persona-description"
                  placeholder="Brief description of this persona"
                  value={personaDescription}
                  onChange={(e) => setPersonaDescription(e.target.value)}
                />
              </div>

              <PersonaEditor
                criteria={personaCriteria}
                onSave={setPersonaCriteria}
                onCancel={() => {}}
              />

              <PersonaWeightEditor
                weights={personaWeights}
                onChange={setPersonaWeights}
              />

              <PersonaPreview criteria={personaCriteria} weights={personaWeights} />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreatePersona} disabled={!personaName}>
                  Create Persona
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Persona Dialog */}
      {isEditDialogOpen && selectedPersona && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Edit Persona</h2>

            <div className="space-y-6">
              <div>
                <Label htmlFor="edit-persona-name">Persona Name *</Label>
                <Input
                  id="edit-persona-name"
                  placeholder="e.g., Enterprise SaaS"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-persona-description">Description</Label>
                <Input
                  id="edit-persona-description"
                  placeholder="Brief description of this persona"
                  value={personaDescription}
                  onChange={(e) => setPersonaDescription(e.target.value)}
                />
              </div>

              <PersonaEditor
                persona={selectedPersona}
                criteria={personaCriteria}
                onSave={setPersonaCriteria}
                onCancel={() => {}}
              />

              <PersonaWeightEditor
                weights={personaWeights}
                onChange={setPersonaWeights}
              />

              <PersonaPreview criteria={personaCriteria} weights={personaWeights} />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdatePersona} disabled={!personaName}>
                  Update Persona
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
