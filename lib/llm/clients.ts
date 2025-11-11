/**
 * LLM Provider Clients
 *
 * Unified interface for multiple LLM providers
 * Used for multi-LLM consensus in enrichment pipeline
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getConfig } from '@/lib/config'

export interface LLMResponse {
  content: string
  provider: string
  model: string
  tokensUsed?: number
}

export interface LLMError {
  provider: string
  error: string
  retryable: boolean
}

/**
 * Anthropic Claude Client
 */
export class ClaudeClient {
  private client: Anthropic
  private model = 'claude-3-7-sonnet-20250219'

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      return {
        content: content.text,
        provider: 'anthropic',
        model: this.model,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      }
    } catch (error: any) {
      throw new Error(`Claude API error: ${error.message}`)
    }
  }
}

/**
 * OpenAI GPT-4 Client
 */
export class OpenAIClient {
  private client: OpenAI
  private model = 'gpt-4o'

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }

      messages.push({ role: 'user', content: prompt })

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
      })

      const choice = response.choices[0]
      if (!choice.message.content) {
        throw new Error('No content in OpenAI response')
      }

      return {
        content: choice.message.content,
        provider: 'openai',
        model: this.model,
        tokensUsed: response.usage?.total_tokens,
      }
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.message}`)
    }
  }
}

/**
 * Google Gemini Client
 */
export class GeminiClient {
  private client: GoogleGenerativeAI
  private model = 'gemini-2.0-flash-exp'

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model })

      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt

      const result = await model.generateContent(fullPrompt)
      const response = result.response
      const content = response.text()

      if (!content) {
        throw new Error('No content in Gemini response')
      }

      return {
        content,
        provider: 'google',
        model: this.model,
      }
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`)
    }
  }
}

/**
 * OpenRouter Client (uses OpenAI-compatible API)
 */
export class OpenRouterClient {
  private client: OpenAI
  private model = 'anthropic/claude-3.5-sonnet'

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  }

  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }

      messages.push({ role: 'user', content: prompt })

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
      })

      const choice = response.choices[0]
      if (!choice.message.content) {
        throw new Error('No content in OpenRouter response')
      }

      return {
        content: choice.message.content,
        provider: 'openrouter',
        model: this.model,
        tokensUsed: response.usage?.total_tokens,
      }
    } catch (error: any) {
      throw new Error(`OpenRouter API error: ${error.message}`)
    }
  }
}

/**
 * Create LLM clients from configuration
 */
export function createLLMClients(): {
  claude?: ClaudeClient
  openai?: OpenAIClient
  gemini?: GeminiClient
  openrouter?: OpenRouterClient
} {
  const config = getConfig()
  const clients: any = {}

  if (config.ANTHROPIC_API_KEY) {
    clients.claude = new ClaudeClient(config.ANTHROPIC_API_KEY)
  }

  if (config.OPENAI_API_KEY) {
    clients.openai = new OpenAIClient(config.OPENAI_API_KEY)
  }

  if (config.GOOGLE_AI_API_KEY) {
    clients.gemini = new GeminiClient(config.GOOGLE_AI_API_KEY)
  }

  if (config.OPENROUTER_API_KEY) {
    clients.openrouter = new OpenRouterClient(config.OPENROUTER_API_KEY)
  }

  return clients
}

/**
 * Execute LLM call with retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Don't retry on auth errors
      if (
        error.message?.includes('401') ||
        error.message?.includes('403') ||
        error.message?.includes('invalid api key')
      ) {
        throw error
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
