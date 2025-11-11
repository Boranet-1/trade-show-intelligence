/**
 * Pain Point Analyzer Sub-Agent
 * Specialized agent for generating actionable insights (pain points, conversation starters)
 * Part of the hub-and-spoke architecture (Constitution VI)
 * Implements Constitution IV: Actionable Intelligence Focus
 */

import type { EnrichedCompany, Persona, PersonaMatch, BadgeScan } from '@/lib/types'
import Anthropic from '@anthropic-ai/sdk'

export interface PainPointAnalysis {
  painPoints: string[]
  conversationStarters: string[]
  tierJustification: string
}

export class PainPointAnalyzerAgent {
  private client: Anthropic

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY
    if (!key) {
      throw new Error('Claude API key required for Pain Point Analyzer')
    }

    this.client = new Anthropic({ apiKey: key })
  }

  /**
   * Analyze company and generate actionable insights for sales follow-up
   * @param badgeScan Badge scan data
   * @param enrichedCompany Enriched company data
   * @param personaMatch Persona match with fit score
   * @param persona The persona definition used for matching
   * @returns Pain points, conversation starters, and tier justification
   */
  async analyzePainPoints(
    badgeScan: BadgeScan,
    enrichedCompany: Partial<EnrichedCompany>,
    personaMatch: PersonaMatch,
    persona: Persona
  ): Promise<PainPointAnalysis> {
    const prompt = this.buildAnalysisPrompt(badgeScan, enrichedCompany, personaMatch, persona)

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

      return this.parseAnalysisResponse(responseText)
    } catch (error) {
      console.error('Pain point analysis failed:', error)

      return this.generateFallbackInsights(badgeScan, enrichedCompany, personaMatch)
    }
  }

  /**
   * Build prompt for pain point analysis
   */
  private buildAnalysisPrompt(
    badgeScan: BadgeScan,
    enrichedCompany: Partial<EnrichedCompany>,
    personaMatch: PersonaMatch,
    persona: Persona
  ): string {
    return `You are a B2B sales intelligence expert. Analyze this lead and provide actionable insights for sales follow-up.

LEAD INFORMATION:
- Contact: ${badgeScan.firstName || ''} ${badgeScan.lastName || ''} (${badgeScan.jobTitle || 'Unknown title'})
- Company: ${enrichedCompany.companyName || badgeScan.company}
- Industry: ${enrichedCompany.industry || 'Unknown'}
- Company Size: ${enrichedCompany.employeeCount ? `${enrichedCompany.employeeCount} employees` : enrichedCompany.employeeRange || 'Unknown'}
- Revenue: ${enrichedCompany.annualRevenue ? `$${enrichedCompany.annualRevenue.toLocaleString()}` : enrichedCompany.revenueRange || 'Unknown'}
- Tech Stack: ${enrichedCompany.techStack?.join(', ') || 'Unknown'}
- Headquarters: ${enrichedCompany.headquarters || 'Unknown'}
- Funding Stage: ${enrichedCompany.fundingStage || 'Unknown'}
- Event: ${badgeScan.eventName}
${badgeScan.notes ? `- Notes from booth: ${badgeScan.notes}` : ''}

PERSONA MATCH:
- Persona: ${persona.name}
- Fit Score: ${personaMatch.fitScore}%
- Tier: ${personaMatch.tier}
- Criteria Met: ${personaMatch.criteriaMatches.filter(c => c.matched).length} out of ${personaMatch.criteriaMatches.length}

MATCHED CRITERIA:
${personaMatch.criteriaMatches
  .filter(c => c.matched)
  .map(c => `- ${c.criterionName}: ${JSON.stringify(c.actualValue)} matches ${JSON.stringify(c.targetValue)}`)
  .join('\n')}

MISSED CRITERIA:
${personaMatch.criteriaMatches
  .filter(c => !c.matched)
  .map(c => `- ${c.criterionName}: ${JSON.stringify(c.actualValue)} does not match ${JSON.stringify(c.targetValue)}`)
  .join('\n')}

Generate actionable sales intelligence in the following format:

## Pain Points
[List 3-5 specific business challenges this company/contact likely faces based on their industry, size, tech stack, and role. Be specific and relevant.]

## Conversation Starters
[List 3-5 specific, personalized conversation starters a sales rep can use. Reference the trade show, their role, company challenges, or matched criteria. Make them feel personalized, not generic.]

## Tier Justification
[Write a 2-3 sentence explanation of why this lead was assigned the ${personaMatch.tier} tier. Reference specific criteria matches/misses and explain the business opportunity or lack thereof.]

IMPORTANT:
- Be specific, not generic
- Focus on "why should sales contact this lead and what should they say?"
- Pain points should be informed by industry, company size, tech stack, and role
- Conversation starters should feel personalized (mention event, role, company specifics)
- Tier justification should clearly explain the scoring outcome

Output ONLY the structured content above, no preamble or additional commentary.`
  }

  /**
   * Parse Claude's response into structured format
   */
  private parseAnalysisResponse(responseText: string): PainPointAnalysis {
    const painPointsMatch = responseText.match(/##\s*Pain Points\s*\n([\s\S]*?)(?=##|$)/i)
    const conversationStartersMatch = responseText.match(/##\s*Conversation Starters\s*\n([\s\S]*?)(?=##|$)/i)
    const tierJustificationMatch = responseText.match(/##\s*Tier Justification\s*\n([\s\S]*?)(?=##|$)/i)

    const painPoints = painPointsMatch
      ? this.parseListItems(painPointsMatch[1])
      : []

    const conversationStarters = conversationStartersMatch
      ? this.parseListItems(conversationStartersMatch[1])
      : []

    const tierJustification = tierJustificationMatch
      ? tierJustificationMatch[1].trim()
      : 'Tier assigned based on persona fit score and data coverage.'

    return {
      painPoints,
      conversationStarters,
      tierJustification,
    }
  }

  /**
   * Parse markdown list items from text
   */
  private parseListItems(text: string): string[] {
    const items = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line))
      .map(line => line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, ''))
      .filter(line => line.length > 0)

    return items
  }

  /**
   * Generate fallback insights if Claude API fails
   */
  private generateFallbackInsights(
    badgeScan: BadgeScan,
    enrichedCompany: Partial<EnrichedCompany>,
    personaMatch: PersonaMatch
  ): PainPointAnalysis {
    const painPoints: string[] = []
    const conversationStarters: string[] = []

    if (enrichedCompany.industry) {
      painPoints.push(`${enrichedCompany.industry} industry challenges with digital transformation`)
    }

    if (enrichedCompany.employeeCount && enrichedCompany.employeeCount > 500) {
      painPoints.push('Scaling operations and maintaining efficiency at enterprise scale')
    }

    if (enrichedCompany.techStack && enrichedCompany.techStack.length > 0) {
      painPoints.push(`Managing and integrating ${enrichedCompany.techStack.length}+ technology platforms`)
    }

    conversationStarters.push(`Great meeting you at ${badgeScan.eventName}`)

    if (badgeScan.jobTitle) {
      conversationStarters.push(`As ${badgeScan.jobTitle}, you likely face [specific challenge]`)
    }

    if (badgeScan.notes) {
      conversationStarters.push(`Following up on our conversation about: ${badgeScan.notes.slice(0, 50)}...`)
    }

    const tierJustification = `Assigned ${personaMatch.tier} tier based on ${personaMatch.fitScore.toFixed(1)}% fit score against persona criteria.`

    return {
      painPoints: painPoints.length > 0 ? painPoints : ['General industry challenges', 'Growth and scalability needs', 'Technology optimization opportunities'],
      conversationStarters: conversationStarters.length > 0 ? conversationStarters : ['Follow up from trade show', 'Discuss industry challenges', 'Explore partnership opportunities'],
      tierJustification,
    }
  }
}

/**
 * Create a Pain Point Analyzer Agent instance
 */
export function createPainPointAnalyzerAgent(apiKey?: string): PainPointAnalyzerAgent {
  return new PainPointAnalyzerAgent(apiKey)
}
