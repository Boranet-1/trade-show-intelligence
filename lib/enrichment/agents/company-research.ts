/**
 * Company Research Sub-Agent
 * Specialized agent for enriching company data (size, industry, revenue, tech stack)
 * Part of the hub-and-spoke architecture (Constitution VI)
 */

import type { BadgeScan, EnrichedCompany, ProviderResponse } from '@/lib/types'
import { ClaudeClient } from '../llm-providers/claude-client'
import { OpenAIClient } from '../llm-providers/openai-client'
import { GeminiClient } from '../llm-providers/gemini-client'
import { calculateConsensus, buildEnrichedCompanyFromConsensus } from '../consensus'
import { getMCPService } from '../mcp-clients'

export interface CompanyResearchResult {
  enrichedCompany: Partial<EnrichedCompany>
  providerResponses: ProviderResponse[]
  fieldsNeedingReview: string[]
  overallConfidence: number
}

export class CompanyResearchAgent {
  private claudeClient: ClaudeClient
  private openaiClient: OpenAIClient
  private geminiClient: GeminiClient

  constructor(
    claudeKey?: string,
    openaiKey?: string,
    geminiKey?: string
  ) {
    this.claudeClient = new ClaudeClient(claudeKey)
    this.openaiClient = new OpenAIClient(openaiKey)
    this.geminiClient = new GeminiClient(geminiKey)
  }

  /**
   * Research company and enrich data using multi-LLM consensus
   * @param badgeScan Badge scan with company name and context
   * @returns Enriched company data with consensus metadata
   */
  async researchCompany(badgeScan: BadgeScan): Promise<CompanyResearchResult> {
    const companyName = badgeScan.company
    let additionalContext = this.buildContext(badgeScan)
    let mcpData: Partial<EnrichedCompany> | null = null

    // 🔍 NEW: Fetch real-time web data via Tavily + Apify MCP
    try {
      const mcpService = getMCPService()
      mcpData = await mcpService.enrichWithAllMCPSources(companyName)

      if (mcpData && Object.keys(mcpData).length > 0) {
        const webContext = this.buildWebDataContext(mcpData)
        additionalContext = additionalContext
          ? `${additionalContext}. Real-time web data: ${webContext}`
          : `Real-time web data: ${webContext}`

        const sources = mcpData.enrichmentSource || 'tavily'
        console.log(`✅ Enhanced context with ${sources} for ${companyName}`)
      }
    } catch (error) {
      // Graceful degradation per Constitution VII
      console.warn(`⚠️ MCP enrichment failed for ${companyName}, continuing with LLM-only enrichment:`, error)
    }

    const providerResponses = await this.queryAllProviders(companyName, additionalContext)

    // 🆕 Add MCP data as a 5th "provider" response with higher confidence weighting
    if (mcpData && Object.keys(mcpData).length > 0) {
      const mcpProviderResponse: ProviderResponse = {
        provider: 'MCP (Tavily+Apify)',
        value: {
          companyName: mcpData.companyName || companyName,
          industry: mcpData.industry || null,
          companySize: null,
          employeeCount: mcpData.employeeCount || null,
          annualRevenue: mcpData.annualRevenue || null,
          headquarters: null,
          foundedYear: null,
          techStack: [],
          fundingStage: null,
          description: null,
          website: null,
          linkedInUrl: null,
        },
        confidence: 0.95, // High confidence for real-time verified data
        responseTime: 0,
      }

      providerResponses.push(mcpProviderResponse)
      console.log(`✅ Added MCP data as 5th verification source with 95% confidence`)
    }

    const consensusMetadata = calculateConsensus(providerResponses)

    const enrichedCompany = buildEnrichedCompanyFromConsensus(
      badgeScan.id,
      consensusMetadata,
      providerResponses
    )

    enrichedCompany.id = this.generateEnrichedCompanyId()

    const fieldsNeedingReview = Object.values(consensusMetadata)
      .filter(m => m.needsManualReview)
      .map(m => m.fieldName)

    const overallConfidence = this.calculateOverallConfidence(consensusMetadata)

    return {
      enrichedCompany,
      providerResponses,
      fieldsNeedingReview,
      overallConfidence,
    }
  }

