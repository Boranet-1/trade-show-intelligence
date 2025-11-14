'use client'

/**
 * Refine Dialog Component
 *
 * Dialog for re-enriching companies with custom instructions
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, X } from 'lucide-react'

interface EnrichedLead {
  badgeScan: {
    id: string
    firstName?: string
    lastName?: string
    company: string
  }
  tier: string
}

interface RefineDialogProps {
  leads: EnrichedLead[]
  onClose: () => void
  onRefineComplete: () => void
}

export function RefineDialog({ leads, onClose, onRefineComplete }: RefineDialogProps) {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [customInstructions, setCustomInstructions] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleLead = (scanId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(scanId)) {
      newSelected.delete(scanId)
    } else {
      newSelected.add(scanId)
    }
    setSelectedLeads(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.badgeScan.id)))
    }
  }

  const handleRefine = async () => {
    if (selectedLeads.size === 0) {
      setError('Please select at least one company to refine')
      return
    }

    if (!customInstructions.trim()) {
      setError('Please provide custom instructions for the re-enrichment')
      return
    }

    setIsRefining(true)
    setError(null)

    try {
      const response = await fetch('/api/enrichment/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeScanIds: Array.from(selectedLeads),
          customInstructions: customInstructions.trim(),
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert(
          `Successfully refined ${result.data.refined} of ${selectedLeads.size} companies. ` +
            (result.data.failed > 0 ? `${result.data.failed} failed.` : '')
        )
        onRefineComplete()
        onClose()
      } else {
        setError(result.error?.whatFailed || 'Failed to refine companies')
      }
    } catch (err) {
      console.error('Error refining companies:', err)
      setError('Network error occurred while refining companies')
    } finally {
      setIsRefining(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Refine Company Intelligence</h2>
            <p className="text-sm text-slate-600 mt-1">
              Re-run enrichment with custom instructions to get better results
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {/* Custom Instructions */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Custom Instructions <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-md p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Example: Focus on cloud infrastructure and DevOps tools. Look for companies using Kubernetes, Docker, or Terraform. Prioritize enterprise customers with 100+ employees."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Provide specific guidance on what to look for during re-enrichment
            </p>
          </div>

          {/* Company Selection */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium">
                Select Companies ({selectedLeads.size} selected)
              </label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedLeads.size === leads.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="border border-slate-200 rounded-md max-h-[300px] overflow-y-auto">
              {leads.map((lead) => (
                <div
                  key={lead.badgeScan.id}
                  className={`p-3 border-b last:border-b-0 flex items-center gap-3 cursor-pointer hover:bg-slate-50 ${
                    selectedLeads.has(lead.badgeScan.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleToggleLead(lead.badgeScan.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedLeads.has(lead.badgeScan.id)}
                    onChange={() => handleToggleLead(lead.badgeScan.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{lead.badgeScan.company}</div>
                    {(lead.badgeScan.firstName || lead.badgeScan.lastName) && (
                      <div className="text-sm text-slate-600">
                        {lead.badgeScan.firstName} {lead.badgeScan.lastName}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={
                      lead.tier === 'Hot'
                        ? 'destructive'
                        : lead.tier === 'Warm'
                        ? 'default'
                        : lead.tier === 'Cold'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {lead.tier}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isRefining}>
            Cancel
          </Button>
          <Button onClick={handleRefine} disabled={isRefining}>
            {isRefining ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refine {selectedLeads.size} {selectedLeads.size === 1 ? 'Company' : 'Companies'}
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
