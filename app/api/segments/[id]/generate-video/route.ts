import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable } from '@/lib/ai/agent-orchestrator'
import { fetchCompleteSeriesContext, formatSeriesContextForAgents } from '@/lib/services/series-context'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
import { extractVisualState, SegmentVisualState } from '@/lib/ai/visual-state-extractor'
import { validateContinuity } from '@/lib/ai/continuity-validator'

/**
 * POST /api/segments/[id]/generate-video
 *
 * Generates a video from a segment using the agent roundtable.
 * Injects segment-specific context including:
 * - Segment narrative beat and transition
 * - Preceding segment visual state (for continuity)
 * - Characters and settings in this segment
 * - Episode-level series context
 *
 * Body:
 * - platform?: string (default from series or 'tiktok')
 * - title?: string (default from segment narrative_beat)
 * - includePrecedingContext?: boolean (default true)
 *
 * Returns:
 * - video: Created video record
 * - segment: Updated segment with visual_state
 * - segmentGroup: Updated segment_group with completed count
 *
 * Phase 1: Basic generation without full context propagation
 * Phase 2: Will add visual state extraction and context injection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: segmentId } = await params
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      platform,
      title,
      includePrecedingContext = true,
    } = body

    // Fetch segment with episode data
    const { data: segment, error: segmentError } = await supabase
      .from('video_segments')
      .select(`
        *,
        episode:episodes(*)
      `)
      .eq('id', segmentId)
      .single()

    if (segmentError || !segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const episode = segment.episode as any

    // Check authorization (user must own the episode)
    if (episode.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch complete series context via episode
    const completeContext = await fetchCompleteSeriesContext(episode.id)
    const seriesContext = formatSeriesContextForAgents(completeContext)

    // Generate character context block
    let characterContext = ''
    if (completeContext.characters.length > 0) {
      const characterBlocks = completeContext.characters.map((char: any) =>
        char.sora_prompt_template || generateCharacterPromptBlock(char)
      )
      characterContext = `\n\nCHARACTERS IN THIS SEGMENT:\n${characterBlocks.join('\n\n')}\n\nIMPORTANT: The character descriptions above are LOCKED. Use them exactly as provided for consistency.\n\n`
    }

    // Phase 2: Fetch visual state from preceding segment if it exists
    let precedingVisualState: SegmentVisualState | undefined = undefined
    let continuityValidation = null

    if (includePrecedingContext && segment.preceding_segment_id) {
      // Fetch preceding segment
      const { data: precedingSegment } = await supabase
        .from('video_segments')
        .select('final_visual_state')
        .eq('id', segment.preceding_segment_id)
        .single()

      if (precedingSegment?.final_visual_state) {
        precedingVisualState = precedingSegment.final_visual_state as SegmentVisualState

        // Optional: Validate continuity with current segment context
        // This helps detect potential issues before generation
        const currentContext = buildSegmentBrief(segment, false)
        continuityValidation = await validateContinuity(precedingVisualState, currentContext, {
          autoCorrect: true,
        })

        // Log continuity issues for debugging
        if (!continuityValidation.isValid) {
          console.warn(`Continuity issues detected for segment ${segment.segment_number}:`, {
            score: continuityValidation.overallScore,
            issueCount: continuityValidation.issues.length,
            issues: continuityValidation.issues,
          })
        }
      }
    }

    // Build segment-specific brief
    const segmentBrief = buildSegmentBrief(segment, includePrecedingContext)

    // Determine platform (segment -> series -> default)
    const videoPlatform = platform || completeContext.series.visual_style?.default_platform || 'tiktok'

    // Run agent roundtable with segment context (Phase 2: includes visual state)
    const roundtableResult = await runAgentRoundtable({
      brief: segmentBrief,
      platform: videoPlatform,
      visualTemplate: completeContext.series.visual_template,
      seriesCharacters: completeContext.characters,
      seriesSettings: completeContext.settings,
      visualAssets: completeContext.visualAssets,
      characterRelationships: completeContext.characterRelationships,
      seriesSoraSettings: {
        sora_camera_style: completeContext.series.sora_camera_style,
        sora_lighting_mood: completeContext.series.sora_lighting_mood,
        sora_color_palette: completeContext.series.sora_color_palette,
        sora_overall_tone: completeContext.series.sora_overall_tone,
        sora_narrative_prefix: completeContext.series.sora_narrative_prefix,
      },
      characterContext,
      seriesContext,
      segmentContext: precedingVisualState, // Phase 2: Visual continuity context
      userId: user.id,
    })

    // Create video record
    const videoTitle = title || `${episode.title} - Segment ${segment.segment_number}`

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        series_id: episode.series_id,
        episode_id: episode.id,
        segment_id: segmentId,
        is_segment: true,
        segment_group_id: null, // Will be set via segment lookup if needed
        segment_order: segment.segment_number,
        title: videoTitle,
        user_brief: segmentBrief,
        agent_discussion: roundtableResult.discussion,
        optimized_prompt: roundtableResult.optimizedPrompt,
        detailed_breakdown: roundtableResult.detailedBreakdown,
        character_count: roundtableResult.characterCount,
        platform: videoPlatform,
        status: 'generated',
        hashtags: roundtableResult.hashtags || [],
        generation_source: 'episode',
        source_metadata: {
          episode_id: episode.id,
          episode_number: episode.episode_number,
          season_number: episode.season_number,
          segment_id: segmentId,
          segment_number: segment.segment_number,
        },
      })
      .select()
      .single()

    if (videoError || !video) {
      console.error('Error creating video:', videoError)
      return NextResponse.json(
        { error: 'Failed to create video', details: videoError?.message },
        { status: 500 }
      )
    }

    // Phase 2: Extract visual state from optimized prompt for next segment
    try {
      const visualState = await extractVisualState(roundtableResult.optimizedPrompt, {
        characterIds: completeContext.characters.map((c: any) => c.name),
      })

      // Update segment with extracted visual state
      await supabase
        .from('video_segments')
        .update({ final_visual_state: visualState })
        .eq('id', segmentId)

      console.log(`Visual state extracted and saved for segment ${segment.segment_number}`)
    } catch (error) {
      console.error('Failed to extract visual state:', error)
      // Non-critical failure - continue with video creation
    }

    // Update segment group if this segment is part of a group
    const { data: segmentGroup } = await supabase
      .from('segment_groups')
      .select('*')
      .eq('episode_id', episode.id)
      .single()

    if (segmentGroup) {
      // Update video with segment_group_id
      await supabase
        .from('videos')
        .update({ segment_group_id: segmentGroup.id })
        .eq('id', video.id)

      // Update segment group completed count
      const { data: updatedGroup } = await supabase
        .from('segment_groups')
        .update({
          completed_segments: segmentGroup.completed_segments + 1,
          status:
            segmentGroup.completed_segments + 1 === segmentGroup.total_segments
              ? 'complete'
              : 'partial',
        })
        .eq('id', segmentGroup.id)
        .select()
        .single()

      return NextResponse.json({
        video,
        segment,
        segmentGroup: updatedGroup,
      })
    }

    return NextResponse.json({
      video,
      segment,
      segmentGroup: null,
    })
  } catch (error: any) {
    console.error('Generate segment video error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Builds a segment-specific brief with context
 */
function buildSegmentBrief(segment: any, includePreceding: boolean): string {
  let brief = `SEGMENT ${segment.segment_number} - ${segment.narrative_beat}\n\n`

  // Add narrative transition if exists
  if (segment.narrative_transition) {
    brief += `TRANSITION: ${segment.narrative_transition}\n\n`
  }

  // Add preceding segment context (Phase 1: just notes, Phase 2: full visual state)
  if (includePreceding && segment.visual_continuity_notes) {
    brief += `CONTINUITY NOTES: ${segment.visual_continuity_notes}\n\n`
  }

  // Add dialogue
  if (segment.dialogue_lines && segment.dialogue_lines.length > 0) {
    brief += `DIALOGUE:\n`
    segment.dialogue_lines.forEach((d: any) => {
      brief += `${d.character}: "${d.lines.join(' ')}"\n`
    })
    brief += `\n`
  }

  // Add action beats
  if (segment.action_beats && segment.action_beats.length > 0) {
    brief += `ACTION:\n`
    segment.action_beats.forEach((action: string) => {
      brief += `- ${action}\n`
    })
    brief += `\n`
  }

  // Add duration target
  brief += `TARGET DURATION: ${segment.estimated_duration} seconds\n`

  return brief
}
