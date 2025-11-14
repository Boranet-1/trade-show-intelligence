'use client'

/**
 * Manual Enrichment Form Component
 *
 * Allows users to manually input company data when automated enrichment fails.
 * Follows Constitution VII: Zero External API Assumptions - graceful degradation
 *
 * Features:
 * - Form for all EnrichedCompany fields
 * - Validation with Zod schema
 * - Submission to manual enrichment API
 * - Triggers persona matching after save
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ManualEnrichmentFormProps {
  badgeScanId: string
  companyName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ManualEnrichmentForm({
  badgeScanId,
  companyName,
  onSuccess,
  onCancel,
}: ManualEnrichmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    companyName: companyName || '',
    domain: '',
    employeeRange: '',
    industry: '',
    revenueRange: '',
    fundingStage: '',
    headquarters: '',
    description: '',
    linkedinUrl: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/enrichment/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeScanId,
          enrichedData: {
            companyName: formData.companyName,
            domain: formData.domain || undefined,
            employeeRange: formData.employeeRange || undefined,
            industry: formData.industry || undefined,
            revenueRange: formData.revenueRange || undefined,
            fundingStage: formData.fundingStage || undefined,
            headquarters: formData.headquarters || undefined,
            description: formData.description || undefined,
            linkedinUrl: formData.linkedinUrl || undefined,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.whatFailed || 'Failed to save manual enrichment')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Company data saved successfully! Persona matching will be triggered.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Company Enrichment</CardTitle>
        <CardDescription>
          Enter company information manually since automated enrichment was unavailable
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Website Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={formData.domain}
                onChange={(e) => handleChange('domain', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., SaaS, Technology"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeRange">Employee Count Range</Label>
              <Select value={formData.employeeRange} onValueChange={(val) => handleChange('employeeRange', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="201-500">201-500</SelectItem>
                  <SelectItem value="501-1000">501-1000</SelectItem>
                  <SelectItem value="1001-5000">1001-5000</SelectItem>
                  <SelectItem value="5001+">5001+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenueRange">Annual Revenue Range</Label>
              <Select value={formData.revenueRange} onValueChange={(val) => handleChange('revenueRange', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<1M">&lt;$1M</SelectItem>
                  <SelectItem value="1M-10M">$1M-$10M</SelectItem>
                  <SelectItem value="10M-50M">$10M-$50M</SelectItem>
                  <SelectItem value="50M-100M">$50M-$100M</SelectItem>
                  <SelectItem value="100M-500M">$100M-$500M</SelectItem>
                  <SelectItem value="500M-1B">$500M-$1B</SelectItem>
                  <SelectItem value="1B+">$1B+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundingStage">Funding Stage</Label>
              <Select value={formData.fundingStage} onValueChange={(val) => handleChange('fundingStage', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bootstrap">Bootstrap</SelectItem>
                  <SelectItem value="Seed">Seed</SelectItem>
                  <SelectItem value="Series A">Series A</SelectItem>
                  <SelectItem value="Series B">Series B</SelectItem>
                  <SelectItem value="Series C+">Series C+</SelectItem>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Private Equity">Private Equity</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headquarters">Headquarters Location</Label>
              <Input
                id="headquarters"
                placeholder="e.g., San Francisco, CA"
                value={formData.headquarters}
                onChange={(e) => handleChange('headquarters', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/company/..."
                value={formData.linkedinUrl}
                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Company Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of what the company does..."
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || !formData.companyName}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save & Score
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
