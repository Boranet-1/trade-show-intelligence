/**
 * Persona Management API Routes
 *
 * GET /api/personas - List all personas
 * POST /api/personas - Create a new persona
 * PUT /api/personas - Update an existing persona
 */

import { NextRequest, NextResponse } from 'next/server'
import { initializeStorageAdapters, getActiveStorageAdapter } from '@/lib/storage/factory'
import type { Persona, APISuccessResponse, APIErrorResponse } from '@/lib/types'
import { PersonaSchema } from '@/lib/validation/schemas'
import { logger } from '@/lib/logger'

/**
 * GET /api/personas
 * List all personas (default and custom)
 */
export async function GET(): Promise<NextResponse<APISuccessResponse<Persona[]> | APIErrorResponse>> {
  try {
    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    const personas = await adapter.getAllPersonas()

    logger.info(`Retrieved ${personas.length} personas`)

    return NextResponse.json({
      success: true,
      data: personas,
    })
  } catch (error) {
    logger.error('Failed to retrieve personas:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to retrieve personas from storage',
          howToFix: 'Check storage adapter configuration and ensure the data directory is accessible',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/personas
 * Create a new persona
 */
export async function POST(request: NextRequest): Promise<NextResponse<APISuccessResponse<{ personaId: string }> | APIErrorResponse>> {
  try {
    const body = await request.json()

    // Validate persona data
    const validation = PersonaSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Persona validation failed',
            howToFix: 'Ensure all required fields are provided and weights sum to 1.0',
            exampleFormat: JSON.stringify({
              name: 'Enterprise SaaS',
              description: 'Large SaaS companies with enterprise focus',
              criteria: {
                companySizeRange: { min: 200, max: 5000 },
                industries: ['Software', 'SaaS'],
                technologies: ['Salesforce', 'AWS'],
              },
              weights: {
                companySize: 0.25,
                industry: 0.25,
                technology: 0.20,
                revenue: 0.15,
                geography: 0.05,
                decisionMaker: 0.05,
                fundingStage: 0.05,
              },
            }, null, 2),
            details: validation.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const personaData: Persona = {
      ...validation.data,
      id: crypto.randomUUID(),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Validate weights sum to 1.0 (within tolerance)
    const weights = personaData.weights
    const weightSum = Object.values(weights).reduce((sum, w) => sum + w, 0)
    if (Math.abs(weightSum - 1.0) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Persona weights do not sum to 1.0',
            howToFix: `Adjust weights to sum to 1.0 (current sum: ${weightSum.toFixed(2)})`,
            exampleFormat: 'Weights: { companySize: 0.25, industry: 0.25, technology: 0.20, revenue: 0.15, geography: 0.05, decisionMaker: 0.05, fundingStage: 0.05 }',
          },
        },
        { status: 400 }
      )
    }

    // Validate at least one criterion is defined
    const criteria = personaData.criteria
    const hasCriteria =
      (criteria.companySizeRange && (criteria.companySizeRange.min > 0 || criteria.companySizeRange.max > 0)) ||
      (criteria.industries && criteria.industries.length > 0) ||
      (criteria.technologies && criteria.technologies.length > 0) ||
      (criteria.revenueRange && (criteria.revenueRange.min > 0 || criteria.revenueRange.max > 0)) ||
      (criteria.geographies && criteria.geographies.length > 0) ||
      (criteria.decisionMakerTitles && criteria.decisionMakerTitles.length > 0) ||
      (criteria.fundingStages && criteria.fundingStages.length > 0)

    if (!hasCriteria) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Persona must have at least one criterion defined',
            howToFix: 'Add at least one criterion (company size, industries, technologies, revenue, geographies, decision maker titles, or funding stages)',
            exampleFormat: JSON.stringify({
              companySizeRange: { min: 50, max: 500 },
              industries: ['Software', 'Technology'],
            }, null, 2),
          },
        },
        { status: 400 }
      )
    }

    // Validate company size range
    if (criteria.companySizeRange && criteria.companySizeRange.min >= criteria.companySizeRange.max) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Company size range minimum must be less than maximum',
            howToFix: 'Set min < max in companySizeRange',
            exampleFormat: '{ min: 50, max: 500 }',
          },
        },
        { status: 400 }
      )
    }

    // Validate revenue range
    if (criteria.revenueRange && criteria.revenueRange.min >= criteria.revenueRange.max) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Revenue range minimum must be less than maximum',
            howToFix: 'Set min < max in revenueRange',
            exampleFormat: '{ min: 1000000, max: 50000000 }',
          },
        },
        { status: 400 }
      )
    }

    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    const personaId = await adapter.savePersona(personaData)

    logger.info(`Created new persona: ${personaId}`, { name: personaData.name })

    return NextResponse.json(
      {
        success: true,
        data: { personaId },
        message: 'Persona created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to create persona:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to create persona',
          howToFix: 'Check request body format and storage adapter configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/personas
 * Update an existing persona
 */
export async function PUT(request: NextRequest): Promise<NextResponse<APISuccessResponse<{ message: string }> | APIErrorResponse>> {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Persona ID is required for updates',
            howToFix: 'Include the persona ID in the request body',
            exampleFormat: '{ "id": "uuid-here", "name": "Updated Name", ... }',
          },
        },
        { status: 400 }
      )
    }

    await initializeStorageAdapters()
    const adapter = await getActiveStorageAdapter()

    // Check if persona exists
    const existingPersona = await adapter.getPersona(body.id)
    if (!existingPersona) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: `Persona not found: ${body.id}`,
            howToFix: 'Verify the persona ID exists by calling GET /api/personas',
          },
        },
        { status: 404 }
      )
    }

    // Prevent updating default personas
    if (existingPersona.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: {
            whatFailed: 'Cannot update default personas',
            howToFix: 'Create a new custom persona instead of modifying default ones',
          },
        },
        { status: 403 }
      )
    }

    // Validate updates if provided
    const updates: Partial<Persona> = {
      ...body,
      updatedAt: new Date(),
    }

    // Remove id from updates (should not be changed)
    delete updates.id
    delete (updates as Record<string, unknown>).createdAt

    // Validate weights if provided
    if (updates.weights) {
      const weightSum = Object.values(updates.weights).reduce((sum, w) => sum + w, 0)
      if (Math.abs(weightSum - 1.0) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: {
              whatFailed: 'Persona weights do not sum to 1.0',
              howToFix: `Adjust weights to sum to 1.0 (current sum: ${weightSum.toFixed(2)})`,
              exampleFormat: 'Weights: { companySize: 0.25, industry: 0.25, technology: 0.20, revenue: 0.15, geography: 0.05, decisionMaker: 0.05, fundingStage: 0.05 }',
            },
          },
          { status: 400 }
        )
      }
    }

    // Validate criteria if provided
    if (updates.criteria) {
      if (updates.criteria.companySizeRange &&
          updates.criteria.companySizeRange.min >= updates.criteria.companySizeRange.max) {
        return NextResponse.json(
          {
            success: false,
            error: {
              whatFailed: 'Company size range minimum must be less than maximum',
              howToFix: 'Set min < max in companySizeRange',
              exampleFormat: '{ min: 50, max: 500 }',
            },
          },
          { status: 400 }
        )
      }

      if (updates.criteria.revenueRange &&
          updates.criteria.revenueRange.min >= updates.criteria.revenueRange.max) {
        return NextResponse.json(
          {
            success: false,
            error: {
              whatFailed: 'Revenue range minimum must be less than maximum',
              howToFix: 'Set min < max in revenueRange',
              exampleFormat: '{ min: 1000000, max: 50000000 }',
            },
          },
          { status: 400 }
        )
      }
    }

    await adapter.updatePersona(body.id, updates)

    logger.info(`Updated persona: ${body.id}`, { updates })

    return NextResponse.json({
      success: true,
      data: { message: 'Persona updated successfully' },
    })
  } catch (error) {
    logger.error('Failed to update persona:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          whatFailed: 'Failed to update persona',
          howToFix: 'Check request body format and storage adapter configuration',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
