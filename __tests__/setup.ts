import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Note: Real API keys are loaded from .env.local in test environment
// If you need to mock API calls, use vi.mock() in individual test files

// Mock fetch for API tests (to prevent actual API calls during tests)
global.fetch = vi.fn()
