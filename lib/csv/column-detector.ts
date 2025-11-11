/**
 * Intelligent Column Detection Heuristics
 *
 * Automatically maps CSV columns to BadgeScan fields using:
 * - Exact matches
 * - Fuzzy matches (case-insensitive, with common variations)
 * - Position heuristics (common column ordering)
 */

import type { ColumnMapping, BadgeScan } from '@/lib/types'

export interface ColumnDetectionResult {
  mappings: ColumnMapping[]
  unmappedColumns: string[]
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Field mapping configuration
 */
const FIELD_MAPPINGS: Record<string, string[]> = {
  firstName: [
    'firstname',
    'first_name',
    'first name',
    'fname',
    'given name',
    'givenname',
    'forename',
  ],
  lastName: [
    'lastname',
    'last_name',
    'last name',
    'lname',
    'surname',
    'family name',
    'familyname',
  ],
  email: [
    'email',
    'e-mail',
    'e_mail',
    'email address',
    'emailaddress',
    'mail',
    'contact email',
  ],
  company: [
    'company',
    'company name',
    'companyname',
    'organization',
    'organisation',
    'org',
    'business',
    'employer',
  ],
  jobTitle: [
    'jobtitle',
    'job_title',
    'job title',
    'title',
    'position',
    'role',
    'job',
    'designation',
  ],
  phone: [
    'phone',
    'phone number',
    'phonenumber',
    'telephone',
    'tel',
    'mobile',
    'cell',
    'contact number',
  ],
  boothLocation: [
    'boothlocation',
    'booth_location',
    'booth location',
    'booth',
    'booth number',
    'boothnumber',
    'booth #',
    'stand',
    'stand number',
  ],
  scannedAt: [
    'scannedat',
    'scanned_at',
    'scanned at',
    'timestamp',
    'time',
    'date',
    'scan time',
    'scantime',
    'date scanned',
  ],
  eventName: [
    'eventname',
    'event_name',
    'event name',
    'event',
    'conference',
    'trade show',
    'tradeshow',
    'show name',
  ],
  notes: [
    'notes',
    'note',
    'comments',
    'comment',
    'remarks',
    'description',
    'memo',
  ],
}

/**
 * Common column orderings (position heuristics)
 * Used when column names are unclear
 */
const COMMON_POSITIONS: Array<{ fields: string[]; confidence: 'medium' | 'low' }> = [
  {
    // Standard order: First, Last, Email, Company, Title
    fields: ['firstName', 'lastName', 'email', 'company', 'jobTitle'],
    confidence: 'medium',
  },
  {
    // Alternate order: First, Last, Company, Title, Email
    fields: ['firstName', 'lastName', 'company', 'jobTitle', 'email'],
    confidence: 'medium',
  },
  {
    // Name-first order: First, Last, Title, Company, Email
    fields: ['firstName', 'lastName', 'jobTitle', 'company', 'email'],
    confidence: 'low',
  },
]

/**
 * Detect column mappings from CSV headers
 * @param headers - CSV column headers
 * @returns Column detection result with mappings and confidence
 */
export function detectColumnMappings(headers: string[]): ColumnDetectionResult {
  const mappings: ColumnMapping[] = []
  const unmappedColumns: string[] = []
  const mappedHeaders = new Set<string>()

  // Phase 1: Exact and fuzzy matches
  for (const header of headers) {
    const mapping = findBestMatch(header)
    if (mapping) {
      mappings.push(mapping)
      mappedHeaders.add(header)
    } else {
      unmappedColumns.push(header)
    }
  }

  // Phase 2: Position heuristics for unmapped columns
  if (unmappedColumns.length > 0 && mappings.length < 3) {
    const positionalMappings = applyPositionHeuristics(headers, mappedHeaders)
    mappings.push(...positionalMappings)

    // Update unmapped columns
    for (const mapping of positionalMappings) {
      const index = unmappedColumns.indexOf(mapping.csvColumn)
      if (index !== -1) {
        unmappedColumns.splice(index, 1)
      }
    }
  }

  // Calculate overall confidence
  const confidence = calculateConfidence(mappings, headers.length)

  return {
    mappings,
    unmappedColumns,
    confidence,
  }
}

/**
 * Find best match for a column header
 * @param header - CSV column header
 * @returns Column mapping or null
 */
function findBestMatch(header: string): ColumnMapping | null {
  const normalized = normalizeHeader(header)

  // Try exact match
  for (const [targetField, variations] of Object.entries(FIELD_MAPPINGS)) {
    for (const variation of variations) {
      if (normalized === normalizeHeader(variation)) {
        return {
          csvColumn: header,
          targetField: targetField as keyof BadgeScan,
          confidence: 'exact',
        }
      }
    }
  }

  // Try fuzzy match (partial match or contains)
  for (const [targetField, variations] of Object.entries(FIELD_MAPPINGS)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeHeader(variation)

      // Check if header contains variation or vice versa
      if (
        normalized.includes(normalizedVariation) ||
        normalizedVariation.includes(normalized)
      ) {
        return {
          csvColumn: header,
          targetField: targetField as keyof BadgeScan,
          confidence: 'fuzzy',
        }
      }
    }
  }

