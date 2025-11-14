/**
 * Lists API Route (FR-030)
 * Manages list creation and retrieval
 */

import { NextRequest, NextResponse } from 'next/server'
import { List, APIResponse } from '@/lib/types'
import { getStorageAdapter } from '@/lib/storage/factory'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const storage = await getStorageAdapter()
    const lists = await storage.getAllLists()

    return NextResponse.json<APIResponse<List[]>>({
      success: true,
      data: lists,
    })
  } catch (error) {
    console.error('Failed to fetch lists:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to fetch lists',
          howToFix: 'Check storage adapter connection and try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, filterCriteria, badgeScanIds } = body

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Invalid list name',
            howToFix: 'Provide a valid list name (non-empty string)',
            exampleFormat: '{"name": "VIP Contacts", "type": "static"}',
          },
        },
        { status: 400 }
      )
    }

    if (!type || (type !== 'static' && type !== 'dynamic')) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Invalid list type',
            howToFix: 'List type must be either "static" or "dynamic"',
            exampleFormat: '{"name": "Hot Leads", "type": "dynamic"}',
          },
        },
        { status: 400 }
      )
    }

    const storage = await getStorageAdapter()

    // Check for duplicate list names
    const existingLists = await storage.getAllLists()
    const duplicate = existingLists.find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicate) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'List name already exists',
            howToFix: 'Choose a different list name or update the existing list',
            details: `List "${name}" already exists with ID ${duplicate.id}`,
          },
        },
        { status: 409 }
      )
    }

    const list: List = {
      id: uuidv4(),
      name,
      description,
      type,
      filterCriteria: type === 'dynamic' ? filterCriteria : undefined,
      badgeScanIds: type === 'static' ? (badgeScanIds || []) : undefined,
      contactCount: type === 'static' ? (badgeScanIds?.length || 0) : 0,
      lastUpdated: new Date(),
      createdAt: new Date(),
    }

    await storage.saveList(list)

    return NextResponse.json<APIResponse<List>>(
      {
        success: true,
        data: list,
        message: 'List created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create list:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to create list',
          howToFix: 'Check request format and storage connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
