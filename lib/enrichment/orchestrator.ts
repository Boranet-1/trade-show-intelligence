/**
 * Enrichment Orchestrator
 * Implements Constitution VI: Single Orchestrator Architecture (Hub-and-Spoke Pattern)
 *
 * Responsibilities:
 * 1. Coordinate all sub-agents (Company Research, Persona Matcher, Pain Point Analyzer)
 * 2. Maintain enrichment workflow state
 * 3. Centralized logging of all agent interactions
 * 4. Error handling and retry logic
 * 5. No direct sub-agent-to-sub-agent communication allowed
 */

import type { BadgeScan, EnrichedCompany, Persona, PersonaMatch, EnrichmentStatus } from '@/lib/types'
import { CompanyResearchAgent, type CompanyResearchResult } from './agents/company-research'
import { PersonaMatcherAgent, type PersonaMatchingResult } from './agents/persona-matcher'
import { PainPointAnalyzerAgent, type PainPointAnalysis } from './agents/pain-point-analyzer'

export interface EnrichmentResult {
  badgeScanId: string
  enrichedCompany: Partial<EnrichedCompany>
  personaMatches: PersonaMatch[]
  bestPersonaMatch: PersonaMatch | null
  assignedTier: string
  actionableInsights: PainPointAnalysis | null
  status: EnrichmentStatus
  error?: string
  processedAt: Date
}

export interface OrchestratorConfig {
  maxRetries: number
  retryDelayMs: number
  enableLogging: boolean
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxRetries: 2,
  retryDelayMs: 1000,
  enableLogging: true,
}

export class EnrichmentOrchestrator {
  private companyResearchAgent: CompanyResearchAgent
  private personaMatcherAgent: PersonaMatcherAgent
  private painPointAnalyzerAgent: PainPointAnalyzerAgent
  private config: OrchestratorConfig

  constructor(
    config: Partial<OrchestratorConfig> = {},
    claudeKey?: string,
    openaiKey?: string,
    geminiKey?: string,
    perplexityKey?: string
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.companyResearchAgent = new CompanyResearchAgent(claudeKey, openaiKey, geminiKey, perplexityKey)
    this.personaMatcherAgent = new PersonaMatcherAgent()
    this.painPointAnalyzerAgent = new PainPointAnalyzerAgent(claudeKey)

    this.log('Orchestrator initialized')
  }

  /**
   * Enrich a single badge scan through the complete workflow
   * @param badgeScan Badge scan to enrich
   * @param personas List of personas for matching
   * @returns Complete enrichment result
   */
  async enrichBadgeScan(badgeScan: BadgeScan, personas: Persona[]): Promise<EnrichmentResult> {
    this.log(`Starting enrichment for badge scan ${badgeScan.id} (${badgeScan.company})`)

    try {
      const companyResearchResult = await this.executeCompanyResearch(badgeScan)

      const personaMatchingResult = await this.executePersonaMatching(
        badgeScan,
        companyResearchResult.enrichedCompany,
        personas
      )

      let painPointAnalysis: PainPointAnalysis | null = null
      if (personaMatchingResult.bestMatch) {
        painPointAnalysis = await this.executePainPointAnalysis(
          badgeScan,
          companyResearchResult.enrichedCompany,
          personaMatchingResult.bestMatch,
          personas.find(p => p.id === personaMatchingResult.bestMatch!.personaId)!
        )
      }

      const result: EnrichmentResult = {
        badgeScanId: badgeScan.id,
        enrichedCompany: companyResearchResult.enrichedCompany,
        personaMatches: personaMatchingResult.personaMatches,
        bestPersonaMatch: personaMatchingResult.bestMatch,
        assignedTier: personaMatchingResult.assignedTier,
        actionableInsights: painPointAnalysis,
        status: 'ENRICHED',
        processedAt: new Date(),
      }

      this.log(`Enrichment completed for badge scan ${badgeScan.id} with tier ${result.assignedTier}`)

      return result
    } catch (error) {
      this.log(`Enrichment failed for badge scan ${badgeScan.id}: ${error}`, 'ERROR')

      return {
        badgeScanId: badgeScan.id,
        enrichedCompany: { badgeScanId: badgeScan.id },
        personaMatches: [],
        bestPersonaMatch: null,
        assignedTier: 'Unscored',
        actionableInsights: null,
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        processedAt: new Date(),
      }
    }
  }

