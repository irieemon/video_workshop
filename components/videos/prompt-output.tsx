'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromptOutputProps {
  detailedBreakdown: {
    subject_direction?: string
    scene_structure: string
    camera_specs?: string
    lighting_setup?: string
    composition_rules?: string
    platform_specs?: string
    // Legacy fields for backward compatibility
    visual_specs?: string
    audio?: string
    platform_optimization?: string
    hashtags?: string[]
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

  // Simple character count display - no strict validation needed with updated prompt structure

  return (
    <div className="space-y-6">
      {/* Optimized Prompt */}
      <Card className="bg-white dark:bg-card border-gray-200 dark:border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900 dark:text-foreground">Optimized Sora Prompt</CardTitle>
              <CardDescription className="text-gray-600 dark:text-muted-foreground">
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
            {/* Prompt Text */}
            <div className="p-4 bg-gray-50 dark:bg-scenra-dark-panel border border-scenra-blue/30 dark:border-scenra-blue/20 rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-900 dark:text-scenra-light">
                {optimizedPrompt}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card className="bg-white dark:bg-card border-gray-200 dark:border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900 dark:text-foreground">Recommended Hashtags</CardTitle>
              <CardDescription className="text-gray-600 dark:text-muted-foreground">
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
      <Card className="bg-white dark:bg-card border-gray-200 dark:border-border">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-foreground">Technical Production Specifications</CardTitle>
          <CardDescription className="text-gray-600 dark:text-muted-foreground">
            Detailed breakdown with abbreviation reference
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Direction */}
          {detailedBreakdown.subject_direction && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6B8E9C]" />
                Subject Direction & Action
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                {detailedBreakdown.subject_direction}
              </p>
            </div>
          )}

          {/* Scene Structure */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3B4A5C]" />
              Scene Structure & Timing
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed font-mono">
              {detailedBreakdown.scene_structure}
            </p>
          </div>

          {/* Camera Specifications */}
          {detailedBreakdown.camera_specs && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7C9473]" />
                Camera Specifications
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                {detailedBreakdown.camera_specs}
              </p>
            </div>
          )}

          {/* Lighting Setup */}
          {detailedBreakdown.lighting_setup && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C97064]" />
                Lighting Setup
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                {detailedBreakdown.lighting_setup}
              </p>
            </div>
          )}

          {/* Composition Rules */}
          {detailedBreakdown.composition_rules && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8B7C6B]" />
                Composition Rules
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                {detailedBreakdown.composition_rules}
              </p>
            </div>
          )}

          {/* Platform Specs */}
          {detailedBreakdown.platform_specs && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5A6D52]" />
                Platform Specifications
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                {detailedBreakdown.platform_specs}
              </p>
            </div>
          )}

          {/* Legacy fields for backward compatibility */}
          {detailedBreakdown.visual_specs && !detailedBreakdown.camera_specs && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#7C9473]" />
                Visual Specifications
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {detailedBreakdown.visual_specs}
              </p>
            </div>
          )}

          {detailedBreakdown.audio && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8B7C6B]" />
                Audio Direction
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {detailedBreakdown.audio}
              </p>
            </div>
          )}

          {detailedBreakdown.platform_optimization && !detailedBreakdown.platform_specs && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5A6D52]" />
                Platform Optimization
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {detailedBreakdown.platform_optimization}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
