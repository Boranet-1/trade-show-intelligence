/**
 * Multi-LLM Consensus Algorithm
 * Implements Constitution I: Multi-LLM Verification for zero hallucination tolerance
 *
 * Algorithm:
 * 1. Query all providers in parallel (3 LLMs + MCP source as 4th required provider)
 * 2. For each field, calculate consensus across responses
 * 3. Require 75% agreement for high confidence (3/4 providers must agree)
 * 4. Handle ties with tiebreaker logic (MCP data weighted higher at 95% confidence)
 * 5. Mark low-consensus fields for manual review
 *
 * Provider Architecture (post-Perplexity removal):
 * - Claude, GPT-4, Gemini (3 LLM providers with 70-85% confidence)
 * - MCP (Tavily+Apify) provides real-time verified data as 4th required provider
 * - MCP responses have 95% confidence (highest weight in tiebreaker scenarios)
 * - Consensus threshold remains 0.75, meaning 3/4 providers must agree
 */

import type { ProviderResponse, ConsensusMetadata, EnrichedCompany } from '@/lib/types'
import type { CompanyEnrichmentResult } from './llm-providers/claude-client'

interface ConsensusConfig {
  minAgreementThreshold: number // 0.75 = 3/4 providers must agree
  tiebreaker: 'first' | 'most_confident' | 'manual_review'
}

const DEFAULT_CONSENSUS_CONFIG: ConsensusConfig = {
  minAgreementThreshold: 0.75, // 75% agreement: 3/4 providers (3 LLMs + MCP)
  tiebreaker: 'most_confident', // Favors MCP data (95% confidence) in ties
}

interface FieldConsensus {
  consensusValue: unknown
  agreementLevel: number
  confidence: 'High' | 'Medium' | 'Low'
  needsManualReview: boolean
  providerResponses: ProviderResponse[]
}

/**
 * Calculate consensus across multiple provider responses
 * @param responses Array of provider responses (should be 4: Claude, GPT-4, Gemini, and MCP)
 * @param config Consensus configuration
 * @returns Consensus metadata for each field
 */
export function calculateConsensus(
  responses: ProviderResponse[],
  config: ConsensusConfig = DEFAULT_CONSENSUS_CONFIG
): Record<string, ConsensusMetadata> {
  if (responses.length === 0) {
    throw new Error('Cannot calculate consensus with no provider responses')
  }

  const enrichmentData = responses.map(r => r.value as CompanyEnrichmentResult)

  const allFields = getAllFields(enrichmentData)

  const consensusMetadata: Record<string, ConsensusMetadata> = {}

  for (const fieldName of allFields) {
    const fieldConsensus = calculateFieldConsensus(fieldName, responses, config)

    consensusMetadata[fieldName] = {
      fieldName,
      consensusValue: fieldConsensus.consensusValue,
      providerResponses: fieldConsensus.providerResponses,
      agreementLevel: fieldConsensus.agreementLevel,
      confidence: fieldConsensus.confidence,
      needsManualReview: fieldConsensus.needsManualReview,
    }
  }

  return consensusMetadata
}

/**
 * Calculate consensus for a single field across all provider responses
 */
