'use client'

import { useQuery } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'

interface Setting {
  id: string
  name: string
  description: string
  environment_type: 'interior' | 'exterior' | 'mixed' | 'other' | null
  time_of_day: string | null
  atmosphere: string | null
  is_primary: boolean
}

interface SettingsSelectorProps {
  seriesId: string | null
  selectedSettings: string[]
  onSelectionChange: (settingIds: string[]) => void
  disabled?: boolean
}

export function SettingsSelector({
  seriesId,
  selectedSettings,
  onSelectionChange,
  disabled = false,
}: SettingsSelectorProps) {
  // Fetch settings for selected series
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['series-settings', seriesId],
    queryFn: async () => {
      if (!seriesId) return []
      const response = await fetch(`/api/series/${seriesId}/settings`)
      if (!response.ok) throw new Error('Failed to fetch settings')
      return response.json() as Promise<Setting[]>
    },
    enabled: !!seriesId,
  })

  const handleToggle = (settingId: string) => {
    if (disabled) return

    const newSelection = selectedSettings.includes(settingId)
      ? selectedSettings.filter((id) => id !== settingId)
      : [...selectedSettings, settingId]

    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    if (!settings || disabled) return
    if (selectedSettings.length === settings.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(settings.map((s) => s.id))
    }
  }

  if (!seriesId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Settings (Optional)
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading settings...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Settings (Optional)
        </Label>
        <div className="flex items-center gap-2 text-sm text-destructive p-3 border border-destructive/50 rounded-md bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          Failed to load settings
        </div>
      </div>
    )
  }

  if (!settings || settings.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Settings (Optional)
        </Label>
        <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
          No settings defined for this series yet. Settings help maintain consistent environments and locations across videos.
        </div>
      </div>
    )
  }

  const getEnvironmentBadgeVariant = (envType: Setting['environment_type']) => {
    switch (envType) {
      case 'interior':
        return 'default'
      case 'exterior':
        return 'secondary'
      case 'mixed':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getEnvironmentIcon = (envType: Setting['environment_type']) => {
    switch (envType) {
      case 'interior':
        return '🏠'
      case 'exterior':
        return '🌳'
      case 'mixed':
        return '🏛️'
      default:
        return '📍'
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Settings (Optional)
        </Label>
        {settings.length > 1 && (
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {selectedSettings.length === settings.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        Select settings to maintain consistent environments and locations in your video
      </div>

      <ScrollArea className="h-[200px] rounded-md border p-3">
        <div className="space-y-3">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className={`flex items-start space-x-3 p-2 rounded-md transition-colors ${
                selectedSettings.includes(setting.id)
                  ? 'bg-primary/5 border border-primary/20'
                  : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id={`setting-${setting.id}`}
                checked={selectedSettings.includes(setting.id)}
                onCheckedChange={() => handleToggle(setting.id)}
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={`setting-${setting.id}`}
                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                >
                  <span className="text-base">{getEnvironmentIcon(setting.environment_type)}</span>
                  {setting.name}
                  {setting.is_primary && (
                    <Badge variant="default" className="text-xs">
                      Primary
                    </Badge>
                  )}
                  {setting.environment_type && (
                    <Badge variant={getEnvironmentBadgeVariant(setting.environment_type)} className="text-xs">
                      {setting.environment_type}
                    </Badge>
                  )}
                </label>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {setting.description}
                </p>
                {(setting.time_of_day || setting.atmosphere) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {setting.time_of_day && (
                      <span className="flex items-center gap-1">
                        <span className="text-[10px]">🕐</span>
                        {setting.time_of_day}
                      </span>
                    )}
                    {setting.atmosphere && (
                      <span className="flex items-center gap-1">
                        <span className="text-[10px]">🎭</span>
                        {setting.atmosphere}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {selectedSettings.length > 0 && (
        <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/20">
          ✨ {selectedSettings.length} setting{selectedSettings.length !== 1 ? 's' : ''} selected - AI will maintain environmental consistency across your series
        </div>
      )}
    </div>
  )
}
