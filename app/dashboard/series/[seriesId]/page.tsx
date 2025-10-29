import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'
import { CharacterManager, SettingManager, VisualAssetManager, RelationshipManager, SoraSettingsManager, SeriesEpisodesCoordinator } from '@/components/series'
import { Separator } from '@/components/ui/separator'

export default async function StandaloneSeriesDetailPage({
  params,
}: {
  params: Promise<{ seriesId: string }>
}) {
  const { seriesId } = await params
  const supabase = await createClient()

  // Fetch series (can be standalone or associated with a project)
  const { data: series, error } = await supabase
    .from('series')
    .select(
      `
      *,
      characters:series_characters(*, visual_fingerprint, voice_profile, sora_prompt_template),
      settings:series_settings(*)
    `
    )
    .eq('id', seriesId)
    .single()

  if (error || !series) {
    notFound()
  }

  const genreColors: Record<string, string> = {
    narrative: 'bg-blue-100 text-blue-800',
    'product-showcase': 'bg-purple-100 text-purple-800',
    educational: 'bg-green-100 text-green-800',
    'brand-content': 'bg-orange-100 text-orange-800',
    other: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="p-4 md:p-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 md:mb-6"
        asChild
      >
        <Link href="/dashboard/series">
          <ArrowLeft className="mr-1 md:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Series</span>
          <span className="sm:hidden">Back</span>
        </Link>
      </Button>

      {/* Series Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">{series.name}</h1>
              {series.genre && (
                <Badge variant="secondary" className={`${genreColors[series.genre]} w-fit`}>
                  {series.genre.replace('-', ' ')}
                </Badge>
              )}
              <Badge variant="outline" className="w-fit">
                Standalone
              </Badge>
            </div>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              {series.description || 'No description'}
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <strong>Continuity:</strong>
                {series.enforce_continuity ? 'Enforced' : 'Flexible'}
              </span>
              {series.allow_continuity_breaks && (
                <span>• Breaks Allowed</span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>

        <Separator />
      </div>

      {/* Content Sections */}
      <div className="space-y-8 md:space-y-10">
        {/* Coordinated Episodes Section - handles both regular episodes and concept episodes */}
        <SeriesEpisodesCoordinator
          seriesId={seriesId}
          seriesName={series.name}
          projectId={series.project_id}
          seasons={series.screenplay_data?.seasons}
        />

        <Separator />

        <SoraSettingsManager
          seriesId={seriesId}
          seriesName={series.name}
          settings={{
            sora_camera_style: series.sora_camera_style,
            sora_lighting_mood: series.sora_lighting_mood,
            sora_color_palette: series.sora_color_palette,
            sora_overall_tone: series.sora_overall_tone,
            sora_narrative_prefix: series.sora_narrative_prefix,
          }}
        />

        <Separator />

        <CharacterManager
          seriesId={seriesId}
          characters={series.characters || []}
        />

        <Separator />

        <SettingManager
          seriesId={seriesId}
          settings={series.settings || []}
        />

        <Separator />

        <VisualAssetManager seriesId={seriesId} />

        <Separator />

        <RelationshipManager
          seriesId={seriesId}
          characters={series.characters || []}
        />
      </div>
    </div>
  )
}
