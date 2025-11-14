/**
 * Deep Enrichment Pipeline
 *
 * 5-stage sequential enrichment process taking 2-5 minutes per company:
 * Stage 1 (30s):  Basic company data (Tavily + Apify LinkedIn company)
 * Stage 2 (45s):  Decision maker discovery (Apify LinkedIn people scraper)
 * Stage 3 (60s):  Website intelligence (Firecrawl deep scrape)
 * Stage 4 (30s):  Competitive intelligence (Tavily advanced search)
 * Stage 5 (45s):  MEDDIC deep-dive (Claude extended reasoning with all data)
 *
 * Total: ~210 seconds (3.5 minutes) per company
 *
 * Key Principles:
 * - No hallucinations: Return "Not Found" instead of guessing
 * - Source attribution: Track where each data point came from
 * - Graceful degradation: Continue if individual tools fail
 * - Extended LLM reasoning: Use Claude Sonnet 4.5 thinking mode
 */

import type { EnrichedCompany, BadgeScan, MEDDICScore } from '@/lib/types'
import { getMCPService, type WebSearchResult } from './mcp-clients'
import { getApifyService, type ApifyLinkedInCompanyData, type ApifyLinkedInPeopleData } from './mcp-clients/apify-discovery'
import { getFirecrawlClient, type WebsiteIntelligence } from './mcp-clients/firecrawl-client'
import { calculateMEDDICScore } from '../scoring/meddic-calculator'

/**
 * Enrichment stage result
 */
export interface EnrichmentStageResult {
  stage: 1 | 2 | 3 | 4 | 5
  stageName: string
  success: boolean
  duration: number // milliseconds
  data: any
  error?: string
  confidence: number
}

/**
 * Complete deep enrichment result
 */
export interface DeepEnrichmentResult {
  enrichedCompany: Partial<EnrichedCompany>
  meddic_score?: MEDDICScore
  webIntelligence?: WebsiteIntelligence
  decisionMakers?: ApifyLinkedInPeopleData
  stageResults: EnrichmentStageResult[]
  totalDuration: number
  overallConfidence: number
  sourceAttribution: {
    [key: string]: string // field -> source
  }
}

/**
 * Deep Enrichment Pipeline Orchestrator
 */
export class DeepEnrichmentPipeline {
  private mcpService = getMCPService()
  private apifyService = getApifyService()
  private firecrawlClient = getFirecrawlClient()

  /**
   * Execute full 5-stage enrichment pipeline
   */
  async enrichCompany(params: {
    badgeScan: BadgeScan
    additionalContacts?: BadgeScan[]
  }): Promise<DeepEnrichmentResult> {
    const startTime = Date.now()
    const { badgeScan, additionalContacts = [] } = params
    const companyName = badgeScan.company

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🚀 Starting Deep Enrichment Pipeline for: ${companyName}`)
    console.log(`${'='.repeat(80)}\n`)

    const stageResults: EnrichmentStageResult[] = []
    const sourceAttribution: { [key: string]: string } = {}

    // Stage 1: Basic Company Data (30s)
    const stage1 = await this.executeStage1(companyName, sourceAttribution)
    stageResults.push(stage1)

    // Stage 2: Decision Maker Discovery (45s)
    const stage2 = await this.executeStage2(companyName, sourceAttribution)
    stageResults.push(stage2)

    // Stage 3: Website Intelligence (60s)
    const websiteUrl = stage1.data?.linkedInData?.website ||
                       stage1.data?.tavilyData?.websiteUrl ||
                       `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`
    const stage3 = await this.executeStage3(websiteUrl, companyName, sourceAttribution)
    stageResults.push(stage3)

    // Stage 4: Competitive Intelligence (30s)
    const stage4 = await this.executeStage4(companyName, sourceAttribution)
    stageResults.push(stage4)

    // Stage 5: MEDDIC Deep-Dive (45s)
    const stage5 = await this.executeStage5({
      badgeScan,
      additionalContacts,
      enrichedCompany: this._mergeStageData(stageResults),
      webIntelligence: stage3.data
    })
    stageResults.push(stage5)

    // Merge all enrichment data
    const enrichedCompany = this._mergeStageData(stageResults)
    const totalDuration = Date.now() - startTime

    // Calculate overall confidence
    const overallConfidence = Math.round(
      stageResults.reduce((sum, stage) => sum + stage.confidence, 0) / stageResults.length
    )

    console.log(`\n${'='.repeat(80)}`)
    console.log(`✅ Deep Enrichment Complete for: ${companyName}`)
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(1)}s`)
    console.log(`   Overall Confidence: ${overallConfidence}%`)
    console.log(`   Successful Stages: ${stageResults.filter(s => s.success).length}/5`)
    console.log(`${'='.repeat(80)}\n`)

