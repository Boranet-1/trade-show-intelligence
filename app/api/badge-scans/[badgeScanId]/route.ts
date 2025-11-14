/**
 * Badge Scan Detail API
 * GET /api/badge-scans/[badgeScanId] - Fetch a single badge scan by ID
 */

import { NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ badgeScanId: string }> }
) {
  try {
    const resolvedParams = await params
    const storage = await getStorageAdapter()
    const badgeScan = await storage.getBadgeScan(resolvedParams.badgeScanId)

    if (!badgeScan) {
      return NextResponse.json(
        {
          error: {
            whatFailed: 'Badge scan not found',
            howToFix: 'Verify the badge scan ID is correct',
            exampleFormat: 'Valid UUID format: 550e8400-e29b-41d4-a716-446655440000',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: badgeScan })
  } catch (error) {
    console.error('Error fetching badge scan:', error)
    return NextResponse.json(
      {
        error: {
          whatFailed: 'Failed to fetch badge scan',
          howToFix: 'Check server logs for details',
          exampleFormat: '',
        },
      },
      { status: 500 }
    )
  }
}
