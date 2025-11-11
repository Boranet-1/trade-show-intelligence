/**
 * Real LLM-based Company Enrichment
 *
 * Uses multi-LLM consensus to enrich company data
 * Queries multiple providers and aggregates results for accuracy
 */

import { createLLMClients, executeWithRetry, type LLMResponse } from './clients'
import type { LeadTier } from '@/lib/types'
import { getConfig } from '@/lib/config'

export interface BadgeScanInput {
  name: string
  email?: string
  company: string
  title?: string
}

export interface EnrichedCompanyData {
  name: string
  domain: string
  description?: string
  industry: string
  size: 'Small' | 'Medium' | 'Large' | 'Enterprise'
  employeeCount?: string
  revenue?: string
  headquarters?: string
  technologies?: string[]
  businessModel?: string
  keyProducts?: string[]
  targetMarket?: string
  fundingStage?: string
  tier: LeadTier
  enrichmentSource: 'multi-llm' | 'single-llm' | 'mock'
  providersUsed: string[]
  confidence: number
}

interface LLMEnrichmentResult {
  domain: string
  industry: string
  size: 'Small' | 'Medium' | 'Large' | 'Enterprise'
  description?: string
  employeeCount?: string
  revenue?: string
  headquarters?: string
  technologies?: string[]
  businessModel?: string
  keyProducts?: string[]
  targetMarket?: string
  fundingStage?: string
}

/**
 * Build enrichment prompt for LLMs
 */
function buildEnrichmentPrompt(company: string, contactEmail?: string): string {
  const emailDomain = contactEmail ? extractDomain(contactEmail) : null

  return `You are a business intelligence analyst. Research and provide comprehensive information about the following company.

Company Name: ${company}
${emailDomain ? `Email Domain: ${emailDomain}` : ''}

Provide a JSON response with the following structure (all fields are required):

{
  "domain": "company website domain (e.g., example.com)",
  "industry": "primary industry or sector",
  "size": "Small|Medium|Large|Enterprise",
  "description": "brief 2-3 sentence company description",
  "employeeCount": "estimated employee range (e.g., 50-200, 1000+)",
  "revenue": "estimated annual revenue range if public knowledge",
  "headquarters": "city, country",
  "technologies": ["key technologies used, max 5"],
  "businessModel": "B2B, B2C, B2B2C, etc.",
  "keyProducts": ["main products or services, max 3"],
  "targetMarket": "primary customer segment",
  "fundingStage": "Bootstrapped, Series A/B/C, Public, etc."
}

Important:
- Provide factual, publicly available information only
- If information is uncertain, use reasonable estimates based on company type
- For the "size" field, use this guide:
  * Small: 1-50 employees
  * Medium: 51-500 employees
  * Large: 501-5000 employees
  * Enterprise: 5000+ employees
- Return ONLY the JSON object, no additional text`
}

/**
 * System prompt for LLM enrichment
 */
const SYSTEM_PROMPT = `You are a business intelligence expert specializing in company research.
Provide accurate, factual information about companies based on publicly available data.
Always respond with valid JSON only, no markdown code blocks or additional text.`

/**
 * Extract domain from email
 */
function extractDomain(email: string): string | null {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : null
}

/**
 * Parse LLM response to structured data
 */
function parseLLMResponse(response: string): LLMEnrichmentResult | null {
  try {
    // Remove markdown code blocks if present
    let cleaned = response.trim()
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '')

    const parsed = JSON.parse(cleaned)

    // Validate required fields
    if (!parsed.domain || !parsed.industry || !parsed.size) {
      console.warn('LLM response missing required fields:', parsed)
      return null
    }

    // Normalize size field
    const validSizes = ['Small', 'Medium', 'Large', 'Enterprise']
    if (!validSizes.includes(parsed.size)) {
      console.warn('Invalid size value:', parsed.size)
      return null
    }

    return parsed as LLMEnrichmentResult
  } catch (error) {
    console.error('Failed to parse LLM response:', error)
    console.error('Response was:', response.substring(0, 500))
    return null
  }
}

/**
 * Calculate consensus from multiple LLM responses
 */
function calculateConsensus(results: LLMEnrichmentResult[]): LLMEnrichmentResult {
  if (results.length === 0) {
    throw new Error('No valid results to calculate consensus from')
  }

  if (results.length === 1) {
    return results[0]
  }

  // For consensus, we'll use the most common values across providers
  const consensus: LLMEnrichmentResult = {
    domain: getMostCommon(results.map((r) => r.domain)),
    industry: getMostCommon(results.map((r) => r.industry)),
    size: getMostCommon(results.map((r) => r.size)) as any,
    description: results.find((r) => r.description)?.description,
    employeeCount: getMostCommon(results.map((r) => r.employeeCount).filter(Boolean)),
    revenue: results.find((r) => r.revenue)?.revenue,
    headquarters: getMostCommon(results.map((r) => r.headquarters).filter(Boolean)),
    technologies: mergeLists(results.map((r) => r.technologies || [])),
    businessModel: getMostCommon(results.map((r) => r.businessModel).filter(Boolean)),
    keyProducts: mergeLists(results.map((r) => r.keyProducts || [])),
    targetMarket: getMostCommon(results.map((r) => r.targetMarket).filter(Boolean)),
    fundingStage: getMostCommon(results.map((r) => r.fundingStage).filter(Boolean)),
  }

  return consensus
}

