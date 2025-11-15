/**
 * Badge Scans API
 * POST /api/badge-scans - Create a new badge scan
 */

import { NextResponse } from 'next/server'
import { getStorageAdapter } from '@/lib/storage/factory'
import type { BadgeScan } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.eventId) {
      return NextResponse.json(
        {
          error: {
            whatFailed: 'Event ID is required',
            howToFix: 'Provide an eventId in the request body',
            exampleFormat: '{ "eventId": "aws-reinvent-2024", ... }',
          },
        },
        { status: 400 }
      )
    }

    if (!body.email && !body.firstName && !body.lastName) {
      return NextResponse.json(
        {
          error: {
            whatFailed: 'At least one identifier is required',
            howToFix: 'Provide email, firstName, or lastName',
            exampleFormat: '{ "email": "john@example.com", ... }',
          },
        },
        { status: 400 }
      )
    }

    // Create badge scan object
    const badgeScan: Omit<BadgeScan, 'id'> = {
      eventId: body.eventId,
      eventName: body.eventName || 'Unknown Event',
      scannedAt: body.scannedAt ? new Date(body.scannedAt) : new Date(),
      firstName: body.firstName || undefined,
      lastName: body.lastName || undefined,
      email: body.email || undefined,
      company: body.company || undefined,
      jobTitle: body.jobTitle || undefined,
      phone: body.phone || undefined,
      notes: body.notes || undefined,
      customFields: body.customFields || body.metadata || {},
      enrichmentStatus: 'PENDING' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to storage
    const storage = await getStorageAdapter()
    const created = await storage.saveBadgeScan(badgeScan)

    return NextResponse.json({
      success: true,
      data: created,
    })
  } catch (error) {
    console.error('Error creating badge scan:', error)
    return NextResponse.json(
      {
        error: {
          whatFailed: 'Failed to create badge scan',
          howToFix: 'Check server logs for details and verify storage adapter is configured',
          exampleFormat: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