function calculateFieldConsensus(
  fieldName: string,
  responses: ProviderResponse[],
  config: ConsensusConfig
): FieldConsensus {
  const providerResponses: ProviderResponse[] = responses.map(response => ({
    provider: response.provider,
    value: getFieldValue(response.value as CompanyEnrichmentResult, fieldName),
    confidence: response.confidence,
    responseTime: response.responseTime,
  }))

  const nonNullResponses = providerResponses.filter(r => r.value !== null && r.value !== undefined)

  if (nonNullResponses.length === 0) {
    return {
      consensusValue: null,
      agreementLevel: 0,
      confidence: 'Low',
      needsManualReview: false,
      providerResponses,
    }
  }

  const valueCounts = countValues(nonNullResponses)
  const totalResponses = nonNullResponses.length
  const topValueEntry = getTopValue(valueCounts)

  const agreementLevel = topValueEntry.count / totalResponses
  const meetsThreshold = agreementLevel >= config.minAgreementThreshold

  if (meetsThreshold) {
    return {
      consensusValue: topValueEntry.value,
      agreementLevel: agreementLevel * 100,
      confidence: getConfidenceLevel(agreementLevel),
      needsManualReview: false,
      providerResponses,
    }
  }

  if (valueCounts.length === 1) {
    return {
      consensusValue: topValueEntry.value,
      agreementLevel: agreementLevel * 100,
      confidence: getConfidenceLevel(agreementLevel),
      needsManualReview: agreementLevel < 0.5,
      providerResponses,
    }
  }

  const consensusValue = resolveTie(valueCounts, providerResponses, config)

  return {
    consensusValue,
    agreementLevel: agreementLevel * 100,
    confidence: 'Medium',
    needsManualReview: true,
    providerResponses,
  }
}

/**
 * Get all unique field names across all provider responses
 */
function getAllFields(enrichmentData: CompanyEnrichmentResult[]): string[] {
  const fieldSet = new Set<string>()

  for (const data of enrichmentData) {
    for (const field of Object.keys(data)) {
      if (field !== 'confidence') {
        fieldSet.add(field)
      }
    }
  }

  return Array.from(fieldSet)
}

/**
 * Get field value from enrichment result (with special handling for arrays)
 */
function getFieldValue(data: CompanyEnrichmentResult, fieldName: string): unknown {
  const value = data[fieldName as keyof CompanyEnrichmentResult]

  if (value === undefined || value === null) {
    return null
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value : null
  }

  return value
}

/**
 * Count occurrences of each value (with normalization for strings and arrays)
 */
function countValues(responses: ProviderResponse[]): Array<{ value: unknown; count: number }> {
  const valueMap = new Map<string, { value: unknown; count: number }>()

  for (const response of responses) {
    const normalizedKey = normalizeValue(response.value)

    if (valueMap.has(normalizedKey)) {
      valueMap.get(normalizedKey)!.count++
    } else {
      valueMap.set(normalizedKey, { value: response.value, count: 1 })
    }
  }

  return Array.from(valueMap.values()).sort((a, b) => b.count - a.count)
}

/**
 * Normalize values for comparison (handle case sensitivity, array ordering)
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (typeof value === 'string') {
    return value.toLowerCase().trim()
  }

  if (Array.isArray(value)) {
    const sortedArray = [...value].sort()
    return JSON.stringify(sortedArray).toLowerCase()
  }

  if (typeof value === 'number') {
    const numValue = value as number
    if (Number.isInteger(numValue)) {
      return numValue.toString()
    }
    return numValue.toFixed(2)
  }

  if (typeof value === 'object') {
    return JSON.stringify(value).toLowerCase()
  }

  return String(value).toLowerCase()
}

/**
 * Get the value with the most votes
 */
function getTopValue(valueCounts: Array<{ value: unknown; count: number }>): { value: unknown; count: number } {
  if (valueCounts.length === 0) {
    return { value: null, count: 0 }
  }

  return valueCounts[0]
}

/**
 * Resolve ties between competing values
 */
function resolveTie(
  valueCounts: Array<{ value: unknown; count: number }>,
  providerResponses: ProviderResponse[],
  config: ConsensusConfig
): unknown {
  const topTwoValues = valueCounts.slice(0, 2)

  if (topTwoValues[0].count === topTwoValues[1].count) {
    switch (config.tiebreaker) {
      case 'most_confident':
        return selectMostConfidentValue(topTwoValues, providerResponses)

      case 'first':
        return topTwoValues[0].value

      case 'manual_review':
      default:
        return null
    }
  }

  return topTwoValues[0].value
}

/**
 * Select value with highest provider confidence score
 */
