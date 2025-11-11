/**
 * Application Initialization API Route
 *
 * Called automatically on app startup to initialize default data
 */

import { NextResponse } from 'next/server'
import { initializePersonas } from '@/lib/startup/init-personas'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.info('Running application initialization...')

    // Initialize default personas if none exist
    await initializePersonas()

    logger.info('Application initialization completed')

    return NextResponse.json({
      success: true,
      message: 'Application initialized successfully',
    })
  } catch (error) {
    logger.error('Application initialization failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
