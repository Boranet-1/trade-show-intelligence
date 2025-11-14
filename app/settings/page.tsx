'use client'

/**
 * Settings Page (FR-029, FR-030)
 * Manage tags and lists for organizing badge scans
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TagManager } from '@/components/settings/tag-manager'
import { ListManager } from '@/components/settings/list-manager'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Tag, List } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('tags')

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage tags and lists to organize your trade show contacts
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Organization</CardTitle>
          <CardDescription>
            Use tags and lists to categorize and filter your badge scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="tags" className="gap-2">
                <Tag className="h-4 w-4" />
                Tag Management
              </TabsTrigger>
              <TabsTrigger value="lists" className="gap-2">
                <List className="h-4 w-4" />
                List Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tags" className="mt-0">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Tag Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage tags with custom colors to mark important contacts.
                  Tags can be applied manually to individual badge scans.
                </p>
              </div>
              <TagManager />
            </TabsContent>

            <TabsContent value="lists" className="mt-0">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">List Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create static lists (manually selected contacts) or dynamic lists
                  (automatically filtered by criteria like tier, industry, or technology).
                </p>
              </div>
              <ListManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What are Tags?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tags are labels you can apply to badge scans to mark them for special attention.
            For example: "VIP", "Follow Up", "Decision Maker".
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Static vs Dynamic Lists</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <strong>Static:</strong> Manually selected contacts. Great for custom follow-up lists.
            <br />
            <strong>Dynamic:</strong> Auto-updated based on filters (tier, industry, tech).
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            After enriching badge scans, apply tags and create lists to organize your outreach
            strategy. Export lists for use in your CRM or email marketing tools.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
