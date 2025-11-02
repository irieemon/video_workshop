import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SegmentationOptions } from '@/lib/ai/episode-segmenter'
import type { Episode, StructuredScreenplay } from '@/lib/types/database.types'
import {
  validateStructuredScreenplay,
  formatValidationErrors,
} from '@/lib/utils/screenplay-extraction'

/**
 * POST /api/episodes/create-segments
 *
 * Creates video segments from an episode's structured screenplay.
 * Intelligently breaks the episode into ~10-second narrative beats
 * with natural transitions and continuity tracking.
 *
 * Body:
 * - episodeId: string (REQUIRED) - Episode ID to create segments for
 * - targetDuration?: number (default 10 seconds)
 * - minDuration?: number (default 8 seconds)
 * - maxDuration?: number (default 12 seconds)
 * - preferSceneBoundaries?: boolean (default true)
 * - createSegmentGroup?: boolean (default true) - Create segment_group record
 *
 * Returns:
 * - episode: Episode data
 * - segmentGroup: Segment group record (if createSegmentGroup = true)
 * - segments: Array of created video_segments records
 * - totalDuration: Total episode duration in seconds
 * - segmentCount: Number of segments created
 * - estimatedCost: Estimated Sora API cost
 */
export async function POST(request: NextRequest) {
  console.log('[API] ========== POST /api/episodes/create-segments START ==========')
  const startTime = Date.now()

  try {
    console.log('[API] Step 1: Creating Supabase client...')
    const supabase = await createClient()
    console.log('[API] Step 1: ✅ Supabase client created')

    // Get authenticated user
    console.log('[API] Step 2: Getting authenticated user...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[API] Step 2: ❌ No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[API] Step 2: ✅ User authenticated:', user.id)

    // Parse request body
    console.log('[API] Step 3: Parsing request body...')
    const body = await request.json()
    const {
      episodeId,
      targetDuration,
      minDuration,
      maxDuration,
      preferSceneBoundaries,
      createSegmentGroup = true,
    } = body
    console.log('[API] Step 3: ✅ Body parsed:', { episodeId, targetDuration })

    // Validate required fields
    if (!episodeId) {
      console.log('[API] Step 3: ❌ Missing episodeId')
      return NextResponse.json({ error: 'episodeId required in request body' }, { status: 400 })
    }

    // Fetch episode
    console.log('[API] Step 4: Fetching episode from database...')
    const { data: episodeData, error: episodeError } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', episodeId)
      .single()

    console.log('[API] Step 4: Database query completed')

    if (episodeError || !episodeData) {
      console.log('[API] Step 4: ❌ Episode not found:', episodeError)
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }
    console.log('[API] Step 4: ✅ Episode found:', episodeData.id)

    // Security check: Verify user owns this episode
    console.log('[API] Step 5: Checking ownership...')
    if (episodeData.user_id !== user.id) {
      console.log('[API] Step 5: ❌ Ownership mismatch')
      return NextResponse.json({ error: 'Forbidden - you do not own this episode' }, { status: 403 })
    }
    console.log('[API] Step 5: ✅ Ownership verified')

    let episode: typeof episodeData = episodeData

    // If no structured screenplay exists, return clear error
    console.log('[API] Step 6: Checking for structured screenplay...')
    if (!episode.structured_screenplay) {
      console.log('[API] Step 6: ❌ No structured screenplay')
      return NextResponse.json(
        {
          error: 'Episode must have a valid structured screenplay to create segments',
          hint: 'Please use the screenplay AI agent to generate a properly structured screenplay. The agent will automatically create scenes with dialogue, action beats, and character information in the correct format.',
          instructions: [
            '1. Open the episode in the screenplay editor',
            '2. Complete the screenplay conversation with the AI agent',
            '3. The agent will output a structured screenplay in JSON format',
            '4. Once saved, you can create segments from the episode'
          ]
        },
        { status: 400 }
      )
    }

    console.log('[API] Step 6: ✅ Structured screenplay exists')

    // Validate structured screenplay using comprehensive validation
    console.log('[API] Step 7: Validating screenplay structure...')
    const validationResult = validateStructuredScreenplay(episode.structured_screenplay as StructuredScreenplay)

    if (!validationResult.valid) {
      console.log('[API] Step 7: ❌ Validation failed')
      console.error('Structured screenplay validation failed:')
      console.error(formatValidationErrors(validationResult.errors))

      return NextResponse.json(
        {
          error: 'Episode structured screenplay is invalid and cannot be segmented',
          details: formatValidationErrors(validationResult.errors),
          hint: 'Please regenerate the screenplay using the screenplay AI agent. The agent will create properly structured scenes with dialogue, action beats, and characters.',
          instructions: [
            '1. Open the episode in the screenplay editor',
            '2. Start a new conversation with the AI agent',
            '3. Complete the screenplay development process',
            '4. The agent will output valid structured JSON automatically',
            '5. Once saved, you can create segments from the episode'
          ]
        },
        { status: 400 }
      )
    }
    console.log('[API] Step 7: ✅ Validation passed')

    // Log warnings if any
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      console.log('[API] Warnings:', validationResult.warnings)
    }

    // Run segmentation algorithm with dynamic import to avoid Next.js 16 bundling issues
    console.log('[API] Step 8: Running segmentation algorithm...')
    const segmentStartTime = Date.now()
    const options: SegmentationOptions = {
      target_duration: targetDuration,
      min_duration: minDuration,
      max_duration: maxDuration,
      prefer_scene_boundaries: preferSceneBoundaries,
    }

    console.log('[API] Step 8a: Dynamically importing segmenter module...')
    const { segmentEpisode } = await import('@/lib/ai/episode-segmenter')
    console.log('[API] Step 8b: Module imported, calling segmentEpisode...')

    const segmentationResult = segmentEpisode(episode as Episode, options)
    const segmentDuration = Date.now() - segmentStartTime

    console.log(`[API] Step 8: ✅ Segmentation completed in ${segmentDuration}ms`)
    console.log('[API] Segmentation result:', {
      episode_id: segmentationResult.episode_id,
      segment_count: segmentationResult.segment_count,
      total_duration: segmentationResult.total_duration,
      segments_length: segmentationResult.segments.length
    })

    // Validate we got segments
    console.log('[API] Step 9: Validating segment count...')
    if (segmentationResult.segment_count === 0 || segmentationResult.segments.length === 0) {
      console.log('[API] Step 9: ❌ No segments produced')
      return NextResponse.json(
        {
          error: 'Segmentation produced 0 segments',
          hint: 'The episode content may be too short or improperly formatted. Please check the structured screenplay.'
        },
        { status: 400 }
      )
    }
    console.log('[API] Step 9: ✅ Segment count valid:', segmentationResult.segment_count)

    // Estimate cost (assume $0.20 per 10-second segment)
    console.log('[API] Step 10: Calculating estimated cost...')
    const COST_PER_10S_SEGMENT = 0.20
    const estimatedCost = segmentationResult.segment_count * COST_PER_10S_SEGMENT
    console.log('[API] Step 10: ✅ Estimated cost:', `$${estimatedCost.toFixed(2)}`)

    // Create segment_group record if requested
    let segmentGroup = null
    if (createSegmentGroup) {
      console.log('[API] Step 11: Creating segment_group record...')
      const groupStartTime = Date.now()

      const { data: groupData, error: groupError } = await supabase
        .from('segment_groups')
        .insert({
          episode_id: episodeId,
          user_id: user.id,
          series_id: episode.series_id,
          title: `${episode.title} - ${segmentationResult.segment_count} Segments`,
          description: `Multi-segment video generation for episode`,
          total_segments: segmentationResult.segment_count,
          completed_segments: 0,
          status: 'planning',
          estimated_cost: estimatedCost,
        })
        .select()
        .single()

      const groupDuration = Date.now() - groupStartTime
      console.log(`[API] Step 11: Database insert completed in ${groupDuration}ms`)

      if (groupError) {
        console.log('[API] Step 11: ❌ Failed to create segment_group')
        console.error('Error creating segment_group:', groupError)
        return NextResponse.json(
          { error: 'Failed to create segment group', details: groupError.message },
          { status: 500 }
        )
      }

      segmentGroup = groupData
      console.log('[API] Step 11: ✅ Segment_group created:', groupData.id)
    } else {
      console.log('[API] Step 11: ⏭️ Skipping segment_group creation (createSegmentGroup=false)')
    }

    // Insert all segments into video_segments table
    console.log('[API] Step 12: Preparing segment data for insertion...')
    const segmentsToInsert = segmentationResult.segments.map((seg) => ({
      episode_id: episodeId,
      segment_number: seg.segment_number,
      scene_ids: seg.scene_ids,
      start_timestamp: seg.start_timestamp,
      end_timestamp: seg.end_timestamp,
      estimated_duration: seg.estimated_duration,
      narrative_beat: seg.narrative_beat,
      narrative_transition: seg.narrative_transition || null,
      dialogue_lines: seg.dialogue_lines,
      action_beats: seg.action_beats,
      characters_in_segment: seg.characters_in_segment,
      settings_in_segment: seg.settings_in_segment,
      visual_continuity_notes: seg.visual_continuity_notes || null,
      preceding_segment_id: null, // Will be linked in Phase 2
      following_segment_id: null, // Will be linked in Phase 2
      final_visual_state: null, // Populated after prompt generation
    }))
    console.log('[API] Step 12: ✅ Prepared', segmentsToInsert.length, 'segments for insertion')

    // Validate segment durations against database constraints
    const invalidSegments = segmentsToInsert.filter(seg => seg.estimated_duration <= 0 || seg.estimated_duration > 15)
    if (invalidSegments.length > 0) {
      console.log('[API] Step 12: ⚠️ Found segments with invalid durations:', invalidSegments.map(s => ({
        segment: s.segment_number,
        duration: s.estimated_duration,
        narrative: s.narrative_beat.slice(0, 50)
      })))
    }

    console.log('[API] Step 13: Inserting segments into database...')
    const insertStartTime = Date.now()

    const { data: insertedSegments, error: insertError } = await supabase
      .from('video_segments')
      .insert(segmentsToInsert)
      .select()

    const insertDuration = Date.now() - insertStartTime
    console.log(`[API] Step 13: Database insert completed in ${insertDuration}ms`)

    if (insertError) {
      console.log('[API] Step 13: ❌ Failed to insert segments')
      console.error('Error inserting segments:', insertError)
      return NextResponse.json(
        { error: 'Failed to create segments', details: insertError.message },
        { status: 500 }
      )
    }
    console.log('[API] Step 13: ✅ Successfully inserted', insertedSegments?.length || 0, 'segments')

    // Link segments in continuity chain (preceding/following)
    console.log('[API] Step 14: Linking segments in continuity chain...')
    if (insertedSegments && insertedSegments.length > 1) {
      const linkStartTime = Date.now()
      const updates = []

      for (let i = 0; i < insertedSegments.length; i++) {
        const segment = insertedSegments[i]
        const precedingId = i > 0 ? insertedSegments[i - 1].id : null
        const followingId = i < insertedSegments.length - 1 ? insertedSegments[i + 1].id : null

        if (precedingId || followingId) {
          updates.push(
            supabase
              .from('video_segments')
              .update({
                preceding_segment_id: precedingId,
                following_segment_id: followingId,
              })
              .eq('id', segment.id)
          )
        }
      }

      console.log('[API] Step 14: Executing', updates.length, 'link updates in parallel...')
      // Execute all updates in parallel
      await Promise.all(updates)
      const linkDuration = Date.now() - linkStartTime
      console.log(`[API] Step 14: ✅ Segment linking completed in ${linkDuration}ms`)
    } else {
      console.log('[API] Step 14: ⏭️ Skipping segment linking (only 1 segment or no segments)')
    }

    // Fetch updated segments with linked chain
    console.log('[API] Step 15: Fetching final segments with continuity chain...')
    const fetchStartTime = Date.now()

    const { data: finalSegments } = await supabase
      .from('video_segments')
      .select('*')
      .eq('episode_id', episodeId)
      .order('segment_number', { ascending: true })

    const fetchDuration = Date.now() - fetchStartTime
    console.log(`[API] Step 15: ✅ Fetched ${finalSegments?.length || 0} segments in ${fetchDuration}ms`)

    const totalDuration = Date.now() - startTime
    console.log('[API] ========== COMPLETE ==========')
    console.log(`[API] Total execution time: ${totalDuration}ms`)
    console.log(`[API] Response summary: ${segmentationResult.segment_count} segments, $${estimatedCost.toFixed(2)} estimated`)

    return NextResponse.json({
      episode: {
        id: episode.id,
        title: episode.title,
        series_id: episode.series_id,
      },
      segmentGroup,
      segments: finalSegments || insertedSegments,
      totalDuration: segmentationResult.total_duration,
      segmentCount: segmentationResult.segment_count,
      estimatedCost,
    })
  } catch (error: any) {
    const errorDuration = Date.now() - startTime
    console.log('[API] ========== ERROR ==========')
    console.log(`[API] Failed after ${errorDuration}ms`)
    console.error('[API] Error type:', error.constructor.name)
    console.error('[API] Error message:', error.message)
    console.error('[API] Error stack:', error.stack)
    console.error('[API] Full error object:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
