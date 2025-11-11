import { NextResponse } from 'next/server'
import { getConfig, checkLLMProviders } from '@/lib/config'

/**
 * Test API route to verify configuration and API keys
 * GET /api/test/config
 */
export async function GET() {
  try {
    // Validate environment configuration
    const config = getConfig()

    // Check LLM provider availability
    const providerStatus = checkLLMProviders()

    // Mask API keys for security (show only first 8 and last 4 characters)
    const maskApiKey = (key: string) => {
      if (!key || key.length < 12) return '***'
      return `${key.slice(0, 8)}...${key.slice(-4)}`
    }

    return NextResponse.json({
      success: true,
      environment: config.NODE_ENV,
      storageAdapter: config.STORAGE_ADAPTER,
      dataDirectory: config.DATA_DIRECTORY,
      llmProviders: {
        allConfigured: providerStatus.allConfigured,
        available: providerStatus.availableProviders,
        missing: providerStatus.missingProviders,
        keys: {
          anthropic: maskApiKey(config.ANTHROPIC_API_KEY || ''),
          openai: maskApiKey(config.OPENAI_API_KEY || ''),
          google: maskApiKey(config.GOOGLE_AI_API_KEY || config.GOOGLE_API_KEY || ''),
          openrouter: maskApiKey(config.OPENROUTER_API_KEY || ''),
        }
      },
      encryption: {
        keyConfigured: config.ENCRYPTION_KEY ? config.ENCRYPTION_KEY.length >= 32 : false,
        keyLength: config.ENCRYPTION_KEY ? config.ENCRYPTION_KEY.length : 0
      },
      additionalServices: {
        context7: config.CONTEXT7_APIKEY ? maskApiKey(config.CONTEXT7_APIKEY) : 'Not configured'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
