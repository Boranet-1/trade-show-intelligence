/**
 * Persona Matches API
 * GET /api/persona-matches?badgeScanId=xxx - Fetch persona matches for a badge scan
 */

import { NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const badgeScanId = searchParams.get('badgeScanId')

    if (!badgeScanId) {
      return NextResponse.json(
        {
          error: {
            whatFailed: 'Missing badgeScanId parameter',
            howToFix: 'Provide badgeScanId as a query parameter',
            exampleFormat: '/api/persona-matches?badgeScanId=550e8400-e29b-41d4-a716-446655440000',
          },
        },
        { status: 400 }
      )
    }

    const storage = await getStorageAdapter()
    const personaMatches = await storage.getPersonaMatchesForScan(badgeScanId)

    return NextResponse.json({ data: personaMatches })
  } catch (error) {
    console.error('Error fetching persona matches:', error)
    return NextResponse.json(
      {
        error: {
          whatFailed: 'Failed to fetch persona matches',
          howToFix: 'Check server logs for details',
          exampleFormat: '',
        },
      },
      { status: 500 }
    )
  }
}
