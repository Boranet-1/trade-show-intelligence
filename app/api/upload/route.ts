/**
 * CSV Upload API Route
 *
 * Phase 1: Returns preview data with column detection for user review
 * Phase 2: Confirmation handled by /api/upload/confirm
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseCSV } from '@/lib/csv/parser'
import { detectColumnMappings } from '@/lib/csv/column-detector'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError, ValidationError } from '@/lib/errors'
import type { CSVUploadPreview } from '@/lib/types'

/**
 * POST /api/upload
 * Phase 1: Parse CSV and return preview with column detection
 * Does NOT save to storage yet - that happens in /api/upload/confirm
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return errorResponse(
        new ValidationError('No file provided in upload request')
      )
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return errorResponse(
        new ValidationError(`Invalid file type: ${file.name}. Only CSV files are accepted`)
      )
    }

    // Read file content
    const fileContent = await file.text()

    // Parse CSV with papaparse to get raw data for preview
    const Papa = (await import('papaparse')).default
    const rawParseResult = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      preview: 5, // Only parse first 5 rows for sample
    })

    if (rawParseResult.errors.length > 0 && rawParseResult.data.length === 0) {
      return errorResponse(
        new ValidationError(
          `Failed to parse CSV file: ${rawParseResult.errors[0].message}`,
          { errors: rawParseResult.errors }
        )
      )
    }

    // Get headers from parse result
    const headers = rawParseResult.meta.fields || []

    if (headers.length === 0) {
      return errorResponse(
        new ValidationError('CSV file has no headers')
      )
    }

    // Detect column mappings using intelligent detection
    const detection = detectColumnMappings(headers)

    // Extract first 3 rows as sample
    const sampleRows = rawParseResult.data.slice(0, 3)

    // Parse full CSV to get total row count and validate
    const fullParseResult = parseCSV(fileContent, {
      eventId: `event-${Date.now()}`,
      eventName: file.name.replace('.csv', ''),
      skipEmptyLines: true,
    })

    // Build preview response
    const preview: CSVUploadPreview = {
      success: true,
      headers,
      sampleRows,
      detectedMappings: detection.mappings,
      unmappedColumns: detection.unmappedColumns,
      confidence: detection.confidence,
      totalRows: fullParseResult.totalRows,
      errors: fullParseResult.errors,
    }

    return successResponse(preview)
  } catch (error) {
    console.error('Upload preview error:', error)

    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return errorResponse(error)
    }

    // Otherwise wrap it in a new AppError
    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to generate upload preview: ${errorMessage}`,
        'UPLOAD_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to upload CSV files' }, { status: 405 })
}
