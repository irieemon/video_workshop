/**
 * Test episode segmentation with the fixed algorithm
 */

import { segmentEpisode } from '../lib/ai/episode-segmenter'
import type { Episode } from '@/lib/types/database.types'

const testEpisode = {
  id: 'test-episode-1',
  series_id: 'test-series-1',
  title: 'Test Episode',
  episode_number: 1,
  status: 'draft',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  structured_screenplay: {
    acts: [
      {
        act_number: 1,
        title: 'Act 1',
        description: 'Opening act',
        scenes: ['scene-1']
      }
    ],
    scenes: [
      {
        scene_id: 'scene-1',
        scene_number: 1,
        location: 'Observation Deck',
        time_of_day: 'INT',
        time_period: 'NIGHT',
        description: 'The panoramic expanse of the Observation Deck glows faintly under starlight.',
        characters: ['Elias Chen', 'Sol'],
        dialogue: [
          {
            character: 'Elias Chen',
            lines: ['Sol, are you seeing this distortion in the starfield?']
          },
          {
            character: 'Sol',
            lines: ['Confirmed. Spatial coordinates are looping. Time signatures are inconsistent.']
          }
        ],
        action: [
          'Elias stands silently before the viewport, his reflection rippling as though submerged.',
          'A faint hum reverberates through the deck.',
          'Sol\'s holographic avatar flickers, cycling between calm and static.'
        ],
        duration_estimate: 75
      }
    ],
    beats: [
      {
        beat_id: 'beat-1',
        act_number: 1,
        scene_id: 'scene-1',
        beat_type: 'turning-point',
        description: 'Elias discovers that space-time around the ship is looping.',
        emotional_tone: 'mysterious, tense'
      }
    ],
    notes: []
  }
}

console.log('Testing episode segmentation with fixed algorithm...\n')

try {
  const result = segmentEpisode(testEpisode as any)

  console.log('✅ Segmentation SUCCEEDED')
  console.log(`   - Total segments: ${result.segment_count}`)
  console.log(`   - Total duration: ${result.total_duration}s`)
  console.log(`   - Episode ID: ${result.episode_id}\n`)

  console.log('Segment Details:')
  result.segments.forEach(segment => {
    console.log(`   Segment ${segment.segment_number}:`)
    console.log(`     - Duration: ${segment.estimated_duration}s`)
    console.log(`     - Narrative: ${segment.narrative_beat}`)
    console.log(`     - Dialogue lines: ${segment.dialogue_lines.length}`)
    console.log(`     - Action beats: ${segment.action_beats.length}`)
  })

  console.log('\n✅ All segmentation tests passed! No infinite loops detected.')
  process.exit(0)
} catch (error) {
  console.error('❌ Segmentation FAILED:', error)
  process.exit(1)
}
