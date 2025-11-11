/**
 * Error Handling Utilities
 *
 * Custom error classes and CSV validation error formatting with 3-part structure.
 * Supports structured error responses for API routes.
 */

import type { CSVValidationError, APIErrorResponse } from '@/lib/types'

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'APP_ERROR',
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Validation error for user input
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Storage adapter error
 */
export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'STORAGE_ERROR', 500, details)
    this.name = 'StorageError'
  }
}

/**
 * Enrichment processing error
 */
export class EnrichmentError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'ENRICHMENT_ERROR', 500, details)
    this.name = 'EnrichmentError'
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 'AUTH_ERROR', 401, details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: unknown) {
    super(message, 'AUTHZ_ERROR', 403, details)
    this.name = 'AuthorizationError'
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

/**
 * CSV validation error formatter with 3-part structure per FR-014
 */
export class CSVValidationErrorFormatter {
  /**
   * Create a CSV validation error
   * @param row - Row number (1-indexed)
   * @param field - Field name
   * @param whatFailed - What validation failed
   * @param howToFix - How to fix the issue
   * @param exampleFormat - Example of correct format
   * @returns CSV validation error
   */
  static create(
    row: number,
    field: string,
    whatFailed: string,
    howToFix: string,
    exampleFormat: string
  ): CSVValidationError {
    return {
      row,
      field,
      whatFailed,
      howToFix,
      exampleFormat,
    }
  }

  /**
   * Create missing required field error
   */
  static missingRequiredField(row: number, field: string): CSVValidationError {
    return this.create(
      row,
      field,
      `Required field "${field}" is missing or empty`,
      `Provide a value for the "${field}" column`,
      this.getExampleFormat(field)
    )
  }

  /**
   * Create invalid email error
   */
  static invalidEmail(row: number, field: string, value: string): CSVValidationError {
    return this.create(
      row,
      field,
      `Invalid email address: "${value}"`,
      'Provide a valid email address with format: name@domain.com',
      'john.doe@company.com'
    )
  }

  /**
   * Create invalid phone error
   */
  static invalidPhone(row: number, field: string, value: string): CSVValidationError {
    return this.create(
      row,
      field,
      `Invalid phone number format: "${value}"`,
      'Provide a phone number with country code and digits',
      '+1-555-123-4567'
    )
  }

  /**
   * Create invalid date error
   */
  static invalidDate(row: number, field: string, value: string): CSVValidationError {
    return this.create(
      row,
      field,
      `Invalid date format: "${value}"`,
      'Provide a date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)',
      '2025-11-09 or 2025-11-09T10:30:00Z'
    )
  }

  /**
   * Create field too long error
   */
  static fieldTooLong(
    row: number,
    field: string,
    maxLength: number,
    actualLength: number
  ): CSVValidationError {
    return this.create(
      row,
      field,
      `Field exceeds maximum length of ${maxLength} characters (current: ${actualLength})`,
      `Shorten the value to ${maxLength} characters or less`,
      `Max ${maxLength} characters`
    )
  }

  /**
   * Create duplicate value error
   */
  static duplicateValue(
    row: number,
    field: string,
    value: string,
    duplicateRow: number
  ): CSVValidationError {
    return this.create(
      row,
      field,
      `Duplicate value "${value}" found (also in row ${duplicateRow})`,
      'Ensure each value is unique or resolve the duplicate entry',
      'Unique value required'
    )
  }

  /**
   * Get example format for common fields
   */
  private static getExampleFormat(field: string): string {
    const examples: Record<string, string> = {
      email: 'john.doe@company.com',
      phone: '+1-555-123-4567',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corporation',
      jobTitle: 'VP of Engineering',
      scannedAt: '2025-11-09T10:30:00Z',
      boothLocation: 'Booth 123',
      eventName: 'AWS re:Invent 2025',
    }

    return examples[field] || 'Valid value'
  }
}

/**
 * Format error for API response with 3-part structure
 */
export function formatAPIError(error: unknown): APIErrorResponse {
  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        whatFailed: error.message,
        howToFix: getFixSuggestion(error),
        exampleFormat: getExampleFormat(error),
        details: error.details,
      },
    }
  }

  // Handle validation errors from Zod or other validators
  if (error instanceof Error && error.name === 'ZodError') {
    return {
      success: false,
      error: {
        whatFailed: 'Request validation failed',
        howToFix: 'Check the request body and ensure all required fields are provided with correct types',
        details: error,
      },
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        whatFailed: error.message,
        howToFix: 'Check the error message and try again',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    }
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      whatFailed: 'An unexpected error occurred',
      howToFix: 'Please try again or contact support if the problem persists',
    },
  }
}

/**
 * Get fix suggestion based on error type
 */
function getFixSuggestion(error: AppError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Check your input data and ensure all required fields are provided with correct formats'
    case 'STORAGE_ERROR':
      return 'Verify storage configuration and ensure the storage backend is accessible'
    case 'ENRICHMENT_ERROR':
      return 'Check API keys for LLM providers and ensure rate limits are not exceeded'
    case 'AUTH_ERROR':
      return 'Provide valid authentication credentials'
    case 'AUTHZ_ERROR':
      return 'Ensure you have the necessary permissions for this operation'
    case 'NOT_FOUND':
      return 'Verify the resource ID is correct and the resource exists'
    case 'RATE_LIMIT':
      return 'Wait before retrying or reduce request frequency'
    default:
      return 'Review the error message and try again'
  }
}

/**
 * Get example format based on error type
 */
function getExampleFormat(error: AppError): string | undefined {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'See API documentation for correct request format'
    case 'NOT_FOUND':
      return 'Use a valid UUID format: 12345678-1234-1234-1234-123456789012'
    default:
      return undefined
  }
}

/**
 * Check if error is a specific type
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}
