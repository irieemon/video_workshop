'use client'

import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

interface AdditionalGuidanceProps {
  value: string
  onChange: (value: string) => void
}

export function AdditionalGuidance({ value, onChange }: AdditionalGuidanceProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-scenra-amber" />
          <Label className="text-base font-semibold">Additional Creative Guidance</Label>
        </div>

        <p className="text-xs text-muted-foreground">
          Provide extra direction for the AI creative team. This guidance will persist across all regenerations.
        </p>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Example: Focus more on emotional journey, ensure vibrant colors, emphasize movement and energy..."
        />

        <div className="flex items-start gap-2 p-2 bg-sage-50 border border-sage-200 rounded text-xs text-sage-900">
          <Lightbulb className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Tip:</strong> Be specific about mood, pacing, visual style, or creative emphasis.
            This helps the AI team understand your vision better.
          </p>
        </div>
      </div>
    </Card>
  )
}
