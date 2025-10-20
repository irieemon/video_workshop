'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageIcon } from 'lucide-react'
import { VisualAssetUploader } from './visual-asset-uploader'
import { VisualAssetGallery } from './visual-asset-gallery'

interface VisualAssetManagerProps {
  seriesId: string
}

export function VisualAssetManager({ seriesId }: VisualAssetManagerProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-sage-500" />
              Visual Assets
            </CardTitle>
            <CardDescription className="mt-1">
              Upload reference images for the AI creative team (logos, color palettes, setting examples)
            </CardDescription>
          </div>
          <VisualAssetUploader
            seriesId={seriesId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </CardHeader>
      <CardContent>
        <VisualAssetGallery
          seriesId={seriesId}
          refreshTrigger={refreshTrigger}
        />
      </CardContent>
    </Card>
  )
}
