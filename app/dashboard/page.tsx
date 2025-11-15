'use client'

/**
 * Dashboard Page
 * Main page for uploading badge scan CSV files, mapping columns, and processing enrichment
 *
 * Features:
 * - CSV file upload with drag-and-drop
 * - Intelligent column mapping with preview
 * - Real-time enrichment progress tracking via SSE
 * - Storage adapter selection
 * - Event management
 * - Quick navigation to reports and personas
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CSVUploader, type CSVUploadResult } from '@/components/upload/csv-uploader'
import { ColumnMapper } from '@/components/upload/column-mapper'
import { EnrichmentProgress } from '@/components/dashboard/enrichment-progress'
import { MarkdownDownloads } from '@/components/dashboard/markdown-downloads'
import { AlertCircle, CheckCircle2, Loader2, Upload, Settings, Users, FileText } from 'lucide-react'
import Link from 'next/link'
import type { CSVUploadPreview, ColumnMapping } from '@/lib/types'

type DashboardStep = 'event-setup' | 'upload' | 'column-mapping' | 'enriching' | 'complete'

interface EventDetails {
  id: string
  name: string
}

export default function DashboardPage() {
  // Step state
  const [currentStep, setCurrentStep] = useState<DashboardStep>('event-setup')

  // Event state
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    id: '',
    name: '',
  })

  // Upload state - preview from step 1
  const [uploadPreview, setUploadPreview] = useState<CSVUploadPreview | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  // Final upload result after confirmation
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null)

  // Enrichment state
  const [enrichmentJobId, setEnrichmentJobId] = useState<string | null>(null)
  const [badgeScanIds, setBadgeScanIds] = useState<string[]>([])

  // Storage adapter selection
  const [storageType, setStorageType] = useState<'local' | 'mysql' | 'hubspot'>('local')

  // Error handling
  const [error, setError] = useState<{
    whatFailed: string
    howToFix: string
    exampleFormat: string
  } | null>(null)

  // Auto-initialize personas on mount
  useEffect(() => {
    fetch('/api/init').catch((err) => {
      console.error('Failed to initialize application:', err)
    })
  }, [])

  // Handle event creation
  const handleEventSetup = async () => {
    if (!eventDetails.name.trim()) {
      setError({
        whatFailed: 'Event name is required',
        howToFix: 'Enter a descriptive name for your trade show event',
        exampleFormat: 'Example: "AWS re:Invent 2025" or "TechCrunch Disrupt 2025"',
      })
      return
    }

    // Generate event ID from name (slug format)
    const eventId = eventDetails.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    setEventDetails({ ...eventDetails, id: eventId })

    // Try to create/get event via API
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          name: eventDetails.name,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      setError(null)
      setCurrentStep('upload')
    } catch (err) {
      setError({
        whatFailed: 'Failed to create event',
        howToFix: 'Check that storage adapter is configured correctly',
        exampleFormat: 'Verify storage settings in configuration',
      })
    }
  }

  // Handle CSV upload success - receives preview data
  const handleUploadSuccess = (preview: CSVUploadPreview, file: File) => {
    setUploadPreview(preview)
    setUploadedFile(file)
    setError(null)
    setCurrentStep('column-mapping')
  }

  // Handle upload error
  const handleUploadError = (err: any) => {
    setError({
      whatFailed: err.whatFailed || 'CSV upload failed',
      howToFix: err.howToFix || 'Check that the file is a valid CSV file with badge scan data',
      exampleFormat: err.exampleFormat || 'CSV must contain columns like: Email, Company, Name',
    })
  }

  // Handle column mapping confirmation
  const handleMappingConfirm = async (mappings: ColumnMapping[]) => {
    if (!uploadedFile) {
      setError({
        whatFailed: 'No file available for confirmation',
        howToFix: 'Please upload the CSV file again',
        exampleFormat: 'File must be uploaded before confirming mappings',
      })
      return
    }

    setError(null)

    try {
      // Convert mappings to Record<string, string> format
      const mappingsRecord: Record<string, string> = {}
      for (const mapping of mappings) {
        mappingsRecord[mapping.csvColumn] = mapping.targetField
      }

      // Send confirmation request with file and mappings
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('storageType', storageType)
      formData.append('mappings', JSON.stringify(mappingsRecord))
      formData.append('eventId', eventDetails.id)
      formData.append('eventName', eventDetails.name)

      const response = await fetch('/api/upload/confirm', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to confirm upload')
      }

      const result: CSVUploadResult = (await response.json()).data
      setUploadResult(result)

      // Start batch enrichment job with the imported scan IDs
      const enrichmentResponse = await fetch('/api/enrichment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventDetails.id,
          badgeScanIds: result.scanIds,
        }),
      })

      if (!enrichmentResponse.ok) {
        throw new Error('Failed to start enrichment')
      }

      const enrichmentData = await enrichmentResponse.json()
      setEnrichmentJobId(enrichmentData.jobId)
      setBadgeScanIds(result.scanIds)
      setCurrentStep('enriching')
    } catch (err) {
      setError({
        whatFailed: err instanceof Error ? err.message : 'Failed to confirm upload and start enrichment',
        howToFix: 'Check that storage adapter is configured and LLM API keys are set (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY)',
        exampleFormat: 'Set environment variables with your API keys',
      })
    }
  }

  // Handle enrichment completion
  const handleEnrichmentComplete = (jobId: string, success: boolean) => {
    if (success) {
      setCurrentStep('complete')
      setError(null)
    } else {
      setError({
        whatFailed: 'Enrichment job failed',
        howToFix: 'Check the job status for detailed error information',
        exampleFormat: 'Some companies may have failed enrichment - check individual scan statuses',
      })
    }
  }

  // Handle enrichment error
  const handleEnrichmentError = (errorMsg: string) => {
    setError({
      whatFailed: 'Connection to enrichment service failed',
      howToFix: 'Refresh the page and try again, or check server logs for errors',
      exampleFormat: 'The enrichment process may still be running in the background',
    })
  }

  // Reset workflow
  const handleReset = () => {
    setCurrentStep('event-setup')
    setEventDetails({ id: '', name: '' })
    setUploadResult(null)
    setUploadPreview(null)
    setUploadedFile(null)
    setEnrichmentJobId(null)
    setBadgeScanIds([])
    setError(null)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Trade Show Intelligence Dashboard</h1>
        <p className="text-muted-foreground">
          Upload badge scan CSV files, map columns, and enrich leads with AI-powered intelligence
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Workflow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Event Setup */}
          {currentStep === 'event-setup' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Step 1: Event Setup
                </CardTitle>
                <CardDescription>
                  Create or select an event to organize your badge scans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="event-name">Event Name</Label>
                  <Input
                    id="event-name"
                    placeholder="e.g., AWS re:Invent 2025"
                    value={eventDetails.name}
                    onChange={(e) => setEventDetails({ ...eventDetails, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleEventSetup()}
                  />
                </div>
                <Button onClick={handleEventSetup} className="w-full">
                  Continue to Upload
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: CSV Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Step 2: Upload CSV File
                  </CardTitle>
                  <CardDescription>
                    Upload your badge scan CSV file from {eventDetails.name}
                  </CardDescription>
                </CardHeader>
              </Card>

              <CSVUploader
                eventId={eventDetails.id}
                eventName={eventDetails.name}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          )}

          {/* Step 3: Column Mapping */}
          {currentStep === 'column-mapping' && uploadPreview && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Step 3: Confirm Column Mapping
                  </CardTitle>
                  <CardDescription>
                    Review and adjust how CSV columns map to badge scan fields
                  </CardDescription>
                </CardHeader>
              </Card>

              <ColumnMapper
                headers={uploadPreview.headers}
                sampleRows={uploadPreview.sampleRows}
                detectedMappings={uploadPreview.detectedMappings}
                unmappedColumns={uploadPreview.unmappedColumns}
                confidence={uploadPreview.confidence}
                onConfirm={handleMappingConfirm}
                onCancel={() => setCurrentStep('upload')}
              />
            </div>
          )}

          {/* Step 4: Enriching */}
          {currentStep === 'enriching' && enrichmentJobId && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Step 4: Enriching Badge Scans
                  </CardTitle>
                  <CardDescription>
                    AI is analyzing and enriching your {badgeScanIds.length} badge scans
                  </CardDescription>
                </CardHeader>
              </Card>

              <EnrichmentProgress
                jobId={enrichmentJobId}
                onComplete={handleEnrichmentComplete}
                onError={handleEnrichmentError}
              />
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    Enrichment Complete!
                  </CardTitle>
                  <CardDescription>
                    Your badge scans have been successfully enriched and scored
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Successfully processed {badgeScanIds.length} badge scans. Your leads have been scored and categorized by tier.
                      {uploadResult?.proximityGroupsDetected && uploadResult.proximityGroupsDetected > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <strong>Proximity Detection (FR-031):</strong> {uploadResult.proximityGroupsDetected} group{uploadResult.proximityGroupsDetected > 1 ? 's' : ''} detected
                          (contacts scanned within 15 seconds)
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button asChild className="flex-1">
                      <Link href="/reports">View Reports</Link>
                    </Button>
                    <Button variant="outline" onClick={handleReset} className="flex-1">
                      Process Another Event
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Markdown Downloads */}
              {eventDetails.id && (
                <MarkdownDownloads eventId={eventDetails.id} />
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>What failed:</strong> {error.whatFailed}</p>
                  <p><strong>How to fix:</strong> {error.howToFix}</p>
                  <p className="text-sm opacity-90"><strong>Example:</strong> {error.exampleFormat}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Storage Adapter Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Configuration</CardTitle>
              <CardDescription>Select where to store your data</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={storageType}
                onValueChange={(value) => setStorageType(value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Storage</SelectItem>
                  <SelectItem value="mysql">MySQL Database</SelectItem>
                  <SelectItem value="hubspot">HubSpot CRM</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/reports">
                  <FileText className="h-4 w-4 mr-2" />
                  View Reports
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/personas">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Personas
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/input">
                  <Upload className="h-4 w-4 mr-2" />
                  Manual Input
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Tags & Lists
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Getting Started Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Set up your event details</li>
                <li>Upload badge scan CSV file</li>
                <li>Confirm column mappings</li>
                <li>Wait for AI enrichment</li>
                <li>View and export reports</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
