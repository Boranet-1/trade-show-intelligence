/**
 * Badge Scan Persona Matches API Route
 *
 * GET /api/badge-scans/[badgeScanId]/persona-matches
 * Retrieve all persona matches for a specific badge scan
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeStorageAdapters, getActiveStorageAdapter } from '@/lib/storage/factory'
import type { PersonaMatch, APISuccessResponse, APIErrorResponse } from '@/lib/types'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ badgeScanId: string }> }
): Promise<NextResponse<APISuccessResponse<PersonaMatch[]> | APIErrorResponse>> {
  try {
    const { badgeScanId } = await params

    if (!badgeScanId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Missing required parameter: badgeScanId',
            howToFix: 'Provide a valid badge scan ID in the URL path',
            exampleFormat: '/api/badge-scans/{badgeScanId}/persona-matches',
          },
        },
        { status: 400 }
      )
    }

    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    // Get all persona matches for this badge scan
    const personaMatches = await adapter.getPersonaMatchesForScan(badgeScanId)

    logger.info(`Retrieved ${personaMatches.length} persona matches for badge scan ${badgeScanId}`)

    return NextResponse.json({
      success: true,
      data: personaMatches,
    })
  } catch (error) {
    logger.error('Failed to retrieve persona matches:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to retrieve persona matches from storage',
          howToFix: 'Check that the badge scan ID is valid and storage adapter is configured',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
