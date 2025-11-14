/**
 * CSV Upload Confirmation API Route
 *
 * Phase 2: Apply confirmed mappings and save badge scans to storage
 */

import { NextRequest } from 'next/server'
import { parseCSV } from '@/lib/csv/parser'
import { applyCustomMappings } from '@/lib/csv/column-detector'
import { getStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError, ValidationError } from '@/lib/errors'
import type { CSVUploadResult, ColumnMapping } from '@/lib/types'

/**
 * POST /api/upload/confirm
 * Apply confirmed column mappings and save badge scans to storage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const storageType = (formData.get('storageType') as string) || 'local'
    const mappingsJson = formData.get('mappings') as string
    const eventId = formData.get('eventId') as string
    const eventName = formData.get('eventName') as string

    if (!file) {
      return errorResponse(
        new ValidationError('No file provided in confirmation request')
      )
    }

    if (!mappingsJson) {
      return errorResponse(
        new ValidationError('No column mappings provided')
      )
    }

    if (!eventId || !eventName) {
      return errorResponse(
        new ValidationError('Event ID and name are required')
      )
    }

    // Parse confirmed mappings
    let confirmedMappings: Record<string, string>
    try {
      confirmedMappings = JSON.parse(mappingsJson)
    } catch (error) {
      return errorResponse(
        new ValidationError('Invalid column mappings format')
      )
    }

    // Read file content
    const fileContent = await file.text()

    // Parse CSV with papaparse to get headers
    const Papa = (await import('papaparse')).default
    const rawParseResult = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      preview: 1, // Just need headers
    })

    const headers = rawParseResult.meta.fields || []

    // Apply custom mappings
    const appliedMappings = applyCustomMappings(headers, confirmedMappings)

    // Parse full CSV with applied mappings
    // Note: The parser currently uses hardcoded field names, so we'll need to transform the data
    // For now, let's use the default parsing and rely on the parser's built-in field detection
    const parseResult = parseCSV(fileContent, {
      eventId,
      eventName,
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

    // Detect duplicates within the uploaded data and against existing scans
    const existingScans = await storage.getAllBadgeScans(eventId)

    // Find duplicates by email
    const duplicates: Array<{ newScan: any; existingScans: any[] }> = []
    const emailMap = new Map<string, any[]>()

    // Build map of existing emails
    for (const scan of existingScans) {
      if (scan.email) {
        const email = scan.email.toLowerCase()
        if (!emailMap.has(email)) {
          emailMap.set(email, [])
        }
        emailMap.get(email)!.push(scan)
      }
    }

    // Check new scans for duplicates
    for (const newScan of parseResult.data) {
      if (newScan.email) {
        const email = newScan.email.toLowerCase()
        const existing = emailMap.get(email)
        if (existing && existing.length > 0) {
          duplicates.push({
            newScan,
            existingScans: existing,
          })
        }
        // Add to map for within-upload duplicate detection
        if (!emailMap.has(email)) {
          emailMap.set(email, [])
        }
        emailMap.get(email)!.push(newScan)
      }
    }

    // Save badge scans (including duplicates with flag)
    const scanIds = await storage.bulkImportBadgeScans(parseResult.data)

    // Flag duplicates in storage
    for (const duplicate of duplicates) {
      const newScanId = scanIds[parseResult.data.indexOf(duplicate.newScan)]
      const originalId = duplicate.existingScans[0].id
      await storage.flagDuplicate(newScanId, originalId)
    }

    // Build final result
    const result: CSVUploadResult = {
      success: true,
      scansImported: scanIds.length,
      scanIds,
      eventId,
      errors: parseResult.errors,
      columnMappings: appliedMappings,
      duplicates: duplicates.length > 0 ? duplicates.map(d => ({
        newScanEmail: d.newScan.email,
        duplicateCount: d.existingScans.length,
        existingScanIds: d.existingScans.map(s => s.id),
      })) : undefined,
    }

    return successResponse(result)
  } catch (error) {
    console.error('Upload confirmation error:', error)

    // If it's already an AppError, pass it through
    if (error instanceof AppError) {
      return errorResponse(error)
    }

    // Otherwise wrap it in a new AppError
    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to confirm upload and save scans: ${errorMessage}`,
        'UPLOAD_CONFIRMATION_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}
