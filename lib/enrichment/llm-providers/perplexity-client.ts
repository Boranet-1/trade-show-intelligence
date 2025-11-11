/**
 * Perplexity API Client Wrapper
 * Handles company enrichment queries to Perplexity AI with rate limiting and error handling
 */

import { z } from 'zod'
import type { ProviderResponse } from '@/lib/types'

const CompanyEnrichmentSchema = z.object({
  companyName: z.string(),
  domain: z.string().optional(),
  employeeCount: z.number().optional(),
  employeeRange: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+']).optional(),
  industry: z.string().optional(),
  industryCodes: z.array(z.string()).optional(),
  annualRevenue: z.number().optional(),
  revenueRange: z.enum(['<1M', '1M-10M', '10M-50M', '50M-100M', '100M-500M', '500M-1B', '1B+']).optional(),
  techStack: z.array(z.string()).optional(),
  fundingStage: z.enum(['Bootstrap', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public', 'Private Equity', 'Unknown']).optional(),
  totalFunding: z.number().optional(),
  headquarters: z.string().optional(),
  founded: z.number().optional(),
  description: z.string().optional(),
  linkedinUrl: z.string().optional(),
  twitterHandle: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export type CompanyEnrichmentResult = z.infer<typeof CompanyEnrichmentSchema>

interface RateLimitConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

interface PerplexityResponse {
  id: string
  model: string
  object: string
  created: number
  choices: Array<{
    index: number
    finish_reason: string
    message: {
      role: string
      content: string
    }
  }>
}

export class PerplexityClient {
  private apiKey: string
  private rateLimitConfig: RateLimitConfig
  private baseUrl = 'https://api.perplexity.ai'

  constructor(
    apiKey?: string,
    rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
  ) {
    const key = apiKey || process.env.PERPLEXITY_API_KEY
    if (!key) {
      throw new Error('Perplexity API key not provided. Set PERPLEXITY_API_KEY environment variable.')
    }

    this.apiKey = key
    this.rateLimitConfig = rateLimitConfig
  }

  /**
   * Enrich company data using Perplexity
   * @param companyName Company name to research
   * @param additionalContext Additional context (e.g., industry hints, location)
   * @returns Provider response with enriched company data
   */
  async enrichCompany(
    companyName: string,
    additionalContext?: string
  ): Promise<ProviderResponse> {
    const startTime = Date.now()

    try {
      const enrichedData = await this.enrichCompanyWithRetry(companyName, additionalContext)
      const responseTime = Date.now() - startTime

      return {
        provider: 'Perplexity',
        value: enrichedData,
        confidence: enrichedData.confidence,
        responseTime,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      throw new Error(`Perplexity enrichment failed after ${this.rateLimitConfig.maxRetries} retries: ${error}`)
    }
  }

  /**
   * Enrich company with exponential backoff retry logic
   */
  private async enrichCompanyWithRetry(
    companyName: string,
    additionalContext?: string,
    attempt: number = 1
  ): Promise<CompanyEnrichmentResult> {
    try {
      return await this.callPerplexityAPI(companyName, additionalContext)
    } catch (error: unknown) {
      if (attempt >= this.rateLimitConfig.maxRetries) {
        throw error
      }

      const isRateLimitError = this.isRateLimitError(error)
      if (!isRateLimitError && attempt > 1) {
        throw error
      }

      const delay = this.calculateBackoffDelay(attempt)
      await this.sleep(delay)

      return this.enrichCompanyWithRetry(companyName, additionalContext, attempt + 1)
    }
  }

  /**
   * Call Perplexity API with structured output
   */
  private async callPerplexityAPI(
    companyName: string,
    additionalContext?: string
  ): Promise<CompanyEnrichmentResult> {
    const prompt = this.buildEnrichmentPrompt(companyName, additionalContext)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a company research expert with access to real-time web data. Provide accurate, structured company information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Perplexity API error (${response.status}): ${errorText}`)
    }

    const data: PerplexityResponse = await response.json()
    const responseText = data.choices[0]?.message?.content || '{}'

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Perplexity response did not contain valid JSON')
    }

    const parsedData = JSON.parse(jsonMatch[0])

    const validated = CompanyEnrichmentSchema.parse(parsedData)
    return validated
  }

  /**
   * Build enrichment prompt for Perplexity
   */
  private buildEnrichmentPrompt(companyName: string, additionalContext?: string): string {
    return `Research the following company using real-time web data and provide structured information as JSON.

Company Name: ${companyName}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Provide your response as a JSON object with the following fields (include only fields you have high confidence in, omit uncertain fields):

{
  "companyName": "Canonical company name",
  "domain": "company.com (without https://)",
  "employeeCount": 1234,
  "employeeRange": "one of: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001+",
  "industry": "Primary industry",
  "industryCodes": ["NAICS codes if known"],
  "annualRevenue": 1234567,
  "revenueRange": "one of: <1M, 1M-10M, 10M-50M, 50M-100M, 100M-500M, 500M-1B, 1B+",
  "techStack": ["Technology 1", "Technology 2"],
  "fundingStage": "one of: Bootstrap, Seed, Series A, Series B, Series C+, Public, Private Equity, Unknown",
  "totalFunding": 1234567,
  "headquarters": "City, Country",
  "founded": 2020,
  "description": "Brief company description (max 500 chars)",
  "linkedinUrl": "https://linkedin.com/company/...",
  "twitterHandle": "@companyhandle",
  "confidence": 0.85
}

IMPORTANT:
- Use your real-time web access to find current, accurate information
- Only include fields you have reliable information for
- Ensure employeeCount and employeeRange are consistent
- Ensure annualRevenue and revenueRange are consistent
- techStack should list actual technologies/tools used (e.g., Salesforce, AWS, React)
- confidence should reflect your overall certainty in the data (0-1 scale)

Return ONLY the JSON object, no additional explanation.`
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorMessage.toLowerCase().includes('rate limit') ||
           errorMessage.toLowerCase().includes('429') ||
           errorMessage.toLowerCase().includes('quota')
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.rateLimitConfig.baseDelayMs * Math.pow(2, attempt - 1)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, this.rateLimitConfig.maxDelayMs)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Test connection to Perplexity API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
        }),
      })

      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Create a Perplexity client instance with optional API key override
 */
export function createPerplexityClient(apiKey?: string): PerplexityClient {
  return new PerplexityClient(apiKey)
}
