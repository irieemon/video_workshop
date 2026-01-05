jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { ScreenplayEnrichmentService, screenplayEnrichment } from '@/lib/services/screenplay-enrichment'

describe('ScreenplayEnrichmentService', () => {
  let service: ScreenplayEnrichmentService
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ScreenplayEnrichmentService()

    mockSupabase = {
      from: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('extractScene', () => {
    const episodeId = 'episode-123'
    const sceneId = 'scene-1'

    it('returns scene when found in structured screenplay', async () => {
      const mockScene = {
        scene_id: sceneId,
        scene_number: 1,
        location: 'Office',
        time_of_day: 'Day',
        time_period: 'Present',
        description: 'A busy office scene',
        characters: ['Alice'],
        dialogue: [],
        action: [],
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                structured_screenplay: {
                  scenes: [mockScene],
                },
              },
              error: null,
            }),
          }),
        }),
      })

      const result = await service.extractScene(episodeId, sceneId)

      expect(result).toEqual(mockScene)
    })

    it('returns null when scene not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                structured_screenplay: {
                  scenes: [{ scene_id: 'other-scene' }],
                },
              },
              error: null,
            }),
          }),
        }),
      })

      const result = await service.extractScene(episodeId, sceneId)

      expect(result).toBeNull()
    })

    it('returns null when episode has no structured screenplay', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                structured_screenplay: null,
              },
              error: null,
            }),
          }),
        }),
      })

      const result = await service.extractScene(episodeId, sceneId)

      expect(result).toBeNull()
    })

    it('returns null on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const result = await service.extractScene(episodeId, sceneId)

      expect(result).toBeNull()
    })
  })

  describe('getSeriesContext', () => {
    const seriesId = 'series-123'
    const mockScene = {
      scene_id: 'scene-1',
      scene_number: 1,
      location: 'City Hall',
      time_of_day: 'Day',
      time_period: 'Present',
      description: 'A tense meeting',
      characters: ['Alice', 'Bob'],
      dialogue: [],
      action: [],
    }

    it('returns filtered series context', async () => {
      const mockSeries = {
        id: seriesId,
        name: 'Test Series',
        sora_camera_style: 'Cinematic',
        sora_lighting_mood: 'Dramatic',
        sora_color_palette: 'Cool tones',
        sora_overall_tone: 'Tense',
        sora_narrative_prefix: 'In a world...',
        characters: [
          { id: 'char-1', name: 'Alice', description: 'Protagonist' },
          { id: 'char-2', name: 'Bob', description: 'Antagonist' },
          { id: 'char-3', name: 'Charlie', description: 'Not in scene' },
        ],
        settings: [
          { id: 'set-1', name: 'City Hall', description: 'Government building' },
          { id: 'set-2', name: 'Beach', description: 'Not in scene' },
        ],
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSeries,
              error: null,
            }),
          }),
        }),
      })

      const result = await service.getSeriesContext(seriesId, mockScene)

      expect(result).not.toBeNull()
      expect(result!.series.name).toBe('Test Series')
      expect(result!.series.cameraStyle).toBe('Cinematic')
      expect(result!.characters).toHaveLength(2) // Only Alice and Bob
      expect(result!.characters.map((c: any) => c.name)).toContain('Alice')
      expect(result!.characters.map((c: any) => c.name)).toContain('Bob')
      expect(result!.settings).toHaveLength(1) // Only City Hall
      expect(result!.settings[0].name).toBe('City Hall')
    })

    it('returns null on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const result = await service.getSeriesContext(seriesId, mockScene)

      expect(result).toBeNull()
    })

    it('handles missing characters and settings', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: seriesId,
                name: 'Test Series',
                characters: null,
                settings: null,
              },
              error: null,
            }),
          }),
        }),
      })

      const result = await service.getSeriesContext(seriesId, mockScene)

      expect(result).not.toBeNull()
      expect(result!.characters).toHaveLength(0)
      expect(result!.settings).toHaveLength(0)
    })
  })

  describe('convertToVisualDescription', () => {
    it('extracts dialogue with character attribution', () => {
      const scene = {
        scene_id: 'scene-1',
        scene_number: 1,
        location: 'Office',
        time_of_day: 'Day',
        time_period: 'Present',
        description: 'A conversation',
        characters: ['Alice', 'Bob'],
        dialogue: [
          { character: 'Alice', lines: ['Hello there!', 'How are you?'] },
          { character: 'Bob', lines: ['I am doing quite well today, thank you for asking.'] },
        ],
        action: [],
      }

      const result = service.convertToVisualDescription(scene as any)

      expect(result.dialogue).toHaveLength(2)
      expect(result.dialogue[0]).toContain('Alice:')
      expect(result.dialogue[0]).toContain('Hello there!')
      expect(result.visualCues).toContain('Alice speaks with intensity')
      expect(result.visualCues).toContain('Bob speaks conversationally')
    })

    it('extracts actions and converts to visual descriptions', () => {
      const scene = {
        scene_id: 'scene-1',
        scene_number: 1,
        location: 'Street',
        time_of_day: 'Night',
        time_period: 'Present',
        description: 'A chase scene',
        characters: ['Alice'],
        dialogue: null,
        action: ['Alice runs down the street.', 'She turns a corner.'],
      }

      const result = service.convertToVisualDescription(scene as any)

      expect(result.actions).toHaveLength(2)
      expect(result.actions[0]).toBe('Alice runs down the street.')
      expect(result.visualCues).toContain('Alice rushing down the street.')
      expect(result.visualCues).toContain('She pivoting a corner.')
    })

    it('handles empty dialogue and actions', () => {
      const scene = {
        scene_id: 'scene-1',
        scene_number: 1,
        location: 'Office',
        time_of_day: 'Day',
        time_period: 'Present',
        description: 'An empty scene',
        characters: [],
        dialogue: null,
        action: null,
      }

      const result = service.convertToVisualDescription(scene as any)

      expect(result.dialogue).toHaveLength(0)
      expect(result.actions).toHaveLength(0)
      expect(result.visualCues).toHaveLength(0)
    })

    it('infers question tone from dialogue', () => {
      const scene = {
        scene_id: 'scene-1',
        scene_number: 1,
        location: 'Office',
        time_of_day: 'Day',
        time_period: 'Present',
        description: 'Questioning',
        characters: ['Alice'],
        dialogue: [
          { character: 'Alice', lines: ['What do you mean?'] },
        ],
        action: [],
      }

      const result = service.convertToVisualDescription(scene as any)

      expect(result.visualCues).toContain('Alice speaks questioningly')
    })
  })

  describe('generateEnrichedPrompt', () => {
    const mockScene = {
      scene_id: 'scene-1',
      scene_number: 1,
      location: 'City Hall',
      time_of_day: 'Day',
      time_period: 'Present',
      description: 'A heated debate in the council chambers',
      characters: ['Alice'],
      dialogue: [
        { character: 'Alice', lines: ['I object!'] },
      ],
      action: ['Alice stands up dramatically.'],
      duration_estimate: 10,
    }

    const mockSeriesContext = {
      series: {
        name: 'Council Wars',
        cameraStyle: 'ARRI ALEXA',
        lightingMood: 'Dramatic',
        colorPalette: 'Warm',
        overallTone: 'Intense',
        narrativePrefix: 'In the heart of democracy...',
      },
      characters: [
        { id: 'char-1', name: 'Alice', description: 'A fierce councilwoman', role: 'lead' },
      ],
      settings: [
        { id: 'set-1', name: 'City Hall', description: 'The seat of power' },
      ],
    }

    const mockTechnicalSpecs = {
      duration: 8,
      aspectRatio: '16:9' as const,
      resolution: '1080p' as const,
    }

    it('generates comprehensive prompt with all sections', async () => {
      const prompt = await service.generateEnrichedPrompt(
        mockScene as any,
        mockSeriesContext as any,
        mockTechnicalSpecs
      )

      expect(prompt).toContain('**Series Context**:')
      expect(prompt).toContain('In the heart of democracy')
      expect(prompt).toContain('**Location**: City Hall')
      expect(prompt).toContain('Day Present')
      expect(prompt).toContain('**Scene Description**:')
      expect(prompt).toContain('heated debate')
      expect(prompt).toContain('**Characters**:')
      expect(prompt).toContain('Alice')
      expect(prompt).toContain('fierce councilwoman')
      expect(prompt).toContain('**Actions**:')
      expect(prompt).toContain('**Dialogue**:')
      expect(prompt).toContain('I object!')
      expect(prompt).toContain('**Visual Execution**:')
      expect(prompt).toContain('**Format & Look**')
      expect(prompt).toContain('8 seconds')
      expect(prompt).toContain('16:9')
    })

    it('uses series style defaults when specs not provided', async () => {
      const prompt = await service.generateEnrichedPrompt(
        mockScene as any,
        mockSeriesContext as any,
        {} // Empty specs - should use series defaults
      )

      expect(prompt).toContain('ARRI ALEXA')
      expect(prompt).toContain('Dramatic')
      expect(prompt).toContain('Warm')
    })
  })

  describe('createEnrichmentData', () => {
    const mockScene = {
      scene_id: 'scene-1',
      scene_number: 1,
      location: 'City Hall',
      time_of_day: 'Day',
      time_period: 'Present',
      description: 'A tense moment',
      characters: ['Alice'],
      dialogue: [
        { character: 'Alice', lines: ['Hello'] },
      ],
      action: ['Alice enters'],
      duration_estimate: 5,
    }

    const mockSeriesContext = {
      series: { name: 'Test' },
      characters: [{ id: 'char-1', name: 'Alice' }],
      settings: [{ id: 'set-1', name: 'City Hall' }],
    }

    it('creates enrichment data structure', () => {
      const result = service.createEnrichmentData(mockScene as any, mockSeriesContext as any)

      expect(result.sourceScene.sceneId).toBe('scene-1')
      expect(result.sourceScene.sceneNumber).toBe(1)
      expect(result.sourceScene.location).toBe('City Hall')
      expect(result.extractedDialogue).toHaveLength(1)
      expect(result.extractedActions).toHaveLength(1)
      expect(result.charactersInScene).toContain('char-1')
      expect(result.settingsInScene).toContain('set-1')
      expect(result.emotionalBeat).toBe('tension')
      expect(result.durationEstimate).toBe(5)
      expect(result.enrichmentTimestamp).toBeDefined()
    })

    it('extracts correct emotional beat from description', () => {
      const tensionScene = { ...mockScene, description: 'A tense standoff' }
      const warmScene = { ...mockScene, description: 'A warm reunion' }
      const joyScene = { ...mockScene, description: 'A joyful celebration' }
      const sadScene = { ...mockScene, description: 'A sad farewell' }
      const neutralScene = { ...mockScene, description: 'A regular day' }

      expect(service.createEnrichmentData(tensionScene as any, mockSeriesContext as any).emotionalBeat).toBe('tension')
      expect(service.createEnrichmentData(warmScene as any, mockSeriesContext as any).emotionalBeat).toBe('warmth')
      expect(service.createEnrichmentData(joyScene as any, mockSeriesContext as any).emotionalBeat).toBe('joy')
      expect(service.createEnrichmentData(sadScene as any, mockSeriesContext as any).emotionalBeat).toBe('sadness')
      expect(service.createEnrichmentData(neutralScene as any, mockSeriesContext as any).emotionalBeat).toBe('neutral')
    })
  })

  describe('singleton export', () => {
    it('exports singleton instance', () => {
      expect(screenplayEnrichment).toBeInstanceOf(ScreenplayEnrichmentService)
    })
  })
})
