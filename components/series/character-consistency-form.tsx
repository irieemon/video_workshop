'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Eye, Mic, Sparkles } from 'lucide-react'
import type { VisualFingerprint, VoiceProfile } from '@/lib/types/character-consistency'

interface CharacterConsistencyFormProps {
  visualFingerprint: Partial<VisualFingerprint>
  voiceProfile: Partial<VoiceProfile>
  generatedTemplate: string | null
  onChange: (data: { visualFingerprint: Partial<VisualFingerprint>; voiceProfile: Partial<VoiceProfile> }) => void
}

export function CharacterConsistencyForm({
  visualFingerprint: initialVisual,
  voiceProfile: initialVoice,
  generatedTemplate,
  onChange,
}: CharacterConsistencyFormProps) {
  const [visualFingerprint, setVisualFingerprint] = useState<Partial<VisualFingerprint>>(initialVisual || {})
  const [voiceProfile, setVoiceProfile] = useState<Partial<VoiceProfile>>(initialVoice || {})

  const updateVisual = (field: keyof VisualFingerprint, value: any) => {
    const updated = { ...visualFingerprint, [field]: value }
    setVisualFingerprint(updated)
    onChange({ visualFingerprint: updated, voiceProfile })
  }

  const updateVoice = (field: keyof VoiceProfile, value: any) => {
    const updated = { ...voiceProfile, [field]: value }
    setVoiceProfile(updated)
    onChange({ visualFingerprint, voiceProfile: updated })
  }

  return (
    <div className="space-y-6">
      {/* Visual Fingerprint */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            Visual Appearance
          </CardTitle>
          <CardDescription>
            Detailed physical characteristics for Sora consistency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm font-medium">
                Age <span className="text-red-500">*</span>
              </Label>
              <Input
                id="age"
                placeholder="e.g., early 30s, mid-40s"
                value={visualFingerprint.age || ''}
                onChange={(e) => updateVisual('age', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Specific age or range (e.g., &quot;early 30s&quot;, &quot;late 20s&quot;)
              </p>
            </div>

            {/* Ethnicity */}
            <div className="space-y-2">
              <Label htmlFor="ethnicity" className="text-sm font-medium">
                Ethnicity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ethnicity"
                placeholder="e.g., South Asian, East Asian"
                value={visualFingerprint.ethnicity || ''}
                onChange={(e) => updateVisual('ethnicity', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Specific ethnic background
              </p>
            </div>
          </div>

          {/* Hair */}
          <div className="space-y-2">
            <Label htmlFor="hair" className="text-sm font-medium">
              Hair <span className="text-red-500">*</span>
            </Label>
            <Input
              id="hair"
              placeholder="e.g., shoulder-length wavy black hair"
              value={visualFingerprint.hair || ''}
              onChange={(e) => updateVisual('hair', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Color, length, texture, style (the more specific, the better)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Eyes */}
            <div className="space-y-2">
              <Label htmlFor="eyes" className="text-sm font-medium">
                Eyes <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eyes"
                placeholder="e.g., amber eyes, dark brown"
                value={visualFingerprint.eyes || ''}
                onChange={(e) => updateVisual('eyes', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Color and shape if notable
              </p>
            </div>

            {/* Face Shape */}
            <div className="space-y-2">
              <Label htmlFor="face_shape" className="text-sm font-medium">
                Face Shape
              </Label>
              <Input
                id="face_shape"
                placeholder="e.g., oval, square, heart-shaped"
                value={visualFingerprint.face_shape || ''}
                onChange={(e) => updateVisual('face_shape', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Body Type */}
            <div className="space-y-2">
              <Label htmlFor="body_type" className="text-sm font-medium">
                Body Type <span className="text-red-500">*</span>
              </Label>
              <Input
                id="body_type"
                placeholder="e.g., slim, athletic, average"
                value={visualFingerprint.body_type || ''}
                onChange={(e) => updateVisual('body_type', e.target.value)}
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <Label htmlFor="height" className="text-sm font-medium">
                Height
              </Label>
              <Input
                id="height"
                placeholder="e.g., tall, average, 5'8&quot;"
                value={visualFingerprint.height || ''}
                onChange={(e) => updateVisual('height', e.target.value)}
              />
            </div>
          </div>

          {/* Skin Tone - CRITICAL for Sora Consistency */}
          <div className="space-y-2">
            <Label htmlFor="skin_tone" className="text-sm font-medium">
              Skin Tone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="skin_tone"
              placeholder="e.g., deep brown with warm undertones, fair with cool undertones, medium olive"
              value={visualFingerprint.skin_tone || ''}
              onChange={(e) => updateVisual('skin_tone', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Specific skin tone description prevents Sora from making up character appearance
            </p>
          </div>

          {/* Default Clothing */}
          <div className="space-y-2">
            <Label htmlFor="default_clothing" className="text-sm font-medium">
              Default Clothing <span className="text-red-500">*</span>
            </Label>
            <Input
              id="default_clothing"
              placeholder="e.g., business casual blazer and slacks"
              value={visualFingerprint.default_clothing || ''}
              onChange={(e) => updateVisual('default_clothing', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Typical outfit that defines their visual style
            </p>
          </div>

          {/* Distinctive Features */}
          <div className="space-y-2">
            <Label htmlFor="distinctive_features" className="text-sm font-medium">
              Distinctive Features (Optional)
            </Label>
            <Textarea
              id="distinctive_features"
              placeholder="e.g., dimples, scar on left eyebrow, beauty mark..."
              rows={2}
              value={
                Array.isArray(visualFingerprint.distinctive_features)
                  ? visualFingerprint.distinctive_features.join(', ')
                  : (visualFingerprint.distinctive_features || '')
              }
              onChange={(e) => updateVisual('distinctive_features', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Notable physical traits (beard, glasses, tattoos, etc.)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5 text-purple-500" />
            Voice Characteristics
          </CardTitle>
          <CardDescription>
            Audio consistency for character voice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Age Sound */}
            <div className="space-y-2">
              <Label htmlFor="age_sound" className="text-sm font-medium">
                Age Sound <span className="text-red-500">*</span>
              </Label>
              <Input
                id="age_sound"
                placeholder="e.g., sounds late 20s"
                value={voiceProfile.age_sound || ''}
                onChange={(e) => updateVoice('age_sound', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                How old does their voice sound?
              </p>
            </div>

            {/* Accent */}
            <div className="space-y-2">
              <Label htmlFor="accent" className="text-sm font-medium">
                Accent <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accent"
                placeholder="e.g., neutral American, British"
                value={voiceProfile.accent || ''}
                onChange={(e) => updateVoice('accent', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pitch */}
            <div className="space-y-2">
              <Label htmlFor="pitch" className="text-sm font-medium">
                Pitch <span className="text-red-500">*</span>
              </Label>
              <select
                id="pitch"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={voiceProfile.pitch || ''}
                onChange={(e) => updateVoice('pitch', e.target.value as 'high' | 'medium' | 'low')}
              >
                <option value="">Select...</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Pace */}
            <div className="space-y-2">
              <Label htmlFor="pace" className="text-sm font-medium">
                Pace <span className="text-red-500">*</span>
              </Label>
              <select
                id="pace"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={voiceProfile.pace || ''}
                onChange={(e) => updateVoice('pace', e.target.value as 'fast' | 'moderate' | 'slow')}
              >
                <option value="">Select...</option>
                <option value="fast">Fast</option>
                <option value="moderate">Moderate</option>
                <option value="slow">Slow</option>
              </select>
            </div>

            {/* Energy */}
            <div className="space-y-2">
              <Label htmlFor="energy" className="text-sm font-medium">
                Energy <span className="text-red-500">*</span>
              </Label>
              <select
                id="energy"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={voiceProfile.energy || ''}
                onChange={(e) => updateVoice('energy', e.target.value as 'high' | 'moderate' | 'calm' | 'low')}
              >
                <option value="">Select...</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="calm">Calm</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone" className="text-sm font-medium">
              Tone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tone"
              placeholder="e.g., warm, authoritative, playful"
              value={voiceProfile.tone || ''}
              onChange={(e) => updateVoice('tone', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Overall vocal quality and emotional color
            </p>
          </div>

          {/* Distinctive Traits */}
          <div className="space-y-2">
            <Label htmlFor="voice_traits" className="text-sm font-medium">
              Distinctive Traits (Optional)
            </Label>
            <Textarea
              id="voice_traits"
              placeholder="e.g., slight rasp, precise enunciation, laughs easily..."
              rows={2}
              value={voiceProfile.distinctive_traits?.join(', ') || ''}
              onChange={(e) => updateVoice('distinctive_traits', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated unique vocal characteristics
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generated Template Preview */}
      {generatedTemplate && (
        <Card className="border-sage-200 bg-sage-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-scenra-amber" />
              Sora Prompt Template
            </CardTitle>
            <CardDescription>
              This description will be auto-injected into every video prompt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-md border border-sage-300">
              <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {generatedTemplate}
              </p>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">Auto-generated</Badge>
              <span>Updates automatically when you change visual or voice details above</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">💡 Consistency Tips:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Be as specific as possible - &quot;shoulder-length wavy black hair&quot; is better than &quot;dark hair&quot;</li>
          <li>Required fields (*) are essential for Sora to maintain consistency</li>
          <li>The generated template shows exactly what Sora will receive in every prompt</li>
          <li>Once set, these details remain locked across all videos in the series</li>
        </ul>
      </div>
    </div>
  )
}
