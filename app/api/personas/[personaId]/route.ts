/**
 * Persona Detail API Routes
 *
 * GET /api/personas/[personaId] - Get a specific persona
 * DELETE /api/personas/[personaId] - Delete a persona
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeStorageAdapters, getActiveStorageAdapter } from '@/lib/storage/factory'
import type { Persona, APISuccessResponse, APIErrorResponse } from '@/lib/types'
import { logger } from '@/lib/logger'

/**
 * GET /api/personas/[personaId]
 * Get a specific persona by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
): Promise<NextResponse<APISuccessResponse<Persona> | APIErrorResponse>> {
  try {
    const { personaId } = await params

    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    const persona = await adapter.getPersona(personaId)

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: `Persona not found: ${personaId}`,
            howToFix: 'Verify the persona ID exists by calling GET /api/personas',
          },
        },
        { status: 404 }
      )
    }

    logger.info(`Retrieved persona: ${personaId}`, { name: persona.name })

    return NextResponse.json({
      success: true,
      data: persona,
    })
  } catch (error) {
    logger.error('Failed to retrieve persona:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to retrieve persona from storage',
          howToFix: 'Check storage adapter configuration and ensure the persona ID is valid',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/personas/[personaId]
 * Delete a persona (with validation to prevent deletion of personas in use)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
): Promise<NextResponse<APISuccessResponse<{ message: string }> | APIErrorResponse>> {
  try {
    const { personaId } = await params

    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    // Check if persona exists
    const persona = await adapter.getPersona(personaId)
    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: `Persona not found: ${personaId}`,
            howToFix: 'Verify the persona ID exists by calling GET /api/personas',
          },
        },
        { status: 404 }
      )
    }

    // Prevent deletion of default personas
    if (persona.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Cannot delete default personas',
            howToFix: 'Default personas are required for the system to function. You can only delete custom personas.',
          },
        },
        { status: 403 }
      )
    }

    // Check if persona is in use by any reports
    // Get all reports and check their filters
    const reports = await adapter.getAllReports()
    const reportsUsingPersona = reports.filter(
      report => report.filters?.personas?.includes(personaId)
    )

    if (reportsUsingPersona.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: `Persona is in use by ${reportsUsingPersona.length} report(s)`,
            howToFix: 'Delete or update reports that use this persona before deleting it',
            details: reportsUsingPersona.map(r => ({ id: r.id, name: r.name })),
          },
        },
        { status: 409 }
      )
    }

    // Check if persona is used in any persona matches
    // Get all badge scans and check if any have matches with this persona
    const badgeScans = await adapter.getAllBadgeScans()
    let matchesFound = false

    for (const scan of badgeScans) {
      const matches = await adapter.getPersonaMatchesForScan(scan.id)
      if (matches.some(match => match.personaId === personaId)) {
        matchesFound = true
        break
      }
    }

    if (matchesFound) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Persona is in use by existing persona matches',
            howToFix: 'This persona has been used to score badge scans. To delete it, you would need to re-process all scans without this persona, which could affect historical data integrity.',
            details: 'Consider creating a new persona instead of deleting this one to preserve historical scoring data.',
          },
        },
        { status: 409 }
      )
    }

    // All checks passed, proceed with deletion
    await adapter.deletePersona(personaId)

    logger.info(`Deleted persona: ${personaId}`, { name: persona.name })

    return NextResponse.json({
      success: true,
      data: { message: 'Persona deleted successfully' },
    })
  } catch (error) {
    logger.error('Failed to delete persona:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to delete persona',
          howToFix: 'Check storage adapter configuration and ensure the persona ID is valid',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
