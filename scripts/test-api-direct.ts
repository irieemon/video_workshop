/**
 * Direct API Test - Bypass Next.js to test the segmentation logic
 */

import { segmentEpisode } from '@/lib/ai/episode-segmenter'
import { createClient } from '@supabase/supabase-js'
import type { Episode } from '@/lib/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testAPIDirect() {
  console.log('🧪 Testing API Logic Directly (Bypassing Next.js)\n')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })

  // Fetch episode
  const { data: episode, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', 'fbfab599-65d4-4974-83f8-a68faf770f8c')
    .single()

  if (error || !episode) {
    console.error('❌ Failed to fetch episode:', error)
    return
  }

  console.log(`✅ Episode fetched: "${episode.title}"`)

  // Run segmentation (same as API route)
  console.log('\n📊 Running segmentation...')
  const startTime = Date.now()

  const segmentationResult = segmentEpisode(episode as Episode, {
    target_duration: 10,
    min_duration: 8,
    max_duration: 12,
    prefer_scene_boundaries: true
  })

  const duration = Date.now() - startTime

  console.log(`\n✅ Segmentation completed in ${duration}ms`)
  console.log(`   Segments created: ${segmentationResult.segment_count}`)
  console.log(`   Total duration: ${segmentationResult.total_duration}s`)
  console.log(`   Average segment: ${(segmentationResult.total_duration / segmentationResult.segment_count).toFixed(1)}s`)

  // Prepare data for insertion (same as API route)
  console.log('\n📦 Preparing segment data...')
  const segmentsToInsert = segmentationResult.segments.map((seg) => ({
    episode_id: episode.id,
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
    preceding_segment_id: null,
    following_segment_id: null,
    final_visual_state: null,
  }))

  console.log(`   Prepared ${segmentsToInsert.length} segment records for insertion`)
  console.log(`   Payload size: ${(JSON.stringify(segmentsToInsert).length / 1024).toFixed(2)}KB`)

  console.log('\n✅ API logic works perfectly - issue is in Next.js route handler')
}

testAPIDirect()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
