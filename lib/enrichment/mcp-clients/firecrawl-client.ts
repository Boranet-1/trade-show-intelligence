/**
 * Firecrawl MCP Integration Client
 *
 * Deep website scraping with Firecrawl for extracting:
 * - Company news and press releases
 * - Product information
 * - Pain points and challenges
 * - Technology stack
 * - Recent projects and case studies
 * - Competitive intelligence
 *
 * Firecrawl handles JavaScript-heavy sites better than basic scrapers.
 */

/**
 * Firecrawl scraping result
 */
export interface FirecrawlScrapeResult {
  url: string
  title: string
  content: string
  markdown: string
  metadata: {
    title?: string
    description?: string
    keywords?: string[]
    author?: string
    publishedTime?: string
    modifiedTime?: string
    ogImage?: string
  }
  links: {
    internal: string[]
    external: string[]
  }
  images: string[]
  success: boolean
  error?: string
}

/**
 * Website intelligence extracted from Firecrawl
 */
export interface WebsiteIntelligence {
  companyName: string
  painPoints: string[]
  products: string[]
  technologies: string[]
  recentNews: string[]
  projects: string[]
  competitors: string[]
  caseStudies: string[]
  pressReleases: string[]
}

/**
 * Firecrawl client for MCP integration
 */
export class FirecrawlClient {
  private baseUrl: string
  private apiKey: string
  private timeout: number = 30000 // 30 seconds per page

  constructor(config?: { baseUrl?: string; apiKey?: string; timeout?: number }) {
    this.baseUrl = config?.baseUrl || process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev'
    this.apiKey = config?.apiKey || process.env.FIRECRAWL_API_KEY || ''
    this.timeout = config?.timeout || 30000
  }

