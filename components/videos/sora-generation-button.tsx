'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { SoraGenerationModal } from './sora-generation-modal'

interface SoraGenerationButtonProps {
  videoId: string
  videoTitle: string
  finalPrompt?: string
}

export function SoraGenerationButton({ videoId, videoTitle, finalPrompt }: SoraGenerationButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        size="sm"
        className="bg-sage-600 hover:bg-scenra-dark"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Generate with Sora
      </Button>

      <SoraGenerationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        videoId={videoId}
        videoTitle={videoTitle}
        finalPrompt={finalPrompt}
      />
    </>
  )
}
