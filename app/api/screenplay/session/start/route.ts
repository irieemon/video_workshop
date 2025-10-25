import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Verify user owns this series
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select('id, name, screenplay_data')
      .eq('id', seriesId)
      .eq('user_id', user.id)
      .single()

    if (seriesError || !series) {
      return NextResponse.json(
        { error: 'Series not found' },
        { status: 404 }
      )
    }

    // Determine initial conversation based on target type
    let initialStep = 'series_setup'
    let initialMessage = ''

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
          // Use the episode concept data to create a personalized initial message
          const seasonInfo = initialConcept.season_title
            ? `Season ${initialConcept.season_number}: ${initialConcept.season_title}`
            : `Season ${initialConcept.season_number}`

          const characterFocus = initialConcept.character_focus && initialConcept.character_focus.length > 0
            ? `\n- **Character Focus**: ${initialConcept.character_focus.join(', ')}`
            : ''

          initialMessage = `Perfect! I can see you want to develop **Episode ${initialConcept.episode_number}** from ${seasonInfo}.

Here's what we have from your series concept:

**"${initialConcept.title}"**
*${initialConcept.logline}*

**Overview**: ${initialConcept.plot_summary}${characterFocus}

Let's break this down into a detailed screenplay structure with proper acts, beats, and scenes.

**First, let's establish the episode structure:**

What's the **protagonist's emotional state at the start** of this episode? Where are they mentally/emotionally before the events unfold?`
        } else {
          initialMessage = `Perfect! Let's break down this episode with proper screenplay structure.

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

    // Create episode if this is for an episode
    let episodeId: string | null = null
    if (targetType === 'episode' && initialConcept) {
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
        // Episode might already exist - try to fetch it
        const { data: existingEpisode } = await supabase
          .from('episodes')
          .select('id')
          .eq('series_id', seriesId)
          .eq('season_number', initialConcept.season_number)
          .eq('episode_number', initialConcept.episode_number)
          .single()

        episodeId = existingEpisode?.id || null
      } else {
        episodeId = episode.id
      }
    }

    // Create screenplay session
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
        { error: 'Failed to start session' },
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
