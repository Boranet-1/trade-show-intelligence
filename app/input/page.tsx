'use client'

/**
 * Manual Input & Review Page
 *
 * Allows manual data entry with validation
 * Human-in-the-loop review before processing
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Check, X, AlertCircle, Edit2, Save, ArrowRight } from 'lucide-react'

interface BadgeScanRow {
  id: string
  name: string
  email: string
  company: string
  title: string
  phone: string
  notes: string
  isValid: boolean
  errors: string[]
}

interface Event {
  id: string
  name: string
}

export default function ManualInputPage() {
  const router = useRouter()
  const [rows, setRows] = useState<BadgeScanRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Event selection state
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [selectedEventOption, setSelectedEventOption] = useState<string>('') // 'existing:id' or 'new'
  const [newEventName, setNewEventName] = useState('')
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  // Fetch available events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (response.ok) {
          const result = await response.json()
          if (result.success && Array.isArray(result.data)) {
            setAvailableEvents(result.data)
            // Default to most recent event if available
            if (result.data.length > 0) {
              setSelectedEventOption(`existing:${result.data[0].id}`)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setIsLoadingEvents(false)
      }
    }
    fetchEvents()
  }, [])

  // Validation rules
  const validateRow = (row: Partial<BadgeScanRow>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!row.name || row.name.trim().length === 0) {
      errors.push('Name is required')
    }

    if (!row.email || row.email.trim().length === 0) {
      errors.push('Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push('Email format is invalid')
    }

    if (!row.company || row.company.trim().length === 0) {
      errors.push('Company is required')
    }

    return { isValid: errors.length === 0, errors }
  }

  // Add new row
  const addRow = () => {
    const newRow: BadgeScanRow = {
      id: crypto.randomUUID(),
      name: '',
      email: '',
      company: '',
      title: '',
      phone: '',
      notes: '',
      isValid: false,
      errors: ['Please fill in required fields'],
    }
    setRows([...rows, newRow])
    setEditingId(newRow.id)
  }

  // Update row
  const updateRow = (id: string, field: keyof BadgeScanRow, value: string) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value }
        const validation = validateRow(updated)
        return { ...updated, isValid: validation.isValid, errors: validation.errors }
      }
      return row
    }))
  }

  // Delete row
  const deleteRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id))
    if (editingId === id) setEditingId(null)
  }

  // Process all valid rows
  const processRows = async () => {
    const validRows = rows.filter(row => row.isValid)
    if (validRows.length === 0) {
      alert('No valid rows to process')
      return
    }

    // Validate event selection
    if (!selectedEventOption) {
      alert('Please select an event or create a new one')
      return
    }

    if (selectedEventOption === 'new' && !newEventName.trim()) {
      alert('Please enter a name for the new event')
      return
    }

    setIsProcessing(true)
    try {
      // Determine event ID and name based on selection
      let eventId: string
      let eventName: string

      if (selectedEventOption === 'new') {
        // Create new event with timestamp to ensure uniqueness
        eventId = `event-${Date.now()}`
        eventName = newEventName.trim()
      } else {
        // Use existing event
        eventId = selectedEventOption.replace('existing:', '')
        const selectedEvent = availableEvents.find(e => e.id === eventId)
        eventName = selectedEvent?.name || eventId
      }

      // Ensure event exists (creates if new, updates if existing)
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, name: eventName }),
      })

      // Create badge scans and collect IDs
      const badgeScanIds: string[] = []
      for (const row of validRows) {
        const badgeScanData = {
          eventId,
          firstName: row.name.split(' ')[0] || row.name,
          lastName: row.name.split(' ').slice(1).join(' ') || '',
          email: row.email,
          company: row.company,
          jobTitle: row.title || 'Unknown',
          phone: row.phone || '',
          notes: row.notes || '',
          scannedAt: new Date().toISOString(),
        }

        const response = await fetch('/api/badge-scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badgeScanData),
        })

        if (!response.ok) {
          throw new Error(`Failed to save badge scan for ${row.name}`)
        }

        const result = await response.json()
        if (result.success && result.data?.id) {
          badgeScanIds.push(result.data.id)
        }
      }

      // Trigger batch enrichment for all created badge scans
      if (badgeScanIds.length > 0) {
        const enrichmentResponse = await fetch('/api/enrichment/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            badgeScanIds,
          }),
        })

        if (!enrichmentResponse.ok) {
          console.error('Failed to trigger enrichment, but badge scans were created')
        }
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      setRows([])
    } catch (error) {
      console.error('Error processing rows:', error)
      alert(error instanceof Error ? error.message : 'Failed to process rows')
    } finally {
      setIsProcessing(false)
    }
  }

  const validCount = rows.filter(r => r.isValid).length
  const invalidCount = rows.filter(r => !r.isValid).length

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Manual Data Entry</h1>
        <p className="text-slate-600">
          Enter badge scan data manually or paste from spreadsheet
        </p>
      </div>

      {/* Event Selection */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Event</h2>
        <p className="text-sm text-slate-600 mb-4">
          Choose an existing event or create a new one for these badge scans
        </p>

        {isLoadingEvents ? (
          <div className="text-sm text-slate-500">Loading events...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-select">Event</Label>
              <Select
                value={selectedEventOption}
                onValueChange={setSelectedEventOption}
              >
                <SelectTrigger id="event-select" className="w-full">
                  <SelectValue placeholder="Select an event..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map((event) => (
                    <SelectItem key={event.id} value={`existing:${event.id}`}>
                      {event.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Create New Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedEventOption === 'new' && (
              <div>
                <Label htmlFor="new-event-name">New Event Name</Label>
                <Input
                  id="new-event-name"
                  type="text"
                  placeholder="e.g., AWS re:Invent 2025"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {selectedEventOption && selectedEventOption !== 'new' && (
              <div className="text-sm text-green-600">
                ✓ Manual entries will be added to this event and appear in its reports
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Total Rows</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Valid</div>
          <div className="text-2xl font-bold text-green-600">{validCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-600 mb-1">Needs Review</div>
          <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button onClick={addRow} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Row
        </Button>
        {rows.length > 0 && (
          <Button
            onClick={processRows}
            disabled={validCount === 0 || isProcessing}
            variant="default"
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            {isProcessing ? 'Processing...' : `Process ${validCount} Valid Rows`}
          </Button>
        )}
      </div>

      {/* Success Message */}
      {showSuccess && (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-200">
          <div className="space-y-3">
            <div>
              <p className="font-semibold">Successfully processed badge scans!</p>
              <p className="text-sm mt-1">
                Badge scans have been created and enrichment is running in the background.
                A report will be auto-generated when enrichment completes.
              </p>
            </div>
            <Button
              onClick={() => router.push('/reports')}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              View Reports
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Data Table */}
      {rows.length > 0 ? (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Name *</TableHead>
                <TableHead>Email *</TableHead>
                <TableHead>Company *</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={!row.isValid ? 'bg-red-50' : ''}>
                  <TableCell>
                    {row.isValid ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Full Name"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="email"
                      value={row.email}
                      onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="email@example.com"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={row.company}
                      onChange={(e) => updateRow(row.id, 'company', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Company Name"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => updateRow(row.id, 'title', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Job Title"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="tel"
                      value={row.phone}
                      onChange={(e) => updateRow(row.id, 'phone', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Phone"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Notes"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(row.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Validation Errors */}
          {invalidCount > 0 && (
            <div className="p-4 border-t bg-red-50">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Validation Issues ({invalidCount} rows)
              </h3>
              {rows.filter(r => !r.isValid).map(row => (
                <div key={row.id} className="text-sm text-red-800 mb-1">
                  <strong>Row {rows.indexOf(row) + 1}:</strong> {row.errors.join(', ')}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-slate-600 mb-4">No rows added yet</p>
          <Button onClick={addRow} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Your First Row
          </Button>
        </Card>
      )}

      {/* Help Section */}
      <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-3">Tips for Manual Entry:</h3>
        <ul className="text-sm text-slate-700 space-y-2">
          <li>• Fields marked with * are required</li>
          <li>• Email addresses must be in valid format (user@domain.com)</li>
          <li>• All rows must pass validation before processing</li>
          <li>• You can paste data directly from Excel or Google Sheets</li>
          <li>• Click the trash icon to remove invalid rows</li>
        </ul>
      </Card>
    </div>
  )
}
