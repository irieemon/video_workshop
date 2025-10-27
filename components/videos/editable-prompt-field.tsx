'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Check, Undo } from 'lucide-react'

interface EditablePromptFieldProps {
  value: string
  originalValue: string
  onChange: (value: string) => void
  onRevert: () => void
}

const COPYRIGHT_PATTERNS = [
  // Brands
  /\b(nike|adidas|apple|samsung|sony|disney|marvel|dc comics|coca-cola|pepsi|mcdonald\'?s|starbucks|gucci|prada|louis vuitton|chanel|rolex|ferrari|lamborghini|porsche|bmw|mercedes|tesla)\b/i,
  // Movies/TV
  /\b(star wars|harry potter|lord of the rings|game of thrones|stranger things|breaking bad|friends|the office|avengers|spider-man|batman|superman)\b/i,
  // Artists/Celebrities (common names)
  /\b(beyonc[eé]|taylor swift|drake|kanye|rihanna|ed sheeran|billie eilish|ariana grande|justin bieber|dua lipa|the weeknd)\b/i,
  // Generic copyrighted terms
  /\b(trademarked|©|®|™)\b/i,
]

export function EditablePromptField({
  value,
  originalValue,
  onChange,
  onRevert,
}: EditablePromptFieldProps) {
  const [copyrightWarnings, setCopyrightWarnings] = useState<string[]>([])
  const characterCount = value.length

  // Validate for copyright issues
  useEffect(() => {
    const warnings: string[] = []
    COPYRIGHT_PATTERNS.forEach((pattern) => {
      const matches = value.match(pattern)
      if (matches) {
        matches.forEach((match) => {
          if (!warnings.includes(match.toLowerCase())) {
            warnings.push(match.toLowerCase())
          }
        })
      }
    })
    setCopyrightWarnings(warnings)
  }, [value])

  // Character count status
  const getCharacterStatus = () => {
    if (characterCount <= 500) {
      return { color: 'text-green-600', label: 'Optimal', icon: Check }
    } else if (characterCount <= 700) {
      return { color: 'text-yellow-600', label: 'Warning', icon: AlertCircle }
    } else {
      return { color: 'text-red-600', label: 'Too long', icon: AlertCircle }
    }
  }

  const status = getCharacterStatus()
  const StatusIcon = status.icon
  const hasChanges = value !== originalValue

  return (
    <Card className="p-4 bg-white dark:bg-card border-gray-200 dark:border-border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold text-gray-900 dark:text-foreground">Optimized Sora Prompt (Editable)</Label>
          {hasChanges && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRevert}
              className="text-xs"
            >
              <Undo className="mr-1 h-3 w-3" />
              Revert to AI Version
            </Button>
          )}
        </div>

        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Edit the optimized prompt for Sora video generation..."
          />
        </div>

        {/* Character Count Status */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 text-sm font-medium ${status.color}`}>
            <StatusIcon className="h-4 w-4" />
            <span>
              {characterCount} / 500 characters
              {characterCount > 500 && ` (+${characterCount - 500} over)`}
            </span>
            <span className="text-xs">• {status.label}</span>
          </div>
        </div>

        {/* Copyright Warnings */}
        {copyrightWarnings.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 dark:border-yellow-300 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-700 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Potential Copyright Issues Detected
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-800 mt-1">
                  Found possible copyrighted terms: <strong>{copyrightWarnings.join(', ')}</strong>
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-700 mt-1">
                  Consider replacing with generic descriptions to avoid generation failures.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Safe Status */}
        {copyrightWarnings.length === 0 && characterCount <= 700 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>Copyright check: Safe ✓</span>
          </div>
        )}

        {/* Character count guidance */}
        <p className="text-xs text-muted-foreground">
          {characterCount <= 500 && 'Prompt length is optimal for Sora generation.'}
          {characterCount > 500 && characterCount <= 700 && 'Prompt is longer than optimal but acceptable. Consider shortening for best results.'}
          {characterCount > 700 && 'Prompt exceeds recommended length. Sora may truncate or ignore parts of the prompt.'}
        </p>
      </div>
    </Card>
  )
}
