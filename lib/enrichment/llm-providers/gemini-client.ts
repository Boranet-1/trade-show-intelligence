/**
 * Google Gemini API Client Wrapper
 * Handles company enrichment queries to Google Gemini with rate limiting and error handling
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
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

export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private rateLimitConfig: RateLimitConfig

  constructor(
    apiKey?: string,
    rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
  ) {
    const key = apiKey || process.env.GOOGLE_AI_API_KEY
    if (!key) {
      throw new Error('Google AI API key not provided. Set GOOGLE_AI_API_KEY environment variable.')
    }

    this.genAI = new GoogleGenerativeAI(key)
    this.rateLimitConfig = rateLimitConfig
  }

  /**
   * Enrich company data using Gemini
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
        provider: 'Gemini',
        value: enrichedData,
        confidence: enrichedData.confidence,
        responseTime,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      throw new Error(`Gemini enrichment failed after ${this.rateLimitConfig.maxRetries} retries: ${error}`)
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
      return await this.callGeminiAPI(companyName, additionalContext)
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
   * Call Gemini API with structured output
   */
  private async callGeminiAPI(
    companyName: string,
    additionalContext?: string
  ): Promise<CompanyEnrichmentResult> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',  // Using Gemini 2.5 Flash for fast, high-quality company enrichment
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    })

    const prompt = this.buildEnrichmentPrompt(companyName, additionalContext)
    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Gemini response did not contain valid JSON')
    }

    const parsedData = JSON.parse(jsonMatch[0])

    const validated = CompanyEnrichmentSchema.parse(parsedData)
    return validated
  }

  /**
   * Build enrichment prompt for Gemini
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
- Use null or omit fields with low confidence
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
           errorMessage.toLowerCase().includes('quota') ||
           errorMessage.toLowerCase().includes('429')
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
   * Test connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      await model.generateContent('Test')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Create a Gemini client instance with optional API key override
 */
export function createGeminiClient(apiKey?: string): GeminiClient {
  return new GeminiClient(apiKey)
}
