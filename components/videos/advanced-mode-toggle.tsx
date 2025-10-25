'use client'

import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Settings2 } from 'lucide-react'

interface AdvancedModeToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export function AdvancedModeToggle({ enabled, onChange, disabled }: AdvancedModeToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <Settings2 className={`h-5 w-5 ${enabled ? 'text-scenra-amber' : 'text-muted-foreground'}`} />
        <div>
          <div className="flex items-center gap-2">
            <Label className="font-semibold cursor-pointer">Advanced Mode</Label>
            <Badge variant={enabled ? 'default' : 'secondary'} className={enabled ? 'bg-scenra-amber' : ''}>
              {enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Edit prompts, create shot lists, and provide additional creative guidance
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scenra-amber focus-visible:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${enabled ? 'bg-scenra-amber' : 'bg-gray-200'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}
