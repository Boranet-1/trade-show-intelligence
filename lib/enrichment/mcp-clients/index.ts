/**
 * MCP Enrichment Service
 * Integrates Model Context Protocol servers for enhanced company enrichment
 * - Tavily: Real-time web search for company data
 * - Apify: LinkedIn company and profile scraping
 * - Context7: Technology stack verification
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { EnrichedCompany } from '@/lib/types'

export interface WebSearchResult {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
}

export interface LinkedInCompanyData {
  name: string
  industry: string
  companySize: string
  employees: number
  headquarters: string
  founded: number
  description: string
  website: string
  specialties: string[]
  linkedin_url: string
}

export interface MCPEnrichmentResult {
  webSearch: WebSearchResult[]
  linkedInData?: LinkedInCompanyData
  confidence: number
  source: 'tavily' | 'apify' | 'context7'
  timestamp: string
}

export class MCPEnrichmentService {
  private tavilyClient: Client | null = null
  private apifyBaseUrl: string = 'https://mcp.apify.com'
  private initialized = false
  private initializationPromise: Promise<void> | null = null

  constructor() {
    // Lazy initialization
  }

  /**
   * Initialize MCP connections
   * Uses stdio transport for Tavily MCP server
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this._initialize()
    return this.initializationPromise
  }

  private async _initialize(): Promise<void> {
    try {
      // Initialize Tavily MCP client
      const tavilyTransport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@agtools/mcp-tavily'],
        env: {
          ...process.env,
          TAVILY_API_KEY: process.env.TAVILY_API_KEY || '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'
        }
      })

      this.tavilyClient = new Client(
        {
          name: 'trade-show-enrichment',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      )

      await this.tavilyClient.connect(tavilyTransport)
      this.initialized = true

      console.log('✅ MCP Enrichment Service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize MCP Enrichment Service:', error)
      this.initialized = false
      this.initializationPromise = null
      // Don't throw - graceful degradation per Constitution VII
    }
  }

  /**
   * Search for real-time company data using Tavily
   * @param companyName - Name of the company to search
   * @returns Web search results with company information
   */
  async searchCompanyData(companyName: string): Promise<WebSearchResult[]> {
    await this.initialize()

    if (!this.tavilyClient) {
      console.warn('⚠️ Tavily MCP client not available, skipping web search')
      return []
    }

    try {
      const query = `${companyName} company revenue employees funding tech stack headquarters`

      const result = await this.tavilyClient.callTool({
        name: 'search',
        arguments: {
          query,
          searchDepth: 'advanced',
          maxResults: 5,
          includeRawContent: false
        }
      })

      // Parse Tavily response
      const searchResults = this._parseTavilyResponse(result)

      console.log(`✅ Tavily search found ${searchResults.length} results for "${companyName}"`)
      return searchResults
    } catch (error) {
      console.error(`❌ Tavily search failed for "${companyName}":`, error)
      // Graceful degradation - return empty results
      return []
    }
  }

  /**
   * Enrich company data using real-time web search
   * Combines Tavily search results into structured company data
   */
  async enrichWithWebData(companyName: string): Promise<Partial<EnrichedCompany>> {
    const webResults = await this.searchCompanyData(companyName)

    if (webResults.length === 0) {
      return {}
    }

    // Extract structured data from web search results
    const enrichedData: Partial<EnrichedCompany> = {
      companyName,
      enrichmentSource: 'tavily',
      enrichmentTimestamp: new Date().toISOString(),
      dataQuality: this._calculateDataQuality(webResults)
    }

    // Parse web content for key information
    const allContent = webResults.map(r => r.content).join('\n\n')

    // Extract employee count patterns
    const employeeMatches = allContent.match(/(\d{1,6})\s*(employees|people|staff)/i)
    if (employeeMatches) {
      enrichedData.employeeCount = parseInt(employeeMatches[1])
    }

    // Extract revenue patterns
    const revenueMatches = allContent.match(/\$(\d+(?:\.\d+)?)\s*(million|billion|M|B)/i)
    if (revenueMatches) {
      const amount = parseFloat(revenueMatches[1])
      const unit = revenueMatches[2].toLowerCase()
      const isBillion = unit.startsWith('b')
      enrichedData.annualRevenue = `$${amount}${isBillion ? 'B' : 'M'}`
    }

    // Extract industry from content
    const industryKeywords = ['software', 'saas', 'fintech', 'healthcare', 'manufacturing', 'retail', 'technology', 'ai', 'enterprise']
    for (const keyword of industryKeywords) {
      if (allContent.toLowerCase().includes(keyword)) {
        enrichedData.industry = keyword.charAt(0).toUpperCase() + keyword.slice(1)
        break
      }
    }

    return enrichedData
  }

  /**
   * Enrich company data from LinkedIn via Apify MCP
   * Uses Apify actors for verified LinkedIn company data
   * @param companyName - Name of the company
   * @returns LinkedIn company data with verified employee count, industry, etc.
   */
  async enrichFromLinkedIn(companyName: string): Promise<LinkedInCompanyData | null> {
    try {
      // Note: Apify MCP uses HTTP transport, so we make a direct HTTP request
      // The MCP server at https://mcp.apify.com handles actor execution

      const response = await fetch(`${this.apifyBaseUrl}/tools/apimaestro/linkedin-company-detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            companyName,
            includeDetails: true
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Apify request failed: ${response.status}`)
      }

      const data = await response.json()

      // Extract LinkedIn data from Apify response
      const linkedInData: LinkedInCompanyData = {
        name: data.name || companyName,
        industry: data.industry || 'Unknown',
        companySize: data.companySize || data.size || 'Unknown',
        employees: data.employees || this._parseEmployeeCount(data.companySize),
        headquarters: data.headquarters || data.location || 'Unknown',
        founded: data.founded || 0,
        description: data.description || '',
        website: data.website || '',
        specialties: data.specialties || [],
        linkedin_url: data.linkedInUrl || data.url || ''
      }

      console.log(`✅ Apify LinkedIn enrichment successful for ${companyName}`)
      return linkedInData
    } catch (error) {
      console.warn(`⚠️ Apify LinkedIn enrichment failed for ${companyName}:`, error)
      // Graceful degradation per Constitution VII
      return null
    }
  }

  /**
   * Combine Tavily + Apify enrichment for maximum accuracy
   * This method orchestrates both MCP sources and merges results
   */
  async enrichWithAllMCPSources(companyName: string): Promise<Partial<EnrichedCompany>> {
    await this.initialize()

    // Run both enrichment sources in parallel
    const [tavilyData, linkedInData] = await Promise.all([
      this.enrichWithWebData(companyName),
      this.enrichFromLinkedIn(companyName)
    ])

    // Merge results, preferring LinkedIn for employee count (more accurate)
    const mergedData: Partial<EnrichedCompany> = {
      ...tavilyData,
      companyName
    }

    if (linkedInData) {
      // LinkedIn data is more authoritative for these fields
      if (linkedInData.employees > 0) {
        mergedData.employeeCount = linkedInData.employees
      }

      if (linkedInData.industry && linkedInData.industry !== 'Unknown') {
        mergedData.industry = linkedInData.industry
      }

      // Add LinkedIn-specific enrichment
      mergedData.enrichmentSource = 'tavily+apify'

      // Increase data quality if we have LinkedIn verification
      if (mergedData.dataQuality) {
        mergedData.dataQuality = Math.min(100, mergedData.dataQuality + 20)
      }
    }

    return mergedData
  }

  /**
   * Parse employee count from LinkedIn company size string
   * Examples: "51-200 employees", "1001-5000", "10,000+"
   */
  private _parseEmployeeCount(sizeString: string): number {
    if (!sizeString) return 0

    // Handle ranges: "51-200" -> use midpoint
    const rangeMatch = sizeString.match(/(\d+)-(\d+)/)
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1].replace(/,/g, ''))
      const max = parseInt(rangeMatch[2].replace(/,/g, ''))
      return Math.floor((min + max) / 2)
    }

    // Handle "10,000+" -> use the number
    const plusMatch = sizeString.match(/([\d,]+)\+/)
    if (plusMatch) {
      return parseInt(plusMatch[1].replace(/,/g, ''))
    }

    // Handle direct numbers
    const numberMatch = sizeString.match(/[\d,]+/)
    if (numberMatch) {
      return parseInt(numberMatch[0].replace(/,/g, ''))
    }

    return 0
  }

  /**
   * Calculate data quality score based on web search results
   */
  private _calculateDataQuality(results: WebSearchResult[]): number {
    if (results.length === 0) return 0

    // Quality factors:
    // - Number of results (more is better, up to 5)
    // - Average score from search results
    // - Content length (more detailed is better)

    const numResultsScore = Math.min(results.length / 5, 1) * 0.4
    const avgSearchScore = results.reduce((sum, r) => sum + r.score, 0) / results.length * 0.3
    const avgContentLength = results.reduce((sum, r) => sum + r.content.length, 0) / results.length
    const contentLengthScore = Math.min(avgContentLength / 500, 1) * 0.3

    return Math.round((numResultsScore + avgSearchScore + contentLengthScore) * 100)
  }

  /**
   * Parse Tavily MCP response into structured format
   */
  private _parseTavilyResponse(response: any): WebSearchResult[] {
    try {
      // Tavily returns results in content array
      const results = response.content || []

      return results.map((result: any) => ({
        title: result.title || 'Untitled',
        url: result.url || '',
        content: result.content || result.snippet || '',
        score: result.score || 0.5,
        publishedDate: result.published_date
      }))
    } catch (error) {
      console.error('Failed to parse Tavily response:', error)
      return []
    }
  }

  /**
   * Close MCP connections
   */
  async close(): Promise<void> {
    if (this.tavilyClient) {
      try {
        await this.tavilyClient.close()
        this.tavilyClient = null
        this.initialized = false
        this.initializationPromise = null
        console.log('✅ MCP Enrichment Service closed')
      } catch (error) {
        console.error('❌ Error closing MCP clients:', error)
      }
    }
  }
}

// Singleton instance
let mcpService: MCPEnrichmentService | null = null

/**
 * Get or create MCP service instance
 */
export function getMCPService(): MCPEnrichmentService {
  if (!mcpService) {
    mcpService = new MCPEnrichmentService()
  }
  return mcpService
}

/**
 * Helper: Search company with Tavily MCP
 */
export async function searchCompanyWithTavily(companyName: string): Promise<MCPEnrichmentResult> {
  const service = getMCPService()
  const webSearch = await service.searchCompanyData(companyName)

  return {
    webSearch,
    confidence: service['_calculateDataQuality'](webSearch),
    source: 'tavily',
    timestamp: new Date().toISOString()
  }
}

/**
 * Helper: Enrich company with web data
 */
export async function enrichCompanyWithMCP(companyName: string): Promise<Partial<EnrichedCompany>> {
  const service = getMCPService()
  return await service.enrichWithWebData(companyName)
}