  /**
   * Query all LLM providers in parallel
   * @param companyName Company name to research
   * @param additionalContext Additional context for enrichment
   * @returns Array of provider responses
   */
  private async queryAllProviders(
    companyName: string,
    additionalContext?: string
  ): Promise<ProviderResponse[]> {
    const providerPromises = [
      this.claudeClient.enrichCompany(companyName, additionalContext).catch(error => this.handleProviderError('Claude', error)),
      this.openaiClient.enrichCompany(companyName, additionalContext).catch(error => this.handleProviderError('GPT-4', error)),
      this.geminiClient.enrichCompany(companyName, additionalContext).catch(error => this.handleProviderError('Gemini', error)),
    ]

    const results = await Promise.allSettled(providerPromises)

    const successfulResponses = results
      .filter((result): result is PromiseFulfilledResult<ProviderResponse> => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(response => response !== null)

    if (successfulResponses.length === 0) {
      throw new Error('All LLM providers failed to enrich company data')
    }

    if (successfulResponses.length < 2) {
      console.warn(`Only ${successfulResponses.length} out of 3 providers succeeded. Consensus may be less reliable.`)
    }

    return successfulResponses
  }

  /**
   * Build additional context from badge scan data
   */
  private buildContext(badgeScan: BadgeScan): string {
    const contextParts: string[] = []

    if (badgeScan.jobTitle) {
      contextParts.push(`Contact is ${badgeScan.jobTitle}`)
    }

    if (badgeScan.eventName) {
      contextParts.push(`Company was at ${badgeScan.eventName}`)
    }

    if (badgeScan.notes) {
      contextParts.push(`Notes: ${badgeScan.notes}`)
    }

    return contextParts.join('. ')
  }

  /**
   * Build context string from MCP web data
   * Formats real-time web search results into LLM context
   */
  private buildWebDataContext(webData: Partial<EnrichedCompany>): string {
    const parts: string[] = []

    if (webData.employeeCount) {
      parts.push(`${webData.employeeCount} employees`)
    }

    if (webData.annualRevenue) {
      parts.push(`${webData.annualRevenue} revenue`)
    }

    if (webData.industry) {
      parts.push(`${webData.industry} industry`)
    }

    if (webData.dataQuality) {
      parts.push(`(${webData.dataQuality}% data quality)`)
    }

    return parts.join(', ')
  }

  /**
   * Handle provider errors gracefully
   */
  private handleProviderError(providerName: string, error: unknown): null {
    console.error(`${providerName} enrichment failed:`, error)
    return null
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(consensusMetadata: Record<string, any>): number {
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

  /**
   * Generate unique ID for enriched company record
   */
  private generateEnrichedCompanyId(): string {
    return `enriched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Test if all LLM providers are accessible
   * @returns Object with test results for each provider
   */
  async testProviders(): Promise<Record<string, boolean>> {
    const testResults = await Promise.allSettled([
      this.claudeClient.testConnection(),
      this.openaiClient.testConnection(),
      this.geminiClient.testConnection(),
    ])

    return {
      Claude: testResults[0].status === 'fulfilled' && testResults[0].value,
      'GPT-4': testResults[1].status === 'fulfilled' && testResults[1].value,
      Gemini: testResults[2].status === 'fulfilled' && testResults[2].value,
    }
  }
}

/**
 * Create a Company Research Agent instance
 */
export function createCompanyResearchAgent(
  claudeKey?: string,
  openaiKey?: string,
  geminiKey?: string
): CompanyResearchAgent {
  return new CompanyResearchAgent(claudeKey, openaiKey, geminiKey)
}
