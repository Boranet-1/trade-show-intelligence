/**
 * API Route Helpers
 *
 * Utilities for API response formatting and error handling with 3-part error messages.
 * Provides consistent response structure across all API routes.
 */

import { NextResponse } from 'next/server'
import type { APISuccessResponse, APIErrorResponse } from '@/lib/types'
import { formatAPIError, AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// Export alias for backward compatibility
export { formatAPIError as formatApiError }

/**
 * Create success response
 * @param data - Response data
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success payload
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<APISuccessResponse<T>> {
  const response: APISuccessResponse<T> = {
    success: true,
    data,
    message,
  }

  return NextResponse.json(response, { status })
}

/**
 * Create error response with 3-part format
 * @param error - Error object or message
 * @param status - HTTP status code (default: 500)
 * @returns NextResponse with error payload
 */
export function errorResponse(
  error: unknown,
  status?: number
): NextResponse<APIErrorResponse> {
  const formattedError = formatAPIError(error)

  // Determine status code
  let statusCode = status || 500
  if (error instanceof AppError) {
    statusCode = status || error.statusCode
  }

  // Log error
  if (error instanceof Error) {
    logger.error(`API Error: ${error.message}`, error, {
      statusCode,
      name: error.name,
    })
  } else {
    logger.error('API Error: Unknown error', undefined, { error, statusCode })
  }

  return NextResponse.json(formattedError, { status: statusCode })
}

/**
 * Create validation error response
 * @param message - Validation error message
 * @param details - Validation error details
 * @returns NextResponse with validation error
 */
export function validationErrorResponse(
  message: string,
  details?: unknown
): NextResponse<APIErrorResponse> {
  const response: APIErrorResponse = {
    success: false,
    error: {
      whatFailed: message,
      howToFix: 'Check the request body and ensure all required fields are provided with correct types',
      exampleFormat: 'See API documentation for correct request format',
      details,
    },
  }

  return NextResponse.json(response, { status: 400 })
}

/**
 * Create not found error response
 * @param resource - Resource type
 * @param id - Resource ID
 * @returns NextResponse with not found error
 */
export function notFoundResponse(
  resource: string,
  id?: string
): NextResponse<APIErrorResponse> {
  const message = id ? `${resource} not found: ${id}` : `${resource} not found`

  const response: APIErrorResponse = {
    success: false,
    error: {
      whatFailed: message,
      howToFix: 'Verify the resource ID is correct and the resource exists',
      exampleFormat: 'Use a valid UUID format: 12345678-1234-1234-1234-123456789012',
    },
  }

  return NextResponse.json(response, { status: 404 })
}

/**
 * Create unauthorized error response
 * @param message - Error message
 * @returns NextResponse with unauthorized error
 */
export function unauthorizedResponse(
  message: string = 'Authentication required'
): NextResponse<APIErrorResponse> {
  const response: APIErrorResponse = {
    success: false,
    error: {
      whatFailed: message,
      howToFix: 'Provide valid authentication credentials',
    },
  }

  return NextResponse.json(response, { status: 401 })
}

/**
 * Create forbidden error response
 * @param message - Error message
 * @returns NextResponse with forbidden error
 */
export function forbiddenResponse(
  message: string = 'Insufficient permissions'
): NextResponse<APIErrorResponse> {
  const response: APIErrorResponse = {
    success: false,
    error: {
      whatFailed: message,
      howToFix: 'Ensure you have the necessary permissions for this operation',
    },
  }

  return NextResponse.json(response, { status: 403 })
}

/**
 * Create rate limit error response
 * @param retryAfter - Seconds to wait before retrying
 * @returns NextResponse with rate limit error
 */
export function rateLimitResponse(
  retryAfter: number = 60
): NextResponse<APIErrorResponse> {
  const response: APIErrorResponse = {
    success: false,
    error: {
      whatFailed: 'Rate limit exceeded',
      howToFix: `Wait ${retryAfter} seconds before retrying or reduce request frequency`,
      details: { retryAfter },
    },
  }

  return NextResponse.json(response, {
    status: 429,
    headers: {
      'Retry-After': retryAfter.toString(),
    },
  })
}

/**
 * Parse and validate JSON request body
 * @param request - Request object
 * @returns Parsed JSON body
 * @throws Error if JSON parsing fails
 */
export async function parseRequestBody<T = unknown>(request: Request): Promise<T> {
  try {
    const body = await request.json()
    return body as T
  } catch (error) {
    throw new AppError('Invalid JSON in request body', 'INVALID_JSON', 400)
  }
}

/**
 * Get query parameter from URL
 * @param request - Request object
 * @param param - Parameter name
 * @returns Parameter value or null
 */
export function getQueryParam(request: Request, param: string): string | null {
  const url = new URL(request.url)
  return url.searchParams.get(param)
}

/**
 * Get all query parameters from URL
 * @param request - Request object
 * @returns Object with all query parameters
 */
export function getAllQueryParams(request: Request): Record<string, string> {
  const url = new URL(request.url)
  const params: Record<string, string> = {}

  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

/**
 * Validate required query parameters
 * @param request - Request object
 * @param requiredParams - Array of required parameter names
 * @throws Error if required parameters are missing
 */
export function validateQueryParams(request: Request, requiredParams: string[]): void {
  const missingParams = requiredParams.filter((param) => !getQueryParam(request, param))

  if (missingParams.length > 0) {
    throw new AppError(
      `Missing required query parameters: ${missingParams.join(', ')}`,
      'MISSING_QUERY_PARAMS',
      400,
      { missingParams }
    )
  }
}

/**
 * Wrap API handler with error handling
 * @param handler - API route handler function
 * @returns Wrapped handler with automatic error handling
 */
export function withErrorHandling(
  handler: (request: Request, context?: any) => Promise<NextResponse>
): (request: Request, context?: any) => Promise<NextResponse> {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * Create CORS headers for API responses
 * @param origin - Allowed origin (default: *)
 * @returns Headers object with CORS settings
 */
export function corsHeaders(origin: string = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 * @returns NextResponse for OPTIONS request
 */
export function handleCorsPreflightRequest(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}