  /**
   * Enrich multiple badge scans in batch
   * @param badgeScans Array of badge scans to enrich
   * @param personas List of personas for matching
   * @param onProgress Optional progress callback
   * @returns Array of enrichment results
   */
  async enrichBatch(
    badgeScans: BadgeScan[],
    personas: Persona[],
    onProgress?: (processed: number, total: number, current: string) => void
  ): Promise<EnrichmentResult[]> {
    this.log(`Starting batch enrichment for ${badgeScans.length} badge scans`)

    const results: EnrichmentResult[] = []

    for (let i = 0; i < badgeScans.length; i++) {
      const badgeScan = badgeScans[i]

      onProgress?.(i, badgeScans.length, badgeScan.company)

      const result = await this.enrichBadgeScan(badgeScan, personas)
      results.push(result)
    }

    onProgress?.(badgeScans.length, badgeScans.length, 'Complete')

    this.log(`Batch enrichment completed: ${results.filter(r => r.status === 'ENRICHED').length}/${badgeScans.length} successful`)

    return results
  }

  /**
   * Step 1: Execute Company Research sub-agent
   */
  private async executeCompanyResearch(badgeScan: BadgeScan): Promise<CompanyResearchResult> {
    this.log(`→ Company Research Agent: Researching ${badgeScan.company}`)

    try {
      const result = await this.companyResearchAgent.researchCompany(badgeScan)

      this.log(`← Company Research Agent: ${Object.keys(result.enrichedCompany).length} fields enriched, confidence: ${(result.overallConfidence * 100).toFixed(1)}%`)

      if (result.fieldsNeedingReview.length > 0) {
        this.log(`  Fields needing review: ${result.fieldsNeedingReview.join(', ')}`, 'WARN')
      }

      return result
    } catch (error) {
      this.log(`← Company Research Agent: FAILED - ${error}`, 'ERROR')
      throw new Error(`Company research failed: ${error}`)
    }
  }

  /**
   * Step 2: Execute Persona Matcher sub-agent
   */
  private async executePersonaMatching(
    badgeScan: BadgeScan,
    enrichedCompany: Partial<EnrichedCompany>,
    personas: Persona[]
  ): Promise<PersonaMatchingResult> {
    this.log(`→ Persona Matcher Agent: Calculating fit scores for ${personas.length} personas`)

    try {
      const result = await this.personaMatcherAgent.matchPersonas(badgeScan, enrichedCompany, personas)

      this.log(`← Persona Matcher Agent: Best match is ${result.bestMatch?.personaId} with ${result.bestMatch?.fitScore.toFixed(1)}% fit, tier: ${result.assignedTier}`)

      return result
    } catch (error) {
      this.log(`← Persona Matcher Agent: FAILED - ${error}`, 'ERROR')

      throw new Error(`Persona matching failed: ${error}`)
    }
  }

  /**
   * Step 3: Execute Pain Point Analyzer sub-agent
   */
  private async executePainPointAnalysis(
    badgeScan: BadgeScan,
    enrichedCompany: Partial<EnrichedCompany>,
    personaMatch: PersonaMatch,
    persona: Persona
  ): Promise<PainPointAnalysis> {
    this.log(`→ Pain Point Analyzer Agent: Generating actionable insights`)

    try {
      const result = await this.painPointAnalyzerAgent.analyzePainPoints(
        badgeScan,
        enrichedCompany,
        personaMatch,
        persona
      )

      this.log(`← Pain Point Analyzer Agent: ${result.painPoints.length} pain points, ${result.conversationStarters.length} conversation starters`)

      return result
    } catch (error) {
      this.log(`← Pain Point Analyzer Agent: FAILED - ${error}`, 'WARN')

      return {
        painPoints: [],
        conversationStarters: [],
        tierJustification: `Tier ${personaMatch.tier} assigned based on ${personaMatch.fitScore}% fit score`,
      }
    }
  }

  /**
   * Centralized logging
   */
  private log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    if (!this.config.enableLogging) {
      return
    }

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [ORCHESTRATOR] [${level}]`

    switch (level) {
      case 'ERROR':
        console.error(`${prefix} ${message}`)
        break
      case 'WARN':
        console.warn(`${prefix} ${message}`)
        break
      default:
        console.log(`${prefix} ${message}`)
    }
  }

  /**
   * Test all provider connections
   * @returns Object with connection status for each provider
   */
  async testConnections(): Promise<Record<string, boolean>> {
    this.log('Testing all LLM provider connections')

    const providerStatus = await this.companyResearchAgent.testProviders()

    this.log(`Connection test results: ${JSON.stringify(providerStatus)}`)

    return providerStatus
  }

  /**
   * Get orchestrator status
   * @returns Status information
   */
  getStatus(): {
    configured: boolean
    loggingEnabled: boolean
    maxRetries: number
  } {
    return {
      configured: true,
      loggingEnabled: this.config.enableLogging,
      maxRetries: this.config.maxRetries,
    }
  }
}

/**
 * Create an Enrichment Orchestrator instance
 */
export function createEnrichmentOrchestrator(
  config?: Partial<OrchestratorConfig>,
  claudeKey?: string,
  openaiKey?: string,
  geminiKey?: string,
  perplexityKey?: string
): EnrichmentOrchestrator {
  return new EnrichmentOrchestrator(config, claudeKey, openaiKey, geminiKey, perplexityKey)
}
