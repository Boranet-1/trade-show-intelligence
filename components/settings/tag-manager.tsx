'use client'

/**
 * Tag Manager Component (FR-029)
 * Allows creation and management of tags with custom colors
 */

import { useState, useEffect } from 'react'
import type { Tag } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Trash2, Edit2, Plus } from 'lucide-react'

const PRESET_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gray', value: '#6B7280' },
]

interface TagManagerProps {
  eventId?: string
}

export function TagManager({ eventId }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  // Form state
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState(PRESET_COLORS[0].value)
  const [tagDescription, setTagDescription] = useState('')
  const [customColor, setCustomColor] = useState('')

  useEffect(() => {
    loadTags()
  }, [eventId])

  const loadTags = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setTags(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!tagName.trim()) return

    const finalColor = customColor || tagColor

    const newTag: Partial<Tag> = {
      name: tagName.trim(),
      color: finalColor,
      description: tagDescription.trim() || undefined,
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTag),
      })

      if (response.ok) {
        await loadTags()
        resetForm()
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleUpdateTag = async () => {
    if (!editingTag || !tagName.trim()) return

    const finalColor = customColor || tagColor

    const updatedTag: Partial<Tag> = {
      name: tagName.trim(),
      color: finalColor,
      description: tagDescription.trim() || undefined,
    }

    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTag),
      })

      if (response.ok) {
        await loadTags()
        resetForm()
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to update tag:', error)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadTags()
      }
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  }

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag)
    setTagName(tag.name)
    setTagColor(tag.color)
    setTagDescription(tag.description || '')
    setCustomColor('')
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingTag(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setTagName('')
    setTagColor(PRESET_COLORS[0].value)
    setTagDescription('')
    setCustomColor('')
    setEditingTag(null)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading tags...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tag Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Enter tag name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag-description">Description (Optional)</Label>
                <Input
                  id="tag-description"
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  placeholder="Enter tag description"
                />
              </div>

              <div className="space-y-2">
                <Label>Preset Colors</Label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`h-10 w-full rounded border-2 ${
                        tagColor === color.value && !customColor
                          ? 'border-black'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => {
                        setTagColor(color.value)
                        setCustomColor('')
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-color">Custom Color (Hex)</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="#RRGGBB"
                    maxLength={7}
                  />
                  {customColor && (
                    <div
                      className="h-10 w-10 rounded border"
                      style={{ backgroundColor: customColor }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <Badge
                  style={{
                    backgroundColor: customColor || tagColor,
                    color: '#FFFFFF',
                  }}
                >
                  {tagName || 'Tag Preview'}
                </Badge>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingTag ? handleUpdateTag : handleCreateTag}>
                  {editingTag ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6">
        {tags.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No tags created yet. Create your first tag to organize badge scans.
          </p>
        ) : (
          <div className="space-y-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    style={{
                      backgroundColor: tag.color,
                      color: '#FFFFFF',
                    }}
                  >
                    {tag.name}
                  </Badge>
                  {tag.description && (
                    <span className="text-sm text-muted-foreground">
                      {tag.description}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(tag)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