    return {
      enrichedCompany,
      meddic_score: stage5.data,
      webIntelligence: stage3.data,
      decisionMakers: stage2.data,
      stageResults,
      totalDuration,
      overallConfidence,
      sourceAttribution
    }
  }

  /**
   * Stage 1: Basic Company Data (Tavily + Apify LinkedIn)
   */
  private async executeStage1(
    companyName: string,
    sourceAttribution: { [key: string]: string }
  ): Promise<EnrichmentStageResult> {
    const startTime = Date.now()
    console.log(`📊 Stage 1: Basic Company Data...`)

    try {
      // Run Tavily and Apify in parallel
      const [tavilyData, linkedInData] = await Promise.all([
        this.mcpService.enrichWithWebData(companyName),
        this.apifyService.enrichCompany(companyName)
      ])

      // Track sources
      if (tavilyData.employeeCount) sourceAttribution.employeeCount = 'tavily'
      if (tavilyData.industry) sourceAttribution.industry = 'tavily'
      if (linkedInData.employeeCount) sourceAttribution.employeeCount = 'apify-linkedin'
      if (linkedInData.industry) sourceAttribution.industry = 'apify-linkedin'

      const duration = Date.now() - startTime
      console.log(`   ✓ Stage 1 complete (${(duration / 1000).toFixed(1)}s)`)
      console.log(`     - Tavily: ${Object.keys(tavilyData).length} fields`)
      console.log(`     - Apify: ${Object.keys(linkedInData).length} fields`)

      return {
        stage: 1,
        stageName: 'Basic Company Data',
        success: true,
        duration,
        data: { tavilyData, linkedInData },
        confidence: 90
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`   ✗ Stage 1 failed (${(duration / 1000).toFixed(1)}s):`, error)

      return {
        stage: 1,
        stageName: 'Basic Company Data',
        success: false,
        duration,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0
      }
    }
  }

  /**
   * Stage 2: Decision Maker Discovery (Apify LinkedIn People)
   */
  private async executeStage2(
    companyName: string,
    sourceAttribution: { [key: string]: string }
  ): Promise<EnrichmentStageResult> {
    const startTime = Date.now()
    console.log(`👥 Stage 2: Decision Maker Discovery...`)

    try {
      const peopleData = await this.apifyService.findPeopleAtCompany(companyName, [
        'CEO', 'CFO', 'CTO', 'CMO', 'COO', 'CIO',
        'VP', 'Vice President', 'SVP',
        'Director', 'Head of',
        'Product Manager', 'Technical Lead'
      ])

      sourceAttribution.decisionMakers = 'apify-linkedin-people'

      const duration = Date.now() - startTime
      console.log(`   ✓ Stage 2 complete (${(duration / 1000).toFixed(1)}s)`)
      console.log(`     - Found ${peopleData.profiles.length} decision makers`)

      return {
        stage: 2,
        stageName: 'Decision Maker Discovery',
        success: peopleData.profiles.length > 0,
        duration,
        data: peopleData,
        confidence: peopleData.profiles.length > 0 ? 85 : 30
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`   ✗ Stage 2 failed (${(duration / 1000).toFixed(1)}s):`, error)

      return {
        stage: 2,
        stageName: 'Decision Maker Discovery',
        success: false,
        duration,
        data: { profiles: [] },
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0
      }
    }
  }

  /**
   * Stage 3: Website Intelligence (Firecrawl)
   */
  private async executeStage3(
    websiteUrl: string,
    companyName: string,
    sourceAttribution: { [key: string]: string }
  ): Promise<EnrichmentStageResult> {
    const startTime = Date.now()
    console.log(`🌐 Stage 3: Website Intelligence...`)
    console.log(`   Crawling: ${websiteUrl}`)

    try {
      const webIntelligence = await this.firecrawlClient.extractCompanyIntelligence(websiteUrl, companyName)

      // Track sources
      sourceAttribution.painPoints = 'firecrawl'
      sourceAttribution.products = 'firecrawl'
      sourceAttribution.recentNews = 'firecrawl'
      sourceAttribution.competitors = 'firecrawl'

      const duration = Date.now() - startTime
      console.log(`   ✓ Stage 3 complete (${(duration / 1000).toFixed(1)}s)`)
      console.log(`     - Pain points: ${webIntelligence.painPoints.length}`)
      console.log(`     - Products: ${webIntelligence.products.length}`)
      console.log(`     - Technologies: ${webIntelligence.technologies.length}`)
      console.log(`     - Recent news: ${webIntelligence.recentNews.length}`)

      return {
        stage: 3,
        stageName: 'Website Intelligence',
        success: true,
        duration,
        data: webIntelligence,
        confidence: 80
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`   ✗ Stage 3 failed (${(duration / 1000).toFixed(1)}s):`, error)

      return {
        stage: 3,
        stageName: 'Website Intelligence',
        success: false,
        duration,
        data: {
          companyName,
          painPoints: [],
          products: [],
          technologies: [],
          recentNews: [],
          projects: [],
          competitors: [],
          caseStudies: [],
          pressReleases: []
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0
      }
    }
  }

  /**
   * Stage 4: Competitive Intelligence (Tavily Advanced Search)
   */
  private async executeStage4(
    companyName: string,
    sourceAttribution: { [key: string]: string }
  ): Promise<EnrichmentStageResult> {
    const startTime = Date.now()
    console.log(`🔍 Stage 4: Competitive Intelligence...`)

    try {
      // Search for competitors, case studies, and integrations
      const queries = [
        `${companyName} competitors`,
        `${companyName} case studies customers`,
        `${companyName} partnerships integrations`
      ]

      const results = await Promise.all(
        queries.map(query => this.mcpService.searchCompanyData(query))
      )

      sourceAttribution.competitiveIntel = 'tavily'

      const duration = Date.now() - startTime
      const totalResults = results.reduce((sum, r) => sum + r.length, 0)

      console.log(`   ✓ Stage 4 complete (${(duration / 1000).toFixed(1)}s)`)
      console.log(`     - Search results: ${totalResults}`)

      return {
        stage: 4,
        stageName: 'Competitive Intelligence',
        success: true,
        duration,
        data: {
          competitors: results[0],
          caseStudies: results[1],
          partnerships: results[2]
        },
        confidence: 75
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`   ✗ Stage 4 failed (${(duration / 1000).toFixed(1)}s):`, error)

      return {
        stage: 4,
        stageName: 'Competitive Intelligence',
        success: false,
        duration,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0
      }
    }
  }

  /**
   * Stage 5: MEDDIC Deep-Dive (Claude Extended Reasoning)
   */
  private async executeStage5(params: {
    badgeScan: BadgeScan
    additionalContacts: BadgeScan[]
    enrichedCompany: Partial<EnrichedCompany>
    webIntelligence?: WebsiteIntelligence
  }): Promise<EnrichmentStageResult> {
    const startTime = Date.now()
    console.log(`🧠 Stage 5: MEDDIC Deep-Dive (Extended Reasoning)...`)

    try {
      const { badgeScan, additionalContacts, enrichedCompany, webIntelligence } = params

      // Calculate MEDDIC score with all collected data
      const meddic_score = await calculateMEDDICScore({
        badgeScan,
        enrichedCompany,
        additionalContacts,
        webIntelligence: webIntelligence || {
          painPoints: [],
          competitors: [],
          recentNews: [],
          techStack: [],
          projects: []
        }
      })

      const duration = Date.now() - startTime
      console.log(`   ✓ Stage 5 complete (${(duration / 1000).toFixed(1)}s)`)
      console.log(`     - MEDDIC Score: ${meddic_score.overallScore}/100`)
      console.log(`     - Qualification: ${meddic_score.qualificationStatus}`)
      console.log(`     - Economic Buyer: ${meddic_score.economicBuyer?.name || 'Not Found'}`)
      console.log(`     - Champion: ${meddic_score.champion?.name || 'Not Found'}`)

      return {
        stage: 5,
        stageName: 'MEDDIC Deep-Dive',
        success: true,
        duration,
        data: meddic_score,
        confidence: 95
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`   ✗ Stage 5 failed (${(duration / 1000).toFixed(1)}s):`, error)

      return {
        stage: 5,
        stageName: 'MEDDIC Deep-Dive',
        success: false,
        duration,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0
      }
    }
  }

  /**
   * Merge data from all stages into EnrichedCompany
   */
  private _mergeStageData(stageResults: EnrichmentStageResult[]): Partial<EnrichedCompany> {
    const merged: Partial<EnrichedCompany> = {}

    for (const stage of stageResults) {
      if (!stage.success) continue

      if (stage.stage === 1) {
        // Stage 1: Basic company data
        const { tavilyData, linkedInData } = stage.data

        // Prefer LinkedIn data for employee count (more accurate)
        if (linkedInData?.employeeCount) {
          merged.employeeCount = linkedInData.employeeCount
        } else if (tavilyData?.employeeCount) {
          merged.employeeCount = tavilyData.employeeCount
        }

        // Prefer LinkedIn for industry
        if (linkedInData?.industry) {
          merged.industry = linkedInData.industry
        } else if (tavilyData?.industry) {
          merged.industry = tavilyData.industry
        }

        // Merge other fields
        Object.assign(merged, tavilyData, linkedInData)
      } else if (stage.stage === 3) {
        // Stage 3: Website intelligence
        const webIntel = stage.data as WebsiteIntelligence

        if (webIntel.technologies?.length > 0) {
          merged.techStack = webIntel.technologies
        }
      }
    }

    return merged
  }
}

// Singleton instance
let pipeline: DeepEnrichmentPipeline | null = null

/**
 * Get or create deep enrichment pipeline instance
 */
export function getDeepEnrichmentPipeline(): DeepEnrichmentPipeline {
  if (!pipeline) {
    pipeline = new DeepEnrichmentPipeline()
  }
  return pipeline
}

/**
 * Helper: Enrich company with full deep pipeline
 */
export async function enrichCompanyWithDeepPipeline(
  badgeScan: BadgeScan,
  additionalContacts?: BadgeScan[]
): Promise<DeepEnrichmentResult> {
  const pipelineInstance = getDeepEnrichmentPipeline()
  return await pipelineInstance.enrichCompany({
    badgeScan,
    additionalContacts
  })
}
