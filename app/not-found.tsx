/**
 * 404 Not Found Page
 *
 * Custom 404 page with helpful navigation
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-2xl w-full p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
            <span className="text-4xl font-bold text-slate-400">404</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-slate-600 text-lg">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="mb-8">
          <svg
            className="mx-auto w-64 h-48 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <Link href="/dashboard">
            <Button className="w-full" size="lg">
              Go to Dashboard
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full" size="lg">
              Go to Home
            </Button>
          </Link>
        </div>

        <div className="pt-6 border-t">
          <p className="text-sm text-slate-600 mb-4">Popular pages:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="ghost" size="sm">
                Reports
              </Button>
            </Link>
            <Link href="/personas">
              <Button variant="ghost" size="sm">
                Personas
              </Button>
            </Link>
            <Link href="/test">
              <Button variant="ghost" size="sm">
                System Test
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
