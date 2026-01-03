'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LucideIcon, Crown } from 'lucide-react'

interface PromptActionCardProps {
  icon: LucideIcon
  title: string
  description: string
  buttonLabel: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'secondary'
  isPremiumLocked?: boolean
  isLoading?: boolean
  loadingLabel?: string
  disabled?: boolean
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function PromptActionCard({
  icon: Icon,
  title,
  description,
  buttonLabel,
  onClick,
  variant = 'default',
  isPremiumLocked = false,
  isLoading = false,
  loadingLabel = 'Loading...',
  disabled = false,
  secondaryAction,
  className,
}: PromptActionCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-md',
        variant === 'primary' && 'border-primary/50 bg-primary/5',
        variant === 'secondary' && 'border-sage-500/30 bg-sage-50/50 dark:bg-sage-950/30',
        className
      )}
    >
      <CardContent className="flex flex-col h-full p-6">
        {/* Icon */}
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-lg',
            variant === 'primary' && 'bg-primary/10 text-primary',
            variant === 'secondary' && 'bg-sage-500/10 text-sage-600',
            variant === 'default' && 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-6 w-6" />
        </div>

        {/* Content */}
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 flex-1 text-sm text-muted-foreground">{description}</p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={onClick}
            disabled={disabled || isLoading}
            className={cn(
              'w-full',
              variant === 'primary' && 'bg-primary hover:bg-primary/90',
              variant === 'secondary' && 'bg-sage-600 hover:bg-sage-700'
            )}
            variant={variant === 'default' ? 'outline' : 'default'}
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {loadingLabel}
              </>
            ) : (
              <>
                {buttonLabel}
                {isPremiumLocked && (
                  <Crown className="ml-2 h-4 w-4 text-yellow-400" />
                )}
              </>
            )}
          </Button>

          {secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={secondaryAction.onClick}
              className="w-full text-muted-foreground"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
