/**
 * Enrichment Agent
 *
 * Provides both mock and real company enrichment
 * Toggle via ENABLE_MOCK_ENRICHMENT environment variable
 */

import { LeadTier } from '@/lib/types'
import { getConfig } from '@/lib/config'
import {
  enrichCompanyWithLLM,
  enrichCompaniesBatch as enrichBatchWithLLM,
  type BadgeScanInput,
} from '@/lib/llm/enrichment'
import type { EnrichedCompanyData as RealEnrichedData } from '@/lib/llm/enrichment'

export interface EnrichedCompanyData {
  name: string
  domain: string
  tier: LeadTier
  size: 'Small' | 'Medium' | 'Large' | 'Enterprise'
  industry: string
  description?: string
  employeeCount?: string
  revenue?: string
  headquarters?: string
  technologies?: string[]
  businessModel?: string
  keyProducts?: string[]
  targetMarket?: string
  fundingStage?: string
  enrichmentSource?: 'multi-llm' | 'single-llm' | 'mock'
  providersUsed?: string[]
  confidence?: number
}

// Mock industries for testing
const MOCK_INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Consulting',
  'Real Estate',
  'Media',
  'Telecommunications',
]

// Mock company sizes
const COMPANY_SIZES = ['Small', 'Medium', 'Large', 'Enterprise'] as const

/**
 * Mock enrichment function
 * Generates random but realistic company data for testing
 *
 * @param companyName - Name of the company to enrich
 * @returns Enriched company data with mock values
 */
function enrichCompanyMock(companyName: string): EnrichedCompanyData {
  // Generate a mock domain from company name
  const domain = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20) + '.com'

  // Generate random tier (1-4)
  const tierValue = Math.floor(Math.random() * 4) + 1
  let tier: LeadTier

  switch (tierValue) {
    case 1:
      tier = LeadTier.Hot
      break
    case 2:
      tier = LeadTier.Warm
      break
    case 3:
      tier = LeadTier.Cold
      break
    default:
      tier = LeadTier.Unscored
  }

  // Generate random company size
  const size = COMPANY_SIZES[Math.floor(Math.random() * COMPANY_SIZES.length)]

  // Generate random industry
  const industry = MOCK_INDUSTRIES[Math.floor(Math.random() * MOCK_INDUSTRIES.length)]

  return {
    name: companyName,
    domain,
    tier,
    size,
    industry,
  }
}

/**
 * Mock enrichment with delay to simulate API call
 *
 * @param companyName - Name of the company to enrich
 * @returns Promise resolving to enriched company data
 */
export async function enrichCompanyAsync(companyName: string): Promise<EnrichedCompanyData> {
  // Simulate API delay (100-500ms)
  const delay = Math.random() * 400 + 100
  await new Promise((resolve) => setTimeout(resolve, delay))

  return enrichCompanyMock(companyName)
}

/**
 * Batch enrichment for multiple companies (mock)
 *
 * @param companyNames - Array of company names to enrich
 * @returns Promise resolving to array of enriched company data
 */
export async function enrichCompaniesBatchMock(
  companyNames: string[]
): Promise<EnrichedCompanyData[]> {
  // Process in batches of 10 to simulate rate limiting
  const batchSize = 10
  const results: EnrichedCompanyData[] = []

  for (let i = 0; i < companyNames.length; i += batchSize) {
    const batch = companyNames.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map((name) => enrichCompanyAsync(name)))
    results.push(...batchResults)
  }

  return results
}

/**
 * Main enrichment function (routes to mock or real based on config)
 *
 * @param input - Badge scan data to enrich
 * @returns Promise resolving to enriched company data
 */
export async function enrichCompany(input: BadgeScanInput): Promise<EnrichedCompanyData> {
  const config = getConfig()

  if (config.ENABLE_MOCK_ENRICHMENT) {
    console.log('[Enrichment] Using MOCK enrichment (ENABLE_MOCK_ENRICHMENT=true)')
    return enrichCompanyAsync(input.company)
  }

  console.log('[Enrichment] Using REAL LLM enrichment (ENABLE_MOCK_ENRICHMENT=false)')
  return enrichCompanyWithLLM(input)
}

/**
 * Batch enrichment (routes to mock or real based on config)
 *
 * @param inputs - Array of badge scan inputs to enrich
 * @returns Promise resolving to array of enriched company data
 */
export async function enrichCompaniesBatch(
  inputs: BadgeScanInput[]
): Promise<EnrichedCompanyData[]> {
  const config = getConfig()

  if (config.ENABLE_MOCK_ENRICHMENT) {
    console.log('[Enrichment] Using MOCK batch enrichment')
    return enrichCompaniesBatchMock(inputs.map((i) => i.company))
  }

  console.log('[Enrichment] Using REAL LLM batch enrichment')
  return enrichBatchWithLLM(inputs)
}
