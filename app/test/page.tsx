'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ConfigResponse {
  success: boolean
  environment?: string
  storageAdapter?: string
  llmProviders?: {
    allConfigured: boolean
    available: string[]
    missing: string[]
  }
  encryption?: {
    keyConfigured: boolean
  }
}

interface ConnectionResult {
  provider: string
  success: boolean
  status: string
  model?: string
  error?: string
}

export default function TestPage() {
  const [config, setConfig] = useState<ConfigResponse | null>(null)
  const [connections, setConnections] = useState<ConnectionResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      const response = await fetch('/api/test/config')
      const data = await response.json()
      setConfig(data)
    }

    fetchConfig()
  }, [])

  const testConnections = async () => {
    setLoading(true)
    const providers = ['anthropic', 'openai', 'google', 'openrouter']
    const results: ConnectionResult[] = []

    for (const provider of providers) {
      try {
        const response = await fetch(`/api/test/llm-connection?provider=${provider}`)
        const data = await response.json()
        results.push({
          provider,
          success: data.success,
          status: data.status,
          model: data.model,
          error: data.error
        })
      } catch (error) {
        results.push({
          provider,
          success: false,
          status: 'Failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setConnections(results)
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Trade Show Intelligence Platform</h1>
      <p className="text-muted-foreground mb-8">Setup Verification Dashboard</p>

      {/* Configuration Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>Current environment and storage settings</CardDescription>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Environment:</span>
                <Badge>{config.environment}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Storage Adapter:</span>
                <Badge variant="outline">{config.storageAdapter}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Encryption Key:</span>
                <Badge variant={config.encryption?.keyConfigured ? 'default' : 'destructive'}>
                  {config.encryption?.keyConfigured ? 'Configured' : 'Missing'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">LLM Providers:</span>
                <Badge variant={config.llmProviders?.allConfigured ? 'default' : 'secondary'}>
                  {config.llmProviders?.available.length || 0}/4 Configured
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading configuration...</p>
          )}
        </CardContent>
      </Card>

      {/* LLM Connection Tests */}
      <Card>
        <CardHeader>
          <CardTitle>LLM Provider Connections</CardTitle>
          <CardDescription>Test actual API connections to verify keys are working</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testConnections} disabled={loading} className="mb-4">
            {loading ? 'Testing Connections...' : 'Test All Connections'}
          </Button>

          {connections.length > 0 && (
            <div className="space-y-3">
              {connections.map((result) => (
                <div key={result.provider} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{result.provider}</p>
                    {result.model && <p className="text-xs text-muted-foreground">{result.model}</p>}
                    {result.error && <p className="text-xs text-destructive mt-1">{result.error.substring(0, 100)}...</p>}
                  </div>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {connections.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Click the button above to test API connections</p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mt-6 border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> The system requires at least 3/4 LLM providers for multi-LLM consensus.
            If Google Gemini fails, the system can still operate with Anthropic, OpenAI, and OpenRouter.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
