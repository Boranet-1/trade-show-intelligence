import { NextResponse } from 'next/server'
import { getConfig } from '@/lib/config'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Test API route to verify LLM provider connections
 * GET /api/test/llm-connection?provider=anthropic|openai|google|openrouter
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider') || 'anthropic'

  try {
    const config = getConfig()
    let result: { provider: string; status: string; model?: string; error?: string }

    switch (provider) {
      case 'anthropic': {
        if (!config.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY not configured')
        }
        const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
        await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "OK"' }]
        })
        result = {
          provider: 'Anthropic Claude',
          status: 'Connected',
          model: 'claude-sonnet-4-5-20250929'
        }
        break
      }

      case 'openai': {
        if (!config.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY not configured')
        }
        const client = new OpenAI({ apiKey: config.OPENAI_API_KEY })
        await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "OK"' }]
        })
        result = {
          provider: 'OpenAI GPT-4',
          status: 'Connected',
          model: 'gpt-4o-mini'
        }
        break
      }

      case 'google': {
        if (!config.GOOGLE_AI_API_KEY) {
          throw new Error('GOOGLE_AI_API_KEY not configured')
        }
        const genAI = new GoogleGenerativeAI(config.GOOGLE_AI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        await model.generateContent('Say "OK"')
        result = {
          provider: 'Google Gemini',
          status: 'Connected',
          model: 'gemini-2.5-flash'
        }
        break
      }

      case 'openrouter': {
        if (!config.OPENROUTER_API_KEY) {
          throw new Error('OPENROUTER_API_KEY not configured')
        }
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
          },
          body: JSON.stringify({
            model: 'perplexity/sonar-pro',
            messages: [{ role: 'user', content: 'Say "OK"' }],
            max_tokens: 10
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`OpenRouter API error: ${error}`)
        }

        result = {
          provider: 'OpenRouter',
          status: 'Connected',
          model: 'perplexity/sonar-pro'
        }
        break
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid provider. Use: anthropic, openai, google, or openrouter'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      provider,
      status: 'Failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
