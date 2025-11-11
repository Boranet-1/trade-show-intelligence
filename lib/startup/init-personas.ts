/**
 * Persona Initialization Utility
 *
 * Automatically seeds default personas on application startup if none exist
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { initializeStorageAdapters, getActiveStorageAdapter } from '../storage/factory'
import type { Persona } from '../types'
import { logger } from '../logger'

let initialized = false

/**
 * Initialize personas by seeding default templates if storage is empty
 * This function is idempotent and safe to call multiple times
 */
export async function initializePersonas(): Promise<void> {
  // Prevent multiple initializations
  if (initialized) {
    return
  }

  try {
    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    const existingPersonas = await adapter.getAllPersonas()

    if (existingPersonas.length > 0) {
      logger.info(`Personas already initialized (${existingPersonas.length} found)`)
      initialized = true
      return
    }

    logger.info('No personas found. Seeding default personas...')

    const personasDir = path.join(process.cwd(), 'public', 'personas')

    try {
      const files = await fs.readdir(personasDir)
      const jsonFiles = files.filter((file) => file.endsWith('.json'))

      if (jsonFiles.length === 0) {
        logger.warn('No persona templates found in public/personas/')
        initialized = true
        return
      }

      for (const file of jsonFiles) {
        const filePath = path.join(personasDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const personaTemplate = JSON.parse(content)

        const persona: Persona = {
          ...personaTemplate,
          id: crypto.randomUUID(),
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await adapter.savePersona(persona)
        logger.info(`Seeded default persona: ${persona.name}`)
      }

      logger.info('Default personas seeded successfully')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn('public/personas/ directory not found')
        await fs.mkdir(personasDir, { recursive: true })
      } else {
        throw error
      }
    }

    initialized = true
  } catch (error) {
    logger.error('Failed to initialize personas:', error)
    // Don't throw - allow app to continue even if persona initialization fails
  }
}

/**
 * Reset the initialized flag (for testing purposes)
 */
export function resetInitialization(): void {
  initialized = false
}
