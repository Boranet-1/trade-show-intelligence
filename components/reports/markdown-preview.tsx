'use client'

/**
 * Markdown Preview Component
 * Displays markdown content with optional side-by-side editing
 * Supports copy-to-clipboard and download functionality
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Copy,
  Download,
  FileText,
  Eye,
  Code,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface MarkdownPreviewProps {
  /** The markdown content to display */
  content: string
  /** Optional title for the preview */
  title?: string
  /** Report type badge */
  reportType?: 'CROSummary' | 'CompanySummary' | 'ContactSummary' | 'MergedReport'
  /** Whether to show tabs for raw/preview toggle */
  showTabs?: boolean
  /** Whether to show download/copy actions */
  showActions?: boolean
  /** Optional download handler */
  onDownload?: (format: 'markdown' | 'pdf') => void
  /** Optional download URLs */
  markdownUrl?: string
  pdfUrl?: string
  /** Generated timestamp */
  generatedAt?: Date
  /** Version number */
  version?: number
  /** Custom className */
  className?: string
}

export function MarkdownPreview({
  content,
  title,
  reportType,
  showTabs = true,
  showActions = true,
  onDownload,
  markdownUrl,
  pdfUrl,
  generatedAt,
  version,
  className = '',
}: MarkdownPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview')

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('Copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDownload = (format: 'markdown' | 'pdf') => {
    if (onDownload) {
      onDownload(format)
      return
    }

    // Fallback: direct download via URL
    if (format === 'markdown' && markdownUrl) {
      window.open(markdownUrl, '_blank')
    } else if (format === 'pdf' && pdfUrl) {
      window.open(pdfUrl, '_blank')
    }
  }

  const getReportTypeBadgeVariant = (type?: string) => {
    switch (type) {
      case 'CROSummary':
        return 'default'
      case 'CompanySummary':
        return 'secondary'
      case 'ContactSummary':
        return 'outline'
      case 'MergedReport':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getReportTypeLabel = (type?: string) => {
    switch (type) {
      case 'CROSummary':
        return 'CRO Summary'
      case 'CompanySummary':
        return 'Company Summary'
      case 'ContactSummary':
        return 'Contact Summary'
      case 'MergedReport':
        return 'Merged Report'
      default:
        return 'Report'
    }
  }

  const renderMarkdownAsHTML = (markdown: string): string => {
    // Basic markdown to HTML conversion
    // For production, this should use a proper markdown library like 'react-markdown'
    let html = markdown
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*\*\*(.*?)\*\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^\- (.*?)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*?)$/gm, '<li>$2</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n\n/g, '</p><p>')

    // Wrap lists
    html = html.replace(/(<li>.*?<\/li>)/gs, (match) => {
      if (!match.includes('<ol>') && !match.includes('<ul>')) {
        return '<ul>' + match + '</ul>'
      }
      return match
    })

    // Wrap paragraphs
    if (!html.startsWith('<h') && !html.startsWith('<ul>') && !html.startsWith('<ol>')) {
      html = '<p>' + html + '</p>'
    }

    return html
  }

  return (
    <Card className={`${className}`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            <div className="flex items-center gap-2 mt-1">
              {reportType && (
                <Badge variant={getReportTypeBadgeVariant(reportType)}>
                  {getReportTypeLabel(reportType)}
                </Badge>
              )}
              {version && (
                <span className="text-xs text-muted-foreground">v{version}</span>
              )}
              {generatedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyToClipboard}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload('markdown')}
            >
              <Download className="h-4 w-4 mr-2" />
              MD
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleDownload('pdf')}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {showTabs ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'raw')}>
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="raw">
                <Code className="h-4 w-4 mr-2" />
                Raw Markdown
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="preview" className="p-4">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderMarkdownAsHTML(content) }}
            />
          </TabsContent>

          <TabsContent value="raw" className="p-4">
            <pre className="p-4 bg-gray-50 rounded-lg overflow-auto max-h-[600px] text-sm font-mono">
              <code>{content}</code>
            </pre>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="p-4">
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderMarkdownAsHTML(content) }}
          />
        </div>
      )}
    </Card>
  )
}

/**
 * Compact Markdown Preview for Lists
 */
export function MarkdownPreviewCompact({
  content,
  title,
  reportType,
  markdownUrl,
  pdfUrl,
}: Omit<MarkdownPreviewProps, 'showTabs' | 'showActions'>) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="font-medium text-sm">{title || 'Report'}</p>
          {reportType && (
            <Badge variant="outline" className="text-xs mt-1">
              {reportType}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {markdownUrl && (
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={markdownUrl} download>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
        {pdfUrl && (
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={pdfUrl} download>
              <FileText className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Side-by-Side Markdown Editor/Preview
 */
export function MarkdownEditor({
  content,
  onChange,
  title,
}: {
  content: string
  onChange: (content: string) => void
  title?: string
}) {
  return (
    <Card>
      {title && (
        <div className="p-4 border-b">
          <h3 className="font-semibold">{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-2 divide-x">
        {/* Editor */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Code className="h-4 w-4" />
            <span>Edit</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-[500px] p-4 font-mono text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter markdown content..."
          />
        </div>

        {/* Preview */}
        <div className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </div>
          <div
            className="prose prose-sm max-w-none dark:prose-invert h-[500px] overflow-auto p-4 border rounded-lg"
            dangerouslySetInnerHTML={{
              __html: content
                ? new MarkdownPreview({ content, showTabs: false, showActions: false }).props.children
                : '<p class="text-muted-foreground">Preview will appear here...</p>'
            }}
          />
        </div>
      </div>
    </Card>
  )
}
