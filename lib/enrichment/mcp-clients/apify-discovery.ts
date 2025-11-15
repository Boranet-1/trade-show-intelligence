/**
 * Apify MCP Auto-Discovery Client
 *
 * Automatically discovers and uses all available Apify actors via MCP server.
 * Categorizes actors by purpose and invokes them dynamically for enrichment.
 *
 * Apify Actor Categories:
 * - Company Data: LinkedIn company scrapers, company info extractors
 * - People Data: LinkedIn people scrapers, contact finders
 * - Web Scraping: Website scrapers, content extractors
 * - Competitive Intel: Competitor research, market analysis
 */

import type { EnrichedCompany, BadgeScan } from '@/lib/types'

/**
 * Apify actor metadata
 */
export interface ApifyActor {
  id: string
  name: string
  title: string
  description: string
  category: 'company' | 'people' | 'web' | 'competitive' | 'other'
  inputSchema?: any
  outputSchema?: any
}

/**
 * Apify enrichment result
 */
export interface ApifyEnrichmentResult {
  actorId: string
  actorName: string
  data: any
  confidence: number
  executionTime: number
  success: boolean
  error?: string
}

/**
 * LinkedIn company data from Apify
 */
export interface ApifyLinkedInCompanyData {
  companyName: string
  industry: string
  companySize: string
  employees: number
  headquarters: string
  founded: number
  description: string
  website: string
  specialties: string[]
  linkedin_url: string
  followerCount?: number
  recentPosts?: Array<{
    title: string
    content: string
    postedAt: string
  }>
}

/**
 * LinkedIn people data from Apify
 */
export interface ApifyLinkedInPeopleData {
  profiles: Array<{
    fullName: string
    title: string
    company: string
    location: string
    profileUrl: string
    experience: Array<{
      title: string
      company: string
      duration: string
    }>
    education: Array<{
      school: string
      degree: string
    }>
    skills: string[]
  }>
}

/**
 * Website data from Apify
 */
export interface ApifyWebsiteData {
  url: string
  title: string
  content: string
  metadata: {
    description?: string
    keywords?: string[]
    author?: string
  }
  technologies: string[]
  socialLinks: {
    linkedin?: string
    twitter?: string
    facebook?: string
  }
  contactInfo: {
    email?: string
    phone?: string
    address?: string
  }
}

/**
 * Apify Auto-Discovery Service
 */
export class ApifyDiscoveryService {
  private baseUrl: string = 'https://mcp.apify.com'
  private availableActors: ApifyActor[] = []
  private discovered: boolean = false
  private discoveryPromise: Promise<void> | null = null

  /**
   * Discover all available Apify actors via MCP
   */
  async discoverActors(): Promise<ApifyActor[]> {
    if (this.discovered) {
      return this.availableActors
    }

    if (this.discoveryPromise) {
      await this.discoveryPromise
      return this.availableActors
    }

    this.discoveryPromise = this._discoverActors()
    await this.discoveryPromise
    return this.availableActors
  }

