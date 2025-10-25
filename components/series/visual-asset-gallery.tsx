'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Loader2, Image as ImageIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface VisualAsset {
  id: string
  name: string
  description: string | null
  asset_type: string
  url: string | null
  file_name: string
  file_size: number
  width: number | null
  height: number | null
  created_at: string
}

interface VisualAssetGalleryProps {
  seriesId: string
  refreshTrigger?: number
}

export function VisualAssetGallery({ seriesId, refreshTrigger }: VisualAssetGalleryProps) {
  const [assets, setAssets] = useState<VisualAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<VisualAsset | null>(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/series/${seriesId}/assets`)
      if (!response.ok) throw new Error('Failed to fetch assets')

      const data = await response.json()
      setAssets(data)
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    } finally {
      setLoading(false)
    }
  }, [seriesId])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets, refreshTrigger])

  const handleDelete = async (asset: VisualAsset) => {
    setDeleting(asset.id)
    try {
      const response = await fetch(`/api/series/${seriesId}/assets/${asset.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete asset')

      // Remove from local state
      setAssets((prev) => prev.filter((a) => a.id !== asset.id))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete asset:', error)
      alert('Failed to delete asset')
    } finally {
      setDeleting(null)
    }
  }

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      logo: 'Logo',
      color_palette: 'Color Palette',
      setting_reference: 'Setting Reference',
      style_reference: 'Style Reference',
      other: 'Other',
    }
    return labels[type] || type
  }

  const getAssetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      logo: 'bg-blue-100 text-blue-800',
      color_palette: 'bg-purple-100 text-purple-800',
      setting_reference: 'bg-green-100 text-green-800',
      style_reference: 'bg-amber-100 text-amber-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[type] || colors.other
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-scenra-amber mr-2" />
        <span className="text-sm text-scenra-light">Loading assets...</span>
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 mx-auto text-scenra-gray mb-3" />
            <p className="text-sm text-scenra-light">
              No visual assets uploaded yet.
              <br />
              Upload logos, color palettes, or reference images for the AI team.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Card key={asset.id} className="overflow-hidden">
            <div className="relative aspect-video bg-scenra-dark-panel">
              {asset.url ? (
                <Image
                  src={asset.url}
                  alt={asset.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-sm line-clamp-1">{asset.name}</h3>
                <Badge variant="secondary" className={`${getAssetTypeColor(asset.asset_type)} text-xs`}>
                  {getAssetTypeLabel(asset.asset_type)}
                </Badge>
              </div>

              {asset.description && (
                <p className="text-xs text-scenra-gray line-clamp-2 mb-3">
                  {asset.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-scenra-gray">
                <span>
                  {asset.width && asset.height
                    ? `${asset.width}×${asset.height}`
                    : formatFileSize(asset.file_size)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirm(asset)}
                  disabled={deleting === asset.id}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {deleting === asset.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visual Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
