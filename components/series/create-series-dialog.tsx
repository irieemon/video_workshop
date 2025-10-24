'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'

interface CreateSeriesDialogProps {
  projects?: Array<{
    id: string
    name: string
  }>
  defaultProjectId?: string
  standalone?: boolean
}

export function CreateSeriesDialog({
  projects = [],
  defaultProjectId,
  standalone = false
}: CreateSeriesDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    projectId: defaultProjectId || projects[0]?.id || 'standalone',
    name: '',
    description: '',
    genre: 'narrative' as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Use top-level /api/series for standalone series or project-associated series
      const apiUrl = '/api/series'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          genre: formData.genre,
          project_id: formData.projectId === 'standalone' ? null : formData.projectId, // Convert "standalone" to null
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create series')
      }

      const savedSeries = await response.json()

      // Close dialog and navigate to new series
      setOpen(false)

      // Navigate based on whether series is associated with a project
      if (formData.projectId && formData.projectId !== 'standalone') {
        router.push(`/dashboard/projects/${formData.projectId}/series/${savedSeries.id}`)
      } else {
        router.push(`/dashboard/series/${savedSeries.id}`)
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Series
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Series</DialogTitle>
          <DialogDescription>
            Create a new video series with consistent characters and settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {!standalone && projects.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="project">
                  Project {defaultProjectId ? '' : '(Optional)'}
                </Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="No project (standalone series)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standalone">No project (standalone)</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!defaultProjectId && (
                  <p className="text-xs text-muted-foreground">
                    Leave empty to create a standalone series not tied to any project
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Series Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Maya's Journey, Product Showcase Series"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of your series..."
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <select
                id="genre"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value as any })}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background"
              >
                <option value="narrative">Narrative</option>
                <option value="product-showcase">Product Showcase</option>
                <option value="educational">Educational</option>
                <option value="brand-content">Brand Content</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Series'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
