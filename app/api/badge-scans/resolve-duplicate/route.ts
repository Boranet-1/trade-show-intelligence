/**
 * Duplicate Resolution API Route
 *
 * Handles duplicate resolution actions: keep-both, merge, mark-primary
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveStorageAdapter } from '@/lib/storage'
import { errorResponse, successResponse } from '@/lib/api/helpers'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Request validation schema
const resolveDuplicateSchema = z.object({
  scanIds: z.array(z.string().uuid()).min(2, 'At least 2 scan IDs required'),
  action: z.enum(['keep-both', 'merge', 'mark-primary']),
  primaryScanId: z.string().uuid().optional(),
  mergedData: z.record(z.string(), z.any()).optional(),
})

/**
 * POST /api/badge-scans/resolve-duplicate
 * Resolve duplicate badge scans
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request
    const validationResult = resolveDuplicateSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse(
        new AppError('Invalid request body', 'VALIDATION_ERROR', 400, {
          whatFailed: 'Request validation failed',
          howToFix: 'Ensure scanIds is an array of UUIDs and action is valid',
          exampleFormat: JSON.stringify({
            scanIds: ['uuid1', 'uuid2'],
            action: 'mark-primary',
            primaryScanId: 'uuid1',
          }),
          validationErrors: validationResult.error.issues,
        })
      )
    }

    const { scanIds, action, primaryScanId, mergedData } = validationResult.data

    const storage = await getActiveStorageAdapter()

    // Fetch all scans
    const scans = await Promise.all(scanIds.map((id) => storage.getBadgeScan(id)))
    const validScans = scans.filter((s) => s !== null)

    if (validScans.length < 2) {
      return errorResponse(
        new AppError('At least 2 valid scans required', 'NOT_FOUND', 404, {
          whatFailed: 'Not enough valid scans found',
          howToFix: 'Verify all scan IDs exist',
        })
      )
    }

    switch (action) {
      case 'keep-both': {
        // Simply unflag all scans as duplicates
        for (const scan of validScans) {
          await storage.flagDuplicate(scan.id, '')  // Clear duplicate flag
        }

        return successResponse({
          action: 'keep-both',
          message: 'All scans kept as separate entries',
          scanIds: validScans.map((s) => s.id),
        })
      }

      case 'mark-primary': {
        if (!primaryScanId) {
          return errorResponse(
            new AppError('Primary scan ID required for mark-primary action', 'VALIDATION_ERROR', 400, {
              whatFailed: 'Missing primaryScanId',
              howToFix: 'Provide primaryScanId in request body',
              exampleFormat: JSON.stringify({
                scanIds: ['uuid1', 'uuid2'],
                action: 'mark-primary',
                primaryScanId: 'uuid1',
              }),
            })
          )
        }

        // Verify primary scan exists
        const primaryScan = validScans.find((s) => s.id === primaryScanId)
        if (!primaryScan) {
          return errorResponse(
            new AppError('Primary scan not found in provided scan IDs', 'VALIDATION_ERROR', 400)
          )
        }

        // Flag other scans as duplicates of primary
        for (const scan of validScans) {
          if (scan.id !== primaryScanId) {
            await storage.flagDuplicate(scan.id, primaryScanId)
          }
        }

        return successResponse({
          action: 'mark-primary',
          message: 'Primary scan marked, others flagged as duplicates',
          primaryScanId,
          duplicateScanIds: validScans.filter((s) => s.id !== primaryScanId).map((s) => s.id),
        })
      }

      case 'merge': {
        if (!primaryScanId) {
          return errorResponse(
            new AppError('Primary scan ID required for merge action', 'VALIDATION_ERROR', 400)
          )
        }

        // Verify primary scan exists
        const primaryScan = validScans.find((s) => s.id === primaryScanId)
        if (!primaryScan) {
          return errorResponse(
            new AppError('Primary scan not found in provided scan IDs', 'VALIDATION_ERROR', 400)
          )
        }

        // Merge data from all scans into primary scan
        const mergedScan = { ...primaryScan }

        for (const scan of validScans) {
          if (scan.id !== primaryScanId) {
            // Merge non-null values
            if (!mergedScan.firstName && scan.firstName) mergedScan.firstName = scan.firstName
            if (!mergedScan.lastName && scan.lastName) mergedScan.lastName = scan.lastName
            if (!mergedScan.email && scan.email) mergedScan.email = scan.email
            if (!mergedScan.jobTitle && scan.jobTitle) mergedScan.jobTitle = scan.jobTitle
            if (!mergedScan.phone && scan.phone) mergedScan.phone = scan.phone
            if (!mergedScan.boothLocation && scan.boothLocation) mergedScan.boothLocation = scan.boothLocation

            // Merge notes
            if (scan.notes && scan.notes !== mergedScan.notes) {
              mergedScan.notes = mergedScan.notes
                ? `${mergedScan.notes}; ${scan.notes}`
                : scan.notes
            }

            // Flag as duplicate
            await storage.flagDuplicate(scan.id, primaryScanId)
          }
        }

        // Apply custom merged data if provided
        if (mergedData) {
          Object.assign(mergedScan, mergedData)
        }

        // Update primary scan with merged data
        await storage.updateBadgeScanStatus(primaryScanId, mergedScan.enrichmentStatus)

        // Get enriched data from all scans and merge
        const enrichedCompanies = await Promise.all(
          validScans.map((scan) => storage.getEnrichedCompany(scan.id))
        )

        const validEnriched = enrichedCompanies.filter((e) => e !== null)
        if (validEnriched.length > 0) {
          // Use the most complete enriched data
          const bestEnriched = validEnriched.reduce((best, current) => {
            const currentScore = Object.values(current).filter((v) => v !== null && v !== undefined).length
            const bestScore = Object.values(best).filter((v) => v !== null && v !== undefined).length
            return currentScore > bestScore ? current : best
          })

          await storage.updateEnrichment(primaryScanId, bestEnriched)
        }

        return successResponse({
          action: 'merge',
          message: 'Scans merged into primary scan',
          primaryScanId,
          mergedScan: {
            id: mergedScan.id,
            firstName: mergedScan.firstName,
            lastName: mergedScan.lastName,
            email: mergedScan.email,
            company: mergedScan.company,
            jobTitle: mergedScan.jobTitle,
            phone: mergedScan.phone,
          },
          mergedFromScans: validScans.filter((s) => s.id !== primaryScanId).map((s) => s.id),
        })
      }

      default:
        return errorResponse(
          new AppError('Invalid action', 'VALIDATION_ERROR', 400)
        )
    }
  } catch (error) {
    console.error('[Duplicate Resolution API] Error:', error)

    if (error instanceof AppError) {
      return errorResponse(error)
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorResponse(
      new AppError(
        `Failed to resolve duplicates: ${errorMessage}`,
        'RESOLUTION_ERROR',
        500,
        { originalError: error }
      )
    )
  }
}