  /**
   * Internal discovery logic
   */
  private async _discoverActors(): Promise<void> {
    try {
      // Query Apify MCP server for available tools/actors
      const response = await fetch(`${this.baseUrl}/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Apify discovery failed: ${response.status}`)
      }

      const data = await response.json()

      // Parse actor list and categorize
      this.availableActors = this._categorizeActors(data.tools || data.actors || [])
      this.discovered = true

      console.log(`✅ Discovered ${this.availableActors.length} Apify actors`)
      console.log(`   - Company: ${this.availableActors.filter(a => a.category === 'company').length}`)
      console.log(`   - People: ${this.availableActors.filter(a => a.category === 'people').length}`)
      console.log(`   - Web: ${this.availableActors.filter(a => a.category === 'web').length}`)
      console.log(`   - Competitive: ${this.availableActors.filter(a => a.category === 'competitive').length}`)
    } catch (error) {
      console.error('❌ Apify actor discovery failed:', error)
      // Fallback to known actors if discovery fails
      this.availableActors = this._getKnownActors()
      this.discovered = true
    }
  }

  /**
   * Categorize actors by purpose
   */
  private _categorizeActors(actors: any[]): ApifyActor[] {
    return actors.map((actor: any) => {
      const name = (actor.name || actor.id || '').toLowerCase()
      const description = (actor.description || '').toLowerCase()
      const title = actor.title || actor.name || actor.id || 'Unknown Actor'

      let category: ApifyActor['category'] = 'other'

      // Categorize by name/description patterns
      if (name.includes('linkedin') && (name.includes('company') || name.includes('organization'))) {
        category = 'company'
      } else if (name.includes('linkedin') && (name.includes('people') || name.includes('profile') || name.includes('person'))) {
        category = 'people'
      } else if (name.includes('scraper') || name.includes('crawler') || name.includes('website')) {
        category = 'web'
      } else if (name.includes('competitor') || name.includes('market') || name.includes('research')) {
        category = 'competitive'
      }

      return {
        id: actor.id || actor.name,
        name: actor.name || actor.id,
        title,
        description: actor.description || '',
        category,
        inputSchema: actor.inputSchema,
        outputSchema: actor.outputSchema
      }
    })
  }

  /**
   * Fallback to known actors if discovery fails
   */
  private _getKnownActors(): ApifyActor[] {
    return [
      {
        id: 'apimaestro/linkedin-company-detail',
        name: 'linkedin-company-detail',
        title: 'LinkedIn Company Detail Scraper',
        description: 'Scrapes detailed company information from LinkedIn',
        category: 'company'
      },
      {
        id: 'apimaestro/linkedin-people-scraper',
        name: 'linkedin-people-scraper',
        title: 'LinkedIn People Scraper',
        description: 'Scrapes LinkedIn profiles and contact information',
        category: 'people'
      },
      {
        id: 'apify/website-content-crawler',
        name: 'website-content-crawler',
        title: 'Website Content Crawler',
        description: 'Crawls and extracts content from websites',
        category: 'web'
      }
    ]
  }

  /**
   * Invoke specific Apify actor with input
   */
  async invokeActor(actorId: string, input: any, timeout: number = 120000): Promise<ApifyEnrichmentResult> {
    const startTime = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}/tools/${actorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(timeout)
      })

      if (!response.ok) {
        throw new Error(`Actor invocation failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const executionTime = Date.now() - startTime

      return {
        actorId,
        actorName: actorId.split('/').pop() || actorId,
        data,
        confidence: 95, // Apify data is highly reliable
        executionTime,
        success: true
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      return {
        actorId,
        actorName: actorId.split('/').pop() || actorId,
        data: null,
        confidence: 0,
        executionTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Enrich company using all available company actors
   */
  async enrichCompany(companyName: string): Promise<Partial<EnrichedCompany>> {
    await this.discoverActors()

    const companyActors = this.availableActors.filter(a => a.category === 'company')
    console.log(`🔍 Running ${companyActors.length} company enrichment actors for "${companyName}"`)

    // Run all company actors in parallel
    const results = await Promise.all(
      companyActors.map(actor =>
        this.invokeActor(actor.id, {
          companyName,
          includeDetails: true,
          includeRecentPosts: true
        })
      )
    )

    // Merge results into enriched company data
    return this._mergeCompanyResults(companyName, results)
  }

  /**
   * Find people at company using LinkedIn people scrapers
   */
  async findPeopleAtCompany(companyName: string, titles?: string[]): Promise<ApifyLinkedInPeopleData> {
    await this.discoverActors()

    const peopleActors = this.availableActors.filter(a => a.category === 'people')

    if (peopleActors.length === 0) {
      console.warn('⚠️ No people-scraping actors available')
      return { profiles: [] }
    }

    // Use first available people actor
    const actor = peopleActors[0]
    const result = await this.invokeActor(actor.id, {
      companyName,
      titles: titles || ['CEO', 'CTO', 'VP', 'Director', 'Manager'],
      maxProfiles: 20
    })

    if (!result.success || !result.data) {
      return { profiles: [] }
    }

    // Parse people data
    return this._parsePeopleData(result.data)
  }

  /**
   * Scrape company website using web scrapers
   */
  async scrapeCompanyWebsite(websiteUrl: string): Promise<ApifyWebsiteData | null> {
    await this.discoverActors()

    const webActors = this.availableActors.filter(a => a.category === 'web')

    if (webActors.length === 0) {
      console.warn('⚠️ No web-scraping actors available')
      return null
    }

    // Use first available web scraper
    const actor = webActors[0]
    const result = await this.invokeActor(actor.id, {
      startUrls: [{ url: websiteUrl }],
      maxCrawlDepth: 2,
      maxPages: 10
    })

    if (!result.success || !result.data) {
      return null
    }

    // Parse website data
    return this._parseWebsiteData(result.data, websiteUrl)
  }

  /**
   * Merge company enrichment results from multiple actors
   */
  private _mergeCompanyResults(
    companyName: string,
    results: ApifyEnrichmentResult[]
  ): Partial<EnrichedCompany> {
    const enriched: Partial<EnrichedCompany> = {
      companyName
    }

    // Process successful results
    const successfulResults = results.filter(r => r.success && r.data)

    for (const result of successfulResults) {
      const data = result.data

      // Extract employee count
      if (data.employees && !enriched.employeeCount) {
        enriched.employeeCount = typeof data.employees === 'number'
          ? data.employees
          : this._parseEmployeeCount(data.employees)
      }

      // Extract industry
      if (data.industry && !enriched.industry) {
        enriched.industry = data.industry
      }

      // Extract revenue (if available)
      if (data.revenue && !enriched.annualRevenue) {
        enriched.annualRevenue = data.revenue
      }

      // Extract headquarters
      if (data.headquarters && !enriched.headquarters) {
        enriched.headquarters = data.headquarters
      } else if (data.location && !enriched.headquarters) {
        enriched.headquarters = data.location
      }

      // Extract founded year
      if (data.founded && !enriched.founded) {
        enriched.founded = typeof data.founded === 'number'
          ? data.founded
          : parseInt(data.founded)
      }

      // Extract description
      if (data.description && !enriched.description) {
        enriched.description = data.description
      }

      // Extract LinkedIn URL
      if (data.linkedInUrl && !enriched.linkedinUrl) {
        enriched.linkedinUrl = data.linkedInUrl
      } else if (data.linkedin_url && !enriched.linkedinUrl) {
        enriched.linkedinUrl = data.linkedin_url
      }

      // Extract tech stack
      if (data.technologies && !enriched.techStack) {
        enriched.techStack = Array.isArray(data.technologies)
          ? data.technologies
          : [data.technologies]
      } else if (data.specialties && !enriched.techStack) {
        enriched.techStack = Array.isArray(data.specialties)
          ? data.specialties
          : [data.specialties]
      }

      // Extract funding stage
      if (data.fundingStage && !enriched.fundingStage) {
        enriched.fundingStage = data.fundingStage
      }
    }

    return enriched
  }

  /**
   * Parse employee count from various formats
   */
  private _parseEmployeeCount(value: any): number {
    if (typeof value === 'number') return value

    const str = String(value).toLowerCase()

    // Handle ranges: "51-200", "1-10"
    const rangeMatch = str.match(/(\d+)-(\d+)/)
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1].replace(/,/g, ''))
      const max = parseInt(rangeMatch[2].replace(/,/g, ''))
      return Math.floor((min + max) / 2)
    }

    // Handle "10,000+" format
    const plusMatch = str.match(/([\d,]+)\+/)
    if (plusMatch) {
      return parseInt(plusMatch[1].replace(/,/g, ''))
    }

    // Handle direct numbers
    const numberMatch = str.match(/[\d,]+/)
    if (numberMatch) {
      return parseInt(numberMatch[0].replace(/,/g, ''))
    }

    return 0
  }

  /**
   * Parse LinkedIn people data from actor response
   */
  private _parsePeopleData(data: any): ApifyLinkedInPeopleData {
    const profiles = Array.isArray(data) ? data : (data.profiles || [])

    return {
      profiles: profiles.map((profile: any) => ({
        fullName: profile.fullName || profile.name || '',
        title: profile.title || profile.position || '',
        company: profile.company || '',
        location: profile.location || '',
        profileUrl: profile.profileUrl || profile.url || '',
        experience: profile.experience || [],
        education: profile.education || [],
        skills: profile.skills || []
      }))
    }
  }

  /**
   * Parse website data from actor response
   */
  private _parseWebsiteData(data: any, url: string): ApifyWebsiteData {
    const pages = Array.isArray(data) ? data : [data]
    const mainPage = pages[0] || {}

    return {
      url,
      title: mainPage.title || '',
      content: mainPage.text || mainPage.content || '',
      metadata: {
        description: mainPage.description,
        keywords: mainPage.keywords,
        author: mainPage.author
      },
      technologies: mainPage.technologies || [],
      socialLinks: {
        linkedin: mainPage.socialLinks?.linkedin,
        twitter: mainPage.socialLinks?.twitter,
        facebook: mainPage.socialLinks?.facebook
      },
      contactInfo: {
        email: mainPage.email,
        phone: mainPage.phone,
        address: mainPage.address
      }
    }
  }

  /**
   * Get actors by category
   */
  async getActorsByCategory(category: ApifyActor['category']): Promise<ApifyActor[]> {
    await this.discoverActors()
    return this.availableActors.filter(a => a.category === category)
  }

  /**
   * Test actor availability
   */
  async testActor(actorId: string): Promise<boolean> {
    try {
      const result = await this.invokeActor(actorId, { test: true }, 10000)
      return result.success
    } catch {
      return false
    }
  }
}

// Singleton instance
let apifyService: ApifyDiscoveryService | null = null

/**
 * Get or create Apify Discovery Service instance
 */
export function getApifyService(): ApifyDiscoveryService {
  if (!apifyService) {
    apifyService = new ApifyDiscoveryService()
  }
  return apifyService
}

/**
 * Helper: Enrich company with all available Apify actors
 */
export async function enrichCompanyWithApify(companyName: string): Promise<Partial<EnrichedCompany>> {
  const service = getApifyService()
  return await service.enrichCompany(companyName)
}

/**
 * Helper: Find decision makers at company
 */
export async function findDecisionMakersWithApify(companyName: string): Promise<ApifyLinkedInPeopleData> {
  const service = getApifyService()
  return await service.findPeopleAtCompany(companyName, [
    'CEO', 'CFO', 'CTO', 'CMO', 'COO',
    'VP', 'Vice President',
    'Director', 'Head of',
    'Product Manager', 'Technical Lead'
  ])
}
