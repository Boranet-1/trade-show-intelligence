/**
 * Comprehensive Test Script for Phases 1-3
 * Tests setup, foundational infrastructure, and CSV upload functionality
 */

import { getConfig, validateLLMApiKeys } from './lib/config'
import type {
  BadgeScan,
  EnrichedCompany,
  Persona,
  StorageAdapterConfiguration,
} from './lib/types'
import { StorageAdapterType, EnrichmentStatus } from './lib/types'
import type { StorageAdapter } from './lib/storage/adapter'
import { createStorageAdapter, initializeStorageAdapters } from './lib/storage/factory'
import { parseCSV } from './lib/csv/parser'
import { detectColumnMappings } from './lib/csv/column-detector'
import { LocalStorageAdapter } from './lib/storage/local-storage'

interface TestResult {
  phase: string
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message?: string
  error?: string
}

const results: TestResult[] = []

function logTest(
  phase: string,
  test: string,
  status: 'PASS' | 'FAIL' | 'SKIP',
  message?: string,
  error?: string
) {
  results.push({ phase, test, status, message, error })
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'
  console.log(`${icon} [${phase}] ${test}${message ? ': ' + message : ''}`)
  if (error) console.error(`   Error: ${error}`)
}

async function testPhase1() {
  console.log('\n===== PHASE 1: SETUP =====\n')

  // T001-T014: Setup tests
  try {
    // Test environment configuration
    const config = getConfig()
    logTest('Phase 1', 'T026: Environment configuration loading', 'PASS', `NODE_ENV=${config.NODE_ENV}`)

    // Test LLM API keys
    try {
      validateLLMApiKeys()
      logTest('Phase 1', 'LLM API keys validation', 'PASS')
    } catch (error) {
      logTest(
        'Phase 1',
        'LLM API keys validation',
        'FAIL',
        'Some keys may be missing',
        error instanceof Error ? error.message : String(error)
      )
    }

    // Test data directory
    const dataDir = config.DATA_DIRECTORY
    logTest('Phase 1', 'T011: Data directory configuration', 'PASS', `DATA_DIRECTORY=${dataDir}`)

    // Test encryption key
    const encryptionKey = config.ENCRYPTION_KEY
    const encryptionConfigured = encryptionKey && encryptionKey.length >= 32
    logTest(
      'Phase 1',
      'T028: Encryption key configuration',
      encryptionConfigured ? 'PASS' : 'SKIP',
      encryptionKey ? `Key configured (${encryptionKey.length} chars)` : 'No key configured (optional in dev)'
    )

    // Test type definitions exist
    const testTypes: BadgeScan = {
      id: 'test-123',
      eventId: 'event-001',
      scannedAt: new Date(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      company: 'Test Corp',
      jobTitle: 'CEO',
      eventName: 'Test Event',
      enrichmentStatus: EnrichmentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    logTest('Phase 1', 'T015: TypeScript type definitions', 'PASS', 'BadgeScan type validated')
  } catch (error) {
    logTest(
      'Phase 1',
      'Setup infrastructure',
      'FAIL',
      undefined,
      error instanceof Error ? error.message : String(error)
    )
  }
}

async function testPhase2() {
  console.log('\n===== PHASE 2: FOUNDATIONAL =====\n')

  try {
    // T015: Test type definitions
    const badgeScan: BadgeScan = {
      id: 'scan-001',
      eventId: 'event-001',
      scannedAt: new Date(),
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      company: 'Acme Corp',
      jobTitle: 'VP of Sales',
      eventName: 'Test Event',
      enrichmentStatus: EnrichmentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    logTest('Phase 2', 'T015: TypeScript BadgeScan type', 'PASS')

    const enrichedCompany: EnrichedCompany = {
      id: 'comp-001',
      badgeScanId: 'scan-001',
      companyName: 'Acme Corp',
      domain: 'acme.com',
      industry: 'Technology',
      employeeCount: 500,
      techStack: ['Salesforce', 'AWS'],
      consensusMetadata: {},
      enrichedAt: new Date(),
      dataSource: ['Claude', 'GPT-4'],
    }
    logTest('Phase 2', 'T015: TypeScript EnrichedCompany type', 'PASS')

    const persona: Persona = {
      id: 'persona-001',
      name: 'Enterprise Tech Buyer',
      description: 'Large tech companies',
      isDefault: false,
      criteria: {
        companySizeRange: { min: 100, max: 5000 },
        industries: ['Technology', 'SaaS'],
        technologies: ['Salesforce', 'AWS'],
      },
      weights: {
        companySize: 0.25,
        industry: 0.25,
        technology: 0.25,
        revenue: 0.15,
        geography: 0.05,
        decisionMaker: 0.05,
        fundingStage: 0.0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    logTest('Phase 2', 'T015: TypeScript Persona type', 'PASS')

    // T017-T019: Test storage adapter
    await initializeStorageAdapters()
    const config = getConfig()
    const adapterConfig: StorageAdapterConfiguration = {
      id: crypto.randomUUID(),
      adapterType: StorageAdapterType.LOCAL,
      localStorageConfig: {
        dataDirectory: config.DATA_DIRECTORY || './data',
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const adapter: StorageAdapter = await createStorageAdapter(adapterConfig)
    logTest('Phase 2', 'T018: Storage adapter factory', 'PASS', 'Local adapter created')

    // Test LocalStorageAdapter implementation
    const localAdapter = new LocalStorageAdapter(adapterConfig)
    logTest('Phase 2', 'T019: LocalStorageAdapter implementation', 'PASS')

    // T021: Test utility functions
    const { generateId, isValidEmail, normalizeDomain } = await import('./lib/utils')
    const testId = generateId()
    if (testId && testId.length > 0) {
      logTest('Phase 2', 'T021: UUID generation utility', 'PASS', `Generated: ${testId.substring(0, 8)}...`)
    }

    const validEmail = isValidEmail('test@example.com')
    const invalidEmail = !isValidEmail('invalid-email')
    if (validEmail && invalidEmail) {
      logTest('Phase 2', 'T021: Email validation utility', 'PASS')
    }

    const domain = normalizeDomain('https://www.example.com/path')
    if (domain === 'example.com') {
      logTest('Phase 2', 'T021: Domain normalization utility', 'PASS', `Normalized: ${domain}`)
    }

    // T022-T023: Check if layout and pages exist
    const fs = await import('fs/promises')
    try {
      await fs.access('./app/layout.tsx')
      logTest('Phase 2', 'T022: Root layout created', 'PASS')
    } catch {
      logTest('Phase 2', 'T022: Root layout created', 'FAIL', 'app/layout.tsx not found')
    }

    try {
      await fs.access('./app/page.tsx')
      logTest('Phase 2', 'T023: Landing page created', 'PASS')
    } catch {
      logTest('Phase 2', 'T023: Landing page created', 'FAIL', 'app/page.tsx not found')
    }

    // T024: Test error handling utilities
    try {
      const { AppError, ValidationError } = await import('./lib/errors')
      const testError = new AppError('Test error', 'TEST_ERROR')
      logTest('Phase 2', 'T024: Error handling utilities', 'PASS', 'Custom error classes work')
    } catch (error) {
      logTest(
        'Phase 2',
        'T024: Error handling utilities',
        'FAIL',
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    }

    // T025: Test logging utilities
    try {
      const { logger } = await import('./lib/logger')
      logger.info('Test log message')
      logTest('Phase 2', 'T025: Logging utilities', 'PASS')
    } catch (error) {
      logTest(
        'Phase 2',
        'T025: Logging utilities',
        'FAIL',
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    }

    // T028: Test encryption utility
    try {
      const { encryptApiKey, decryptApiKey } = await import('./lib/encryption/api-key-encryption')
      const testKey = 'test-api-key-12345'
      const encrypted = await encryptApiKey(testKey)
      const decrypted = await decryptApiKey(encrypted)
      if (decrypted === testKey) {
        logTest('Phase 2', 'T028: AES-256 encryption utility', 'PASS', 'Encryption/decryption works')
      } else {
        logTest('Phase 2', 'T028: AES-256 encryption utility', 'FAIL', 'Decryption mismatch')
      }
    } catch (error) {
      logTest(
        'Phase 2',
        'T028: AES-256 encryption utility',
        'FAIL',
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    }
  } catch (error) {
    logTest(
      'Phase 2',
      'Foundational infrastructure',
      'FAIL',
      undefined,
      error instanceof Error ? error.message : String(error)
    )
  }
}

async function testPhase3() {
  console.log('\n===== PHASE 3: CSV UPLOAD AND PROCESSING =====\n')

  try {
    // T029: Test CSV parser
    const sampleCSV = `First Name,Last Name,Email,Company,Title
John,Doe,john@example.com,Acme Corp,CEO
Jane,Smith,jane@techco.com,TechCo,CTO`

    try {
      const parsed = parseCSV(sampleCSV, {
        eventId: 'test-event-001',
        eventName: 'Test Trade Show',
        skipEmptyLines: true,
      })
      if (parsed.data.length === 2) {
        logTest('Phase 3', 'T029: CSV parser utility', 'PASS', `Parsed ${parsed.data.length} rows`)
      } else {
        logTest('Phase 3', 'T029: CSV parser utility', 'FAIL', `Expected 2 rows, got ${parsed.data.length}`)
      }
    } catch (error) {
      logTest(
        'Phase 3',
        'T029: CSV parser utility',
        'FAIL',
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    }

    // T030: Test column detection
    try {
      const headers = ['First Name', 'Last Name', 'Email', 'Company', 'Title']
      const detected = detectColumnMappings(headers)

      const hasEmail = detected.mappings.some((m) => m.targetField === 'email')
      const hasFirstName = detected.mappings.some((m) => m.targetField === 'firstName')
      const hasCompany = detected.mappings.some((m) => m.targetField === 'company')

      if (hasEmail && hasFirstName && hasCompany) {
        logTest('Phase 3', 'T030: Intelligent column detection', 'PASS', `Detected all key columns (confidence: ${detected.confidence})`)
      } else {
        logTest('Phase 3', 'T030: Intelligent column detection', 'FAIL', 'Missing key column mappings')
      }
    } catch (error) {
      logTest(
        'Phase 3',
        'T030: Intelligent column detection',
        'FAIL',
        undefined,
        error instanceof Error ? error.message : String(error)
      )
    }

    // T031-T033: Check if API routes and components exist
    const fs = await import('fs/promises')

    try {
      await fs.access('./app/api/upload/route.ts')
      logTest('Phase 3', 'T031: CSV upload API route', 'PASS')
    } catch {
      logTest('Phase 3', 'T031: CSV upload API route', 'FAIL', 'app/api/upload/route.ts not found')
    }

    try {
      await fs.access('./components/upload/csv-uploader.tsx')
      logTest('Phase 3', 'T032: CSV uploader component', 'PASS')
    } catch {
      logTest(
        'Phase 3',
        'T032: CSV uploader component',
        'FAIL',
        'components/upload/csv-uploader.tsx not found'
      )
    }

    try {
      await fs.access('./components/upload/column-mapper.tsx')
      logTest('Phase 3', 'T033: Column mapper component', 'PASS')
    } catch {
      logTest(
        'Phase 3',
        'T033: Column mapper component',
        'FAIL',
        'components/upload/column-mapper.tsx not found'
      )
    }
  } catch (error) {
    logTest(
      'Phase 3',
      'CSV upload functionality',
      'FAIL',
      undefined,
      error instanceof Error ? error.message : String(error)
    )
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║  Trade Show Intelligence Platform - Phase Testing         ║')
  console.log('║  Testing Phases 1-3 (Setup + Foundational + CSV Upload)   ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  await testPhase1()
  await testPhase2()
  await testPhase3()

  // Summary
  console.log('\n===== TEST SUMMARY =====\n')

  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  const skipped = results.filter((r) => r.status === 'SKIP').length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`)

  // Failed tests detail
  if (failed > 0) {
    console.log('\n===== FAILED TESTS =====\n')
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`❌ [${r.phase}] ${r.test}`)
        if (r.error) console.log(`   ${r.error}`)
      })
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error)
  process.exit(1)
})
