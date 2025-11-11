/**
 * Claude API Client Wrapper
 * Handles company enrichment queries to Anthropic Claude with rate limiting and error handling
 */

import Anthropic from '@anthropic-ai/sdk'
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

export class ClaudeClient {
  private client: Anthropic
  private rateLimitConfig: RateLimitConfig

  constructor(
    apiKey?: string,
    rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
  ) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error('Claude API key not provided. Set ANTHROPIC_API_KEY environment variable.')
    }

    this.client = new Anthropic({ apiKey: key })
    this.rateLimitConfig = rateLimitConfig
  }

  /**
   * Enrich company data using Claude
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
        provider: 'Claude',
        value: enrichedData,
        confidence: enrichedData.confidence,
        responseTime,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      throw new Error(`Claude enrichment failed after ${this.rateLimitConfig.maxRetries} retries: ${error}`)
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
      return await this.callClaudeAPI(companyName, additionalContext)
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
   * Call Claude API with structured output
   */
  private async callClaudeAPI(
    companyName: string,
    additionalContext?: string
  ): Promise<CompanyEnrichmentResult> {
    const prompt = this.buildEnrichmentPrompt(companyName, additionalContext)

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Claude response did not contain valid JSON')
    }

    const parsedData = JSON.parse(jsonMatch[0])

    const validated = CompanyEnrichmentSchema.parse(parsedData)
    return validated
  }

  /**
   * Build enrichment prompt for Claude
   */
  private buildEnrichmentPrompt(companyName: string, additionalContext?: string): string {
    return `You are a company research expert. Research the following company and provide structured data.

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
  "annualRevenue": 1234567 (USD),
  "revenueRange": "one of: <1M, 1M-10M, 10M-50M, 50M-100M, 100M-500M, 500M-1B, 1B+",
  "techStack": ["Technology 1", "Technology 2"],
  "fundingStage": "one of: Bootstrap, Seed, Series A, Series B, Series C+, Public, Private Equity, Unknown",
  "totalFunding": 1234567 (USD, if applicable),
  "headquarters": "City, Country",
  "founded": 2020,
  "description": "Brief company description (max 500 chars)",
  "linkedinUrl": "https://linkedin.com/company/...",
  "twitterHandle": "@companyhandle",
  "confidence": 0.85 (0-1, your confidence in this data)
}

IMPORTANT:
- Only include fields you have reliable information for
- Use null or omit fields with low confidence
- Ensure employeeCount and employeeRange are consistent
- Ensure annualRevenue and revenueRange are consistent
- techStack should list actual technologies/tools used (e.g., Salesforce, AWS, React)
- confidence should reflect your overall certainty in the data (0 = no confidence, 1 = very confident)

Return ONLY the JSON object, no additional explanation.`
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Anthropic.APIError) {
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
   * Test connection to Claude API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }],
      })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Create a Claude client instance with optional API key override
 */
export function createClaudeClient(apiKey?: string): ClaudeClient {
  return new ClaudeClient(apiKey)
}