  /**
   * Scrape a single URL with Firecrawl
   */
  async scrapeUrl(url: string, options?: {
    onlyMainContent?: boolean
    includeMarkdown?: boolean
    includeLinks?: boolean
  }): Promise<FirecrawlScrapeResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v0/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url,
          pageOptions: {
            onlyMainContent: options?.onlyMainContent !== false,
            includeHtml: false,
            screenshot: false
          }
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        throw new Error(`Firecrawl scrape failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        url,
        title: data.data?.title || '',
        content: data.data?.content || '',
        markdown: data.data?.markdown || data.data?.content || '',
        metadata: {
          title: data.data?.metadata?.title,
          description: data.data?.metadata?.description,
          keywords: data.data?.metadata?.keywords,
          author: data.data?.metadata?.author,
          publishedTime: data.data?.metadata?.publishedTime,
          modifiedTime: data.data?.metadata?.modifiedTime,
          ogImage: data.data?.metadata?.ogImage
        },
        links: {
          internal: data.data?.links?.internal || [],
          external: data.data?.links?.external || []
        },
        images: data.data?.images || [],
        success: true
      }
    } catch (error) {
      return {
        url,
        title: '',
        content: '',
        markdown: '',
        metadata: {},
        links: { internal: [], external: [] },
        images: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Crawl multiple pages on a website
   */
  async crawlWebsite(baseUrl: string, options?: {
    maxPages?: number
    maxDepth?: number
    allowedPaths?: string[]
  }): Promise<FirecrawlScrapeResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v0/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          url: baseUrl,
          crawlerOptions: {
            maxPages: options?.maxPages || 10,
            maxDepth: options?.maxDepth || 2,
            allowedUrls: options?.allowedPaths
          },
          pageOptions: {
            onlyMainContent: true,
            includeHtml: false
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Firecrawl crawl failed: ${response.status}`)
      }

      const data = await response.json()

      // Poll for crawl completion
      const jobId = data.jobId
      if (!jobId) {
        throw new Error('No job ID returned from crawl')
      }

      return await this._pollCrawlStatus(jobId)
    } catch (error) {
      console.error('❌ Firecrawl crawl failed:', error)
      return []
    }
  }

  /**
   * Poll crawl job status until complete
   */
  private async _pollCrawlStatus(jobId: string, maxAttempts: number = 30): Promise<FirecrawlScrapeResult[]> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/v0/crawl/status/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        })

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`)
        }

        const data = await response.json()

        if (data.status === 'completed') {
          // Convert crawl results to scrape results
          return (data.data || []).map((page: any) => ({
            url: page.url || '',
            title: page.title || '',
            content: page.content || '',
            markdown: page.markdown || page.content || '',
            metadata: page.metadata || {},
            links: page.links || { internal: [], external: [] },
            images: page.images || [],
            success: true
          }))
        } else if (data.status === 'failed') {
          throw new Error('Crawl job failed')
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`❌ Crawl status poll attempt ${attempt + 1} failed:`, error)
      }
    }

    throw new Error('Crawl job timeout')
  }

  /**
   * Extract website intelligence for company enrichment
   */
  async extractCompanyIntelligence(companyWebsite: string, companyName: string): Promise<WebsiteIntelligence> {
    console.log(`🔍 Extracting website intelligence for ${companyName} from ${companyWebsite}`)

    // Crawl key pages
    const pages = await this.crawlWebsite(companyWebsite, {
      maxPages: 15,
      maxDepth: 2,
      allowedPaths: [
        '/about',
        '/news',
        '/blog',
        '/press',
        '/products',
        '/solutions',
        '/case-studies',
        '/customers'
      ]
    })

    if (pages.length === 0) {
      console.warn('⚠️ No pages crawled, falling back to single page scrape')
      const singlePage = await this.scrapeUrl(companyWebsite)
      if (singlePage.success) {
        pages.push(singlePage)
      }
    }

    // Aggregate all content
    const allContent = pages.map(p => p.markdown || p.content).join('\n\n')
    const allMetadata = pages.map(p => p.metadata.description || '').join('\n')

    // Extract intelligence
    const intelligence: WebsiteIntelligence = {
      companyName,
      painPoints: this._extractPainPoints(allContent),
      products: this._extractProducts(allContent, allMetadata),
      technologies: this._extractTechnologies(allContent),
      recentNews: this._extractNews(pages),
      projects: this._extractProjects(allContent),
      competitors: this._extractCompetitors(allContent, companyName),
      caseStudies: this._extractCaseStudies(pages),
      pressReleases: this._extractPressReleases(pages)
    }

    console.log(`✅ Extracted intelligence:`, {
      painPoints: intelligence.painPoints.length,
      products: intelligence.products.length,
      technologies: intelligence.technologies.length,
      news: intelligence.recentNews.length,
      projects: intelligence.projects.length,
      competitors: intelligence.competitors.length
    })

    return intelligence
  }

  /**
   * Extract pain points from content
   */
  private _extractPainPoints(content: string): string[] {
    const painPoints: string[] = []
    const lowerContent = content.toLowerCase()

    const painKeywords = [
      'challenge', 'problem', 'issue', 'struggle', 'difficulty',
      'pain point', 'bottleneck', 'obstacle', 'barrier', 'friction'
    ]

    for (const keyword of painKeywords) {
      const regex = new RegExp(`([^.]*${keyword}[^.]*\\.)`, 'gi')
      const matches = content.match(regex) || []
      painPoints.push(...matches.slice(0, 3)) // Max 3 per keyword
    }

    // Deduplicate and limit
    return Array.from(new Set(painPoints)).slice(0, 10)
  }

  /**
   * Extract products from content
   */
  private _extractProducts(content: string, metadata: string): string[] {
    const products: string[] = []

    // Look for product-related headers and lists
    const productSections = content.match(/##?\s*(products?|solutions?|offerings?|services?)\s*\n([^\n#]+)/gi) || []

    for (const section of productSections) {
      const items = section.match(/[-*]\s*([^\n]+)/g) || []
      products.push(...items.map(item => item.replace(/^[-*]\s*/, '').trim()))
    }

    // Also check metadata descriptions
    if (metadata.toLowerCase().includes('product')) {
      const metaProducts = metadata.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
      products.push(...metaProducts)
    }

    return Array.from(new Set(products)).slice(0, 15)
  }

  /**
   * Extract technologies from content
   */
  private _extractTechnologies(content: string): string[] {
    const technologies: string[] = []

    const techKeywords = [
      'AWS', 'Azure', 'Google Cloud', 'Kubernetes', 'Docker', 'React', 'Node.js',
      'Python', 'Java', 'TypeScript', 'PostgreSQL', 'MongoDB', 'Redis',
      'Terraform', 'Jenkins', 'GitHub', 'GitLab', 'Salesforce', 'SAP', 'Oracle'
    ]

    for (const tech of techKeywords) {
      const regex = new RegExp(`\\b${tech}\\b`, 'i')
      if (regex.test(content)) {
        technologies.push(tech)
      }
    }

    return Array.from(new Set(technologies))
  }

  /**
   * Extract recent news from pages
   */
  private _extractNews(pages: FirecrawlScrapeResult[]): string[] {
    const news: string[] = []

    const newsPages = pages.filter(p =>
      p.url.includes('/news') ||
      p.url.includes('/blog') ||
      p.url.includes('/press') ||
      p.metadata.publishedTime
    )

    for (const page of newsPages.slice(0, 10)) {
      const title = page.title || page.metadata.title || ''
      const date = page.metadata.publishedTime || page.metadata.modifiedTime || ''
      const summary = page.metadata.description || page.content.slice(0, 200)

      if (title) {
        news.push(date ? `[${date}] ${title}` : title)
      }
    }

    return news.slice(0, 10)
  }

  /**
   * Extract projects from content
   */
  private _extractProjects(content: string): string[] {
    const projects: string[] = []

    // Look for project mentions
    const projectMatches = content.match(/project[s]?:?\s*([^\n.]+)/gi) || []
    projects.push(...projectMatches.map(m => m.trim()))

    return Array.from(new Set(projects)).slice(0, 10)
  }

  /**
   * Extract competitor mentions
   */
  private _extractCompetitors(content: string, companyName: string): string[] {
    const competitors: string[] = []

    // Look for "vs", "alternative to", "compared to" patterns
    const vsMatches = content.match(/(?:vs\.?|versus|compared to|alternative to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g) || []

    for (const match of vsMatches) {
      const competitor = match.replace(/^(?:vs\.?|versus|compared to|alternative to)\s+/i, '').trim()
      if (competitor.toLowerCase() !== companyName.toLowerCase()) {
        competitors.push(competitor)
      }
    }

    return Array.from(new Set(competitors)).slice(0, 10)
  }

  /**
   * Extract case studies from pages
   */
  private _extractCaseStudies(pages: FirecrawlScrapeResult[]): string[] {
    const caseStudies: string[] = []

    const caseStudyPages = pages.filter(p =>
      p.url.includes('/case-stud') ||
      p.url.includes('/customer') ||
      p.url.includes('/success')
    )

    for (const page of caseStudyPages.slice(0, 5)) {
      const title = page.title || page.metadata.title || ''
      if (title) {
        caseStudies.push(title)
      }
    }

    return caseStudies
  }

  /**
   * Extract press releases from pages
   */
  private _extractPressReleases(pages: FirecrawlScrapeResult[]): string[] {
    const pressReleases: string[] = []

    const prPages = pages.filter(p => p.url.includes('/press'))

    for (const page of prPages.slice(0, 5)) {
      const title = page.title || page.metadata.title || ''
      const date = page.metadata.publishedTime || ''
      if (title) {
        pressReleases.push(date ? `[${date}] ${title}` : title)
      }
    }

    return pressReleases
  }
}

// Singleton instance
let firecrawlClient: FirecrawlClient | null = null

/**
 * Get or create Firecrawl client instance
 */
export function getFirecrawlClient(config?: { baseUrl?: string; apiKey?: string; timeout?: number }): FirecrawlClient {
  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlClient(config)
  }
  return firecrawlClient
}

/**
 * Helper: Extract company intelligence from website
 */
export async function extractCompanyIntelligence(companyWebsite: string, companyName: string): Promise<WebsiteIntelligence> {
  const client = getFirecrawlClient()
  return await client.extractCompanyIntelligence(companyWebsite, companyName)
}

/**
 * Helper: Scrape single URL
 */
export async function scrapeUrl(url: string): Promise<FirecrawlScrapeResult> {
  const client = getFirecrawlClient()
  return await client.scrapeUrl(url)
}
