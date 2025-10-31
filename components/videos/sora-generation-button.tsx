'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Crown } from 'lucide-react'
import { SoraGenerationModal } from './sora-generation-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'

interface SoraGenerationButtonProps {
  videoId: string
  videoTitle: string
  finalPrompt?: string
  subscriptionTier?: 'free' | 'premium' | 'enterprise'
}

export function SoraGenerationButton({
  videoId,
  videoTitle,
  finalPrompt,
  subscriptionTier = 'free'
}: SoraGenerationButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)

  const isPremiumUser = subscriptionTier === 'premium' || subscriptionTier === 'enterprise'

  const handleClick = () => {
    if (isPremiumUser) {
      setModalOpen(true)
    } else {
      setUpgradeDialogOpen(true)
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        size="sm"
        className="bg-sage-600 hover:bg-scenra-dark relative"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Generate with Sora
        {!isPremiumUser && (
          <Crown className="ml-1 h-3 w-3 text-yellow-400" />
        )}
      </Button>

      {/* Sora Generation Modal - Only for Premium Users */}
      {isPremiumUser && (
        <SoraGenerationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          videoId={videoId}
          videoTitle={videoTitle}
          finalPrompt={finalPrompt}
        />
      )}

      {/* Upgrade Dialog - For Free Users */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Premium Feature
            </DialogTitle>
            <DialogDescription>
              Sora video generation is available exclusively for Premium and Enterprise users.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-gradient-to-br from-sage-50 to-sage-100 dark:from-sage-950/30 dark:to-sage-900/30 p-4 border border-sage-200 dark:border-sage-800">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sage-600" />
                Premium Benefits
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-sage-600 font-bold">✓</span>
                  <span>Unlimited AI-powered video generation with Sora</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sage-600 font-bold">✓</span>
                  <span>Advanced prompt optimization and refinement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sage-600 font-bold">✓</span>
                  <span>Priority generation queue and faster processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sage-600 font-bold">✓</span>
                  <span>HD video exports and commercial usage rights</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpgradeDialogOpen(false)}
            >
              Maybe Later
            </Button>
            <Button
              asChild
              className="bg-sage-600 hover:bg-sage-700"
            >
              <Link href="/dashboard/settings?tab=subscription">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
