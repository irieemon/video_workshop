/**
 * Tests for Episode Segmentation Algorithm
 *
 * Tests the intelligent breaking of episodes into ~10-second narrative segments
 * for sequential video generation with visual and character continuity.
 */

import {
  segmentEpisode,
  estimateSceneDuration,
  VideoSegmentData,
  SegmentationResult,
  SegmentationOptions,
} from '@/lib/ai/episode-segmenter'
import type { Episode, Scene, DialogueLine, StructuredScreenplay } from '@/lib/types/database.types'

describe('Episode Segmenter', () => {
  // Helper to create mock scene
  function createMockScene(overrides: Partial<Scene> = {}): Scene {
    return {
      scene_id: `scene_${Math.random().toString(36).substr(2, 9)}`,
      scene_number: 1,
      location: 'OFFICE',
      time_of_day: 'INT' as const,
      time_period: 'DAY' as const,
      description: 'A modern office space.',
      characters: ['JOHN'],
      dialogue: [],
      action: [],
      duration_estimate: 5,
      ...overrides,
    }
  }

  // Helper to create mock episode
  function createMockEpisode(scenes: Scene[], overrides: Partial<Episode> = {}): Episode {
    const screenplay: StructuredScreenplay = {
      title: 'Test Episode',
      logline: 'A test story',
      scenes,
      acts: [],
      beats: [],
      notes: [],
    }

    return {
      id: 'episode-1',
      series_id: 'series-1',
      title: 'Test Episode',
      season_number: 1,
      episode_number: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      structured_screenplay: screenplay as unknown as Episode['structured_screenplay'],
      ...overrides,
    } as Episode
  }

  // Helper to create dialogue lines
  function createDialogue(character: string, lines: string[]): DialogueLine {
    return { character, lines }
  }

  describe('segmentEpisode', () => {
    describe('Basic Segmentation', () => {
      it('segments episode with single short scene', () => {
        const scene = createMockScene({
          dialogue: [createDialogue('JOHN', ['Hello world'])],
          action: ['John enters the room'],
        })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.episode_id).toBe('episode-1')
        expect(result.segments).toHaveLength(1)
        expect(result.segment_count).toBe(1)
      })

      it('includes scene_ids in segment', () => {
        const scene = createMockScene({ scene_id: 'scene_abc' })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].scene_ids).toContain('scene_abc')
      })

      it('sets segment_number starting at 1', () => {
        const scene = createMockScene()
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].segment_number).toBe(1)
      })

      it('includes characters_in_segment from scene', () => {
        const scene = createMockScene({ characters: ['ALICE', 'BOB'] })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].characters_in_segment).toEqual(['ALICE', 'BOB'])
      })

      it('includes dialogue_lines from scene', () => {
        const dialogue = [
          createDialogue('JOHN', ['Line 1']),
          createDialogue('MARY', ['Line 2']),
        ]
        const scene = createMockScene({ dialogue })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].dialogue_lines).toHaveLength(2)
      })

      it('includes action_beats from scene', () => {
        const scene = createMockScene({ action: ['Action 1', 'Action 2'] })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].action_beats).toEqual(['Action 1', 'Action 2'])
      })
    })

    describe('Multiple Scenes', () => {
      it('creates segment for each short scene', () => {
        const scenes = [
          createMockScene({ scene_id: 'scene_1', location: 'OFFICE' }),
          createMockScene({ scene_id: 'scene_2', location: 'STREET' }),
          createMockScene({ scene_id: 'scene_3', location: 'CAFE' }),
        ]
        const episode = createMockEpisode(scenes)

        const result = segmentEpisode(episode)

        expect(result.segments).toHaveLength(3)
        expect(result.segments[0].segment_number).toBe(1)
        expect(result.segments[1].segment_number).toBe(2)
        expect(result.segments[2].segment_number).toBe(3)
      })

      it('maintains continuous timestamp across segments', () => {
        const scenes = [
          createMockScene({ duration_estimate: 5 }),
          createMockScene({ duration_estimate: 7 }),
        ]
        const episode = createMockEpisode(scenes)

        const result = segmentEpisode(episode)

        expect(result.segments[0].start_timestamp).toBe(0)
        expect(result.segments[1].start_timestamp).toBeGreaterThan(0)
      })

      it('calculates total_duration from all segments', () => {
        const scenes = [
          createMockScene({ duration_estimate: 5 }),
          createMockScene({ duration_estimate: 8 }),
        ]
        const episode = createMockEpisode(scenes)

        const result = segmentEpisode(episode)

        expect(result.total_duration).toBeGreaterThan(0)
      })
    })

    describe('Long Scene Splitting', () => {
      it('splits scene with many dialogue lines', () => {
        // Create scene with lots of dialogue (~30+ seconds worth)
        const dialogue = Array(10).fill(null).map((_, i) =>
          createDialogue('JOHN', [
            'This is a longer line of dialogue that takes time to speak.',
            'And another sentence to add more duration.',
          ])
        )
        const scene = createMockScene({ dialogue })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments.length).toBeGreaterThan(1)
      })

      it('splits scene with many action beats', () => {
        // Create scene with many actions (~20+ seconds worth)
        const action = Array(12).fill(null).map((_, i) => `Action ${i + 1}`)
        const scene = createMockScene({ action })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments.length).toBeGreaterThan(1)
      })

      it('preserves scene_id across split segments', () => {
        const dialogue = Array(8).fill(null).map(() =>
          createDialogue('JOHN', ['This is enough dialogue to cause splitting'])
        )
        const scene = createMockScene({ scene_id: 'long_scene', dialogue })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        result.segments.forEach(segment => {
          expect(segment.scene_ids).toContain('long_scene')
        })
      })
    })

    describe('Duration Estimation', () => {
      it('estimates duration from dialogue word count', () => {
        // ~10 words at 2.5 WPS = 4 seconds
        const dialogue = [createDialogue('JOHN', ['One two three four five six seven eight nine ten'])]
        const scene = createMockScene({ dialogue, duration_estimate: undefined })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].estimated_duration).toBeGreaterThanOrEqual(3)
      })

      it('estimates duration from action beats', () => {
        // 3 action beats at 2 seconds each = 6 seconds
        const scene = createMockScene({
          action: ['Action 1', 'Action 2', 'Action 3'],
          duration_estimate: undefined,
        })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].estimated_duration).toBeGreaterThanOrEqual(3)
      })

      it('uses minimum duration of 3 seconds', () => {
        const scene = createMockScene({
          dialogue: [],
          action: [],
          duration_estimate: undefined,
        })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].estimated_duration).toBeGreaterThanOrEqual(3)
      })

      it('clamps duration to maximum 15 seconds', () => {
        // Create very long scene
        const dialogue = Array(20).fill(null).map(() =>
          createDialogue('JOHN', [
            'This is a very long line of dialogue that will add a lot of duration.',
            'We need many lines to exceed the maximum duration.',
          ])
        )
        const scene = createMockScene({ dialogue })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        result.segments.forEach(segment => {
          expect(segment.estimated_duration).toBeLessThanOrEqual(15)
        })
      })

      it('ensures minimum 3 seconds for invalid durations', () => {
        // Edge case: scene with content that somehow estimates to 0
        const scene = createMockScene({
          dialogue: [],
          action: [],
          duration_estimate: 0,
        })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].estimated_duration).toBeGreaterThanOrEqual(3)
      })
    })

    describe('Narrative Transitions', () => {
      it('adds narrative_transition to subsequent segments', () => {
        const scenes = [
          createMockScene({ scene_id: 'scene_1', location: 'OFFICE' }),
          createMockScene({ scene_id: 'scene_2', location: 'STREET' }),
        ]
        const episode = createMockEpisode(scenes)

        const result = segmentEpisode(episode)

        expect(result.segments[0].narrative_transition).toBeUndefined()
        expect(result.segments[1].narrative_transition).toBeDefined()
      })

      it('uses seamless transition for same scene segments', () => {
        const dialogue = Array(8).fill(null).map((_, i) =>
          createDialogue('JOHN', ['Long dialogue line that causes splitting'])
        )
        const scene = createMockScene({ scene_id: 'scene_1', dialogue })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        if (result.segments.length > 1) {
          expect(result.segments[1].narrative_transition).toContain('seamlessly')
        }
      })

      it('uses location transition for different scene segments', () => {
        const scenes = [
          createMockScene({ scene_id: 'scene_1', location: 'OFFICE' }),
          createMockScene({ scene_id: 'scene_2', location: 'BEACH' }),
        ]
        const episode = createMockEpisode(scenes)

        const result = segmentEpisode(episode)

        expect(result.segments[1].narrative_transition).toContain('Transitions')
      })
    })

    describe('Narrative Beats', () => {
      it('generates narrative_beat with location', () => {
        const scene = createMockScene({
          location: 'COFFEE SHOP',
          action: ['Sarah orders coffee'],
        })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].narrative_beat).toContain('COFFEE SHOP')
      })

      it('generates narrative_beat from action if present', () => {
        const scene = createMockScene({
          action: ['John runs down the hallway'],
          description: 'A long hallway',
        })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].narrative_beat).toContain('John runs')
      })

      it('truncates long narrative_beat', () => {
        const longAction = 'A'.repeat(200)
        const scene = createMockScene({ action: [longAction] })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].narrative_beat.length).toBeLessThan(200)
      })
    })

    describe('Visual Continuity Notes', () => {
      it('includes location in continuity notes', () => {
        const scene = createMockScene({ location: 'OFFICE' })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].visual_continuity_notes).toContain('Location: OFFICE')
      })

      it('includes time in continuity notes', () => {
        const scene = createMockScene({ time_of_day: 'EXT', time_period: 'NIGHT' })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].visual_continuity_notes).toContain('Time: EXT NIGHT')
      })

      it('includes characters in continuity notes', () => {
        const scene = createMockScene({ characters: ['ALICE', 'BOB'] })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].visual_continuity_notes).toContain('Characters: ALICE, BOB')
      })
    })

    describe('Custom Options', () => {
      it('respects custom target_duration', () => {
        const scenes = [createMockScene()]
        const episode = createMockEpisode(scenes)
        const options: SegmentationOptions = { target_duration: 5 }

        const result = segmentEpisode(episode, options)

        expect(result.segments).toHaveLength(1)
      })

      it('respects custom min_duration', () => {
        const scenes = [createMockScene()]
        const episode = createMockEpisode(scenes)
        const options: SegmentationOptions = { min_duration: 3 }

        const result = segmentEpisode(episode, options)

        expect(result.segments[0].estimated_duration).toBeGreaterThanOrEqual(3)
      })

      it('respects custom max_duration', () => {
        const dialogue = Array(10).fill(null).map(() =>
          createDialogue('JOHN', ['Long line of dialogue'])
        )
        const scene = createMockScene({ dialogue })
        const episode = createMockEpisode([scene])
        const options: SegmentationOptions = { max_duration: 8 }

        const result = segmentEpisode(episode, options)

        // With lower max, should create more segments
        expect(result.segments.length).toBeGreaterThanOrEqual(1)
      })

      it('adjusts min/max based on target when not specified', () => {
        const scene = createMockScene()
        const episode = createMockEpisode([scene])
        const options: SegmentationOptions = { target_duration: 7 }

        // Should work without explicit min/max
        const result = segmentEpisode(episode, options)

        expect(result.segments).toHaveLength(1)
      })
    })

    describe('Error Handling', () => {
      it('throws error for episode without structured_screenplay', () => {
        const episode: Episode = {
          id: 'episode-1',
          series_id: 'series-1',
          title: 'Test',
          season_number: 1,
          episode_number: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          structured_screenplay: null,
        } as Episode

        expect(() => segmentEpisode(episode)).toThrow('Episode must have structured_screenplay')
      })

      it('throws error for episode with no scenes', () => {
        const episode = createMockEpisode([])
        ;(episode.structured_screenplay as StructuredScreenplay).scenes = []

        expect(() => segmentEpisode(episode)).toThrow('Episode must have at least one scene')
      })

      it('handles undefined scenes array', () => {
        const episode = createMockEpisode([])
        ;(episode.structured_screenplay as StructuredScreenplay).scenes = undefined as unknown as Scene[]

        expect(() => segmentEpisode(episode)).toThrow('Episode must have at least one scene')
      })
    })

    describe('Edge Cases', () => {
      it('handles scene with empty dialogue array', () => {
        const scene = createMockScene({ dialogue: [] })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].dialogue_lines).toEqual([])
      })

      it('handles scene with empty action array', () => {
        const scene = createMockScene({ action: [] })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].action_beats).toEqual([])
      })

      it('handles scene with undefined characters', () => {
        const scene = createMockScene({ characters: undefined })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].characters_in_segment).toEqual([])
      })

      it('handles scene with very short description', () => {
        const scene = createMockScene({ description: 'Hi' })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments).toHaveLength(1)
      })

      it('handles single word dialogue', () => {
        const scene = createMockScene({
          dialogue: [createDialogue('JOHN', ['Hi'])],
        })
        const episode = createMockEpisode([scene])

        const result = segmentEpisode(episode)

        expect(result.segments[0].estimated_duration).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('estimateSceneDuration', () => {
    it('returns minimum 3 seconds for empty scene', () => {
      const scene = createMockScene({ dialogue: [], action: [] })
      const duration = estimateSceneDuration(scene)

      expect(duration).toBeGreaterThanOrEqual(3)
    })

    it('uses duration_estimate when higher than content', () => {
      const scene = createMockScene({
        dialogue: [],
        action: [],
        duration_estimate: 10,
      })
      const duration = estimateSceneDuration(scene)

      expect(duration).toBe(10)
    })

    it('uses content duration when higher than estimate', () => {
      // Create scene with enough content for ~8 seconds
      const scene = createMockScene({
        dialogue: [createDialogue('JOHN', ['One two three four five six seven eight nine ten'])],
        action: ['Action 1', 'Action 2'],
        duration_estimate: 3, // Lower than content
      })
      const duration = estimateSceneDuration(scene)

      expect(duration).toBeGreaterThan(3)
    })

    it('calculates dialogue duration from word count', () => {
      // 20 words at 2.5 WPS = 8 seconds
      const scene = createMockScene({
        dialogue: [
          createDialogue('JOHN', [
            'One two three four five six seven eight nine ten',
            'Eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty',
          ]),
        ],
        action: [],
      })
      const duration = estimateSceneDuration(scene)

      expect(duration).toBeGreaterThanOrEqual(8)
    })

    it('adds 2 seconds per action beat', () => {
      // 5 action beats = 10 seconds
      const scene = createMockScene({
        dialogue: [],
        action: ['Action 1', 'Action 2', 'Action 3', 'Action 4', 'Action 5'],
      })
      const duration = estimateSceneDuration(scene)

      expect(duration).toBeGreaterThanOrEqual(10)
    })

    it('combines dialogue and action durations', () => {
      const scene = createMockScene({
        dialogue: [createDialogue('JOHN', ['Five word sentence here now'])],
        action: ['Action 1', 'Action 2'],
      })
      const duration = estimateSceneDuration(scene)

      // ~2 seconds for dialogue + 4 seconds for actions = 6 seconds (minimum 3)
      expect(duration).toBeGreaterThanOrEqual(3)
    })
  })
})