  return null
}

/**
 * Apply position-based heuristics for unmapped columns
 * @param headers - All CSV headers
 * @param mappedHeaders - Headers already mapped
 * @returns Additional mappings based on position
 */
function applyPositionHeuristics(
  headers: string[],
  mappedHeaders: Set<string>
): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  const unmappedHeaders = headers.filter((h) => !mappedHeaders.has(h))

  if (unmappedHeaders.length === 0) {
    return mappings
  }

  // Try each common position pattern
  for (const pattern of COMMON_POSITIONS) {
    if (unmappedHeaders.length >= pattern.fields.length) {
      // Map first N unmapped columns to pattern fields
      for (let i = 0; i < pattern.fields.length && i < unmappedHeaders.length; i++) {
        const header = unmappedHeaders[i]
        const targetField = pattern.fields[i]

        // Only add if this field hasn't been mapped yet
        const alreadyMapped = Array.from(mappedHeaders).some((h) => {
          const existing = findBestMatch(h)
          return existing?.targetField === targetField
        })

        if (!alreadyMapped) {
          mappings.push({
            csvColumn: header,
            targetField: targetField as keyof BadgeScan,
            confidence: 'position',
          })
        }
      }

      // Use first pattern that applies
      if (mappings.length > 0) {
        break
      }
    }
  }

  return mappings
}

/**
 * Normalize header for comparison
 * @param header - Header string
 * @returns Normalized header
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .trim()
}

/**
 * Calculate overall confidence based on mappings
 * @param mappings - Detected mappings
 * @param totalHeaders - Total number of headers
 * @returns Confidence level
 */
function calculateConfidence(
  mappings: ColumnMapping[],
  totalHeaders: number
): 'high' | 'medium' | 'low' {
  if (mappings.length === 0) {
    return 'low'
  }

  const exactMatches = mappings.filter((m) => m.confidence === 'exact').length
  const fuzzyMatches = mappings.filter((m) => m.confidence === 'fuzzy').length
  const positionMatches = mappings.filter((m) => m.confidence === 'position').length

  // High confidence: mostly exact matches, mapped >= 50% of required fields
  const requiredFieldsMapped = ['company', 'email', 'firstName', 'lastName'].filter((field) =>
    mappings.some((m) => m.targetField === field)
  ).length

  if (exactMatches >= 3 && requiredFieldsMapped >= 2) {
    return 'high'
  }

  // Medium confidence: some exact/fuzzy matches, at least company or email mapped
  const hasCompanyOrEmail = mappings.some(
    (m) => m.targetField === 'company' || m.targetField === 'email'
  )

  if ((exactMatches + fuzzyMatches >= 2) && hasCompanyOrEmail) {
    return 'medium'
  }

  // Low confidence: mostly position-based or few mappings
  return 'low'
}

/**
 * Validate column mappings
 * Ensures required fields are mapped
 * @param mappings - Column mappings to validate
 * @returns Validation result with errors
 */
export function validateColumnMappings(mappings: ColumnMapping[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const mappedFields = new Set(mappings.map((m) => m.targetField))

  // Check for company field (required)
  if (!mappedFields.has('company')) {
    errors.push('Company field is required but not mapped')
  }

  // Check for contact information (at least one of: firstName, lastName, email)
  const hasContact =
    mappedFields.has('firstName') ||
    mappedFields.has('lastName') ||
    mappedFields.has('email')

  if (!hasContact) {
    errors.push('At least one contact field (firstName, lastName, or email) must be mapped')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get suggested mappings for user review
 * @param headers - CSV headers
 * @returns Suggested mappings with explanations
 */
export function getSuggestedMappings(headers: string[]): Array<{
  csvColumn: string
  suggestedField: string
  confidence: string
  reason: string
}> {
  const detection = detectColumnMappings(headers)

  return detection.mappings.map((mapping) => {
    let reason = ''
    switch (mapping.confidence) {
      case 'exact':
        reason = `Exact match for "${mapping.targetField}" field`
        break
      case 'fuzzy':
        reason = `Similar to "${mapping.targetField}" field`
        break
      case 'position':
        reason = `Positioned like "${mapping.targetField}" field in typical CSV files`
        break
    }

    return {
      csvColumn: mapping.csvColumn,
      suggestedField: mapping.targetField,
      confidence: mapping.confidence,
      reason,
    }
  })
}

/**
 * Apply custom mappings from user
 * @param headers - CSV headers
 * @param customMappings - User-provided mappings
 * @returns Final column mappings
 */
export function applyCustomMappings(
  headers: string[],
  customMappings: Record<string, string>
): ColumnMapping[] {
  const mappings: ColumnMapping[] = []

  for (const header of headers) {
    const targetField = customMappings[header]
    if (targetField && targetField !== 'customField') {
      mappings.push({
        csvColumn: header,
        targetField: targetField as keyof BadgeScan,
        confidence: 'exact', // User-confirmed mapping
      })
    } else if (targetField === 'customField') {
      mappings.push({
        csvColumn: header,
        targetField: 'customField',
        confidence: 'exact',
      })
    }
  }

  return mappings
}
