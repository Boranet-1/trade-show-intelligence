'use client'

/**
 * List Manager Component (FR-030)
 * Manages static and dynamic lists for organizing badge scans
 */

import { useState, useEffect } from 'react'
import type { List, LeadTier, ReportFilters } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Edit2, Plus, Users, Filter } from 'lucide-react'

interface ListManagerProps {
  eventId?: string
}

const TIER_OPTIONS: LeadTier[] = ['Hot', 'Warm', 'Cold', 'Unscored']

export function ListManager({ eventId }: ListManagerProps) {
  const [lists, setLists] = useState<List[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingList, setEditingList] = useState<List | null>(null)

  // Form state
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [listType, setListType] = useState<'static' | 'dynamic'>('static')

  // Dynamic list filter state
  const [filterTiers, setFilterTiers] = useState<LeadTier[]>([])
  const [filterIndustries, setFilterIndustries] = useState('')
  const [filterTechnologies, setFilterTechnologies] = useState('')

  useEffect(() => {
    loadLists()
  }, [eventId])

  const loadLists = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/lists')
      if (response.ok) {
        const data = await response.json()
        setLists(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load lists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateList = async () => {
    if (!listName.trim()) return

    const filterCriteria: ReportFilters | undefined = listType === 'dynamic' ? {
      tiers: filterTiers.length > 0 ? filterTiers : undefined,
      industries: filterIndustries ? filterIndustries.split(',').map(s => s.trim()) : undefined,
      technologies: filterTechnologies ? filterTechnologies.split(',').map(s => s.trim()) : undefined,
    } : undefined

    const newList: Partial<List> = {
      name: listName.trim(),
      description: listDescription.trim() || undefined,
      type: listType,
      filterCriteria,
      badgeScanIds: listType === 'static' ? [] : undefined,
      contactCount: 0,
      lastUpdated: new Date(),
    }

    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList),
      })

      if (response.ok) {
        await loadLists()
        resetForm()
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  const handleUpdateList = async () => {
    if (!editingList || !listName.trim()) return

    const filterCriteria: ReportFilters | undefined = listType === 'dynamic' ? {
      tiers: filterTiers.length > 0 ? filterTiers : undefined,
      industries: filterIndustries ? filterIndustries.split(',').map(s => s.trim()) : undefined,
      technologies: filterTechnologies ? filterTechnologies.split(',').map(s => s.trim()) : undefined,
    } : undefined

    const updatedList: Partial<List> = {
      name: listName.trim(),
      description: listDescription.trim() || undefined,
      type: listType,
      filterCriteria,
      lastUpdated: new Date(),
    }

    try {
      const response = await fetch(`/api/lists/${editingList.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList),
      })

      if (response.ok) {
        await loadLists()
        resetForm()
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to update list:', error)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadLists()
      }
    } catch (error) {
      console.error('Failed to delete list:', error)
    }
  }

  const openEditDialog = (list: List) => {
    setEditingList(list)
    setListName(list.name)
    setListDescription(list.description || '')
    setListType(list.type)

    // Load filter criteria if dynamic list
    if (list.type === 'dynamic' && list.filterCriteria) {
      setFilterTiers(list.filterCriteria.tiers || [])
      setFilterIndustries(list.filterCriteria.industries?.join(', ') || '')
      setFilterTechnologies(list.filterCriteria.technologies?.join(', ') || '')
    } else {
      setFilterTiers([])
      setFilterIndustries('')
      setFilterTechnologies('')
    }

    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingList(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setListName('')
    setListDescription('')
    setListType('static')
    setFilterTiers([])
    setFilterIndustries('')
    setFilterTechnologies('')
    setEditingList(null)
  }

  const toggleTier = (tier: LeadTier) => {
    setFilterTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    )
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading lists...</p>
      </Card>
    )
  }

  const staticLists = lists.filter(l => l.type === 'static')
  const dynamicLists = lists.filter(l => l.type === 'dynamic')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">List Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingList ? 'Edit List' : 'Create New List'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="list-name">List Name</Label>
                <Input
                  id="list-name"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Enter list name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="list-description">Description (Optional)</Label>
                <Input
                  id="list-description"
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="Enter list description"
                />
              </div>

              <div className="space-y-2">
                <Label>List Type</Label>
                <Tabs value={listType} onValueChange={(v) => setListType(v as 'static' | 'dynamic')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="static">
                      <Users className="mr-2 h-4 w-4" />
                      Static List
                    </TabsTrigger>
                    <TabsTrigger value="dynamic">
                      <Filter className="mr-2 h-4 w-4" />
                      Dynamic List
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="static" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Static lists contain manually selected contacts. You can add or remove contacts from the list view.
                    </p>
                  </TabsContent>

                  <TabsContent value="dynamic" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Dynamic lists automatically include contacts matching the filter criteria below.
                    </p>

                    <div className="space-y-2">
                      <Label>Filter by Tier</Label>
                      <div className="flex gap-2">
                        {TIER_OPTIONS.map(tier => (
                          <Button
                            key={tier}
                            variant={filterTiers.includes(tier) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleTier(tier)}
                          >
                            {tier}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-industries">Industries (comma-separated)</Label>
                      <Input
                        id="filter-industries"
                        value={filterIndustries}
                        onChange={(e) => setFilterIndustries(e.target.value)}
                        placeholder="Technology, Healthcare, Finance"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-technologies">Technologies (comma-separated)</Label>
                      <Input
                        id="filter-technologies"
                        value={filterTechnologies}
                        onChange={(e) => setFilterTechnologies(e.target.value)}
                        placeholder="AWS, React, Python"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={editingList ? handleUpdateList : handleCreateList}>
                  {editingList ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="static" className="w-full">
        <TabsList>
          <TabsTrigger value="static">
            Static Lists ({staticLists.length})
          </TabsTrigger>
          <TabsTrigger value="dynamic">
            Dynamic Lists ({dynamicLists.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="static">
          <Card className="p-6">
            {staticLists.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No static lists created yet. Create a static list to manually organize contacts.
              </p>
            ) : (
              <div className="space-y-3">
                {staticLists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteList}
                  />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="dynamic">
          <Card className="p-6">
            {dynamicLists.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No dynamic lists created yet. Create a dynamic list with filter criteria.
              </p>
            ) : (
              <div className="space-y-3">
                {dynamicLists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteList}
                  />
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ListCardProps {
  list: List
  onEdit: (list: List) => void
  onDelete: (listId: string) => void
}

function ListCard({ list, onEdit, onDelete }: ListCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{list.name}</h3>
          <Badge variant="outline">
            {list.type === 'static' ? <Users className="mr-1 h-3 w-3" /> : <Filter className="mr-1 h-3 w-3" />}
            {list.type}
          </Badge>
          <Badge variant="secondary">{list.contactCount} contacts</Badge>
        </div>
        {list.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {list.description}
          </p>
        )}
        {list.type === 'dynamic' && list.filterCriteria && (
          <div className="flex gap-2 mt-2">
            {list.filterCriteria.tiers && list.filterCriteria.tiers.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">Tiers: </span>
                {list.filterCriteria.tiers.join(', ')}
              </div>
            )}
            {list.filterCriteria.industries && list.filterCriteria.industries.length > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground">Industries: </span>
                {list.filterCriteria.industries.join(', ')}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {new Date(list.lastUpdated).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(list)}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(list.id)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  )
}
