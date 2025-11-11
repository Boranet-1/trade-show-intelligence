/**
 * Environment Configuration Validation
 *
 * Validates and provides typed access to environment variables.
 * Uses Zod for runtime validation.
 */

import { z } from 'zod'

/**
 * Environment configuration schema
 */
const EnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Application
  PORT: z.string().default('3000').transform(Number).pipe(z.number().int().min(1).max(65535)),
  DATA_DIRECTORY: z.string().default('./data'),
  STORAGE_ADAPTER: z.enum(['LOCAL', 'MYSQL', 'HUBSPOT']).default('LOCAL'),

  // LLM API Keys (optional for development, required for production)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  CONTEXT7_APIKEY: z.string().optional(),

  // Storage (MySQL)
  MYSQL_HOST: z.string().optional(),
  MYSQL_PORT: z.string().optional().transform((val) => val ? Number(val) : undefined).pipe(z.number().int().min(1).max(65535).optional()),
  MYSQL_DATABASE: z.string().optional(),
  MYSQL_USERNAME: z.string().optional(),
  MYSQL_PASSWORD: z.string().optional(),
  MYSQL_CONNECTION_POOL_SIZE: z.string().optional().transform((val) => val ? Number(val) : undefined).pipe(z.number().int().min(1).max(100).optional()),

  // Storage (HubSpot)
  HUBSPOT_API_KEY: z.string().optional(),
  HUBSPOT_PORTAL_ID: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32).optional(), // AES-256 requires 32-byte key

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Rate limiting (optional)
  RATE_LIMIT_MAX_REQUESTS: z.string().optional().transform((val) => val ? Number(val) : undefined).pipe(z.number().int().min(1).optional()),
  RATE_LIMIT_WINDOW_MS: z.string().optional().transform((val) => val ? Number(val) : undefined).pipe(z.number().int().min(1000).optional()),

  // Features flags (optional)
  ENABLE_ENRICHMENT: z.enum(['true', 'false']).default('true').transform((val) => val === 'true'),
  ENABLE_MOCK_ENRICHMENT: z.enum(['true', 'false']).default('false').transform((val) => val === 'true'),
  ENABLE_HUBSPOT: z.enum(['true', 'false']).default('false').transform((val) => val === 'true'),
  ENABLE_MYSQL: z.enum(['true', 'false']).default('false').transform((val) => val === 'true'),
})

export type EnvConfig = z.infer<typeof EnvSchema>

/**
 * Validated environment configuration
 */
let config: EnvConfig | null = null

/**
 * Load and validate environment configuration
 * @returns Validated configuration
 * @throws Error if validation fails
 */
export function loadConfig(): EnvConfig {
  if (config) {
    return config
  }

  try {
    const parsed = EnvSchema.parse(process.env)
    config = parsed
    return config
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((err) => {
        const path = err.path.join('.')
        return `  - ${path}: ${err.message}`
      })

      throw new Error(
        `Environment configuration validation failed:\n${messages.join('\n')}\n\n` +
        'Please check your .env file and ensure all required variables are set correctly.'
      )
    }
    throw error
  }
}

/**
 * Get configuration value
 * Loads config on first access
 */
export function getConfig(): EnvConfig {
  if (!config) {
    config = loadConfig()
  }
  return config
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getConfig().NODE_ENV === 'production'
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getConfig().NODE_ENV === 'development'
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return getConfig().NODE_ENV === 'test'
}

/**
 * Validate required LLM API keys
 * @throws Error if keys are missing in production
 */