function selectMostConfidentValue(
  topValues: Array<{ value: unknown; count: number }>,
  providerResponses: ProviderResponse[]
): unknown {
  let maxConfidence = 0
  let selectedValue = topValues[0].value

  for (const valueEntry of topValues) {
    const matchingResponses = providerResponses.filter(
      r => normalizeValue(r.value) === normalizeValue(valueEntry.value)
    )

    const avgConfidence = matchingResponses.reduce((sum, r) => sum + (r.confidence || 0), 0) / matchingResponses.length

    if (avgConfidence > maxConfidence) {
      maxConfidence = avgConfidence
      selectedValue = valueEntry.value
    }
  }

  return selectedValue
}

/**
 * Determine confidence level based on agreement percentage
 */
function getConfidenceLevel(agreementLevel: number): 'High' | 'Medium' | 'Low' {
  if (agreementLevel >= 0.75) {
    return 'High' // 3/4 providers agree (meets threshold)
  } else if (agreementLevel >= 0.5) {
    return 'Medium' // 2/4 providers agree (tie scenario)
  } else {
    return 'Low' // Less than half agree
  }
}

/**
 * Build EnrichedCompany from consensus metadata
 * @param badgeScanId Badge scan ID this enrichment belongs to
 * @param consensusMetadata Calculated consensus metadata
 * @param allProviderResponses All provider responses for logging
 * @returns Enriched company object with consensus values
 */
export function buildEnrichedCompanyFromConsensus(
  badgeScanId: string,
  consensusMetadata: Record<string, ConsensusMetadata>,
  allProviderResponses: ProviderResponse[]
): Partial<EnrichedCompany> {
  const enrichedCompany: Partial<EnrichedCompany> = {
    badgeScanId,
    consensusMetadata,
    enrichedAt: new Date(),
    dataSource: allProviderResponses.map(r => r.provider),
  }

  for (const [fieldName, metadata] of Object.entries(consensusMetadata)) {
    if (metadata.consensusValue !== null && metadata.consensusValue !== undefined) {
      ;(enrichedCompany as Record<string, unknown>)[fieldName] = metadata.consensusValue
    }
  }

  return enrichedCompany
}

/**
 * Check if consensus data has sufficient coverage for scoring
 * @param consensusMetadata Consensus metadata
 * @returns True if >= 30% of weighted criteria have data (per FR-004)
 */
export function hasSufficientDataCoverage(
  consensusMetadata: Record<string, ConsensusMetadata>
): boolean {
  const criticalFields = [
    'companyName',
    'employeeCount',
    'employeeRange',
    'industry',
    'annualRevenue',
    'revenueRange',
    'techStack',
  ]

  const fieldsWithData = criticalFields.filter(field => {
    const metadata = consensusMetadata[field]
    return metadata && metadata.consensusValue !== null && metadata.consensusValue !== undefined
  })

  const coveragePercentage = fieldsWithData.length / criticalFields.length

  return coveragePercentage >= 0.3 // 30% minimum per FR-004 Unscored tier rule
}

/**
 * Get fields that need manual review
 * @param consensusMetadata Consensus metadata
 * @returns Array of field names that need manual review
 */
export function getFieldsNeedingReview(
  consensusMetadata: Record<string, ConsensusMetadata>
): string[] {
  return Object.values(consensusMetadata)
    .filter(metadata => metadata.needsManualReview)
    .map(metadata => metadata.fieldName)
}

/**
 * Calculate overall enrichment confidence score
 * @param consensusMetadata Consensus metadata
 * @returns Confidence score 0-1
 */
export function calculateOverallConfidence(
  consensusMetadata: Record<string, ConsensusMetadata>
): number {
  const metadataArray = Object.values(consensusMetadata).filter(
    m => m.consensusValue !== null && m.consensusValue !== undefined
  )

  if (metadataArray.length === 0) {
    return 0
  }

  const confidenceMap: Record<string, number> = {
    High: 1.0,
    Medium: 0.6,
    Low: 0.3,
  }

  const totalConfidence = metadataArray.reduce((sum, metadata) => {
    return sum + confidenceMap[metadata.confidence]
  }, 0)

  return totalConfidence / metadataArray.length
}
