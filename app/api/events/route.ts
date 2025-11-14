/**
 * Event Management API Routes
 *
 * GET /api/events - List all events
 * POST /api/events - Create or get an event
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeStorageAdapters, getActiveStorageAdapter } from '@/lib/storage/factory'
import type { Event, APISuccessResponse, APIErrorResponse } from '@/lib/types'
import { logger } from '@/lib/logger'

/**
 * GET /api/events
 * List all events
 */
export async function GET(): Promise<NextResponse<APISuccessResponse<Event[]> | APIErrorResponse>> {
  try {
    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    const events = await adapter.getAllEvents()

    logger.info(`Retrieved ${events.length} events`)

    return NextResponse.json({
      success: true,
      data: events,
    })
  } catch (error) {
    logger.error('Failed to retrieve events:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to retrieve events from storage',
          howToFix: 'Check storage adapter configuration and ensure the data directory is accessible',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events
 * Create or get an event (idempotent)
 * If event with ID already exists, returns existing event
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<APISuccessResponse<Event> | APIErrorResponse>> {
  try {
    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    const body = await request.json()
    const { id, name, startDate, endDate, location, boothNumber } = body

    // Validate required fields
    if (!id || !name) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Missing required fields: id and name',
            howToFix: 'Provide both id and name fields in the request body',
            exampleFormat: JSON.stringify({ id: 'tech-summit-2025', name: 'Tech Summit 2025' }),
          },
        },
        { status: 400 }
      )
    }

    // Check if event already exists
    const existingEvent = await adapter.getEvent(id)
    if (existingEvent) {
      logger.info(`Event ${id} already exists, returning existing event`)
      return NextResponse.json({
        success: true,
        data: existingEvent,
        message: 'Event already exists',
      })
    }

    // Create new event
    const event: Event = {
      id,
      name,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      location,
      boothNumber,
      createdAt: new Date(),
    }

    const eventId = await adapter.saveEvent(event)
    const savedEvent = await adapter.getEvent(eventId)

    if (!savedEvent) {
      throw new Error('Event was saved but could not be retrieved')
    }

    logger.info(`Created event ${eventId}: ${name}`)

    return NextResponse.json(
      {
        success: true,
        data: savedEvent,
        message: 'Event created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to create event:', error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to create event',
          howToFix: 'Check that the request body is valid JSON and includes required fields (id, name)',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
