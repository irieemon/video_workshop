/**
 * Tests for Series Context Service
 *
 * Tests the series context fetching and formatting functionality
 * used by AI agents and video generation.
 */

jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import {
  fetchCompleteSeriesContext,
  formatSeriesContextForAgents,
  videoHasSeriesContext,
  getCharacterNames,
  getSettingNames,
  CompleteSeriesContext,
} from '@/lib/services/series-context'

describe('Series Context Service', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabaseClient)
  })

  describe('fetchCompleteSeriesContext', () => {
    const episodeId = 'episode-123'
    const seriesId = 'series-456'

    const mockEpisode = {
      id: episodeId,
      series_id: seriesId,
      title: 'The Big Adventure',
      season_number: 1,
      episode_number: 3,
      story_beat: 'Rising action',
      emotional_arc: 'Tension building',
      characters_used: ['char-1', 'char-2'],
      settings_used: ['setting-1'],
      timeline_position: 3,
      is_key_episode: true,
    }

    const mockSeries = {
      id: seriesId,
      name: 'Adventure Series',
      description: 'An exciting adventure series',
      genre: 'Action',
      default_style: 'cinematic',
      default_aspect_ratio: '16:9',
      default_duration: 10,
      style_guidelines: 'Use warm colors and dynamic camera movements',
    }

    const mockCharacters = [
      { id: 'char-1', name: 'Hero', description: 'The main protagonist' },
      { id: 'char-2', name: 'Sidekick', description: 'Loyal companion' },
    ]

    const mockSettings = [
      { id: 'setting-1', name: 'Forest', description: 'A mystical forest' },
    ]

    const mockVisualAssets = [
      { id: 'asset-1', name: 'Logo', type: 'image' },
    ]

    const mockRelationships = [
      { id: 'rel-1', character_1_id: 'char-1', character_2_id: 'char-2', relationship_type: 'friendship' },
    ]

    it('fetches complete series context successfully', async () => {
      // Mock episode query
      let queryCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'episodes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockEpisode,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockSeries,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'characters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockCharacters,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockSettings,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockVisualAssets,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockRelationships,
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const context = await fetchCompleteSeriesContext(episodeId)

      expect(context.series).toEqual(mockSeries)
      expect(context.episode).toEqual(mockEpisode)
      expect(context.characters).toEqual(mockCharacters)
      expect(context.settings).toEqual(mockSettings)
      expect(context.visualAssets).toEqual(mockVisualAssets)
      expect(context.relationships).toEqual(mockRelationships)
      expect(context.soraSettings).toEqual({
        defaultStyle: 'cinematic',
        defaultAspectRatio: '16:9',
        defaultDuration: 10,
        styleGuidelines: 'Use warm colors and dynamic camera movements',
      })
      expect(context.episodeContext).toEqual({
        storyBeat: 'Rising action',
        emotionalArc: 'Tension building',
        charactersUsed: ['char-1', 'char-2'],
        settingsUsed: ['setting-1'],
        timelinePosition: 3,
        isKeyEpisode: true,
      })
    })

    it('throws error when episode not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      await expect(fetchCompleteSeriesContext('nonexistent-episode'))
        .rejects.toThrow('Episode not found: nonexistent-episode')
    })

    it('throws error when series not found', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'episodes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockEpisode,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }
        }
        return {}
      })

      await expect(fetchCompleteSeriesContext(episodeId))
        .rejects.toThrow(`Series not found for episode: ${episodeId}`)
    })

    it('handles empty related data arrays gracefully', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'episodes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockEpisode, characters_used: null, settings_used: null },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockSeries, default_style: null, default_aspect_ratio: null },
                  error: null,
                }),
              }),
            }),
          }
        }
        // Return null for all related data
        if (table === 'characters' || table === 'settings' || table === 'visual_assets') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }
        }
        return {}
      })

      const context = await fetchCompleteSeriesContext(episodeId)

      expect(context.characters).toEqual([])
      expect(context.settings).toEqual([])
      expect(context.visualAssets).toEqual([])
      expect(context.relationships).toEqual([])
    })
  })

  describe('formatSeriesContextForAgents', () => {
    it('formats complete context with all sections', () => {
      const context: CompleteSeriesContext = {
        series: {
          id: 'series-1',
          name: 'Adventure Series',
          description: 'An exciting adventure',
          genre: 'Action',
          default_style: 'cinematic',
          default_aspect_ratio: '16:9',
          default_duration: 10,
          style_guidelines: 'Use warm colors',
        } as any,
        episode: {
          id: 'ep-1',
          title: 'The Journey Begins',
          season_number: 1,
          episode_number: 1,
        } as any,
        characters: [
          { name: 'Hero', description: 'The main character' } as any,
          { name: 'Villain', description: 'The antagonist' } as any,
        ],
        settings: [
          { name: 'Castle', description: 'A medieval castle' } as any,
        ],
        visualAssets: [],
        relationships: [],
        soraSettings: {
          defaultStyle: 'cinematic',
          defaultAspectRatio: '16:9',
          defaultDuration: 10,
          styleGuidelines: 'Use warm colors',
        },
        episodeContext: {
          storyBeat: 'Introduction',
          emotionalArc: 'Hope and excitement',
          charactersUsed: ['Hero'],
          settingsUsed: ['Castle'],
          isKeyEpisode: true,
        },
      }

      const formatted = formatSeriesContextForAgents(context)

      expect(formatted).toContain('# Series: Adventure Series')
      expect(formatted).toContain('Description: An exciting adventure')
      expect(formatted).toContain('Genre: Action')
      expect(formatted).toContain('## Episode 1x1: The Journey Begins')
      expect(formatted).toContain('Story Beat: Introduction')
      expect(formatted).toContain('Emotional Arc: Hope and excitement')
      expect(formatted).toContain('## Characters')
      expect(formatted).toContain('- Hero: The main character')
      expect(formatted).toContain('- Villain: The antagonist')
      expect(formatted).toContain('## Settings')
      expect(formatted).toContain('- Castle: A medieval castle')
      expect(formatted).toContain('## Visual Style Guidelines')
      expect(formatted).toContain('Use warm colors')
      expect(formatted).toContain('## Sora Generation Preferences')
      expect(formatted).toContain('Style: cinematic')
      expect(formatted).toContain('Aspect Ratio: 16:9')
      expect(formatted).toContain('Duration: 10s')
    })

    it('handles minimal context without optional fields', () => {
      const minimalContext: CompleteSeriesContext = {
        series: {
          id: 'series-1',
          name: 'Simple Series',
          description: null,
          genre: null,
        } as any,
        episode: {
          id: 'ep-1',
          title: 'Episode 1',
          season_number: 1,
          episode_number: 1,
        } as any,
        characters: [],
        settings: [],
        visualAssets: [],
        relationships: [],
        soraSettings: {},
        episodeContext: {
          charactersUsed: [],
          settingsUsed: [],
          isKeyEpisode: false,
        },
      }

      const formatted = formatSeriesContextForAgents(minimalContext)

      expect(formatted).toContain('# Series: Simple Series')
      expect(formatted).toContain('## Episode 1x1: Episode 1')
      expect(formatted).not.toContain('## Characters')
      expect(formatted).not.toContain('## Settings')
      expect(formatted).not.toContain('## Visual Style Guidelines')
      expect(formatted).not.toContain('## Sora Generation Preferences')
    })

    it('handles characters without descriptions', () => {
      const context: CompleteSeriesContext = {
        series: { id: 's1', name: 'Test' } as any,
        episode: { id: 'e1', title: 'Test', season_number: 1, episode_number: 1 } as any,
        characters: [
          { name: 'Mystery Character', description: null } as any,
        ],
        settings: [],
        visualAssets: [],
        relationships: [],
        soraSettings: {},
        episodeContext: { charactersUsed: [], settingsUsed: [], isKeyEpisode: false },
      }

      const formatted = formatSeriesContextForAgents(context)

      expect(formatted).toContain('- Mystery Character: No description')
    })
  })

  describe('videoHasSeriesContext', () => {
    it('returns true for standalone videos', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_standalone: true, series_id: null, episode_id: null },
              error: null,
            }),
          }),
        }),
      })

      const result = await videoHasSeriesContext('video-123')
      expect(result).toBe(true)
    })

    it('returns true when video has both series_id and episode_id', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_standalone: false, series_id: 'series-1', episode_id: 'ep-1' },
              error: null,
            }),
          }),
        }),
      })

      const result = await videoHasSeriesContext('video-123')
      expect(result).toBe(true)
    })

    it('returns false when series_id is missing', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_standalone: false, series_id: null, episode_id: 'ep-1' },
              error: null,
            }),
          }),
        }),
      })

      const result = await videoHasSeriesContext('video-123')
      expect(result).toBe(false)
    })

    it('returns false when episode_id is missing', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_standalone: false, series_id: 'series-1', episode_id: null },
              error: null,
            }),
          }),
        }),
      })

      const result = await videoHasSeriesContext('video-123')
      expect(result).toBe(false)
    })

    it('returns false when video not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      const result = await videoHasSeriesContext('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('getCharacterNames', () => {
    it('returns empty array for empty input', async () => {
      const result = await getCharacterNames([])
      expect(result).toEqual([])
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('returns character names for valid IDs', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [{ name: 'Hero' }, { name: 'Sidekick' }],
            error: null,
          }),
        }),
      })

      const result = await getCharacterNames(['char-1', 'char-2'])
      expect(result).toEqual(['Hero', 'Sidekick'])
    })

    it('returns empty array when query returns null', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      const result = await getCharacterNames(['char-1'])
      expect(result).toEqual([])
    })
  })

  describe('getSettingNames', () => {
    it('returns empty array for empty input', async () => {
      const result = await getSettingNames([])
      expect(result).toEqual([])
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('returns setting names for valid IDs', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [{ name: 'Forest' }, { name: 'Castle' }],
            error: null,
          }),
        }),
      })

      const result = await getSettingNames(['setting-1', 'setting-2'])
      expect(result).toEqual(['Forest', 'Castle'])
    })

    it('returns empty array when query returns null', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      const result = await getSettingNames(['setting-1'])
      expect(result).toEqual([])
    })
  })
})
