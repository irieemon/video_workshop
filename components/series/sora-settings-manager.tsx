'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Camera, Sun, Palette, Type, Film } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SoraSettings {
  sora_camera_style: string | null
  sora_lighting_mood: string | null
  sora_color_palette: string | null
  sora_overall_tone: string | null
  sora_narrative_prefix: string | null
}

interface SoraSettingsManagerProps {
  seriesId: string
  seriesName: string
  settings: SoraSettings
}

export function SoraSettingsManager({ seriesId, seriesName, settings: initialSettings }: SoraSettingsManagerProps) {
  const router = useRouter()
  const [settings, setSettings] = useState(initialSettings)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<SoraSettings>({
    sora_camera_style: settings.sora_camera_style || '',
    sora_lighting_mood: settings.sora_lighting_mood || '',
    sora_color_palette: settings.sora_color_palette || '',
    sora_overall_tone: settings.sora_overall_tone || '',
    sora_narrative_prefix: settings.sora_narrative_prefix || '',
  })

  const hasAnySettings = Object.values(settings).some(val => val)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/series/${seriesId}/sora-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update Sora settings')
      }

      const updatedSettings = await response.json()
      setSettings(updatedSettings)
      setEditing(false)
      setSuccess(true)
      router.refresh()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      sora_camera_style: settings.sora_camera_style || '',
      sora_lighting_mood: settings.sora_lighting_mood || '',
      sora_color_palette: settings.sora_color_palette || '',
      sora_overall_tone: settings.sora_overall_tone || '',
      sora_narrative_prefix: settings.sora_narrative_prefix || '',
    })
    setEditing(false)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Sora Visual Consistency
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define visual style settings that ensure consistency across all episodes
          </p>
          <Badge variant="outline" className="mt-2 text-xs">
            Sora 2 Best Practices
          </Badge>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)} size="sm" variant="outline">
            <Film className="h-4 w-4 mr-2" />
            {hasAnySettings ? 'Edit Settings' : 'Configure'}
          </Button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-sm">
          Sora settings updated successfully! These will be applied to all future video generations.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configure Visual Consistency</CardTitle>
            <CardDescription>
              These settings will be automatically woven into every video prompt for this series
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Narrative Prefix */}
              <div className="space-y-2">
                <Label htmlFor="narrative-prefix" className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-purple-600" />
                  Narrative Prefix
                </Label>
                <Input
                  id="narrative-prefix"
                  value={formData.sora_narrative_prefix || ''}
                  onChange={(e) => setFormData({ ...formData, sora_narrative_prefix: e.target.value })}
                  placeholder={`e.g., "In ${seriesName}, "`}
                />
                <p className="text-xs text-muted-foreground">
                  Optional opening phrase for episodic continuity (e.g., "In {seriesName}, ")
                </p>
              </div>

              {/* Overall Tone */}
              <div className="space-y-2">
                <Label htmlFor="overall-tone" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Overall Tone
                </Label>
                <Input
                  id="overall-tone"
                  value={formData.sora_overall_tone || ''}
                  onChange={(e) => setFormData({ ...formData, sora_overall_tone: e.target.value })}
                  placeholder='e.g., "minimalist luxury" or "vibrant and energetic"'
                />
                <p className="text-xs text-muted-foreground">
                  The overarching visual aesthetic and mood
                </p>
              </div>

              {/* Camera Style */}
              <div className="space-y-2">
                <Label htmlFor="camera-style" className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-600" />
                  Camera/Film Style
                </Label>
                <Textarea
                  id="camera-style"
                  value={formData.sora_camera_style || ''}
                  onChange={(e) => setFormData({ ...formData, sora_camera_style: e.target.value })}
                  placeholder='e.g., "shot on 35mm film with warm cinematic grade" or "modern digital with shallow depth of field"'
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Default camera and film characteristics for the series
                </p>
              </div>

              {/* Lighting Mood */}
              <div className="space-y-2">
                <Label htmlFor="lighting-mood" className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-purple-600" />
                  Lighting Mood
                </Label>
                <Textarea
                  id="lighting-mood"
                  value={formData.sora_lighting_mood || ''}
                  onChange={(e) => setFormData({ ...formData, sora_lighting_mood: e.target.value })}
                  placeholder='e.g., "soft morning light with warm tones" or "dramatic high-contrast lighting"'
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Consistent lighting quality and direction
                </p>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <Label htmlFor="color-palette" className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-600" />
                  Color Palette
                </Label>
                <Textarea
                  id="color-palette"
                  value={formData.sora_color_palette || ''}
                  onChange={(e) => setFormData({ ...formData, sora_color_palette: e.target.value })}
                  placeholder='e.g., "warm amber and gold tones" or "cool blues with muted greens"'
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Primary color scheme for visual cohesion
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : hasAnySettings ? (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {settings.sora_narrative_prefix && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Type className="h-4 w-4 text-purple-600" />
                    Narrative Prefix
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {settings.sora_narrative_prefix}
                  </p>
                </div>
              )}

              {settings.sora_overall_tone && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Overall Tone
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {settings.sora_overall_tone}
                  </p>
                </div>
              )}

              {settings.sora_camera_style && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Camera className="h-4 w-4 text-purple-600" />
                    Camera/Film Style
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {settings.sora_camera_style}
                  </p>
                </div>
              )}

              {settings.sora_lighting_mood && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sun className="h-4 w-4 text-purple-600" />
                    Lighting Mood
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {settings.sora_lighting_mood}
                  </p>
                </div>
              )}

              {settings.sora_color_palette && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Palette className="h-4 w-4 text-purple-600" />
                    Color Palette
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {settings.sora_color_palette}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No Sora settings configured yet</p>
            <p className="text-sm text-muted-foreground">
              Configure visual consistency settings to maintain a cohesive look across episodes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
