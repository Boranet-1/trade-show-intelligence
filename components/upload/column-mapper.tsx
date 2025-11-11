'use client'

/**
 * Column Mapper Preview Component
 *
 * Displays detected column mappings and allows user review/adjustment.
 * Features:
 * - Visual mapping table with confidence indicators
 * - Manual mapping adjustment via dropdowns
 * - Sample data preview
 * - Unmapped columns warning
 * - Mapping validation before confirmation
 */

import { useState, useCallback, useMemo } from 'react'
import { CheckCircle2, AlertTriangle, ArrowRight, Info } from 'lucide-react'
import type { ColumnMapping, BadgeScan } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { cn } from '@/lib/utils'

export interface ColumnMapperProps {
  headers: string[]
  sampleRows: Record<string, string>[]
  detectedMappings: ColumnMapping[]
  unmappedColumns: string[]
  confidence: 'high' | 'medium' | 'low'
  onConfirm: (mappings: ColumnMapping[]) => void
  onCancel?: () => void
}

// Target fields for BadgeScan
const TARGET_FIELDS: Array<{ value: keyof BadgeScan | 'unmapped'; label: string; required?: boolean }> = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company', required: true },
  { value: 'jobTitle', label: 'Job Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'boothLocation', label: 'Booth Location' },
  { value: 'scannedAt', label: 'Scanned At' },
  { value: 'eventName', label: 'Event Name' },
  { value: 'notes', label: 'Notes' },
  { value: 'unmapped', label: 'Do not import' },
]

export function ColumnMapper({
  headers,
  sampleRows,
  detectedMappings,
  unmappedColumns,
  confidence,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  // Initialize mappings state
  const [mappings, setMappings] = useState<ColumnMapping[]>(detectedMappings || [])

  // Handle mapping change
  const handleMappingChange = useCallback((csvColumn: string, newTargetField: string) => {
    setMappings((prev) => {
      // Remove existing mapping for this CSV column
      const filtered = prev.filter((m) => m.csvColumn !== csvColumn)

      // If not unmapped, add new mapping
      if (newTargetField !== 'unmapped') {
        return [
          ...filtered,
          {
            csvColumn,
            targetField: newTargetField as keyof BadgeScan,
            confidence: 'exact', // User-confirmed mapping
          },
        ]
      }

      return filtered
    })
  }, [])

  // Get current mapping for a column
  const getMappingForColumn = useCallback(
    (csvColumn: string): string => {
      const mapping = mappings.find((m) => m.csvColumn === csvColumn)
      return mapping ? mapping.targetField : 'unmapped'
    },
    [mappings]
  )

  // Validate mappings
  const validation = useMemo(() => {
    const errors: string[] = []
    const mappedFields = new Set(mappings.map((m) => m.targetField))

    // Check for required company field
    if (!mappedFields.has('company')) {
      errors.push('Company field is required')
    }

    // Check for at least one contact field
    const hasContact =
      mappedFields.has('firstName') ||
      mappedFields.has('lastName') ||
      mappedFields.has('email')

    if (!hasContact) {
      errors.push('At least one contact field (firstName, lastName, or email) must be mapped')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }, [mappings])

  // Confidence badge styling
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'exact':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Exact
          </Badge>
        )
      case 'fuzzy':
        return (
          <Badge variant="secondary">
            Fuzzy
          </Badge>
        )
      case 'position':
        return (
          <Badge variant="outline">
            Position
          </Badge>
        )
      default:
        return null
    }
  }

  // Overall confidence indicator
  const getConfidenceAlert = () => {
    switch (confidence) {
      case 'high':
        return (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>High confidence:</strong> Column mappings detected with high accuracy. Review and confirm below.
            </AlertDescription>
          </Alert>
        )
      case 'medium':
        return (
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Medium confidence:</strong> Some column mappings detected. Please review and adjust as needed.
            </AlertDescription>
          </Alert>
        )
      case 'low':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Low confidence:</strong> Column mappings unclear. Please review and manually adjust all mappings.
            </AlertDescription>
          </Alert>
        )
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Review Column Mappings</CardTitle>
        <CardDescription>
          Verify that CSV columns are correctly mapped to badge scan fields. Adjust any incorrect mappings using the dropdowns below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confidence Indicator */}
        {getConfidenceAlert()}

        {/* Validation Errors */}
        {!validation.valid && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Mapping errors:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Mapping Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CSV Column</TableHead>
                <TableHead className="w-16"></TableHead>
                <TableHead>Maps to Field</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Sample Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((header) => {
                const currentMapping = getMappingForColumn(header)
                const detectedMapping = detectedMappings.find((m) => m.csvColumn === header)
                const sampleValue = sampleRows[0]?.[header] || ''

                return (
                  <TableRow key={header}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentMapping}
                        onValueChange={(value) => handleMappingChange(header, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {detectedMapping && getConfidenceBadge(detectedMapping.confidence)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {sampleValue}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Unmapped Columns Warning */}
        {unmappedColumns.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Unmapped columns:</strong> {unmappedColumns.join(', ')}
              <br />
              <span className="text-sm text-muted-foreground">
                These columns will be stored as custom fields if you don't map them.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Sample Data Preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Sample Data Preview</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.slice(0, 5).map((header) => (
                    <TableHead key={header} className="text-xs">
                      {header}
                    </TableHead>
                  ))}
                  {headers.length > 5 && (
                    <TableHead className="text-xs text-muted-foreground">
                      +{headers.length - 5} more
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.slice(0, 3).map((row, i) => (
                  <TableRow key={i}>
                    {headers.slice(0, 5).map((header) => (
                      <TableCell key={header} className="text-xs max-w-[150px] truncate">
                        {row[header]}
                      </TableCell>
                    ))}
                    {headers.length > 5 && (
                      <TableCell className="text-xs text-muted-foreground">...</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={() => onConfirm(mappings)}
            disabled={!validation.valid}
            size="lg"
          >
            Confirm Mappings and Import
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
