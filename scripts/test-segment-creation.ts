/**
 * Test Script: Segment Creation Performance Analysis
 *
 * Tests the full segment creation pipeline for "Tides of Time" episode
 * with detailed performance monitoring at each step.
 */

import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { segmentEpisode } from '@/lib/ai/episode-segmenter'
import type { Episode } from '@/lib/types/database.types'

// Create Supabase client for standalone script
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Performance measurement utilities
interface PerformanceMetric {
  step: string
  duration: number
  timestamp: number
  memory?: number
}

const metrics: PerformanceMetric[] = []

function startTimer(step: string): () => void {
  const start = Date.now()
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024 // MB

  return () => {
    const duration = Date.now() - start
    const endMemory = process.memoryUsage().heapUsed / 1024 / 1024

    metrics.push({
      step,
      duration,
      timestamp: Date.now(),
      memory: endMemory - startMemory
    })

    console.log(`✓ ${step}: ${duration}ms (Memory: ${(endMemory - startMemory).toFixed(2)}MB)`)
  }
}

function printMetricsSummary() {
  console.log('\n' + '='.repeat(80))
  console.log('PERFORMANCE SUMMARY')
  console.log('='.repeat(80))

  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0)
  const totalMemory = metrics.reduce((sum, m) => sum + (m.memory || 0), 0)

  console.log(`\nTotal Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`)
  console.log(`Total Memory Impact: ${totalMemory.toFixed(2)}MB\n`)

  console.log('Step Breakdown:')
  console.log('-'.repeat(80))

  metrics.forEach((m, idx) => {
    const percentage = ((m.duration / totalDuration) * 100).toFixed(1)
    console.log(`${idx + 1}. ${m.step}`)
    console.log(`   Duration: ${m.duration}ms (${percentage}% of total)`)
    if (m.memory) {
      console.log(`   Memory: ${m.memory.toFixed(2)}MB`)
    }
  })

  // Identify bottlenecks (steps taking >10% of total time)
  const bottlenecks = metrics.filter(m => (m.duration / totalDuration) > 0.1)
  if (bottlenecks.length > 0) {
    console.log('\n⚠️  BOTTLENECKS DETECTED (>10% of total time):')
    bottlenecks.forEach(b => {
      const percentage = ((b.duration / totalDuration) * 100).toFixed(1)
      console.log(`   - ${b.step}: ${b.duration}ms (${percentage}%)`)
    })
  }

  console.log('='.repeat(80) + '\n')
}

async function testSegmentCreation() {
  console.log('🚀 Starting Segment Creation Performance Test')
  console.log('Episode: Tides of Time (fbfab599-65d4-4974-83f8-a68faf770f8c)\n')

  try {
    // Step 1: Initialize Supabase
    let endTimer = startTimer('1. Initialize Supabase client')
    const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    })
    endTimer()

    // Step 2: Fetch episode data
    endTimer = startTimer('2. Fetch episode from database')
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('*')
      .eq('id', 'fbfab599-65d4-4974-83f8-a68faf770f8c')
      .single()
    endTimer()

    if (fetchError || !episode) {
      console.error('❌ Failed to fetch episode:', fetchError)
      return
    }

    console.log(`\n📄 Episode: "${episode.title}"`)
    console.log(`   Series ID: ${episode.series_id}`)

    // Step 3: Validate structured screenplay
    endTimer = startTimer('3. Validate structured screenplay')
    if (!episode.structured_screenplay) {
      console.error('❌ No structured screenplay found')
      return
    }

    const screenplay = episode.structured_screenplay as any
    const sceneCount = screenplay.scenes?.length || 0
    console.log(`   Scenes: ${sceneCount}`)

    // Calculate total dialogue and action content
    let totalDialogueLines = 0
    let totalActionBeats = 0
    screenplay.scenes?.forEach((scene: any) => {
      totalDialogueLines += scene.dialogue?.length || 0
      totalActionBeats += scene.action?.length || 0
    })

    console.log(`   Dialogue lines: ${totalDialogueLines}`)
    console.log(`   Action beats: ${totalActionBeats}`)
    endTimer()

    // Step 4: Run segmentation algorithm
    endTimer = startTimer('4. Run segmentation algorithm')
    const segmentationResult = segmentEpisode(episode as Episode, {
      target_duration: 10,
      min_duration: 8,
      max_duration: 12,
      prefer_scene_boundaries: true
    })
    endTimer()

    console.log(`\n📊 Segmentation Result:`)
    console.log(`   Segments created: ${segmentationResult.segment_count}`)
    console.log(`   Total duration: ${segmentationResult.total_duration}s`)
    console.log(`   Average segment duration: ${(segmentationResult.total_duration / segmentationResult.segment_count).toFixed(1)}s`)

    // Step 5: Prepare segment data for insertion
    endTimer = startTimer('5. Prepare segment data for database')
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
    endTimer()

    // Step 6: Simulate database insertion (without actually inserting)
    endTimer = startTimer('6. Simulate database batch insert')
    // In production, this would be:
    // await supabase.from('video_segments').insert(segmentsToInsert)
    console.log(`   Would insert ${segmentsToInsert.length} records`)

    // Estimate payload size
    const payloadSize = JSON.stringify(segmentsToInsert).length / 1024 // KB
    console.log(`   Payload size: ${payloadSize.toFixed(2)}KB`)
    endTimer()

    // Step 7: Simulate segment linking
    endTimer = startTimer('7. Simulate segment chain linking')
    // In production, this would update preceding/following IDs
    console.log(`   Would create ${segmentsToInsert.length - 1} link updates`)
    endTimer()

    // Print summary
    printMetricsSummary()

    // Performance assessment
    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0)
    console.log('🎯 PERFORMANCE ASSESSMENT:')

    if (totalTime < 5000) {
      console.log('   ✅ EXCELLENT: Processing completes in <5 seconds')
    } else if (totalTime < 30000) {
      console.log('   ⚠️  ACCEPTABLE: Processing completes in <30 seconds')
    } else if (totalTime < 120000) {
      console.log('   ⚠️  SLOW: Processing takes 30-120 seconds (timeout risk)')
    } else {
      console.log('   ❌ CRITICAL: Processing exceeds 120 second timeout!')
    }

    console.log('\n✅ Test completed successfully\n')

  } catch (error) {
    console.error('\n❌ Test failed with error:')
    console.error(error)

    if (metrics.length > 0) {
      console.log('\n⚠️  Partial metrics before failure:')
      printMetricsSummary()
    }
  }
}

// Run the test
testSegmentCreation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
