'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Users, MapPin } from 'lucide-react'

interface Character {
  id: string
  name: string
  description: string
  role: string | null
  performance_style: string | null
}

interface Setting {
  id: string
  name: string
  description: string
  environment_type: string | null
  time_of_day: string | null
  atmosphere: string | null
  is_primary: boolean
}

interface SeriesContextSelectorProps {
  seriesId: string | null
  selectedCharacters: string[]
  selectedSettings: string[]
  onCharactersChange: (characters: string[]) => void
  onSettingsChange: (settings: string[]) => void
  disabled?: boolean
}

export function SeriesContextSelector({
  seriesId,
  selectedCharacters,
  selectedSettings,
  onCharactersChange,
  onSettingsChange,
  disabled = false,
}: SeriesContextSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [characters, setCharacters] = useState<Character[]>([])
  const [settings, setSettings] = useState<Setting[]>([])

  useEffect(() => {
    if (!seriesId) {
      setCharacters([])
      setSettings([])
      onCharactersChange([])
      onSettingsChange([])
      return
    }

    const fetchSeriesContext = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/series/${seriesId}/context`)
        if (!response.ok) throw new Error('Failed to fetch series context')

        const data = await response.json()
        setCharacters(data.characters || [])
        setSettings(data.settings || [])

        // Auto-select primary settings
        const primarySettings = (data.settings || [])
          .filter((s: Setting) => s.is_primary)
          .map((s: Setting) => s.id)
        if (primarySettings.length > 0) {
          onSettingsChange(primarySettings)
        }
      } catch (error) {
        console.error('Failed to fetch series context:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSeriesContext()
  }, [seriesId, onCharactersChange, onSettingsChange])

  const toggleCharacter = (characterId: string) => {
    if (disabled) return
    if (selectedCharacters.includes(characterId)) {
      onCharactersChange(selectedCharacters.filter((id) => id !== characterId))
    } else {
      onCharactersChange([...selectedCharacters, characterId])
    }
  }

  const toggleSetting = (settingId: string) => {
    if (disabled) return
    if (selectedSettings.includes(settingId)) {
      onSettingsChange(selectedSettings.filter((id) => id !== settingId))
    } else {
      onSettingsChange([...selectedSettings, settingId])
    }
  }

  if (!seriesId) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-scenra-amber mr-2" />
            <span className="text-sm text-scenra-gray">Loading series context...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const roleColors: Record<string, string> = {
    protagonist: 'bg-blue-100 text-blue-800',
    supporting: 'bg-green-100 text-green-800',
    background: 'bg-gray-100 text-gray-800',
    other: 'bg-purple-100 text-purple-800',
  }

  const environmentColors: Record<string, string> = {
    interior: 'bg-amber-100 text-amber-800',
    exterior: 'bg-sky-100 text-sky-800',
    mixed: 'bg-violet-100 text-violet-800',
    other: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-4">
      {/* Characters Selection */}
      {characters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-scenra-amber" />
              Characters
            </CardTitle>
            <CardDescription className="text-xs">
              Select which characters appear in this video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {characters.map((character) => (
              <div
                key={character.id}
                className="flex items-start space-x-3 p-3 rounded-md border border-scenra-amber/30 bg-scenra-dark-panel hover:border-scenra-amber transition-colors cursor-pointer"
                onClick={() => toggleCharacter(character.id)}
              >
                <Checkbox
                  id={`character-${character.id}`}
                  checked={selectedCharacters.includes(character.id)}
                  onCheckedChange={() => toggleCharacter(character.id)}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor={`character-${character.id}`}
                      className="text-sm font-medium text-scenra-light cursor-pointer"
                    >
                      {character.name}
                    </Label>
                    {character.role && (
                      <Badge
                        variant="secondary"
                        className={`${roleColors[character.role]} text-xs`}
                      >
                        {character.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-scenra-gray line-clamp-2">
                    {character.description}
                  </p>
                  {character.performance_style && (
                    <p className="text-xs text-scenra-amber/80 mt-1 italic">
                      Performance: {character.performance_style}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Settings Selection */}
      {settings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-scenra-amber" />
              Settings & Locations
            </CardTitle>
            <CardDescription className="text-xs">
              Select where this video takes place
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-start space-x-3 p-3 rounded-md border border-scenra-amber/30 bg-scenra-dark-panel hover:border-scenra-amber transition-colors cursor-pointer"
                onClick={() => toggleSetting(setting.id)}
              >
                <Checkbox
                  id={`setting-${setting.id}`}
                  checked={selectedSettings.includes(setting.id)}
                  onCheckedChange={() => toggleSetting(setting.id)}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Label
                      htmlFor={`setting-${setting.id}`}
                      className="text-sm font-medium text-scenra-light cursor-pointer"
                    >
                      {setting.name}
                    </Label>
                    {setting.environment_type && (
                      <Badge
                        variant="secondary"
                        className={`${environmentColors[setting.environment_type]} text-xs`}
                      >
                        {setting.environment_type}
                      </Badge>
                    )}
                    {setting.is_primary && (
                      <Badge variant="outline" className="text-xs border-scenra-amber/40 text-scenra-amber">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-scenra-gray line-clamp-2">
                    {setting.description}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-scenra-gray">
                    {setting.time_of_day && <span>⏰ {setting.time_of_day}</span>}
                    {setting.atmosphere && <span>✨ {setting.atmosphere}</span>}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {characters.length === 0 && settings.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-sm text-scenra-gray">
              This series doesn&apos;t have any characters or settings defined yet.
              <br />
              Add them from the series management page.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
