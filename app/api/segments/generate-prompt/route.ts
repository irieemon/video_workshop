import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'

/**
 * POST /api/segments/generate-prompt
 *
 * Generates a comprehensive Sora video prompt for a segment using agent roundtable orchestration.
 * Produces detailed cinematographic prompts with lighting, camera, sound, and shot list specifications.
 *
 * Body:
 * - segmentId: string - Video segment ID
 * - episodeId: string - Episode ID (for context)
 * - seriesId: string - Series ID (for character templates)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const { segmentId, episodeId, seriesId } = body

    console.log('[Segment Prompt Generation] Request:', { segmentId, episodeId, seriesId })

    if (!segmentId || !episodeId || !seriesId) {
      console.error('[Segment Prompt Generation] Missing required fields:', body)
      return NextResponse.json(
        { error: 'segmentId, episodeId, and seriesId are required' },
        { status: 400 }
      )
    }

    // Fetch segment with full context
    const { data: segment, error: segmentError } = await supabase
      .from('video_segments')
      .select('*')
      .eq('id', segmentId)
      .single()

    if (segmentError || !segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: episode } = await supabase
      .from('episodes')
      .select('user_id, title, structured_screenplay')
      .eq('id', episodeId)
      .single()

    if (episode?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch series with complete context
    console.log('[Segment Prompt Generation] Fetching series:', seriesId)
    const { data: series, error: seriesError } = await supabase
      .from('series')
      .select(`
        id,
        name,
        description,
        visual_template,
        sora_camera_style,
        sora_lighting_mood,
        sora_color_palette,
        sora_overall_tone,
        sora_narrative_prefix
      `)
      .eq('id', seriesId)
      .single()

    if (seriesError) {
      console.error('[Segment Prompt Generation] Series query error:', seriesError)
      return NextResponse.json({
        error: 'Failed to fetch series',
        details: seriesError.message
      }, { status: 500 })
    }

    if (!series) {
      console.error('[Segment Prompt Generation] Series not found for ID:', seriesId)
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    console.log('[Segment Prompt Generation] Series found:', series.name)

    // Fetch series characters for this segment
    const { data: seriesCharacters } = await supabase
      .from('series_characters')
      .select('*')
      .eq('series_id', seriesId)
      .in('name', segment.characters_in_segment || [])

    // Fetch series settings for this segment
    const { data: seriesSettings } = await supabase
      .from('series_settings')
      .select('*')
      .eq('series_id', seriesId)

    // Fetch visual assets
    const { data: visualAssets } = await supabase
      .from('series_visual_assets')
      .select('*')
      .eq('series_id', seriesId)
      .order('display_order', { ascending: true })

    // Fetch character relationships
    let characterRelationships = []
    if (seriesCharacters && seriesCharacters.length > 0) {
      const characterIds = seriesCharacters.map(c => c.id)
      const { data: relationships } = await supabase
        .from('character_relationships')
        .select(`
          *,
          character_a:series_characters!character_relationships_character_a_id_fkey(id, name),
          character_b:series_characters!character_relationships_character_b_id_fkey(id, name)
        `)
        .eq('series_id', seriesId)
        .or(`character_a_id.in.(${characterIds.join(',')}),character_b_id.in.(${characterIds.join(',')})`)
      characterRelationships = relationships || []
    }

    // Build rich brief from segment data
    const brief = buildSegmentBrief(segment, episode)

    // Generate character context block
    let characterContext = ''
    if (seriesCharacters && seriesCharacters.length > 0) {
      const characterBlocks = seriesCharacters.map(char =>
        char.sora_prompt_template || generateCharacterPromptBlock(char as any)
      )
      characterContext = `\n\nCHARACTERS IN THIS SEGMENT:\n${characterBlocks.join('\n\n')}\n\nIMPORTANT: Character descriptions are LOCKED for series consistency. Use them exactly as specified.\n\n`
    }

    // Run agent roundtable for comprehensive prompt generation
    const result = await runAgentRoundtable({
      brief,
      platform: 'other', // Segments are for general video, not social media specific
      visualTemplate: series.visual_template || undefined,
      seriesCharacters: seriesCharacters || undefined,
      seriesSettings: seriesSettings || undefined,
      visualAssets: visualAssets || undefined,
      characterRelationships: characterRelationships || undefined,
      seriesSoraSettings: {
        sora_camera_style: series.sora_camera_style,
        sora_lighting_mood: series.sora_lighting_mood,
        sora_color_palette: series.sora_color_palette,
        sora_overall_tone: series.sora_overall_tone,
        sora_narrative_prefix: series.sora_narrative_prefix,
      },
      characterContext,
      userId: user.id,
    })

    return NextResponse.json({
      prompt: result.optimizedPrompt,
      discussion: result.discussion, // Include agent discussion for reference
    })
  } catch (error: any) {
    console.error('Error generating prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Build a rich creative brief from segment data for agent roundtable
 */
function buildSegmentBrief(segment: any, episode: any): string {
  const parts: string[] = []

  // Episode context
  if (episode?.title) {
    parts.push(`EPISODE: "${episode.title}"`)
  }

  // Segment narrative beat (primary scene description)
  parts.push(`\nSCENE: ${segment.narrative_beat}`)

  // Segment timing information
  parts.push(`\nDURATION: ${segment.estimated_duration} seconds (Segment #${segment.segment_number})`)

  // Visual continuity notes
  if (segment.visual_continuity_notes) {
    parts.push(`\nVISUAL CONTINUITY: ${segment.visual_continuity_notes}`)
  }

  // Narrative transition
  if (segment.narrative_transition) {
    parts.push(`\nTRANSITION: ${segment.narrative_transition}`)
  }

  // Action beats
  if (segment.action_beats && segment.action_beats.length > 0) {
    parts.push(`\nKEY ACTIONS:`)
    segment.action_beats.forEach((action: string) => {
      parts.push(`- ${action}`)
    })
  }

  // Dialogue lines with character names
  if (segment.dialogue_lines && segment.dialogue_lines.length > 0) {
    parts.push(`\nDIALOGUE:`)
    segment.dialogue_lines.forEach((line: any) => {
      const dialogueText = Array.isArray(line.lines) ? line.lines.join(' ') : line.lines
      parts.push(`- ${line.character}: "${dialogueText}"`)
    })
  }

  // Characters in scene
  if (segment.characters_in_segment && segment.characters_in_segment.length > 0) {
    parts.push(`\nCHARACTERS: ${segment.characters_in_segment.join(', ')}`)
  }

  // Settings/locations
  if (segment.settings_in_segment && segment.settings_in_segment.length > 0) {
    parts.push(`\nLOCATIONS: ${segment.settings_in_segment.join(', ')}`)
  }

  parts.push(`\nOBJECTIVE: Create a comprehensive, cinematographically detailed Sora video prompt for this segment that maintains visual consistency with the series while telling this specific story moment.`)

  return parts.join('\n')
}
