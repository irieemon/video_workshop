'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { SoraGenerationModal } from '@/components/videos/sora-generation-modal'
import { useState } from 'react'

interface VideoCardProps {
  video: {
    id: string
    title: string
    user_brief: string
    platform: string
    optimized_prompt?: string
  }
  projectId: string
}

export function VideoCard({ video, projectId }: VideoCardProps) {
  const [soraModalOpen, setSoraModalOpen] = useState(false)

  return (
    <div className="rounded-lg border p-3 md:p-4 hover:border-scenra-amber transition-colors">
      <Link href={`/dashboard/projects/${projectId}/videos/${video.id}`}>
        <h4 className="font-medium mb-1 text-sm md:text-base hover:text-sage-600">
          {video.title}
        </h4>
      </Link>

      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">
        {video.user_brief}
      </p>

      <div className="flex items-center justify-between gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {video.platform}
        </Badge>

        {video.optimized_prompt && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-sage-600 hover:text-scenra-dark hover:bg-sage-50"
            onClick={(e) => {
              e.preventDefault()
              setSoraModalOpen(true)
            }}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Sora
          </Button>
        )}
      </div>

      <SoraGenerationModal
        open={soraModalOpen}
        onClose={() => setSoraModalOpen(false)}
        videoId={video.id}
        videoTitle={video.title}
        finalPrompt={video.optimized_prompt}
      />
    </div>
  )
}
