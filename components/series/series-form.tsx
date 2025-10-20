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
} from '@/components/ui/dialog'

interface SeriesFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  series?: {
    id: string
    name: string
    description: string | null
    genre: 'narrative' | 'product-showcase' | 'educational' | 'brand-content' | 'other' | null
  }
}

export function SeriesForm({ open, onOpenChange, projectId, series }: SeriesFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: series?.name || '',
    description: series?.description || '',
    genre: series?.genre || 'narrative' as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = series
        ? `/api/series/${series.id}`
        : `/api/projects/${projectId}/series`

      const method = series ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save series')
      }

      const savedSeries = await response.json()

      // Close dialog and refresh
      onOpenChange(false)
      router.refresh()

      // If creating new series, navigate to it
      if (!series) {
        router.push(`/dashboard/projects/${projectId}/series/${savedSeries.id}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{series ? 'Edit Series' : 'Create New Series'}</DialogTitle>
          <DialogDescription>
            {series
              ? 'Update series details and settings.'
              : 'Create a new video series with consistent characters and settings.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                {error}
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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : series ? 'Update Series' : 'Create Series'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
