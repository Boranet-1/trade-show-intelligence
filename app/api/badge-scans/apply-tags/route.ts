/**
 * FR-029: Apply tags to badge scans (bulk operation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { APIResponse } from '@/lib/types'
import { createStorageAdapter } from '@/lib/storage/factory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { badgeScanIds, tagIds } = body

    // Validation
    if (!Array.isArray(badgeScanIds) || badgeScanIds.length === 0) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Invalid badge scan IDs',
            howToFix: 'Provide an array of badge scan IDs',
            exampleFormat: '{"badgeScanIds": ["scan1", "scan2"], "tagIds": ["tag1"]}',
          },
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: {
            whatFailed: 'Invalid tag IDs',
            howToFix: 'Provide an array of tag IDs',
            exampleFormat: '{"badgeScanIds": ["scan1"], "tagIds": ["tag1", "tag2"]}',
          },
        },
        { status: 400 }
      )
    }

    const storage = await createStorageAdapter()

    // Verify tags exist
    for (const tagId of tagIds) {
      const tag = await storage.getTag(tagId)
      if (!tag) {
        return NextResponse.json<APIResponse>(
          {
            success: false,
            error: {
              whatFailed: `Tag not found: ${tagId}`,
              howToFix: 'Verify all tag IDs exist before applying',
              details: `Tag ${tagId} does not exist`,
            },
          },
          { status: 404 }
        )
      }
    }

    // Apply tags to all badge scans
    await storage.applyTagsToBadgeScans(badgeScanIds, tagIds)

    return NextResponse.json<APIResponse>({
      success: true,
      message: `Applied ${tagIds.length} tag(s) to ${badgeScanIds.length} badge scan(s)`,
    })
  } catch (error) {
    console.error('Failed to apply tags:', error)
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: {
          whatFailed: 'Failed to apply tags',
          howToFix: 'Check request format and storage connection',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