/**
 * Get most common value from array
 */
function getMostCommon<T>(values: (T | undefined)[]): T {
  const filtered = values.filter((v): v is T => v !== undefined && v !== null && v !== '')

  if (filtered.length === 0) {
    return '' as T
  }

  const counts = new Map<T, number>()

  for (const value of filtered) {
    counts.set(value, (counts.get(value) || 0) + 1)
  }

  let maxCount = 0
  let mostCommon = filtered[0]

  for (const [value, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = value
    }
  }

  return mostCommon
}

/**
 * Merge lists from multiple sources (take unique values, max 5)
 */
function mergeLists(lists: string[][]): string[] {
  const merged = new Set<string>()

  for (const list of lists) {
    for (const item of list) {
      if (item && item.trim()) {
        merged.add(item.trim())
      }
    }
  }

  return Array.from(merged).slice(0, 5)
}

/**
 * Calculate lead tier based on company data
 * This is a simplified scoring - in production, this would match against personas
 */
function calculateLeadTier(data: LLMEnrichmentResult): LeadTier {
  let score = 0

  // Size scoring
  if (data.size === 'Enterprise') score += 40
  else if (data.size === 'Large') score += 30
  else if (data.size === 'Medium') score += 20
  else score += 10

  // Industry scoring (prefer tech and B2B)
  const techKeywords = ['technology', 'software', 'saas', 'cloud', 'ai', 'data']
  const industryLower = data.industry.toLowerCase()
  if (techKeywords.some((kw) => industryLower.includes(kw))) {
    score += 30
  }

  // Business model scoring
  if (data.businessModel?.includes('B2B')) {
    score += 20
  }

  // Funding stage scoring
  if (data.fundingStage?.includes('Series') || data.fundingStage?.includes('Public')) {
    score += 10
  }

  // Map score to tier
  if (score >= 70) return 'Hot'
  if (score >= 40) return 'Warm'
  return 'Cold'
}

/**
 * Enrich company using real LLM APIs
 */
export async function enrichCompanyWithLLM(
  input: BadgeScanInput
): Promise<EnrichedCompanyData> {
  const config = getConfig()
  const clients = createLLMClients()
  const availableClients = Object.entries(clients).filter(([_, client]) => client !== undefined)

  if (availableClients.length === 0) {
    throw new Error('No LLM API keys configured. Cannot perform enrichment.')
  }

  const prompt = buildEnrichmentPrompt(input.company, input.email)
  const llmResults: LLMEnrichmentResult[] = []
  const providersUsed: string[] = []
  const errors: string[] = []

  // Query all available LLM providers
  for (const [providerName, client] of availableClients) {
    try {
      console.log(`[Enrichment] Querying ${providerName} for ${input.company}`)

      const response = await executeWithRetry(async () => {
        return await (client as any).complete(prompt, SYSTEM_PROMPT)
      }, 3)

      const parsed = parseLLMResponse(response.content)

      if (parsed) {
        llmResults.push(parsed)
        providersUsed.push(providerName)
        console.log(`[Enrichment] ✓ ${providerName} responded successfully`)
      } else {
        errors.push(`${providerName}: Failed to parse response`)
        console.warn(`[Enrichment] ✗ ${providerName} returned invalid data`)
      }
    } catch (error: any) {
      errors.push(`${providerName}: ${error.message}`)
      console.error(`[Enrichment] ✗ ${providerName} error:`, error.message)
    }
  }

  // If no providers succeeded, throw error
  if (llmResults.length === 0) {
    throw new Error(
      `All LLM providers failed for ${input.company}:\n${errors.join('\n')}`
    )
  }

  // Calculate consensus from all successful results
  const consensus = calculateConsensus(llmResults)
  const tier = calculateLeadTier(consensus)

  // Calculate confidence based on provider agreement
  const confidence = Math.round((llmResults.length / availableClients.length) * 100)

  return {
    name: input.company,
    domain: consensus.domain,
    description: consensus.description,
    industry: consensus.industry,
    size: consensus.size,
    employeeCount: consensus.employeeCount,
    revenue: consensus.revenue,
    headquarters: consensus.headquarters,
    technologies: consensus.technologies,
    businessModel: consensus.businessModel,
    keyProducts: consensus.keyProducts,
    targetMarket: consensus.targetMarket,
    fundingStage: consensus.fundingStage,
    tier,
    enrichmentSource: llmResults.length > 1 ? 'multi-llm' : 'single-llm',
    providersUsed,
    confidence,
  }
}

/**
 * Batch enrichment for multiple companies
 */
export async function enrichCompaniesBatch(
  inputs: BadgeScanInput[],
  concurrency = 3
): Promise<EnrichedCompanyData[]> {
  const results: EnrichedCompanyData[] = []

  // Process in batches to avoid rate limits
  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map((input) => enrichCompanyWithLLM(input))
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error('[Enrichment] Batch item failed:', result.reason)
        // Could push a fallback/error result here
      }
    }

    // Small delay between batches
    if (i + concurrency < inputs.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}
