import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEnhancedContextPrompt, buildEpisodeContextPrompt, EnhancedSeriesContext } from '@/lib/ai/screenplay-context'

interface EpisodeConcept {
  episode_number: number
  season_number: number
  title: string
  logline: string
  plot_summary: string
  character_focus: string[]
  season_title?: string
  season_arc?: string
}

interface StartSessionRequest {
  seriesId: string
  targetType: 'series' | 'episode' | 'scene' | 'character'
  targetId?: string
  initialConcept?: EpisodeConcept
}

/**
 * POST /api/screenplay/session/start
 * Initiates a new screenplay writing session with the agent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: StartSessionRequest = await request.json()
    const { seriesId, targetType, targetId, initialConcept } = body

    console.log('[Screenplay Session] Starting session for:', { seriesId, targetType, hasInitialConcept: !!initialConcept })

    // Fetch full series context with all related data
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select(`
        *,
        characters:series_characters(*),
        settings:series_settings(*),
        visual_assets:series_visual_assets(*),
        relationships:character_relationships(*)
      `)
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError || !series) {
      console.error('[Screenplay Session] Series fetch error:', seriesError)
      return NextResponse.json(
        {
          error: 'Series not found',
          details: seriesError?.message,
          code: seriesError?.code
        },
        { status: 404 }
      )
    }

    console.log('[Screenplay Session] Series found:', {
      id: series.id,
      name: series.name,
      characterCount: series.characters?.length || 0,
      settingCount: series.settings?.length || 0
    })

    console.log('[Screenplay Session] Building enhanced context...')

    // Build enhanced context prompt for AI
    const enhancedContext: EnhancedSeriesContext = {
      seriesId: series.id,
      seriesName: series.name,
      description: series.description,
      genre: series.genre,
      tone: series.tone,
      screenplay_data: series.screenplay_data,
      characters: series.characters || [],
      settings: series.settings || [],
      visual_assets: series.visual_assets || [],
      relationships: series.relationships || [],
      enforce_continuity: series.enforce_continuity || false,
      allow_continuity_breaks: series.allow_continuity_breaks || false,
      sora_camera_style: series.sora_camera_style,
      sora_lighting_mood: series.sora_lighting_mood,
      sora_color_palette: series.sora_color_palette,
      sora_overall_tone: series.sora_overall_tone,
      sora_narrative_prefix: series.sora_narrative_prefix,
    }

    const seriesContextPrompt = buildEnhancedContextPrompt(enhancedContext)

    // Determine initial conversation based on target type
    let initialStep = 'series_setup'
    let initialMessage = ''
    let systemContext = seriesContextPrompt

    switch (targetType) {
      case 'series':
        initialStep = 'series_setup'
        initialMessage = `Great! Let's create a professional screenplay structure for "${series.name}". I'll guide you through this step by step.

First, let's start with the core concept:

**What's your series about in one sentence?** (This will become your logline - the elevator pitch that captures your protagonist, their goal, and what's at stake)`
        break

      case 'episode':
        initialStep = 'episode_planning'
        if (initialConcept) {
          // Build episode-specific context
          const episodeContextPrompt = buildEpisodeContextPrompt(initialConcept, enhancedContext)
          systemContext = episodeContextPrompt + '\n\n' + seriesContextPrompt

          // Use the episode concept data to create a personalized initial message
          const seasonInfo = initialConcept.season_title
            ? `Season ${initialConcept.season_number}: ${initialConcept.season_title}`
            : `Season ${initialConcept.season_number}`

          const characterCount = enhancedContext.characters.length
          const settingCount = enhancedContext.settings.length
          const relationshipCount = enhancedContext.relationships?.length || 0

          initialMessage = `Perfect! I'm ready to help you develop **"${initialConcept.title}"** (S${initialConcept.season_number}E${initialConcept.episode_number}).

I have complete context for "${series.name}":
- ${characterCount} established character${characterCount !== 1 ? 's' : ''}
- ${settingCount} location${settingCount !== 1 ? 's' : ''}
- ${relationshipCount} character relationship${relationshipCount !== 1 ? 's' : ''}
- Series visual style and tone guidelines

**Episode Concept:**
*${initialConcept.logline}*

${initialConcept.plot_summary}

Let's develop this into a detailed screenplay. I'll help you structure the acts, create compelling scenes, and ensure everything aligns with your established characters and world.

**To start: What emotional journey do you want the main character(s) to go through in this episode?**`
        } else {
          initialMessage = `Perfect! Let's break down this episode with professional screenplay structure.

I have access to all your series context (characters, settings, relationships, and visual style) to ensure continuity.

**What's the main story you want to tell in this episode?** Give me a brief overview - what happens, and how does it change your protagonist?`
        }
        break

      case 'scene':
        initialStep = 'scene_creation'
        initialMessage = `Let's craft this scene with professional detail.

**First, where and when does this scene take place?**
- Location (Detective's office, City street, Character's apartment)?
- Time of day (DAY, NIGHT, DAWN, DUSK)?
- Interior or Exterior?`
        break

      case 'character':
        initialStep = 'character_development'
        initialMessage = `Let's develop your character with depth that will make them compelling on screen.

**Tell me about this character - who are they at their core?**
- What's their defining personality trait?
- What's their background?
- What makes them interesting or unique?`
        break
    }

    console.log('[Screenplay Session] Context built, creating episode if needed...')

    // Create episode if this is for an episode
    let episodeId: string | null = null
    if (targetType === 'episode' && initialConcept) {
      console.log('[Screenplay Session] Creating episode:', {
        season: initialConcept.season_number,
        episode: initialConcept.episode_number,
        title: initialConcept.title
      })

      const { data: episode, error: episodeError } = await supabase
        .from('episodes')
        .insert({
          series_id: seriesId,
          user_id: user.id,
          season_number: initialConcept.season_number,
          episode_number: initialConcept.episode_number,
          title: initialConcept.title,
          logline: initialConcept.logline,
          status: 'draft',
        })
        .select()
        .single()

      if (episodeError) {
        console.log('[Screenplay Session] Episode insert error, checking if exists:', episodeError.code)
        // Episode might already exist - try to fetch it
        const { data: existingEpisode } = await supabase
          .from('episodes')
          .select('id')
          .eq('series_id', seriesId)
          .eq('season_number', initialConcept.season_number)
          .eq('episode_number', initialConcept.episode_number)
          .single()

        episodeId = existingEpisode?.id || null
        console.log('[Screenplay Session] Found existing episode:', episodeId)
      } else {
        episodeId = episode.id
        console.log('[Screenplay Session] Created new episode:', episodeId)
      }
    }

    console.log('[Screenplay Session] Creating screenplay session...')

    // Create screenplay session with full context
    const { data: session, error: sessionError } = await supabase
      .from('screenplay_sessions')
      .insert({
        series_id: seriesId,
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        current_step: initialStep,
        conversation_history: [
          {
            role: 'system',
            content: systemContext,
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: initialMessage,
            timestamp: new Date().toISOString(),
          },
        ],
        completed_steps: [],
        completed: false,
        episode_id: episodeId,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Failed to create screenplay session:', sessionError)
      return NextResponse.json(
        {
          error: 'Failed to start session',
          details: sessionError.message,
          code: sessionError.code,
          hint: sessionError.hint
        },
        { status: 500 }
      )
    }

    // Update episode with current session ID if we created one
    if (episodeId) {
      await supabase
        .from('episodes')
        .update({ current_session_id: session.id })
        .eq('id', episodeId)
    }

    return NextResponse.json({
      sessionId: session.id,
      episodeId,
      initialMessage,
      currentStep: initialStep,
      series: {
        id: series.id,
        name: series.name,
        screenplayData: series.screenplay_data,
      },
    })
  } catch (error: any) {
    console.error('Start screenplay session error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/screenplay/session/start?seriesId=xxx
 * Get active sessions for a series
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const seriesId = searchParams.get('seriesId')

    if (!seriesId) {
      return NextResponse.json(
        { error: 'seriesId required' },
        { status: 400 }
      )
    }

    // Get active sessions for this series
    const { data: sessions, error } = await supabase
      .from('screenplay_sessions')
      .select('*')
      .eq('series_id', seriesId)
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('last_activity_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error('Get screenplay sessions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
