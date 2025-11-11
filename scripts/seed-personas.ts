/**
 * Persona Seeding Script
 *
 * Loads default persona templates from public/personas/*.json into the active storage adapter
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { initializeStorageAdapters, getActiveStorageAdapter } from '../lib/storage/factory'
import type { Persona } from '../lib/types'

async function seedPersonas() {
  try {
    console.log('Initializing storage adapters...')
    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    console.log('Checking existing personas...')
    const existingPersonas = await adapter.getAllPersonas()

    if (existingPersonas.length > 0) {
      console.log(`Found ${existingPersonas.length} existing personas. Skipping seed.`)
      return
    }

    console.log('Loading persona templates...')
    const personasDir = path.join(process.cwd(), 'public', 'personas')

    try {
      const files = await fs.readdir(personasDir)
      const jsonFiles = files.filter((file) => file.endsWith('.json'))

      if (jsonFiles.length === 0) {
        console.log('No persona templates found in public/personas/')
        return
      }

      console.log(`Found ${jsonFiles.length} persona template(s)`)

      for (const file of jsonFiles) {
        const filePath = path.join(personasDir, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const personaTemplate = JSON.parse(content)

        // Create persona with required fields
        const persona: Persona = {
          ...personaTemplate,
          id: crypto.randomUUID(),
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await adapter.savePersona(persona)
        console.log(`Seeded persona: ${persona.name} (from ${file})`)
      }

      console.log('Persona seeding completed successfully')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('public/personas/ directory not found. Creating it...')
        await fs.mkdir(personasDir, { recursive: true })
        console.log('Directory created. Add persona template JSON files to seed them.')
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('Failed to seed personas:', error)
    process.exit(1)
  }
}

seedPersonas()
