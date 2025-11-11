/**
 * CSV Upload API Route
 *
 * Handles CSV file uploads and saves badge scans to storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseCSV } from '@/lib/csv/parser'
import { getStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError, ValidationError } from '@/lib/errors'

/**
 * POST /api/upload
 * Upload CSV file and save badge scans
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storageType = (formData.get('storageType') as string) || 'local'

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

    // Parse CSV
    const parseResult = parseCSV(fileContent, {
      eventId: `event-${Date.now()}`,
      eventName: file.name.replace('.csv', ''),
      skipEmptyLines: true,
    })

    if (!parseResult.success || parseResult.data.length === 0) {
      return errorResponse(
        new ValidationError(
          `Failed to parse CSV file: ${parseResult.errors.length} validation errors found`,
          { errors: parseResult.errors, totalRows: parseResult.totalRows }
        )
      )
    }

    // Get storage adapter
    const storage = await getStorageAdapter(storageType as 'local' | 'sheets')

    // Save badge scans
    const scanIds = await storage.bulkImportBadgeScans(parseResult.data)

    return successResponse({
      count: scanIds.length,
      scanIds,
      eventId: parseResult.data[0]?.eventId,
      totalRows: parseResult.totalRows,
      validRows: parseResult.validRows,
      errors: parseResult.errors,
    })
  } catch (error) {
    console.error('Upload error:', error)

    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return errorResponse(error)
    }

    // Otherwise wrap it in a new AppError
    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to upload and process CSV file: ${errorMessage}`,
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
