/**
 * Debug Segmentation - See exactly what's happening
 */

import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { segmentEpisode } from '@/lib/ai/episode-segmenter'
import type { Episode } from '@/lib/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugSegmentation() {
  console.log('🔍 Debugging Segmentation Logic\n')

  const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })

  const { data: episode, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', 'fbfab599-65d4-4974-83f8-a68faf770f8c')
    .single()

  if (error || !episode) {
    console.error('❌ Failed to fetch episode:', error)
    return
  }

  // Run segmentation
  const result = segmentEpisode(episode as Episode, {
    target_duration: 10,
    min_duration: 8,
    max_duration: 12,
    prefer_scene_boundaries: true
  })

  console.log(`Total Segments Created: ${result.segment_count}\n`)
  console.log('='.repeat(100))

  // Show each segment
  result.segments.forEach((seg, idx) => {
    console.log(`\nSegment #${seg.segment_number}:`)
    console.log(`  Scene IDs: ${seg.scene_ids.join(', ')}`)
    console.log(`  Duration: ${seg.estimated_duration.toFixed(1)}s`)
    console.log(`  Timespan: ${seg.start_timestamp.toFixed(1)}s - ${seg.end_timestamp.toFixed(1)}s`)
    console.log(`  Narrative: ${seg.narrative_beat.substring(0, 80)}...`)
    console.log(`  Dialogue lines: ${seg.dialogue_lines.length}`)
    console.log(`  Action beats: ${seg.action_beats.length}`)
    console.log(`  Characters: ${seg.characters_in_segment.join(', ')}`)

    if (seg.estimated_duration > 15) {
      console.log(`  ⚠️  WARNING: Segment duration exceeds 15s target!`)
    }
  })

  console.log('\n' + '='.repeat(100))
  console.log('\n📊 ANALYSIS:')

  const avgDuration = result.segments.reduce((sum, s) => sum + s.estimated_duration, 0) / result.segments.length
  const maxDuration = Math.max(...result.segments.map(s => s.estimated_duration))
  const minDuration = Math.min(...result.segments.map(s => s.estimated_duration))

  console.log(`  Average segment duration: ${avgDuration.toFixed(1)}s`)
  console.log(`  Min segment duration: ${minDuration.toFixed(1)}s`)
  console.log(`  Max segment duration: ${maxDuration.toFixed(1)}s`)
  console.log(`  Segments > 15s: ${result.segments.filter(s => s.estimated_duration > 15).length}`)
  console.log(`  Segments 10-15s: ${result.segments.filter(s => s.estimated_duration >= 10 && s.estimated_duration <= 15).length}`)
  console.log(`  Segments < 10s: ${result.segments.filter(s => s.estimated_duration < 10).length}`)

  // Check for scenes that should have been split but weren't
  const segmentsByScene = new Map<string, number>()
  result.segments.forEach(seg => {
    seg.scene_ids.forEach(sceneId => {
      segmentsByScene.set(sceneId, (segmentsByScene.get(sceneId) || 0) + 1)
    })
  })

  console.log(`\n📋 Segments per scene:`)
  segmentsByScene.forEach((count, sceneId) => {
    console.log(`  ${sceneId}: ${count} segment${count > 1 ? 's' : ''}`)
  })
}

debugSegmentation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
