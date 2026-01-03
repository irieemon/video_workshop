'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Check, Clipboard } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface OpenInSoraButtonProps {
  prompt: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

/**
 * OpenInSoraButton - Copies prompt to clipboard and opens Sora website
 *
 * Since Sora doesn't support URL-based prompt injection, this provides
 * the best UX by:
 * 1. Copying the prompt to clipboard
 * 2. Opening sora.com in a new tab
 * 3. Showing a toast reminding user to paste
 */
export function OpenInSoraButton({
  prompt,
  variant = 'outline',
  size = 'default',
  className = '',
  showLabel = true,
}: OpenInSoraButtonProps) {
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenInSora = async () => {
    if (!prompt) {
      toast.error('No prompt available to copy')
      return
    }

    setIsLoading(true)

    try {
      // Step 1: Copy prompt to clipboard
      await navigator.clipboard.writeText(prompt)
      setCopied(true)

      // Step 2: Open Sora in new tab
      window.open('https://sora.com', '_blank', 'noopener,noreferrer')

      // Step 3: Show helpful toast
      toast.success('Prompt copied! Paste it in Sora', {
        description: 'The prompt is in your clipboard. Press Ctrl/Cmd + V in Sora.',
        duration: 5000,
      })

      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      console.error('Failed to open in Sora:', error)
      toast.error('Failed to copy prompt', {
        description: 'Please try copying manually',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const buttonContent = (
    <>
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      {showLabel && (
        <span className="ml-2">
          {copied ? 'Opening Sora...' : 'Open in Sora'}
        </span>
      )}
    </>
  )

  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={handleOpenInSora}
              disabled={isLoading || !prompt}
              className={className}
            >
              {buttonContent}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy prompt & open Sora</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleOpenInSora}
      disabled={isLoading || !prompt}
      className={className}
    >
      {buttonContent}
    </Button>
  )
}
