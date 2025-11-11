/**
 * OpenAI GPT-4 API Client Wrapper
 * Handles company enrichment queries to OpenAI GPT-4 with rate limiting and error handling
 */

import OpenAI from 'openai'
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

export class OpenAIClient {
  private client: OpenAI
  private rateLimitConfig: RateLimitConfig

  constructor(
    apiKey?: string,
    rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
  ) {
    const key = apiKey || process.env.OPENAI_API_KEY
    if (!key) {
      throw new Error('OpenAI API key not provided. Set OPENAI_API_KEY environment variable.')
    }

    this.client = new OpenAI({ apiKey: key })
    this.rateLimitConfig = rateLimitConfig
  }

  /**
   * Enrich company data using GPT-4
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
        provider: 'GPT-4',
        value: enrichedData,
        confidence: enrichedData.confidence,
        responseTime,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      throw new Error(`GPT-4 enrichment failed after ${this.rateLimitConfig.maxRetries} retries: ${error}`)
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
      return await this.callOpenAIAPI(companyName, additionalContext)
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
   * Call OpenAI API with structured output using function calling
   */
  private async callOpenAIAPI(
    companyName: string,
    additionalContext?: string
  ): Promise<CompanyEnrichmentResult> {
    const prompt = this.buildEnrichmentPrompt(companyName, additionalContext)

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a company research expert. Provide accurate, structured company data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2048,
    })

    const responseText = response.choices[0]?.message?.content || '{}'
    const parsedData = JSON.parse(responseText)

    const validated = CompanyEnrichmentSchema.parse(parsedData)
    return validated
  }

  /**
   * Build enrichment prompt for GPT-4
   */
  private buildEnrichmentPrompt(companyName: string, additionalContext?: string): string {
    return `Research the following company and provide structured data as JSON.

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
- Only include fields you have reliable information for
- Ensure employeeCount and employeeRange are consistent
- Ensure annualRevenue and revenueRange are consistent
- techStack should list actual technologies/tools used (e.g., Salesforce, AWS, React)
- confidence should reflect your overall certainty in the data (0-1 scale)

Return ONLY the JSON object.`
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
      return error.status === 429
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return errorMessage.toLowerCase().includes('rate limit')
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
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 10,
      })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Create an OpenAI client instance with optional API key override
 */
export function createOpenAIClient(apiKey?: string): OpenAIClient {
  return new OpenAIClient(apiKey)
}
