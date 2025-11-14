/**
 * FR-029: Tag Management API
 * Create and list tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { Tag, APIResponse } from '@/lib/types'
import { getStorageAdapter } from '@/lib/storage/factory'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const storage = await getStorageAdapter()

    // Get all tags (this method needs to be added to storage adapter)
    const tags = await storage.getAllTags()

    return NextResponse.json<APIResponse<Tag[]>>({
      success: true,
      data: tags,
    })
  } catch (error) {
    console.error('Failed to fetch tags:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to fetch tags',
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
    const { name, color, description } = body

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Invalid tag name',
            howToFix: 'Provide a valid tag name (non-empty string)',
            exampleFormat: '{"name": "Q1 Follow-up", "color": "#FF5733"}',
          },
        },
        { status: 400 }
      )
    }

    if (!color || typeof color !== 'string' || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Invalid color format',
            howToFix: 'Provide a valid hex color code',
            exampleFormat: '{"name": "Tag Name", "color": "#FF5733"}',
          },
        },
        { status: 400 }
      )
    }

    const storage = await getStorageAdapter()

    // Check for duplicate tag names
    const existingTags = await storage.getAllTags()
    const duplicate = existingTags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicate) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Tag name already exists',
            howToFix: 'Choose a different tag name or update the existing tag',
            details: `Tag "${name}" already exists with ID ${duplicate.id}`,
          },
        },
        { status: 409 }
      )
    }

    const tag: Tag = {
      id: uuidv4(),
      name,
      color,
      description,
      createdAt: new Date(),
    }

    await storage.saveTag(tag)

    return NextResponse.json<APIResponse<Tag>>(
      {
        success: true,
        data: tag,
        message: 'Tag created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create tag:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to create tag',
          howToFix: 'Check request format and storage connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
