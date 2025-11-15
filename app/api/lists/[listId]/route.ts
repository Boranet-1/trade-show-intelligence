/**
 * List Detail API (FR-030)
 * Get, update, and delete individual lists
 */

import { NextRequest, NextResponse } from 'next/server'
import { List, APIResponse } from '@/lib/types'
import { getActiveStorageAdapter } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params
    const storage = await getActiveStorageAdapter()
    const list = await storage.getList(listId)

    if (!list) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'List not found',
            howToFix: 'Verify the list ID and try again',
            details: `No list found with ID ${listId}`,
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json<APIResponse<List>>({
      success: true,
      data: list,
    })
  } catch (error) {
    console.error('Failed to fetch list:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to fetch list',
          howToFix: 'Check list ID format and storage connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params
    const body = await request.json()
    const { name, description, type, filterCriteria, badgeScanIds } = body

    const storage = await getActiveStorageAdapter()
    const existingList = await storage.getList(listId)

    if (!existingList) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'List not found',
            howToFix: 'Verify the list ID exists',
            details: `No list found with ID ${listId}`,
          },
        },
        { status: 404 }
      )
    }

    // Update fields
    const updatedList: List = {
      ...existingList,
      name: name ?? existingList.name,
      description: description !== undefined ? description : existingList.description,
      type: type ?? existingList.type,
      filterCriteria: filterCriteria !== undefined ? filterCriteria : existingList.filterCriteria,
      badgeScanIds: badgeScanIds !== undefined ? badgeScanIds : existingList.badgeScanIds,
      contactCount: badgeScanIds ? badgeScanIds.length : existingList.contactCount,
      lastUpdated: new Date(),
    }

    await storage.updateList(updatedList)

    return NextResponse.json<APIResponse<List>>({
      success: true,
      data: updatedList,
      message: 'List updated successfully',
    })
  } catch (error) {
    console.error('Failed to update list:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to update list',
          howToFix: 'Check request format and storage connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params
    const storage = await getActiveStorageAdapter()
    const list = await storage.getList(listId)

    if (!list) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'List not found',
            howToFix: 'Verify the list ID exists',
            details: `No list found with ID ${listId}`,
          },
        },
        { status: 404 }
      )
    }

    await storage.deleteList(listId)

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'List deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete list:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to delete list',
          howToFix: 'Check storage connection and try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
