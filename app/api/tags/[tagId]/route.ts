/**
 * FR-029: Tag Detail API
 * Get, update, and delete individual tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { Tag, APIResponse } from '@/lib/types'
import { getActiveStorageAdapter } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params
    const storage = await getActiveStorageAdapter()
    const tag = await storage.getTag(tagId)

    if (!tag) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Tag not found',
            howToFix: 'Verify the tag ID and try again',
            details: `No tag found with ID ${tagId}`,
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json<APIResponse<Tag>>({
      success: true,
      data: tag,
    })
  } catch (error) {
    console.error('Failed to fetch tag:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to fetch tag',
          howToFix: 'Check tag ID format and storage connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params
    const body = await request.json()
    const { name, color, description } = body

    const storage = await getActiveStorageAdapter()
    const existingTag = await storage.getTag(tagId)

    if (!existingTag) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Tag not found',
            howToFix: 'Verify the tag ID exists',
            details: `No tag found with ID ${tagId}`,
          },
        },
        { status: 404 }
      )
    }

    // Update fields
    const updatedTag: Tag = {
      ...existingTag,
      name: name ?? existingTag.name,
      color: color ?? existingTag.color,
      description: description !== undefined ? description : existingTag.description,
    }

    // Validate color if updated
    if (color && !color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Invalid color format',
            howToFix: 'Provide a valid hex color code',
            exampleFormat: '#FF5733',
          },
        },
        { status: 400 }
      )
    }

    await storage.updateTag(updatedTag)

    return NextResponse.json<APIResponse<Tag>>({
      success: true,
      data: updatedTag,
      message: 'Tag updated successfully',
    })
  } catch (error) {
    console.error('Failed to update tag:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to update tag',
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
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const { tagId } = await params
    const storage = await getActiveStorageAdapter()
    const tag = await storage.getTag(tagId)

    if (!tag) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Tag not found',
            howToFix: 'Verify the tag ID exists',
            details: `No tag found with ID ${tagId}`,
          },
        },
        { status: 404 }
      )
    }

    await storage.deleteTag(tagId)

    return NextResponse.json<APIResponse>({
      success: true,
      message: 'Tag deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete tag:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to delete tag',
          howToFix: 'Check storage connection and try again',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
