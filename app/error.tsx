'use client'

/**
 * Root Error Boundary
 *
 * Catches and handles errors at the root level
 * Provides user-friendly error messages and recovery options
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Root error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-2xl w-full p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-slate-600">
            We encountered an unexpected error. Don't worry, your data is safe.
          </p>
        </div>

        <Alert variant="destructive" className="mb-6">
          <div>
            <p className="font-semibold mb-1">Error Details:</p>
            <p className="text-sm font-mono">{error.message || 'Unknown error occurred'}</p>
            {error.digest && (
              <p className="text-xs mt-2 opacity-75">Error ID: {error.digest}</p>
            )}
          </div>
        </Alert>

        <div className="space-y-3">
          <Button onClick={reset} className="w-full" size="lg">
            Try Again
          </Button>

          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full" size="lg">
              Go to Dashboard
            </Button>
          </Link>

          <Link href="/" className="block">
            <Button variant="ghost" className="w-full">
              Go to Home
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-slate-600 mb-3">Common solutions:</p>
          <ul className="text-sm text-slate-600 space-y-1 text-left max-w-md mx-auto">
            <li>• Refresh the page and try again</li>
            <li>• Clear your browser cache</li>
            <li>• Check your internet connection</li>
            <li>• Try a different browser</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            If the problem persists, please contact support with the error ID above.
          </p>
        </div>
      </Card>
    </div>
  )
}
