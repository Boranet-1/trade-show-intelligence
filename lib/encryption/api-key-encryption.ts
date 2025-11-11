/**
 * AES-256 API Key Encryption Utility
 *
 * Provides secure encryption and decryption of API keys using AES-256-GCM.
 * Keys are encrypted before storage and decrypted when needed.
 * Per FR-008 requirement for secure API key management.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { getEncryptionKey } from '@/lib/config'

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 16
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive encryption key from passphrase using scrypt
 * @param passphrase - Master encryption key from config
 * @param salt - Salt for key derivation
 * @returns Derived 32-byte key
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LENGTH)
}

/**
 * Encrypt API key using AES-256-GCM
 * @param apiKey - Plaintext API key to encrypt
 * @returns Encrypted API key in format: salt:iv:authTag:ciphertext (all base64)
 */
export function encryptApiKey(apiKey: string): string {
  try {
    const masterKey = getEncryptionKey()

    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH)
    const iv = randomBytes(IV_LENGTH)

    // Derive encryption key
    const key = deriveKey(masterKey, salt)

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv)

    // Encrypt
    const ciphertext = Buffer.concat([
      cipher.update(apiKey, 'utf8'),
      cipher.final(),
    ])

    // Get authentication tag
    const authTag = cipher.getAuthTag()

    // Combine salt, IV, authTag, and ciphertext
    // Format: salt:iv:authTag:ciphertext (all base64 encoded)
    const encrypted = [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':')

    return encrypted
  } catch (error) {
    throw new Error(`Failed to encrypt API key: ${error}`)
  }
}

/**
 * Decrypt API key using AES-256-GCM
 * @param encryptedKey - Encrypted API key in format: salt:iv:authTag:ciphertext
 * @returns Decrypted plaintext API key
 */
export function decryptApiKey(encryptedKey: string): string {
  try {
    const masterKey = getEncryptionKey()

    // Parse encrypted key components
    const parts = encryptedKey.split(':')
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted key format')
    }

    const [saltB64, ivB64, authTagB64, ciphertextB64] = parts

    // Decode from base64
    const salt = Buffer.from(saltB64, 'base64')
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(authTagB64, 'base64')
    const ciphertext = Buffer.from(ciphertextB64, 'base64')

    // Validate lengths
    if (salt.length !== SALT_LENGTH) {
      throw new Error('Invalid salt length')
    }
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length')
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length')
    }

    // Derive decryption key
    const key = deriveKey(masterKey, salt)

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    // Decrypt
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])

    return plaintext.toString('utf8')
  } catch (error) {
    throw new Error(`Failed to decrypt API key: ${error}`)
  }
}

/**
 * Mask API key for display
 * Shows only first 4 and last 4 characters
 * @param apiKey - API key to mask
 * @returns Masked API key (e.g., "sk-1234...7890")
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '****'
  }

  const first = apiKey.slice(0, 4)
  const last = apiKey.slice(-4)
  return `${first}...${last}`
}

/**
 * Validate API key format
 * Basic validation - actual validation happens on API call
 * @param apiKey - API key to validate
 * @param provider - Provider name for specific validation rules
 * @returns True if format appears valid
 */
export function validateApiKeyFormat(apiKey: string, provider?: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  // Minimum length check
  if (apiKey.length < 10) {
    return false
  }

  // Provider-specific validation
  if (provider) {
    switch (provider.toLowerCase()) {
      case 'anthropic':
      case 'claude':
        return apiKey.startsWith('sk-ant-')
      case 'openai':
      case 'gpt':
        return apiKey.startsWith('sk-')
      case 'google':
      case 'gemini':
        return apiKey.length >= 30 // Google API keys are typically 39 chars
      case 'perplexity':
        return apiKey.startsWith('pplx-')
      default:
        return true
    }
  }

  return true
}

/**
 * Securely compare two strings in constant time
 * Prevents timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings match
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Generate a secure random token
 * Useful for session tokens, API keys, etc.
 * @param length - Length in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * Hash sensitive data using SHA-256
 * Useful for storing API key hashes for validation without storing plaintext
 * @param data - Data to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashSensitiveData(data: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Encrypt multiple API keys
 * @param keys - Object with provider names as keys and API keys as values
 * @returns Object with encrypted API keys
 */
export function encryptApiKeys(keys: Record<string, string>): Record<string, string> {
  const encrypted: Record<string, string> = {}

  for (const [provider, key] of Object.entries(keys)) {
    if (key) {
      encrypted[provider] = encryptApiKey(key)
    }
  }

  return encrypted
}

/**
 * Decrypt multiple API keys
 * @param encryptedKeys - Object with provider names as keys and encrypted API keys as values
 * @returns Object with decrypted API keys
 */
export function decryptApiKeys(encryptedKeys: Record<string, string>): Record<string, string> {
  const decrypted: Record<string, string> = {}

  for (const [provider, encryptedKey] of Object.entries(encryptedKeys)) {
    if (encryptedKey) {
      try {
        decrypted[provider] = decryptApiKey(encryptedKey)
      } catch (error) {
        console.error(`Failed to decrypt ${provider} API key:`, error)
        decrypted[provider] = ''
      }
    }
  }

  return decrypted
}

/**
 * Test encryption/decryption roundtrip
 * Useful for validating encryption key
 * @returns True if encryption/decryption works correctly
 */
export function testEncryption(): boolean {
  try {
    const testData = 'test-api-key-12345'
    const encrypted = encryptApiKey(testData)
    const decrypted = decryptApiKey(encrypted)
    return testData === decrypted
  } catch (error) {
    console.error('Encryption test failed:', error)
    return false
  }
}
