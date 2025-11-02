import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAgentRoundtable, VisualTemplate } from '@/lib/ai/agent-orchestrator'
import { fetchCompleteSeriesContext, formatSeriesContextForAgents } from '@/lib/services/series-context'
import { generateCharacterPromptBlock } from '@/lib/types/character-consistency'
import { extractVisualState, SegmentVisualState, mergeVisualStates } from '@/lib/ai/visual-state-extractor'
import { validateContinuity, validateSegmentChain } from '@/lib/ai/continuity-validator'

/**
 * POST /api/segment-groups/[id]/generate-batch
 *
 * Generates all segments in a group sequentially with context propagation.
 * Phase 2 Enhancement: Implements anchor point refresh every 3-4 segments
 * to prevent context drift in long episode sequences.
 *
 * Body:
 * - platform?: string (default from series or 'tiktok')
 * - anchorPointInterval?: number (default 3, range 2-5)
 * - validateContinuity?: boolean (default true)
 *
 * Returns:
 * - videos: Array of created video records
 * - segmentGroup: Updated segment group with completion status
 * - continuityReport: Summary of continuity validation results
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params
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
      anchorPointInterval = 3, // Default: refresh context every 3 segments
      validateContinuityBefore = true,
    } = body

    // Fetch segment group with episode
    const { data: segmentGroup, error: groupError } = await supabase
      .from('segment_groups')
      .select(`
        *,
        episode:episodes(*)
      `)
      .eq('id', groupId)
      .single()

    if (groupError || !segmentGroup) {
      return NextResponse.json({ error: 'Segment group not found' }, { status: 404 })
    }

    const episode = segmentGroup.episode as any

    // Check authorization
    if (segmentGroup.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if already complete
    if (segmentGroup.status === 'complete') {
      return NextResponse.json(
        { error: 'Segment group already complete' },
        { status: 400 }
      )
    }

    // Fetch all segments ordered by segment_number
    const { data: segments, error: segmentsError } = await supabase
      .from('video_segments')
      .select('*')
      .eq('episode_id', segmentGroup.episode_id)
      .order('segment_number', { ascending: true })

    if (segmentsError || !segments || segments.length === 0) {
      return NextResponse.json({ error: 'No segments found' }, { status: 404 })
    }

    // Fetch complete series context (once for all segments)
    const completeContext = await fetchCompleteSeriesContext(episode.id)
    const seriesContext = formatSeriesContextForAgents(completeContext)

    // Generate character context block (once for all segments)
    let characterContext = ''
    if (completeContext.characters.length > 0) {
      const characterBlocks = completeContext.characters.map((char: any) =>
        char.sora_prompt_template || generateCharacterPromptBlock(char)
      )
      characterContext = `\n\nCHARACTERS IN THIS SERIES:\n${characterBlocks.join('\n\n')}\n\nIMPORTANT: The character descriptions above are LOCKED. Use them exactly as provided for consistency.\n\n`
    }

    // Determine platform (from request or default to tiktok)
    const videoPlatform = platform || 'tiktok'

    // Update segment group status to generating
    await supabase
      .from('segment_groups')
      .update({
        status: 'generating',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', groupId)

    // Track generation results
    const generatedVideos: any[] = []
    const continuityValidations: any[] = []
    let currentVisualState: SegmentVisualState | undefined = undefined
    let anchorPointStates: SegmentVisualState[] = [] // For anchor point refresh

    // Generate segments sequentially with context propagation
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentNumber = segment.segment_number

      console.log(`\n=== Generating Segment ${segmentNumber}/${segments.length} ===`)

      // Check if this is an anchor point segment (every N segments)
      const isAnchorPoint = segmentNumber % anchorPointInterval === 0

      // Phase 2: Anchor Point Refresh
      // If we're at an anchor point, merge recent visual states to refresh context
      if (isAnchorPoint && anchorPointStates.length > 0) {
        console.log(`Anchor point at segment ${segmentNumber} - Refreshing context from ${anchorPointStates.length} recent states`)
        currentVisualState = mergeVisualStates(anchorPointStates)
        anchorPointStates = [] // Reset after merge
      }

      // Phase 2: Validate continuity if requested
      if (validateContinuityBefore && currentVisualState) {
        const segmentBrief = buildSegmentBrief(segment, false)
        const validation = await validateContinuity(currentVisualState, segmentBrief, {
          autoCorrect: true,
          strictMode: false,
        })

        continuityValidations.push({
          segmentNumber,
          isValid: validation.isValid,
          score: validation.overallScore,
          issueCount: validation.issues.length,
          issues: validation.issues.map(i => ({
            type: i.type,
            severity: i.severity,
            description: i.description,
          })),
          autoCorrection: validation.autoCorrection,
        })

        if (!validation.isValid) {
          console.warn(`Continuity issues for segment ${segmentNumber} (score: ${validation.overallScore}):`)
          validation.issues.forEach(issue => {
            console.warn(`  - [${issue.severity}] ${issue.description}`)
          })
        }
      }

      // Build segment-specific brief
      const segmentBrief = buildSegmentBrief(segment, true)

      // Run agent roundtable with current visual state
      const roundtableResult = await runAgentRoundtable({
        brief: segmentBrief,
        platform: videoPlatform,
        visualTemplate: completeContext.series.visual_template ? completeContext.series.visual_template as VisualTemplate : undefined,
        seriesCharacters: completeContext.characters,
        seriesSettings: completeContext.settings,
        visualAssets: completeContext.visualAssets,
        characterRelationships: completeContext.relationships,
        seriesSoraSettings: {
          sora_camera_style: completeContext.series.sora_camera_style,
          sora_lighting_mood: completeContext.series.sora_lighting_mood,
          sora_color_palette: completeContext.series.sora_color_palette,
          sora_overall_tone: completeContext.series.sora_overall_tone,
          sora_narrative_prefix: completeContext.series.sora_narrative_prefix,
        },
        characterContext,
        segmentContext: currentVisualState, // Phase 2: Pass visual state from previous segment
        userId: user.id,
      })

      // Create video record
      const videoTitle = `${episode.title} - Segment ${segmentNumber}`

      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          series_id: episode.series_id,
          episode_id: episode.id,
          segment_id: segment.id,
          is_segment: true,
          segment_group_id: groupId,
          segment_order: segmentNumber,
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
            segment_id: segment.id,
            segment_number: segmentNumber,
            batch_generation: true,
            anchor_point: isAnchorPoint,
          },
        })
        .select()
        .single()

      if (videoError || !video) {
        console.error(`Failed to create video for segment ${segmentNumber}:`, videoError)

        // Update segment group with error
        await supabase
          .from('segment_groups')
          .update({
            status: 'error',
            error_message: `Failed at segment ${segmentNumber}: ${videoError?.message}`,
            generation_completed_at: new Date().toISOString(),
          })
          .eq('id', groupId)

        return NextResponse.json(
          {
            error: 'Failed to generate video',
            failedSegment: segmentNumber,
            details: videoError?.message,
            partialResults: { videos: generatedVideos, continuityValidations },
          },
          { status: 500 }
        )
      }

      generatedVideos.push(video)

      // Phase 2: Extract visual state from optimized prompt
      try {
        const visualState = await extractVisualState(roundtableResult.optimizedPrompt, {
          characterIds: completeContext.characters.map((c: any) => c.name),
        })

        // Update segment with extracted visual state
        await supabase
          .from('video_segments')
          .update({ final_visual_state: visualState })
          .eq('id', segment.id)

        // Set as current visual state for next segment
        currentVisualState = visualState

        // Add to anchor point states for periodic refresh
        anchorPointStates.push(visualState)

        console.log(`Visual state extracted and saved for segment ${segmentNumber}`)
      } catch (error) {
        console.error(`Failed to extract visual state for segment ${segmentNumber}:`, error)
        // Continue with generation - visual state extraction is not critical
      }

      // Update segment group progress
      await supabase
        .from('segment_groups')
        .update({
          completed_segments: i + 1,
          status: i + 1 === segments.length ? 'complete' : 'partial',
        })
        .eq('id', groupId)

      console.log(`Segment ${segmentNumber} complete (${i + 1}/${segments.length})`)
    }

    // Final segment group update
    const { data: updatedGroup } = await supabase
      .from('segment_groups')
      .update({
        status: 'complete',
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', groupId)
      .select()
      .single()

    // Generate continuity report summary
    const continuityReport = {
      totalSegments: segments.length,
      validatedSegments: continuityValidations.length,
      averageScore:
        continuityValidations.length > 0
          ? Math.round(
              continuityValidations.reduce((sum, v) => sum + v.score, 0) /
                continuityValidations.length
            )
          : null,
      issuesByType: continuityValidations.reduce((acc: any, v) => {
        v.issues.forEach((issue: any) => {
          acc[issue.type] = (acc[issue.type] || 0) + 1
        })
        return acc
      }, {}),
      issuesBySeverity: continuityValidations.reduce((acc: any, v) => {
        v.issues.forEach((issue: any) => {
          acc[issue.severity] = (acc[issue.severity] || 0) + 1
        })
        return acc
      }, {}),
      segmentsWithIssues: continuityValidations.filter(v => !v.isValid).length,
      validations: continuityValidations,
    }

    return NextResponse.json({
      videos: generatedVideos,
      segmentGroup: updatedGroup,
      continuityReport,
      anchorPointsUsed: Math.ceil(segments.length / anchorPointInterval),
    })
  } catch (error: any) {
    console.error('Batch generation error:', error)
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

  // Add preceding segment context (Phase 1: just notes, Phase 2: full visual state via segmentContext)
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
