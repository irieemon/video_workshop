'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Crown,
  Sparkles,
  Video,
  MessageSquare,
  FolderPlus,
  Check,
  X
} from 'lucide-react'

type ResourceType = 'videos' | 'consultations' | 'projects'

interface UpgradePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: ResourceType
  currentUsage?: number
  limit?: number
  resetDateString?: string | null
}

const resourceConfig: Record<ResourceType, {
  title: string
  description: string
  icon: typeof Video
  premiumLimit: string
}> = {
  videos: {
    title: 'Video Generation Limit Reached',
    description: 'You\'ve used all your video generations for this month.',
    icon: Video,
    premiumLimit: '100 videos/month'
  },
  consultations: {
    title: 'AI Consultation Limit Reached',
    description: 'You\'ve used all your AI roundtable consultations for this month.',
    icon: MessageSquare,
    premiumLimit: 'Unlimited'
  },
  projects: {
    title: 'Project Limit Reached',
    description: 'You\'ve reached the maximum number of projects for your plan.',
    icon: FolderPlus,
    premiumLimit: 'Unlimited'
  }
}

const premiumFeatures = [
  '100 video generations per month',
  'Unlimited AI consultations',
  'Unlimited projects',
  'Advanced AI agents',
  'Sora video generation',
  'Character consistency',
  'Priority support'
]

/**
 * Modal dialog that appears when user hits a usage limit.
 * Prompts upgrade to premium with compelling feature list.
 */
export function UpgradePromptDialog({
  open,
  onOpenChange,
  resource,
  currentUsage,
  limit,
  resetDateString
}: UpgradePromptDialogProps) {
  const router = useRouter()
  const config = resourceConfig[resource]
  const Icon = config.icon

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/dashboard/upgrade')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <Icon className="h-7 w-7 text-destructive" />
          </div>
          <DialogTitle className="text-center">{config.title}</DialogTitle>
          <DialogDescription className="text-center">
            {config.description}
            {currentUsage !== undefined && limit !== undefined && (
              <span className="block mt-1 font-medium">
                ({currentUsage}/{limit} used)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Premium Card */}
          <div className="relative rounded-lg border-2 border-scenra-amber bg-gradient-to-br from-scenra-amber/5 to-yellow-500/5 p-4">
            <Badge className="absolute -top-2 left-4 bg-scenra-amber text-scenra-dark">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>

            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-3">
                Upgrade to Premium for {config.premiumLimit}:
              </p>

              <ul className="space-y-2">
                {premiumFeatures.slice(0, 5).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-scenra-amber flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
          </div>

          {/* Reset date info */}
          <p className="text-xs text-center text-muted-foreground">
            {resetDateString
              ? `Your limit resets ${resetDateString}. Upgrade now for unlimited access.`
              : 'Your limit resets at the start of each billing cycle.'}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-scenra-amber to-yellow-500 text-scenra-dark hover:from-yellow-500 hover:to-scenra-amber"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to manage upgrade prompt state
 */
export function useUpgradePrompt() {
  const [state, setState] = useState<{
    open: boolean
    resource: ResourceType
    currentUsage?: number
    limit?: number
    resetDateString?: string | null
  }>({
    open: false,
    resource: 'videos'
  })

  const showPrompt = (
    resource: ResourceType,
    currentUsage?: number,
    limit?: number,
    resetDateString?: string | null
  ) => {
    setState({ open: true, resource, currentUsage, limit, resetDateString })
  }

  const hidePrompt = () => {
    setState(prev => ({ ...prev, open: false }))
  }

  return {
    ...state,
    showPrompt,
    hidePrompt,
    setOpen: (open: boolean) => setState(prev => ({ ...prev, open }))
  }
}

