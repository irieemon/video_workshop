jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'
import { SeriesConceptPersister } from '@/lib/services/series-concept-persister'

describe('SeriesConceptPersister', () => {
  let persister: SeriesConceptPersister
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    persister = new SeriesConceptPersister()

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('persistConcept', () => {
    const mockUserId = 'user-123'
    const mockSeriesId = 'series-456'

    const createMockConcept = (overrides?: any) => ({
      series: {
        name: 'Test Series',
        premise: 'A test series premise',
        genre: 'Drama',
        logline: 'A test logline',
        tone: 'Serious',
        themes: ['redemption', 'justice'],
        format: 'episodic',
        ...overrides?.series,
      },
      seasons: [
        {
          seasonNumber: 1,
          episodes: [
            { episodeNumber: 1, title: 'Pilot', logline: 'The beginning' },
          ],
        },
      ],
      characters: [
        {
          name: 'Alice',
          description: 'The protagonist',
          dramatic_profile: { motivation: 'Justice' },
          visual_fingerprint: {
            age: '30s',
            ethnicity: 'diverse',
            skin_tone: 'medium',
            build: 'athletic',
            distinctive_features: 'scar on cheek',
            typical_wardrobe: 'business casual',
          },
          voice_profile: { tone: 'confident' },
        },
        {
          name: 'Bob',
          description: 'The antagonist',
          dramatic_profile: { motivation: 'Power' },
          visual_fingerprint: {
            age: '40s',
            ethnicity: 'diverse',
            skin_tone: 'light',
            build: 'heavyset',
            distinctive_features: 'bald head',
            typical_wardrobe: 'formal suit',
          },
          voice_profile: { tone: 'menacing' },
        },
        ...overrides?.characters || [],
      ].filter((c, i, arr) => !overrides?.characters || arr === overrides.characters),
      relationships: [
        {
          character_a: 'Alice',
          character_b: 'Bob',
          type: 'rival',
          description: 'Bitter rivals since childhood',
          evolution: 'Tension increases over seasons',
        },
        ...overrides?.relationships || [],
      ].filter((r, i, arr) => !overrides?.relationships || arr === overrides.relationships),
      settings: [
        {
          name: 'City Hall',
          description: 'The center of power',
          importance: 'high',
          first_appearance: 'Episode 1',
        },
        ...overrides?.settings || [],
      ].filter((s, i, arr) => !overrides?.settings || arr === overrides.settings),
      ...overrides,
    })

    it('successfully persists a complete series concept', async () => {
      const mockConcept = createMockConcept()

      // Mock successful series insert
      const seriesInsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockSeriesId },
            error: null,
          }),
        }),
      })

      // Mock successful characters insert
      const charactersInsertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { id: 'char-1', name: 'Alice' },
            { id: 'char-2', name: 'Bob' },
          ],
          error: null,
        }),
      })

      // Mock successful relationships insert
      const relationshipsInsertMock = jest.fn().mockResolvedValue({
        error: null,
      })

      // Mock successful settings insert
      const settingsInsertMock = jest.fn().mockResolvedValue({
        error: null,
      })

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        switch (table) {
          case 'series':
            return { insert: seriesInsertMock }
          case 'series_characters':
            return { insert: charactersInsertMock }
          case 'character_relationships':
            return { insert: relationshipsInsertMock }
          case 'series_settings':
            return { insert: settingsInsertMock }
          default:
            return {}
        }
      })

      const result = await persister.persistConcept(mockConcept, mockUserId)

      expect(result.success).toBe(true)
      expect(result.seriesId).toBe(mockSeriesId)
      expect(seriesInsertMock).toHaveBeenCalled()
      expect(charactersInsertMock).toHaveBeenCalled()
      expect(relationshipsInsertMock).toHaveBeenCalled()
      expect(settingsInsertMock).toHaveBeenCalled()
    })

    it('returns error when series insert fails', async () => {
      const mockConcept = createMockConcept()

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Series insert failed' },
            }),
          }),
        }),
      })

      const result = await persister.persistConcept(mockConcept, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Series insert failed')
    })

    it('returns error when characters insert fails', async () => {
      const mockConcept = createMockConcept()

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockSeriesId },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Characters insert failed' },
              }),
            }),
          }
        }
        return {}
      })

      const result = await persister.persistConcept(mockConcept, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Characters insert failed')
    })

    it('maps drama genre to narrative database type', async () => {
      const mockConcept = createMockConcept({
        series: { genre: 'Drama' },
      })

      let insertedData: any = null
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              insertedData = data
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockSeriesId },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'char-1', name: 'Alice' },
                  { id: 'char-2', name: 'Bob' },
                ],
                error: null,
              }),
            }),
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      await persister.persistConcept(mockConcept, mockUserId)

      expect(insertedData.genre).toBe('narrative')
    })

    it('maps educational genre to educational database type', async () => {
      const mockConcept = createMockConcept({
        series: { genre: 'Educational Documentary' },
      })

      let insertedGenre: string | null = null
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              insertedGenre = data.genre
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockSeriesId },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'char-1', name: 'Alice' },
                  { id: 'char-2', name: 'Bob' },
                ],
                error: null,
              }),
            }),
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      await persister.persistConcept(mockConcept, mockUserId)

      expect(insertedGenre).toBe('educational')
    })

    it('maps product showcase genre correctly', async () => {
      const mockConcept = createMockConcept({
        series: { genre: 'Product Commercial' },
      })

      let insertedGenre: string | null = null
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              insertedGenre = data.genre
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: mockSeriesId },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'char-1', name: 'Alice' },
                  { id: 'char-2', name: 'Bob' },
                ],
                error: null,
              }),
            }),
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      await persister.persistConcept(mockConcept, mockUserId)

      expect(insertedGenre).toBe('product-showcase')
    })

    it('maps relationship types correctly', async () => {
      const mockConcept = createMockConcept({
        relationships: [
          {
            character_a: 'Alice',
            character_b: 'Bob',
            type: 'ally', // Should map to 'allies'
            description: 'Partners in crime',
            evolution: 'Grow closer',
          },
        ],
      })

      let insertedRelationships: any = null
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockSeriesId },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'char-1', name: 'Alice' },
                  { id: 'char-2', name: 'Bob' },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              insertedRelationships = data
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      await persister.persistConcept(mockConcept, mockUserId)

      expect(insertedRelationships[0].relationship_type).toBe('allies')
    })

    it('maps unknown relationship type to custom', async () => {
      const mockConcept = createMockConcept({
        relationships: [
          {
            character_a: 'Alice',
            character_b: 'Bob',
            type: 'unknown_type', // Should map to 'custom'
            description: 'A unique relationship',
            evolution: 'Evolves',
          },
        ],
      })

      let insertedRelationships: any = null
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockSeriesId },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'char-1', name: 'Alice' },
                  { id: 'char-2', name: 'Bob' },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              insertedRelationships = data
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      await persister.persistConcept(mockConcept, mockUserId)

      expect(insertedRelationships[0].relationship_type).toBe('custom')
    })

    it('skips relationships with missing characters', async () => {
      const mockConcept = createMockConcept({
        relationships: [
          {
            character_a: 'NonExistent',
            character_b: 'Bob',
            type: 'rival',
            description: 'Relation with missing char',
            evolution: 'N/A',
          },
        ],
      })

      let insertedRelationships: any = null
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockSeriesId },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'char-1', name: 'Alice' },
                  { id: 'char-2', name: 'Bob' },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              insertedRelationships = data
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await persister.persistConcept(mockConcept, mockUserId)

      // Relationships with missing characters get filtered out, resulting in empty array
      // When array is empty, insert is not called, so insertedRelationships remains null
      expect(insertedRelationships).toBeNull()
      expect(result.success).toBe(true) // Should still succeed
    })

    it('generates correct Sora prompt template for characters', async () => {
      const mockConcept = createMockConcept()

      let insertedCharacters: any = null
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockSeriesId },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockImplementation((data: any) => {
              insertedCharacters = data
              return {
                select: jest.fn().mockResolvedValue({
                  data: data.map((c: any, i: number) => ({
                    id: `char-${i + 1}`,
                    name: c.name,
                  })),
                  error: null,
                }),
              }
            }),
          }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      await persister.persistConcept(mockConcept, mockUserId)

      // Check that Sora prompt template is generated
      const aliceTemplate = insertedCharacters[0].sora_prompt_template
      expect(aliceTemplate).toContain('30s')
      expect(aliceTemplate).toContain('athletic build')
      expect(aliceTemplate).toContain('scar on cheek')
      expect(aliceTemplate).toContain('business casual')
    })

    it('handles empty relationships array', async () => {
      const mockConcept = createMockConcept({
        relationships: [],
      })

      const relationshipsInsertMock = jest.fn()

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'series') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: mockSeriesId },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'series_characters') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { id: 'char-1', name: 'Alice' },
                  { id: 'char-2', name: 'Bob' },
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'character_relationships') {
          return { insert: relationshipsInsertMock }
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await persister.persistConcept(mockConcept, mockUserId)

      // Should not call insert on relationships when array is empty
      expect(relationshipsInsertMock).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('handles unexpected errors', async () => {
      const mockConcept = createMockConcept()

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error')
      })

      const result = await persister.persistConcept(mockConcept, mockUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected database error')
    })
  })
})
