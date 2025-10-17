'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromptOutputProps {
  detailedBreakdown: {
    scene_structure: string
    visual_specs: string
    audio: string
    platform_optimization: string
    hashtags: string[]
  }
  optimizedPrompt: string
  characterCount: number
  hashtags: string[]
}

export function PromptOutput({
  detailedBreakdown,
  optimizedPrompt,
  characterCount,
  hashtags,
}: PromptOutputProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(optimizedPrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleCopyHashtags = async () => {
    await navigator.clipboard.writeText(hashtags.join(' '))
    setCopiedHashtags(true)
    setTimeout(() => setCopiedHashtags(false), 2000)
  }

  // Calculate character count color
  const getCharacterColor = () => {
    if (characterCount <= 500) return 'text-green-600'
    if (characterCount <= 700) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCharacterBgColor = () => {
    if (characterCount <= 500) return 'bg-green-100'
    if (characterCount <= 700) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Optimized Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Optimized Sora Prompt</CardTitle>
              <CardDescription>
                Ready to use in Sora video generation
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPrompt}
              className="gap-2"
            >
              {copiedPrompt ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Prompt
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Character Counter */}
            <div className="flex items-center gap-3">
              <div className={cn('px-3 py-1 rounded-md text-sm font-medium', getCharacterBgColor(), getCharacterColor())}>
                {characterCount} characters
              </div>
              {characterCount <= 500 && (
                <span className="text-xs text-muted-foreground">Optimal length for Sora</span>
              )}
              {characterCount > 500 && characterCount <= 700 && (
                <span className="text-xs text-muted-foreground">Good length, consider trimming</span>
              )}
              {characterCount > 700 && (
                <span className="text-xs text-muted-foreground">May be too long, recommend editing</span>
              )}
            </div>

            {/* Prompt Text */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {optimizedPrompt}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recommended Hashtags</CardTitle>
              <CardDescription>
                Platform-optimized tags for maximum reach
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyHashtags}
              className="gap-2"
            >
              {copiedHashtags ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-sm">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Production Breakdown</CardTitle>
          <CardDescription>
            Technical specifications from the AI film crew
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scene Structure */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3B4A5C]" />
              Scene Structure
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailedBreakdown.scene_structure}
            </p>
          </div>

          {/* Visual Specifications */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7C9473]" />
              Visual Specifications
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailedBreakdown.visual_specs}
            </p>
          </div>

          {/* Audio */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8B7C6B]" />
              Audio Direction
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailedBreakdown.audio}
            </p>
          </div>

          {/* Platform Optimization */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5A6D52]" />
              Platform Optimization
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detailedBreakdown.platform_optimization}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
