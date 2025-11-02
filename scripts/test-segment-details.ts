/**
 * Detailed Scene Analysis Test
 * Shows exactly how each scene is being segmented
 */

import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { estimateSceneDuration } from '@/lib/ai/episode-segmenter'
import type { Scene } from '@/lib/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testSceneAnalysis() {
  console.log('🔍 Detailed Scene Analysis for Tides of Time\n')

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

  const screenplay = episode.structured_screenplay as any
  const scenes = screenplay.scenes as Scene[]

  console.log(`Total Scenes: ${scenes.length}\n`)
  console.log('='.repeat(100))

  let totalDuration = 0
  const sceneAnalysis: Array<{
    sceneId: string
    duration: number
    dialogueLines: number
    actionBeats: number
    wordCount: number
    shouldSplit: boolean
  }> = []

  scenes.forEach((scene, index) => {
    const duration = estimateSceneDuration(scene)
    const dialogueLines = scene.dialogue?.length || 0
    const actionBeats = scene.action?.length || 0

    // Count total words in dialogue
    const wordCount = scene.dialogue?.reduce((sum, d) => {
      return sum + d.lines.join(' ').split(/\s+/).length
    }, 0) || 0

    const shouldSplit = duration > 12 // max_duration

    sceneAnalysis.push({
      sceneId: scene.scene_id,
      duration,
      dialogueLines,
      actionBeats,
      wordCount,
      shouldSplit
    })

    totalDuration += duration

    console.log(`\nScene ${index + 1}: ${scene.scene_id}`)
    console.log(`  Setting: ${scene.location || 'Not specified'}`)
    console.log(`  Estimated Duration: ${duration.toFixed(1)}s ${shouldSplit ? '⚠️  NEEDS SPLITTING' : '✓ Fits in one segment'}`)
    console.log(`  Dialogue Lines: ${dialogueLines}`)
    console.log(`  Action Beats: ${actionBeats}`)
    console.log(`  Total Words: ${wordCount}`)
    console.log(`  Characters: ${scene.characters?.join(', ') || 'None'}`)

    if (shouldSplit) {
      const expectedSegments = Math.ceil(duration / 10)
      console.log(`  → Should create ~${expectedSegments} segments`)
    }
  })

  console.log('\n' + '='.repeat(100))
  console.log('\n📊 SUMMARY')
  console.log('-'.repeat(100))

  const scenesNeedingSplit = sceneAnalysis.filter(s => s.shouldSplit)
  const scenesInOneSegment = sceneAnalysis.filter(s => !s.shouldSplit)

  console.log(`\nTotal Scenes: ${scenes.length}`)
  console.log(`Scenes fitting in one segment (≤12s): ${scenesInOneSegment.length}`)
  console.log(`Scenes needing split (>12s): ${scenesNeedingSplit.length}`)
  console.log(`\nTotal Episode Duration: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(1)} minutes)`)
  console.log(`Average Scene Duration: ${(totalDuration / scenes.length).toFixed(1)}s`)

  if (scenesNeedingSplit.length > 0) {
    console.log(`\n⚠️  Scenes requiring splitting:`)
    scenesNeedingSplit.forEach(s => {
      const expectedSegments = Math.ceil(s.duration / 10)
      console.log(`   - ${s.sceneId}: ${s.duration.toFixed(1)}s → ~${expectedSegments} segments`)
    })

    const estimatedSegments = scenesInOneSegment.length +
      scenesNeedingSplit.reduce((sum, s) => sum + Math.ceil(s.duration / 10), 0)

    console.log(`\n✓ Expected Total Segments: ${estimatedSegments}`)
    console.log(`  (${scenesInOneSegment.length} scenes as-is + split segments from ${scenesNeedingSplit.length} long scenes)`)
  }

  console.log('\n')
}

testSceneAnalysis()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
