/**
 * Root Loading State
 *
 * Displays while pages are loading
 */

import { Card } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Loading...</h2>
            <p className="text-sm text-slate-600">Please wait while we load your content</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
