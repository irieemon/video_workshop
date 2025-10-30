'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, Loader2, AlertCircle } from 'lucide-react'

interface Character {
  id: string
  name: string
  description: string
  role: 'protagonist' | 'supporting' | 'background' | 'other' | null
  visual_reference_url?: string | null
  sora_prompt_template?: string | null
}

interface CharacterSelectorProps {
  seriesId: string | null
  selectedCharacters: string[]
  onSelectionChange: (characterIds: string[]) => void
  disabled?: boolean
}

export function CharacterSelector({
  seriesId,
  selectedCharacters,
  onSelectionChange,
  disabled = false,
}: CharacterSelectorProps) {
  // Fetch characters for selected series
  const { data: characters, isLoading, error } = useQuery({
    queryKey: ['series-characters', seriesId],
    queryFn: async () => {
      if (!seriesId) return []
      const response = await fetch(`/api/series/${seriesId}/characters`)
      if (!response.ok) throw new Error('Failed to fetch characters')
      return response.json() as Promise<Character[]>
    },
    enabled: !!seriesId,
  })

  const handleToggle = (characterId: string) => {
    if (disabled) return

    const newSelection = selectedCharacters.includes(characterId)
      ? selectedCharacters.filter((id) => id !== characterId)
      : [...selectedCharacters, characterId]

    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    if (!characters || disabled) return
    if (selectedCharacters.length === characters.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(characters.map((c) => c.id))
    }
  }

  if (!seriesId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Characters (Optional)
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading characters...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Characters (Optional)
        </Label>
        <div className="flex items-center gap-2 text-sm text-destructive p-3 border border-destructive/50 rounded-md bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          Failed to load characters
        </div>
      </div>
    )
  }

  if (!characters || characters.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Characters (Optional)
        </Label>
        <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
          No characters defined for this series yet. Characters help maintain visual and audio consistency across videos.
        </div>
      </div>
    )
  }

  const getRoleBadgeVariant = (role: Character['role']) => {
    switch (role) {
      case 'protagonist':
        return 'default'
      case 'supporting':
        return 'secondary'
      case 'background':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Characters (Optional)
        </Label>
        {characters.length > 1 && (
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {selectedCharacters.length === characters.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        Select characters to maintain visual and audio consistency in your video
      </div>

      <ScrollArea className="h-[200px] rounded-md border p-3">
        <div className="space-y-3">
          {characters.map((character) => (
            <div
              key={character.id}
              className={`flex items-start space-x-3 p-2 rounded-md transition-colors ${
                selectedCharacters.includes(character.id)
                  ? 'bg-primary/5 border border-primary/20'
                  : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox
                id={`character-${character.id}`}
                checked={selectedCharacters.includes(character.id)}
                onCheckedChange={() => handleToggle(character.id)}
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={`character-${character.id}`}
                  className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                >
                  {character.name}
                  {character.role && (
                    <Badge variant={getRoleBadgeVariant(character.role)} className="text-xs">
                      {character.role}
                    </Badge>
                  )}
                </label>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {character.description}
                </p>
                {character.visual_reference_url && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <span className="text-[10px]">📷</span>
                    <span>Visual reference available</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {selectedCharacters.length > 0 && (
        <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/20">
          ✨ {selectedCharacters.length} character{selectedCharacters.length !== 1 ? 's' : ''} selected - AI will maintain consistency across your series
        </div>
      )}
    </div>
  )
}