export function validateLLMApiKeys(): void {
  const config = getConfig()

  if (isProduction() && !config.ENABLE_ENRICHMENT) {
    return // Enrichment disabled, no need to validate
  }

  const missingKeys: string[] = []

  if (!config.ANTHROPIC_API_KEY) missingKeys.push('ANTHROPIC_API_KEY')
  if (!config.OPENAI_API_KEY) missingKeys.push('OPENAI_API_KEY')
  if (!config.GOOGLE_API_KEY) missingKeys.push('GOOGLE_API_KEY')
  if (!config.PERPLEXITY_API_KEY) missingKeys.push('PERPLEXITY_API_KEY')

  if (isProduction() && missingKeys.length > 0) {
    throw new Error(
      `Missing required LLM API keys in production:\n${missingKeys.map(k => `  - ${k}`).join('\n')}\n\n` +
      'Set these in your .env file or environment variables.'
    )
  }

  if (isDevelopment() && missingKeys.length > 0) {
    console.warn(
      `⚠️  Warning: Missing LLM API keys (enrichment may not work):\n${missingKeys.map(k => `  - ${k}`).join('\n')}`
    )
  }
}

/**
 * Validate MySQL configuration
 * @throws Error if MySQL is enabled but configuration is incomplete
 */
export function validateMySQLConfig(): void {
  const config = getConfig()

  if (!config.ENABLE_MYSQL) {
    return
  }

  const requiredFields = [
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_DATABASE',
    'MYSQL_USERNAME',
    'MYSQL_PASSWORD',
  ]

  const missingFields = requiredFields.filter((field) => !config[field as keyof EnvConfig])

  if (missingFields.length > 0) {
    throw new Error(
      `MySQL is enabled but configuration is incomplete. Missing:\n${missingFields.map(f => `  - ${f}`).join('\n')}`
    )
  }
}

/**
 * Validate HubSpot configuration
 * @throws Error if HubSpot is enabled but configuration is incomplete
 */
export function validateHubSpotConfig(): void {
  const config = getConfig()

  if (!config.ENABLE_HUBSPOT) {
    return
  }

  if (!config.HUBSPOT_API_KEY || !config.HUBSPOT_PORTAL_ID) {
    throw new Error(
      'HubSpot is enabled but configuration is incomplete. Required:\n' +
      '  - HUBSPOT_API_KEY\n' +
      '  - HUBSPOT_PORTAL_ID'
    )
  }
}

/**
 * Validate encryption key
 * @throws Error if encryption key is missing or invalid
 */
export function validateEncryptionKey(): void {
  const config = getConfig()

  if (!config.ENCRYPTION_KEY) {
    if (isProduction()) {
      throw new Error(
        'ENCRYPTION_KEY is required in production for API key encryption.\n' +
        'Generate a 32-byte key using: openssl rand -hex 32'
      )
    } else {
      console.warn('⚠️  Warning: ENCRYPTION_KEY not set. Using default key (not secure for production).')
    }
  } else if (config.ENCRYPTION_KEY.length < 32) {
    throw new Error(
      `ENCRYPTION_KEY must be at least 32 characters (current: ${config.ENCRYPTION_KEY.length}).\n` +
      'Generate a secure key using: openssl rand -hex 32'
    )
  }
}

/**
 * Validate all configuration
 * Should be called at application startup
 */
export function validateAllConfig(): void {
  loadConfig() // Ensure config is loaded

  validateLLMApiKeys()
  validateMySQLConfig()
  validateHubSpotConfig()
  validateEncryptionKey()
}

/**
 * Get encryption key with fallback
 */
export function getEncryptionKey(): string {
  const config = getConfig()

  if (config.ENCRYPTION_KEY) {
    return config.ENCRYPTION_KEY
  }

  // Fallback for development only
  if (!isProduction()) {
    return 'dev-encryption-key-not-for-production-12345678'
  }

  throw new Error('ENCRYPTION_KEY is required in production')
}

/**
 * Check LLM provider availability
 * @returns Status of configured LLM providers
 */
export function checkLLMProviders() {
  const config = getConfig()

  const providers = [
    { name: 'anthropic', key: config.ANTHROPIC_API_KEY },
    { name: 'openai', key: config.OPENAI_API_KEY },
    { name: 'google', key: config.GOOGLE_API_KEY },
    { name: 'perplexity', key: config.PERPLEXITY_API_KEY },
  ]

  const availableProviders = providers.filter(p => p.key).map(p => p.name)
  const missingProviders = providers.filter(p => !p.key).map(p => p.name)

  return {
    allConfigured: missingProviders.length === 0,
    availableProviders,
    missingProviders,
  }
}
