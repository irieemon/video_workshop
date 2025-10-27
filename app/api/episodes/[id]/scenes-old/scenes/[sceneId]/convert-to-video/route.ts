import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { screenplayEnrichment } from '@/lib/services/screenplay-enrichment'

interface SceneToVideoRequest {
  duration?: number
  customInstructions?: string
  technicalOverrides?: {
    aspectRatio?: '16:9' | '9:16' | '1:1'
    resolution?: '1080p' | '720p'
    cameraStyle?: string
    lightingMood?: string
    colorPalette?: string
    overallTone?: string
  }
}

/**
 * POST /api/episodes/[episodeId]/scenes/[sceneId]/convert-to-video
 *
 * Converts a specific scene from an episode's screenplay into a video
 * with full screenplay context enrichment (dialogue, actions, characters, settings)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string; sceneId: string }> }
) {
  try {
    const { episodeId, sceneId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SceneToVideoRequest = await request.json()

    // 1. Extract scene from episode
    const scene = await screenplayEnrichment.extractScene(episodeId, sceneId)
    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found in episode screenplay' },
        { status: 404 }
      )
    }

    // 2. Get episode and series info
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('series_id, title, season_number, episode_number, user_id')
      .eq('id', episodeId)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // Verify user owns the episode
    if (episode.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - episode belongs to another user' },
        { status: 403 }
      )
    }

    // 3. Get series context
    const seriesContext = await screenplayEnrichment.getSeriesContext(
      episode.series_id,
      scene
    )

    if (!seriesContext) {
      return NextResponse.json(
        { error: 'Failed to load series context' },
        { status: 500 }
      )
    }

    // 4. Generate enriched prompt with screenplay context
    const technicalSpecs = {
      duration: body.duration || scene.duration_estimate || 6.5,
      aspectRatio: body.technicalOverrides?.aspectRatio || '9:16',
      resolution: body.technicalOverrides?.resolution || '1080p',
      cameraStyle: body.technicalOverrides?.cameraStyle,
      lightingMood: body.technicalOverrides?.lightingMood,
      colorPalette: body.technicalOverrides?.colorPalette,
      overallTone: body.technicalOverrides?.overallTone,
    }

    const enrichedPrompt = await screenplayEnrichment.generateEnrichedPrompt(
      scene,
      seriesContext,
      technicalSpecs
    )

    // Append custom instructions if provided
    const finalPrompt = body.customInstructions
      ? `${enrichedPrompt}\n\n**Additional Instructions**: ${body.customInstructions}`
      : enrichedPrompt

    // 5. Create enrichment data for storage
    const enrichmentData = screenplayEnrichment.createEnrichmentData(
      scene,
      seriesContext
    )

    // 6. Create video record with enriched prompt
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        episode_id: episodeId,
        series_id: episode.series_id,
        scene_id: sceneId,
        title: `${episode.title} - Scene ${scene.scene_number}`,
        user_brief: `Scene from S${episode.season_number}E${episode.episode_number}: ${scene.description.substring(0, 100)}...`,
        optimized_prompt: finalPrompt,
        screenplay_enrichment_data: enrichmentData,
        agent_discussion: {
          mode: 'screenplay-enriched',
          source: 'episode-scene',
          enrichmentTimestamp: new Date().toISOString(),
        },
        detailed_breakdown: {
          location: scene.location,
          timeOfDay: scene.time_of_day,
          timePeriod: scene.time_period,
          charactersInScene: seriesContext.characters.map(c => c.name),
          settingsUsed: seriesContext.settings.map(s => s.name),
        },
        character_count: finalPrompt.length,
        status: 'draft',
      })
      .select()
      .single()

    if (videoError) {
      console.error('Video creation error:', videoError)
      throw videoError
    }

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        optimized_prompt: video.optimized_prompt,
        scene_id: video.scene_id,
      },
      enrichmentContext: {
        charactersIncluded: seriesContext.characters.map(c => ({
          id: c.id,
          name: c.name,
          role: c.role,
        })),
        settingsUsed: seriesContext.settings.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
        })),
        dialogueExtracted: scene.dialogue || [],
        actionsExtracted: scene.action || [],
        sceneInfo: {
          location: scene.location,
          timeOfDay: scene.time_of_day,
          timePeriod: scene.time_period,
          sceneNumber: scene.scene_number,
        },
      },
    })
  } catch (error: any) {
    console.error('Scene to video conversion error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to convert scene to video',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
